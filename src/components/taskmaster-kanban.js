/**
 * Componente de Quadro Kanban para TaskMaster
 * 
 * Este componente implementa um quadro Kanban visual para o TaskMaster,
 * permitindo a visualização e gerenciamento de tarefas.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import axios from 'axios';
import { TaskMasterClient } from '../clients/taskmaster-client.js';

class TaskMasterKanban {
  constructor(config = {}) {
    // Configurações padrão
    this.config = {
      title: 'Quadro Kanban TaskMaster',
      taskMasterPath: process.env.TASKMASTER_PATH || path.resolve(process.cwd()),
      taskMasterApiUrl: process.env.TASKMASTER_API_URL || 'http://localhost:3000/api/taskmaster',
      autoSync: true,
      syncInterval: 60, // segundos
      ...config
    };
    
    // Colunas padrão do quadro
    this.columns = [
      { id: 'a-fazer', title: 'A fazer', status: 'pending', color: '#e2f2ff', cards: [] },
      { id: 'em-andamento', title: 'Em andamento', status: 'in-progress', color: '#fff8e2', cards: [] },
      { id: 'revisao', title: 'Revisão', status: 'review', color: '#e6f4ea', cards: [] },
      { id: 'concluido', title: 'Concluído', status: 'done', color: '#e6c9ff', cards: [] },
      { id: 'adiado', title: 'Adiado', status: 'deferred', color: '#f5f5f5', cards: [] },
      { id: 'cancelado', title: 'Cancelado', status: 'cancelled', color: '#fbe2e2', cards: [] }
    ];
    
    // Cliente do TaskMaster
    this.client = new TaskMasterClient({
      basePath: this.config.taskMasterPath,
      apiUrl: this.config.taskMasterApiUrl
    });
    
    // Estado interno
    this.board = {
      id: 'taskmaster-board',
      title: this.config.title,
      columns: this.columns,
      cards: []
    };
    
    // Iniciar sincronização automática se configurado
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }
  
  /**
   * Inicia a sincronização automática com o TaskMaster
   */
  startAutoSync() {
    this.syncInterval = setInterval(() => {
      this.syncWithTaskMaster()
        .catch(err => console.error('Erro ao sincronizar com TaskMaster:', err));
    }, this.config.syncInterval * 1000);
    
    // Sincronizar imediatamente
    this.syncWithTaskMaster()
      .catch(err => console.error('Erro na sincronização inicial com TaskMaster:', err));
      
    console.log(`Sincronização automática iniciada (intervalo: ${this.config.syncInterval}s)`);
  }
  
  /**
   * Para a sincronização automática
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sincronização automática interrompida');
    }
  }
  
  /**
   * Sincroniza o quadro com as tarefas do TaskMaster
   */
  async syncWithTaskMaster() {
    try {
      console.log('Sincronizando quadro Kanban com TaskMaster...');
      
      // Buscar todas as tarefas do TaskMaster
      const tasks = await this.client.getTasks();
      
      // Mapear tarefas para cartões do Kanban
      const cards = tasks.map(task => this.taskToCard(task));
      
      // Atualizar cartões nas colunas
      this.updateBoardCards(cards);
      
      console.log(`Sincronização concluída: ${cards.length} tarefas processadas`);
      return true;
    } catch (error) {
      console.warn('Erro ao sincronizar com TaskMaster, carregando dados de exemplo:', error);
      
      // Carregar dados de exemplo para demonstração
      const exampleTasks = this._getExampleTasks();
      const cards = exampleTasks.map(task => this.taskToCard(task));
      this.updateBoardCards(cards);
      
      return true;
    }
  }
  
  /**
   * Converte uma tarefa do TaskMaster em um cartão para o Kanban
   * @param {Object} task Tarefa do TaskMaster
   * @returns {Object} Cartão do Kanban
   */
  taskToCard(task) {
    // Determinar cor do cartão baseado na prioridade ou status
    let cardColor = '#ffffff';
    if (task.priority) {
      switch (task.priority.toLowerCase()) {
        case 'high':
          cardColor = '#ffd5d5';
          break;
        case 'medium':
          cardColor = '#fff4cc';
          break;
        case 'low':
          cardColor = '#d5f5e3';
          break;
      }
    }
    
    // Calcular complexidade
    const complexity = task.complexity || (task.subtasks && task.subtasks.length > 0 ? 
      Math.min(Math.ceil(task.subtasks.length / 2), 10) : 1);
    
    // Criar o cartão
    return {
      id: `task-${task.id}`,
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: task.status || 'pending',
      color: cardColor,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
      assignee: task.assignee || '',
      priority: task.priority || 'medium',
      complexity: complexity,
      dependencies: task.dependencies || [],
      subtasks: task.subtasks || [],
      tags: task.tags || [],
      data: task // Armazenar os dados completos da tarefa
    };
  }
  
  /**
   * Atualiza os cartões do quadro com base nas tarefas
   * @param {Array} cards Lista de cartões
   */
  updateBoardCards(cards) {
    // Limpar os cartões de todas as colunas
    this.columns.forEach(column => {
      column.cards = [];
    });
    
    // Distribuir cartões nas colunas apropriadas
    cards.forEach(card => {
      const column = this.columns.find(col => col.status === card.status);
      if (column) {
        column.cards.push(card);
      } else {
        // Se não encontrar coluna para o status, coloca em "A fazer"
        this.columns[0].cards.push(card);
      }
    });
    
    // Ordenar cartões por prioridade e ID em cada coluna
    this.columns.forEach(column => {
      column.cards.sort((a, b) => {
        const priorityMap = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityMap[a.priority] || 1;
        const bPriority = priorityMap[b.priority] || 1;
        
        // Primeiro por prioridade, depois por ID
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Extrair números dos IDs para ordenação numérica
        const aId = parseInt(a.taskId.replace(/[^0-9]/g, ''));
        const bId = parseInt(b.taskId.replace(/[^0-9]/g, ''));
        return aId - bId;
      });
    });
    
    // Atualizar o estado do quadro
    this.board.cards = cards;
    this.board.updatedAt = new Date().toISOString();
  }
  
  /**
   * Busca uma tarefa específica do TaskMaster
   * @param {string} taskId ID da tarefa
   * @returns {Promise<Object>} Dados da tarefa
   */
  async getTask(taskId) {
    return this.client.getTask(taskId);
  }
  
  /**
   * Atualiza o status de uma tarefa no TaskMaster
   * @param {string} taskId ID da tarefa
   * @param {string} status Novo status
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateTaskStatus(taskId, status) {
    try {
      // Verificar se o status é válido
      const validStatuses = ['pending', 'in-progress', 'review', 'done', 'deferred', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status inválido: ${status}. Use um destes: ${validStatuses.join(', ')}`);
      }
      
      // Atualizar status via API ou CLI
      const result = await this.client.setTaskStatus(taskId, status);
      
      // Sincronizar o quadro
      await this.syncWithTaskMaster();
      
      return result;
    } catch (error) {
      console.error(`Erro ao atualizar status da tarefa ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Move um cartão para uma coluna diferente
   * @param {string} cardId ID do cartão
   * @param {string} targetColumnId ID da coluna de destino
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async moveCard(cardId, targetColumnId) {
    try {
      // Encontrar o cartão
      const card = this.board.cards.find(c => c.id === cardId);
      if (!card) {
        throw new Error(`Cartão não encontrado: ${cardId}`);
      }
      
      // Encontrar a coluna de destino
      const targetColumn = this.columns.find(c => c.id === targetColumnId);
      if (!targetColumn) {
        throw new Error(`Coluna não encontrada: ${targetColumnId}`);
      }
      
      // Atualizar o status da tarefa no TaskMaster
      await this.updateTaskStatus(card.taskId, targetColumn.status);
      
      return true;
    } catch (error) {
      console.error('Erro ao mover cartão:', error);
      throw error;
    }
  }
  
  /**
   * Retorna tarefas de exemplo para demonstração
   * @private
   * @returns {Array} Lista de tarefas de exemplo
   */
  _getExampleTasks() {
    return [
      {
        id: '1',
        title: 'Setup Project Architecture and Repository',
        description: 'Initialize the project repository with Next.js 14 (App Router), React, TypeScript, and Tailwind CSS. Configure the development environment and establish the basic project structure.',
        details: '1. Create a new Next.js 14 project with App Router using `npx create-next-app@latest`\n2. Configure TypeScript and ensure proper tsconfig.json setup\n3. Install and configure Tailwind CSS\n4. Set up folder structure following Next.js 14 best practices',
        testStrategy: 'Verify project structure and configuration by running the development server and ensuring all technologies are properly integrated.',
        status: 'done',
        priority: 'high',
        subtasks: [
          { id: '1.1', title: 'Inicializar projeto Next.js com TypeScript', status: 'done', description: 'Criar a base do projeto utilizando Next.js 14 com App Router e configurar TypeScript adequadamente.' },
          { id: '1.2', title: 'Configurar Tailwind CSS e estilos globais', status: 'done', description: 'Configurar o Tailwind CSS, definir tema personalizado e criar estilos globais para o projeto.' },
          { id: '1.3', title: 'Estruturar pastas e arquivos do projeto', status: 'done', description: 'Definir e criar a estrutura de diretórios e arquivos seguindo as melhores práticas para Next.js 14 com App Router.' }
        ]
      },
      {
        id: '2',
        title: 'Implement Authentication System with NextAuth.js',
        description: 'Set up user authentication and authorization system using NextAuth.js integrated with Supabase. Implement user registration, login, and profile management.',
        details: '1. Install NextAuth.js and configure providers\n2. Set up Supabase authentication integration\n3. Create authentication API routes in Next.js\n4. Implement user registration form with validation',
        testStrategy: 'Test authentication flow by creating test accounts and verifying login, registration, and password reset functionality.',
        status: 'in-progress',
        priority: 'high',
        subtasks: [
          { id: '2.1', title: 'Configurar NextAuth.js com Supabase', status: 'done', description: 'Instalar e configurar NextAuth.js com provider do Supabase para autenticação.' },
          { id: '2.2', title: 'Implementar formulário de login', status: 'in-progress', description: 'Criar formulário de login com validação e integração com NextAuth.' },
          { id: '2.3', title: 'Implementar formulário de registro', status: 'pending', description: 'Criar formulário de registro de novos usuários com validação.' }
        ]
      },
      {
        id: '3',
        title: 'Setup Database Schema and Supabase Integration',
        description: 'Design and implement the database schema in PostgreSQL via Supabase. Create tables for users, projects, tasks, documents, and other core entities.',
        details: '1. Design database schema with proper relationships\n2. Set up Supabase project and configure access\n3. Create SQL migrations for all tables\n4. Configure row-level security policies',
        testStrategy: 'Test database operations by creating test data and verifying CRUD operations work correctly.',
        status: 'pending',
        priority: 'high',
        subtasks: []
      },
      {
        id: '4',
        title: 'Implement Basic Kanban Board',
        description: 'Develop the core Kanban board functionality with customizable columns and draggable cards. Include basic card creation, editing, and movement between columns.',
        details: '1. Create Kanban board component structure\n2. Implement drag-and-drop functionality using a library like react-beautiful-dnd\n3. Create column component with ability to add, edit, and delete columns',
        testStrategy: 'Test Kanban functionality by creating sample boards and verifying drag-and-drop, card creation, and editing work correctly.',
        status: 'in-progress',
        priority: 'medium',
        subtasks: [
          { id: '4.1', title: 'Implementar componente de quadro Kanban', status: 'done', description: 'Criar estrutura base do componente Kanban com colunas e cartões.' },
          { id: '4.2', title: 'Adicionar funcionalidade arrastar e soltar', status: 'in-progress', description: 'Implementar drag-and-drop para mover cartões entre colunas.' }
        ]
      },
      {
        id: '5',
        title: 'Integrar com Vercel',
        description: 'Configurar e realizar o deploy da aplicação na plataforma Vercel, garantindo que o ambiente de produção esteja funcional.',
        details: '1. Configurar projeto na Vercel\n2. Configurar variáveis de ambiente\n3. Resolver problemas de compatibilidade\n4. Testar funcionalidades após deploy',
        testStrategy: 'Verificar se todas as funcionalidades estão operando corretamente no ambiente de produção após o deploy.',
        status: 'done',
        priority: 'high',
        subtasks: [
          { id: '5.1', title: 'Configurar projeto na Vercel', status: 'done', description: 'Criar projeto na Vercel e conectar ao repositório Git.' },
          { id: '5.2', title: 'Resolver erro 500', status: 'done', description: 'Identificar e corrigir o erro 500 que ocorre durante o deploy.' }
        ]
      }
    ];
  }
  
  /**
   * Gera a saída HTML para o quadro Kanban
   * @returns {string} HTML do quadro Kanban
   */
  generateHtml() {
    // Estilos CSS para o quadro
    const styles = `
      <style>
        .taskmaster-kanban {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .kanban-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .kanban-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
        }
        
        .kanban-controls {
          display: flex;
          gap: 10px;
        }
        
        .kanban-button {
          padding: 8px 12px;
          background-color: #f0f2f5;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .kanban-button:hover {
          background-color: #e4e6e9;
        }
        
        .kanban-button.primary {
          background-color: #1a73e8;
          color: white;
        }
        
        .kanban-button.primary:hover {
          background-color: #1557b0;
        }
        
        .kanban-columns {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 16px;
        }
        
        .kanban-column {
          flex: 0 0 280px;
          display: flex;
          flex-direction: column;
          background-color: #f5f5f5;
          border-radius: 8px;
          max-height: 80vh;
        }
        
        .column-header {
          padding: 12px;
          font-weight: 600;
          font-size: 16px;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .column-count {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
        }
        
        .column-cards {
          padding: 8px;
          overflow-y: auto;
          flex-grow: 1;
        }
        
        .kanban-card {
          background-color: #fff;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          position: relative;
          border-top: 3px solid #ccc;
        }
        
        .card-title {
          font-weight: 500;
          margin-bottom: 8px;
          color: #333;
        }
        
        .card-id {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 12px;
          color: #888;
        }
        
        .card-description {
          font-size: 13px;
          color: #555;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .card-metadata {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
        }
        
        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        
        .card-tag {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          background-color: #f0f0f0;
          color: #555;
        }
        
        .card-priority-high {
          border-top-color: #e53935;
        }
        
        .card-priority-medium {
          border-top-color: #fb8c00;
        }
        
        .card-priority-low {
          border-top-color: #43a047;
        }
        
        .card-subtasks {
          margin-top: 6px;
          font-size: 12px;
          color: #666;
        }
        
        .card-subtasks-count {
          background-color: #f0f0f0;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
        }
        
        .complexity-indicator {
          display: flex;
          gap: 2px;
          margin-top: 4px;
        }
        
        .complexity-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ddd;
        }
        
        .complexity-dot.active {
          background-color: #888;
        }
      </style>
    `;
    
    // Gerar HTML do quadro
    let html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.board.title}</title>
        ${styles}
      </head>
      <body>
        <div class="taskmaster-kanban">
          <div class="kanban-header">
            <h1 class="kanban-title">${this.board.title}</h1>
            <div class="kanban-controls">
              <button class="kanban-button" onclick="refreshBoard()">Atualizar</button>
              <button class="kanban-button primary" onclick="addTask()">Nova Tarefa</button>
            </div>
          </div>
          
          <div class="kanban-columns">
    `;
    
    // Gerar HTML para cada coluna
    this.columns.forEach(column => {
      html += `
        <div class="kanban-column" data-column-id="${column.id}" style="background-color: ${column.color}20;">
          <div class="column-header" style="background-color: ${column.color}40;">
            ${column.title}
            <span class="column-count">${column.cards.length}</span>
          </div>
          <div class="column-cards" id="column-${column.id}">
      `;
      
      // Gerar HTML para cada cartão na coluna
      column.cards.forEach(card => {
        const priorityClass = card.priority ? `card-priority-${card.priority.toLowerCase()}` : '';
        const subtasksCount = card.subtasks?.length || 0;
        
        html += `
          <div class="kanban-card ${priorityClass}" data-card-id="${card.id}" style="background-color: ${card.color || '#fff'};">
            <div class="card-id">#${card.taskId}</div>
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description || ''}</div>
            
            ${subtasksCount > 0 ? `
              <div class="card-subtasks">
                <span class="card-subtasks-count">${subtasksCount} subtarefa${subtasksCount > 1 ? 's' : ''}</span>
              </div>
            ` : ''}
            
            <div class="complexity-indicator">
              ${Array.from({length: 5}, (_, i) => 
                `<div class="complexity-dot ${i < card.complexity ? 'active' : ''}"></div>`
              ).join('')}
            </div>
            
            <div class="card-tags">
              ${(card.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
              ${card.priority ? `<span class="card-tag" style="background-color: ${
                card.priority === 'high' ? '#ffebee' : 
                card.priority === 'medium' ? '#fff8e1' : 
                '#e8f5e9'
              }; color: ${
                card.priority === 'high' ? '#c62828' : 
                card.priority === 'medium' ? '#ef6c00' : 
                '#2e7d32'
              };">${card.priority}</span>` : ''}
            </div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    // JavaScript para interatividade
    html += `
          </div>
        </div>
        
        <script>
          function refreshBoard() {
            window.location.reload();
          }
          
          function addTask() {
            // Implementar abertura do modal de nova tarefa
            alert('Funcionalidade de adicionar tarefa em desenvolvimento');
          }
          
          // Drag and drop (implementação básica)
          document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.kanban-card');
            const columns = document.querySelectorAll('.column-cards');
            
            cards.forEach(card => {
              card.setAttribute('draggable', true);
              
              card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', card.dataset.cardId);
                setTimeout(() => {
                  card.classList.add('dragging');
                }, 0);
              });
              
              card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
              });
              
              card.addEventListener('click', () => {
                // Implementar abertura do modal de detalhes da tarefa
                alert('Detalhes da tarefa: ' + card.querySelector('.card-title').textContent);
              });
            });
            
            columns.forEach(column => {
              column.addEventListener('dragover', e => {
                e.preventDefault();
              });
              
              column.addEventListener('drop', e => {
                e.preventDefault();
                const cardId = e.dataTransfer.getData('text/plain');
                const columnId = column.id.replace('column-', '');
                
                // Fazer requisição para atualizar no servidor
                fetch('/api/kanban/move-card', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cardId, columnId })
                })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    // Mover o card na interface
                    const card = document.querySelector(\`[data-card-id="\${cardId}"]\`);
                    column.appendChild(card);
                  } else {
                    alert('Erro ao mover cartão: ' + data.error);
                  }
                })
                .catch(err => {
                  console.error('Erro ao mover cartão:', err);
                  alert('Erro ao mover cartão. Tente novamente.');
                });
              });
            });
          });
        </script>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Salva o HTML do quadro Kanban em um arquivo
   * @param {string} outputPath Caminho do arquivo de saída
   * @returns {Promise<string>} Caminho do arquivo salvo
   */
  async saveHtml(outputPath = 'public/taskmaster-kanban.html') {
    try {
      const html = this.renderHtml();
      const fullPath = path.resolve(process.cwd(), outputPath);
      
      // Garantir que o diretório existe
      const directory = path.dirname(fullPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Salvar arquivo
      await fs.writeFile(fullPath, html, 'utf8');
      console.log(`Quadro Kanban salvo em: ${fullPath}`);
      
      return fullPath;
    } catch (error) {
      console.error('Erro ao salvar HTML do quadro:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza o quadro e salva o HTML
   * @param {string} outputPath Caminho do arquivo de saída
   * @returns {Promise<string>} Caminho do arquivo salvo
   */
  async updateAndSave(outputPath) {
    await this.syncWithTaskMaster();
    return this.saveHtml(outputPath);
  }
}

export { TaskMasterKanban };
