/**
 * KanbanAgent - Responsável pelo gerenciamento de quadros Kanban no sistema Windsurf
 * 
 * Este agente implementa as regras definidas em kanban_rules.md e gerencia:
 * - Criação e configuração de quadros Kanban
 * - Gerenciamento de colunas e cartões
 * - Automações de fluxo de trabalho
 * - Métricas e visualizações de quadros
 * - Sincronização com projetos
 * - Integração com TaskMaster para gerenciamento visual de tarefas
 */

const { ToolManager } = require('../utils/tool_manager');
const { SecurityAgent } = require('./security_agent');
const { ProjectManagerAgent } = require('./project_manager_agent');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class KanbanAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.securityAgent = new SecurityAgent();
    this.projectManagerAgent = new ProjectManagerAgent();
    
    // Configurações do agente
    this.automationEnabled = process.env.KANBAN_AUTOMATION_ENABLED === 'true';
    this.defaultWipLimit = parseInt(process.env.DEFAULT_WIP_LIMIT || '5', 10);
    this.cardColorsEnabled = process.env.CARD_COLORS_ENABLED === 'true';
    this.defaultBoardTemplate = process.env.DEFAULT_BOARD_TEMPLATE || 'basic';
    
    // Configurações do TaskMaster
    this.taskMasterEnabled = process.env.TASKMASTER_ENABLED === 'true';
    this.taskMasterPath = process.env.TASKMASTER_PATH || path.resolve(process.cwd());
    this.taskMasterApiUrl = process.env.TASKMASTER_API_URL || 'http://localhost:3000/api/taskmaster';
    this.taskMasterDataPath = path.join(this.taskMasterPath, 'tasks');
    this.taskMasterConfigFile = path.join(this.taskMasterPath, 'tasks', 'tasks.json');
    
    // Mapeamento entre status do TaskMaster e colunas do Kanban
    this.statusToColumnMap = {
      'pending': 'A fazer',
      'in-progress': 'Em andamento',
      'review': 'Revisão',
      'done': 'Concluído',
      'deferred': 'Adiado',
      'cancelled': 'Cancelado'
    };
    
    // Configurações do quadro Kanban do TaskMaster
    this.taskMasterBoardConfig = {
      id: 'taskmaster-board',
      title: 'Tarefas TaskMaster',
      description: 'Quadro Kanban para visualização e gerenciamento das tarefas do TaskMaster',
      columns: [
        { id: 'a-fazer', title: 'A fazer', wip: 10, color: '#e2f2ff' },
        { id: 'em-andamento', title: 'Em andamento', wip: 5, color: '#fff8e2' },
        { id: 'revisao', title: 'Revisão', wip: 3, color: '#e6f4ea' },
        { id: 'concluido', title: 'Concluído', wip: 0, color: '#e6c9ff' },
        { id: 'adiado', title: 'Adiado', wip: 0, color: '#f5f5f5' },
        { id: 'cancelado', title: 'Cancelado', wip: 0, color: '#fbe2e2' }
      ],
      autoSync: true,
      syncInterval: 60 // segundos
    };
    
    // Inicializar ferramentas necessárias
    this.initializeTools();
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    // Inicializar quadro Kanban do TaskMaster se estiver habilitado
    if (this.taskMasterEnabled) {
      this.initializeTaskMasterKanban();
    }
    
    console.log('KanbanAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas necessárias para o KanbanAgent
   * @private
   */
  initializeTools() {
    // Registrar ferramentas do Supabase para gerenciamento de quadros
    this.toolManager.registerTool('supabase:query');
    this.toolManager.registerTool('supabase:insert');
    this.toolManager.registerTool('supabase:update');
    this.toolManager.registerTool('supabase:delete');
    
    // Registrar ferramentas do GitHub para integração com issues
    this.toolManager.registerTool('github:issues:list');
    this.toolManager.registerTool('github:issues:update');
    
    // Registrar ferramentas para TaskMaster
    this.toolManager.registerTool('taskmaster:task:list');
    this.toolManager.registerTool('taskmaster:task:status');
    this.toolManager.registerTool('taskmaster:task:get');
    this.toolManager.registerTool('taskmaster:task:set-status');
    this.toolManager.registerTool('taskmaster:task:analyze');
    
    // Registrar ferramentas do Figma para templates visuais
    this.toolManager.registerTool('figma:export');
    this.toolManager.registerTool('figma:import');
    
    // Registrar ferramentas do Claude-TaskMaster para análise inteligente
    this.toolManager.registerTool('claude-task-master:analyze');
    this.toolManager.registerTool('claude-task-master:suggest');
    this.toolManager.registerTool('claude-task-master:optimize');
    
    // Registrar ferramentas para notificações
    this.toolManager.registerTool('notification:send');
  }
  
  /**
   * Registra handlers para eventos de quadros Kanban
   * @private
   */
  registerEventHandlers() {
    // Registrar handlers para eventos relacionados a quadros Kanban
    this.toolManager.eventEmitter.on('card:moved', this.handleCardMoved.bind(this));
    this.toolManager.eventEmitter.on('card:created', this.handleCardCreated.bind(this));
    this.toolManager.eventEmitter.on('card:updated', this.handleCardUpdated.bind(this));
    this.toolManager.eventEmitter.on('card:deleted', this.handleCardDeleted.bind(this));
    
    // Registrar handlers para eventos de integração
    this.toolManager.eventEmitter.on('github:issue:updated', this.handleGitHubIssueUpdated.bind(this));
    
    // Registrar handlers para eventos do TaskMaster
    this.toolManager.eventEmitter.on('taskmaster:task:updated', this.handleTaskMasterTaskUpdated.bind(this));
    this.toolManager.eventEmitter.on('taskmaster:task:created', this.handleTaskMasterTaskCreated.bind(this));
    this.toolManager.eventEmitter.on('taskmaster:task:status:changed', this.handleTaskStatusChanged.bind(this));
    this.toolManager.on('card:updated', this.handleCardUpdated.bind(this));
    this.toolManager.on('card:moved', this.handleCardMoved.bind(this));
    
    // Registrar handlers para eventos de automação
    this.toolManager.on('automation:triggered', this.handleAutomationTriggered.bind(this));
    
    // Registrar handlers para eventos de projetos (para sincronização)
    this.toolManager.on('project:updated', this.handleProjectUpdated.bind(this));
    this.toolManager.on('task:updated', this.handleTaskUpdated.bind(this));
  }
  
  /**
   * Cria um novo quadro Kanban
   * @param {Object} boardData - Dados do quadro a ser criado
   * @param {string} userId - ID do usuário criando o quadro
   * @returns {Promise<string>} ID do quadro criado
   * @throws {Error} Se a criação falhar
   */
  async createBoard(boardData, userId) {
    try {
      // Validar permissões do usuário
      const canCreate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        null,
        'create'
      );
      
      if (!canCreate) {
        throw new Error('Usuário não tem permissão para criar quadros Kanban');
      }
      
      // Sanitizar e validar dados do quadro
      const sanitizedData = this.securityAgent.sanitizeInput(boardData, {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          projectId: { type: 'string' },
          template: { type: 'string', enum: ['basic', 'scrum', 'kanban', 'custom'] }
        }
      });
      
      // Verificar se o projeto existe (se fornecido)
      if (sanitizedData.projectId) {
        const projectExists = await this.toolManager.executeTool('supabase:query', {
          table: 'projects',
          id: sanitizedData.projectId
        });
        
        if (!projectExists) {
          throw new Error('Projeto não encontrado');
        }
      }
      
      // Aplicar template de quadro se necessário
      const template = sanitizedData.template || this.defaultBoardTemplate;
      const boardWithTemplate = await this.applyBoardTemplate(sanitizedData, template);
      
      // Inserir quadro no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_boards',
        data: {
          ...boardWithTemplate,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active'
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar quadro no banco de dados');
      }
      
      // Criar colunas iniciais com base no template
      await this.createInitialColumns(result.id, template);
      
      // Emitir evento de quadro criado
      this.toolManager.emit('board:created', {
        board: result,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Usar Claude-TaskMaster para análise inicial e sugestões
      if (sanitizedData.projectId) {
        this.analyzeProjectForKanban(sanitizedData.projectId, result.id);
      }
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar quadro Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza informações de um quadro Kanban existente
   * @param {string} boardId - ID do quadro a ser atualizado
   * @param {Object} boardData - Novos dados do quadro
   * @param {string} userId - ID do usuário realizando a atualização
   * @returns {Promise<Object>} Quadro atualizado
   * @throws {Error} Se a atualização falhar
   */
  async updateBoard(boardId, boardData, userId) {
    try {
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        boardId,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar este quadro Kanban');
      }
      
      // Obter quadro atual
      const currentBoard = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        id: boardId
      });
      
      if (!currentBoard) {
        throw new Error('Quadro Kanban não encontrado');
      }
      
      // Sanitizar e validar dados do quadro
      const sanitizedData = this.securityAgent.sanitizeInput(boardData, {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived'] },
          settings: { type: 'object' }
        }
      });
      
      // Atualizar quadro no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'kanban_boards',
        id: boardId,
        data: {
          ...sanitizedData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar quadro no banco de dados');
      }
      
      // Calcular alterações
      const changes = this.calculateChanges(currentBoard, result);
      
      // Emitir evento de quadro atualizado
      this.toolManager.emit('board:updated', {
        board: result,
        updater: userId,
        changes,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar quadro Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova coluna em um quadro Kanban
   * @param {string} boardId - ID do quadro
   * @param {Object} columnData - Dados da coluna a ser criada
   * @param {string} userId - ID do usuário criando a coluna
   * @returns {Promise<string>} ID da coluna criada
   * @throws {Error} Se a criação falhar
   */
  async createColumn(boardId, columnData, userId) {
    try {
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        boardId,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para adicionar colunas a este quadro');
      }
      
      // Sanitizar e validar dados da coluna
      const sanitizedData = this.securityAgent.sanitizeInput(columnData, {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          order: { type: 'number', minimum: 0 },
          wipLimit: { type: 'number', minimum: 0 },
          color: { type: 'string' }
        }
      });
      
      // Obter ordem máxima atual para posicionar nova coluna
      const columns = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        filters: {
          board_id: boardId
        },
        order: {
          order: 'desc'
        },
        limit: 1
      });
      
      const maxOrder = columns && columns.length > 0 ? columns[0].order : -1;
      const order = sanitizedData.order !== undefined ? sanitizedData.order : maxOrder + 1;
      
      // Inserir coluna no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_columns',
        data: {
          board_id: boardId,
          name: sanitizedData.name,
          order: order,
          wip_limit: sanitizedData.wipLimit || this.defaultWipLimit,
          color: sanitizedData.color || '#f5f5f5',
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar coluna no banco de dados');
      }
      
      // Emitir evento de coluna criada
      this.toolManager.emit('column:created', {
        column: result,
        board: boardId,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Usar Claude-TaskMaster para analisar e sugerir melhorias no fluxo
      this.analyzeColumnStructure(boardId);
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar coluna Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza informações de uma coluna existente
   * @param {string} columnId - ID da coluna a ser atualizada
   * @param {Object} columnData - Novos dados da coluna
   * @param {string} userId - ID do usuário realizando a atualização
   * @returns {Promise<Object>} Coluna atualizada
   * @throws {Error} Se a atualização falhar
   */
  async updateColumn(columnId, columnData, userId) {
    try {
      // Obter coluna atual
      const currentColumn = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: columnId
      });
      
      if (!currentColumn) {
        throw new Error('Coluna não encontrada');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        currentColumn.board_id,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar esta coluna');
      }
      
      // Sanitizar e validar dados da coluna
      const sanitizedData = this.securityAgent.sanitizeInput(columnData, {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          order: { type: 'number', minimum: 0 },
          wipLimit: { type: 'number', minimum: 0 },
          color: { type: 'string' }
        }
      });
      
      // Preparar dados para atualização
      const updateData = {};
      
      if (sanitizedData.name !== undefined) {
        updateData.name = sanitizedData.name;
      }
      
      if (sanitizedData.order !== undefined) {
        updateData.order = sanitizedData.order;
      }
      
      if (sanitizedData.wipLimit !== undefined) {
        updateData.wip_limit = sanitizedData.wipLimit;
      }
      
      if (sanitizedData.color !== undefined) {
        updateData.color = sanitizedData.color;
      }
      
      // Atualizar coluna no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'kanban_columns',
        id: columnId,
        data: {
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar coluna no banco de dados');
      }
      
      // Calcular alterações
      const changes = this.calculateChanges(currentColumn, result);
      
      // Emitir evento de coluna atualizada
      this.toolManager.emit('column:updated', {
        column: result,
        board: result.board_id,
        updater: userId,
        changes,
        timestamp: new Date().toISOString()
      });
      
      // Verificar se o limite WIP foi alterado e se há cartões em excesso
      if (sanitizedData.wipLimit !== undefined && 
          sanitizedData.wipLimit < currentColumn.wip_limit) {
        this.checkWipLimitExceeded(columnId, sanitizedData.wipLimit);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar coluna Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Cria um novo cartão em uma coluna
   * @param {string} columnId - ID da coluna
   * @param {Object} cardData - Dados do cartão a ser criado
   * @param {string} userId - ID do usuário criando o cartão
   * @returns {Promise<string>} ID do cartão criado
   * @throws {Error} Se a criação falhar
   */
  async createCard(columnId, cardData, userId) {
    try {
      // Obter coluna
      const column = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: columnId
      });
      
      if (!column) {
        throw new Error('Coluna não encontrada');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        column.board_id,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para adicionar cartões a esta coluna');
      }
      
      // Verificar limite WIP
      if (column.wip_limit > 0) {
        const currentCards = await this.toolManager.executeTool('supabase:query', {
          table: 'kanban_cards',
          filters: {
            column_id: columnId
          }
        });
        
        if (currentCards && currentCards.length >= column.wip_limit) {
          throw new Error(`Limite WIP excedido para esta coluna (${column.wip_limit})`);
        }
      }
      
      // Sanitizar e validar dados do cartão
      const sanitizedData = this.securityAgent.sanitizeInput(cardData, {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assignee: { type: 'string' },
          dueDate: { type: 'string', format: 'date' },
          labels: { type: 'array', items: { type: 'string' } },
          taskId: { type: 'string' }
        }
      });
      
      // Obter ordem máxima atual para posicionar novo cartão
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        filters: {
          column_id: columnId
        },
        order: {
          position: 'desc'
        },
        limit: 1
      });
      
      const maxPosition = cards && cards.length > 0 ? cards[0].position : -1;
      
      // Inserir cartão no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_cards',
        data: {
          column_id: columnId,
          board_id: column.board_id,
          title: sanitizedData.title,
          description: sanitizedData.description || '',
          priority: sanitizedData.priority || 'medium',
          assignee: sanitizedData.assignee,
          due_date: sanitizedData.dueDate,
          labels: sanitizedData.labels || [],
          task_id: sanitizedData.taskId,
          position: maxPosition + 1,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar cartão no banco de dados');
      }
      
      // Emitir evento de cartão criado
      this.toolManager.emit('card:created', {
        card: result,
        column: columnId,
        board: column.board_id,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Se o cartão estiver vinculado a uma tarefa, atualizar a tarefa
      if (sanitizedData.taskId) {
        await this.syncCardWithTask(result.id, sanitizedData.taskId);
      }
      
      // Verificar automações para o novo cartão
      if (this.automationEnabled) {
        await this.processAutomationsForCard(result, 'created');
      }
      
      // Usar Claude-TaskMaster para analisar o cartão e fazer sugestões
      this.analyzeCardWithTaskMaster(result.id);
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar cartão Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza informações de um cartão existente
   * @param {string} cardId - ID do cartão a ser atualizado
   * @param {Object} cardData - Novos dados do cartão
   * @param {string} userId - ID do usuário realizando a atualização
   * @returns {Promise<Object>} Cartão atualizado
   * @throws {Error} Se a atualização falhar
   */
  async updateCard(cardId, cardData, userId) {
    try {
      // Obter cartão atual
      const currentCard = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        id: cardId
      });
      
      if (!currentCard) {
        throw new Error('Cartão não encontrado');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        currentCard.board_id,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar este cartão');
      }
      
      // Sanitizar e validar dados do cartão
      const sanitizedData = this.securityAgent.sanitizeInput(cardData, {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assignee: { type: 'string' },
          dueDate: { type: 'string', format: 'date' },
          labels: { type: 'array', items: { type: 'string' } },
          position: { type: 'number', minimum: 0 }
        }
      });
      
      // Preparar dados para atualização
      const updateData = {};
      
      if (sanitizedData.title !== undefined) {
        updateData.title = sanitizedData.title;
      }
      
      if (sanitizedData.description !== undefined) {
        updateData.description = sanitizedData.description;
      }
      
      if (sanitizedData.priority !== undefined) {
        updateData.priority = sanitizedData.priority;
      }
      
      if (sanitizedData.assignee !== undefined) {
        updateData.assignee = sanitizedData.assignee;
      }
      
      if (sanitizedData.dueDate !== undefined) {
        updateData.due_date = sanitizedData.dueDate;
      }
      
      if (sanitizedData.labels !== undefined) {
        updateData.labels = sanitizedData.labels;
      }
      
      if (sanitizedData.position !== undefined) {
        updateData.position = sanitizedData.position;
      }
      
      // Atualizar cartão no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'kanban_cards',
        id: cardId,
        data: {
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar cartão no banco de dados');
      }
      
      // Calcular alterações
      const changes = this.calculateChanges(currentCard, result);
      
      // Emitir evento de cartão atualizado
      this.toolManager.emit('card:updated', {
        card: result,
        column: result.column_id,
        board: result.board_id,
        updater: userId,
        changes,
        timestamp: new Date().toISOString()
      });
      
      // Se o cartão estiver vinculado a uma tarefa, atualizar a tarefa
      if (currentCard.task_id) {
        await this.syncCardWithTask(cardId, currentCard.task_id, changes);
      }
      
      // Verificar automações para o cartão atualizado
      if (this.automationEnabled) {
        await this.processAutomationsForCard(result, 'updated', changes);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar cartão Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Move um cartão para outra coluna
   * @param {string} cardId - ID do cartão a ser movido
   * @param {string} targetColumnId - ID da coluna de destino
   * @param {number} position - Posição na coluna (opcional)
   * @param {string} userId - ID do usuário movendo o cartão
   * @returns {Promise<Object>} Cartão atualizado
   * @throws {Error} Se a movimentação falhar
   */
  async moveCard(cardId, targetColumnId, position, userId) {
    try {
      // Obter cartão atual
      const currentCard = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        id: cardId
      });
      
      if (!currentCard) {
        throw new Error('Cartão não encontrado');
      }
      
      // Obter coluna de destino
      const targetColumn = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: targetColumnId
      });
      
      if (!targetColumn) {
        throw new Error('Coluna de destino não encontrada');
      }
      
      // Verificar se as colunas pertencem ao mesmo quadro
      if (currentCard.board_id !== targetColumn.board_id) {
        throw new Error('Não é possível mover cartões entre quadros diferentes');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        currentCard.board_id,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para mover este cartão');
      }
      
      // Verificar limite WIP da coluna de destino
      if (targetColumn.wip_limit > 0 && currentCard.column_id !== targetColumnId) {
        const currentCards = await this.toolManager.executeTool('supabase:query', {
          table: 'kanban_cards',
          filters: {
            column_id: targetColumnId
          }
        });
        
        if (currentCards && currentCards.length >= targetColumn.wip_limit) {
          throw new Error(`Limite WIP excedido para a coluna de destino (${targetColumn.wip_limit})`);
        }
      }
      
      // Determinar posição na coluna de destino
      let newPosition = position;
      
      if (newPosition === undefined) {
        // Obter posição máxima na coluna de destino
        const cards = await this.toolManager.executeTool('supabase:query', {
          table: 'kanban_cards',
          filters: {
            column_id: targetColumnId
          },
          order: {
            position: 'desc'
          },
          limit: 1
        });
        
        newPosition = cards && cards.length > 0 ? cards[0].position + 1 : 0;
      }
      
      // Obter coluna de origem
      const sourceColumn = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: currentCard.column_id
      });
      
      // Atualizar cartão no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'kanban_cards',
        id: cardId,
        data: {
          column_id: targetColumnId,
          position: newPosition,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      if (!result) {
        throw new Error('Falha ao mover cartão no banco de dados');
      }
      
      // Emitir evento de cartão movido
      this.toolManager.emit('card:moved', {
        card: result,
        sourceColumn: sourceColumn,
        targetColumn: targetColumn,
        board: result.board_id,
        mover: userId,
        timestamp: new Date().toISOString()
      });
      
      // Se o cartão estiver vinculado a uma tarefa, atualizar o status da tarefa
      if (currentCard.task_id) {
        await this.updateTaskStatusFromCardMove(
          currentCard.task_id,
          sourceColumn,
          targetColumn
        );
      }
      
      // Verificar automações para o cartão movido
      if (this.automationEnabled) {
        await this.processAutomationsForCard(result, 'moved', {
          sourceColumn: sourceColumn,
          targetColumn: targetColumn
        });
      }
      
      // Usar Claude-TaskMaster para analisar a movimentação e fazer sugestões
      this.analyzeCardMovementWithTaskMaster(
        cardId,
        sourceColumn.id,
        targetColumnId
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao mover cartão Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova regra de automação para um quadro
   * @param {string} boardId - ID do quadro
   * @param {Object} automationData - Configurações da automação
   * @param {string} userId - ID do usuário criando a automação
   * @returns {Promise<string>} ID da automação criada
   * @throws {Error} Se a criação falhar
   */
  async createAutomation(boardId, automationData, userId) {
    try {
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        boardId,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para criar automações neste quadro');
      }
      
      // Verificar se automações estão habilitadas
      if (!this.automationEnabled) {
        throw new Error('Automações estão desabilitadas no sistema');
      }
      
      // Sanitizar e validar dados da automação
      const sanitizedData = this.securityAgent.sanitizeInput(automationData, {
        type: 'object',
        required: ['name', 'trigger', 'action'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          trigger: { 
            type: 'object',
            required: ['event'],
            properties: {
              event: { type: 'string' },
              condition: { type: 'string' }
            }
          },
          action: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string' },
              targetColumn: { type: 'string' },
              position: { type: 'string' },
              labels: { type: 'array', items: { type: 'string' } },
              assignee: { type: 'string' }
            }
          }
        }
      });
      
      // Validar evento do gatilho
      const validEvents = ['card:created', 'card:updated', 'card:moved', 'deadline:approaching'];
      if (!validEvents.includes(sanitizedData.trigger.event)) {
        throw new Error(`Evento de gatilho inválido: ${sanitizedData.trigger.event}`);
      }
      
      // Validar tipo de ação
      const validActionTypes = ['move_card', 'add_label', 'remove_label', 'assign_user', 'notify'];
      if (!validActionTypes.includes(sanitizedData.action.type)) {
        throw new Error(`Tipo de ação inválido: ${sanitizedData.action.type}`);
      }
      
      // Inserir automação no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_automations',
        data: {
          board_id: boardId,
          name: sanitizedData.name,
          description: sanitizedData.description || '',
          trigger: sanitizedData.trigger,
          action: sanitizedData.action,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active'
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao criar automação no banco de dados');
      }
      
      // Usar Claude-TaskMaster para analisar e otimizar a automação
      this.analyzeAutomationWithTaskMaster(result.id);
      
      return result.id;
    } catch (error) {
      console.error('Erro ao criar automação Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Obtém métricas de um quadro Kanban
   * @param {string} boardId - ID do quadro
   * @param {string} metricType - Tipo de métrica (distribuição, tempo, fluxo)
   * @param {string} userId - ID do usuário solicitando as métricas
   * @returns {Promise<Object>} Objeto com as métricas solicitadas
   * @throws {Error} Se a obtenção falhar
   */
  async getBoardMetrics(boardId, metricType, userId) {
    try {
      // Validar permissões do usuário
      const canView = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        boardId,
        'read'
      );
      
      if (!canView) {
        throw new Error('Usuário não tem permissão para visualizar este quadro');
      }
      
      // Obter quadro
      const board = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        id: boardId
      });
      
      if (!board) {
        throw new Error('Quadro Kanban não encontrado');
      }
      
      // Obter colunas do quadro
      const columns = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        filters: {
          board_id: boardId
        },
        order: {
          order: 'asc'
        }
      });
      
      // Obter cartões do quadro
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        filters: {
          board_id: boardId
        }
      });
      
      // Calcular métricas com base no tipo solicitado
      let metrics;
      
      switch (metricType) {
        case 'distribution':
          metrics = this.calculateDistributionMetrics(board, columns, cards);
          break;
        case 'time':
          metrics = await this.calculateTimeMetrics(board, columns, cards);
          break;
        case 'flow':
          metrics = await this.calculateFlowMetrics(board, columns, cards);
          break;
        default:
          throw new Error(`Tipo de métrica desconhecido: ${metricType}`);
      }
      
      // Usar Claude-TaskMaster para analisar métricas e fornecer insights
      const insights = await this.getMetricsInsightsWithTaskMaster(boardId, metricType, metrics);
      
      return {
        ...metrics,
        insights
      };
    } catch (error) {
      console.error('Erro ao obter métricas do quadro Kanban:', error);
      throw error;
    }
  }
  
  /**
   * Sincroniza um quadro Kanban com um projeto
   * @param {string} boardId - ID do quadro
   * @param {string} projectId - ID do projeto
   * @param {Object} mappingConfig - Configuração de mapeamento entre colunas e estados
   * @param {string} userId - ID do usuário realizando a sincronização
   * @returns {Promise<Object>} Status da sincronização
   * @throws {Error} Se a sincronização falhar
   */
  async syncBoardWithProject(boardId, projectId, mappingConfig, userId) {
    try {
      // Validar permissões do usuário para o quadro
      const canUpdateBoard = await this.securityAgent.authorizeAccess(
        userId,
        'kanban_board',
        boardId,
        'update'
      );
      
      if (!canUpdateBoard) {
        throw new Error('Usuário não tem permissão para sincronizar este quadro');
      }
      
      // Validar permissões do usuário para o projeto
      const canUpdateProject = await this.securityAgent.authorizeAccess(
        userId,
        'project',
        projectId,
        'update'
      );
      
      if (!canUpdateProject) {
        throw new Error('Usuário não tem permissão para sincronizar com este projeto');
      }
      
      // Obter quadro
      const board = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        id: boardId
      });
      
      if (!board) {
        throw new Error('Quadro Kanban não encontrado');
      }
      
      // Obter projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
      
      // Validar configuração de mapeamento
      const sanitizedMapping = this.securityAgent.sanitizeInput(mappingConfig, {
        type: 'object',
        required: ['columnToStatus', 'statusToColumn'],
        properties: {
          columnToStatus: { type: 'object' },
          statusToColumn: { type: 'object' }
        }
      });
      
      // Atualizar configuração de sincronização no quadro
      await this.toolManager.executeTool('supabase:update', {
        table: 'kanban_boards',
        id: boardId,
        data: {
          project_id: projectId,
          sync_config: sanitizedMapping,
          updated_at: new Date().toISOString(),
          updated_by: userId
        }
      });
      
      // Sincronizar tarefas existentes do projeto para o quadro
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: projectId
        }
      });
      
      const syncResults = {
        tasksToCards: 0,
        cardsToTasks: 0,
        errors: []
      };
      
      // Criar cartões para tarefas que não têm cartão associado
      for (const task of tasks) {
        try {
          // Verificar se já existe um cartão para esta tarefa
          const existingCard = await this.toolManager.executeTool('supabase:query', {
            table: 'kanban_cards',
            filters: {
              board_id: boardId,
              task_id: task.id
            }
          });
          
          if (!existingCard || existingCard.length === 0) {
            // Determinar coluna com base no status da tarefa
            const columnId = sanitizedMapping.statusToColumn[task.status];
            
            if (!columnId) {
              throw new Error(`Não há mapeamento para o status da tarefa: ${task.status}`);
            }
            
            // Criar cartão para a tarefa
            await this.createCard(columnId, {
              title: task.title,
              description: task.description,
              priority: task.priority,
              assignee: task.assigned_to,
              dueDate: task.due_date,
              labels: task.tags,
              taskId: task.id
            }, userId);
            
            syncResults.tasksToCards++;
          }
        } catch (error) {
          console.error(`Erro ao sincronizar tarefa ${task.id}:`, error);
          syncResults.errors.push({
            type: 'task',
            id: task.id,
            error: error.message
          });
        }
      }
      
      // Sincronizar cartões existentes para tarefas
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        filters: {
          board_id: boardId,
          task_id: null
        }
      });
      
      for (const card of cards) {
        try {
          // Criar tarefa para o cartão
          const columnStatus = sanitizedMapping.columnToStatus[card.column_id];
          
          if (!columnStatus) {
            throw new Error(`Não há mapeamento para a coluna do cartão: ${card.column_id}`);
          }
          
          const taskId = await this.projectManagerAgent.createTask(projectId, {
            title: card.title,
            description: card.description,
            priority: card.priority,
            status: columnStatus,
            dueDate: card.due_date,
            tags: card.labels
          }, userId);
          
          // Atualizar cartão com referência à tarefa
          await this.updateCard(card.id, {
            taskId: taskId
          }, userId);
          
          // Se houver um responsável, atribuir a tarefa
          if (card.assignee) {
            await this.projectManagerAgent.assignTask(taskId, card.assignee, userId);
          }
          
          syncResults.cardsToTasks++;
        } catch (error) {
          console.error(`Erro ao sincronizar cartão ${card.id}:`, error);
          syncResults.errors.push({
            type: 'card',
            id: card.id,
            error: error.message
          });
        }
      }
      
      return {
        boardId,
        projectId,
        syncConfig: sanitizedMapping,
        results: syncResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao sincronizar quadro com projeto:', error);
      throw error;
    }
  }
  
  /**
   * Aplica um template a um novo quadro Kanban
   * @private
   * @param {Object} boardData - Dados do quadro
   * @param {string} template - Nome do template
   * @returns {Promise<Object>} Quadro com template aplicado
   */
  async applyBoardTemplate(boardData, template) {
    // Implementação para aplicar templates de quadro
    switch (template) {
      case 'basic':
        return {
          ...boardData,
          settings: {
            ...boardData.settings,
            cardColors: this.cardColorsEnabled,
            wipLimits: true,
            showDueDates: true
          }
        };
      case 'scrum':
        return {
          ...boardData,
          settings: {
            ...boardData.settings,
            cardColors: this.cardColorsEnabled,
            wipLimits: true,
            showDueDates: true,
            showStoryPoints: true,
            showSwimlanes: true
          }
        };
      case 'kanban':
        return {
          ...boardData,
          settings: {
            ...boardData.settings,
            cardColors: this.cardColorsEnabled,
            wipLimits: true,
            showDueDates: true,
            showCycleTime: true,
            showBlockers: true
          }
        };
      case 'custom':
        // Implementação para template personalizado
        return boardData;
      default:
        return boardData;
    }
  }
  
  /**
   * Cria colunas iniciais com base no template
   * @private
   * @param {string} boardId - ID do quadro
   * @param {string} template - Nome do template
   * @returns {Promise<void>}
   */
  async createInitialColumns(boardId, template) {
    const systemUserId = 'system';
    
    switch (template) {
      case 'basic':
        await this.createColumn(boardId, {
          name: 'A Fazer',
          order: 0,
          wipLimit: 0,
          color: '#f5f5f5'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Em Progresso',
          order: 1,
          wipLimit: this.defaultWipLimit,
          color: '#e6f7ff'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Concluído',
          order: 2,
          wipLimit: 0,
          color: '#f6ffed'
        }, systemUserId);
        break;
        
      case 'scrum':
        await this.createColumn(boardId, {
          name: 'Backlog',
          order: 0,
          wipLimit: 0,
          color: '#f5f5f5'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Sprint Backlog',
          order: 1,
          wipLimit: 0,
          color: '#fff7e6'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Em Desenvolvimento',
          order: 2,
          wipLimit: this.defaultWipLimit,
          color: '#e6f7ff'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Em Revisão',
          order: 3,
          wipLimit: Math.floor(this.defaultWipLimit / 2),
          color: '#f9f0ff'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Pronto',
          order: 4,
          wipLimit: 0,
          color: '#f6ffed'
        }, systemUserId);
        break;
        
      case 'kanban':
        await this.createColumn(boardId, {
          name: 'Backlog',
          order: 0,
          wipLimit: 0,
          color: '#f5f5f5'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Pronto para Iniciar',
          order: 1,
          wipLimit: Math.floor(this.defaultWipLimit * 1.5),
          color: '#fff7e6'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Em Desenvolvimento',
          order: 2,
          wipLimit: this.defaultWipLimit,
          color: '#e6f7ff'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Em Teste',
          order: 3,
          wipLimit: Math.floor(this.defaultWipLimit / 2),
          color: '#f9f0ff'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Pronto para Entrega',
          order: 4,
          wipLimit: Math.floor(this.defaultWipLimit / 2),
          color: '#fcffe6'
        }, systemUserId);
        
        await this.createColumn(boardId, {
          name: 'Entregue',
          order: 5,
          wipLimit: 0,
          color: '#f6ffed'
        }, systemUserId);
        break;
        
      default:
        // Sem colunas iniciais para template personalizado
        break;
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
   * Verifica se o limite WIP foi excedido para uma coluna
   * @private
   * @param {string} columnId - ID da coluna
   * @param {number} wipLimit - Limite WIP
   * @returns {Promise<boolean>} Indica se o limite foi excedido
   */
  async checkWipLimitExceeded(columnId, wipLimit) {
    try {
      // Obter cartões na coluna
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        filters: {
          column_id: columnId
        }
      });
      
      if (!cards) {
        return false;
      }
      
      // Verificar se o número de cartões excede o limite
      const exceeded = cards.length > wipLimit;
      
      if (exceeded) {
        // Obter coluna e quadro
        const column = await this.toolManager.executeTool('supabase:query', {
          table: 'kanban_columns',
          id: columnId
        });
        
        if (!column) {
          return false;
        }
        
        // Emitir evento de limite WIP excedido
        this.toolManager.emit('wip_limit:exceeded', {
          column: column,
          board: column.board_id,
          currentCount: cards.length,
          wipLimit: wipLimit,
          timestamp: new Date().toISOString()
        });
        
        // Usar Claude-TaskMaster para analisar e sugerir ações
        this.analyzeWipLimitExceeded(columnId, cards.length, wipLimit);
      }
      
      return exceeded;
    } catch (error) {
      console.error('Erro ao verificar limite WIP:', error);
      return false;
    }
  }
  
  /**
   * Sincroniza um cartão com uma tarefa
   * @private
   * @param {string} cardId - ID do cartão
   * @param {string} taskId - ID da tarefa
   * @param {Object} changes - Alterações no cartão (opcional)
   * @returns {Promise<void>}
   */
  async syncCardWithTask(cardId, taskId, changes = null) {
    try {
      // Obter cartão
      const card = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        id: cardId
      });
      
      if (!card) {
        throw new Error('Cartão não encontrado');
      }
      
      // Obter tarefa
      const task = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        id: taskId
      });
      
      if (!task) {
        throw new Error('Tarefa não encontrada');
      }
      
      // Se não houver alterações específicas, sincronizar tudo
      if (!changes) {
        // Atualizar tarefa com informações do cartão
        await this.projectManagerAgent.updateTask(taskId, {
          title: card.title,
          description: card.description,
          priority: card.priority,
          dueDate: card.due_date,
          tags: card.labels
        }, 'system');
        
        // Se houver um responsável, atribuir a tarefa
        if (card.assignee) {
          await this.projectManagerAgent.assignTask(taskId, card.assignee, 'system');
        }
      } else {
        // Atualizar apenas os campos alterados
        const taskUpdates = {};
        
        if (changes.title) {
          taskUpdates.title = changes.title.new;
        }
        
        if (changes.description) {
          taskUpdates.description = changes.description.new;
        }
        
        if (changes.priority) {
          taskUpdates.priority = changes.priority.new;
        }
        
        if (changes.due_date) {
          taskUpdates.dueDate = changes.due_date.new;
        }
        
        if (changes.labels) {
          taskUpdates.tags = changes.labels.new;
        }
        
        if (Object.keys(taskUpdates).length > 0) {
          await this.projectManagerAgent.updateTask(taskId, taskUpdates, 'system');
        }
        
        // Atualizar responsável se alterado
        if (changes.assignee) {
          await this.projectManagerAgent.assignTask(taskId, changes.assignee.new, 'system');
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar cartão com tarefa:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Atualiza o status de uma tarefa com base na movimentação de um cartão
   * @private
   * @param {string} taskId - ID da tarefa
   * @param {Object} sourceColumn - Coluna de origem
   * @param {Object} targetColumn - Coluna de destino
   * @returns {Promise<void>}
   */
  async updateTaskStatusFromCardMove(taskId, sourceColumn, targetColumn) {
    try {
      // Obter quadro para verificar configuração de sincronização
      const board = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        id: targetColumn.board_id
      });
      
      if (!board || !board.sync_config || !board.sync_config.columnToStatus) {
        return;
      }
      
      // Obter mapeamento de coluna para status
      const statusMapping = board.sync_config.columnToStatus[targetColumn.id];
      
      if (!statusMapping) {
        return;
      }
      
      // Atualizar status da tarefa
      await this.projectManagerAgent.updateTask(taskId, {
        status: statusMapping
      }, 'system');
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Processa automações para um cartão
   * @private
   * @param {Object} card - Cartão
   * @param {string} event - Evento ocorrido (created, updated, moved)
   * @param {Object} context - Contexto adicional do evento
   * @returns {Promise<void>}
   */
  async processAutomationsForCard(card, event, context = {}) {
    try {
      // Obter automações do quadro
      const automations = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_automations',
        filters: {
          board_id: card.board_id,
          status: 'active'
        }
      });
      
      if (!automations || automations.length === 0) {
        return;
      }
      
      // Filtrar automações pelo evento
      const matchingAutomations = automations.filter(
        automation => automation.trigger.event === `card:${event}`
      );
      
      if (matchingAutomations.length === 0) {
        return;
      }
      
      // Processar cada automação
      for (const automation of matchingAutomations) {
        try {
          // Verificar condição
          if (automation.trigger.condition) {
            // Criar contexto de avaliação
            const evalContext = {
              card,
              event,
              context,
              // Funções auxiliares seguras
              includes: (arr, item) => Array.isArray(arr) && arr.includes(item),
              match: (str, pattern) => typeof str === 'string' && new RegExp(pattern).test(str)
            };
            
            // Avaliar condição de forma segura
            const conditionMet = this.evaluateCondition(
              automation.trigger.condition,
              evalContext
            );
            
            if (!conditionMet) {
              continue;
            }
          }
          
          // Executar ação
          await this.executeAutomationAction(automation.action, card, context);
          
          // Emitir evento de automação executada
          this.toolManager.emit('automation:triggered', {
            automation: automation,
            card: card,
            board: card.board_id,
            trigger: {
              event,
              context
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Erro ao processar automação ${automation.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Erro ao processar automações para cartão:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Avalia uma condição de automação de forma segura
   * @private
   * @param {string} condition - Condição a ser avaliada
   * @param {Object} context - Contexto para avaliação
   * @returns {boolean} Resultado da avaliação
   */
  evaluateCondition(condition, context) {
    try {
      // Lista de operadores permitidos
      const allowedOperators = [
        '===', '!==', '==', '!=', '>=', '<=', '>', '<',
        '&&', '||', '!', '+', '-', '*', '/', '%',
        'includes', 'match'
      ];
      
      // Verificar se a condição contém apenas operadores permitidos
      const containsDisallowedOperator = !allowedOperators.some(op => condition.includes(op));
      
      if (containsDisallowedOperator) {
        throw new Error('Condição contém operadores não permitidos');
      }
      
      // Avaliar condição com contexto limitado
      const result = new Function(...Object.keys(context), `return ${condition}`)(...Object.values(context));
      
      return Boolean(result);
    } catch (error) {
      console.error('Erro ao avaliar condição:', error);
      return false;
    }
  }
  
  /**
   * Executa uma ação de automação
   * @private
   * @param {Object} action - Ação a ser executada
   * @param {Object} card - Cartão alvo
   * @param {Object} context - Contexto adicional
   * @returns {Promise<void>}
   */
  async executeAutomationAction(action, card, context) {
    try {
      switch (action.type) {
        case 'move_card':
          if (!action.targetColumn) {
            throw new Error('Coluna de destino não especificada');
          }
          
          let position;
          if (action.position === 'top') {
            position = 0;
          } else if (action.position === 'bottom') {
            // Obter posição máxima na coluna de destino
            const cards = await this.toolManager.executeTool('supabase:query', {
              table: 'kanban_cards',
              filters: {
                column_id: action.targetColumn
              },
              order: {
                position: 'desc'
              },
              limit: 1
            });
            
            position = cards && cards.length > 0 ? cards[0].position + 1 : 0;
          } else if (typeof action.position === 'number') {
            position = action.position;
          }
          
          await this.moveCard(card.id, action.targetColumn, position, 'system');
          break;
          
        case 'add_label':
          if (!action.labels || !Array.isArray(action.labels)) {
            throw new Error('Etiquetas não especificadas');
          }
          
          const currentLabels = card.labels || [];
          const newLabels = [...new Set([...currentLabels, ...action.labels])];
          
          await this.updateCard(card.id, {
            labels: newLabels
          }, 'system');
          break;
          
        case 'remove_label':
          if (!action.labels || !Array.isArray(action.labels)) {
            throw new Error('Etiquetas não especificadas');
          }
          
          const labels = card.labels || [];
          const filteredLabels = labels.filter(label => !action.labels.includes(label));
          
          await this.updateCard(card.id, {
            labels: filteredLabels
          }, 'system');
          break;
          
        case 'assign_user':
          if (!action.assignee) {
            throw new Error('Responsável não especificado');
          }
          
          await this.updateCard(card.id, {
            assignee: action.assignee
          }, 'system');
          break;
          
        case 'notify':
          if (!action.recipients || !Array.isArray(action.recipients)) {
            throw new Error('Destinatários não especificados');
          }
          
          await this.toolManager.executeTool('notification:send', {
            type: 'automation_notification',
            recipients: action.recipients,
            data: {
              cardId: card.id,
              cardTitle: card.title,
              boardId: card.board_id,
              message: action.message || 'Notificação automática do quadro Kanban'
            }
          });
          break;
          
        default:
          throw new Error(`Tipo de ação desconhecido: ${action.type}`);
      }
    } catch (error) {
      console.error('Erro ao executar ação de automação:', error);
      throw error;
    }
  }
  
  /**
   * Calcula métricas de distribuição para um quadro Kanban
   * @private
   * @param {Object} board - Quadro
   * @param {Array} columns - Colunas do quadro
   * @param {Array} cards - Cartões do quadro
   * @returns {Object} Métricas de distribuição
   */
  calculateDistributionMetrics(board, columns, cards) {
    // Calcular total de cartões
    const totalCards = cards.length;
    
    // Calcular distribuição por coluna
    const byColumn = {};
    columns.forEach(column => {
      const columnCards = cards.filter(card => card.column_id === column.id);
      byColumn[column.id] = {
        name: column.name,
        count: columnCards.length,
        percentage: totalCards > 0 ? Math.round((columnCards.length / totalCards) * 100) : 0
      };
    });
    
    // Calcular distribuição por responsável
    const byAssignee = {};
    const assignees = [...new Set(cards.filter(card => card.assignee).map(card => card.assignee))];
    
    assignees.forEach(assignee => {
      const assigneeCards = cards.filter(card => card.assignee === assignee);
      byAssignee[assignee] = {
        count: assigneeCards.length,
        percentage: totalCards > 0 ? Math.round((assigneeCards.length / totalCards) * 100) : 0
      };
    });
    
    // Calcular distribuição por prioridade
    const byPriority = {
      urgent: {
        count: cards.filter(card => card.priority === 'urgent').length,
        percentage: 0
      },
      high: {
        count: cards.filter(card => card.priority === 'high').length,
        percentage: 0
      },
      medium: {
        count: cards.filter(card => card.priority === 'medium').length,
        percentage: 0
      },
      low: {
        count: cards.filter(card => card.priority === 'low').length,
        percentage: 0
      }
    };
    
    if (totalCards > 0) {
      Object.keys(byPriority).forEach(priority => {
        byPriority[priority].percentage = Math.round((byPriority[priority].count / totalCards) * 100);
      });
    }
    
    // Calcular distribuição por etiqueta
    const byLabel = {};
    const allLabels = new Set();
    
    cards.forEach(card => {
      if (card.labels && Array.isArray(card.labels)) {
        card.labels.forEach(label => allLabels.add(label));
      }
    });
    
    allLabels.forEach(label => {
      const labelCards = cards.filter(card => 
        card.labels && Array.isArray(card.labels) && card.labels.includes(label)
      );
      
      byLabel[label] = {
        count: labelCards.length,
        percentage: totalCards > 0 ? Math.round((labelCards.length / totalCards) * 100) : 0
      };
    });
    
    return {
      boardId: board.id,
      boardName: board.name,
      totalCards,
      byColumn,
      byAssignee,
      byPriority,
      byLabel,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Calcula métricas de tempo para um quadro Kanban
   * @private
   * @param {Object} board - Quadro
   * @param {Array} columns - Colunas do quadro
   * @param {Array} cards - Cartões do quadro
   * @returns {Promise<Object>} Métricas de tempo
   */
  async calculateTimeMetrics(board, columns, cards) {
    try {
      // Obter histórico de movimentação de cartões
      const cardHistory = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_card_history',
        filters: {
          board_id: board.id,
          event: 'card:moved'
        },
        order: {
          timestamp: 'asc'
        }
      });
      
      // Calcular lead time (tempo total desde a criação até a conclusão)
      const leadTimes = [];
      const cycleTimes = {};
      const columnTimes = {};
      
      // Inicializar tempos por coluna
      columns.forEach(column => {
        columnTimes[column.id] = {
          name: column.name,
          totalTime: 0,
          cardCount: 0,
          averageTime: 0
        };
      });
      
      // Calcular tempos para cartões concluídos
      const doneColumnIds = columns
        .filter(column => ['Concluído', 'Pronto', 'Entregue', 'Done'].includes(column.name))
        .map(column => column.id);
      
      const completedCards = cards.filter(card => doneColumnIds.includes(card.column_id));
      
      for (const card of completedCards) {
        // Obter histórico do cartão
        const cardMoves = cardHistory.filter(history => history.card_id === card.id);
        
        if (cardMoves.length === 0) {
          continue;
        }
        
        // Calcular lead time (desde a criação até a conclusão)
        const createdAt = new Date(card.created_at);
        const completedAt = new Date(
          cardMoves.find(move => doneColumnIds.includes(move.target_column_id))?.timestamp ||
          card.updated_at
        );
        
        const leadTimeHours = Math.round((completedAt - createdAt) / (1000 * 60 * 60));
        
        if (leadTimeHours >= 0) {
          leadTimes.push({
            cardId: card.id,
            cardTitle: card.title,
            leadTimeHours
          });
        }
        
        // Calcular cycle time (tempo em cada coluna)
        let previousMove = { timestamp: card.created_at, target_column_id: cardMoves[0].source_column_id };
        
        for (const move of cardMoves) {
          const startTime = new Date(previousMove.timestamp);
          const endTime = new Date(move.timestamp);
          const columnId = previousMove.target_column_id;
          const timeInColumnHours = Math.round((endTime - startTime) / (1000 * 60 * 60));
          
          if (timeInColumnHours >= 0 && columnId) {
            // Adicionar ao tempo total da coluna
            if (columnTimes[columnId]) {
              columnTimes[columnId].totalTime += timeInColumnHours;
              columnTimes[columnId].cardCount++;
            }
            
            // Registrar tempo para este cartão
            if (!cycleTimes[card.id]) {
              cycleTimes[card.id] = {
                cardTitle: card.title,
                columnTimes: {}
              };
            }
            
            const columnName = columns.find(col => col.id === columnId)?.name || columnId;
            
            cycleTimes[card.id].columnTimes[columnName] = timeInColumnHours;
          }
          
          previousMove = move;
        }
        
        // Adicionar tempo na coluna atual (se não for a última movimentação)
        const lastMove = cardMoves[cardMoves.length - 1];
        const startTime = new Date(lastMove.timestamp);
        const endTime = new Date();
        const columnId = lastMove.target_column_id;
        const timeInColumnHours = Math.round((endTime - startTime) / (1000 * 60 * 60));
        
        if (timeInColumnHours >= 0 && columnId) {
          // Adicionar ao tempo total da coluna
          if (columnTimes[columnId]) {
            columnTimes[columnId].totalTime += timeInColumnHours;
            columnTimes[columnId].cardCount++;
          }
          
          // Registrar tempo para este cartão
          if (!cycleTimes[card.id]) {
            cycleTimes[card.id] = {
              cardTitle: card.title,
              columnTimes: {}
            };
          }
          
          const columnName = columns.find(col => col.id === columnId)?.name || columnId;
          
          cycleTimes[card.id].columnTimes[columnName] = timeInColumnHours;
        }
      }
      
      // Calcular médias
      const averageLeadTime = leadTimes.length > 0
        ? Math.round(leadTimes.reduce((sum, item) => sum + item.leadTimeHours, 0) / leadTimes.length)
        : 0;
      
      // Calcular tempo médio por coluna
      Object.keys(columnTimes).forEach(columnId => {
        const column = columnTimes[columnId];
        column.averageTime = column.cardCount > 0
          ? Math.round(column.totalTime / column.cardCount)
          : 0;
      });
      
      return {
        boardId: board.id,
        boardName: board.name,
        leadTime: {
          average: averageLeadTime,
          min: leadTimes.length > 0 ? Math.min(...leadTimes.map(item => item.leadTimeHours)) : 0,
          max: leadTimes.length > 0 ? Math.max(...leadTimes.map(item => item.leadTimeHours)) : 0,
          cards: leadTimes
        },
        columnTimes,
        cycleTimes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de tempo:', error);
      throw error;
    }
  }
  
  /**
   * Calcula métricas de fluxo para um quadro Kanban
   * @private
   * @param {Object} board - Quadro
   * @param {Array} columns - Colunas do quadro
   * @param {Array} cards - Cartões do quadro
   * @returns {Promise<Object>} Métricas de fluxo
   */
  async calculateFlowMetrics(board, columns, cards) {
    try {
      // Obter histórico de movimentação de cartões
      const cardHistory = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_card_history',
        filters: {
          board_id: board.id
        },
        order: {
          timestamp: 'asc'
        }
      });
      
      // Agrupar eventos por dia
      const eventsByDay = {};
      
      cardHistory.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        
        if (!eventsByDay[date]) {
          eventsByDay[date] = {
            created: 0,
            moved: 0,
            completed: 0
          };
        }
        
        if (event.event === 'card:created') {
          eventsByDay[date].created++;
        } else if (event.event === 'card:moved') {
          eventsByDay[date].moved++;
          
          // Verificar se o cartão foi movido para uma coluna de conclusão
          const doneColumnIds = columns
            .filter(column => ['Concluído', 'Pronto', 'Entregue', 'Done'].includes(column.name))
            .map(column => column.id);
          
          if (doneColumnIds.includes(event.target_column_id)) {
            eventsByDay[date].completed++;
          }
        }
      });
      
      // Calcular métricas de fluxo cumulativo
      const cumulativeFlow = [];
      let cumulativeCreated = 0;
      let cumulativeCompleted = 0;
      
      // Ordenar datas
      const dates = Object.keys(eventsByDay).sort();
      
      dates.forEach(date => {
        cumulativeCreated += eventsByDay[date].created;
        cumulativeCompleted += eventsByDay[date].completed;
        
        cumulativeFlow.push({
          date,
          created: cumulativeCreated,
          completed: cumulativeCompleted,
          inProgress: cumulativeCreated - cumulativeCompleted
        });
      });
      
      // Calcular throughput (cartões concluídos por período)
      const throughput = {};
      
      // Throughput diário
      dates.forEach(date => {
        throughput[date] = eventsByDay[date].completed;
      });
      
      // Throughput semanal
      const weeklyThroughput = {};
      
      dates.forEach(date => {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const weekNumber = this.getWeekNumber(dateObj);
        const weekKey = `${year}-W${weekNumber}`;
        
        if (!weeklyThroughput[weekKey]) {
          weeklyThroughput[weekKey] = 0;
        }
        
        weeklyThroughput[weekKey] += eventsByDay[date].completed;
      });
      
      // Calcular WIP ao longo do tempo
      const wipOverTime = cumulativeFlow.map(day => ({
        date: day.date,
        wip: day.inProgress
      }));
      
      // Calcular gargalos (colunas com maior tempo médio)
      const columnTimesArray = await Promise.all(columns.map(async column => {
        const columnCards = cards.filter(card => card.column_id === column.id);
        
        // Calcular tempo médio na coluna
        let totalTime = 0;
        let cardCount = 0;
        
        for (const card of columnCards) {
          const cardMoves = cardHistory.filter(
            history => history.event === 'card:moved' && 
            (history.target_column_id === column.id || history.source_column_id === column.id)
          );
          
          // Encontrar quando o cartão entrou na coluna
          const entryMove = cardMoves.find(move => move.target_column_id === column.id);
          
          if (entryMove) {
            const entryTime = new Date(entryMove.timestamp);
            const now = new Date();
            const timeInColumnHours = Math.round((now - entryTime) / (1000 * 60 * 60));
            
            if (timeInColumnHours >= 0) {
              totalTime += timeInColumnHours;
              cardCount++;
            }
          }
        }
        
        const averageTime = cardCount > 0 ? Math.round(totalTime / cardCount) : 0;
        
        return {
          columnId: column.id,
          columnName: column.name,
          cardCount: columnCards.length,
          averageTimeHours: averageTime
        };
      }));
      
      // Identificar gargalos (colunas com maior tempo médio)
      const bottlenecks = columnTimesArray
        .filter(column => column.cardCount > 0)
        .sort((a, b) => b.averageTimeHours - a.averageTimeHours);
      
      return {
        boardId: board.id,
        boardName: board.name,
        cumulativeFlow,
        throughput: {
          daily: throughput,
          weekly: weeklyThroughput
        },
        wipOverTime,
        bottlenecks: bottlenecks.slice(0, 3), // Top 3 gargalos
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de fluxo:', error);
      throw error;
    }
  }
  
  /**
   * Obtém o número da semana para uma data
   * @private
   * @param {Date} date - Data
   * @returns {number} Número da semana
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  /**
   * Analisa um projeto para configuração de quadro Kanban usando Claude-TaskMaster
   * @private
   * @param {string} projectId - ID do projeto
   * @param {string} boardId - ID do quadro
   * @returns {Promise<void>}
   */
  async analyzeProjectForKanban(projectId, boardId) {
    try {
      // Obter projeto
      const project = await this.toolManager.executeTool('supabase:query', {
        table: 'projects',
        id: projectId
      });
      
      if (!project) {
        return;
      }
      
      // Obter tarefas do projeto
      const tasks = await this.toolManager.executeTool('supabase:query', {
        table: 'tasks',
        filters: {
          project_id: projectId
        }
      });
      
      if (!tasks || tasks.length === 0) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar o projeto e sugerir configuração de quadro
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'project_kanban_setup',
        data: {
          project,
          tasks,
          boardId
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Aplicar sugestões se houver
      if (analysis.suggestions.columns) {
        // Verificar se já existem colunas
        const existingColumns = await this.toolManager.executeTool('supabase:query', {
          table: 'kanban_columns',
          filters: {
            board_id: boardId
          }
        });
        
        // Só criar colunas sugeridas se não houver colunas existentes
        if (!existingColumns || existingColumns.length === 0) {
          for (const column of analysis.suggestions.columns) {
            await this.createColumn(boardId, {
              name: column.name,
              order: column.order,
              wipLimit: column.wipLimit,
              color: column.color
            }, 'system');
          }
        }
      }
      
      // Aplicar sugestões de automação
      if (analysis.suggestions.automations) {
        for (const automation of analysis.suggestions.automations) {
          await this.createAutomation(boardId, automation, 'system');
        }
      }
    } catch (error) {
      console.error('Erro ao analisar projeto para Kanban:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Analisa a estrutura de colunas de um quadro usando Claude-TaskMaster
   * @private
   * @param {string} boardId - ID do quadro
   * @returns {Promise<void>}
   */
  async analyzeColumnStructure(boardId) {
    try {
      // Obter quadro
      const board = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        id: boardId
      });
      
      if (!board) {
        return;
      }
      
      // Obter colunas do quadro
      const columns = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        filters: {
          board_id: boardId
        },
        order: {
          order: 'asc'
        }
      });
      
      if (!columns || columns.length === 0) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar a estrutura de colunas
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_column_structure',
        data: {
          board,
          columns
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Armazenar sugestões para referência futura
      await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_suggestions',
        data: {
          board_id: boardId,
          type: 'column_structure',
          suggestions: analysis.suggestions,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao analisar estrutura de colunas:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Analisa um cartão usando Claude-TaskMaster
   * @private
   * @param {string} cardId - ID do cartão
   * @returns {Promise<void>}
   */
  async analyzeCardWithTaskMaster(cardId) {
    try {
      // Obter cartão
      const card = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        id: cardId
      });
      
      if (!card) {
        return;
      }
      
      // Obter coluna do cartão
      const column = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: card.column_id
      });
      
      if (!column) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar o cartão
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_card',
        data: {
          card,
          column
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Aplicar sugestões se houver
      if (analysis.suggestions.labels && analysis.suggestions.labels.length > 0) {
        const currentLabels = card.labels || [];
        const suggestedLabels = analysis.suggestions.labels.filter(
          label => !currentLabels.includes(label)
        );
        
        if (suggestedLabels.length > 0) {
          const newLabels = [...currentLabels, ...suggestedLabels];
          
          await this.updateCard(cardId, {
            labels: newLabels
          }, 'system');
        }
      }
      
      // Armazenar outras sugestões para referência futura
      await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_suggestions',
        data: {
          board_id: card.board_id,
          card_id: cardId,
          type: 'card_improvement',
          suggestions: analysis.suggestions,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao analisar cartão com TaskMaster:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Analisa a movimentação de um cartão usando Claude-TaskMaster
   * @private
   * @param {string} cardId - ID do cartão
   * @param {string} sourceColumnId - ID da coluna de origem
   * @param {string} targetColumnId - ID da coluna de destino
   * @returns {Promise<void>}
   */
  async analyzeCardMovementWithTaskMaster(cardId, sourceColumnId, targetColumnId) {
    try {
      // Obter cartão
      const card = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        id: cardId
      });
      
      if (!card) {
        return;
      }
      
      // Obter colunas
      const sourceColumn = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: sourceColumnId
      });
      
      const targetColumn = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: targetColumnId
      });
      
      if (!sourceColumn || !targetColumn) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar a movimentação
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_card_movement',
        data: {
          card,
          sourceColumn,
          targetColumn
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Armazenar sugestões para referência futura
      await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_suggestions',
        data: {
          board_id: card.board_id,
          card_id: cardId,
          type: 'card_movement',
          suggestions: analysis.suggestions,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao analisar movimentação de cartão com TaskMaster:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Analisa uma automação usando Claude-TaskMaster
   * @private
   * @param {string} automationId - ID da automação
   * @returns {Promise<void>}
   */
  async analyzeAutomationWithTaskMaster(automationId) {
    try {
      // Obter automação
      const automation = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_automations',
        id: automationId
      });
      
      if (!automation) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar a automação
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_automation',
        data: {
          automation
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Armazenar sugestões para referência futura
      await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_suggestions',
        data: {
          board_id: automation.board_id,
          automation_id: automationId,
          type: 'automation_improvement',
          suggestions: analysis.suggestions,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao analisar automação com TaskMaster:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Analisa um limite WIP excedido usando Claude-TaskMaster
   * @private
   * @param {string} columnId - ID da coluna
   * @param {number} currentCount - Contagem atual de cartões
   * @param {number} wipLimit - Limite WIP
   * @returns {Promise<void>}
   */
  async analyzeWipLimitExceeded(columnId, currentCount, wipLimit) {
    try {
      // Obter coluna
      const column = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_columns',
        id: columnId
      });
      
      if (!column) {
        return;
      }
      
      // Obter cartões na coluna
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        filters: {
          column_id: columnId
        }
      });
      
      if (!cards) {
        return;
      }
      
      // Usar Claude-TaskMaster para analisar o limite WIP excedido
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_wip_limit_exceeded',
        data: {
          column,
          cards,
          currentCount,
          wipLimit
        }
      });
      
      if (!analysis || !analysis.suggestions) {
        return;
      }
      
      // Armazenar sugestões para referência futura
      await this.toolManager.executeTool('supabase:insert', {
        table: 'kanban_suggestions',
        data: {
          board_id: column.board_id,
          column_id: columnId,
          type: 'wip_limit_exceeded',
          suggestions: analysis.suggestions,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao analisar limite WIP excedido com TaskMaster:', error);
      // Não propagar erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Obtém insights sobre métricas usando Claude-TaskMaster
   * @private
   * @param {string} boardId - ID do quadro
   * @param {string} metricType - Tipo de métrica
   * @param {Object} metrics - Métricas calculadas
   * @returns {Promise<Array>} Insights sobre as métricas
   */
  async getMetricsInsightsWithTaskMaster(boardId, metricType, metrics) {
    try {
      // Usar Claude-TaskMaster para analisar métricas e fornecer insights
      const analysis = await this.toolManager.executeTool('claude-task-master:analyze', {
        type: 'kanban_metrics',
        data: {
          boardId,
          metricType,
          metrics
        }
      });
      
      if (!analysis || !analysis.insights) {
        return [];
      }
      
      return analysis.insights;
    } catch (error) {
      console.error('Erro ao obter insights sobre métricas com TaskMaster:', error);
      return [];
    }
  }
  
  /**
   * Handler para eventos de criação de quadro
   * @private
   * @param {Object} data - Dados do evento
   */
  handleBoardCreated(data) {
    console.log('Quadro Kanban criado:', data.board.name);
    
    // Implementação do handler para eventos de criação de quadro
    // Pode incluir lógica para configuração inicial, notificações, etc.
  }
  
  /**
   * Handler para eventos de atualização de quadro
   * @private
   * @param {Object} data - Dados do evento
   */
  handleBoardUpdated(data) {
    console.log('Quadro Kanban atualizado:', data.board.name);
    
    // Implementação do handler para eventos de atualização de quadro
    // Pode incluir lógica para notificar sobre alterações importantes, etc.
  }
  
  /**
   * Handler para eventos de criação de coluna
   * @private
   * @param {Object} data - Dados do evento
   */
  handleColumnCreated(data) {
    console.log('Coluna Kanban criada:', data.column.name);
    
    // Implementação do handler para eventos de criação de coluna
    // Pode incluir lógica para configuração inicial, etc.
  }
  
  /**
   * Handler para eventos de atualização de coluna
   * @private
   * @param {Object} data - Dados do evento
   */
  handleColumnUpdated(data) {
    console.log('Coluna Kanban atualizada:', data.column.name);
    
    // Implementação do handler para eventos de atualização de coluna
    // Pode incluir lógica para verificar alterações de limite WIP, etc.
  }
  
  /**
   * Handler para eventos de criação de cartão
   * @private
   * @param {Object} data - Dados do evento
   */
  handleCardCreated(data) {
    console.log('Cartão Kanban criado:', data.card.title);
    
    // Implementação do handler para eventos de criação de cartão
    // Pode incluir lógica para notificar responsáveis, etc.
  }
  
  /**
   * Handler para eventos de atualização de cartão
   * @private
   * @param {Object} data - Dados do evento
   */
  handleCardUpdated(data) {
    console.log('Cartão Kanban atualizado:', data.card.title);
    
    // Implementação do handler para eventos de atualização de cartão
    // Pode incluir lógica para notificar sobre alterações importantes, etc.
  }
  
  /**
   * Handler para eventos de movimentação de cartão
   * @private
   * @param {Object} data - Dados do evento
   */
  handleCardMoved(data) {
    console.log('Cartão Kanban movido:', data.card.title);
    
    // Implementação do handler para eventos de movimentação de cartão
    // Pode incluir lógica para atualizar status de tarefas, etc.
  }
  
  /**
   * Handler para eventos de automação executada
   * @private
   * @param {Object} data - Dados do evento
   */
  handleAutomationTriggered(data) {
    console.log('Automação Kanban executada:', data.automation.name);
    
    // Implementação do handler para eventos de automação executada
    // Pode incluir lógica para registrar histórico, etc.
  }
  
  /**
   * Handler para eventos de atualização de projeto
   * @private
   * @param {Object} data - Dados do evento
   */
  handleProjectUpdated(data) {
    console.log('Projeto atualizado:', data.project.name);
    
    // Implementação do handler para eventos de atualização de projeto
    // Pode incluir lógica para sincronizar quadros Kanban, etc.
  }
  
  /**
   * Handler para eventos de atualização de tarefa
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskUpdated(data) {
    console.log('Tarefa atualizada:', data.task.title);
    
    // Implementação do handler para eventos de atualização de tarefa
    // Pode incluir lógica para sincronizar cartões Kanban, etc.
  }
  /**
   * Cria um cartão a partir de uma tarefa do TaskMaster
   * @param {Object} task - Tarefa do TaskMaster
   * @param {string} boardId - ID do quadro Kanban
   * @returns {Promise<Object>} Cartão criado
   */
  async createCardFromTaskMasterTask(task, boardId) {
    try {
      // Determinar a coluna com base no status da tarefa
      const columnName = this.statusToColumnMap[task.status] || 'A fazer';
      
      // Buscar a coluna pelo nome
      const column = await this.getColumnByName(boardId, columnName);
      
      if (!column) {
        throw new Error(`Coluna '${columnName}' não encontrada no quadro ${boardId}`);
      }
      
      // Criar dados do cartão
      const cardData = {
        title: task.title,
        description: task.description,
        columnId: column.id,
        boardId: boardId,
        metadata: {
          taskId: task.id,
          taskPriority: task.priority,
          isTaskMasterCard: true
        }
      };
      
      // Criar o cartão no quadro
      return await this.createCard(cardData);
    } catch (error) {
      console.error('Erro ao criar cartão a partir de tarefa do TaskMaster:', error);
      throw new Error(`Falha ao criar cartão para tarefa ${task.id}: ${error.message}`);
    }
  }
  
  /**
   * Atualiza um cartão existente com base em uma tarefa do TaskMaster
   * @param {string} cardId - ID do cartão
   * @param {Object} task - Tarefa do TaskMaster atualizada
   * @returns {Promise<Object>} Cartão atualizado
   */
  async updateCardFromTaskMasterTask(cardId, task) {
    try {
      // Buscar informações do cartão atual
      const currentCard = await this.getCard(cardId);
      
      if (!currentCard) {
        throw new Error(`Cartão ${cardId} não encontrado`);
      }
      
      // Determinar a coluna com base no status da tarefa
      const columnName = this.statusToColumnMap[task.status] || 'A fazer';
      
      // Buscar a coluna pelo nome
      const column = await this.getColumnByName(currentCard.boardId, columnName);
      
      if (!column) {
        throw new Error(`Coluna '${columnName}' não encontrada no quadro ${currentCard.boardId}`);
      }
      
      // Dados atualizados do cartão
      const updatedCardData = {
        title: task.title,
        description: task.description,
        columnId: column.id,
        metadata: {
          ...currentCard.metadata,
          taskPriority: task.priority,
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Atualizar o cartão
      return await this.updateCard(cardId, updatedCardData);
    } catch (error) {
      console.error('Erro ao atualizar cartão com tarefa do TaskMaster:', error);
      throw new Error(`Falha ao atualizar cartão ${cardId} com tarefa ${task.id}: ${error.message}`);
    }
  }
  
  /**
   * Sincroniza o status de uma tarefa do TaskMaster com base na movimentação de um cartão
   * @param {string} cardId - ID do cartão movido
   * @param {string} newColumnId - ID da nova coluna
   * @returns {Promise<void>}
   */
  async syncTaskMasterTaskFromCardMove(cardId, newColumnId) {
    try {
      // Buscar detalhes do cartão
      const card = await this.getCard(cardId);
      
      // Verificar se é um cartão do TaskMaster
      if (!card.metadata || !card.metadata.isTaskMasterCard || !card.metadata.taskId) {
        // Não é um cartão do TaskMaster, ignorar
        return;
      }
      
      // Buscar informações da coluna
      const column = await this.getColumn(newColumnId);
      
      // Mapear o nome da coluna para o status do TaskMaster
      const statusMap = Object.entries(this.statusToColumnMap).reduce((acc, [status, colName]) => {
        acc[colName] = status;
        return acc;
      }, {});
      
      const newStatus = statusMap[column.name] || 'pending';
      
      // Atualizar o status da tarefa no TaskMaster
      await this.projectManagerAgent.updateTaskWithTaskMaster(
        card.metadata.taskId,
        { status: newStatus },
        'system'
      );
      
      console.log(`Status da tarefa ${card.metadata.taskId} atualizado para ${newStatus}`);
    } catch (error) {
      console.error('Erro ao sincronizar status da tarefa do TaskMaster:', error);
    }
  }
  
  /**
   * Busca uma coluna pelo nome no quadro especificado
   * @param {string} boardId - ID do quadro
   * @param {string} columnName - Nome da coluna a ser buscada
   * @returns {Promise<Object|null>} Coluna encontrada ou null
   * @private
   */
  async getColumnByName(boardId, columnName) {
    const columns = await this.toolManager.executeTool('supabase:query', {
      table: 'kanban_columns',
      query: {
        boardId,
        name: columnName
      }
    });
    
    return columns && columns.length > 0 ? columns[0] : null;
  }
  
  /**
   * Handler para evento de atualização de tarefa no TaskMaster
   * @param {Object} taskData - Dados da tarefa atualizada
   * @private
   */
  async handleTaskMasterTaskUpdated(taskData) {
    try {
      // Buscar cartões associados a esta tarefa
      const cards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_cards',
        query: {
          metadata: {
            taskId: taskData.id,
            isTaskMasterCard: true
          }
        }
      });
      
      if (cards && cards.length > 0) {
        // Atualizar cada cartão associado
        for (const card of cards) {
          await this.updateCardFromTaskMasterTask(card.id, taskData);
        }
        console.log(`${cards.length} cartões atualizados para a tarefa ${taskData.id}`);
      } else {
        console.log(`Nenhum cartão encontrado para a tarefa ${taskData.id}`);
      }
    } catch (error) {
      console.error('Erro ao processar atualização de tarefa do TaskMaster:', error);
    }
  }
  
  /**
   * Handler para evento de criação de tarefa no TaskMaster
   * @param {Object} taskData - Dados da tarefa criada
   * @private
   */
  async handleTaskMasterTaskCreated(taskData) {
    try {
      // Buscar quadros ativos para adicionar a tarefa
      const boards = await this.toolManager.executeTool('supabase:query', {
        table: 'kanban_boards',
        query: {
          status: 'active'
        }
      });
      
      if (boards && boards.length > 0) {
        // Adicionar a tarefa ao primeiro quadro ativo
        // (pode ser adaptado para adicionar a quadros específicos baseado em metadata da tarefa)
        const boardId = boards[0].id;
        await this.createCardFromTaskMasterTask(taskData, boardId);
        console.log(`Cartão criado no quadro ${boardId} para a tarefa ${taskData.id}`);
      } else {
        console.log('Nenhum quadro ativo encontrado para adicionar a tarefa');
      }
    } catch (error) {
      console.error('Erro ao processar criação de tarefa do TaskMaster:', error);
    }
  }
}

module.exports = { KanbanAgent };
