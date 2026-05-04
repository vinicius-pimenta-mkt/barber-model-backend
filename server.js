import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rotas
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import agendamentosRoutes from './routes/agendamentos.js';
import agendamentosJhonatasRoutes from './routes/agendamentos-jhonatas.js';
import agendamentosLucasRoutes from './routes/agendamentos-lucas.js'; 
import relatoriosRoutes from './routes/relatorios.js';
import relatoriosJhonatasRoutes from './routes/relatorios-jhonatas.js'; 
import relatoriosLucasRoutes from './routes/relatorios-lucas.js';       
import assinantesRoutes from './routes/assinantes.js';
import produtosRoutes from './routes/produtos.js';
import configuracoesRoutes from './routes/configuracoes.js'; 
import servicosRoutes from './routes/servicos.js';         

// Importar inicialização e funções do banco (NOVO: importamos get, all e query)
import { initDatabase, get, all, query } from './database/database.js';

// Carregar variáveis de ambiente
dotenv.config();

console.log('--- Iniciando Servidor Barbearia ---');
console.log('Ambiente:', process.env.NODE_ENV);
console.log('Porta:', process.env.PORT || 3000);

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORREÇÃO DO CORS (FLEXÍVEL E SEM BLOQUEIOS) ---
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Rotas de teste/healthcheck
app.get('/', (req, res) => {
  res.json({ status: 'API Barbearia rodando perfeitamente com 3 profissionais!' });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/agendamentos-jhonatas', agendamentosJhonatasRoutes);
app.use('/api/agendamentos-lucas', agendamentosLucasRoutes); 
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/relatorios-jhonatas', relatoriosJhonatasRoutes); 
app.use('/api/relatorios-lucas', relatoriosLucasRoutes);       
app.use('/api/assinantes', assinantesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/configuracoes', configuracoesRoutes); 
app.use('/api/servicos', servicosRoutes);      

// Rota 404 para APIs não encontradas
app.use('*', (req, res) => {
  console.log(`404 - Rota não encontrada: ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Inicializar banco de dados e servidor
const startServer = async () => {
  try {
    console.log('Inicializando banco de dados...');
    await initDatabase();

    // ====================================================================
    // INJEÇÃO FORÇADA DE USUÁRIOS (Roda por fora da pasta protegida)
    // ====================================================================
    console.log('🛠️ Verificando e forçando atualização de acessos...');
    
    const usuariosOficiais = [
      { user: 'barbeariadomineiro', pass: 'depaiparafilho2026', role: 'admin' },
      { user: 'gabriel', pass: 'gabriel2026', role: 'jhonatas' },
      { user: 'lucas', pass: 'lucas2026', role: 'lucas' }
    ];

    for (const u of usuariosOficiais) {
      const existe = await get('SELECT id FROM users WHERE username = ?', [u.user]);
      if (existe) {
        await query('UPDATE users SET password = ?, role = ? WHERE username = ?', [u.pass, u.role, u.user]);
      } else {
        await query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [u.user, u.pass, u.role]);
      }
    }

    console.log('--- 🔐 USUÁRIOS OFICIAIS ATIVOS NO BANCO ---');
    const todosUsuarios = await all("SELECT id, username, password, role FROM users");
    console.table(todosUsuarios);
    console.log('--------------------------------------------');
    // ====================================================================

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API rodando na porta ${PORT}`);
      console.log('Servidor pronto para receber requisições.');
    });
  } catch (error) {
    console.error('ERRO CRÍTICO ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Lógica de inicialização para Easypanel/Docker vs Vercel
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  startServer();
} else {
  startServer();
}

export default app;
