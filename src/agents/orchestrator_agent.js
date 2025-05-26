// src/agents/orchestrator_agent.js

/**
 * OrchestratorAgent
 * 
 * Responsável por coordenar fluxos complexos e gerenciar a comunicação entre agentes.
 * Implementa estratégias para gerenciar o limite de ferramentas ativas no Windsurf AI.
 */
class OrchestratorAgent {
  constructor(config = {}) {
    this.config = {
      maxTools: 50,
      defaultContexts: ['core'],
      ...config
    };
    
    this.toolManager = require('../utils/tool_manager');
    this.logger = require('../utils/logger')('OrchestratorAgent');
    this.metrics = require('../utils/metrics')('OrchestratorAgent');
    
    // Inicializar com contextos padrão
    this.toolManager.setActiveContexts(this.config.defaultContexts);
    
    // Registrar agentes
    this.agents = {};
  }
  
  /**
   * Inicializa o sistema e configura o ambiente
   */
  async initializeSystem(options = {}) {
    this.logger.info('Inicializando sistema', { options });
    
    try {
      // Ativar ferramentas essenciais
      this.toolManager.activateEssentialTools();
      
      // Verificar configurações de segurança
      const securityAgent = this.getAgent('SecurityAgent');
      const securityConfig = await securityAgent.verifySecurityConfig({
        environment: options.environment || process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      
      if (!securityConfig.valid) {
        throw new Error(`Configuração de segurança inválida: ${securityConfig.reason}`);
      }
      
      // Carregar configurações
      const config = options.configPath 
        ? require(options.configPath) 
        : require('../config/default');
      
      // Inicializar agentes
      await this.initializeAgents(config.agents);
      
      // Configurar canais de notificação
      const notificationAgent = this.getAgent('NotificationAgent');
      await notificationAgent.configureChannels({
        channels: config.notifications.channels,
        defaultPriorities: config.notifications.defaultPriorities
      });
      
      this.logger.info('Sistema inicializado com sucesso');
      this.metrics.increment('system.initialization.success');
      
      return { success: true };
    } catch (error) {
      this.logger.error('Falha ao inicializar sistema', { error });
      this.metrics.increment('system.initialization.failure');
      
      throw error;
    }
  }
  
  /**
   * Inicializa os agentes do sistema
   */
  async initializeAgents(agentConfigs) {
    this.logger.info('Inicializando agentes', { count: Object.keys(agentConfigs).length });
    
    for (const [agentName, agentConfig] of Object.entries(agentConfigs)) {
      try {
        // Importar classe do agente
        const AgentClass = require(`./${agentConfig.module}`);
        
        // Instanciar agente
        this.agents[agentName] = new AgentClass(agentConfig.options);
        
        // Inicializar agente
        if (typeof this.agents[agentName].initialize === 'function') {
          await this.agents[agentName].initialize();
        }
        
        this.logger.info(`Agente ${agentName} inicializado com sucesso`);
      } catch (error) {
        this.logger.error(`Falha ao inicializar agente ${agentName}`, { error });
        throw new Error(`Falha ao inicializar agente ${agentName}: ${error.message}`);
      }
    }
    
    return { success: true };
  }
  
  /**
   * Obtém uma instância de agente pelo nome
   */
  getAgent(agentName) {
    if (!this.agents[agentName]) {
      throw new Error(`Agente não encontrado: ${agentName}`);
    }
    
    return this.agents[agentName];
  }
  
  /**
   * Executa um fluxo de trabalho
   */
  async executeFlow(options) {
    const { flowType, params } = options;
    
    this.logger.info(`Executando fluxo: ${flowType}`, { params });
    this.metrics.increment(`flow.${flowType}.start`);
    
    try {
      // Carregar definição do fluxo
      const flowDefinition = require(`../../.windsurf/flows/${flowType}_flow`);
      
      // Executar fluxo com rastreamento
      const result = await this.tracedOperation(
        `flow.${flowType}`,
        async (context) => {
          return await flowDefinition.execute({
            orchestrator: this,
            params,
            context
          });
        }
      );
      
      this.logger.info(`Fluxo ${flowType} concluído com sucesso`);
      this.metrics.increment(`flow.${flowType}.success`);
      
      return result;
    } catch (error) {
      this.logger.error(`Falha ao executar fluxo ${flowType}`, { error });
      this.metrics.increment(`flow.${flowType}.failure`);
      
      throw error;
    }
  }
  
  /**
   * Executa uma operação com contextos específicos ativados
   */
  async withContext(contexts, operation) {
    const previousContexts = this.toolManager.getActiveContexts();
    
    try {
      // Ativar contextos adicionais
      this.toolManager.setActiveContexts([...previousContexts, ...contexts]);
      
      // Executar operação
      return await operation();
    } finally {
      // Restaurar contextos anteriores
      this.toolManager.setActiveContexts(previousContexts);
    }
  }
  
  /**
   * Ativa um contexto específico
   */
  async activateContext(context) {
    const currentContexts = this.toolManager.getActiveContexts();
    
    if (!currentContexts.includes(context)) {
      this.toolManager.setActiveContexts([...currentContexts, context]);
      this.logger.info(`Contexto ativado: ${context}`);
    }
    
    return { success: true };
  }
  
  /**
   * Desativa um contexto específico
   */
  async deactivateContext(context) {
    const currentContexts = this.toolManager.getActiveContexts();
    
    if (currentContexts.includes(context)) {
      this.toolManager.setActiveContexts(
        currentContexts.filter(c => c !== context)
      );
      this.logger.info(`Contexto desativado: ${context}`);
    }
    
    return { success: true };
  }
  
  /**
   * Autoriza uma operação de assinatura
   */
  async authorizeSubscription(options) {
    const { customerId, planId, customerData, planData } = options;
    
    this.logger.info('Autorizando assinatura', { customerId, planId });
    
    try {
      // Verificar elegibilidade com ProjectManagerAgent
      const projectManagerAgent = this.getAgent('ProjectManagerAgent');
      
      const eligibilityResult = await projectManagerAgent.checkPlanEligibility({
        customerId,
        planId,
        currentProjects: (await projectManagerAgent.getCustomerProjects({ customerId })).length,
        planLimits: planData.limits || {}
      });
      
      if (!eligibilityResult.eligible) {
        return {
          authorized: false,
          reason: eligibilityResult.reason,
          details: eligibilityResult.details
        };
      }
      
      this.logger.info('Assinatura autorizada', { customerId, planId });
      
      return {
        authorized: true,
        projectCount: eligibilityResult.projectCount,
        eligibilityDetails: eligibilityResult.details
      };
    } catch (error) {
      this.logger.error('Falha ao autorizar assinatura', { error });
      
      return {
        authorized: false,
        reason: `Erro interno: ${error.message}`
      };
    }
  }
  
  /**
   * Processa um evento do sistema
   */
  async handleEvent(event) {
    const { type, source, data } = event;
    
    this.logger.info(`Processando evento: ${type}`, { source });
    this.metrics.increment(`event.${type}`);
    
    try {
      switch (type) {
        case 'code_commit':
          return await this.handleCodeCommitEvent(data);
        
        case 'payment_received':
          return await this.handlePaymentEvent(data);
        
        case 'document_updated':
          return await this.handleDocumentEvent(data);
        
        default:
          this.logger.warn(`Tipo de evento não suportado: ${type}`);
          return { success: false, message: `Tipo de evento não suportado: ${type}` };
      }
    } catch (error) {
      this.logger.error(`Falha ao processar evento ${type}`, { error });
      this.metrics.increment(`event.${type}.failure`);
      
      throw error;
    }
  }
  
  /**
   * Processa evento de commit de código
   */
  async handleCodeCommitEvent(data) {
    this.logger.info('Processando evento de commit de código', { commitId: data.commitId });
    
    // Obter projeto associado ao repositório
    const supabaseMCP = require('../mcps/supabase_adapter');
    
    const project = await supabaseMCP.invoke('supabase_query', {
      table: 'projects',
      filter: { repository_id: data.repositoryId }
    });
    
    if (!project || project.length === 0) {
      this.logger.warn(`Projeto não encontrado para o repositório: ${data.repositoryId}`);
      return { success: false, message: `Projeto não encontrado para o repositório: ${data.repositoryId}` };
    }
    
    // Verificar configurações de documentação automática do projeto
    const projectConfig = await this.getProjectConfig(project[0].id);
    
    if (!projectConfig.autoDocumentation.enabled) {
      this.logger.info('Documentação automática desativada para este projeto');
      return { success: true, message: 'Documentação automática desativada para este projeto' };
    }
    
    // Solicitar atualização de documentação
    const documentAgent = this.getAgent('DocumentAgent');
    
    const result = await documentAgent.updateCodeDocumentation({
      projectId: project[0].id,
      repositoryId: data.repositoryId,
      commitData: {
        id: data.commitId,
        message: data.message,
        author: data.author,
        timestamp: data.timestamp
      },
      codeFiles: data.codeFiles,
      config: projectConfig.autoDocumentation
    });
    
    return result;
  }
  
  /**
   * Obtém configuração de um projeto
   */
  async getProjectConfig(projectId) {
    const supabaseMCP = require('../mcps/supabase_adapter');
    
    const config = await supabaseMCP.invoke('supabase_query', {
      table: 'project_configs',
      filter: { project_id: projectId }
    });
    
    if (!config || config.length === 0) {
      // Retornar configuração padrão
      return {
        autoDocumentation: {
          enabled: true,
          generateOnCommit: true,
          includeDesignReferences: true,
          format: 'markdown'
        }
      };
    }
    
    return config[0];
  }
  
  /**
   * Executa uma operação com rastreamento
   */
  async tracedOperation(operationName, operation, context = {}) {
    const traceId = context.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = context.spanId;
    
    const span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: context.tags || {}
    };
    
    try {
      // Registrar início da operação
      await this.recordSpanStart(span);
      
      // Executar operação com contexto de trace
      const result = await operation({
        ...context,
        traceId,
        spanId,
        tracer: {
          createChildSpan: (childName) => this.tracedOperation(
            childName,
            (childContext) => childContext.operation(childContext),
            { ...context, traceId, parentSpanId: spanId }
          )
        }
      });
      
      // Registrar fim bem-sucedido
      await this.recordSpanEnd(span, {
        status: 'success',
        endTime: Date.now()
      });
      
      return result;
    } catch (error) {
      // Registrar erro
      await this.recordSpanEnd(span, {
        status: 'error',
        endTime: Date.now(),
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Gera um ID de rastreamento
   */
  generateTraceId() {
    return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Gera um ID de span
   */
  generateSpanId() {
    return `span-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Registra o início de um span
   */
  async recordSpanStart(span) {
    this.logger.debug('Span iniciado', { span });
    
    // Aqui poderia persistir em um sistema de rastreamento distribuído
    return { success: true };
  }
  
  /**
   * Registra o fim de um span
   */
  async recordSpanEnd(span, data) {
    this.logger.debug('Span finalizado', { span, data });
    
    // Aqui poderia persistir em um sistema de rastreamento distribuído
    return { success: true };
  }
}

module.exports = OrchestratorAgent;
