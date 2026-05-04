import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// --- INÍCIO DOS FILTROS BLINDADOS (TRADUTORES DA IA) ---
const limparTelefone = (telefone) => {
  if (!telefone || typeof telefone !== 'string') return null;
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length > 0 ? apenasNumeros : null;
};

const padronizarPreco = (precoRaw) => {
  if (precoRaw === null || precoRaw === undefined || precoRaw === '') return 0;
  if (typeof precoRaw === 'number') {
    return precoRaw < 1000 ? Math.round(precoRaw * 100) : Math.round(precoRaw);
  }
  let limpo = String(precoRaw).replace(/[^\d.,]/g, '');
  if (!limpo) return 0;
  if (limpo.includes(',')) { limpo = limpo.replace(/\./g, '').replace(',', '.'); }
  const valorFloat = parseFloat(limpo);
  if (isNaN(valorFloat)) return 0;
  return valorFloat < 1000 ? Math.round(valorFloat * 100) : Math.round(valorFloat);
};

const padronizarPagamento = (forma) => {
  if (!forma) return 'Não informado';
  const limpo = String(forma).toLowerCase().trim().replace(/\./g, '');
  if (limpo.includes('crédito') || limpo.includes('credito')) return 'Cartão de Crédito';
  if (limpo.includes('débito') || limpo.includes('debito')) return 'Cartão de Débito';
  if (limpo.includes('dinheiro')) return 'Dinheiro';
  if (limpo.includes('pix')) return 'Pix';
  return String(forma).trim();
};

const padronizarServico = (servico) => {
  if (!servico) return 'Não informado';
  return String(servico).trim().replace(/\s+/g, ' '); 
};
// --- FIM DOS FILTROS BLINDADOS ---

const isDiaFechado = (dataStr) => {
  if (!dataStr) return false;
  try {
    const soData = dataStr.split('T')[0].split(' ')[0];
    let ano, mes, dia;
    if (soData.includes('/')) {
      [dia, mes, ano] = soData.split('/');
    } else {
      [ano, mes, dia] = soData.split('-');
    }
    const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const diaSemana = dataObj.getDay();
    return diaSemana === 0 || diaSemana === 1; // 0 = Domingo, 1 = Segunda
  } catch (e) {
    return false;
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos_lucas';
    const params = [];
    const conditions = [];

    if (data) { conditions.push(' data = ?'); params.push(data); }
    if (data_inicio && data_fim) { conditions.push(' data BETWEEN ? AND ?'); params.push(data_inicio, data_fim);
    } else if (data_inicio) { conditions.push(' data >= ?'); params.push(data_inicio);
    } else if (data_fim) { conditions.push(' data <= ?'); params.push(data_fim); }
    if (status) { conditions.push(' status = ?'); params.push(status); }
    
    if (conditions.length > 0) { queryText += ' WHERE' + conditions.join(' AND'); }
    queryText += ' ORDER BY data DESC, hora DESC';

    const result = await all(queryText, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos do Lucas' });
  }
});

// Dicionário de duração dos serviços em MINUTOS
const DURACOES_SERVICOS = {
  'Barba': 20, 'Barba + Pézinho': 30, 'Barba + Pigmentação': 30,
  'Barba Express': 20, 'Bigode': 10, 'Camuflagem (Fios brancos)': 20,
  'Combo Corte + Barba + Sobrancelha': 60,
  'Cone Hindu': 20, 'Corte': 30, 'Corte + Pigmentação': 40,
  'Corte 1 pente + barba': 40, 'Corte e Barba': 50, 'Corte Infantil': 30,
  'Corte Máquina 1 pente': 20, 'Hidratação Capilar': 10, 'Limpeza Nasal': 10,
  'Luzes': 120, 'Luzes e Corte': 150, 'Navalhado': 20, 'Navalhado + Barba': 40,
  'Pezinho': 10, 'Pigmentação': 20, 'Platinado': 120, 'Platinado e Corte': 150,
  'Sobrancelha': 10, 'Sobrancelha na fita': 30
};

