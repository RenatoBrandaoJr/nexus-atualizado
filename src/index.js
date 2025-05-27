/**
 * Nexus - Sistema Inteligente
 * 
 * Este arquivo é configurado para funcionar tanto como:
 * 1. Função serverless no ambiente Vercel 
 * 2. Servidor Express em ambiente de desenvolvimento local
 */

import express from 'express';
import { TaskMasterKanban } from './components/taskmaster-kanban.js';

// Iniciando o servidor Express
const app = express();
const port = 3001;

// Rota principal que exibe a mensagem
app.get('/', (req, res) => {
  res.send(`
    <h1>Servidor de webhook funcionando</h1>
    <p>Esta mensagem confirma que o servidor está rodando na porta 3001.</p>
    <p><a href="/taskmaster-kanban" style="padding: 10px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Visualizar Quadro Kanban do TaskMaster</a></p>
  `);
});

// Rota para o quadro Kanban do TaskMaster
app.get('/taskmaster-kanban', async (req, res) => {
  try {
    // Criar uma instância do componente Kanban
    const kanban = new TaskMasterKanban();
    
    // Sincronizar com o TaskMaster e gerar o HTML do quadro
    await kanban.syncWithTaskMaster();
    const html = kanban.generateHtml();
    
    // Enviar a resposta com o HTML do quadro
    res.send(html);
  } catch (error) {
    console.error('Erro ao gerar o quadro Kanban:', error);
    res.status(500).send(`
      <h1>Erro ao carregar o quadro Kanban</h1>
      <p>Não foi possível carregar o quadro Kanban do TaskMaster.</p>
      <p>Erro: ${error.message}</p>
      <p><a href="/">Voltar</a></p>
    `);
  }
});

// Iniciar o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// Função handler para ambiente serverless (Vercel)
export default async function handler(req, res) {
  // Importar o TaskMasterKanban na função handler
  const { TaskMasterKanban } = await import('./components/taskmaster-kanban.js');
  try {
    // Definir cabeçalhos básicos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Verificar a rota solicitada
    const url = req.url || '';
    
    // Rota para o quadro Kanban do TaskMaster
    if (url === '/taskmaster-kanban' || url.startsWith('/taskmaster-kanban?')) {
      try {
        // Criar uma instância do componente Kanban
        const kanban = new TaskMasterKanban();
        
        // Sincronizar com o TaskMaster e gerar o HTML do quadro
        await kanban.syncWithTaskMaster();
        const html = kanban.generateHtml();
        
        // Enviar a resposta com o HTML do quadro
        return res.send(html);
      } catch (error) {
        console.error('Erro ao gerar o quadro Kanban:', error);
        return res.status(500).send(`
          <h1>Erro ao carregar o quadro Kanban</h1>
          <p>Não foi possível carregar o quadro Kanban do TaskMaster.</p>
          <p>Erro: ${error.message}</p>
          <p><a href="/">Voltar</a></p>
        `);
      }
    }
    
    // Página inicial simples
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Nexus - Sistema Inteligente</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
              color: #333;
              background-color: #f8f9fa;
            }
            h1, h2 {
              color: #1a73e8;
              margin-top: 0;
            }
            h1 {
              border-bottom: 2px solid #eaeaea;
              padding-bottom: 0.5rem;
              margin-bottom: 2rem;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              padding: 1.5rem;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
              margin-bottom: 2rem;
            }
            .status-badge {
              display: inline-block;
              padding: 0.25rem 0.75rem;
              border-radius: 50px;
              font-size: 0.875rem;
              font-weight: 500;
              margin-left: 0.5rem;
              vertical-align: middle;
            }
            .status-active {
              background-color: #e6f4ea;
              color: #137333;
            }
            a {
              color: #1a73e8;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            footer {
              margin-top: 3rem;
              text-align: center;
              color: #666;
              font-size: 0.9rem;
            }
          </style>
        </head>
        <body>
          <h1>Nexus - Sistema Inteligente</h1>
          
          <div class="card">
            <h2>Status do Sistema</h2>
            <p>API Nexus <span class="status-badge status-active">online</span></p>
            <p>Vercel <span class="status-badge status-active">conectado</span></p>
          </div>
          
          <div class="card">
            <h2>Documentação</h2>
            <p>Para mais informações, consulte a documentação do projeto no <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">GitHub</a>.</p>
          </div>
          
          <footer>
            <p>&copy; ${new Date().getFullYear()} Nexus System - Versão 1.0.0</p>
          </footer>
        </body>
      </html>
    `;
    
    // Enviar resposta
    res.statusCode = 200;
    res.end(html);
    
  } catch (error) {
    // Em caso de erro, enviar uma resposta simples
    console.error('Erro:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Erro - Nexus</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: sans-serif; 
              text-align: center; 
              padding: 40px; 
              max-width: 600px; 
              margin: 0 auto; 
            }
            h1 { color: #d32f2f; }
            a { color: #2196f3; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .error-code { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Erro Interno</h1>
          <p class="error-code">Código: 500</p>
          <p>Desculpe, ocorreu um erro ao processar sua solicitação.</p>
          <p>Por favor, tente novamente mais tarde.</p>
          <p><a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">Voltar ao GitHub</a></p>
        </body>
      </html>
    `);
  }
};

// Verifica se está sendo executado diretamente (ambiente local)
// Este código só será executado em ambiente de desenvolvimento, não na Vercel
if (import.meta.url.includes(process.argv[1])) {
  const app = express();
  const port = 3001;
  
  // Rota principal
  app.get('/', (req, res) => {
    res.send('<h1>Servidor de webhook funcionando</h1><p>Esta mensagem confirma que o servidor está funcionando corretamente.</p>');
  });
  
  // Iniciar o servidor
  app.listen(port, () => {
    console.log(`Servidor iniciado em http://localhost:${port}`);
  });
}
