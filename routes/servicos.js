import express from 'express';
import { all, get, query } from '../database/database.js';

const router = express.Router();

// GET: Listar todos os serviços ativos (TÁTICA BLINDADA: Cria e Popula a tabela se precisar)
router.get('/', async (req, res) => {
  try {
    // 1. FORÇA A CRIAÇÃO DA TABELA (Ignora os bugs do Docker)
    await query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        status TEXT DEFAULT 'Ativo'
      )
    `);

    // 2. VERIFICA SE A TABELA ESTÁ VAZIA. SE ESTIVER, INJETA OS DADOS
    const countServicos = await get('SELECT COUNT(*) as count FROM servicos');
    
    if (countServicos && countServicos.count === 0) {
      console.log('Tabela de serviços vazia. Inserindo serviços padrão pela rota...');
      
      const servicosPadrao = [
        { nome: 'Barba', preco: 3000 }, { nome: 'Barba + Pézinho', preco: 4000 },
        { nome: 'Barba + Pigmentação', preco: 5000 }, { nome: 'Barba Express', preco: 2000 },
        { nome: 'Bigode', preco: 1000 }, { nome: 'Camuflagem (Fios brancos)', preco: 3500 },
        { nome: 'Cone Hindu', preco: 2500 }, { nome: 'Corte', preco: 4000 },
        { nome: 'Corte + Pigmentação', preco: 6000 }, { nome: 'Corte 1 pente + barba', preco: 5000 },
        { nome: 'Corte e Barba', preco: 6000 }, { nome: 'Corte Infantil', preco: 4500 },
        { nome: 'Corte Máquina 1 pente', preco: 2500 }, { nome: 'Hidratação Capilar', preco: 2500 },
        { nome: 'Limpeza Nasal', preco: 2500 }, { nome: 'Luzes', preco: 10000 },
        { nome: 'Luzes e Corte', preco: 14000 }, { nome: 'Navalhado', preco: 3000 },
        { nome: 'Navalhado + Barba', preco: 5000 }, { nome: 'Pezinho', preco: 1000 },
        { nome: 'Pigmentação', preco: 2500 }, { nome: 'Platinado', preco: 10000 },
        { nome: 'Platinado e Corte', preco: 14000 }, { nome: 'Sobrancelha', preco: 1000 },
        { nome: 'Sobrancelha na fita', preco: 2500 }
      ];

      for (const servico of servicosPadrao) {
        await query('INSERT INTO servicos (nome, preco) VALUES (?, ?)', [servico.nome, servico.preco]);
      }
      console.log('✅ Serviços injetados com sucesso!');
    }

    // 3. BUSCA E RETORNA OS SERVIÇOS PARA A TELA
    const servicos = await all("SELECT * FROM servicos WHERE status = 'Ativo' ORDER BY nome ASC");
    res.json(servicos);
    
  } catch (error) {
    console.error('❌ ERRO ROTA GET /servicos:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar serviços', detalhe: error.message });
  }
});

// POST: Criar um novo serviço
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
    res.status(500).json({ error: 'Erro ao excluir o serviço', detalhe: error.message });
  }
});

export default router;
