import express from 'express';
import { all, query } from '../database/database.js';

const router = express.Router();

// GET: Listar todos os serviços ativos
router.get('/', async (req, res) => {
  try {
    console.log("-> Tentando buscar serviços no banco...");
    const servicos = await all("SELECT * FROM servicos WHERE status = 'Ativo' ORDER BY nome ASC");
    res.json(servicos);
  } catch (error) {
    console.error('❌ ERRO ROTA GET /servicos:', error.message);
    // AGORA ELE VAI TE MOSTRAR EXATAMENTE O QUE DEU ERRADO
    res.status(500).json({ 
        error: 'Erro interno ao buscar serviços',
        detalhe: error.message 
    });
  }
});

// POST: Criar um novo serviço
router.post('/', async (req, res) => {
  const { nome, preco } = req.body;
  
  if (!nome || !preco) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
  }

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
    console.error('❌ ERRO ROTA POST /servicos:', error.message);
    res.status(500).json({ error: 'Erro ao salvar o serviço', detalhe: error.message });
  }
});

// PUT: Editar um serviço existente
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
    console.error('❌ ERRO ROTA PUT /servicos:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar o serviço', detalhe: error.message });
  }
});

// DELETE: Excluir um serviço
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await query("DELETE FROM servicos WHERE id = ?", [id]);
    res.json({ success: true, message: 'Serviço excluído com sucesso' });
  } catch (error) {
    console.error('❌ ERRO ROTA DELETE /servicos:', error.message);
    res.status(500).json({ error: 'Erro ao excluir o serviço', detalhe: error.message });
  }
});

export default router;
