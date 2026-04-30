import express from 'express';
import { get, query } from '../database/database.js';

const router = express.Router();

// ROTA PARA BUSCAR UMA CONFIGURAÇÃO (Ex: GET /api/configuracoes/barberTwoName)
router.get('/:chave', async (req, res) => {
  try {
    const row = await get('SELECT valor FROM configuracoes WHERE chave = ?', [req.params.chave]);
    // Retorna o valor ou "Jhonatas" como segurança caso algo dê errado
    res.json({ valor: row ? row.valor : 'Jhonatas' });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// ROTA PARA ATUALIZAR UMA CONFIGURAÇÃO (Ex: PUT /api/configuracoes/barberTwoName)
router.put('/:chave', async (req, res) => {
  const { valor } = req.body;
  
  if (!valor) {
    return res.status(400).json({ error: 'O valor não pode ser vazio' });
  }

  try {
    // Atualiza ou insere caso não exista (UPSERT no SQLite)
    await query(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?) 
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP`,
      [req.params.chave, valor]
    );
    res.json({ success: true, message: 'Nome atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

export default router;
