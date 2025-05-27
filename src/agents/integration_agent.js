/**
 * IntegrationAgent - Responsável por gerenciar todas as integrações externas do sistema Nexus
 * 
 * Este agente implementa as regras definidas em integration_rules.md e gerencia:
 * - Conexões com serviços externos e APIs
 * - Sincronização de dados entre o sistema e serviços externos
 * - Execução de ações em serviços integrados
 * - Gerenciamento de webhooks e eventos externos
 * - Monitoramento da saúde e disponibilidade das integrações
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';
import githubMCP from '../mcps/github_adapter.js';

class IntegrationAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('IntegrationAgent');
    this.metrics = createMetrics('IntegrationAgent');
    this.githubMCP = githubMCP;
    
    // Configurações do agente
    this.retryAttempts = parseInt(process.env.INTEGRATION_RETRY_ATTEMPTS || "3", 10);
    this.cacheTTL = parseInt(process.env.INTEGRATION_CACHE_TTL || "300", 10); // 5 minutos
    this.webhookSecret = process.env.INTEGRATION_WEBHOOK_SECRET;
    
    // Cache para dados de integrações
    this.cache = {};
    
    // Registro de conexões ativas
    this.activeConnections = {};
    
    // Registro de webhooks configurados
    this.webhooks = [];
    
    // Inicializar ferramentas
    this.initializeTools();
    
    console.log('IntegrationAgent inicializado com sucesso');
    this.registerEventHandlers();
    
    console.log("IntegrationAgent inicializado com sucesso");
  }
  
  /**
   * Inicializa as ferramentas necessárias para o IntegrationAgent
   * @private
   */
  initializeTools() {
    // Ferramentas do GitHub MCP
    this.toolManager.registerTool("github:repos:get");
    this.toolManager.registerTool("github:repos:list");
    this.toolManager.registerTool("github:repos:get_content");
    this.toolManager.registerTool("github:issues:list");
    this.toolManager.registerTool("github:issues:get");
    this.toolManager.registerTool("github:issues:create");
    this.toolManager.registerTool("github:issues:update");
    this.toolManager.registerTool("github:pulls:list");
    this.toolManager.registerTool("github:pulls:get");
    this.toolManager.registerTool("github:pulls:create");
    this.toolManager.registerTool("github:pulls:update");
    this.toolManager.registerTool("github:search:code");
    
    // Ferramentas do Figma MCP
    this.toolManager.registerTool("figma:get_file");
    this.toolManager.registerTool("figma:get_file_nodes");
    this.toolManager.registerTool("figma:get_image");
    this.toolManager.registerTool("figma:get_comments");
    this.toolManager.registerTool("figma:post_comment");
    
    // Ferramentas do Supabase MCP
    this.toolManager.registerTool("supabase:query");
    this.toolManager.registerTool("supabase:insert");
    this.toolManager.registerTool("supabase:update");
    this.toolManager.registerTool("supabase:delete");
    this.toolManager.registerTool("supabase:rpc");
    
    // Ferramentas do Puppeteer MCP
    this.toolManager.registerTool("puppeteer:goto");
    this.toolManager.registerTool("puppeteer:screenshot");
    this.toolManager.registerTool("puppeteer:pdf");
    this.toolManager.registerTool("puppeteer:evaluate");
    
    // Ferramentas do Claude-TaskMaster MCP
    this.toolManager.registerTool("claude-task-master:analyze");
    this.toolManager.registerTool("claude-task-master:generate");
  }
  
  /**
   * Registra handlers para eventos relevantes
   * @private
   */
  registerEventHandlers() {
    // Eventos de integração
    this.toolManager.on("integration:webhook_received", this.handleWebhookReceived.bind(this));
    this.toolManager.on("integration:service_status_changed", this.handleServiceStatusChanged.bind(this));
    
    // Eventos de sistema
    this.toolManager.on("system:startup", this.handleSystemStartup.bind(this));
    this.toolManager.on("system:shutdown", this.handleSystemShutdown.bind(this));
  }
  
  /**
   * Estabelece conexão com um serviço externo
   * @param {string} serviceId - Identificador do serviço
   * @param {object} credentials - Credenciais de autenticação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes da conexão
   * @throws {Error} Se a conexão falhar
   */
  async connectService(serviceId, credentials, options = {}) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      if (!credentials) {
        throw new Error("Credenciais são obrigatórias");
      }
      
      // Sanitizar credenciais
      const sanitizedCredentials = this.securityAgent.sanitizeInput(credentials, {
        type: "object"
      });
      
      // Sanitizar opções
      const sanitizedOptions = this.securityAgent.sanitizeInput(options, {
        type: "object"
      });
      
      // Verificar se já existe uma conexão ativa
      if (this.activeConnections[serviceId]) {
        console.log(`Reutilizando conexão existente para ${serviceId}`);
        return this.activeConnections[serviceId];
      }
      
      // Obter configuração do serviço
      const serviceConfig = await this.getServiceConfig(serviceId);
      
      if (!serviceConfig) {
        throw new Error(`Configuração não encontrada para serviço: ${serviceId}`);
      }
      
      // Estabelecer conexão com base no tipo de serviço
      let connection;
      
      switch (serviceId) {
        case 'github':
          connection = await this.connectGitHub(sanitizedCredentials, sanitizedOptions);
          break;
        case 'figma':
          connection = await this.connectFigma(sanitizedCredentials, sanitizedOptions);
          break;
        case 'jira':
          connection = await this.connectJira(sanitizedCredentials, sanitizedOptions);
          break;
        case 'slack':
          connection = await this.connectSlack(sanitizedCredentials, sanitizedOptions);
          break;
        default:
          // Para serviços genéricos, tentar conexão baseada na configuração
          connection = await this.connectGenericService(serviceId, sanitizedCredentials, sanitizedOptions, serviceConfig);
      }
      
      if (!connection) {
        throw new Error(`Falha ao conectar com serviço: ${serviceId}`);
      }
      
      // Armazenar conexão ativa
      this.activeConnections[serviceId] = {
        id: connection.id || `${serviceId}-${Date.now()}`,
        serviceId,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        expiresAt: connection.expiresAt,
        metadata: connection.metadata || {}
      };
      
      // Emitir evento de conexão estabelecida
      this.toolManager.emit("integration:connected", {
        serviceId,
        connectionId: this.activeConnections[serviceId].id,
        timestamp: new Date().toISOString()
      });
      
      // Registrar conexão no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "integration_connections",
        data: {
          service_id: serviceId,
          connection_id: this.activeConnections[serviceId].id,
          status: 'connected',
          connected_at: new Date().toISOString(),
          expires_at: connection.expiresAt,
          metadata: connection.metadata || {}
        }
      });
      
      return this.activeConnections[serviceId];
    } catch (error) {
      console.error(`Erro ao conectar com serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        operation: "connect",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Sincroniza dados entre o sistema e um serviço externo
   * @param {string} serviceId - Identificador do serviço
   * @param {string} entityType - Tipo de entidade a sincronizar
   * @param {object} options - Opções de sincronização
   * @returns {Promise<object>} Resultados da sincronização
   * @throws {Error} Se a sincronização falhar
   */
  async syncData(serviceId, entityType, options = {}) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      if (!entityType) {
        throw new Error("Tipo de entidade é obrigatório");
      }
      
      // Sanitizar opções
      const sanitizedOptions = this.securityAgent.sanitizeInput(options, {
        type: "object"
      });
      
      // Verificar se existe uma conexão ativa
      if (!this.activeConnections[serviceId]) {
        throw new Error(`Não há conexão ativa para o serviço: ${serviceId}`);
      }
      
      // Determinar direção da sincronização
      const direction = sanitizedOptions.direction || 'both';
      
      // Inicializar estatísticas de sincronização
      const stats = {
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: 0
      };
      
      // Executar sincronização com base no serviço e tipo de entidade
      switch (`${serviceId}:${entityType}`) {
        case 'github:issues':
          await this.syncGitHubIssues(sanitizedOptions, stats);
          break;
        case 'github:pulls':
          await this.syncGitHubPullRequests(sanitizedOptions, stats);
          break;
        case 'figma:designs':
          await this.syncFigmaDesigns(sanitizedOptions, stats);
          break;
        case 'jira:issues':
          await this.syncJiraIssues(sanitizedOptions, stats);
          break;
        default:
          // Para tipos de entidade genéricos, tentar sincronização baseada na configuração
          await this.syncGenericEntity(serviceId, entityType, sanitizedOptions, stats);
      }
      
      // Registrar sincronização no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "integration_syncs",
        data: {
          service_id: serviceId,
          entity_type: entityType,
          direction,
          stats,
          options: sanitizedOptions,
          completed_at: new Date().toISOString()
        }
      });
      
      // Emitir evento de sincronização concluída
      this.toolManager.emit("integration:sync_completed", {
        serviceId,
        entityType,
        stats,
        timestamp: new Date().toISOString()
      });
      
      return {
        serviceId,
        entityType,
        direction,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao sincronizar ${entityType} com ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        entityType,
        operation: "sync",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Executa uma ação em um serviço externo
   * @param {string} serviceId - Identificador do serviço
   * @param {string} actionId - Identificador da ação
   * @param {object} params - Parâmetros da ação
   * @returns {Promise<object>} Resultado da ação
   * @throws {Error} Se a execução falhar
   */
  async executeAction(serviceId, actionId, params = {}) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      if (!actionId) {
        throw new Error("ID da ação é obrigatório");
      }
      
      // Sanitizar parâmetros
      const sanitizedParams = this.securityAgent.sanitizeInput(params, {
        type: "object"
      });
      
      // Verificar se existe uma conexão ativa
      if (!this.activeConnections[serviceId]) {
        throw new Error(`Não há conexão ativa para o serviço: ${serviceId}`);
      }
      
      // Executar ação com base no serviço e ID da ação
      let result;
      
      switch (`${serviceId}:${actionId}`) {
        case 'github:createIssue':
          result = await this.executeGitHubCreateIssue(sanitizedParams);
          break;
        case 'github:createPullRequest':
          result = await this.executeGitHubCreatePullRequest(sanitizedParams);
          break;
        case 'figma:exportAsset':
          result = await this.executeFigmaExportAsset(sanitizedParams);
          break;
        case 'figma:createComment':
          result = await this.executeFigmaCreateComment(sanitizedParams);
          break;
        default:
          // Para ações genéricas, tentar execução baseada na configuração
          result = await this.executeGenericAction(serviceId, actionId, sanitizedParams);
      }
      
      if (!result) {
        throw new Error(`Falha ao executar ação ${actionId} no serviço ${serviceId}`);
      }
      
      // Registrar execução no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "integration_actions",
        data: {
          service_id: serviceId,
          action_id: actionId,
          params: sanitizedParams,
          result,
          executed_at: new Date().toISOString()
        }
      });
      
      // Emitir evento de ação executada
      this.toolManager.emit("integration:action_executed", {
        serviceId,
        actionId,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error(`Erro ao executar ação ${actionId} no serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        actionId,
        operation: "execute_action",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Registra um webhook para receber eventos de um serviço
   * @param {string} serviceId - Identificador do serviço
   * @param {string} eventType - Tipo de evento
   * @param {string} callbackUrl - URL para receber callbacks
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes do webhook
   * @throws {Error} Se o registro falhar
   */
  async registerWebhook(serviceId, eventType, callbackUrl, options = {}) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      if (!eventType) {
        throw new Error("Tipo de evento é obrigatório");
      }
      
      if (!callbackUrl) {
        throw new Error("URL de callback é obrigatória");
      }
      
      // Sanitizar opções
      const sanitizedOptions = this.securityAgent.sanitizeInput(options, {
        type: "object"
      });
      
      // Verificar se existe uma conexão ativa
      if (!this.activeConnections[serviceId]) {
        throw new Error(`Não há conexão ativa para o serviço: ${serviceId}`);
      }
      
      // Gerar secret para webhook se não fornecido
      const secret = sanitizedOptions.secret || this.webhookSecret || this.generateWebhookSecret();
      
      // Registrar webhook com base no serviço
      let webhook;
      
      switch (serviceId) {
        case 'github':
          webhook = await this.registerGitHubWebhook(eventType, callbackUrl, secret, sanitizedOptions);
          break;
        case 'figma':
          webhook = await this.registerFigmaWebhook(eventType, callbackUrl, secret, sanitizedOptions);
          break;
        case 'jira':
          webhook = await this.registerJiraWebhook(eventType, callbackUrl, secret, sanitizedOptions);
          break;
        case 'slack':
          webhook = await this.registerSlackWebhook(eventType, callbackUrl, secret, sanitizedOptions);
          break;
        default:
          // Para serviços genéricos, tentar registro baseado na configuração
          webhook = await this.registerGenericWebhook(serviceId, eventType, callbackUrl, secret, sanitizedOptions);
      }
      
      if (!webhook) {
        throw new Error(`Falha ao registrar webhook para ${eventType} no serviço ${serviceId}`);
      }
      
      // Armazenar webhook registrado
      const webhookId = webhook.id || `${serviceId}-${eventType}-${Date.now()}`;
      
      this.registeredWebhooks[webhookId] = {
        id: webhookId,
        serviceId,
        eventType,
        callbackUrl,
        secret,
        registeredAt: new Date().toISOString(),
        metadata: webhook.metadata || {}
      };
      
      // Registrar webhook no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "integration_webhooks",
        data: {
          webhook_id: webhookId,
          service_id: serviceId,
          event_type: eventType,
          callback_url: callbackUrl,
          secret_hash: await this.securityAgent.hashString(secret),
          options: sanitizedOptions,
          registered_at: new Date().toISOString(),
          metadata: webhook.metadata || {}
        }
      });
      
      // Emitir evento de webhook registrado
      this.toolManager.emit("integration:webhook_registered", {
        webhookId,
        serviceId,
        eventType,
        timestamp: new Date().toISOString()
      });
      
      return {
        id: webhookId,
        serviceId,
        eventType,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao registrar webhook para ${eventType} no serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        eventType,
        operation: "register_webhook",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Verifica o status de um serviço integrado
   * @param {string} serviceId - Identificador do serviço
   * @returns {Promise<object>} Status do serviço
   * @throws {Error} Se a verificação falhar
   */
  async getServiceStatus(serviceId) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      // Verificar se existe uma conexão ativa
      if (!this.activeConnections[serviceId]) {
        return {
          serviceId,
          status: 'disconnected',
          timestamp: new Date().toISOString()
        };
      }
      
      // Verificar status com base no serviço
      let status = 'unknown';
      let details = {};
      
      switch (serviceId) {
        case 'github':
          ({ status, details } = await this.checkGitHubStatus());
          break;
        case 'figma':
          ({ status, details } = await this.checkFigmaStatus());
          break;
        case 'jira':
          ({ status, details } = await this.checkJiraStatus());
          break;
        case 'slack':
          ({ status, details } = await this.checkSlackStatus());
          break;
        default:
          // Para serviços genéricos, tentar verificação baseada na configuração
          ({ status, details } = await this.checkGenericServiceStatus(serviceId));
      }
      
      // Atualizar status da conexão
      this.activeConnections[serviceId].status = status;
      this.activeConnections[serviceId].lastChecked = new Date().toISOString();
      
      // Verificar se o status mudou desde a última verificação
      const previousStatus = await this.getPreviousServiceStatus(serviceId);
      
      if (previousStatus && previousStatus !== status) {
        // Emitir evento de mudança de status
        this.toolManager.emit("integration:service_status_changed", {
          serviceId,
          previousStatus,
          currentStatus: status,
          timestamp: new Date().toISOString()
        });
        
        // Registrar mudança de status no banco de dados
        await this.toolManager.executeTool("supabase:insert", {
          table: "integration_status_changes",
          data: {
            service_id: serviceId,
            previous_status: previousStatus,
            current_status: status,
            changed_at: new Date().toISOString(),
            details
          }
        });
      }
      
      // Atualizar status no banco de dados
      await this.toolManager.executeTool("supabase:update", {
        table: "integration_connections",
        data: {
          status,
          last_checked: new Date().toISOString(),
          status_details: details
        },
        filters: {
          service_id: serviceId,
          connection_id: this.activeConnections[serviceId].id
        }
      });
      
      return {
        serviceId,
        status,
        details,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao verificar status do serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        operation: "get_status",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Retornar status de erro
      return {
        serviceId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Desconecta de um serviço externo
   * @param {string} serviceId - Identificador do serviço
   * @returns {Promise<object>} Resultado da desconexão
   * @throws {Error} Se a desconexão falhar
   */
  async disconnectService(serviceId) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      // Verificar se existe uma conexão ativa
      if (!this.activeConnections[serviceId]) {
        return {
          serviceId,
          status: 'already_disconnected',
          timestamp: new Date().toISOString()
        };
      }
      
      // Executar desconexão com base no serviço
      switch (serviceId) {
        case 'github':
          await this.disconnectGitHub();
          break;
        case 'figma':
          await this.disconnectFigma();
          break;
        case 'jira':
          await this.disconnectJira();
          break;
        case 'slack':
          await this.disconnectSlack();
          break;
        default:
          // Para serviços genéricos, tentar desconexão baseada na configuração
          await this.disconnectGenericService(serviceId);
      }
      
      // Atualizar status no banco de dados
      await this.toolManager.executeTool("supabase:update", {
        table: "integration_connections",
        data: {
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        },
        filters: {
          service_id: serviceId,
          connection_id: this.activeConnections[serviceId].id
        }
      });
      
      // Remover conexão ativa
      const connectionId = this.activeConnections[serviceId].id;
      delete this.activeConnections[serviceId];
      
      // Emitir evento de desconexão
      this.toolManager.emit("integration:disconnected", {
        serviceId,
        connectionId,
        timestamp: new Date().toISOString()
      });
      
      return {
        serviceId,
        status: 'disconnected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao desconectar do serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        operation: "disconnect",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Processa um webhook recebido
   * @param {string} serviceId - Identificador do serviço
   * @param {string} eventType - Tipo de evento
   * @param {object} payload - Payload do webhook
   * @param {object} headers - Headers da requisição
   * @returns {Promise<object>} Resultado do processamento
   * @throws {Error} Se o processamento falhar
   */
  async processWebhook(serviceId, eventType, payload, headers) {
    try {
      // Validar entrada
      if (!serviceId) {
        throw new Error("ID do serviço é obrigatório");
      }
      
      if (!eventType) {
        throw new Error("Tipo de evento é obrigatório");
      }
      
      if (!payload) {
        throw new Error("Payload é obrigatório");
      }
      
      // Sanitizar payload
      const sanitizedPayload = this.securityAgent.sanitizeInput(payload, {
        type: "object"
      });
      
      // Sanitizar headers
      const sanitizedHeaders = this.securityAgent.sanitizeInput(headers, {
        type: "object"
      });
      
      // Encontrar webhook registrado
      const webhook = Object.values(this.registeredWebhooks).find(
        wh => wh.serviceId === serviceId && wh.eventType === eventType
      );
      
      if (!webhook) {
        throw new Error(`Webhook não encontrado para ${serviceId}:${eventType}`);
      }
      
      // Verificar autenticidade do webhook
      const isAuthentic = await this.verifyWebhookAuthenticity(
        serviceId,
        eventType,
        sanitizedPayload,
        sanitizedHeaders,
        webhook.secret
      );
      
      if (!isAuthentic) {
        throw new Error(`Webhook não autêntico para ${serviceId}:${eventType}`);
      }
      
      // Processar webhook com base no serviço e tipo de evento
      let result;
      
      switch (`${serviceId}:${eventType}`) {
        case 'github:push':
          result = await this.processGitHubPushWebhook(sanitizedPayload);
          break;
        case 'github:pull_request':
          result = await this.processGitHubPullRequestWebhook(sanitizedPayload);
          break;
        case 'figma:file_update':
          result = await this.processFigmaFileUpdateWebhook(sanitizedPayload);
          break;
        case 'jira:issue_updated':
          result = await this.processJiraIssueUpdatedWebhook(sanitizedPayload);
          break;
        default:
          // Para webhooks genéricos, tentar processamento baseado na configuração
          result = await this.processGenericWebhook(serviceId, eventType, sanitizedPayload);
      }
      
      // Registrar webhook no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "integration_webhook_events",
        data: {
          service_id: serviceId,
          event_type: eventType,
          payload: sanitizedPayload,
          processed_at: new Date().toISOString(),
          result
        }
      });
      
      // Emitir evento de webhook recebido
      this.toolManager.emit("integration:webhook_received", {
        serviceId,
        eventType,
        payload: sanitizedPayload,
        timestamp: new Date().toISOString()
      });
      
      return {
        serviceId,
        eventType,
        processed: true,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao processar webhook ${eventType} do serviço ${serviceId}:`, error);
      
      // Emitir evento de erro
      this.toolManager.emit("integration:error", {
        serviceId,
        eventType,
        operation: "process_webhook",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Implementações específicas para serviços
  
  /**
   * Conecta ao GitHub
   * @private
   * @param {object} credentials - Credenciais de autenticação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes da conexão
   */
  async connectGitHub(credentials, options) {
    try {
      // Verificar token
      if (!credentials.token) {
        throw new Error("Token do GitHub é obrigatório");
      }
      
      // Testar conexão
      const user = await this.toolManager.executeTool("github:repos:get", {
        token: credentials.token,
        owner: options.owner || 'windsurf',
        repo: options.repo || 'template'
      });
      
      if (!user) {
        throw new Error("Falha ao conectar com GitHub");
      }
      
      // Armazenar token de forma segura
      process.env.INTEGRATION_GITHUB_TOKEN = credentials.token;
      
      return {
        id: `github-${Date.now()}`,
        metadata: {
          scope: options.scope || ['repo', 'user'],
          user: user.owner
        }
      };
    } catch (error) {
      console.error("Erro ao conectar com GitHub:", error);
      throw error;
    }
  }
  
  /**
   * Conecta ao Figma
   * @private
   * @param {object} credentials - Credenciais de autenticação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes da conexão
   */
  async connectFigma(credentials, options) {
    try {
      // Verificar token
      if (!credentials.token) {
        throw new Error("Token do Figma é obrigatório");
      }
      
      // Testar conexão
      const file = await this.toolManager.executeTool("figma:get_file", {
        token: credentials.token,
        fileId: options.fileId || 'sample'
      });
      
      if (!file) {
        throw new Error("Falha ao conectar com Figma");
      }
      
      // Armazenar token de forma segura
      process.env.INTEGRATION_FIGMA_TOKEN = credentials.token;
      
      return {
        id: `figma-${Date.now()}`,
        metadata: {
          user: file.lastModifiedBy
        }
      };
    } catch (error) {
      console.error("Erro ao conectar com Figma:", error);
      throw error;
    }
  }
  
  /**
   * Conecta a um serviço genérico
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {object} credentials - Credenciais de autenticação
   * @param {object} options - Opções de configuração
   * @param {object} serviceConfig - Configuração do serviço
   * @returns {Promise<object>} Detalhes da conexão
   */
  async connectGenericService(serviceId, credentials, options, serviceConfig) {
    try {
      // Implementar conexão genérica baseada na configuração
      console.log(`Conectando a serviço genérico: ${serviceId}`);
      
      // Simular conexão bem-sucedida
      return {
        id: `${serviceId}-${Date.now()}`,
        metadata: {
          options
        }
      };
    } catch (error) {
      console.error(`Erro ao conectar com serviço genérico ${serviceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Sincroniza issues do GitHub
   * @private
   * @param {object} options - Opções de sincronização
   * @param {object} stats - Estatísticas de sincronização
   * @returns {Promise<void>}
   */
  async syncGitHubIssues(options, stats) {
    try {
      // Verificar opções obrigatórias
      if (!options.repository) {
        throw new Error("Repositório é obrigatório para sincronização de issues");
      }
      
      // Extrair owner e repo do formato owner/repo
      const [owner, repo] = options.repository.split('/');
      
      if (!owner || !repo) {
        throw new Error("Formato de repositório inválido, use 'owner/repo'");
      }
      
      // Obter issues do GitHub
      const issues = await this.toolManager.executeTool("github:issues:list", {
        owner,
        repo,
        state: options.state || 'all',
        per_page: options.limit || 100
      });
      
      if (!issues || !Array.isArray(issues)) {
        throw new Error("Falha ao obter issues do GitHub");
      }
      
      console.log(`Obtidas ${issues.length} issues do GitHub`);
      
      // Determinar direção da sincronização
      const direction = options.direction || 'both';
      
      if (direction === 'import' || direction === 'both') {
        // Importar issues para o sistema
        for (const issue of issues) {
          try {
            // Verificar se a issue já existe no sistema
            const existingIssue = await this.toolManager.executeTool("supabase:query", {
              table: "issues",
              filters: {
                external_id: `github:${issue.id}`,
                repository: options.repository
              },
              single: true
            });
            
            if (existingIssue) {
              // Atualizar issue existente
              await this.toolManager.executeTool("supabase:update", {
                table: "issues",
                data: {
                  title: issue.title,
                  description: issue.body,
                  status: issue.state,
                  labels: issue.labels.map(label => label.name),
                  assignee: issue.assignee ? issue.assignee.login : null,
                  updated_at: new Date(issue.updated_at).toISOString(),
                  external_data: issue
                },
                filters: {
                  id: existingIssue.id
                }
              });
              
              stats.updated++;
            } else {
              // Criar nova issue
              await this.toolManager.executeTool("supabase:insert", {
                table: "issues",
                data: {
                  external_id: `github:${issue.id}`,
                  repository: options.repository,
                  title: issue.title,
                  description: issue.body,
                  status: issue.state,
                  labels: issue.labels.map(label => label.name),
                  assignee: issue.assignee ? issue.assignee.login : null,
                  created_at: new Date(issue.created_at).toISOString(),
                  updated_at: new Date(issue.updated_at).toISOString(),
                  external_data: issue
                }
              });
              
              stats.created++;
            }
          } catch (error) {
            console.error(`Erro ao sincronizar issue ${issue.number}:`, error);
            stats.errors++;
          }
        }
      }
      
      if (direction === 'export' || direction === 'both') {
        // Exportar issues do sistema para o GitHub
        // Implementação de exportação...
      }
    } catch (error) {
      console.error("Erro ao sincronizar issues do GitHub:", error);
      throw error;
    }
  }
  
  /**
   * Sincroniza designs do Figma
   * @private
   * @param {object} options - Opções de sincronização
   * @param {object} stats - Estatísticas de sincronização
   * @returns {Promise<void>}
   */
  async syncFigmaDesigns(options, stats) {
    try {
      // Verificar opções obrigatórias
      if (!options.fileId) {
        throw new Error("ID do arquivo Figma é obrigatório");
      }
      
      // Obter arquivo do Figma
      const file = await this.toolManager.executeTool("figma:get_file", {
        fileId: options.fileId
      });
      
      if (!file) {
        throw new Error("Falha ao obter arquivo do Figma");
      }
      
      console.log(`Obtido arquivo Figma: ${file.name}`);
      
      // Obter nodes específicos se fornecidos
      let nodes = [];
      
      if (options.nodeIds && options.nodeIds.length > 0) {
        const nodesResult = await this.toolManager.executeTool("figma:get_file_nodes", {
          fileId: options.fileId,
          ids: options.nodeIds
        });
        
        if (nodesResult && nodesResult.nodes) {
          nodes = Object.values(nodesResult.nodes);
        }
      } else {
        // Usar todos os frames de primeiro nível
        nodes = file.document.children.filter(node => node.type === 'FRAME');
      }
      
      console.log(`Processando ${nodes.length} nodes do Figma`);
      
      // Sincronizar cada node
      for (const node of nodes) {
        try {
          // Verificar se o design já existe no sistema
          const existingDesign = await this.toolManager.executeTool("supabase:query", {
            table: "designs",
            filters: {
              external_id: `figma:${options.fileId}:${node.id}`
            },
            single: true
          });
          
          // Obter imagem do node
          const image = await this.toolManager.executeTool("figma:get_image", {
            fileId: options.fileId,
            ids: [node.id],
            format: 'png',
            scale: 2
          });
          
          const imageUrl = image && image.images ? image.images[node.id] : null;
          
          if (existingDesign) {
            // Atualizar design existente
            await this.toolManager.executeTool("supabase:update", {
              table: "designs",
              data: {
                name: node.name,
                description: node.description || '',
                image_url: imageUrl,
                updated_at: new Date().toISOString(),
                metadata: {
                  type: node.type,
                  width: node.absoluteBoundingBox?.width,
                  height: node.absoluteBoundingBox?.height
                }
              },
              filters: {
                id: existingDesign.id
              }
            });
            
            stats.updated++;
          } else {
            // Criar novo design
            await this.toolManager.executeTool("supabase:insert", {
              table: "designs",
              data: {
                external_id: `figma:${options.fileId}:${node.id}`,
                file_id: options.fileId,
                name: node.name,
                description: node.description || '',
                image_url: imageUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                  type: node.type,
                  width: node.absoluteBoundingBox?.width,
                  height: node.absoluteBoundingBox?.height
                }
              }
            });
            
            stats.created++;
          }
        } catch (error) {
          console.error(`Erro ao sincronizar design ${node.id}:`, error);
          stats.errors++;
        }
      }
    } catch (error) {
      console.error("Erro ao sincronizar designs do Figma:", error);
      throw error;
    }
  }
  
  /**
   * Sincroniza uma entidade genérica
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {string} entityType - Tipo de entidade
   * @param {object} options - Opções de sincronização
   * @param {object} stats - Estatísticas de sincronização
   * @returns {Promise<void>}
   */
  async syncGenericEntity(serviceId, entityType, options, stats) {
    try {
      console.log(`Sincronizando entidade genérica: ${serviceId}:${entityType}`);
      
      // Simular sincronização bem-sucedida
      stats.created = 1;
      stats.updated = 2;
    } catch (error) {
      console.error(`Erro ao sincronizar entidade genérica ${serviceId}:${entityType}:`, error);
      throw error;
    }
  }
  
  /**
   * Executa ação de criar issue no GitHub
   * @private
   * @param {object} params - Parâmetros da ação
   * @returns {Promise<object>} Resultado da ação
   */
  async executeGitHubCreateIssue(params) {
    try {
      // Verificar parâmetros obrigatórios
      if (!params.repository) {
        throw new Error("Repositório é obrigatório");
      }
      
      if (!params.title) {
        throw new Error("Título é obrigatório");
      }
      
      // Extrair owner e repo do formato owner/repo
      const [owner, repo] = params.repository.split('/');
      
      if (!owner || !repo) {
        throw new Error("Formato de repositório inválido, use 'owner/repo'");
      }
      
      // Criar issue no GitHub
      const issue = await this.toolManager.executeTool("github:issues:create", {
        owner,
        repo,
        title: params.title,
        body: params.body || '',
        assignees: params.assignees || [],
        labels: params.labels || []
      });
      
      if (!issue) {
        throw new Error("Falha ao criar issue no GitHub");
      }
      
      return {
        id: issue.id,
        number: issue.number,
        url: issue.html_url,
        title: issue.title,
        createdAt: issue.created_at
      };
    } catch (error) {
      console.error("Erro ao criar issue no GitHub:", error);
      throw error;
    }
  }
  
  /**
   * Executa ação de exportar asset do Figma
   * @private
   * @param {object} params - Parâmetros da ação
   * @returns {Promise<object>} Resultado da ação
   */
  async executeFigmaExportAsset(params) {
    try {
      // Verificar parâmetros obrigatórios
      if (!params.fileId) {
        throw new Error("ID do arquivo é obrigatório");
      }
      
      if (!params.nodeId) {
        throw new Error("ID do node é obrigatório");
      }
      
      // Obter imagem do node
      const image = await this.toolManager.executeTool("figma:get_image", {
        fileId: params.fileId,
        ids: [params.nodeId],
        format: params.format || 'png',
        scale: params.scale || 1
      });
      
      if (!image || !image.images || !image.images[params.nodeId]) {
        throw new Error("Falha ao exportar asset do Figma");
      }
      
      const imageUrl = image.images[params.nodeId];
      
      // Se solicitado, baixar a imagem
      let localPath = null;
      
      if (params.download) {
        // Implementar download da imagem
        // ...
      }
      
      return {
        url: imageUrl,
        format: params.format || 'png',
        scale: params.scale || 1,
        localPath
      };
    } catch (error) {
      console.error("Erro ao exportar asset do Figma:", error);
      throw error;
    }
  }
  
  /**
   * Executa uma ação genérica
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {string} actionId - Identificador da ação
   * @param {object} params - Parâmetros da ação
   * @returns {Promise<object>} Resultado da ação
   */
  async executeGenericAction(serviceId, actionId, params) {
    try {
      console.log(`Executando ação genérica: ${serviceId}:${actionId}`);
      
      // Simular execução bem-sucedida
      return {
        success: true,
        actionId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao executar ação genérica ${serviceId}:${actionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Registra webhook do GitHub
   * @private
   * @param {string} eventType - Tipo de evento
   * @param {string} callbackUrl - URL para receber callbacks
   * @param {string} secret - Secret para validação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes do webhook
   */
  async registerGitHubWebhook(eventType, callbackUrl, secret, options) {
    try {
      // Verificar opções obrigatórias
      if (!options.repository) {
        throw new Error("Repositório é obrigatório para webhook do GitHub");
      }
      
      // Extrair owner e repo do formato owner/repo
      const [owner, repo] = options.repository.split('/');
      
      if (!owner || !repo) {
        throw new Error("Formato de repositório inválido, use 'owner/repo'");
      }
      
      // Mapear tipo de evento para formato do GitHub
      const events = [];
      
      switch (eventType) {
        case 'push':
          events.push('push');
          break;
        case 'pull_request':
          events.push('pull_request');
          break;
        case 'issues':
          events.push('issues');
          break;
        case 'all':
          events.push('*');
          break;
        default:
          events.push(eventType);
      }
      
      // Registrar webhook no GitHub
      const webhook = await this.toolManager.executeTool("github:repos:create_hook", {
        owner,
        repo,
        config: {
          url: callbackUrl,
          content_type: options.contentType || 'json',
          secret
        },
        events
      });
      
      if (!webhook) {
        throw new Error("Falha ao registrar webhook no GitHub");
      }
      
      return {
        id: webhook.id.toString(),
        metadata: {
          events,
          repository: options.repository
        }
      };
    } catch (error) {
      console.error("Erro ao registrar webhook no GitHub:", error);
      throw error;
    }
  }
  
  /**
   * Registra webhook do Figma
   * @private
   * @param {string} eventType - Tipo de evento
   * @param {string} callbackUrl - URL para receber callbacks
   * @param {string} secret - Secret para validação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes do webhook
   */
  async registerFigmaWebhook(eventType, callbackUrl, secret, options) {
    try {
      // Verificar opções obrigatórias
      if (!options.fileId) {
        throw new Error("ID do arquivo é obrigatório para webhook do Figma");
      }
      
      // Mapear tipo de evento para formato do Figma
      const event = eventType === 'file_update' ? 'FILE_UPDATE' : 
                    eventType === 'comment' ? 'COMMENT' : 
                    eventType.toUpperCase();
      
      // Registrar webhook no Figma
      const webhook = await this.toolManager.executeTool("figma:create_webhook", {
        fileId: options.fileId,
        event,
        endpoint: callbackUrl,
        passcode: secret
      });
      
      if (!webhook) {
        throw new Error("Falha ao registrar webhook no Figma");
      }
      
      return {
        id: webhook.id,
        metadata: {
          event,
          fileId: options.fileId
        }
      };
    } catch (error) {
      console.error("Erro ao registrar webhook no Figma:", error);
      throw error;
    }
  }
  
  /**
   * Registra webhook genérico
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {string} eventType - Tipo de evento
   * @param {string} callbackUrl - URL para receber callbacks
   * @param {string} secret - Secret para validação
   * @param {object} options - Opções de configuração
   * @returns {Promise<object>} Detalhes do webhook
   */
  async registerGenericWebhook(serviceId, eventType, callbackUrl, secret, options) {
    try {
      console.log(`Registrando webhook genérico: ${serviceId}:${eventType}`);
      
      // Simular registro bem-sucedido
      return {
        id: `${serviceId}-${eventType}-${Date.now()}`,
        metadata: {
          options
        }
      };
    } catch (error) {
      console.error(`Erro ao registrar webhook genérico ${serviceId}:${eventType}:`, error);
      throw error;
    }
  }
  
  /**
   * Verifica a autenticidade de um webhook
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {string} eventType - Tipo de evento
   * @param {object} payload - Payload do webhook
   * @param {object} headers - Headers da requisição
   * @param {string} secret - Secret para validação
   * @returns {Promise<boolean>} Se o webhook é autêntico
   */
  async verifyWebhookAuthenticity(serviceId, eventType, payload, headers, secret) {
    try {
      switch (serviceId) {
        case 'github':
          return await this.verifyGitHubWebhook(payload, headers, secret);
        case 'figma':
          return await this.verifyFigmaWebhook(payload, headers, secret);
        default:
          // Para serviços genéricos, implementar verificação baseada na configuração
          return true;
      }
    } catch (error) {
      console.error(`Erro ao verificar autenticidade do webhook ${serviceId}:${eventType}:`, error);
      return false;
    }
  }
  
  /**
   * Verifica a autenticidade de um webhook do GitHub
   * @private
   * @param {object} payload - Payload do webhook
   * @param {object} headers - Headers da requisição
   * @param {string} secret - Secret para validação
   * @returns {Promise<boolean>} Se o webhook é autêntico
   */
  async verifyGitHubWebhook(payload, headers, secret) {
    try {
      // Verificar signature do GitHub
      const signature = headers['x-hub-signature-256'];
      
      if (!signature) {
        return false;
      }
      
      // Calcular hash esperado
      const expectedSignature = await this.securityAgent.calculateHmacSha256(
        JSON.stringify(payload),
        secret
      );
      
      // Comparar signatures
      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      console.error("Erro ao verificar webhook do GitHub:", error);
      return false;
    }
  }
  
  /**
   * Verifica a autenticidade de um webhook do Figma
   * @private
   * @param {object} payload - Payload do webhook
   * @param {object} headers - Headers da requisição
   * @param {string} secret - Secret para validação
   * @returns {Promise<boolean>} Se o webhook é autêntico
   */
  async verifyFigmaWebhook(payload, headers, secret) {
    try {
      // Verificar passcode do Figma
      const passcode = payload.passcode;
      
      if (!passcode) {
        return false;
      }
      
      // Comparar passcode
      return passcode === secret;
    } catch (error) {
      console.error("Erro ao verificar webhook do Figma:", error);
      return false;
    }
  }
  
  /**
   * Processa webhook de push do GitHub
   * @private
   * @param {object} payload - Payload do webhook
   * @returns {Promise<object>} Resultado do processamento
   */
  async processGitHubPushWebhook(payload) {
    try {
      // Extrair informações relevantes
      const repository = payload.repository.full_name;
      const branch = payload.ref.replace('refs/heads/', '');
      const commits = payload.commits || [];
      
      console.log(`Processando webhook de push para ${repository}:${branch} com ${commits.length} commits`);
      
      // Registrar evento no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "repository_events",
        data: {
          repository,
          event_type: 'push',
          branch,
          commit_count: commits.length,
          author: payload.pusher.name,
          timestamp: new Date().toISOString(),
          metadata: {
            commits: commits.map(commit => ({
              id: commit.id,
              message: commit.message,
              author: commit.author.name,
              url: commit.url
            }))
          }
        }
      });
      
      // Emitir evento para outros agentes
      this.toolManager.emit("repository:push", {
        repository,
        branch,
        commits: commits.map(commit => ({
          id: commit.id,
          message: commit.message,
          author: commit.author.name,
          url: commit.url
        })),
        timestamp: new Date().toISOString()
      });
      
      return {
        repository,
        branch,
        commitCount: commits.length,
        processed: true
      };
    } catch (error) {
      console.error("Erro ao processar webhook de push do GitHub:", error);
      throw error;
    }
  }
  
  /**
   * Processa webhook de atualização de arquivo do Figma
   * @private
   * @param {object} payload - Payload do webhook
   * @returns {Promise<object>} Resultado do processamento
   */
  async processFigmaFileUpdateWebhook(payload) {
    try {
      // Extrair informações relevantes
      const fileId = payload.file_id;
      const fileName = payload.file_name;
      const timestamp = payload.timestamp;
      
      console.log(`Processando webhook de atualização de arquivo Figma: ${fileName} (${fileId})`);
      
      // Registrar evento no banco de dados
      await this.toolManager.executeTool("supabase:insert", {
        table: "design_events",
        data: {
          file_id: fileId,
          file_name: fileName,
          event_type: 'file_update',
          timestamp: new Date(timestamp).toISOString(),
          metadata: payload
        }
      });
      
      // Emitir evento para outros agentes
      this.toolManager.emit("design:file_updated", {
        fileId,
        fileName,
        timestamp: new Date(timestamp).toISOString()
      });
      
      return {
        fileId,
        fileName,
        processed: true
      };
    } catch (error) {
      console.error("Erro ao processar webhook de atualização de arquivo Figma:", error);
      throw error;
    }
  }
  
  /**
   * Processa webhook genérico
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @param {string} eventType - Tipo de evento
   * @param {object} payload - Payload do webhook
   * @returns {Promise<object>} Resultado do processamento
   */
  async processGenericWebhook(serviceId, eventType, payload) {
    try {
      console.log(`Processando webhook genérico: ${serviceId}:${eventType}`);
      
      // Simular processamento bem-sucedido
      return {
        processed: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erro ao processar webhook genérico ${serviceId}:${eventType}:`, error);
      throw error;
    }
  }
  
  /**
   * Verifica o status do GitHub
   * @private
   * @returns {Promise<object>} Status do serviço
   */
  async checkGitHubStatus() {
    try {
      // Testar conexão com GitHub
      const result = await this.toolManager.executeTool("github:repos:get", {
        owner: 'windsurf',
        repo: 'template'
      });
      
      if (!result) {
        return {
          status: 'error',
          details: {
            message: "Falha ao conectar com GitHub"
          }
        };
      }
      
      return {
        status: 'connected',
        details: {
          rateLimit: result.rate?.limit,
          rateRemaining: result.rate?.remaining
        }
      };
    } catch (error) {
      console.error("Erro ao verificar status do GitHub:", error);
      
      return {
        status: 'error',
        details: {
          message: error.message
        }
      };
    }
  }
  
  /**
   * Verifica o status do Figma
   * @private
   * @returns {Promise<object>} Status do serviço
   */
  async checkFigmaStatus() {
    try {
      // Testar conexão com Figma
      const result = await this.toolManager.executeTool("figma:get_file", {
        fileId: 'sample'
      });
      
      if (!result) {
        return {
          status: 'error',
          details: {
            message: "Falha ao conectar com Figma"
          }
        };
      }
      
      return {
        status: 'connected',
        details: {
          fileName: result.name
        }
      };
    } catch (error) {
      console.error("Erro ao verificar status do Figma:", error);
      
      return {
        status: 'error',
        details: {
          message: error.message
        }
      };
    }
  }
  
  /**
   * Verifica o status de um serviço genérico
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @returns {Promise<object>} Status do serviço
   */
  async checkGenericServiceStatus(serviceId) {
    try {
      console.log(`Verificando status do serviço genérico: ${serviceId}`);
      
      // Simular verificação bem-sucedida
      return {
        status: 'connected',
        details: {}
      };
    } catch (error) {
      console.error(`Erro ao verificar status do serviço genérico ${serviceId}:`, error);
      
      return {
        status: 'error',
        details: {
          message: error.message
        }
      };
    }
  }
  
  /**
   * Obtém o status anterior de um serviço
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @returns {Promise<string>} Status anterior
   */
  async getPreviousServiceStatus(serviceId) {
    try {
      const statusChange = await this.toolManager.executeTool("supabase:query", {
        table: "integration_status_changes",
        filters: { service_id: serviceId },
        order: { column: "changed_at", direction: "desc" },
        limit: 1,
        single: true
      });
      
      return statusChange ? statusChange.current_status : null;
    } catch (error) {
      console.error(`Erro ao obter status anterior do serviço ${serviceId}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém a configuração de um serviço
   * @private
   * @param {string} serviceId - Identificador do serviço
   * @returns {Promise<object>} Configuração do serviço
   */
  async getServiceConfig(serviceId) {
    try {
      // Verificar cache
      if (this.cache[`service_config:${serviceId}`]) {
        return this.cache[`service_config:${serviceId}`];
      }
      
      // Obter configuração do banco de dados
      const config = await this.toolManager.executeTool("supabase:query", {
        table: "integration_services",
        filters: { service_id: serviceId },
        single: true
      });
      
      if (config) {
        // Armazenar em cache
        this.cache[`service_config:${serviceId}`] = config;
        return config;
      }
      
      // Configuração padrão para serviços conhecidos
      const defaultConfigs = {
        github: {
          name: "GitHub",
          api_url: "https://api.github.com",
          auth_type: "token"
        },
        figma: {
          name: "Figma",
          api_url: "https://api.figma.com/v1",
          auth_type: "token"
        }
      };
      
      return defaultConfigs[serviceId] || null;
    } catch (error) {
      console.error(`Erro ao obter configuração do serviço ${serviceId}:`, error);
      return null;
    }
  }
  
  /**
   * Gera um secret para webhook
   * @private
   * @returns {string} Secret gerado
   */
  generateWebhookSecret() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let secret = '';
    
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return secret;
  }
  
  // Handlers de eventos
  
  /**
   * Handler para evento de webhook recebido
   * @private
   * @param {object} data - Dados do evento
   */
  handleWebhookReceived(data) {
    console.log(`Webhook recebido: ${data.serviceId}:${data.eventType}`);
  }
  
  /**
   * Handler para evento de mudança de status de serviço
   * @private
   * @param {object} data - Dados do evento
   */
  handleServiceStatusChanged(data) {
    console.log(`Status do serviço ${data.serviceId} mudou de ${data.previousStatus} para ${data.currentStatus}`);
  }
  
  /**
   * Handler para evento de inicialização do sistema
   * @private
   * @param {object} data - Dados do evento
   */
  handleSystemStartup(data) {
    console.log("Sistema iniciado, restaurando conexões de integração");
    
    // Restaurar conexões ativas
    this.restoreConnections();
  }
  
  /**
   * Handler para evento de desligamento do sistema
   * @private
   * @param {object} data - Dados do evento
   */
  handleSystemShutdown(data) {
    console.log("Sistema desligando, salvando estado das integrações");
    
    // Salvar estado das conexões
    this.saveConnections();
  }
  
  /**
   * Restaura conexões ativas do banco de dados
   * @private
   * @returns {Promise<void>}
   */
  async restoreConnections() {
    try {
      const connections = await this.toolManager.executeTool("supabase:query", {
        table: "integration_connections",
        filters: { status: 'connected' }
      });
      
      if (connections && connections.length > 0) {
        for (const connection of connections) {
          this.activeConnections[connection.service_id] = {
            id: connection.connection_id,
            serviceId: connection.service_id,
            status: connection.status,
            connectedAt: connection.connected_at,
            expiresAt: connection.expires_at,
            metadata: connection.metadata || {}
          };
        }
        
        console.log(`Restauradas ${connections.length} conexões de integração`);
      }
    } catch (error) {
      console.error("Erro ao restaurar conexões:", error);
    }
  }
  
  /**
   * Salva conexões ativas no banco de dados
   * @private
   * @returns {Promise<void>}
   */
  async saveConnections() {
    try {
      for (const serviceId in this.activeConnections) {
        const connection = this.activeConnections[serviceId];
        
        await this.toolManager.executeTool("supabase:update", {
          table: "integration_connections",
          data: {
            status: connection.status,
            last_checked: new Date().toISOString()
          },
          filters: {
            service_id: serviceId,
            connection_id: connection.id
          }
        });
      }
      
      console.log(`Salvas ${Object.keys(this.activeConnections).length} conexões de integração`);
    } catch (error) {
      console.error("Erro ao salvar conexões:", error);
    }
  }
}

export default IntegrationAgent;
