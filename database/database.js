import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export const initDatabase = async () => {
  try {
    const dbPath = path.join(__dirname, 'barbearia.db');
    console.log('Caminho do banco de dados:', dbPath);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Tabela de usuários (ATUALIZADA COM O SISTEMA DE CARGOS/ROLES DA MANUS)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de clientes
    await db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT,
        cpf TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de agendamentos - Lucas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        cliente_telefone TEXT,
        servico TEXT NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        preco REAL,
        forma_pagamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de agendamentos - Jhonatas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS agendamentos_jhonatas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        cliente_telefone TEXT,
        servico TEXT NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        preco REAL,
        forma_pagamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de Assinantes
    await db.exec(`
      CREATE TABLE IF NOT EXISTS assinantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        telefone TEXT,
        plano TEXT NOT NULL,
        data_vencimento TEXT, -- Formato: DD/MM
        ultima_visita TEXT,
        ultimo_pagamento TEXT,
        forma_pagamento TEXT,
        status TEXT DEFAULT 'Ativo',
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Produtos
    await db.exec(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        estoque INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Ativo'
      )
    `);

    // Tabela de Histórico de Vendas de Produtos
    await db.exec(`
      CREATE TABLE IF NOT EXISTS produtos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_total REAL,
        forma_pagamento TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // NOVA TABELA: Configurações Gerais do Sistema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Inserir o nome padrão do barbeiro 2 se a configuração ainda não existir
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberTwoName', 'Jhonatas')");

// --- ATENÇÃO: ESSA LINHA DELETA A TABELA ANTIGA PARA LIMPAR A SUJEIRA ---
    await db.exec(`DROP TABLE IF EXISTS servicos`);

    // NOVA TABELA: Serviços (Para o Agendamento)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        status TEXT DEFAULT 'Ativo'
      )
    `);

    // --- POPULAR SERVIÇOS AUTOMATICAMENTE ---
    const countServicos = await db.get('SELECT COUNT(*) as count FROM servicos');
    
    if (countServicos.count === 0) {
      console.log('Tabela de serviços vazia. Inserindo serviços padrão...');
      
      const servicosPadrao = [
        { nome: 'Barba', preco: 3000 },
        { nome: 'Barba + Pézinho', preco: 4000 },
        { nome: 'Barba + Pigmentação', preco: 5000 },
        { nome: 'Barba Express', preco: 2000 },
        { nome: 'Bigode', preco: 1000 },
        { nome: 'Camuflagem (Fios brancos)', preco: 3500 },
        { nome: 'Cone Hindu', preco: 2500 },
        { nome: 'Corte', preco: 4000 },
        { nome: 'Corte + Pigmentação', preco: 6000 },
        { nome: 'Corte 1 pente + barba', preco: 5000 },
        { nome: 'Corte e Barba', preco: 6000 },
        { nome: 'Corte Infantil', preco: 4500 },
        { nome: 'Corte Máquina 1 pente', preco: 2500 },
        { nome: 'Hidratação Capilar', preco: 2500 },
        { nome: 'Limpeza Nasal', preco: 2500 },
        { nome: 'Luzes', preco: 10000 },
        { nome: 'Luzes e Corte', preco: 14000 },
        { nome: 'Navalhado', preco: 3000 },
        { nome: 'Navalhado + Barba', preco: 5000 },
        { nome: 'Pezinho', preco: 1000 },
        { nome: 'Pigmentação', preco: 2500 },
        { nome: 'Platinado', preco: 10000 },
        { nome: 'Platinado e Corte', preco: 14000 },
        { nome: 'Sobrancelha', preco: 1000 },
        { nome: 'Sobrancelha na fita', preco: 2500 }
      ];

      for (const servico of servicosPadrao) {
        await db.run('INSERT INTO servicos (nome, preco) VALUES (?, ?)', [servico.nome, servico.preco]);
      }
      console.log('Serviços padrão populados com sucesso!');
    }

    // Migrações de segurança (AGORA INCLUINDO A MIGRAÇÃO DA MANUS PARA A COLUNA ROLE)
    try { await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_jhonatas ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos ADD COLUMN cliente_telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_jhonatas ADD COLUMN cliente_telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE assinantes ADD COLUMN cpf TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE assinantes ADD COLUMN telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE clientes ADD COLUMN cpf TEXT"); } catch (e) {}

    // Inserir usuário admin padrão se não existir (ATUALIZADO)
    const adminUser = process.env.ADMIN_USER || 'miguelalves';
    const adminPass = process.env.ADMIN_PASS || 'barbershopma';

    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', adminUser);
    if (!existingUser) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', adminUser, adminPass, 'admin');
      console.log('Usuário admin padrão inserido.');
    }

    // Inserir usuário Jhonatas se não existir (NOVIDADE IMPLEMENTADA)
    const jhonatasUser = 'jhonatasma';
    const jhonatasPass = 'majhonatas'; // Senha de acesso para o jhonatas
    const existingJhonatas = await db.get('SELECT * FROM users WHERE username = ?', jhonatasUser);
    if (!existingJhonatas) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', jhonatasUser, jhonatasPass, 'jhonatas');
      console.log('Usuário Jhonatas inserido.');
    }

    console.log('Banco de dados SQLite inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados SQLite:', error);
    throw error;
  }
};

export const query = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.run(sql, params);
};

export const get = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.get(sql, params);
};

export const all = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.all(sql, params);
};

export default db;
