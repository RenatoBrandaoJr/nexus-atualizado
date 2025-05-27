// src/utils/tool_manager.js

/**
 * ToolManager
 * 
 * Gerencia a ativação e desativação dinâmica de ferramentas no sistema Nexus.
 * Implementa estratégias para respeitar o limite de 50 ferramentas ativas.
 */

import { EventEmitter } from 'events';

class ToolManager extends EventEmitter {
  constructor() {
    super();
    this.tools = new Map();
    this.activeTools = new Set();
    this.activeContexts = new Set(['default']);
    
    // Logger interno
    this.logger = { 
      info: console.log,
      error: console.error,
      debug: console.debug,
      warn: console.warn
    };
    
    // Ferramentas essenciais que sempre devem estar ativas
    this.essentialTools = [
      'sequential_analyze', 'supabase_query', 'supabase_insert', 
      'supabase_update', 'github_pull', 'taskmaster_generate'
    ];
    
    // Ferramentas organizadas por contexto
    this.contextualTools = {
      'documentation': [
        'figma_get_file', 'figma_export_assets', 'figma_get_components',
        'puppeteer_screenshot', 'puppeteer_pdf', 'context_store', 
        'context_retrieve'
      ],
      'kanban': [
        'browser_navigate', 'browser_click', 'browser_input',
        'browser_screenshot', 'context_store'
      ],
      'dashboard': [
        'puppeteer_pdf', 'browser_navigate', 'browser_screenshot',
        'context_analyze'
      ],
      'payment': [
        'stripe_payment', 'stripe_subscription', 'stripe_customer',
        'stripe_invoice', 'stripe_refund'
      ],
      'code': [
        'github_clone', 'github_commit', 'github_push',
        'github_pull_request', 'code_analyze', 'code_format'
      ]
    };
    
    // Inicializar as ferramentas essenciais como ativas
    this.essentialTools.forEach(tool => this.activeTools.add(tool));
  }
  
  /**
   * Define os contextos ativos para o gerenciador de ferramentas
   * @param {Array<string>} contexts - Lista de contextos a serem ativados
   * @returns {ToolManager} - Instância do gerenciador para encadeamento
   */
  setActiveContexts(contexts) {
    if (!Array.isArray(contexts)) {
      this.logger.warn('setActiveContexts espera um array de contextos');
      return this;
    }
    
    this.activeContexts.clear();
    contexts.forEach(context => this.activeContexts.add(context));
    this.logger.debug(`Contextos ativos: ${Array.from(this.activeContexts).join(', ')}`);
    
    // Atualizar ferramentas ativas com base nos novos contextos
    this._refreshActiveTools();
    
    return this;
  }
  
  /**
   * Atualiza as ferramentas ativas com base nos contextos ativos
   * @private
   */
  _refreshActiveTools() {
    // Limpar ferramentas ativas mantendo apenas as essenciais
    this.activeTools.clear();
    this.essentialTools.forEach(tool => this.activeTools.add(tool));
    
    // Adicionar ferramentas dos contextos ativos
    for (const context of this.activeContexts) {
      const contextTools = this.contextualTools[context] || [];
      contextTools.forEach(tool => this.activeTools.add(tool));
    }
    
    // Verificar se ultrapassamos o limite de 50 ferramentas
    this._enforceLimits();
    
    this.logger.debug(`Ferramentas ativas atualizadas: ${Array.from(this.activeTools).join(', ')}`);
  }
  
  /**
   * Garante que não ultrapassemos o limite de 50 ferramentas ativas
   * @private
   */
  _enforceLimits() {
    const MAX_TOOLS = 50;
    if (this.activeTools.size <= MAX_TOOLS) return;
    
    // Nunca remover ferramentas essenciais
    const nonEssentialTools = Array.from(this.activeTools)
      .filter(tool => !this.essentialTools.includes(tool));
    
    // Calcular quantas ferramentas precisam ser removidas
    const excessTools = this.activeTools.size - MAX_TOOLS;
    
    // Remover as ferramentas menos prioritárias
    const toolsToRemove = nonEssentialTools.slice(0, excessTools);
    toolsToRemove.forEach(tool => {
      this.activeTools.delete(tool);
      this.logger.debug(`Ferramenta desativada devido ao limite: ${tool}`);
    });
  }
  
  /**
   * Registra uma nova ferramenta no gerenciador
   * @param {string} toolName - Nome da ferramenta a ser registrada
   * @param {Object} toolHandler - Manipulador da ferramenta ou configurações
   * @returns {ToolManager} - Instância do gerenciador para encadeamento
   */
  registerTool(toolName, toolHandler = {}) {
    if (!toolName) {
      throw new Error('Nome da ferramenta é obrigatório');
    }
    
    this.tools.set(toolName, toolHandler);
    this.logger.debug(`Ferramenta registrada: ${toolName}`);
    return this;
  }
  
