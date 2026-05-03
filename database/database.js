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

    // Tabela de agendamentos - Fabrício (Admin)
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

    // Tabela de agendamentos - Lucas (NOVO PROFISSIONAL)
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
    
    // Inserir os nomes padrões dos barbeiros se a configuração ainda não existir
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberOneName', 'Fabrício')");
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberTwoName', 'Gabriel')");
    await db.run("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('barberThreeName', 'Lucas')");

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
    // 1. CREDENCIAIS DO ADMINISTRADOR (Fabrício)
    // ==========================================
    const adminUser = 'fabricioadmin'; 
    const adminPass = 'senha1234';     

    const existingUser = await db.get('SELECT * FROM users WHERE role = ?', 'admin');
    if (!existingUser) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', adminUser, adminPass, 'admin');
    } else {
      await db.run('UPDATE users SET username = ?, password = ? WHERE role = ?', adminUser, adminPass, 'admin');
    }

    // ==========================================
    // 2. CREDENCIAIS DO BARBEIRO 2 (Gabriel)
    // ==========================================
    const gabrielUser = 'gabrielbarber'; 
    const gabrielPass = 'senha5678';     
    
    const existingGabriel = await db.get('SELECT * FROM users WHERE role = ?', 'jhonatas');
    if (!existingGabriel) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', gabrielUser, gabrielPass, 'jhonatas');
    } else {
      await db.run('UPDATE users SET username = ?, password = ? WHERE role = ?', gabrielUser, gabrielPass, 'jhonatas');
    }

    // ==========================================
    // 3. CREDENCIAIS DO BARBEIRO 3 (Lucas)
    // ==========================================
    const lucasUser = 'lucasbarber';
    const lucasPass = 'senha9999';
    
    const existingLucas = await db.get('SELECT * FROM users WHERE role = ?', 'lucas');
    if (!existingLucas) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', lucasUser, lucasPass, 'lucas');
    } else {
      await db.run('UPDATE users SET username = ?, password = ? WHERE role = ?', lucasUser, lucasPass, 'lucas');
    }

    console.log('Banco de dados SQLite inicializado com sucesso e atualizado para 3 profissionais!');
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
