import express from 'express';
import { all, get } from '../database/database.js';

const router = express.Router();

// Função auxiliar para calcular datas baseadas no fuso horário do Brasil
const getBrasiliaTime = () => {
  const agora = new Date();
  const brasiliaOffset = -3;
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const dataBrasilia = new Date(utc + (3600000 * brasiliaOffset));
  
  const dataStr = dataBrasilia.toISOString().split('T')[0];
  const horaStr = dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  return { dataStr, horaStr, dataBrasilia };
};

const padronizarPagamento = (forma) => {
  if (!forma) return 'Não informado';
  const limpo = forma.toLowerCase().trim().replace(/\./g, '');
  if (limpo.includes('crédito') || limpo.includes('credito')) return 'Cartão de Crédito';
  if (limpo.includes('débito') || limpo.includes('debito')) return 'Cartão de Débito';
  if (limpo.includes('dinheiro')) return 'Dinheiro';
  if (limpo.includes('pix')) return 'Pix';
  return 'Outros';
};

router.get('/resumo', async (req, res) => {
  try {
    let { periodo = 'mes', data_inicio, data_fim, barber = 'Geral' } = req.query;

    const { dataStr: hojeStr, dataBrasilia } = getBrasiliaTime();
    let dataInicioStr = hojeStr;
    let dataFimStr = hojeStr;

    if (periodo === 'hoje') {
      dataInicioStr = hojeStr;
      dataFimStr = hojeStr;
    } else if (periodo === 'ontem') {
      const ontem = new Date(dataBrasilia);
      ontem.setDate(ontem.getDate() - 1);
      dataInicioStr = ontem.toISOString().split('T')[0];
      dataFimStr = dataInicioStr;
    } else if (periodo === 'semana') {
      const semanaPassada = new Date(dataBrasilia);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      dataInicioStr = semanaPassada.toISOString().split('T')[0];
    } else if (periodo === 'mes') {
      const mesPassado = new Date(dataBrasilia);
      mesPassado.setMonth(mesPassado.getMonth() - 1);
      dataInicioStr = mesPassado.toISOString().split('T')[0];
    } else if (periodo === 'ano') {
      const anoPassado = new Date(dataBrasilia);
      anoPassado.setFullYear(anoPassado.getFullYear() - 1);
      dataInicioStr = anoPassado.toISOString().split('T')[0];
    } else if (data_inicio && data_fim) {
      dataInicioStr = data_inicio;
      dataFimStr = data_fim;
    }

    // --- GRÁFICO DE FATURAMENTO: Lógica Inteligente de Agrupamento ---
    let groupBy = "data";
    let selectPeriodo = "data as periodo";
    
    // Se o filtro for hoje ou ontem, agrupa por HORA (ex: 14h)
    if (periodo === 'hoje' || periodo === 'ontem') {
      groupBy = "substr(hora, 1, 2)";
      selectPeriodo = "substr(hora, 1, 2) || 'h' as periodo";
    }

    const receitaQuery = `
      SELECT ${selectPeriodo}, SUM(COALESCE(preco, 0)) as valor
      FROM (
        SELECT preco, data, hora FROM agendamentos WHERE status = 'Confirmado' ${barber === 'Miguel' || barber === 'Geral' ? '' : 'AND 1=0'}
        UNION ALL
        SELECT preco, data, hora FROM agendamentos_jhonatas WHERE status = 'Confirmado' ${barber === 'Jhonatas' || barber === 'Geral' ? '' : 'AND 1=0'}
      )
      WHERE data >= ? AND data <= ?
      GROUP BY ${groupBy}
      ORDER BY periodo ASC
    `;
    const receitaDetalhadaRaw = await all(receitaQuery, [dataInicioStr, dataFimStr]);
    const receita_detalhada = receitaDetalhadaRaw.map(r => ({ ...r, valor: r.valor / 100 }));

    // --- SERVIÇOS MAIS VENDIDOS ---
    const servicesQuery = `
      SELECT servico as service,
             SUM(CASE WHEN source = 'miguel' THEN 1 ELSE 0 END) as miguel_qty,
             SUM(CASE WHEN source = 'jhonatas' THEN 1 ELSE 0 END) as jhonatas_qty
      FROM (
        SELECT servico, data, 'miguel' as source FROM agendamentos WHERE status = 'Confirmado'
        UNION ALL
        SELECT servico, data, 'jhonatas' as source FROM agendamentos_jhonatas WHERE status = 'Confirmado'
      )
      WHERE data >= ? AND data <= ?
      GROUP BY servico
      ORDER BY (miguel_qty + jhonatas_qty) DESC
    `;
    const by_service = await all(servicesQuery, [dataInicioStr, dataFimStr]);

    // --- TOP CLIENTES ---
    const clientsQuery = `
      SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) as spent
      FROM (
        SELECT cliente_nome, preco, data FROM agendamentos WHERE status = 'Confirmado' ${barber === 'Miguel' || barber === 'Geral' ? '' : 'AND 1=0'}
        UNION ALL
        SELECT cliente_nome, preco, data FROM agendamentos_jhonatas WHERE status = 'Confirmado' ${barber === 'Jhonatas' || barber === 'Geral' ? '' : 'AND 1=0'}
      )
      WHERE data >= ? AND data <= ?
      GROUP BY cliente_nome
      ORDER BY spent DESC
      LIMIT 10
    `;
    const top_clients_raw = await all(clientsQuery, [dataInicioStr, dataFimStr]);
    const top_clients = top_clients_raw.map(c => ({ ...c, spent: c.spent / 100 }));

    // --- PAGAMENTOS ---
    const paymentsQuery = `
      SELECT forma_pagamento as forma, SUM(COALESCE(preco, 0)) as valor, COUNT(*) as quantidade
      FROM (
        SELECT forma_pagamento, preco, data FROM agendamentos WHERE status = 'Confirmado' ${barber === 'Miguel' || barber === 'Geral' ? '' : 'AND 1=0'}
        UNION ALL
        SELECT forma_pagamento, preco, data FROM agendamentos_jhonatas WHERE status = 'Confirmado' ${barber === 'Jhonatas' || barber === 'Geral' ? '' : 'AND 1=0'}
      )
      WHERE data >= ? AND data <= ?
      GROUP BY forma_pagamento
    `;
    const rawPayments = await all(paymentsQuery, [dataInicioStr, dataFimStr]);
    const groupedPayments = {};
    rawPayments.forEach(row => {
      const forma = padronizarPagamento(row.forma);
      if (!groupedPayments[forma]) groupedPayments[forma] = { forma, valor: 0, quantidade: 0 };
      groupedPayments[forma].valor += (row.valor / 100);
      groupedPayments[forma].quantidade += row.quantidade;
    });
    const by_payment = Object.values(groupedPayments).sort((a, b) => b.valor - a.valor);

    // --- PRODUTOS ---
    const produtosQuery = `
      SELECT p.nome as produto, h.forma_pagamento, SUM(h.quantidade) as qty, SUM(h.valor_total) as revenue
      FROM produtos_historico h
      JOIN produtos p ON h.produto_id = p.id
      WHERE h.tipo = 'venda' AND date(h.data) >= ? AND date(h.data) <= ?
      GROUP BY p.nome, h.forma_pagamento
      ORDER BY revenue DESC
    `;
    const produtos_vendidos_raw = await all(produtosQuery, [dataInicioStr, dataFimStr]);
    const produtos_vendidos = produtos_vendidos_raw.map(p => ({
      ...p,
      forma_pagamento: padronizarPagamento(p.forma_pagamento),
      revenue: p.revenue / 100
    }));

    res.json({
      receita_detalhada,
      by_service,
      top_clients,
      by_payment,
      produtos_vendidos
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de resumo:', error);
    res.status(500).json({ error: 'Erro ao gerar relatórios' });
  }
});

// Dashboard (Mantido igual)
router.get('/dashboard', async (req, res) => {
  try {
    const { dataStr: hojeStr, horaStr: agoraHora } = getBrasiliaTime();

    let stats;
    // Puxa as estatísticas unificadas
    stats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN hora <= ? THEN COALESCE(preco, 0) ELSE 0 END) as revenue,
        SUM(CASE WHEN hora <= ? THEN 1 ELSE 0 END) as realized,
        SUM(CASE WHEN hora > ? THEN 1 ELSE 0 END) as pending_future
      FROM (
        SELECT status, preco, data, hora FROM agendamentos WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado')
        UNION ALL
        SELECT status, preco, data, hora FROM agendamentos_jhonatas WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado')
      )
    `, [agoraHora, agoraHora, agoraHora, hojeStr, hojeStr]);

    const agendamentos = await all(`
      SELECT id, cliente_nome, servico, hora, status, data, 'Miguel' as barber FROM agendamentos WHERE data >= ? AND status NOT IN ('Cancelado', 'Bloqueado')
      UNION ALL
      SELECT id, cliente_nome, servico, hora, status, data, 'Jhonatas' as barber FROM agendamentos_jhonatas WHERE data >= ? AND status NOT IN ('Cancelado', 'Bloqueado')
      ORDER BY data ASC, hora ASC
    `, [hojeStr, hojeStr]);

    res.json({
      atendimentosHoje: stats.total || 0,
      receitaDia: (stats.revenue || 0) / 100,
      servicosRealizados: stats.realized || 0,
      pendentesFuturos: stats.pending_future || 0,
      agendamentos,
      agoraHora
    });
  } catch (error) {
    console.error('Erro Dashboard:', error);
    res.status(500).json({ error: 'Erro Dashboard' });
  }
});

export default router;
