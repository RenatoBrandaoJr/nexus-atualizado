/**
 * Adaptador MCP para TaskMaster Claude
 * 
 * Fornece funcionalidades para gerenciamento de tarefas, projetos e fluxos de trabalho
 * usando o sistema TaskMaster com integração Claude.
 */

import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';

class TaskmasterClaudeAdapter {
  constructor() {
    this.logger = createLogger('TaskmasterClaudeAdapter');
    this.metrics = createMetrics('TaskmasterClaudeAdapter');
    
    // Armazenamento local de tarefas (simulado)
    this.tasks = [];
    this.projects = [];
    
    this.logger.info('Adaptador TaskMaster Claude inicializado');
  }
  
  /**
   * Inicializa um novo projeto
   */
  async initializeProject(options = {}) {
    const defaultOptions = {
      name: `Projeto ${Date.now()}`,
      description: 'Projeto criado automaticamente',
      addAliases: false,
      skipInstall: false
    };
    
    const config = { ...defaultOptions, ...options };
    
    this.logger.info(`Inicializando projeto: ${config.name}`, config);
    
    // Simulação
    const projectId = `proj_${Date.now()}`;
    const project = {
      id: projectId,
      name: config.name,
      description: config.description,
      createdAt: new Date().toISOString(),
      tasks: [],
      status: 'active'
    };
    
    this.projects.push(project);
    
    this.metrics.increment('projects.created');
    
    return {
      success: true,
      projectId,
      message: `Projeto "${config.name}" inicializado com sucesso.`
    };
  }
  
