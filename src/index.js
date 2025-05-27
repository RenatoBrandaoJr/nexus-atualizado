/**
 * TaskMaster Kanban - Vercel/Express App
 * Este arquivo serve como ponto de entrada para:
 * 1. API serverless no ambiente Vercel
 * 2. Servidor Express em ambiente de desenvolvimento local
 */

// Importações principais - Usando ES Modules conforme configurado no package.json
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importar o handler minimalista para a Vercel
import handler from './minimal-handler.js';

// Configuração de variáveis de ambiente
dotenv.config();

// Definir o diretório atual (para ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar o servidor Express
const app = express();
const port = process.env.TASKMASTER_PORT || process.env.PORT || 4000;

// Configurar middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Rota principal - redireciona para Kanban
app.get('/', (req, res) => {
  res.redirect('/kanban');
});

// Rotas da API
app.get('/api/tasks', (req, res) => {
  // Usar a mesma função de handler para manter consistência
  const mockReq = { url: '/api/tasks' };
  handler(mockReq, res);
});

// Servir o Kanban
app.get('/kanban', (req, res) => {
  // Usar a mesma função de handler para manter consistência
  const mockReq = { url: '/kanban' };
  handler(mockReq, res);
});

// Iniciar o servidor se não estiver em ambiente Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

// Função handler para ambiente serverless (Vercel)
export default handler;
