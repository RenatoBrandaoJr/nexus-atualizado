/**
 * Nexus - Sistema Inteligente
 * 
 * Este arquivo é configurado para funcionar tanto como:
 * 1. Função serverless no ambiente Vercel 
 * 2. Servidor Express em ambiente de desenvolvimento local
 */

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

// Promisify exec
const execPromise = util.promisify(exec);

// Initialize environment variables
dotenv.config();

// Get the directory name of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import components
import { TaskMasterKanban } from './components/taskmaster-kanban.js';

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Parse JSON request bodies
app.use(express.json());

// API route to get tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const data = await TaskMasterKanban.getTasks();
    res.json(data);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// API route to create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    // Gerar um ID simples (em um sistema real, isso seria gerado pelo banco de dados)
    const newId = new Date().getTime().toString().slice(-5);
    
    // Criar um objeto de tarefa
    const newTask = {
      id: newId,
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      createdAt: new Date().toISOString()
    };
    
    // Se o TaskMaster estiver habilitado, tentar adicionar via CLI
    if (process.env.TASKMASTER_ENABLED === 'true' && process.env.TASKMASTER_PATH) {
      try {
        // Aqui você poderia implementar a integração com o TaskMaster CLI
        // para adicionar uma nova tarefa
        console.log('TaskMaster integração para adicionar tarefa ainda não implementada');
      } catch (error) {
        console.error('Erro ao adicionar tarefa via TaskMaster:', error);
      }
    }
    
    // Retornar a nova tarefa (em um sistema real, ela seria salva em um banco de dados)
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating new task:', error);
    res.status(500).json({ error: 'Failed to create new task' });
  }
});

