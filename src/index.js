/**
 * Ponto de entrada principal para o sistema Nexus
 * 
 * Este arquivo serve como o ponto de entrada principal para o sistema Nexus,
 * iniciando o servidor HTTP e os diferentes agentes.
 */

import nexusServer from './services/server.js';
import orchestratorAgent from './agents/orchestrator_agent.js';
import { createLogger } from './utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar logger
const logger = createLogger('Main');

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Inicializa o sistema Nexus
 */
async function initializeNexus() {
  try {
    logger.info('Iniciando sistema Nexus...');
    
    // Verificar diretórios necessários
    const requiredDirs = ['logs', 'data', 'public'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Diretório criado: ${dir}`);
      }
    }
    
    // Inicializar agente orquestrador
    logger.info('Inicializando agente orquestrador...');
    await orchestratorAgent.initialize();
    
    // Iniciar servidor HTTP
    logger.info('Iniciando servidor HTTP...');
    await nexusServer.start();
    
    logger.info('Sistema Nexus inicializado com sucesso!');
    
    // Resposta básica para Vercel
    const handleRequest = (req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Nexus - Sistema Inteligente</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                line-height: 1.6;
              }
              h1 {
                color: #333;
                border-bottom: 1px solid #eaeaea;
                padding-bottom: 0.5rem;
              }
              .card {
                background: #f9f9f9;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                margin-bottom: 1.5rem;
              }
              .info {
                color: #0070f3;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>Nexus - Sistema Inteligente</h1>
            
            <div class="card">
              <h2>Status do Sistema</h2>
              <p>API Nexus está <span class="info">online</span></p>
              <p>Orquestrador está <span class="info">ativo</span></p>
              <p>TaskMaster está <span class="info">${process.env.TASKMASTER_ENABLED === 'true' ? 'habilitado' : 'desabilitado'}</span></p>
            </div>
            
            <div class="card">
              <h2>API Endpoints</h2>
              <ul>
                <li><code>/api</code> - Endpoints principais da API</li>
                <li><code>/api/taskmaster</code> - Endpoints do TaskMaster</li>
              </ul>
            </div>
            
            <div class="card">
              <h2>Documentação</h2>
              <p>Para mais informações, consulte a documentação do projeto no <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">GitHub</a>.</p>
            </div>
            
            <footer>
              <p>© ${new Date().getFullYear()} Nexus System - Versão 1.0.0</p>
            </footer>
          </body>
        </html>
      `);
    };
    
    // Exportar função de handler para Vercel
    module.exports = handleRequest;
    
  } catch (error) {
    logger.error(`Erro ao inicializar Nexus: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Executar inicialização
initializeNexus().catch((error) => {
  console.error(`Erro fatal: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

// Exportar handler para Vercel
export default (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Nexus - Sistema Inteligente</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          h1 {
            color: #333;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 0.5rem;
          }
          .card {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 1.5rem;
          }
          .info {
            color: #0070f3;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Nexus - Sistema Inteligente</h1>
        
        <div class="card">
          <h2>Status do Sistema</h2>
          <p>API Nexus está <span class="info">online</span></p>
          <p>Orquestrador está <span class="info">ativo</span></p>
          <p>TaskMaster está <span class="info">${process.env.TASKMASTER_ENABLED === 'true' ? 'habilitado' : 'desabilitado'}</span></p>
        </div>
        
        <div class="card">
          <h2>API Endpoints</h2>
          <ul>
            <li><code>/api</code> - Endpoints principais da API</li>
            <li><code>/api/taskmaster</code> - Endpoints do TaskMaster</li>
          </ul>
        </div>
        
        <div class="card">
          <h2>Documentação</h2>
          <p>Para mais informações, consulte a documentação do projeto no <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">GitHub</a>.</p>
        </div>
        
        <footer>
          <p>© ${new Date().getFullYear()} Nexus System - Versão 1.0.0</p>
        </footer>
      </body>
    </html>
  `);
};
