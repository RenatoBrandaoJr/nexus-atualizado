// Função handler minimalista para ambiente serverless (Vercel)
export default function handler(req, res) {
  // Definir cabeçalhos básicos
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  // Dados de exemplo estáticos
  const tasks = [
    {
      id: "1",
      title: "Setup Project Architecture",
      description: "Initialize the project with Next.js 14",
      status: "done",
      priority: "high"
    },
    {
      id: "2",
      title: "Configurar Supabase",
      description: "Integrar Supabase como banco de dados",
      status: "in-progress",
      priority: "high"
    },
    {
      id: "3",
      title: "Implementar Autenticação",
      description: "Adicionar autenticação com NextAuth.js",
      status: "pending",
      priority: "medium"
    }
  ];
  
  // Verificar a rota solicitada
  const url = req.url || '';
  
  // Rota API para tarefas
  if (url === '/api/tasks' || url.startsWith('/api/tasks?')) {
    res.setHeader('Content-Type', 'application/json');
    return res.json(tasks);
  }
  
  // Rota para o Kanban
  if (url === '/kanban' || url.startsWith('/kanban?')) {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskMaster Kanban</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    .board {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding-bottom: 20px;
    }
    .column {
      background-color: #e0e0e0;
      border-radius: 5px;
      min-width: 300px;
      padding: 15px;
    }
    .column-header {
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .column-count {
      background-color: #666;
      color: white;
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 12px;
    }
    .task {
      background-color: white;
      border-radius: 5px;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .task-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    .task-desc {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 10px;
    }
    .high {
      border-left: 4px solid #e74c3c;
    }
    .medium {
      border-left: 4px solid #f39c12;
    }
    .low {
      border-left: 4px solid #2ecc71;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      margin-top: 5px;
    }
    .tag-high {
      background-color: #ffecec;
      color: #e74c3c;
    }
    .tag-medium {
      background-color: #fff7e6;
      color: #f39c12;
    }
    .button {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      margin-bottom: 20px;
    }
    .button:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <h1>TaskMaster Kanban</h1>
  <a href="/" class="button">Voltar para Início</a>
  
  <div class="board">
    <div class="column">
      <div class="column-header">
        <span>Pendentes</span>
        <span class="column-count">1</span>
      </div>
      <div class="task high">
        <div class="task-title">Implementar Autenticação</div>
        <div class="task-desc">Adicionar autenticação com NextAuth.js</div>
        <div><span class="tag tag-medium">medium</span></div>
      </div>
    </div>
    
    <div class="column">
      <div class="column-header">
        <span>Em Progresso</span>
        <span class="column-count">1</span>
      </div>
      <div class="task high">
        <div class="task-title">Configurar Supabase</div>
        <div class="task-desc">Integrar Supabase como banco de dados</div>
        <div><span class="tag tag-high">high</span></div>
      </div>
    </div>
    
    <div class="column">
      <div class="column-header">
        <span>Concluídas</span>
        <span class="column-count">1</span>
      </div>
      <div class="task high">
        <div class="task-title">Setup Project Architecture</div>
        <div class="task-desc">Initialize the project with Next.js 14</div>
        <div><span class="tag tag-high">high</span></div>
      </div>
    </div>
  </div>
  
  <script>
    console.log('Kanban carregado com sucesso');
  </script>
</body>
</html>`;
    return res.send(html);
  }
  
  // Página inicial
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskMaster API</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    a {
      display: inline-block;
      margin-top: 20px;
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      text-decoration: none;
      border-radius: 4px;
    }
    a:hover {
      background-color: #45a049;
    }
    ul {
      margin: 20px 0;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <h1>TaskMaster API</h1>
  <p>Este é o serviço da API do TaskMaster rodando na Vercel.</p>
  <p>Endpoints disponíveis:</p>
  <ul>
    <li><code>/api/tasks</code> - Lista de tarefas (GET)</li>
    <li><code>/kanban</code> - Visualização do quadro Kanban</li>
  </ul>
  <a href="/kanban">Visualizar Quadro Kanban</a>
</body>
</html>`;
  return res.send(html);
}