router.get('/disponibilidade', async (req, res) => {
  try {
    const { data, servico } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    let dataFormatada = data;
    if (data.includes('/')) {
      const partes = data.split('/');
      if (partes[0].length === 2) { 
        dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
      } else { 
        dataFormatada = `${partes[0]}-${partes[1]}-${partes[2]}`;
      }
    }

    if (isDiaFechado(dataFormatada)) {
      return res.json({ livres: [], mensagem: 'A barbearia está fechada aos Domingos e Segundas.' });
    }

    const [ano, mes, dia] = dataFormatada.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();

    let todosSlots = [];
    const inicioHora = (diaSemana === 6) ? 8 : 9;
    const fimHora = (diaSemana === 6) ? 18 : 19;

    for (let h = inicioHora; h < fimHora; h++) {
      if (h !== 12) {
        for (let m = 0; m < 60; m += 10) {
          todosSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    }

    const { dataStr: hojeStr, horaStr: horaAtual } = getBrasiliaTime();
    if (dataFormatada === hojeStr) {
       todosSlots = todosSlots.filter(slot => slot > horaAtual.substring(0, 5));
    } else if (dataFormatada < hojeStr) {
       return res.json({ livres: [], mensagem: 'Não é possível agendar no passado.' });
    }

    const agendamentosExistentes = await all(
      "SELECT hora, servico FROM agendamentos_lucas WHERE data = ? AND status != 'Cancelado'",
      [dataFormatada]
    );

    let slotsOcupados = new Set();

    agendamentosExistentes.forEach(ag => {
      const duracaoMinutos = DURACOES_SERVICOS[ag.servico] || 30;
      const blocos = Math.ceil(duracaoMinutos / 10);
      
      let [h, m] = ag.hora.split(':').map(Number);
      
      for (let i = 0; i < blocos; i++) {
        slotsOcupados.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        m += 10;
        if (m >= 60) { m -= 60; h += 1; }
      }
    });

    let horariosLivresBrutos = todosSlots.filter(slot => !slotsOcupados.has(slot));
    let horariosFinais = horariosLivresBrutos;
    
    if (servico && servico !== 'undefined' && servico !== 'null') {
      const servicoLimpo = servico.replace(/['"]/g, '').trim(); 
      
      if (DURACOES_SERVICOS[servicoLimpo]) {
        const blocosNecessarios = Math.ceil(DURACOES_SERVICOS[servicoLimpo] / 10);
        horariosFinais = horariosLivresBrutos.filter(slotInicial => {
          let [h, m] = slotInicial.split(':').map(Number);
          
          for (let i = 0; i < blocosNecessarios; i++) {
            const slotSendoChecado = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            if (!horariosLivresBrutos.includes(slotSendoChecado)) return false;
            
            m += 10;
            if (m >= 60) { m -= 60; h += 1; }
          }
          return true; 
        });
      }
    }

    res.json({ livres: horariosFinais });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular disponibilidade' });
  }
});

function getBrasiliaTime() {
  const agora = new Date();
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const dataBrasilia = new Date(utc + (3600000 * -3));
  return { 
    dataStr: dataBrasilia.toISOString().split('T')[0], 
    horaStr: dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' }) 
  };
}

router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Confirmado', preco, forma_pagamento, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const precoLimpo = padronizarPreco(preco);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = padronizarServico(servico);
    const telefoneLimpo = limparTelefone(cliente_telefone);
    const horaFormatada = hora.substring(0, 5);

    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    const horarioOcupado = await get(
      "SELECT id FROM agendamentos_lucas WHERE data = ? AND hora = ? AND status != 'Cancelado'",
      [data, horaFormatada]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. O Lucas já tem um cliente neste horário.' });
    }

    const safeClienteId = cliente_id || null;

    const result = await query(
      'INSERT INTO agendamentos_lucas (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [safeClienteId, cliente_nome, telefoneLimpo, servicoLimpo, data, horaFormatada, status, precoLimpo, pagamentoLimpo, observacoes]
    );

    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${horaFormatada}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (e) {}
    }
    
    res.status(201).json({ id: result.lastID, message: 'Agendamento criado para o Lucas' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento do Lucas' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    const precoLimpo = padronizarPreco(preco);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = padronizarServico(servico);
    const telefoneLimpo = limparTelefone(cliente_telefone);

    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    const horarioOcupado = await get(
      "SELECT id FROM agendamentos_lucas WHERE data = ? AND hora = ? AND status != 'Cancelado' AND id != ?",
      [data, hora, id]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. O Lucas já tem um cliente neste horário.' });
    }

    await query(
      'UPDATE agendamentos_lucas SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [cliente_nome, telefoneLimpo, servicoLimpo, data, hora, status, precoLimpo, pagamentoLimpo, observacoes, id]
    );

    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (e) {}
    }
    
    res.json({ message: 'Agendamento do Lucas atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento do Lucas' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos_lucas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento do Lucas deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento do Lucas' });
  }
});

export default router;
