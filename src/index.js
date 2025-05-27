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
  
  // Quadro Kanban do TaskMaster
  if (url === '/taskmaster-kanban') {
    return sendTaskMasterKanban(res);
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
          .action-button {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-weight: 500;
            margin-top: 1rem;
            transition: background-color 0.2s;
          }
          .action-button:hover {
            background-color: #1557b0;
            text-decoration: none;
          }
          .action-button-secondary {
            background-color: #f1f3f4;
            color: #1a73e8;
          }
          .action-button-secondary:hover {
            background-color: #e8eaed;
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
          ${taskMasterStatus === 'habilitado' ? `<a href="/taskmaster-kanban" class="action-button">Abrir Quadro Kanban</a>` : ''}
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
/**
 * Exibe o quadro Kanban do TaskMaster
 */
function sendTaskMasterKanban(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  
  // Verificar se o TaskMaster está habilitado
  if (process.env.TASKMASTER_ENABLED !== 'true') {
    return res.end(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>TaskMaster Kanban - Nexus</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              text-align: center;
              line-height: 1.6;
            }
            .message-card {
              background-color: #f5f5f5;
              border-radius: 8px;
              padding: 2rem;
              margin: 4rem auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
            }
            .status-icon {
              font-size: 4rem;
              color: #757575;
              margin-bottom: 1rem;
            }
            .home-link {
              display: inline-block;
              margin-top: 1.5rem;
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
          <div class="message-card">
            <div class="status-icon">⚠️</div>
            <h1>TaskMaster Desabilitado</h1>
            <p>O módulo TaskMaster está desabilitado no sistema.</p>
            <p>Habilite-o nas configurações do ambiente para acessar o quadro Kanban.</p>
            <a href="/" class="home-link">Voltar para o início</a>
          </div>
        </body>
      </html>
    `);
  }
  
  // HTML do quadro Kanban
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <title>TaskMaster Kanban - Nexus</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
            color: #333;
          }
          
          .navbar {
            background-color: #1a73e8;
            color: white;
            padding: 0.5rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .navbar-brand {
            font-size: 1.25rem;
            font-weight: 600;
            display: flex;
            align-items: center;
          }
          
          .navbar-logo {
            height: 32px;
            margin-right: 0.75rem;
          }
          
          .navbar-links {
            display: flex;
            gap: 1.5rem;
          }
          
          .navbar-link {
            color: white;
            text-decoration: none;
            opacity: 0.9;
            transition: opacity 0.2s;
          }
          
          .navbar-link:hover {
            opacity: 1;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
          }
          
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }
          
          .page-title {
            font-size: 1.75rem;
            font-weight: 600;
            color: #333;
            margin: 0;
          }
          
          .btn {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            border: none;
            font-size: 0.875rem;
          }
          
          .btn-primary {
            background-color: #1a73e8;
            color: white;
          }
          
          .btn-primary:hover {
            background-color: #1557b0;
          }
          
          .btn-secondary {
            background-color: #f1f3f4;
            color: #1a73e8;
          }
          
          .btn-secondary:hover {
            background-color: #e8eaed;
          }
          
          .kanban-board {
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            padding-bottom: 1rem;
          }
          
          .kanban-column {
            flex: 0 0 300px;
            background-color: #f1f3f4;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            max-height: calc(100vh - 180px);
          }
          
          .column-header {
            padding: 0.75rem;
            font-weight: 600;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .column-title {
            font-size: 0.9rem;
          }
          
          .column-count {
            background-color: rgba(0,0,0,0.1);
            border-radius: 12px;
            padding: 0.1rem 0.5rem;
            font-size: 0.8rem;
          }
          
          .column-cards {
            padding: 0.5rem;
            overflow-y: auto;
            flex-grow: 1;
          }
          
          .card {
            background-color: white;
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-top: 3px solid #ccc;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
          }
          
          .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 5px rgba(0,0,0,0.15);
          }
          
          .card-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          
          .card-title {
            font-weight: 500;
            font-size: 0.875rem;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .card-id {
            font-size: 0.75rem;
            color: #757575;
            flex-shrink: 0;
            margin-left: 0.5rem;
          }
          
          .card-body {
            font-size: 0.8125rem;
            color: #555;
            margin-bottom: 0.5rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .card-footer {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: #757575;
          }
          
          .card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            margin-top: 0.5rem;
          }
          
          .card-tag {
            font-size: 0.6875rem;
            padding: 0.125rem 0.375rem;
            border-radius: 10px;
            background-color: #f5f5f5;
            color: #555;
          }
          
          .card-priority-high {
            border-top-color: #ef5350;
          }
          
          .card-priority-medium {
            border-top-color: #ffb74d;
          }
          
          .card-priority-low {
            border-top-color: #66bb6a;
          }
          
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
          }
          
          .spinner {
            border: 3px solid rgba(0,0,0,0.1);
            border-radius: 50%;
            border-top: 3px solid #1a73e8;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="navbar">
          <div class="navbar-brand">
            <img src="https://cdn-icons-png.flaticon.com/512/2631/2631341.png" alt="Nexus" class="navbar-logo">
            Nexus TaskMaster
          </div>
          <div class="navbar-links">
            <a href="/" class="navbar-link">Início</a>
            <a href="/api/taskmaster" class="navbar-link">API</a>
            <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado" class="navbar-link" target="_blank">GitHub</a>
          </div>
        </div>
        
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Quadro Kanban TaskMaster</h1>
            <div>
              <button class="btn btn-secondary" id="btn-refresh">Atualizar</button>
              <button class="btn btn-primary" id="btn-add-task">Nova Tarefa</button>
            </div>
          </div>
          
          <div id="kanban-board" class="kanban-board">
            <div class="loading">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
        
        <script>
          // Configuração
          const columns = [
            { id: 'a-fazer', title: 'A fazer', status: 'pending', color: '#e3f2fd' },
            { id: 'em-andamento', title: 'Em andamento', status: 'in-progress', color: '#fff3e0' },
            { id: 'revisao', title: 'Revisão', status: 'review', color: '#e8f5e9' },
            { id: 'concluido', title: 'Concluído', status: 'done', color: '#f3e5f5' },
            { id: 'adiado', title: 'Adiado', status: 'deferred', color: '#f5f5f5' },
            { id: 'cancelado', title: 'Cancelado', status: 'cancelled', color: '#ffebee' }
          ];
          
          // Criar colunas
          function createColumns() {
            const board = document.getElementById('kanban-board');
            board.innerHTML = ''; // Limpar o quadro
            
            columns.forEach(column => {
              const columnEl = document.createElement('div');
              columnEl.className = 'kanban-column';
              columnEl.id = `column-${column.id}`;
              columnEl.style.backgroundColor = column.color;
              
              columnEl.innerHTML = `
                <div class="column-header">
                  <span class="column-title">${column.title}</span>
                  <span class="column-count" id="count-${column.id}">0</span>
                </div>
                <div class="column-cards" id="cards-${column.id}">
                  <div class="loading">
                    <div class="spinner"></div>
                  </div>
                </div>
              `;
              
              board.appendChild(columnEl);
            });
          }
          
          // Carregar tarefas
          async function loadTasks() {
            try {
              // Simulação de chamada à API - em produção, usar fetch para a API real
              // const response = await fetch('/api/taskmaster/tasks');
              // const data = await response.json();
              
              // Para fins de demonstração, criamos tarefas de exemplo
              setTimeout(() => {
                const tasks = [
                  {
                    id: '1',
                    title: 'Configurar integração TaskMaster',
                    description: 'Implementar a integração entre Nexus e TaskMaster',
                    status: 'done',
                    priority: 'high',
                    subtasks: [{id: '1.1'}, {id: '1.2'}, {id: '1.3'}],
                    tags: ['integração', 'core']
                  },
                  {
                    id: '2',
                    title: 'Desenvolver componente de quadro Kanban',
                    description: 'Criar visualização Kanban para as tarefas do TaskMaster',
                    status: 'done',
                    priority: 'high',
                    subtasks: [{id: '2.1'}, {id: '2.2'}],
                    tags: ['frontend', 'ui']
                  },
                  {
                    id: '3',
                    title: 'Implementar API para gerenciamento de tarefas',
                    description: 'Criar endpoints RESTful para o TaskMaster',
                    status: 'in-progress',
                    priority: 'medium',
                    tags: ['api', 'backend']
                  },
                  {
                    id: '4',
                    title: 'Adicionar autenticação para API',
                    description: 'Implementar autenticação JWT para os endpoints do TaskMaster',
                    status: 'pending',
                    priority: 'medium',
                    tags: ['segurança', 'api']
                  },
                  {
                    id: '5',
                    title: 'Implementar funcionalidade de drag-and-drop',
                    description: 'Adicionar suporte para arrastar e soltar cartões entre colunas',
                    status: 'pending',
                    priority: 'low',
                    tags: ['frontend', 'ux']
                  },
                  {
                    id: '6',
                    title: 'Escrever documentação da API',
                    description: 'Documentar todos os endpoints do TaskMaster',
                    status: 'pending',
                    priority: 'low',
                    tags: ['documentação']
                  },
                  {
                    id: '7',
                    title: 'Configurar deploy na Vercel',
                    description: 'Configurar a aplicação para deploy na plataforma Vercel',
                    status: 'done',
                    priority: 'high',
                    tags: ['devops', 'deploy']
                  }
                ];
                
                renderTasks(tasks);
              }, 1000);
            } catch (error) {
              console.error('Erro ao carregar tarefas:', error);
              alert('Erro ao carregar tarefas. Tente novamente mais tarde.');
            }
          }
          
          // Renderizar tarefas nas colunas
          function renderTasks(tasks) {
            // Limpar colunas
            columns.forEach(column => {
              const cardsContainer = document.getElementById(`cards-${column.id}`);
              cardsContainer.innerHTML = '';
            });
            
            // Distribuir tarefas nas colunas apropriadas
            tasks.forEach(task => {
              const column = columns.find(col => col.status === task.status) || columns[0];
              const cardsContainer = document.getElementById(`cards-${column.id}`);
              
              // Criar cartão
              const card = document.createElement('div');
              card.className = `card card-priority-${task.priority || 'medium'}`;
              card.setAttribute('data-id', task.id);
              
              const subtasksCount = task.subtasks?.length || 0;
              const subtasksText = subtasksCount > 0 ? 
                `<span class="card-tag">${subtasksCount} subtarefa${subtasksCount > 1 ? 's' : ''}</span>` : '';
              
              card.innerHTML = `
                <div class="card-header">
                  <h3 class="card-title">${task.title}</h3>
                  <span class="card-id">#${task.id}</span>
                </div>
                <div class="card-body">${task.description || ''}</div>
                <div class="card-tags">
                  ${(task.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                  ${subtasksText}
                  <span class="card-tag" style="background-color: ${getPriorityColor(task.priority)}">${task.priority || 'medium'}</span>
                </div>
              `;
              
              // Adicionar evento de clique
              card.addEventListener('click', () => {
                // Implementar abertura de modal com detalhes da tarefa
                alert(`Detalhes da tarefa #${task.id}: ${task.title}\n\nFuncionalidade em desenvolvimento.`);
              });
              
              cardsContainer.appendChild(card);
            });
            
            // Atualizar contadores
            updateColumnCounts(tasks);
          }
          
          // Atualizar contadores de cartões em cada coluna
          function updateColumnCounts(tasks) {
            columns.forEach(column => {
              const count = tasks.filter(task => task.status === column.status).length;
              const countEl = document.getElementById(`count-${column.id}`);
              countEl.textContent = count;
            });
          }
          
          // Obter cor para prioridade
          function getPriorityColor(priority) {
            switch (priority) {
              case 'high': return '#ffebee';
              case 'medium': return '#fff8e1';
              case 'low': return '#e8f5e9';
              default: return '#f5f5f5';
            }
          }
          
          // Configurar eventos
          function setupEventListeners() {
            // Botão de atualizar
            document.getElementById('btn-refresh').addEventListener('click', () => {
              createColumns();
              loadTasks();
            });
            
            // Botão de nova tarefa
            document.getElementById('btn-add-task').addEventListener('click', () => {
              alert('Funcionalidade de adicionar tarefa em desenvolvimento.');
            });
          }
          
          // Inicializar o quadro
          document.addEventListener('DOMContentLoaded', () => {
            createColumns();
            loadTasks();
            setupEventListeners();
          });
        </script>
      </body>
    </html>
  `;
  
  res.end(html);
  return;
}

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