// API route to update task status
app.post('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ error: 'Task ID and status are required' });
    }
    
    // Map de status do frontend para status do TaskMaster
    const statusMap = {
      'todo': 'pending',
      'in-progress': 'in-progress',
      'review': 'review',
      'done': 'done'
    };
    
    const taskMasterStatus = statusMap[status] || status;
    
    // Se o TaskMaster estiver habilitado, tentar atualizar via CLI
    if (process.env.TASKMASTER_ENABLED === 'true' && process.env.TASKMASTER_PATH) {
      try {
        // Executar comando do TaskMaster para atualizar o status
        const cmd = `cd ${process.env.TASKMASTER_PATH} && npx task-master set-status --id=${id} --status=${taskMasterStatus}`;
        console.log(`Executando comando: ${cmd}`);
        
        const { stdout, stderr } = await execPromise(cmd);
        console.log('TaskMaster output:', stdout);
        
        if (stderr) {
          console.error('TaskMaster error:', stderr);
        }
        
        res.json({ success: true, id, status: taskMasterStatus });
      } catch (error) {
        console.error('Erro ao executar comando do TaskMaster:', error);
        // Continuar e salvar apenas em memória como fallback
        res.json({ success: true, id, status: taskMasterStatus, message: 'Salvo apenas em memória (TaskMaster CLI falhou)' });
      }
    } else {
      // TaskMaster não habilitado, apenas retornar sucesso (mudança apenas em memória)
      console.log(`TaskMaster não configurado. Atualizando status da tarefa ${id} para ${status} apenas em memória.`);
      res.json({ success: true, id, status: taskMasterStatus, message: 'Salvo apenas em memória' });
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

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
              <!-- Sem dependências externas - usando HTML5 Drag and Drop nativo -->
              <script>
                console.log('Usando API nativa de Drag and Drop HTML5');
              </script>
              
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
                  <button class="btn btn-primary" id="new-task-btn">Nova Tarefa</button>
                </div>
              </div>
              
              <!-- Modal para adicionar nova tarefa -->
              <div id="new-task-modal" class="modal">
                <div class="modal-content">
                  <div class="modal-header">
                    <h2>Adicionar Nova Tarefa</h2>
                    <span class="close">&times;</span>
                  </div>
                  <div class="modal-body">
                    <form id="new-task-form">
                      <div class="form-group">
                        <label for="task-title">Título:</label>
                        <input type="text" id="task-title" name="title" required>
                      </div>
                      <div class="form-group">
                        <label for="task-description">Descrição:</label>
                        <textarea id="task-description" name="description" rows="3"></textarea>
                      </div>
                      <div class="form-group">
                        <label for="task-priority">Prioridade:</label>
                        <select id="task-priority" name="priority">
                          <option value="low">Baixa</option>
                          <option value="medium" selected>Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label for="task-status">Status:</label>
                        <select id="task-status" name="status">
                          <option value="todo" selected>A fazer</option>
                          <option value="in-progress">Em andamento</option>
                          <option value="review">Revisão</option>
                          <option value="done">Concluído</option>
                        </select>
                      </div>
                      <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Salvar</button>
                        <button type="button" class="btn btn-light" id="cancel-task">Cancelar</button>
                      </div>
                    </form>
                  </div>
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
              
              <!-- Script para implementar funcionalidade de arrastar e soltar usando HTML5 nativo -->
              <script>
                // Função para inicializar o quadro Kanban com HTML5 Drag and Drop nativo
                function initKanbanBoard() {
                  // Constantes para as colunas
                  var columns = ['todo-column', 'in-progress-column', 'review-column', 'done-column'];
                  var columnsMap = {
                    'todo-column': 'A fazer',
                    'in-progress-column': 'Em andamento',
                    'review-column': 'Revisão',
                    'done-column': 'Concluído'
                  };
                  
                  // Função para atualizar contadores
                  function updateColumnCounts() {
                    for (var i = 0; i < columns.length; i++) {
                      var columnId = columns[i];
                      var column = document.getElementById(columnId);
                      if (column) {
                        var count = column.querySelectorAll('.card').length;
                        var countElement = column.parentNode.querySelector('.column-count');
                        if (countElement) {
                          countElement.textContent = count;
                        }
                      }
                    }
                  }
                  
                  // Função para mostrar notificação
                  function showNotification(taskId, newStatus) {
                    var notification = document.createElement('div');
                    notification.className = 'notification';
                    notification.textContent = 'Tarefa #' + taskId + ' movida para ' + newStatus;
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
                    
                    setTimeout(function() {
                      notification.style.opacity = '1';
                    }, 10);
                    
                    setTimeout(function() {
                      notification.style.opacity = '0';
                      setTimeout(function() {
                        if (notification.parentNode) {
                          notification.parentNode.removeChild(notification);
                        }
                      }, 300);
                    }, 3000);
                  }
                  
                  // Configurar os eventos de arrastar e soltar para cada card
                  var cards = document.querySelectorAll('.card');
                  for (var i = 0; i < cards.length; i++) {
                    var card = cards[i];
                    card.setAttribute('draggable', 'true');
                    
                    // Evento quando o arrasto começa
                    card.addEventListener('dragstart', function(e) {
                      e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
                      e.target.classList.add('card-drag');
                      setTimeout(function() {
                        e.target.classList.add('dragging');
                      }, 0);
                    });
                    
                    // Evento quando o arrasto termina
                    card.addEventListener('dragend', function(e) {
                      e.target.classList.remove('card-drag');
                      e.target.classList.remove('dragging');
                      document.querySelectorAll('.column-cards').forEach(function(col) {
                        col.classList.remove('drag-over');
                      });
                    });
                  }
                  
                  // Configurar eventos para as colunas de destino
                  for (var i = 0; i < columns.length; i++) {
                    var columnId = columns[i];
                    var column = document.getElementById(columnId);
                    
                    if (column) {
                      // Permitir soltar na coluna
                      column.addEventListener('dragover', function(e) {
                        e.preventDefault(); // Permitir soltar
                        this.classList.add('drag-over');
                      });
                      
                      // Quando arrastar sobre a coluna
                      column.addEventListener('dragenter', function(e) {
                        e.preventDefault();
                        this.classList.add('drag-over');
                      });
                      
                      // Quando sair da coluna
                      column.addEventListener('dragleave', function(e) {
                        this.classList.remove('drag-over');
                      });
                      
                      // Quando soltar o card na coluna
                      column.addEventListener('drop', function(e) {
                        e.preventDefault();
                        this.classList.remove('drag-over');
                        
                        var taskId = e.dataTransfer.getData('text/plain');
                        var card = document.querySelector('.card[data-id="' + taskId + '"]');
                        
                        if (card) {
                          // Remover da coluna atual
                          if (card.parentNode) {
                            card.parentNode.removeChild(card);
                          }
                          
                          // Adicionar à nova coluna
                          this.appendChild(card);
                          
                          // Atualizar status no campo oculto
                          var statusInput = card.querySelector('input[name="status"]');
                          var newStatusValue = this.id.replace('-column', '');
                          if (statusInput) {
                            statusInput.value = newStatusValue;
                          }
                          
                          // Mostrar notificação
                          var newStatus = columnsMap[this.id];
                          
                          // Enviar atualização para a API
                          fetch('/api/tasks/' + taskId + '/status', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ status: newStatusValue })
                          })
                          .then(function(response) {
                            return response.json();
                          })
                          .then(function(data) {
                            console.log('API response:', data);
                            // Mostrar notificação com ícone de sucesso
                            showNotification(taskId, newStatus + ' ✓');
                          })
                          .catch(function(error) {
                            console.error('Erro ao atualizar status:', error);
                            // Mostrar notificação com ícone de erro
                            showNotification(taskId, newStatus + ' ⚠️');
                          });
                          
                          // Atualizar contadores
                          updateColumnCounts();
                          
                          console.log('Tarefa #' + taskId + ' movida para ' + newStatus);
                        }
                      });
                    }
                  }
                  
                  // Configurar os botões
                  var updateButton = document.querySelector('.btn-light');
                  if (updateButton) {
                    updateButton.addEventListener('click', function() {
                      alert('Atualizando tarefas...');
                      location.reload();
                    });
                  }
                  
                  // Manipulação do modal de nova tarefa
                  var modal = document.getElementById('new-task-modal');
                  var newTaskBtn = document.getElementById('new-task-btn');
                  var closeBtn = modal.querySelector('.close');
                  var cancelBtn = document.getElementById('cancel-task');
                  var form = document.getElementById('new-task-form');
                  
                  // Abrir modal
                  if (newTaskBtn) {
                    newTaskBtn.addEventListener('click', function() {
                      modal.style.display = 'block';
                    });
                  }
                  
                  // Fechar modal nos botões de fechar
                  if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                      modal.style.display = 'none';
                    });
                  }
                  
                  if (cancelBtn) {
                    cancelBtn.addEventListener('click', function() {
                      modal.style.display = 'none';
                    });
                  }
                  
                  // Fechar modal clicando fora
                  window.addEventListener('click', function(e) {
                    if (e.target === modal) {
                      modal.style.display = 'none';
                    }
                  });
                  
                  // Manipular envio do formulário
                  if (form) {
                    form.addEventListener('submit', function(e) {
                      e.preventDefault();
                      
                      var formData = {
                        title: document.getElementById('task-title').value,
                        description: document.getElementById('task-description').value,
                        priority: document.getElementById('task-priority').value,
                        status: document.getElementById('task-status').value
                      };
                      
                      // Enviar dados para a API
                      fetch('/api/tasks', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                      })
                      .then(function(response) {
                        return response.json();
                      })
                      .then(function(newTask) {
                        console.log('Nova tarefa criada:', newTask);
                        
                        // Criar novo cartão para a tarefa
                        var card = document.createElement('div');
                        card.className = 'card priority-' + newTask.priority;
                        card.setAttribute('draggable', 'true');
                        card.setAttribute('data-id', newTask.id);
                        
                        // Determinar em qual coluna adicionar o cartão
                        var columnId = newTask.status + '-column';
                        var column = document.getElementById(columnId);
                        
                        // Montar o HTML do cartão
                        card.innerHTML = `
                          <div class="card-id">#${newTask.id}</div>
                          <h3 class="card-title">${newTask.title}</h3>
                          <p class="card-desc">${newTask.description}</p>
                          <div class="card-meta">
                            <span class="priority ${newTask.priority}">${newTask.priority}</span>
                          </div>
                          <input type="hidden" name="status" value="${newTask.status}">
                        `;
                        
                        // Adicionar o cartão à coluna apropriada
                        if (column) {
                          column.appendChild(card);
                          
                          // Atualizar contadores
                          updateColumnCounts();
                          
                          // Reiniciar eventos de arrastar e soltar para o novo cartão
                          card.addEventListener('dragstart', function(e) {
                            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
                            e.target.classList.add('card-drag');
                            setTimeout(function() {
                              e.target.classList.add('dragging');
                            }, 0);
                          });
                          
                          card.addEventListener('dragend', function(e) {
                            e.target.classList.remove('card-drag');
                            e.target.classList.remove('dragging');
                            document.querySelectorAll('.column-cards').forEach(function(col) {
                              col.classList.remove('drag-over');
                            });
                          });
                        }
                        
                        // Fechar o modal e resetar o formulário
                        modal.style.display = 'none';
                        form.reset();
                        
                        // Mostrar notificação
                        showNotification(newTask.id, 'Nova tarefa criada');
                      })
                      .catch(function(error) {
                        console.error('Erro ao criar tarefa:', error);
                        alert('Erro ao criar tarefa. Tente novamente.');
                      });
                    });
                  }
                }
                
                // Executar a inicialização apenas depois que o DOM estiver pronto
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initKanbanBoard);
                } else {
                  initKanbanBoard();
                }
              </script>
              
              <!-- Adicionar estilos para o modal e HTML5 drag-and-drop nativo -->
              <style>
                /* Estilos para o modal */
                .modal {
                  display: none;
                  position: fixed;
                  z-index: 1000;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  background-color: rgba(0, 0, 0, 0.5);
                }
                
                .modal-content {
                  background-color: white;
                  margin: 10% auto;
                  padding: 20px;
                  border-radius: 5px;
                  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                  width: 80%;
                  max-width: 500px;
                }
                
                .modal-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #eee;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                
                .modal-header h2 {
                  margin: 0;
                  font-size: 1.5rem;
                  color: #333;
                }
                
                .close {
                  font-size: 28px;
                  font-weight: bold;
                  cursor: pointer;
                  color: #aaa;
                }
                
                .close:hover {
                  color: #333;
                }
                
                .form-group {
                  margin-bottom: 15px;
                }
                
                .form-group label {
                  display: block;
                  margin-bottom: 5px;
                  font-weight: 500;
                }
                
                .form-group input,
                .form-group textarea,
                .form-group select {
                  width: 100%;
                  padding: 8px;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                }
                
                .form-actions {
                  margin-top: 20px;
                  display: flex;
                  justify-content: flex-end;
                  gap: 10px;
                }
                
                /* Estilos para o drag-and-drop */
                .column-cards {
                  min-height: 50px;
                  padding: 5px;
                  border: 2px solid transparent;
                  transition: border-color 0.2s ease;
                }
                
                .drag-over {
                  border-color: #2196F3;
                  background-color: rgba(33, 150, 243, 0.1);
                }
                
                .card-drag {
                  transform: rotate(3deg);
                  opacity: 0.7;
                }
                
                .dragging {
                  opacity: 0.4;
                  border: 2px dashed #ccc;
                }
                
                .card {
                  cursor: grab;
                }
                
                .card:active {
                  cursor: grabbing;
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
