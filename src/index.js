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
        // HTML fixo para o quadro Kanban correspondendo ao design original do Windsurf Preview
        return res.send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <title>Quadro Kanban TaskMaster</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <!-- Incluir a biblioteca Sortable.js para arrastar e soltar -->
              <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
              
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  max-width: 1200px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background-color: #f9f9f9;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                }
                h1 {
                  color: #333;
                  font-size: 24px;
                  margin: 0;
                }
                .actions {
                  display: flex;
                  gap: 10px;
                }
                .btn {
                  padding: 8px 12px;
                  border-radius: 4px;
                  border: none;
                  font-size: 14px;
                  cursor: pointer;
                }
                .btn-primary {
                  background-color: #0d6efd;
                  color: white;
                }
                .btn-light {
                  background-color: #f8f9fa;
                  border: 1px solid #dee2e6;
                }
                .board {
                  display: flex;
                  gap: 20px;
                  overflow-x: auto;
                  padding-bottom: 20px;
                }
                .column {
                  flex: 1;
                  min-width: 280px;
                  max-width: 280px;
                }
                .column-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 10px 15px;
                  border-bottom: 1px solid #eee;
                  margin-bottom: 10px;
                }
                .column-title {
                  font-weight: 600;
                  color: #333;
                }
                .column-count {
                  background-color: #f0f0f0;
                  color: #333;
                  border-radius: 12px;
                  padding: 2px 8px;
                  font-size: 12px;
                }
                .card {
                  background: white;
                  border-radius: 6px;
                  padding: 12px;
                  margin-bottom: 10px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                  border-top: 3px solid transparent;
                  position: relative;
                }
                .card-title {
                  font-weight: 600;
                  margin-top: 0;
                  margin-bottom: 8px;
                  font-size: 14px;
                }
                .card-id {
                  position: absolute;
                  top: 10px;
                  right: 10px;
                  font-size: 11px;
                  color: #888;
                }
                .card-desc {
                  font-size: 13px;
                  color: #555;
                  margin-bottom: 12px;
                }
                .card-meta {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 12px;
                  color: #666;
                }
                .subtask-count {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                }
                .priority {
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 11px;
                }
                .priority-high {
                  background-color: #fff2f2;
                  color: #d32f2f;
                  border-top-color: #d32f2f;
                }
                .priority-medium {
                  background-color: #fff8e6;
                  color: #ed6c02;
                  border-top-color: #ed6c02;
                }
                .priority-low {
                  background-color: #f6fff6;
                  color: #2e7d32;
                  border-top-color: #2e7d32;
                }
                .footer {
                  margin-top: 20px; 
                  text-align: center;
                }
                .footer a {
                  color: #0d6efd; 
                  text-decoration: none;
                }
                .footer a:hover {
                  text-decoration: underline;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Quadro Kanban TaskMaster</h1>
                <div class="actions">
                  <button class="btn btn-light">Atualizar</button>
                  <button class="btn btn-primary">Nova Tarefa</button>
                </div>
              </div>
              
              <div class="board">
                <!-- Coluna: A fazer -->
                <div class="column">
                  <div class="column-header">
                    <span class="column-title">A fazer</span>
                    <span class="column-count">1</span>
                  </div>
                  <div class="column-cards" id="todo-column">
                    <div class="card priority-medium" data-id="3" draggable="true">
                      <div class="card-id">#3</div>
                      <h3 class="card-title">Integrar com Vercel</h3>
                      <p class="card-desc">Deploy da aplicação na Vercel</p>
                      <div class="card-meta">
                        <span class="priority medium">medium</span>
                      </div>
                      <input type="hidden" name="status" value="todo">
                    </div>
                  </div>
                </div>
                
                <!-- Coluna: Em andamento -->
                <div class="column">
                  <div class="column-header">
                    <span class="column-title">Em andamento</span>
                    <span class="column-count">1</span>
                  </div>
                  <div class="column-cards" id="in-progress-column">
                    <div class="card priority-high" data-id="2" draggable="true">
                      <div class="card-id">#2</div>
                      <h3 class="card-title">Implementar interface Kanban</h3>
                      <p class="card-desc">Criar componente de visualização Kanban</p>
                      <div class="card-meta">
                        <span class="subtask-count">2 subtarefas</span>
                        <span class="priority high">high</span>
                      </div>
                      <input type="hidden" name="status" value="in-progress">
                    </div>
                  </div>
                </div>
                
                <!-- Coluna: Revisão -->
                <div class="column">
                  <div class="column-header">
                    <span class="column-title">Revisão</span>
                    <span class="column-count">0</span>
                  </div>
                  <div class="column-cards" id="review-column">
                    <!-- Sem tarefas nesta coluna -->
                  </div>
                </div>
                
                <!-- Coluna: Concluído -->
                <div class="column">
                  <div class="column-header">
                    <span class="column-title">Concluído</span>
                    <span class="column-count">1</span>
                  </div>
                  <div class="column-cards" id="done-column">
                    <div class="card priority-high" data-id="1" draggable="true">
                      <div class="card-id">#1</div>
                      <h3 class="card-title">Configurar ambiente</h3>
                      <p class="card-desc">Configurar ambiente de desenvolvimento</p>
                      <div class="card-meta">
                        <span class="subtask-count">2 subtarefas</span>
                        <span class="priority high">high</span>
                      </div>
                      <input type="hidden" name="status" value="done">
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <a href="/">Voltar para a página inicial</a>
              </div>
              
              <!-- Script para inicializar o drag-and-drop -->
              <script>
                document.addEventListener('DOMContentLoaded', function() {
                  // Inicializar Sortable para cada coluna
                  const columns = ['todo-column', 'in-progress-column', 'review-column', 'done-column'];
                  const columnsMap = {
                    'todo-column': 'A fazer',
                    'in-progress-column': 'Em andamento',
                    'review-column': 'Revisão',
                    'done-column': 'Concluído'
                  };
                  
                  // Objeto para armazenar as instâncias do Sortable
                  const sortables = {};
                  
                  // Função para atualizar os contadores de cada coluna
                  function updateColumnCounts() {
                    columns.forEach(columnId => {
                      const column = document.getElementById(columnId);
                      const count = column.querySelectorAll('.card').length;
                      const countElement = column.parentNode.querySelector('.column-count');
                      countElement.textContent = count;
                    });
                  }
                  
                  // Função para exibir notificação de mudança de status
                  function showNotification(taskId, newStatus) {
                    const notification = document.createElement('div');
                    notification.className = 'notification';
                    notification.textContent = `Tarefa #${taskId} movida para ${newStatus}`;
                    notification.style.position = 'fixed';
                    notification.style.bottom = '20px';
                    notification.style.right = '20px';
                    notification.style.padding = '10px 15px';
                    notification.style.backgroundColor = '#4CAF50';
                    notification.style.color = 'white';
                    notification.style.borderRadius = '4px';
                    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    notification.style.zIndex = '1000';
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.3s ease-in-out';
                    
                    document.body.appendChild(notification);
                    
                    // Animação de fade in
                    setTimeout(() => notification.style.opacity = '1', 10);
                    
                    // Remover a notificação após 3 segundos
                    setTimeout(() => {
                      notification.style.opacity = '0';
                      setTimeout(() => document.body.removeChild(notification), 300);
                    }, 3000);
                  }
                  
                  // Inicializar Sortable.js para cada coluna
                  columns.forEach(columnId => {
                    const column = document.getElementById(columnId);
                    sortables[columnId] = Sortable.create(column, {
                      group: 'kanban-board',  // Grupos compartilhados permitem arrastar entre listas
                      animation: 150,  // Duração da animação em milissegundos
                      ghostClass: 'card-ghost',  // Classe CSS para o "fantasma" durante o arrasto
                      chosenClass: 'card-chosen',  // Classe CSS para o item escolhido
                      dragClass: 'card-drag',  // Classe CSS para o item durante o arrasto
                      
                      // Evento chamado quando um item é movido entre listas
                      onEnd: function(evt) {
                        const item = evt.item;
                        const taskId = item.getAttribute('data-id');
                        const newColumnId = evt.to.id;
                        const newStatus = columnsMap[newColumnId];
                        
                        // Atualizar o campo de status oculto dentro do cartão
                        const statusInput = item.querySelector('input[name="status"]');
                        statusInput.value = newColumnId.replace('-column', '');
                        
                        // Exibir notificação
                        showNotification(taskId, newStatus);
                        
                        // Atualizar contadores
                        updateColumnCounts();
                        
                        // Em um sistema real, aqui faria uma chamada API para atualizar o status no servidor
                        console.log(`Tarefa #${taskId} movida para ${newStatus}`);
                      }
                    });
                  });
                  
                  // Configurar os botões
                  document.querySelector('.btn-light').addEventListener('click', function() {
                    alert('Atualizando tarefas...');
                    location.reload();
                  });
                  
                  document.querySelector('.btn-primary').addEventListener('click', function() {
                    alert('Funcionalidade de adicionar nova tarefa será implementada em breve!');
                  });
                });
              </script>
              
              <!-- Adicionar estilos para o drag-and-drop -->
              <style>
                .card-ghost {
                  opacity: 0.5;
                  background: #c8ebfb;
                }
                
                .card-chosen {
                  box-shadow: 0 0 0 2px #2196F3, 0 5px 10px rgba(0,0,0,0.2) !important;
                }
                
                .card-drag {
                  transform: rotate(3deg);
                }
                
                .column-cards {
                  min-height: 50px;
                  padding: 5px;
                }
              </style>
            </body>
          </html>
        `);
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
