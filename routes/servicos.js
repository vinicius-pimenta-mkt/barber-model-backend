import express from 'express';
import { all, get, query } from '../database/database.js';

const router = express.Router();

const limparServicosAntigos = async () => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    // Atualizado para a versão v3 para incluir "Corte e Barba"
    const jaLimpou = await get("SELECT valor FROM configuracoes WHERE chave = 'limpeza_servicos_v3'");
    
    if (!jaLimpou) {
      console.log('Limpando e atualizando lista oficial de serviços...');
      await query("DELETE FROM servicos");
      
      const servicosOficiais = [
        { nome: 'Corte', preco: 3500 },
        { nome: 'Primeiro corte', preco: 4500 },
        { nome: 'Corte kids', preco: 3500 },
        { nome: 'Barba', preco: 3500 },
        { nome: 'Corte e Barba', preco: 7000 } // Novo serviço adicionado
      ];

      for (const s of servicosOficiais) {
        await query('INSERT INTO servicos (nome, preco, status) VALUES (?, ?, ?)', [s.nome, s.preco, 'Ativo']);
      }

      await query("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('limpeza_servicos_v3', 'true')");
      console.log('✅ Lista de serviços atualizada com "Corte e Barba" (1h)!');
    }
  } catch (error) {
    console.error('Erro na limpeza de serviços:', error.message);
  }
};

setTimeout(limparServicosAntigos, 2000);

router.get('/', async (req, res) => {
  try {
    const servicos = await all("SELECT * FROM servicos WHERE status = 'Ativo' ORDER BY nome ASC");
    res.json(servicos);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao buscar serviços', detalhe: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, preco } = req.body;
  if (!nome || !preco) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

  let precoCentavos = 0;
  if (typeof preco === 'string') {
    const valorFloat = parseFloat(preco.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(valorFloat)) precoCentavos = Math.round(valorFloat * 100);
  } else if (typeof preco === 'number') {
    precoCentavos = preco;
  }

  try {
    await query("INSERT INTO servicos (nome, preco) VALUES (?, ?)", [nome, precoCentavos]);
    res.status(201).json({ success: true, message: 'Serviço criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar o serviço', detalhe: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, preco } = req.body;
  const { id } = req.params;

  let precoCentavos = 0;
  if (typeof preco === 'string') {
    const valorFloat = parseFloat(preco.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(valorFloat)) precoCentavos = Math.round(valorFloat * 100);
  } else if (typeof preco === 'number') {
    precoCentavos = preco;
  }

  try {
    await query("UPDATE servicos SET nome = ?, preco = ? WHERE id = ?", [nome, precoCentavos, id]);
    res.json({ success: true, message: 'Serviço atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o serviço', detalhe: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM servicos WHERE id = ?", [id]);
    res.json({ success: true, message: 'Serviço excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir o serviço', detalhe: error.message });
  }
});

export default router;
