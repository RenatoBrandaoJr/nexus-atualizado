/**
 * BackendAgent - Responsável pela lógica de negócios e gerenciamento de API
 * 
 * Este agente implementa as regras definidas em backend_rules.md e gerencia:
 * - Processamento de requisições API
 * - Execução da lógica de negócios
 * - Orquestração de operações com outros agentes
 * - Integração com Supabase para persistência de dados
 * - Integração com TaskMaster para processamento inteligente
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';
import supabaseMCP from '../mcps/supabase_adapter.js';
import taskmasterMCP from '../mcps/taskmaster_claude_adapter.js';

class BackendAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('BackendAgent');
    this.metrics = createMetrics('BackendAgent');
    this.supabaseMCP = supabaseMCP;
    this.taskmasterMCP = taskmasterMCP;
    
    // Configurações do agente
    this.apiPrefix = process.env.API_PREFIX || "/api/v1";
    this.rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === "true";
    this.maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || "100", 10);
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || "30000", 10); // 30 segundos
    this.enableAuditing = process.env.ENABLE_AUDITING === "true";
    
    // Inicializar ferramentas
    this.initializeTools();
    
    console.log('BackendAgent inicializado com sucesso');
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    console.log("BackendAgent inicializado com sucesso");
  }
  
  /**
   * Inicializa as ferramentas utilizadas pelo agente
   */
  initializeTools() {
    // Ferramenta para processar requisições API
    this.toolManager.registerTool('backend:processRequest', async (params) => {
      this.logger.info('Processando requisição API', params);
      return await this.processRequest(params.path, params.method, params.data, params.options);
    });
    
    // Ferramenta para executar lógica de negócios
    this.toolManager.registerTool('backend:executeBusinessLogic', async (params) => {
      this.logger.info('Executando lógica de negócios', params);
      return await this.executeBusinessLogic(params.action, params.data, params.options);
    });
    
    // Ferramenta para integração com Supabase
    this.toolManager.registerTool('backend:supabaseOperation', async (params) => {
      this.logger.info('Executando operação no Supabase', params);
      return await this.supabaseOperation(params.operation, params.table, params.data, params.options);
    });
    
    // Ferramenta para processamento com TaskMaster
    this.toolManager.registerTool('backend:processWithTaskMaster', async (params) => {
      this.logger.info('Processando com TaskMaster', params);
      return await this.processWithTaskMaster(params.task, params.data, params.options);
    });
    // Ferramentas do Supabase para acesso ao banco de dados
    this.toolManager.registerTool("supabase:query");
    this.toolManager.registerTool("supabase:insert");
    this.toolManager.registerTool("supabase:update");
    this.toolManager.registerTool("supabase:delete");
    this.toolManager.registerTool("supabase:rpc"); // Para chamar funções do Supabase
    
    // Ferramentas do Claude-TaskMaster para processamento inteligente
    this.toolManager.registerTool("claude:taskmaster:analyze");
    this.toolManager.registerTool("claude:taskmaster:prioritize");
    this.toolManager.registerTool("claude:taskmaster:delegate");
    
    // Ferramentas para logging e monitoramento
    this.toolManager.registerTool("logger:log");
    this.toolManager.registerTool("monitor:metric");
  }
  
  /**
   * Registra handlers para eventos relevantes para o backend
   * @private
   */
  registerEventHandlers() {
    // Eventos de segurança
    this.toolManager.on("auth:success", this.handleAuthSuccess.bind(this));
    this.toolManager.on("auth:failure", this.handleAuthFailure.bind(this));
    
    // Eventos de projeto
    this.toolManager.on("project:created", this.handleProjectEvent.bind(this));
    this.toolManager.on("project:updated", this.handleProjectEvent.bind(this));
    
    // Eventos de tarefa
    this.toolManager.on("task:created", this.handleTaskEvent.bind(this));
    this.toolManager.on("task:updated", this.handleTaskEvent.bind(this));
    
    // Eventos de integração
    this.toolManager.on("integration:event", this.handleIntegrationEvent.bind(this));
  }
  
  /**
   * Processa uma requisição API genérica
   * @param {Object} request - Objeto da requisição (ex: Express request)
   * @param {Object} response - Objeto da resposta (ex: Express response)
   * @returns {Promise<void>}
   */
  async handleApiRequest(request, response) {
    const startTime = Date.now();
    const { method, path, body, query, headers, user } = request;
    const requestId = headers["x-request-id"] || `req-${Date.now()}`;
    
    try {
      // Log da requisição
      this.toolManager.executeTool("logger:log", {
        level: "info",
        message: `Requisição API recebida: ${method} ${path}`,
        requestId,
        userId: user ? user.id : null,
        ip: request.ip
      });
      
      // Autenticação e Autorização
      const authenticatedUser = await this.securityAgent.authenticateRequest(request);
      if (!authenticatedUser) {
        response.status(401).json({ error: "Não autorizado" });
        return;
      }
      
      // Rate Limiting (se habilitado)
      if (this.rateLimitEnabled) {
        const allowed = await this.checkRateLimit(authenticatedUser.id);
        if (!allowed) {
          response.status(429).json({ error: "Limite de requisições excedido" });
          return;
        }
      }
      
      // Roteamento da requisição para o handler apropriado
      const handler = this.routeRequest(method, path);
      
      if (!handler) {
        response.status(404).json({ error: "Endpoint não encontrado" });
        return;
      }
      
      // Executar handler com timeout
      const result = await Promise.race([
        handler.call(this, { ...request, user: authenticatedUser }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout da requisição")), this.requestTimeout)
        )
      ]);
      
      // Enviar resposta
      response.status(result.status || 200).json(result.body);
      
      // Log de sucesso
      this.toolManager.executeTool("logger:log", {
        level: "info",
        message: `Requisição API concluída: ${method} ${path} - Status ${result.status || 200}`,
        requestId,
        duration: Date.now() - startTime
      });
      
      // Registrar métrica
      this.toolManager.executeTool("monitor:metric", {
        name: "api_request_duration",
        value: Date.now() - startTime,
        tags: { method, path: this.normalizePath(path), status: result.status || 200 }
      });
      
    } catch (error) {
      console.error("Erro ao processar requisição API:", error);
      
      // Log de erro
      this.toolManager.executeTool("logger:log", {
        level: "error",
        message: `Erro na requisição API: ${method} ${path} - ${error.message}`,
        requestId,
        error: error.stack
      });
      
      // Registrar métrica de erro
      this.toolManager.executeTool("monitor:metric", {
        name: "api_request_errors",
        value: 1,
        tags: { method, path: this.normalizePath(path) }
      });
      
      // Enviar resposta de erro
      const statusCode = error.statusCode || 500;
      response.status(statusCode).json({ error: error.message || "Erro interno do servidor" });
    }
  }
  
  /**
   * Roteia a requisição para o handler apropriado
   * @private
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
   * @param {string} path - Caminho da API
   * @returns {Function|null} Handler da rota ou null se não encontrado
   */
  routeRequest(method, path) {
    // Implementação do roteamento
    // Exemplo simplificado:
    const routes = {
      "GET /projects": this.handleGetProjects,
      "POST /projects": this.handleCreateProject,
      "GET /projects/:id": this.handleGetProjectById,
      "PUT /projects/:id": this.handleUpdateProject,
      "DELETE /projects/:id": this.handleDeleteProject,
      "GET /projects/:id/tasks": this.handleGetProjectTasks,
      "POST /projects/:id/tasks": this.handleCreateTask,
      "GET /tasks/:taskId": this.handleGetTaskById,
      "PUT /tasks/:taskId": this.handleUpdateTask,
      "POST /tasks/:taskId/assign": this.handleAssignTask,
      "POST /webhooks/github": this.handleGithubWebhook,
      // Adicionar mais rotas conforme necessário
    };
    
    // Encontrar rota correspondente (considerando parâmetros)
    for (const routePath in routes) {
      const routeParts = routePath.split(" ");
      const routeMethod = routeParts[0];
      const routePattern = routeParts[1];
      
      if (routeMethod !== method) continue;
      
      const pathParts = path.split("/").filter(p => p);
      const patternParts = routePattern.split("/").filter(p => p);
      
      if (pathParts.length !== patternParts.length) continue;
      
      let match = true;
      const params = {};
      
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(":")) {
          params[patternParts[i].substring(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        // Adicionar parâmetros à requisição para uso no handler
        return (request) => {
          request.params = params;
          return routes[routePath].call(this, request);
        };
      }
    }
    
    return null;
  }
  
  /**
   * Normaliza um caminho de API para métricas
   * @private
   * @param {string} path - Caminho original
   * @returns {string} Caminho normalizado
   */
  normalizePath(path) {
    // Substituir IDs por placeholders
    return path.replace(/\/[0-9a-fA-F-]+/g, "/:id");
  }
  
  /**
   * Verifica o limite de requisições para um usuário
   * @private
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} True se permitido, False caso contrário
   */
  async checkRateLimit(userId) {
    // Implementação de rate limiting (ex: usando Redis ou um banco de dados)
    // Retornar true por enquanto para simplificar
    return true;
  }
  
  // --- Handlers de Rota --- //
  
  async handleGetProjects(request) {
    const { user, query } = request;
    const projects = await this.projectManagerAgent.listProjects(user.id, query);
    return { body: projects };
  }
  
  async handleCreateProject(request) {
    const { user, body } = request;
    const projectId = await this.projectManagerAgent.createProject({ ...body, owner: user.id });
    const newProject = await this.projectManagerAgent.getProjectById(projectId, user.id);
    return { status: 201, body: newProject };
  }
  
  async handleGetProjectById(request) {
    const { user, params } = request;
    const project = await this.projectManagerAgent.getProjectById(params.id, user.id);
    if (!project) {
      throw { statusCode: 404, message: "Projeto não encontrado" };
    }
    return { body: project };
  }
  
  async handleUpdateProject(request) {
    const { user, params, body } = request;
    const updatedProject = await this.projectManagerAgent.updateProject(params.id, body, user.id);
    return { body: updatedProject };
  }
  
  async handleDeleteProject(request) {
    const { user, params } = request;
    await this.projectManagerAgent.deleteProject(params.id, user.id);
    return { status: 204, body: null };
  }
  
  async handleGetProjectTasks(request) {
    const { user, params, query } = request;
    const tasks = await this.projectManagerAgent.listTasks(params.id, user.id, query);
    return { body: tasks };
  }
  
  async handleCreateTask(request) {
    const { user, params, body } = request;
    const taskId = await this.projectManagerAgent.createTask(params.id, body, user.id);
    const newTask = await this.projectManagerAgent.getTaskById(taskId, user.id);
    return { status: 201, body: newTask };
  }
  
  async handleGetTaskById(request) {
    const { user, params } = request;
    const task = await this.projectManagerAgent.getTaskById(params.taskId, user.id);
    if (!task) {
      throw { statusCode: 404, message: "Tarefa não encontrada" };
    }
    return { body: task };
  }
  
  async handleUpdateTask(request) {
    const { user, params, body } = request;
    const updatedTask = await this.projectManagerAgent.updateTask(params.taskId, body, user.id);
    return { body: updatedTask };
  }
  
  async handleAssignTask(request) {
    const { user, params, body } = request;
    const assignedTask = await this.projectManagerAgent.assignTask(params.taskId, body.userId, user.id);
    return { body: assignedTask };
  }
  
  async handleGithubWebhook(request) {
    const { headers, body } = request;
    const signature = headers["x-hub-signature-256"];
    const eventType = headers["x-github-event"];
    
    // Validar assinatura do webhook
    const isValid = await this.securityAgent.validateWebhookSignature(
      "github",
      JSON.stringify(body),
      signature
    );
    
    if (!isValid) {
      throw { statusCode: 401, message: "Assinatura de webhook inválida" };
    }
    
    // Processar evento com o IntegrationAgent
    await this.integrationAgent.processWebhook("github", eventType, body);
    
    return { status: 200, body: { message: "Webhook recebido com sucesso" } };
  }
  
  // --- Handlers de Eventos Internos --- //
  
  async handleAuthSuccess(event) {
    this.toolManager.executeTool("logger:log", {
      level: "info",
      message: `Autenticação bem-sucedida para usuário ${event.userId}`,
      userId: event.userId
    });
  }
  
  async handleAuthFailure(event) {
    this.toolManager.executeTool("logger:log", {
      level: "warn",
      message: `Falha na autenticação: ${event.reason}`,
      userId: event.userId,
      ip: event.ip
    });
  }
  
  async handleProjectEvent(event) {
    if (this.enableAuditing) {
      await this.toolManager.executeTool("supabase:insert", {
        table: "audit_log",
        data: {
          event_type: event.type,
          entity_type: "project",
          entity_id: event.project.id,
          user_id: event.actor || event.creator || event.updater,
          changes: event.changes || null,
          timestamp: event.timestamp
        }
      });
    }
    
    // Exemplo de uso do TaskMaster para analisar impacto da atualização
    if (event.type === "project:updated" && event.changes) {
      this.toolManager.executeTool("claude:taskmaster:analyze", {
        context: "project_update",
        data: {
          project: event.project,
          changes: event.changes
        },
        query: "Analyze the impact of these project changes on ongoing tasks and deadlines."
      }).then(analysis => {
        if (analysis && analysis.impact) {
          this.toolManager.executeTool("logger:log", {
            level: "info",
            message: `Análise de impacto da atualização do projeto ${event.project.id}: ${analysis.impact}`
          });
          // Poderia gerar notificações ou tarefas com base na análise
        }
      });
    }
  }
  
  async handleTaskEvent(event) {
    if (this.enableAuditing) {
      await this.toolManager.executeTool("supabase:insert", {
        table: "audit_log",
        data: {
          event_type: event.type,
          entity_type: "task",
          entity_id: event.task.id,
          project_id: event.project,
          user_id: event.actor || event.creator || event.updater || event.assigner,
          changes: event.changes || null,
          timestamp: event.timestamp
        }
      });
    }
    
    // Exemplo de uso do TaskMaster para priorizar ou delegar
    if (event.type === "task:created") {
      this.toolManager.executeTool("claude:taskmaster:prioritize", {
        context: "new_task",
        data: {
          task: event.task,
          projectContext: await this.projectManagerAgent.getProjectContext(event.project)
        },
        query: "Determine the optimal priority for this new task based on project goals and current workload."
      }).then(priorityResult => {
        if (priorityResult && priorityResult.priority && priorityResult.priority !== event.task.priority) {
          this.projectManagerAgent.updateTask(event.task.id, { priority: priorityResult.priority }, "system");
        }
      });
    } else if (event.type === "task:assigned") {
      // Poderia usar TaskMaster para confirmar se a delegação é ideal
    }
  }
  
  async handleIntegrationEvent(event) {
    this.toolManager.executeTool("logger:log", {
      level: "info",
      message: `Evento de integração recebido: ${event.source} - ${event.type}`,
      source: event.source,
      eventType: event.type,
      payload: event.payload
    });
    
    // Exemplo: Se for um evento do GitHub, gerar documentação
    if (event.source === "github" && event.type === "push") {
      const repositoryId = event.payload.repository.id;
      const branch = event.payload.ref.split("/").pop();
      
      // Chamar DocumentAgent para gerar documentação
      await this.documentAgent.generateDocumentationFromPush(repositoryId, branch, event.payload.commits);
    }
  }
}

export default BackendAgent;