  /**
   * Remove o registro de uma ferramenta
   * @param {string} toolName - Nome da ferramenta a ser removida
   * @returns {ToolManager} - Instância do gerenciador para encadeamento
   */
  deregisterTool(toolName) {
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      this.activeTools.delete(toolName);
      this.logger.debug(`Ferramenta removida: ${toolName}`);
    }
    return this;
  }
  
  /**
   * Ativa uma ferramenta específica
   * @param {string} toolName - Nome da ferramenta a ser ativada
   * @returns {boolean} - Indica se a ferramenta foi ativada com sucesso
   */
  activateTool(toolName) {
    if (!this.tools.has(toolName)) {
      // Registrar automaticamente a ferramenta se não existir
      this.registerTool(toolName);
      this.logger.warn(`Ferramenta ${toolName} registrada automaticamente`);
    }
    
    this.activeTools.add(toolName);
    this.logger.debug(`Ferramenta ativada: ${toolName}`);
    
    // Verificar limite após ativação
    this._enforceLimits();
    
    return true;
  }
  
  /**
   * Desativa uma ferramenta específica
   * @param {string} toolName - Nome da ferramenta a ser desativada
   * @returns {boolean} - Indica se a ferramenta foi desativada com sucesso
   */
  deactivateTool(toolName) {
    // Não permitir desativar ferramentas essenciais
    if (this.essentialTools.includes(toolName)) {
      this.logger.warn(`Não é possível desativar ferramenta essencial: ${toolName}`);
      return false;
    }
    
    if (this.activeTools.has(toolName)) {
      this.activeTools.delete(toolName);
      this.logger.debug(`Ferramenta desativada: ${toolName}`);
      return true;
    }
    return false;
  }
  
  /**
   * Ativa várias ferramentas de uma só vez
   * @param {Array<string>} toolNames - Lista de nomes de ferramentas a serem ativadas
   * @returns {number} - Número de ferramentas ativadas com sucesso
   */
  activateTools(toolNames) {
    if (!Array.isArray(toolNames)) {
      this.logger.warn('activateTools requer um array de nomes de ferramentas');
      return 0;
    }
    
    let activatedCount = 0;
    for (const toolName of toolNames) {
      if (this.activateTool(toolName)) {
        activatedCount++;
      }
    }
    
    this.logger.debug(`${activatedCount} ferramentas ativadas`);
    
    // Verificar limite após ativação em massa
    this._enforceLimits();
    
    return activatedCount;
  }
  
  /**
   * Verifica se uma ferramenta está ativa
   * @param {string} toolName - Nome da ferramenta a ser verificada
   * @returns {boolean} - Indica se a ferramenta está ativa
   */
  isToolActive(toolName) {
    return this.activeTools.has(toolName);
  }
  
  /**
   * Executa uma ferramenta registrada e ativa
   * @param {string} toolName - Nome da ferramenta a ser executada
   * @param {Object} params - Parâmetros para a execução da ferramenta
   * @returns {Promise<Object>} - Resultado da execução da ferramenta
   */
  async executeTool(toolName, params = {}) {
    // Ativar automaticamente se não estiver ativa
    if (!this.isToolActive(toolName)) {
      this.logger.warn(`Tentativa de executar ferramenta inativa: ${toolName} - Ativando automaticamente`);
      this.activateTool(toolName);
    }
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      this.logger.error(`Ferramenta não encontrada: ${toolName}`);
      return { success: false, error: 'Ferramenta não encontrada' };
    }
    
    // Simulação para ferramentas não implementadas
    if (!tool.execute) {
      this.logger.warn(`Ferramenta sem implementação de execução: ${toolName} - Usando simulação`);
      return { 
        success: true, 
        result: { simulated: true, toolName, params },
        message: 'Execução simulada'
      };
    }
    
    try {
      this.logger.debug(`Executando ferramenta: ${toolName}`, { params });
      const result = await tool.execute(params);
      return { success: true, result };
    } catch (error) {
      this.logger.error(`Erro ao executar ferramenta ${toolName}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retorna a lista de ferramentas ativas
   * @returns {Array<string>} - Lista de nomes de ferramentas ativas
   */
  listActiveTools() {
    return Array.from(this.activeTools);
  }
  
  /**
   * Retorna a lista de todas as ferramentas registradas
   * @returns {Array<string>} - Lista de nomes de ferramentas registradas
   */
  listRegisteredTools() {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Ativa as ferramentas essenciais do sistema
   * @returns {number} - Número de ferramentas essenciais ativadas
   */
  activateEssentialTools() {
    return this.activateTools(this.essentialTools);
  }
  
  /**
   * Adiciona um novo contexto à lista de contextos disponíveis
   * @param {string} contextName - Nome do contexto
   * @param {Array<string>} tools - Lista de ferramentas associadas ao contexto
   * @returns {ToolManager} - Instância do gerenciador para encadeamento
   */
  addContext(contextName, tools) {
    if (!Array.isArray(tools)) {
      this.logger.warn('addContext requer um array de ferramentas');
      return this;
    }
    
    this.contextualTools[contextName] = tools;
    this.logger.debug(`Contexto adicionado: ${contextName} com ${tools.length} ferramentas`);
    
    // Se este contexto estiver ativo, atualizar ferramentas
    if (this.activeContexts.has(contextName)) {
      this._refreshActiveTools();
    }
    
    return this;
  }
}

export default ToolManager;
