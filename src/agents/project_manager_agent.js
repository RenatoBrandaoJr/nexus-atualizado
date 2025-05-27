/**
 * ProjectManagerAgent - Responsável pelo gerenciamento de projetos no sistema Windsurf
 * 
 * Este agente implementa as regras definidas em project_manager_rules.md e gerencia:
 * - Criação e manutenção de projetos
 * - Gerenciamento de tarefas
 * - Acompanhamento de prazos
 * - Alocação de recursos
 * - Geração de relatórios de progresso
 * - Integração com TaskMaster para gerenciamento avançado de tarefas
 */

const { ToolManager } = require('../utils/tool_manager');
const { SecurityAgent } = require('./security_agent');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ProjectManagerAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.securityAgent = new SecurityAgent();
    
    // Configurações do agente
    this.notificationsEnabled = process.env.PROJECT_NOTIFICATION_ENABLED === 'true';
    this.deadlineWarningDays = parseInt(process.env.DEADLINE_WARNING_DAYS || '3', 10);
    this.defaultProjectTemplate = process.env.DEFAULT_PROJECT_TEMPLATE || 'basic';
    
    // Configurações do TaskMaster
    this.taskMasterEnabled = process.env.TASKMASTER_ENABLED === 'true';
    this.taskMasterPath = process.env.TASKMASTER_PATH || path.resolve(process.cwd());
    this.taskMasterDefaultStatus = process.env.TASKMASTER_DEFAULT_STATUS || 'pending';
    
    // Inicializar ferramentas necessárias
    this.initializeTools();
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    console.log('ProjectManagerAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas necessárias para o ProjectManagerAgent
   * @private
   */
  initializeTools() {
    // Registrar ferramentas do Supabase para gerenciamento de projetos
    this.toolManager.registerTool('supabase:query');
    this.toolManager.registerTool('supabase:insert');
    this.toolManager.registerTool('supabase:update');
    this.toolManager.registerTool('supabase:delete');
    
    // Registrar ferramentas do GitHub para integração com issues
    this.toolManager.registerTool('github:issues:create');
    this.toolManager.registerTool('github:issues:update');
    this.toolManager.registerTool('github:issues:list');
    
    // Registrar ferramentas para notificações
    this.toolManager.registerTool('notification:send');
    
    // Registrar ferramentas para TaskMaster
    this.toolManager.registerTool('taskmaster:task:list');
    this.toolManager.registerTool('taskmaster:task:create');
    this.toolManager.registerTool('taskmaster:task:update');
    this.toolManager.registerTool('taskmaster:task:status');
    this.toolManager.registerTool('taskmaster:task:expand');
  }
  
  /**
   * Registra handlers para eventos de projetos
   * @private
   */
  registerEventHandlers() {
    // Registrar handlers para eventos de projetos
    this.toolManager.on('project:created', this.handleProjectCreated.bind(this));
    this.toolManager.on('project:updated', this.handleProjectUpdated.bind(this));
    
    // Registrar handlers para eventos de tarefas
    this.toolManager.on('task:created', this.handleTaskCreated.bind(this));
    this.toolManager.on('task:updated', this.handleTaskUpdated.bind(this));
    this.toolManager.on('task:assigned', this.handleTaskAssigned.bind(this));
    
    // Registrar handlers para eventos de prazos
    this.toolManager.on('deadline:approaching', this.handleDeadlineApproaching.bind(this));
  }
  
  /**
   * Cria um novo projeto no sistema
   * @param {Object} projectData - Dados do projeto a ser criado
   * @returns {Promise<string>} ID do projeto criado
   * @throws {Error} Se a criação falhar
   */
  async createProject(projectData) {
    try {
      // Validar permissões do usuário
      const canCreate = await this.securityAgent.authorizeAccess(
        projectData.owner,
        'project',
        null,
        'create'
      );
      
      if (!canCreate) {
        throw new Error('Usuário não tem permissão para criar projetos');
      }
      
      // Sanitizar e validar dados do projeto
      const sanitizedData = this.securityAgent.sanitizeInput(projectData, {
        type: 'object',
        required: ['name', 'owner'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          owner: { type: 'string' }
        }
      });
      
      // Aplicar template de projeto se necessário
      const projectWithTemplate = this.applyProjectTemplate(sanitizedData);
      
      // Inserir projeto no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'projects',
        data: {
          ...projectWithTemplate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active'
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar projeto no banco de dados');
      }
      
      // Emitir evento de projeto criado
      this.toolManager.emit('project:created', {
        project: result,
        creator: projectData.owner,
        timestamp: new Date().toISOString()
      });
      
      // Enviar notificação se habilitado
      if (this.notificationsEnabled) {
        this.toolManager.executeTool('notification:send', {
          type: 'project_created',
          recipients: [projectData.owner],
          data: {
            projectId: result.id,
            projectName: result.name
          }
        });
      }
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza informações de um projeto existente
   * @param {string} projectId - ID do projeto a ser atualizado
   * @param {Object} projectData - Novos dados do projeto
   * @param {string} userId - ID do usuário realizando a atualização
   * @returns {Promise<Object>} Projeto atualizado
   * @throws {Error} Se a atualização falhar
   */
  async updateProject(projectId, projectData, userId) {
    try {
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        projectId,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar este projeto');
      }
      
      // Obter projeto atual
      const currentProject = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!currentProject) {
        throw new Error('Projeto não encontrado');
      }
      
      // Sanitizar e validar dados do projeto
      const sanitizedData = this.securityAgent.sanitizeInput(projectData, {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'] }
        }
      });
      
      // Atualizar projeto no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'projects',
        id: projectId,
        data: {
          ...sanitizedData,
          updated_at: new Date().toISOString()
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar projeto no banco de dados');
      }
      
      // Calcular alterações
      const changes = this.calculateChanges(currentProject, result);
      
      // Emitir evento de projeto atualizado
      this.toolManager.emit('project:updated', {
        project: result,
        updater: userId,
        changes,
        timestamp: new Date().toISOString()
      });
      
      // Enviar notificação se habilitado e houver alterações significativas
      if (this.notificationsEnabled && Object.keys(changes).length > 0) {
        // Obter membros do projeto
        const members = await this.getProjectMembers(projectId);
        
        this.toolManager.executeTool('notification:send', {
          type: 'project_updated',
          recipients: members.map(member => member.user_id),
          data: {
            projectId: result.id,
            projectName: result.name,
            changes
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova tarefa em um projeto
   * @param {string} projectId - ID do projeto
   * @param {Object} taskData - Dados da tarefa a ser criada
   * @param {string} userId - ID do usuário criando a tarefa
   * @returns {Promise<string>} ID da tarefa criada
   * @throws {Error} Se a criação falhar
   */
  /**
   * Cria uma tarefa utilizando o TaskMaster se estiver habilitado, ou o método padrão caso contrário
   * @param {string} projectId - ID do projeto
   * @param {Object} taskData - Dados da tarefa
   * @param {string} userId - ID do usuário que está criando a tarefa
   * @returns {Promise<Object>} - Tarefa criada
   */
  async createTask(projectId, taskData, userId) {
    // Se o TaskMaster estiver habilitado, usar para criar a tarefa
    if (this.taskMasterEnabled) {
      return this.createTaskWithTaskMaster(projectId, taskData, userId);
    }
    
    // Caso contrário, continuar com o método original

    try {
      // Validar permissões do usuário
      const canCreate = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        projectId,
        'write'
      );
      
      if (!canCreate) {
        throw new Error('Usuário não tem permissão para criar tarefas neste projeto');
      }
      
      // Sanitizar e validar dados da tarefa
      const sanitizedData = this.securityAgent.sanitizeInput(taskData, {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          estimatedHours: { type: 'number', minimum: 0 },
          dueDate: { type: 'string', format: 'date' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      });
      
      // Inserir tarefa no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'tasks',
        data: {
          project_id: projectId,
          ...sanitizedData,
          status: 'todo',
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar tarefa no banco de dados');
      }
      
      // Emitir evento de tarefa criada
      this.toolManager.emit('task:created', {
        task: result,
        project: projectId,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Criar issue no GitHub se integração estiver configurada
      await this.createGitHubIssueForTask(result);
      
      // Enviar notificação se habilitado
      if (this.notificationsEnabled) {
        // Obter membros do projeto
        const members = await this.getProjectMembers(projectId);
        
        this.toolManager.executeTool('notification:send', {
          type: 'task_created',
          recipients: members.map(member => member.user_id),
          data: {
            taskId: result.id,
            taskTitle: result.title,
            projectId,
            creator: userId
          }
        });
      }
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza informações de uma tarefa existente
   * @param {string} taskId - ID da tarefa a ser atualizada
   * @param {Object} taskData - Novos dados da tarefa
   * @param {string} userId - ID do usuário realizando a atualização
   * @returns {Promise<Object>} Tarefa atualizada
   * @throws {Error} Se a atualização falhar
   */
  /**
   * Atualiza uma tarefa utilizando o TaskMaster se estiver habilitado, ou o método padrão caso contrário
   * @param {string} taskId - ID da tarefa
   * @param {Object} taskData - Dados atualizados da tarefa
   * @param {string} userId - ID do usuário que está atualizando a tarefa
   * @returns {Promise<Object>} - Tarefa atualizada
   */
  async updateTask(taskId, taskData, userId) {
    // Se o TaskMaster estiver habilitado, usar para atualizar a tarefa
    if (this.taskMasterEnabled) {
      return this.updateTaskWithTaskMaster(taskId, taskData, userId);
    }
    
    // Caso contrário, continuar com o método original

    try {
      // Obter tarefa atual
      const currentTask = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        id: taskId
      });
      
      if (!currentTask) {
        throw new Error('Tarefa não encontrada');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        currentTask.project_id,
        'write'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar esta tarefa');
      }
      
      // Sanitizar e validar dados da tarefa
      const sanitizedData = this.securityAgent.sanitizeInput(taskData, {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] },
          estimatedHours: { type: 'number', minimum: 0 },
          actualHours: { type: 'number', minimum: 0 },
          dueDate: { type: 'string', format: 'date' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      });
      
      // Atualizar tarefa no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'tasks',
        id: taskId,
        data: {
          ...sanitizedData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar tarefa no banco de dados');
      }
      
      // Calcular alterações
      const changes = this.calculateChanges(currentTask, result);
      
      // Emitir evento de tarefa atualizada
      this.toolManager.emit('task:updated', {
        task: result,
        project: result.project_id,
        updater: userId,
        changes,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar issue no GitHub se integração estiver configurada
      if (currentTask.github_issue_id) {
        await this.updateGitHubIssueForTask(result, changes);
      }
      
      // Enviar notificação se habilitado e houver alterações significativas
      if (this.notificationsEnabled && Object.keys(changes).length > 0) {
        const recipients = [];
        
        // Adicionar responsável pela tarefa
        if (result.assigned_to) {
          recipients.push(result.assigned_to);
        }
        
        // Adicionar criador da tarefa
        if (result.created_by && result.created_by !== userId && result.created_by !== result.assigned_to) {
          recipients.push(result.created_by);
        }
        
        if (recipients.length > 0) {
          this.toolManager.executeTool('notification:send', {
            type: 'task_updated',
            recipients,
            data: {
              taskId: result.id,
              taskTitle: result.title,
              projectId: result.project_id,
              changes
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  }
  
  /**
   * Atribui uma tarefa a um usuário
   * @param {string} taskId - ID da tarefa
   * @param {string} userId - ID do usuário a ser atribuído
   * @param {string} assignerId - ID do usuário realizando a atribuição
   * @returns {Promise<Object>} Tarefa atualizada
   * @throws {Error} Se a atribuição falhar
   */
  async assignTask(taskId, userId, assignerId) {
    try {
      // Obter tarefa atual
      const currentTask = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        id: taskId
      });
      
      if (!currentTask) {
        throw new Error('Tarefa não encontrada');
      }
      
      // Validar permissões do usuário
      const canAssign = await this.securityAgent.authorizeAccess(
        assignerId,
        'project',
        currentTask.project_id,
        'write'
      );
      
      if (!canAssign) {
        throw new Error('Usuário não tem permissão para atribuir esta tarefa');
      }
      
      // Verificar se o usuário é membro do projeto
      const isMember = await this.isProjectMember(currentTask.project_id, userId);
      
      if (!isMember) {
        throw new Error('O usuário não é membro deste projeto');
      }
      
      // Atualizar tarefa no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'tasks',
        id: taskId,
        data: {
          assigned_to: userId,
          updated_at: new Date().toISOString(),
          updated_by: assignerId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atribuir tarefa no banco de dados');
      }
      
      // Emitir evento de tarefa atribuída
      this.toolManager.emit('task:assigned', {
        task: result,
        project: result.project_id,
        user: userId,
        assigner: assignerId,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar issue no GitHub se integração estiver configurada
      if (currentTask.github_issue_id) {
        await this.updateGitHubIssueAssignee(result, userId);
      }
      
      // Enviar notificação se habilitado
      if (this.notificationsEnabled && userId !== assignerId) {
        this.toolManager.executeTool('notification:send', {
          type: 'task_assigned',
          recipients: [userId],
          data: {
            taskId: result.id,
            taskTitle: result.title,
            projectId: result.project_id,
            assigner: assignerId
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atribuir tarefa:', error);
      throw error;
    }
  }
  
  /**
   * Obtém o progresso atual de um projeto
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário solicitando o progresso
   * @returns {Promise<Object>} Objeto com informações de progresso
   * @throws {Error} Se a obtenção falhar
   */
  async getProjectProgress(projectId, userId) {
    try {
      // Validar permissões do usuário
      const canView = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        projectId,
        'read'
      );
      
      if (!canView) {
        throw new Error('Usuário não tem permissão para visualizar este projeto');
      }
      
      // Obter projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
      
      // Obter tarefas do projeto
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: projectId
        }
      });
      
      // Calcular métricas de progresso
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'done').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
      const reviewTasks = tasks.filter(task => task.status === 'review').length;
      const todoTasks = tasks.filter(task => task.status === 'todo').length;
      
      // Calcular progresso geral
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Calcular progresso por prioridade
      const priorityProgress = {
        urgent: this.calculateProgressByPriority(tasks, 'urgent'),
        high: this.calculateProgressByPriority(tasks, 'high'),
        medium: this.calculateProgressByPriority(tasks, 'medium'),
        low: this.calculateProgressByPriority(tasks, 'low')
      };
      
      // Calcular progresso por tag
      const tagProgress = this.calculateProgressByTags(tasks);
      
      // Verificar prazos
      const now = new Date();
      const tasksWithDeadlines = tasks.filter(task => task.dueDate && task.status !== 'done');
      const upcomingDeadlines = tasksWithDeadlines
        .filter(task => {
          const dueDate = new Date(task.dueDate);
          const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= this.deadlineWarningDays && daysUntilDue >= 0;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      const overdueDeadlines = tasksWithDeadlines
        .filter(task => new Date(task.dueDate) < now)
        .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
      
      return {
        projectId,
        projectName: project.name,
        overallProgress,
        taskCounts: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          review: reviewTasks,
          todo: todoTasks
        },
        priorityProgress,
        tagProgress,
        deadlines: {
          upcoming: upcomingDeadlines,
          overdue: overdueDeadlines
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter progresso do projeto:', error);
      throw error;
    }
  }
  
  /**
   * Gera um relatório para um projeto
   * @param {string} projectId - ID do projeto
   * @param {string} reportType - Tipo de relatório (progresso, recursos, prazos)
   * @param {string} userId - ID do usuário solicitando o relatório
   * @returns {Promise<Object>} Objeto com o relatório gerado
   * @throws {Error} Se a geração falhar
   */
  async generateProjectReport(projectId, reportType, userId) {
    try {
      // Validar permissões do usuário
      const canView = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        projectId,
        'read'
      );
      
      if (!canView) {
        throw new Error('Usuário não tem permissão para gerar relatórios deste projeto');
      }
      
      // Obter projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
      
      // Gerar relatório com base no tipo
      let report;
      
      switch (reportType) {
        case 'progress':
          report = await this.generateProgressReport(project);
          break;
        case 'resources':
          report = await this.generateResourcesReport(project);
          break;
        case 'deadlines':
          report = await this.generateDeadlinesReport(project);
          break;
        default:
          throw new Error(`Tipo de relatório desconhecido: ${reportType}`);
      }
      
      // Registrar geração de relatório
      await this.toolManager.executeTool('supabase:insert', {
        table: 'project_reports',
        data: {
          project_id: projectId,
          report_type: reportType,
          generated_by: userId,
          generated_at: new Date().toISOString(),
          report_data: report
        }
      });
      
      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de projeto:', error);
      throw error;
    }
  }
  
  /**
   * Aplica um template a um novo projeto
   * @private
   * @param {Object} projectData - Dados do projeto
   * @returns {Object} Projeto com template aplicado
   */
  applyProjectTemplate(projectData) {
    // Implementação para aplicar templates de projeto
    const template = this.defaultProjectTemplate;
    
    switch (template) {
      case 'basic':
        return {
          ...projectData,
          settings: {
            ...projectData.settings,
            defaultTaskStatus: 'todo',
            enableGitHubIntegration: true,
            enableNotifications: true
          }
        };
      case 'advanced':
        return {
          ...projectData,
          settings: {
            ...projectData.settings,
            defaultTaskStatus: 'todo',
            enableGitHubIntegration: true,
            enableNotifications: true,
            enableTimeTracking: true,
            enableResourceAllocation: true,
            enableDependencies: true
          }
        };
      case 'custom':
        // Implementação para template personalizado
        return projectData;
      default:
        return projectData;
    }
  }
  
  /**
   * Calcula as alterações entre duas versões de um objeto
   * @private
   * @param {Object} oldObj - Objeto antigo
   * @param {Object} newObj - Objeto novo
   * @returns {Object} Alterações detectadas
   */
  calculateChanges(oldObj, newObj) {
    const changes = {};
    
    // Comparar propriedades
    for (const key in newObj) {
      // Ignorar propriedades internas
      if (key.startsWith('_') || key === 'updated_at' || key === 'updated_by') {
        continue;
      }
      
      // Verificar se a propriedade existe no objeto antigo
      if (key in oldObj) {
        // Verificar se o valor mudou
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
          changes[key] = {
            old: oldObj[key],
            new: newObj[key]
          };
        }
      } else {
        // Propriedade nova
        changes[key] = {
          old: null,
          new: newObj[key]
        };
      }
    }
    
    // Verificar propriedades removidas
    for (const key in oldObj) {
      if (!(key in newObj) && !key.startsWith('_')) {
        changes[key] = {
          old: oldObj[key],
          new: null
        };
      }
    }
    
    return changes;
  }
  
  /**
   * Obtém os membros de um projeto
   * @private
   * @param {string} projectId - ID do projeto
   * @returns {Promise<Array>} Lista de membros do projeto
   */
  async getProjectMembers(projectId) {
    try {
      return await this.toolManager.executeTool('supabase:query', {
        table: 'project_members',
        filters: {
          project_id: projectId,
          status: 'active'
        }
      });
    } catch (error) {
      console.error('Erro ao obter membros do projeto:', error);
      return [];
    }
  }
  
  /**
   * Verifica se um usuário é membro de um projeto
   * @private
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} Indica se o usuário é membro do projeto
   */
  async isProjectMember(projectId, userId) {
    try {
      // Obter projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!project) {
        return false;
      }
      
      // Verificar se o usuário é o proprietário
      if (project.owner_id === userId) {
        return true;
      }
      
      // Verificar se o usuário é membro
      const membership = await this.toolManager.executeTool('supabase:query', {
        table: 'project_members',
        filters: {
          project_id: projectId,
          user_id: userId,
          status: 'active'
        }
      });
      
      return membership && membership.length > 0;
    } catch (error) {
      console.error('Erro ao verificar membro do projeto:', error);
      return false;
    }
  }
  
  /**
   * Calcula o progresso de tarefas por prioridade
   * @private
   * @param {Array} tasks - Lista de tarefas
   * @param {string} priority - Prioridade a ser calculada
   * @returns {Object} Progresso para a prioridade especificada
   */
  calculateProgressByPriority(tasks, priority) {
    const priorityTasks = tasks.filter(task => task.priority === priority);
    const total = priorityTasks.length;
    const completed = priorityTasks.filter(task => task.status === 'done').length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
  
  /**
   * Calcula o progresso de tarefas por tags
   * @private
   * @param {Array} tasks - Lista de tarefas
   * @returns {Object} Progresso por tag
   */
  calculateProgressByTags(tasks) {
    const tagProgress = {};
    
    // Coletar todas as tags únicas
    const allTags = new Set();
    tasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Calcular progresso para cada tag
    allTags.forEach(tag => {
      const tagTasks = tasks.filter(task => 
        task.tags && Array.isArray(task.tags) && task.tags.includes(tag)
      );
      
      const total = tagTasks.length;
      const completed = tagTasks.filter(task => task.status === 'done').length;
      
      tagProgress[tag] = {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
    
    return tagProgress;
  }
  
  /**
   * Cria uma issue no GitHub para uma tarefa
   * @private
   * @param {Object} task - Tarefa para criar issue
   * @returns {Promise<void>}
   */
  async createGitHubIssueForTask(task) {
    try {
      // Verificar se a integração com GitHub está habilitada para o projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: task.project_id
      });
      
      if (!project || !project.settings || !project.settings.enableGitHubIntegration) {
        return;
      }
      
      // Obter repositório associado ao projeto
      const repository = await this.toolManager.executeTool('supabase:query', {
        table: 'repositories',
        filters: {
          project_id: task.project_id,
          provider: 'github'
        }
      });
      
      if (!repository || !repository.length) {
        return;
      }
      
      // Criar issue no GitHub
      const issueResult = await this.toolManager.executeTool('github:issues:create', {
        owner: repository[0].owner,
        repo: repository[0].name,
        title: task.title,
        body: task.description || '',
        labels: task.tags || [],
        assignees: task.assigned_to ? [task.assigned_to] : []
      });
      
      if (issueResult && issueResult.number) {
        // Atualizar tarefa com referência à issue do GitHub
        await this.toolManager.executeTool('supabase:update', {
          table: 'tasks',
          id: task.id,
          data: {
            github_issue_id: issueResult.number,
            github_issue_url: issueResult.html_url
          }
        });
      }
    } catch (error) {
      console.error('Erro ao criar issue no GitHub:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Atualiza uma issue no GitHub para uma tarefa
   * @private
   * @param {Object} task - Tarefa atualizada
   * @param {Object} changes - Alterações na tarefa
   * @returns {Promise<void>}
   */
  async updateGitHubIssueForTask(task, changes) {
    try {
      // Verificar se a tarefa tem uma issue associada
      if (!task.github_issue_id) {
        return;
      }
      
      // Obter repositório associado ao projeto
      const repository = await this.toolManager.executeTool('supabase:query', {
        table: 'repositories',
        filters: {
          project_id: task.project_id,
          provider: 'github'
        }
      });
      
      if (!repository || !repository.length) {
        return;
      }
      
      // Preparar dados para atualização
      const updateData = {};
      
      if (changes.title) {
        updateData.title = changes.title.new;
      }
      
      if (changes.description) {
        updateData.body = changes.description.new || '';
      }
      
      if (changes.status) {
        // Mapear status da tarefa para estado da issue
        if (changes.status.new === 'done') {
          updateData.state = 'closed';
        } else if (changes.status.old === 'done') {
          updateData.state = 'open';
        }
      }
      
      if (changes.tags) {
        updateData.labels = changes.tags.new || [];
      }
      
      // Atualizar issue no GitHub
      if (Object.keys(updateData).length > 0) {
        await this.toolManager.executeTool('github:issues:update', {
          owner: repository[0].owner,
          repo: repository[0].name,
          issue_number: task.github_issue_id,
          ...updateData
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar issue no GitHub:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Atualiza o responsável por uma issue no GitHub
   * @private
   * @param {Object} task - Tarefa atualizada
   * @param {string} userId - ID do usuário atribuído
   * @returns {Promise<void>}
   */
  async updateGitHubIssueAssignee(task, userId) {
    try {
      // Verificar se a tarefa tem uma issue associada
      if (!task.github_issue_id) {
        return;
      }
      
      // Obter repositório associado ao projeto
      const repository = await this.toolManager.executeTool('supabase:query', {
        table: 'repositories',
        filters: {
          project_id: task.project_id,
          provider: 'github'
        }
      });
      
      if (!repository || !repository.length) {
        return;
      }
      
      // Obter nome de usuário do GitHub para o usuário
      const user = await this.toolManager.executeTool('supabase:query', {
        table: 'user_profiles',
        filters: {
          user_id: userId
        }
      });
      
      if (!user || !user.github_username) {
        return;
      }
      
      // Atualizar responsável pela issue no GitHub
      await this.toolManager.executeTool('github:issues:update', {
        owner: repository[0].owner,
        repo: repository[0].name,
        issue_number: task.github_issue_id,
        assignees: [user.github_username]
      });
    } catch (error) {
      console.error('Erro ao atualizar responsável por issue no GitHub:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Gera um relatório de progresso para um projeto
   * @private
   * @param {Object} project - Projeto
   * @returns {Promise<Object>} Relatório de progresso
   */
  async generateProgressReport(project) {
    try {
      // Obter tarefas do projeto
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: project.id
        }
      });
      
      // Calcular métricas de progresso
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'done').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
      const reviewTasks = tasks.filter(task => task.status === 'review').length;
      const todoTasks = tasks.filter(task => task.status === 'todo').length;
      
      // Calcular progresso geral
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Calcular progresso por prioridade
      const priorityProgress = {
        urgent: this.calculateProgressByPriority(tasks, 'urgent'),
        high: this.calculateProgressByPriority(tasks, 'high'),
        medium: this.calculateProgressByPriority(tasks, 'medium'),
        low: this.calculateProgressByPriority(tasks, 'low')
      };
      
      // Calcular progresso por tag
      const tagProgress = this.calculateProgressByTags(tasks);
      
      // Calcular progresso ao longo do tempo
      const progressOverTime = await this.calculateProgressOverTime(project.id);
      
      return {
        title: `Relatório de Progresso - ${project.name}`,
        generatedAt: new Date().toISOString(),
        projectId: project.id,
        projectName: project.name,
        overallProgress,
        taskCounts: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          review: reviewTasks,
          todo: todoTasks
        },
        priorityProgress,
        tagProgress,
        progressOverTime,
        recentlyCompletedTasks: tasks
          .filter(task => task.status === 'done')
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de progresso:', error);
      throw error;
    }
  }
  
  /**
   * Gera um relatório de recursos para um projeto
   * @private
   * @param {Object} project - Projeto
   * @returns {Promise<Object>} Relatório de recursos
   */
  async generateResourcesReport(project) {
    try {
      // Obter membros do projeto
      const members = await this.getProjectMembers(project.id);
      
      // Obter tarefas do projeto
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: project.id
        }
      });
      
      // Calcular alocação de recursos
      const resourceAllocation = {};
      
      members.forEach(member => {
        const memberTasks = tasks.filter(task => task.assigned_to === member.user_id);
        const totalTasks = memberTasks.length;
        const completedTasks = memberTasks.filter(task => task.status === 'done').length;
        const inProgressTasks = memberTasks.filter(task => task.status === 'in_progress').length;
        const estimatedHours = memberTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        const actualHours = memberTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
        
        resourceAllocation[member.user_id] = {
          userId: member.user_id,
          role: member.role,
          taskCounts: {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            remaining: totalTasks - completedTasks
          },
          hours: {
            estimated: estimatedHours,
            actual: actualHours,
            remaining: estimatedHours - actualHours
          },
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
      });
      
      // Identificar tarefas não atribuídas
      const unassignedTasks = tasks.filter(task => !task.assigned_to);
      
      return {
        title: `Relatório de Recursos - ${project.name}`,
        generatedAt: new Date().toISOString(),
        projectId: project.id,
        projectName: project.name,
        resourceAllocation,
        unassignedTasks: {
          count: unassignedTasks.length,
          tasks: unassignedTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            status: task.status,
            estimatedHours: task.estimatedHours
          }))
        },
        recommendations: this.generateResourceRecommendations(resourceAllocation, unassignedTasks)
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de recursos:', error);
      throw error;
    }
  }
  
  /**
   * Gera um relatório de prazos para um projeto
   * @private
   * @param {Object} project - Projeto
   * @returns {Promise<Object>} Relatório de prazos
   */
  async generateDeadlinesReport(project) {
    try {
      // Obter tarefas do projeto
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: project.id
        }
      });
      
      const now = new Date();
      
      // Filtrar tarefas com prazos
      const tasksWithDeadlines = tasks.filter(task => task.dueDate);
      
      // Tarefas com prazo vencido
      const overdueTasks = tasksWithDeadlines
        .filter(task => task.status !== 'done' && new Date(task.dueDate) < now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      // Tarefas com prazo próximo
      const upcomingTasks = tasksWithDeadlines
        .filter(task => {
          if (task.status === 'done') return false;
          
          const dueDate = new Date(task.dueDate);
          const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          return daysUntilDue >= 0 && daysUntilDue <= this.deadlineWarningDays;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      // Tarefas futuras
      const futureTasks = tasksWithDeadlines
        .filter(task => {
          if (task.status === 'done') return false;
          
          const dueDate = new Date(task.dueDate);
          const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          return daysUntilDue > this.deadlineWarningDays;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      // Tarefas concluídas no prazo vs. atrasadas
      const completedTasks = tasksWithDeadlines.filter(task => task.status === 'done');
      const completedOnTime = completedTasks.filter(task => 
        new Date(task.updated_at) <= new Date(task.dueDate)
      );
      const completedLate = completedTasks.filter(task => 
        new Date(task.updated_at) > new Date(task.dueDate)
      );
      
      // Calcular estatísticas de prazos
      const deadlineStats = {
        totalTasksWithDeadlines: tasksWithDeadlines.length,
        overdueTasks: overdueTasks.length,
        upcomingDeadlines: upcomingTasks.length,
        futureDeadlines: futureTasks.length,
        completedOnTime: completedOnTime.length,
        completedLate: completedLate.length,
        onTimePercentage: completedTasks.length > 0 
          ? Math.round((completedOnTime.length / completedTasks.length) * 100) 
          : 0
      };
      
      return {
        title: `Relatório de Prazos - ${project.name}`,
        generatedAt: new Date().toISOString(),
        projectId: project.id,
        projectName: project.name,
        deadlineStats,
        overdueTasks: overdueTasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          daysOverdue: Math.ceil((now - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)),
          assignedTo: task.assigned_to,
          priority: task.priority
        })),
        upcomingTasks: upcomingTasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          daysRemaining: Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24)),
          assignedTo: task.assigned_to,
          priority: task.priority
        })),
        recommendations: this.generateDeadlineRecommendations(deadlineStats, overdueTasks, upcomingTasks)
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de prazos:', error);
      throw error;
    }
  }
  
  /**
   * Calcula o progresso do projeto ao longo do tempo
   * @private
   * @param {string} projectId - ID do projeto
   * @returns {Promise<Array>} Progresso ao longo do tempo
   */
  async calculateProgressOverTime(projectId) {
    try {
      // Obter histórico de atualizações de tarefas
      const taskHistory = await this.toolManager.executeTool('supabase:query', {
        table: 'task_history',
        filters: {
          project_id: projectId
        },
        order: {
          timestamp: 'asc'
        }
      });
      
      if (!taskHistory || taskHistory.length === 0) {
        return [];
      }
      
      // Agrupar por data
      const progressByDate = {};
      const totalTasks = {};
      
      taskHistory.forEach(entry => {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        
        if (!progressByDate[date]) {
          progressByDate[date] = {
            completed: 0,
            total: 0
          };
        }
        
        // Atualizar contagem de tarefas
        if (entry.event === 'task_created') {
          totalTasks[entry.task_id] = entry.new_status || 'todo';
          progressByDate[date].total++;
        } else if (entry.event === 'task_updated' && entry.field === 'status') {
          const oldStatus = totalTasks[entry.task_id] || 'todo';
          const newStatus = entry.new_status;
          
          if (oldStatus !== 'done' && newStatus === 'done') {
            progressByDate[date].completed++;
          } else if (oldStatus === 'done' && newStatus !== 'done') {
            progressByDate[date].completed--;
          }
          
          totalTasks[entry.task_id] = newStatus;
        }
      });
      
      // Calcular progresso cumulativo
      const result = [];
      let cumulativeTotal = 0;
      let cumulativeCompleted = 0;
      
      Object.keys(progressByDate).sort().forEach(date => {
        cumulativeTotal += progressByDate[date].total;
        cumulativeCompleted += progressByDate[date].completed;
        
        result.push({
          date,
          total: cumulativeTotal,
          completed: cumulativeCompleted,
          percentage: cumulativeTotal > 0 ? Math.round((cumulativeCompleted / cumulativeTotal) * 100) : 0
        });
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular progresso ao longo do tempo:', error);
      return [];
    }
  }
  
  /**
   * Gera recomendações para alocação de recursos
   * @private
   * @param {Object} resourceAllocation - Alocação atual de recursos
   * @param {Array} unassignedTasks - Tarefas não atribuídas
   * @returns {Array} Recomendações
   */
  generateResourceRecommendations(resourceAllocation, unassignedTasks) {
    const recommendations = [];
    
    // Verificar membros sobrecarregados
    const overloadedMembers = Object.values(resourceAllocation).filter(
      member => member.taskCounts.inProgress > 3 || member.hours.remaining > 40
    );
    
    if (overloadedMembers.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Membros sobrecarregados',
        description: `${overloadedMembers.length} membros da equipe estão com muitas tarefas em andamento ou muitas horas estimadas restantes.`,
        actions: ['Redistribuir tarefas', 'Ajustar prazos', 'Adicionar recursos']
      });
    }
    
    // Verificar membros subutilizados
    const underutilizedMembers = Object.values(resourceAllocation).filter(
      member => member.taskCounts.inProgress === 0 && member.taskCounts.total < 2
    );
    
    if (underutilizedMembers.length > 0 && unassignedTasks.length > 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Membros subutilizados',
        description: `${underutilizedMembers.length} membros da equipe têm poucas ou nenhuma tarefa atribuída, enquanto existem ${unassignedTasks.length} tarefas não atribuídas.`,
        actions: ['Atribuir tarefas não atribuídas', 'Redistribuir tarefas']
      });
    }
    
    // Verificar tarefas não atribuídas de alta prioridade
    const highPriorityUnassigned = unassignedTasks.filter(
      task => task.priority === 'high' || task.priority === 'urgent'
    );
    
    if (highPriorityUnassigned.length > 0) {
      recommendations.push({
        type: 'alert',
        title: 'Tarefas prioritárias não atribuídas',
        description: `Existem ${highPriorityUnassigned.length} tarefas de alta prioridade ou urgentes que não estão atribuídas a nenhum membro da equipe.`,
        actions: ['Atribuir imediatamente', 'Revisar prioridades']
      });
    }
    
    return recommendations;
  }
  
  /**
   * Gera recomendações para gerenciamento de prazos
   * @private
   * @param {Object} deadlineStats - Estatísticas de prazos
   * @param {Array} overdueTasks - Tarefas com prazo vencido
   * @param {Array} upcomingTasks - Tarefas com prazo próximo
   * @returns {Array} Recomendações
   */
  generateDeadlineRecommendations(deadlineStats, overdueTasks, upcomingTasks) {
    const recommendations = [];
    
    // Verificar tarefas com prazo vencido
    if (overdueTasks.length > 0) {
      const urgentOverdue = overdueTasks.filter(task => task.priority === 'urgent');
      const highOverdue = overdueTasks.filter(task => task.priority === 'high');
      
      if (urgentOverdue.length > 0) {
        recommendations.push({
          type: 'critical',
          title: 'Tarefas urgentes com prazo vencido',
          description: `Existem ${urgentOverdue.length} tarefas urgentes com prazo vencido que requerem atenção imediata.`,
          actions: ['Priorizar imediatamente', 'Realocar recursos', 'Revisar escopo']
        });
      }
      
      if (highOverdue.length > 0) {
        recommendations.push({
          type: 'alert',
          title: 'Tarefas de alta prioridade com prazo vencido',
          description: `Existem ${highOverdue.length} tarefas de alta prioridade com prazo vencido.`,
          actions: ['Priorizar', 'Realocar recursos', 'Revisar prazos']
        });
      }
    }
    
    // Verificar tarefas com prazo próximo
    if (upcomingTasks.length > 0) {
      const urgentUpcoming = upcomingTasks.filter(task => task.priority === 'urgent');
      
      if (urgentUpcoming.length > 0) {
        recommendations.push({
          type: 'warning',
          title: 'Tarefas urgentes com prazo próximo',
          description: `Existem ${urgentUpcoming.length} tarefas urgentes com prazo próximo.`,
          actions: ['Priorizar', 'Monitorar progresso']
        });
      }
    }
    
    // Verificar taxa de conclusão no prazo
    if (deadlineStats.completedOnTime + deadlineStats.completedLate > 5 && deadlineStats.onTimePercentage < 70) {
      recommendations.push({
        type: 'suggestion',
        title: 'Baixa taxa de conclusão no prazo',
        description: `Apenas ${deadlineStats.onTimePercentage}% das tarefas são concluídas dentro do prazo. Isso pode indicar problemas na estimativa ou na execução.`,
        actions: ['Revisar processo de estimativa', 'Analisar gargalos', 'Ajustar prazos futuros']
      });
    }
    
    return recommendations;
  }
  
  /**
   * Handler para eventos de criação de projeto
   * @private
   * @param {Object} data - Dados do evento
   */
  handleProjectCreated(data) {
    console.log('Projeto criado:', data.project.name);
    
    // Implementação do handler para eventos de criação de projeto
    // Pode incluir lógica para criar estrutura inicial, notificar stakeholders, etc.
  }
  
  /**
   * Handler para eventos de atualização de projeto
   * @private
   * @param {Object} data - Dados do evento
   */
  handleProjectUpdated(data) {
    console.log('Projeto atualizado:', data.project.name);
    
    // Implementação do handler para eventos de atualização de projeto
    // Pode incluir lógica para notificar sobre alterações importantes, atualizar dependências, etc.
  }
  
  /**
   * Handler para eventos de criação de tarefa
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskCreated(data) {
    console.log('Tarefa criada:', data.task.title);
    
    // Implementação do handler para eventos de criação de tarefa
    // Pode incluir lógica para notificar responsáveis, atualizar métricas, etc.
  }
  
  /**
   * Handler para eventos de atualização de tarefa
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskUpdated(data) {
    console.log('Tarefa atualizada:', data.task.title);
    
    // Implementação do handler para eventos de atualização de tarefa
    // Pode incluir lógica para notificar sobre alterações de status, atualizar métricas, etc.
  }
  
  /**
   * Handler para eventos de atribuição de tarefa
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskAssigned(data) {
    console.log('Tarefa atribuída:', data.task.title, 'para usuário:', data.user);
    
    // Implementação do handler para eventos de atribuição de tarefa
    // Pode incluir lógica para notificar o novo responsável, atualizar cargas de trabalho, etc.
  }
  
  /**
   * Handler para eventos de prazo próximo
   * @private
   * @param {Object} data - Dados do evento
   */
  handleDeadlineApproaching(data) {
    console.log('Prazo se aproximando:', data.task ? data.task.title : data.project.name);
    
    // Implementação do handler para eventos de prazo próximo
    // Pode incluir lógica para enviar lembretes, escalar prioridades, etc.
  }
  /**
   * Cria uma tarefa utilizando o TaskMaster
   * @param {string} projectId - ID do projeto
   * @param {Object} taskData - Dados da tarefa
   * @param {string} userId - ID do usuário que está criando a tarefa
   * @returns {Promise<Object>} - Tarefa criada
   * @private
   */
  async createTaskWithTaskMaster(projectId, taskData, userId) {
    try {
      const { title, description, priority, details, dependencies } = taskData;
      
      // Preparar comando para o TaskMaster
      const dependenciesStr = dependencies && dependencies.length > 0 ? 
        `--dependencies="${dependencies.join(',')}"` : '';
      const command = `npx task-master add-task --title="${title}" --description="${description}" --priority="${priority}" --details="${details}" ${dependenciesStr}`;
      
      // Executar comando do TaskMaster
      const taskResult = await this.executeTaskMasterCommand(command);
      
      // Processar resultado
      console.log(`Tarefa criada com TaskMaster: ${JSON.stringify(taskResult)}`);
      
      // Retornar resultado formatado
      return {
        id: taskResult.id,
        title: taskResult.title,
        description: taskResult.description,
        status: taskResult.status,
        priority: taskResult.priority,
        projectId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao criar tarefa com TaskMaster:', error);
      throw new Error(`Falha ao criar tarefa com TaskMaster: ${error.message}`);
    }
  }
  
  /**
   * Atualiza uma tarefa utilizando o TaskMaster
   * @param {string} taskId - ID da tarefa
   * @param {Object} taskData - Dados atualizados da tarefa
   * @param {string} userId - ID do usuário que está atualizando a tarefa
   * @returns {Promise<Object>} - Tarefa atualizada
   * @private
   */
  async updateTaskWithTaskMaster(taskId, taskData, userId) {
    try {
      const { status } = taskData;
      
      // Se estiver atualizando o status
      if (status) {
        const command = `npx task-master set-status --id=${taskId} --status="${status}"`;
        await this.executeTaskMasterCommand(command);
      }
      
      // Para outras atualizações, seria necessário implementar conforme as capacidades do TaskMaster
      // Atualmente o TaskMaster não tem um comando direto para atualizar todos os campos
      
      // Buscar a tarefa atualizada
      const updatedTask = await this.getTaskWithTaskMaster(taskId);
      
      return {
        ...updatedTask,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao atualizar tarefa com TaskMaster:', error);
      throw new Error(`Falha ao atualizar tarefa com TaskMaster: ${error.message}`);
    }
  }
  
  /**
   * Busca uma tarefa no TaskMaster
   * @param {string} taskId - ID da tarefa
   * @returns {Promise<Object>} - Tarefa encontrada
   * @private
   */
  async getTaskWithTaskMaster(taskId) {
    try {
      const command = `npx task-master get-task --id=${taskId} --json`;
      const taskResult = await this.executeTaskMasterCommand(command);
      
      return taskResult;
    } catch (error) {
      console.error('Erro ao buscar tarefa com TaskMaster:', error);
      throw new Error(`Falha ao buscar tarefa com TaskMaster: ${error.message}`);
    }
  }
  
  /**
   * Lista tarefas usando o TaskMaster
   * @param {Object} filters - Filtros para busca de tarefas
   * @returns {Promise<Array>} - Lista de tarefas
   */
  async listTasksWithTaskMaster(filters = {}) {
    try {
      const { status } = filters;
      let command = 'npx task-master get-tasks --json';
      
      if (status) {
        command += ` --status="${status}"`;
      }
      
      const tasksResult = await this.executeTaskMasterCommand(command);
      return tasksResult;
    } catch (error) {
      console.error('Erro ao listar tarefas com TaskMaster:', error);
      throw new Error(`Falha ao listar tarefas com TaskMaster: ${error.message}`);
    }
  }
  
  /**
   * Executa um comando do TaskMaster e processa o resultado
   * @param {string} command - Comando a ser executado
   * @returns {Promise<Object>} - Resultado do comando
   * @private
   */
  executeTaskMasterCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.taskMasterPath }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro ao executar comando TaskMaster: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return reject(error);
        }
        
        if (stderr) {
          console.warn(`Aviso do TaskMaster: ${stderr}`);
        }
        
        try {
          // Tentar analisar o resultado como JSON
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          // Se não for JSON, retornar como string
          resolve(stdout.trim());
        }
      });
    });
  }
}

module.exports = { ProjectManagerAgent };
