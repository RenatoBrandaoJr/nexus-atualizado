/**
 * Função serverless para o Nexus no ambiente Vercel
 * 
 * Este arquivo serve como ponto de entrada para o Nexus na Vercel,
 * seguindo o modelo de funções serverless.
 */

export default function handler(req, res) {
  // Definir cabeçalhos para segurança e cache
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
  
  // Verificar a rota solicitada
  const { url } = req;
  
  // Responder com HTML para a rota principal
  if (url === '/' || url === '') {
    return sendHomePage(res);
  }
  
  // API Endpoints - Para implementações futuras
  if (url.startsWith('/api/')) {
    return handleApiRequest(req, res);
  }
  
  // Rota não encontrada
  return send404(res);
}

/**
 * Envia a página inicial do Nexus
 */
function sendHomePage(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  
  const taskMasterStatus = process.env.TASKMASTER_ENABLED === 'true' ? 'habilitado' : 'desabilitado';
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
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
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
          }
          .info {
            color: #1a73e8;
            font-weight: bold;
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
          .status-enabled {
            background-color: #e8f0fe;
            color: #1967d2;
          }
          .status-disabled {
            background-color: #f8f9fa;
            color: #80868b;
          }
          code {
            background: #f5f5f5;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9rem;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          }
          ul {
            padding-left: 1.5rem;
          }
          li {
            margin-bottom: 0.5rem;
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
          <p>TaskMaster <span class="status-badge ${taskMasterStatus === 'habilitado' ? 'status-enabled' : 'status-disabled'}">${taskMasterStatus}</span></p>
          <p>Vercel <span class="status-badge status-active">conectado</span></p>
        </div>
        
        <div class="card">
          <h2>API Endpoints</h2>
          <ul>
            <li><code>/api</code> - Endpoints principais da API</li>
            <li><code>/api/taskmaster</code> - Endpoints do TaskMaster</li>
          </ul>
        </div>
        
        <div class="card">
          <h2>Integração TaskMaster</h2>
          <p>O TaskMaster está integrado ao Nexus para gerenciamento avançado de tarefas:</p>
          <ul>
            <li>Gerenciamento de tarefas via API REST</li>
            <li>Integração com agentes do Nexus</li>
            <li>Análise de complexidade de tarefas</li>
            <li>Expansão automática de tarefas</li>
          </ul>
          <p>Para mais informações, consulte a <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado/blob/main/docs/integracao_taskmaster_guia.md">documentação do TaskMaster</a>.</p>
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
  `;
  
  res.end(html);
  return;
}

/**
 * Manipula requisições de API
 */
function handleApiRequest(req, res) {
  const { url, method } = req;
  
  // Responder com JSON para endpoints de API
  res.setHeader('Content-Type', 'application/json');
  
  // Verificar a rota da API
  if (url === '/api/status') {
    return res.end(JSON.stringify({
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      taskmaster: process.env.TASKMASTER_ENABLED === 'true'
    }));
  }
  
  if (url.startsWith('/api/taskmaster')) {
    return res.end(JSON.stringify({
      message: 'TaskMaster API endpoints em desenvolvimento',
      available: process.env.TASKMASTER_ENABLED === 'true',
      endpoints: [
        '/api/taskmaster/tasks',
        '/api/taskmaster/tasks/:id',
        '/api/taskmaster/next-task'
      ]
    }));
  }
  
  // API endpoint não encontrado
  res.statusCode = 404;
  return res.end(JSON.stringify({
    error: 'API endpoint não encontrado',
    path: url
  }));
}

/**
 * Envia resposta 404 para rotas não encontradas
 */
function send404(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 404;
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <title>Página não encontrada - Nexus</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            text-align: center;
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #333;
          }
          .error-code {
            font-size: 1.5rem;
            color: #666;
            margin-bottom: 2rem;
          }
          .home-link {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          .home-link:hover {
            background-color: #1557b0;
          }
        </style>
      </head>
      <body>
        <h1>Página não encontrada</h1>
        <div class="error-code">Erro 404</div>
        <p>A página que você está procurando não existe ou foi movida.</p>
        <a href="/" class="home-link">Voltar para o início</a>
      </body>
    </html>
  `;
  
  res.end(html);
  return;
}