  /**
   * Adiciona uma nova tarefa
   */
  async addTask(options = {}) {
    const { projectId, title, description, dependencies = '', priority = 'medium', prompt = '' } = options;
    
    if (!projectId) {
      this.logger.error('ID do projeto não fornecido para adição de tarefa');
      throw new Error('ID do projeto é obrigatório');
    }
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    this.logger.info(`Adicionando tarefa ao projeto ${projectId}: ${title || prompt}`);
    
    // Processar dependências
    const dependencyIds = dependencies ? dependencies.split(',').map(id => id.trim()) : [];
    
    // Criar tarefa
    const taskId = `task_${project.tasks.length + 1}`;
    const task = {
      id: taskId,
      title: title || `Tarefa gerada a partir de: ${prompt.substring(0, 30)}...`,
      description: description || '',
      details: '',
      status: 'pending',
      priority,
      dependencies: dependencyIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Se tiver um prompt, simular geração de detalhes
    if (prompt) {
      task.details = `Detalhes gerados para a tarefa baseada no prompt: "${prompt}".\n\n` +
                     `Esta tarefa foi gerada automaticamente e inclui os seguintes objetivos:\n` +
                     `- Implementar a funcionalidade solicitada\n` +
                     `- Garantir testes adequados\n` +
                     `- Documentar a implementação`;
    }
    
    // Adicionar ao projeto
    project.tasks.push(task);
    this.tasks.push({ ...task, projectId });
    
    this.metrics.increment('tasks.created');
    
    return {
      success: true,
      taskId,
      task,
      message: `Tarefa "${task.title}" adicionada com sucesso.`
    };
  }
  
  /**
   * Adiciona uma subtarefa a uma tarefa existente
   */
  async addSubtask(options = {}) {
    const { projectId, id, title, description, dependencies = '', status = 'pending' } = options;
    
    if (!projectId || !id) {
      this.logger.error('ID do projeto e ID da tarefa pai são obrigatórios');
      throw new Error('ID do projeto e ID da tarefa pai são obrigatórios');
    }
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    const parentTask = project.tasks.find(t => t.id === id);
    if (!parentTask) {
      this.logger.error(`Tarefa pai não encontrada: ${id}`);
      throw new Error(`Tarefa pai não encontrada: ${id}`);
    }
    
    this.logger.info(`Adicionando subtarefa à tarefa ${id}: ${title}`);
    
    // Processar dependências
    const dependencyIds = dependencies ? dependencies.split(',').map(id => id.trim()) : [];
    
    // Criar subtarefa
    const subtaskId = `${id}.${(parentTask.subtasks?.length || 0) + 1}`;
    const subtask = {
      id: subtaskId,
      title,
      description: description || '',
      status,
      dependencies: dependencyIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Adicionar à tarefa pai
    if (!parentTask.subtasks) {
      parentTask.subtasks = [];
    }
    parentTask.subtasks.push(subtask);
    
    this.metrics.increment('subtasks.created');
    
    return {
      success: true,
      subtaskId,
      subtask,
      message: `Subtarefa "${title}" adicionada com sucesso.`
    };
  }
  
  /**
   * Altera o status de uma tarefa
   */
  async setTaskStatus(options = {}) {
    const { projectId, id, status } = options;
    
    if (!projectId || !id || !status) {
      this.logger.error('ID do projeto, ID da tarefa e status são obrigatórios');
      throw new Error('ID do projeto, ID da tarefa e status são obrigatórios');
    }
    
    this.logger.info(`Alterando status da tarefa ${id} para ${status}`);
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    // Verificar se é uma subtarefa
    const isSubtask = id.includes('.');
    
    if (isSubtask) {
      const [parentId, subtaskIndex] = id.split('.');
      const parentTask = project.tasks.find(t => t.id === parentId);
      
      if (!parentTask || !parentTask.subtasks || !parentTask.subtasks[subtaskIndex - 1]) {
        this.logger.error(`Subtarefa não encontrada: ${id}`);
        throw new Error(`Subtarefa não encontrada: ${id}`);
      }
      
      parentTask.subtasks[subtaskIndex - 1].status = status;
      parentTask.subtasks[subtaskIndex - 1].updatedAt = new Date().toISOString();
      
      // Atualizar a tarefa pai se todas as subtarefas estiverem concluídas
      if (status === 'done' && parentTask.subtasks.every(st => st.status === 'done')) {
        parentTask.status = 'done';
        parentTask.updatedAt = new Date().toISOString();
      }
    } else {
      const task = project.tasks.find(t => t.id === id);
      
      if (!task) {
        this.logger.error(`Tarefa não encontrada: ${id}`);
        throw new Error(`Tarefa não encontrada: ${id}`);
      }
      
      task.status = status;
      task.updatedAt = new Date().toISOString();
    }
    
    this.metrics.increment(`tasks.status.${status}`);
    
    return {
      success: true,
      message: `Status da tarefa ${id} alterado para ${status}.`
    };
  }
  
  /**
   * Obtém uma tarefa específica
   */
  async getTask(options = {}) {
    const { projectId, id } = options;
    
    if (!projectId || !id) {
      this.logger.error('ID do projeto e ID da tarefa são obrigatórios');
      throw new Error('ID do projeto e ID da tarefa são obrigatórios');
    }
    
    this.logger.info(`Obtendo tarefa ${id} do projeto ${projectId}`);
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    // Verificar se é uma subtarefa
    const isSubtask = id.includes('.');
    
    if (isSubtask) {
      const [parentId, subtaskIndex] = id.split('.');
      const parentTask = project.tasks.find(t => t.id === parentId);
      
      if (!parentTask || !parentTask.subtasks || !parentTask.subtasks[subtaskIndex - 1]) {
        this.logger.error(`Subtarefa não encontrada: ${id}`);
        throw new Error(`Subtarefa não encontrada: ${id}`);
      }
      
      return {
        success: true,
        task: parentTask.subtasks[subtaskIndex - 1],
        parentTask
      };
    } else {
      const task = project.tasks.find(t => t.id === id);
      
      if (!task) {
        this.logger.error(`Tarefa não encontrada: ${id}`);
        throw new Error(`Tarefa não encontrada: ${id}`);
      }
      
      return {
        success: true,
        task
      };
    }
  }
  
  /**
   * Obtém todas as tarefas de um projeto
   */
  async getTasks(options = {}) {
    const { projectId, status, withSubtasks = true } = options;
    
    if (!projectId) {
      this.logger.error('ID do projeto é obrigatório');
      throw new Error('ID do projeto é obrigatório');
    }
    
    this.logger.info(`Obtendo tarefas do projeto ${projectId}`, { status, withSubtasks });
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    let tasks = [...project.tasks];
    
    // Filtrar por status, se especificado
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    
    // Remover subtarefas se não solicitadas
    if (!withSubtasks) {
      tasks = tasks.map(task => {
        const { subtasks, ...taskWithoutSubtasks } = task;
        return taskWithoutSubtasks;
      });
    }
    
    return {
      success: true,
      tasks,
      count: tasks.length,
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      }
    };
  }
  
  /**
   * Gera documentação a partir das tarefas de um projeto
   */
  async generateDocumentation(projectId, options = {}) {
    if (!projectId) {
      this.logger.error('ID do projeto é obrigatório');
      throw new Error('ID do projeto é obrigatório');
    }
    
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.logger.error(`Projeto não encontrado: ${projectId}`);
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    this.logger.info(`Gerando documentação para o projeto: ${project.name}`);
    
    // Simulação da geração de documentação
    const format = options.format || 'markdown';
    let content = '';
    
    if (format === 'markdown') {
      content = `# ${project.name}\n\n`;
      content += `${project.description}\n\n`;
      content += `## Tarefas\n\n`;
      
      project.tasks.forEach(task => {
        content += `### ${task.title}\n\n`;
        content += `**Status:** ${task.status}\n`;
        content += `**Prioridade:** ${task.priority}\n\n`;
        content += `${task.description || 'Sem descrição'}\n\n`;
        
        if (task.details) {
          content += `#### Detalhes\n\n${task.details}\n\n`;
        }
        
        if (task.subtasks && task.subtasks.length > 0) {
          content += `#### Subtarefas\n\n`;
          task.subtasks.forEach(subtask => {
            content += `- [${subtask.status === 'done' ? 'x' : ' '}] ${subtask.title}\n`;
          });
          content += '\n';
        }
      });
    } else if (format === 'html') {
      content = `<h1>${project.name}</h1>`;
      content += `<p>${project.description}</p>`;
      content += `<h2>Tarefas</h2>`;
      
      project.tasks.forEach(task => {
        content += `<h3>${task.title}</h3>`;
        content += `<p><strong>Status:</strong> ${task.status}</p>`;
        content += `<p><strong>Prioridade:</strong> ${task.priority}</p>`;
        content += `<p>${task.description || 'Sem descrição'}</p>`;
        
        if (task.details) {
          content += `<h4>Detalhes</h4><p>${task.details}</p>`;
        }
        
        if (task.subtasks && task.subtasks.length > 0) {
          content += `<h4>Subtarefas</h4><ul>`;
          task.subtasks.forEach(subtask => {
            content += `<li><input type="checkbox" ${subtask.status === 'done' ? 'checked' : ''}> ${subtask.title}</li>`;
          });
          content += `</ul>`;
        }
      });
    }
    
    return {
      success: true,
      project: {
        id: project.id,
        name: project.name
      },
      documentation: {
        format,
        content,
        generatedAt: new Date().toISOString()
      }
    };
  }
}

const taskmasterClaudeAdapter = new TaskmasterClaudeAdapter();
export default taskmasterClaudeAdapter;
