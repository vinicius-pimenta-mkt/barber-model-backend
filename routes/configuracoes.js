import express from 'express';
import { get, query } from '../database/database.js';

const router = express.Router();

// Middleware tático: Garante que a tabela existe antes de qualquer coisa
const ensureTableExists = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// GET: Buscar uma configuração (Ex: /api/configuracoes/barberTwoName)
router.get('/:chave', async (req, res) => {
  try {
    await ensureTableExists(); // Tática Blindada
    
    const row = await get('SELECT valor FROM configuracoes WHERE chave = ?', [req.params.chave]);
    
    // Fallback de segurança: Se não existir no banco, manda o padrão
    let valorPadrao = req.params.chave === 'barberOneName' ? 'Miguel' : 'Jhonatas';
    
    res.json({ valor: row ? row.valor : valorPadrao });
  } catch (error) {
    console.error(`❌ ERRO GET /configuracoes/${req.params.chave}:`, error.message);
    res.status(500).json({ error: 'Erro ao buscar configuração', detalhe: error.message });
  }
});

// PUT: Atualizar uma configuração
router.put('/:chave', async (req, res) => {
  const { valor } = req.body;
  
  if (!valor) {
    return res.status(400).json({ error: 'O valor não pode ser vazio' });
  }

  try {
    await ensureTableExists(); // Tática Blindada
    
    // INSERT OR REPLACE é mais seguro no SQLite do que ON CONFLICT
    await query(
      `INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [req.params.chave, valor]
    );
    res.json({ success: true, message: 'Nome atualizado com sucesso!' });
  } catch (error) {
    console.error(`❌ ERRO PUT /configuracoes/${req.params.chave}:`, error.message);
    res.status(500).json({ error: 'Erro ao atualizar configuração', detalhe: error.message });
  }
});

export default router;
