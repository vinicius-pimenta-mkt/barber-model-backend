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

    // Tabela de usuários
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

    // Tabela de agendamentos - Admin/Geral
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

    // Tabela de agendamentos - Gabriel (Jhonatas no banco)
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

    // Tabela de agendamentos - Lucas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS agendamentos_lucas (
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
        data_vencimento TEXT, 
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

    // Tabela Histórico Produtos
    await db.exec(`
      CREATE TABLE IF NOT EXISTS produtos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_total REAL,
        forma_pagamento TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP,
        hora TEXT,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Configurações
    await db.exec(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Inserir os nomes de exibição caso não existam
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberOneName', 'Fabrício')");
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberTwoName', 'Gabriel')");
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberThreeName', 'Lucas')");

    // Tabela de Serviços
    await db.exec(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        status TEXT DEFAULT 'Ativo'
      )
    `);

    // Migrações de segurança
    try { await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_jhonatas ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_lucas ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos ADD COLUMN cliente_telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_jhonatas ADD COLUMN cliente_telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_lucas ADD COLUMN cliente_telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE assinantes ADD COLUMN cpf TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE assinantes ADD COLUMN telefone TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE clientes ADD COLUMN cpf TEXT"); } catch (e) {}

    // ==========================================
    // 1. Inserir usuário Admin
    // ==========================================
    const adminUser = process.env.ADMIN_USER || 'barbeariadomineiro';
    const adminPass = process.env.ADMIN_PASS || 'depaiparafilho2026';
    const existingAdmin = await db.get('SELECT * FROM users WHERE username = ?', adminUser);
    if (!existingAdmin) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', adminUser, adminPass, 'admin');
      console.log('Usuário admin inserido.');
    } else {
      // Força a atualização caso a senha ou a role estejam desatualizadas
      await db.run('UPDATE users SET password = ?, role = ? WHERE username = ?', adminPass, 'admin', adminUser);
    }

    // ==========================================
    // 2. Inserir usuário Gabriel
    // ==========================================
    const gabrielUser = 'gabriel';
    const gabrielPass = 'gabrielbarber2026';
    const existingGabriel = await db.get('SELECT * FROM users WHERE username = ?', gabrielUser);
    if (!existingGabriel) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', gabrielUser, gabrielPass, 'jhonatas');
      console.log('Usuário Gabriel inserido.');
    } else {
      await db.run('UPDATE users SET password = ?, role = ? WHERE username = ?', gabrielPass, 'jhonatas', gabrielUser);
    }

    // ==========================================
    // 3. Inserir usuário Lucas
    // ==========================================
    const lucasUser = 'lucas';
    const lucasPass = 'lucasbarber2026';
    const existingLucas = await db.get('SELECT * FROM users WHERE username = ?', lucasUser);
    if (!existingLucas) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', lucasUser, lucasPass, 'lucas');
      console.log('Usuário Lucas inserido.');
    } else {
      await db.run('UPDATE users SET password = ?, role = ? WHERE username = ?', lucasPass, 'lucas', lucasUser);
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
