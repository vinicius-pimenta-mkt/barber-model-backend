import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio, data_fim } = req.query;
    let dataInicio, dataFim;
    const hoje = new Date();
    
    if (data_inicio && data_fim) {
      dataInicio = new Date(data_inicio);
      dataFim = new Date(data_fim);
    } else {
      switch (periodo) {
        case 'hoje': dataInicio = new Date(hoje); dataFim = new Date(hoje); break;
        case 'ontem': const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1); dataInicio = ontem; dataFim = ontem; break;
        case 'semana': dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000); dataFim = hoje; break;
        default: dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); dataFim = hoje;
      }
    }

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    const receitaDetalhada = await all(`
      SELECT data as periodo, SUM(preco) as valor 
      FROM agendamentos_lucas 
      WHERE data >= ? AND data <= ? AND status = 'Confirmado'
      GROUP BY data ORDER BY data ASC
    `, [dataInicioStr, dataFimStr]);

    const topClientes = await all(`
      SELECT cliente_nome as name, COUNT(*) as visits, SUM(preco) as spent 
      FROM agendamentos_lucas 
      WHERE data >= ? AND data <= ? AND status = 'Confirmado'
      GROUP BY cliente_nome ORDER BY spent DESC LIMIT 5
    `, [dataInicioStr, dataFimStr]);

    res.json({
      receita_detalhada: receitaDetalhada.map(r => ({ ...r, valor: r.valor / 100 })),
      faturamento_total: { 
        total: (receitaDetalhada.reduce((acc, curr) => acc + curr.valor, 0)) / 100 
      },
      top_clients: topClientes || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar relatórios do Lucas' });
  }
});

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = await all('SELECT COUNT(*) as total FROM agendamentos_lucas WHERE data = ?', [hoje]);
    const receitaHoje = await all('SELECT SUM(preco) as total FROM agendamentos_lucas WHERE data = ? AND status = ?', [hoje, 'Confirmado']);
    const proximos = await all('SELECT * FROM agendamentos_lucas WHERE data >= ? ORDER BY data, hora LIMIT 5', [hoje]);

    res.json({
      atendimentosHoje: agendamentosHoje[0]?.total || 0,
      receitaDia: (receitaHoje[0]?.total || 0) / 100,
      agendamentos: proximos
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro no dashboard do Lucas' });
  }
});

export default router;
