/**
 * AIAssistantAgent - Responsável por fornecer assistência inteligente e contextual
 * 
 * Este agente implementa as regras definidas em ai_assistant_rules.md e gerencia:
 * - Assistência contextual baseada nas ações do usuário
 * - Respostas a perguntas sobre projetos, tarefas e documentação
 * - Sugestões inteligentes para otimização de fluxos de trabalho
 * - Análise de dados e identificação de padrões
 * - Geração e revisão de conteúdo
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';
import sequentialThinkingMCP from '../mcps/sequential_thinking_adapter.js';

class AIAssistantAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('AIAssistantAgent');
    this.metrics = createMetrics('AIAssistantAgent');
    this.sequentialThinkingMCP = sequentialThinkingMCP;
    
    // Configurações do agente
    this.model = process.env.AI_ASSISTANT_MODEL || "claude-task-master";
    this.temperature = parseFloat(process.env.AI_ASSISTANT_TEMPERATURE || "0.7");
    this.maxTokens = parseInt(process.env.AI_ASSISTANT_MAX_TOKENS || "2000", 10);
    this.historySize = parseInt(process.env.AI_ASSISTANT_HISTORY_SIZE || "10", 10);
    
    // Histórico de mensagens e contexto
    this.messageHistory = [];
    this.contextData = {};
    
    // Inicializar ferramentas
    this.initializeTools();
    
    console.log('AIAssistantAgent inicializado com sucesso');
    this.learningEnabled = process.env.AI_ASSISTANT_LEARNING_ENABLED === "true";
    this.suggestionThreshold = parseFloat(process.env.AI_ASSISTANT_SUGGESTION_THRESHOLD || "0.75");
    this.historyRetention = parseInt(process.env.AI_ASSISTANT_HISTORY_RETENTION || "30", 10);
    
    // Configurações de personalidade
    this.personality = {
      tone: process.env.AI_ASSISTANT_TONE || "casual",
      verbosity: process.env.AI_ASSISTANT_VERBOSITY || "moderate",
      proactivity: process.env.AI_ASSISTANT_PROACTIVITY || "medium",
      technicality: process.env.AI_ASSISTANT_TECHNICALITY || "intermediate"
    };
    
    // Inicializar ferramentas necessárias
    this.initializeTools();
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    console.log("AIAssistantAgent inicializado com sucesso");
  }
  
  /**
   * Inicializa as ferramentas necessárias para o AIAssistantAgent
   * @private
   */
  initializeTools() {
    // Ferramentas do Claude-TaskMaster para processamento de linguagem natural
    this.toolManager.registerTool("claude-task-master:ask");
    this.toolManager.registerTool("claude-task-master:suggest");
    this.toolManager.registerTool("claude-task-master:analyze");
    this.toolManager.registerTool("claude-task-master:generate");
    this.toolManager.registerTool("claude-task-master:explain");
    
    // Ferramentas do Sequential-Thinking para raciocínio em etapas
    this.toolManager.registerTool("sequential-thinking:step_by_step");
    this.toolManager.registerTool("sequential-thinking:dependency_analysis");
    
    // Ferramentas do Supabase para armazenamento e consulta
    this.toolManager.registerTool("supabase:query");
    this.toolManager.registerTool("supabase:insert");
    this.toolManager.registerTool("supabase:update");
    
    // Ferramentas do GitHub para acesso a documentação e código
    this.toolManager.registerTool("github:repos:get_content");
    this.toolManager.registerTool("github:search:code");
    
    // Ferramentas do Figma para referências visuais
    this.toolManager.registerTool("figma:get_file");
    this.toolManager.registerTool("figma:get_node");
    
    // Ferramentas do Puppeteer para capturas de tela
    this.toolManager.registerTool("puppeteer:screenshot");
  }
  
  /**
   * Registra handlers para eventos relevantes
   * @private
   */
  registerEventHandlers() {
    // Eventos de usuário
    this.toolManager.on("user:view_changed", this.handleViewChanged.bind(this));
    this.toolManager.on("user:action_performed", this.handleActionPerformed.bind(this));
    
    // Eventos de entidades
    this.toolManager.on("project:updated", this.handleProjectUpdated.bind(this));
    this.toolManager.on("task:updated", this.handleTaskUpdated.bind(this));
    this.toolManager.on("document:updated", this.handleDocumentUpdated.bind(this));
    
    // Eventos do TaskMaster
    this.toolManager.on("taskmaster:suggestion", this.handleTaskMasterSuggestion.bind(this));
  }
  
  /**
   * Responde a uma pergunta do usuário com base no contexto fornecido
   * @param {string} userId - ID do usuário fazendo a pergunta
   * @param {string} question - Texto da pergunta
   * @param {Object} context - Contexto adicional (opcional)
   * @returns {Promise<Object>} Objeto com resposta e informações relacionadas
   * @throws {Error} Se a resposta falhar
   */
  async askQuestion(userId, question, context = {}) {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedQuestion = this.securityAgent.sanitizeInput(question, {
        type: "string",
        minLength: 1,
        maxLength: 1000
      });
      
      const sanitizedContext = this.securityAgent.sanitizeInput(context, {
        type: "object",
        properties: {
          currentView: { type: "string" },
          projectId: { type: "string" },
          taskId: { type: "string" },
          documentId: { type: "string" },
          recentActions: { type: "array", items: { type: "string" } }
        }
      });
      
      // Enriquecer contexto com dados adicionais
      const enrichedContext = await this.enrichContext(userId, sanitizedContext);
      
      // Obter histórico de interações recentes
      const interactionHistory = await this.getInteractionHistory(userId, 5);
      
      // Preparar prompt para o Claude-TaskMaster
      const prompt = this.prepareQuestionPrompt(
        sanitizedQuestion,
        enrichedContext,
        interactionHistory
      );
      
      // Obter resposta do Claude-TaskMaster
      const response = await this.toolManager.executeTool("claude-task-master:ask", {
        prompt,
        userId,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        personality: this.personality
      });
      
      if (!response || !response.answer) {
        throw new Error("Falha ao obter resposta do assistente");
      }
      
      // Registrar interação para aprendizado
      if (this.learningEnabled) {
        await this.recordInteraction(userId, {
          type: "question",
          question: sanitizedQuestion,
          answer: response.answer,
          context: sanitizedContext,
          timestamp: new Date().toISOString()
        });
      }
      
      // Emitir evento de pergunta respondida
      this.toolManager.emit("assistant:question_answered", {
        userId,
        question: sanitizedQuestion,
        answer: response.answer,
        timestamp: new Date().toISOString()
      });
      
      return {
        answer: response.answer,
        confidence: response.confidence || 0.9,
        sources: response.sources || [],
        relatedTopics: response.relatedTopics || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao responder pergunta:", error);
      throw error;
    }
  }
  
  /**
   * Gera sugestões inteligentes com base no contexto atual
   * @param {string} userId - ID do usuário solicitando sugestões
   * @param {Object} context - Contexto atual (projeto, tarefa, etc.)
   * @param {string} type - Tipo de sugestão (workflow, task, documentation, etc.)
   * @returns {Promise<Array>} Array de sugestões com detalhes e confiança
   * @throws {Error} Se a geração de sugestões falhar
   */
  async getSuggestions(userId, context, type) {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedContext = this.securityAgent.sanitizeInput(context, {
        type: "object",
        properties: {
          projectId: { type: "string" },
          taskId: { type: "string" },
          currentView: { type: "string" },
          recentActions: { type: "array", items: { type: "string" } }
        }
      });
      
      const sanitizedType = this.securityAgent.sanitizeInput(type, {
        type: "string",
        enum: ["workflow_optimization", "task_management", "documentation", "general"]
      });
      
      // Enriquecer contexto com dados adicionais
      const enrichedContext = await this.enrichContext(userId, sanitizedContext);
      
      // Obter sugestões do Claude-TaskMaster
      const suggestions = await this.toolManager.executeTool("claude-task-master:suggest", {
        userId,
        context: enrichedContext,
        type: sanitizedType,
        model: this.model,
        temperature: this.temperature,
        threshold: this.suggestionThreshold,
        personality: this.personality
      });
      
      if (!suggestions || !Array.isArray(suggestions)) {
        throw new Error("Falha ao obter sugestões do assistente");
      }
      
      // Filtrar sugestões com base no limiar de confiança
      const filteredSuggestions = suggestions.filter(
        suggestion => suggestion.confidence >= this.suggestionThreshold
      );
      
      // Emitir evento de sugestões fornecidas
      this.toolManager.emit("assistant:suggestion_provided", {
        userId,
        type: sanitizedType,
        count: filteredSuggestions.length,
        timestamp: new Date().toISOString()
      });
      
      return filteredSuggestions;
    } catch (error) {
      console.error("Erro ao gerar sugestões:", error);
      throw error;
    }
  }
  
  /**
   * Analisa conteúdo fornecido pelo usuário
   * @param {string} userId - ID do usuário solicitando análise
   * @param {string} content - Conteúdo a ser analisado
   * @param {Object} options - Opções de análise
   * @returns {Promise<Object>} Objeto com resultados da análise
   * @throws {Error} Se a análise falhar
   */
  async analyzeContent(userId, content, options = {}) {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedContent = this.securityAgent.sanitizeInput(content, {
        type: "string",
        minLength: 1,
        maxLength: 10000
      });
      
      const sanitizedOptions = this.securityAgent.sanitizeInput(options, {
        type: "object",
        properties: {
          type: { type: "string" },
          analysisGoal: { type: "string" },
          depth: { type: "string", enum: ["basic", "detailed", "comprehensive"] }
        }
      });
      
      // Obter análise do Claude-TaskMaster
      const analysis = await this.toolManager.executeTool("claude-task-master:analyze", {
        content: sanitizedContent,
        options: sanitizedOptions,
        userId,
        model: this.model
      });
      
      if (!analysis) {
        throw new Error("Falha ao analisar conteúdo");
      }
      
      // Para análises complexas, usar Sequential-Thinking
      if (sanitizedOptions.depth === "comprehensive") {
        const detailedAnalysis = await this.toolManager.executeTool("sequential-thinking:step_by_step", {
          initialAnalysis: analysis,
          content: sanitizedContent,
          steps: ["identify", "categorize", "evaluate", "recommend"]
        });
        
        if (detailedAnalysis) {
          Object.assign(analysis, detailedAnalysis);
        }
      }
      
      return analysis;
    } catch (error) {
      console.error("Erro ao analisar conteúdo:", error);
      throw error;
    }
  }
  
  /**
   * Gera conteúdo com base em um prompt
   * @param {string} userId - ID do usuário solicitando geração
   * @param {string} prompt - Descrição do conteúdo desejado
   * @param {Object} options - Opções de geração
   * @returns {Promise<Object>} Objeto com conteúdo gerado
   * @throws {Error} Se a geração falhar
   */
  async generateContent(userId, prompt, options = {}) {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedPrompt = this.securityAgent.sanitizeInput(prompt, {
        type: "string",
        minLength: 1,
        maxLength: 1000
      });
      
      const sanitizedOptions = this.securityAgent.sanitizeInput(options, {
        type: "object",
        properties: {
          type: { type: "string" },
          format: { type: "string" },
          length: { type: "string", enum: ["short", "medium", "long"] },
          tone: { type: "string" }
        }
      });
      
      // Obter dados adicionais para enriquecer o prompt
      let additionalData = {};
      
      if (sanitizedOptions.type === "api_documentation" && sanitizedOptions.endpoints) {
        // Obter informações detalhadas sobre endpoints
        additionalData.endpointsDetails = await this.getEndpointsDetails(sanitizedOptions.endpoints);
      } else if (sanitizedOptions.type === "project_summary" && sanitizedOptions.projectId) {
        // Obter detalhes do projeto
        additionalData.projectDetails = await this.projectManagerAgent.getProjectDetails(
          sanitizedOptions.projectId,
          userId
        );
      }
      
      // Gerar conteúdo com Claude-TaskMaster
      const generatedContent = await this.toolManager.executeTool("claude-task-master:generate", {
        prompt: sanitizedPrompt,
        options: {
          ...sanitizedOptions,
          additionalData
        },
        userId,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens * 2, // Mais tokens para geração de conteúdo
        personality: {
          ...this.personality,
          tone: sanitizedOptions.tone || this.personality.tone
        }
      });
      
      if (!generatedContent || !generatedContent.content) {
        throw new Error("Falha ao gerar conteúdo");
      }
      
      // Emitir evento de conteúdo gerado
      this.toolManager.emit("assistant:content_generated", {
        userId,
        type: sanitizedOptions.type || "general",
        format: sanitizedOptions.format || "text",
        timestamp: new Date().toISOString()
      });
      
      return {
        content: generatedContent.content,
        format: sanitizedOptions.format || "text",
        metadata: generatedContent.metadata || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao gerar conteúdo:", error);
      throw error;
    }
  }
  
  /**
   * Explica uma funcionalidade do sistema
   * @param {string} userId - ID do usuário solicitando explicação
   * @param {string} featureId - ID da funcionalidade
   * @param {string} detailLevel - Nível de detalhe (basic, intermediate, advanced)
   * @returns {Promise<Object>} Objeto com explicação e exemplos
   * @throws {Error} Se a explicação falhar
   */
  async explainFeature(userId, featureId, detailLevel = "intermediate") {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedFeatureId = this.securityAgent.sanitizeInput(featureId, {
        type: "string",
        minLength: 1
      });
      
      const sanitizedDetailLevel = this.securityAgent.sanitizeInput(detailLevel, {
        type: "string",
        enum: ["basic", "intermediate", "advanced"]
      });
      
      // Obter informações sobre a funcionalidade
      const featureInfo = await this.getFeatureInfo(sanitizedFeatureId);
      
      if (!featureInfo) {
        throw new Error(`Funcionalidade não encontrada: ${sanitizedFeatureId}`);
      }
      
      // Obter explicação do Claude-TaskMaster
      const explanation = await this.toolManager.executeTool("claude-task-master:explain", {
        featureInfo,
        detailLevel: sanitizedDetailLevel,
        userId,
        model: this.model,
        personality: {
          ...this.personality,
          technicality: sanitizedDetailLevel === "basic" ? "basic" : 
                        sanitizedDetailLevel === "advanced" ? "advanced" : 
                        "intermediate"
        }
      });
      
      if (!explanation) {
        throw new Error("Falha ao explicar funcionalidade");
      }
      
      // Para explicações avançadas, usar Sequential-Thinking
      if (sanitizedDetailLevel === "advanced") {
        const detailedExplanation = await this.toolManager.executeTool("sequential-thinking:step_by_step", {
          initialExplanation: explanation,
          featureInfo,
          steps: ["concept", "implementation", "usage", "edge_cases", "best_practices"]
        });
        
        if (detailedExplanation) {
          Object.assign(explanation, detailedExplanation);
        }
      }
      
      // Obter capturas de tela se disponíveis
      let screenshots = [];
      if (featureInfo.screenshotUrls && featureInfo.screenshotUrls.length > 0) {
        screenshots = featureInfo.screenshotUrls;
      } else if (featureInfo.screenshotPaths && featureInfo.screenshotPaths.length > 0) {
        // Gerar capturas de tela usando Puppeteer
        screenshots = await Promise.all(
          featureInfo.screenshotPaths.map(async path => {
            try {
              return await this.toolManager.executeTool("puppeteer:screenshot", {
                path,
                fullPage: false,
                selector: featureInfo.screenshotSelector
              });
            } catch (error) {
              console.error(`Erro ao capturar tela para ${path}:`, error);
              return null;
            }
          })
        ).then(results => results.filter(Boolean));
      }
      
      // Emitir evento de funcionalidade explicada
      this.toolManager.emit("assistant:feature_explained", {
        userId,
        featureId: sanitizedFeatureId,
        detailLevel: sanitizedDetailLevel,
        timestamp: new Date().toISOString()
      });
      
      return {
        title: featureInfo.title,
        description: explanation.description,
        steps: explanation.steps || [],
        examples: explanation.examples || [],
        tips: explanation.tips || [],
        relatedFeatures: explanation.relatedFeatures || [],
        screenshots,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao explicar funcionalidade:", error);
      throw error;
    }
  }
  
  /**
   * Fornece ajuda contextual com base na tela atual e ação
   * @param {string} userId - ID do usuário solicitando ajuda
   * @param {string} currentView - Tela atual do usuário
   * @param {string} action - Ação atual ou pretendida
   * @returns {Promise<Object>} Objeto com ajuda contextual
   * @throws {Error} Se a obtenção de ajuda falhar
   */
  async getContextualHelp(userId, currentView, action) {
    try {
      // Validar permissões do usuário
      const canUseAssistant = await this.securityAgent.authorizeAccess(
        userId,
        "ai_assistant",
        null,
        "use"
      );
      
      if (!canUseAssistant) {
        throw new Error("Usuário não tem permissão para usar o assistente");
      }
      
      // Sanitizar entrada
      const sanitizedView = this.securityAgent.sanitizeInput(currentView, {
        type: "string",
        minLength: 1
      });
      
      const sanitizedAction = this.securityAgent.sanitizeInput(action, {
        type: "string",
        minLength: 1
      });
      
      // Obter informações sobre a tela e ação
      const viewInfo = await this.getViewInfo(sanitizedView);
      const actionInfo = await this.getActionInfo(sanitizedView, sanitizedAction);
      
      if (!viewInfo) {
        throw new Error(`Tela não encontrada: ${sanitizedView}`);
      }
      
      // Obter histórico recente do usuário para contexto
      const userHistory = await this.getUserHistory(userId, 10);
      
      // Preparar contexto para ajuda
      const helpContext = {
        view: viewInfo,
        action: actionInfo,
        userHistory,
        userPreferences: await this.getUserPreferences(userId)
      };
      
      // Obter ajuda contextual do Claude-TaskMaster
      const help = await this.toolManager.executeTool("claude-task-master:ask", {
        prompt: `Fornecer ajuda contextual para usuário na tela ${sanitizedView} realizando ação ${sanitizedAction}`,
        context: helpContext,
        userId,
        model: this.model,
        temperature: 0.3, // Menor temperatura para respostas mais precisas
        personality: this.personality
      });
      
      if (!help || !help.content) {
        throw new Error("Falha ao obter ajuda contextual");
      }
      
      return {
        content: help.content,
        relatedActions: help.relatedActions || [],
        shortcuts: help.shortcuts || [],
        tips: help.tips || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao obter ajuda contextual:", error);
      throw error;
    }
  }
  
  /**
   * Aprende com interações para melhorar assistência futura
   * @param {Object} interactionData - Dados da interação
   * @returns {Promise<Object>} Status da operação de aprendizado
   * @throws {Error} Se o aprendizado falhar
   */
  async learnFromInteraction(interactionData) {
    try {
      if (!this.learningEnabled) {
        return { status: "skipped", reason: "Learning disabled" };
      }
      
      // Sanitizar dados de interação
      const sanitizedData = this.securityAgent.sanitizeInput(interactionData, {
        type: "object",
        required: ["userId", "type", "data"],
        properties: {
          userId: { type: "string" },
          type: { type: "string", enum: ["question", "suggestion", "feedback"] },
          data: { type: "object" },
          timestamp: { type: "string" }
        }
      });
      
      // Armazenar interação no histórico
      await this.toolManager.executeTool("supabase:insert", {
        table: "assistant_interactions",
        data: {
          user_id: sanitizedData.userId,
          type: sanitizedData.type,
          data: sanitizedData.data,
          timestamp: sanitizedData.timestamp || new Date().toISOString()
        }
      });
      
      // Analisar dados para aprendizado
      const learningResult = await this.toolManager.executeTool("claude-task-master:analyze", {
        type: "interaction_learning",
        data: sanitizedData
      });
      
      if (learningResult && learningResult.insights) {
        // Armazenar insights para uso futuro
        await this.toolManager.executeTool("supabase:insert", {
          table: "assistant_learning",
          data: {
            user_id: sanitizedData.userId,
            interaction_type: sanitizedData.type,
            insights: learningResult.insights,
            timestamp: new Date().toISOString()
          }
        });
        
        // Emitir evento de aprendizado atualizado
        this.toolManager.emit("assistant:learning_updated", {
          userId: sanitizedData.userId,
          type: sanitizedData.type,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        status: "success",
        insightsCount: learningResult?.insights?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao aprender com interação:", error);
      throw error;
    }
  }
  
  /**
   * Enriquece o contexto com dados adicionais
   * @private
   * @param {string} userId - ID do usuário
   * @param {Object} context - Contexto original
   * @returns {Promise<Object>} Contexto enriquecido
   */
  async enrichContext(userId, context) {
    const enrichedContext = { ...context };
    
    try {
      // Adicionar informações do usuário
      const userInfo = await this.toolManager.executeTool("supabase:query", {
        table: "users",
        filters: { id: userId },
        select: "id, name, role, preferences, created_at"
      });
      
      if (userInfo && userInfo.length > 0) {
        enrichedContext.user = userInfo[0];
      }
      
      // Adicionar informações do projeto se projectId estiver presente
      if (context.projectId) {
        const projectInfo = await this.projectManagerAgent.getProjectDetails(
          context.projectId,
          userId
        );
        
        if (projectInfo) {
          enrichedContext.project = projectInfo;
        }
      }
      
      // Adicionar informações da tarefa se taskId estiver presente
      if (context.taskId) {
        const taskInfo = await this.projectManagerAgent.getTaskDetails(
          context.taskId,
          userId
        );
        
        if (taskInfo) {
          enrichedContext.task = taskInfo;
        }
      }
      
      // Adicionar informações do documento se documentId estiver presente
      if (context.documentId) {
        const documentInfo = await this.documentAgent.getDocumentDetails(
          context.documentId,
          userId
        );
        
        if (documentInfo) {
          enrichedContext.document = documentInfo;
        }
      }
      
      // Adicionar informações da tela atual se currentView estiver presente
      if (context.currentView) {
        const viewInfo = await this.getViewInfo(context.currentView);
        
        if (viewInfo) {
          enrichedContext.view = viewInfo;
        }
      }
    } catch (error) {
      console.error("Erro ao enriquecer contexto:", error);
      // Continuar com o contexto original em caso de erro
    }
    
    return enrichedContext;
  }
  
  /**
   * Obtém histórico de interações recentes do usuário
   * @private
   * @param {string} userId - ID do usuário
   * @param {number} limit - Número máximo de interações
   * @returns {Promise<Array>} Histórico de interações
   */
  async getInteractionHistory(userId, limit = 5) {
    try {
      const history = await this.toolManager.executeTool("supabase:query", {
        table: "assistant_interactions",
        filters: { user_id: userId },
        order: { column: "timestamp", direction: "desc" },
        limit
      });
      
      return history || [];
    } catch (error) {
      console.error("Erro ao obter histórico de interações:", error);
      return [];
    }
  }
  
  /**
   * Registra uma interação para aprendizado futuro
   * @private
   * @param {string} userId - ID do usuário
   * @param {Object} interaction - Dados da interação
   * @returns {Promise<void>}
   */
  async recordInteraction(userId, interaction) {
    try {
      await this.toolManager.executeTool("supabase:insert", {
        table: "assistant_interactions",
        data: {
          user_id: userId,
          type: interaction.type,
          data: {
            question: interaction.question,
            answer: interaction.answer,
            context: interaction.context
          },
          timestamp: interaction.timestamp || new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erro ao registrar interação:", error);
    }
  }
  
  /**
   * Prepara o prompt para uma pergunta
   * @private
   * @param {string} question - Pergunta do usuário
   * @param {Object} context - Contexto enriquecido
   * @param {Array} history - Histórico de interações
   * @returns {Object} Prompt preparado
   */
  prepareQuestionPrompt(question, context, history) {
    return {
      question,
      context,
      history,
      personality: this.personality
    };
  }
  
  /**
   * Obtém informações sobre uma funcionalidade
   * @private
   * @param {string} featureId - ID da funcionalidade
   * @returns {Promise<Object>} Informações da funcionalidade
   */
  async getFeatureInfo(featureId) {
    try {
      // Primeiro, verificar no banco de dados
      const featureFromDb = await this.toolManager.executeTool("supabase:query", {
        table: "features",
        filters: { id: featureId },
        single: true
      });
      
      if (featureFromDb) {
        return featureFromDb;
      }
      
      // Se não encontrado, verificar na documentação do GitHub
      const featureFromGithub = await this.toolManager.executeTool("github:repos:get_content", {
        owner: "windsurf",
        repo: "documentation",
        path: `features/${featureId}.md`
      });
      
      if (featureFromGithub) {
        // Parsear conteúdo markdown para obter informações estruturadas
        return this.parseFeatureMarkdown(featureFromGithub.content);
      }
      
      // Se ainda não encontrado, retornar informações básicas
      return {
        id: featureId,
        title: featureId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Funcionalidade ${featureId}`,
        category: "general"
      };
    } catch (error) {
      console.error(`Erro ao obter informações da funcionalidade ${featureId}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém informações sobre uma tela
   * @private
   * @param {string} viewId - ID da tela
   * @returns {Promise<Object>} Informações da tela
   */
  async getViewInfo(viewId) {
    try {
      // Verificar no banco de dados
      const viewFromDb = await this.toolManager.executeTool("supabase:query", {
        table: "views",
        filters: { id: viewId },
        single: true
      });
      
      if (viewFromDb) {
        return viewFromDb;
      }
      
      // Informações básicas se não encontrado
      return {
        id: viewId,
        name: viewId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: "unknown"
      };
    } catch (error) {
      console.error(`Erro ao obter informações da tela ${viewId}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém informações sobre uma ação
   * @private
   * @param {string} viewId - ID da tela
   * @param {string} actionId - ID da ação
   * @returns {Promise<Object>} Informações da ação
   */
  async getActionInfo(viewId, actionId) {
    try {
      // Verificar no banco de dados
      const actionFromDb = await this.toolManager.executeTool("supabase:query", {
        table: "actions",
        filters: { view_id: viewId, id: actionId },
        single: true
      });
      
      if (actionFromDb) {
        return actionFromDb;
      }
      
      // Informações básicas se não encontrado
      return {
        id: actionId,
        name: actionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        view_id: viewId
      };
    } catch (error) {
      console.error(`Erro ao obter informações da ação ${actionId}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém histórico recente do usuário
   * @private
   * @param {string} userId - ID do usuário
   * @param {number} limit - Número máximo de eventos
   * @returns {Promise<Array>} Histórico do usuário
   */
  async getUserHistory(userId, limit = 10) {
    try {
      const history = await this.toolManager.executeTool("supabase:query", {
        table: "user_activity",
        filters: { user_id: userId },
        order: { column: "timestamp", direction: "desc" },
        limit
      });
      
      return history || [];
    } catch (error) {
      console.error("Erro ao obter histórico do usuário:", error);
      return [];
    }
  }
  
  /**
   * Obtém preferências do usuário
   * @private
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Preferências do usuário
   */
  async getUserPreferences(userId) {
    try {
      const preferences = await this.toolManager.executeTool("supabase:query", {
        table: "user_preferences",
        filters: { user_id: userId },
        single: true
      });
      
      return preferences || {};
    } catch (error) {
      console.error("Erro ao obter preferências do usuário:", error);
      return {};
    }
  }
  
  /**
   * Obtém detalhes de endpoints para documentação
   * @private
   * @param {Array} endpoints - Lista de endpoints
   * @returns {Promise<Array>} Detalhes dos endpoints
   */
  async getEndpointsDetails(endpoints) {
    try {
      // Implementação para obter detalhes de endpoints
      return endpoints.map(endpoint => ({
        ...endpoint,
        description: endpoint.description || `Endpoint ${endpoint.path}`,
        responseExample: endpoint.responseExample || { status: "success" }
      }));
    } catch (error) {
      console.error("Erro ao obter detalhes de endpoints:", error);
      return endpoints;
    }
  }
  
  /**
   * Parseia markdown de funcionalidade para obter informações estruturadas
   * @private
   * @param {string} markdown - Conteúdo markdown
   * @returns {Object} Informações estruturadas
   */
  parseFeatureMarkdown(markdown) {
    // Implementação simplificada de parser de markdown
    const lines = markdown.split('\n');
    const result = {
      title: '',
      description: '',
      steps: [],
      examples: []
    };
    
    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        result.title = line.substring(2).trim();
      } else if (line.startsWith('## Description')) {
        currentSection = 'description';
      } else if (line.startsWith('## Steps')) {
        currentSection = 'steps';
      } else if (line.startsWith('## Examples')) {
        currentSection = 'examples';
      } else if (currentSection === 'description' && line.trim()) {
        result.description += line + ' ';
      } else if (currentSection === 'steps' && line.match(/^\d+\./)) {
        result.steps.push(line.replace(/^\d+\.\s*/, '').trim());
      } else if (currentSection === 'examples' && line.trim() && !line.startsWith('#')) {
        result.examples.push(line.trim());
      }
    }
    
    result.description = result.description.trim();
    return result;
  }
  
  // Handlers de eventos
  
  /**
   * Handler para evento de mudança de tela
   * @private
   * @param {Object} data - Dados do evento
   */
  handleViewChanged(data) {
    // Implementação do handler
    console.log(`Usuário ${data.userId} mudou para a tela ${data.view}`);
    
    // Verificar se deve fornecer sugestões proativas
    if (this.personality.proactivity === "high") {
      this.provideSuggestions(data.userId, {
        currentView: data.view,
        previousView: data.previousView
      });
    }
  }
  
  /**
   * Handler para evento de ação realizada
   * @private
   * @param {Object} data - Dados do evento
   */
  handleActionPerformed(data) {
    // Implementação do handler
    console.log(`Usuário ${data.userId} realizou ação ${data.action} na tela ${data.view}`);
  }
  
  /**
   * Handler para evento de projeto atualizado
   * @private
   * @param {Object} data - Dados do evento
   */
  handleProjectUpdated(data) {
    // Implementação do handler
    console.log(`Projeto ${data.projectId} atualizado por ${data.userId}`);
  }
  
  /**
   * Handler para evento de tarefa atualizada
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskUpdated(data) {
    // Implementação do handler
    console.log(`Tarefa ${data.taskId} atualizada por ${data.userId}`);
  }
  
  /**
   * Handler para evento de documento atualizado
   * @private
   * @param {Object} data - Dados do evento
   */
  handleDocumentUpdated(data) {
    // Implementação do handler
    console.log(`Documento ${data.documentId} atualizado por ${data.userId}`);
  }
  
  /**
   * Handler para evento de sugestão do TaskMaster
   * @private
   * @param {Object} data - Dados do evento
   */
  handleTaskMasterSuggestion(data) {
    // Implementação do handler
    console.log(`TaskMaster gerou sugestão para ${data.userId}`);
    
    // Processar sugestão e possivelmente notificar usuário
    if (data.suggestion && data.suggestion.confidence >= this.suggestionThreshold) {
      this.toolManager.emit("assistant:suggestion_provided", {
        userId: data.userId,
        suggestion: data.suggestion,
        source: "taskmaster",
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Fornece sugestões proativas com base no contexto
   * @private
   * @param {string} userId - ID do usuário
   * @param {Object} context - Contexto atual
   * @returns {Promise<void>}
   */
  async provideSuggestions(userId, context) {
    try {
      // Verificar se o usuário permite sugestões proativas
      const userPreferences = await this.getUserPreferences(userId);
      
      if (userPreferences.disableProactiveSuggestions) {
        return;
      }
      
      // Obter sugestões do Claude-TaskMaster
      const suggestions = await this.getSuggestions(userId, context, "general");
      
      if (suggestions && suggestions.length > 0) {
        // Emitir evento com sugestões
        this.toolManager.emit("assistant:suggestion_provided", {
          userId,
          suggestions,
          context,
          proactive: true,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Erro ao fornecer sugestões proativas:", error);
    }
  }
}

export default AIAssistantAgent;
