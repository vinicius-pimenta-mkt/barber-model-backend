import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

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
  return 'Outros';
};

// GET: Listar todos
router.get('/', verifyToken, async (req, res) => {
  try {
    const agendamentos = await all('SELECT * FROM agendamentos_lucas ORDER BY data ASC, hora ASC');
    res.json(agendamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos do Lucas' });
  }
});

// GET: Disponibilidade
router.get('/disponibilidade', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });
    
    const agendamentos = await all("SELECT hora FROM agendamentos_lucas WHERE data = ? AND status != 'Cancelado'", [data]);
    const horariosOcupados = agendamentos.map(a => a.hora);
    
    const todosHorarios = [];
    for (let h = 9; h <= 19; h++) {
      todosHorarios.push(`${h.toString().padStart(2, '0')}:00`);
      if (h !== 19) todosHorarios.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const livres = todosHorarios.filter(h => !horariosOcupados.includes(h));
    res.json({ livres });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
  }
});

// POST: Criar
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;
    
    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const precoLimpo = padronizarPreco(preco);
    const telefoneLimpo = limparTelefone(cliente_telefone);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = servico.trim();

    const horarioOcupado = await get(
      "SELECT id FROM agendamentos_lucas WHERE data = ? AND hora = ? AND status != 'Cancelado'",
      [data, hora]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. O Lucas já tem um cliente neste horário.' });
    }

    await query(
      'INSERT INTO agendamentos_lucas (cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente_nome, telefoneLimpo, servicoLimpo, data, hora, status || 'Pendente', precoLimpo, pagamentoLimpo, observacoes]
    );

    res.status(201).json({ message: 'Agendamento para o Lucas criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento para o Lucas' });
  }
});

// PUT: Atualizar
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    const precoLimpo = padronizarPreco(preco);
    const telefoneLimpo = limparTelefone(cliente_telefone);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = servico.trim();

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

// DELETE: Excluir
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos_lucas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento do Lucas excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir agendamento do Lucas' });
  }
});

export default router;
