import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Auto-cria as tabelas no Banco de Dados se não existirem
const initDb = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco INTEGER NOT NULL,
        estoque INTEGER DEFAULT 0
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS produtos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        tipo TEXT,
        quantidade INTEGER,
        valor_total INTEGER,
        forma_pagamento TEXT,
        data TEXT,
        hora TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
      )
    `);

    // AUTO-POPULAÇÃO DE PRODUTOS
    const countRes = await get('SELECT COUNT(*) as count FROM produtos');
    if (countRes && countRes.count === 0) {
      console.log("Tabela vazia detectada. Injetando lista de produtos padrão...");
      const produtosIniciais = [
        { nome: 'Balm para barba', preco: 4500 },
        { nome: 'Cera Modeladora Efeito Matte', preco: 3500 },
        { nome: 'Gel cola', preco: 3000 },
        { nome: 'Leave-in', preco: 4500 },
        { nome: 'Loção pós barba', preco: 4000 },
        { nome: 'Óleo para barba', preco: 4500 },
        { nome: 'Pomada Modeladora (Laranja)', preco: 3000 },
        { nome: 'Pomada Modeladora Efeito seco (amarelo)', preco: 3000 },
        { nome: 'Pomada Modeladora em Pó', preco: 4000 },
        { nome: 'Pomada Modeladora Extra Forte (Azul)', preco: 3000 },
        { nome: 'Shampoo Anti-Caspa', preco: 4000 },
        { nome: 'Shampoo para Barba', preco: 2500 }
      ];

      for (const p of produtosIniciais) {
        await query('INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)', [p.nome, p.preco, 10]);
      }
      console.log("✅ 12 produtos inseridos com sucesso com 10 unidades cada!");
    }
  } catch (error) {
    console.error('Erro ao criar tabelas de produtos:', error);
  }
};

setTimeout(initDb, 2000);

// Listar todos os produtos
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await all('SELECT * FROM produtos ORDER BY nome ASC');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Criar novo produto
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nome, preco, estoque } = req.body;
    const precoEmCentavos = Math.round(parseFloat(preco.toString().replace(',', '.')) * 100);
    const result = await query(
      'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)',
      [nome, precoEmCentavos, parseInt(estoque) || 0]
    );
    res.status(201).json({ id: result.lastID, message: 'Produto cadastrado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Movimentar (Comprar ou Vender) - TOTALMENTE BLINDADO
router.post('/:id/movimentar', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, quantidade, forma_pagamento } = req.body;
    
    // Força conversão para número para evitar erros no banco
    const produtoId = parseInt(id);
    const qtd = parseInt(quantidade);
    
    const produto = await get('SELECT * FROM produtos WHERE id = ?', [produtoId]);
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });

    if (tipo === 'venda' && produto.estoque < qtd) {
      return res.status(400).json({ error: `Estoque insuficiente. Restam apenas ${produto.estoque} unidades.` });
    }

    const novoEstoque = tipo === 'venda' ? produto.estoque - qtd : produto.estoque + qtd;
    const valorTotal = Math.round(qtd * produto.preco);
    
    // Data e Hora "à prova de falhas" (não depende da tradução do Linux)
    const agora = new Date();
    const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
    const br = new Date(utc + (3600000 * -3));
    
    const dataStr = br.toISOString().split('T')[0];
    const horaStr = `${String(br.getHours()).padStart(2, '0')}:${String(br.getMinutes()).padStart(2, '0')}`;

    await query('UPDATE produtos SET estoque = ? WHERE id = ?', [novoEstoque, produtoId]);
    await query(
      'INSERT INTO produtos_historico (produto_id, tipo, quantidade, valor_total, forma_pagamento, data, hora) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [produtoId, tipo, qtd, valorTotal, forma_pagamento || 'Dinheiro', dataStr, horaStr]
    );

    res.json({ message: 'Estoque atualizado com sucesso', novoEstoque });
  } catch (error) {
    console.error('ERRO CRÍTICO AO MOVIMENTAR ESTOQUE:', error);
    // Agora o erro exato do banco vai aparecer no alerta da sua tela!
    res.status(500).json({ error: `Erro no servidor: ${error.message}` });
  }
});

// Atualizar produto (Nome e Preço)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, preco } = req.body;
    const precoEmCentavos = Math.round(parseFloat(preco.toString().replace(',', '.')) * 100);
    await query('UPDATE produtos SET nome = ?, preco = ? WHERE id = ?', [nome, precoEmCentavos, parseInt(id)]);
    res.json({ message: 'Produto atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM produtos WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Produto removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

export default router;
