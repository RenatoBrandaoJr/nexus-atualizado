// src/utils/tool_manager.js

/**
 * ToolManager
 * 
 * Gerencia a ativação e desativação dinâmica de ferramentas no Windsurf AI.
 * Implementa estratégias para respeitar o limite de 50 ferramentas ativas.
 */
class ToolManager {
  constructor() {
    this.essentialTools = [
      'sequential_analyze', 'supabase_query', 'supabase_insert', 
      'supabase_update', 'github_pull', 'taskmaster_generate'
    ];
    
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
        'stripe_invoice'
      ],
      'github': [
        'github_pull', 'github_push', 'github_commit', 
        'github_pr', 'github_issue'
      ],
      'figma': [
        'figma_get_file', 'figma_export_assets', 'figma_get_components',
        'figma_comment'
      ]
    };
    
    this.toolPriorities = {
      // Ferramentas essenciais sempre têm prioridade máxima
      'sequential_analyze': 'essential',
      'supabase_query': 'essential',
      'supabase_insert': 'essential',
      'supabase_update': 'essential',
      'github_pull': 'essential',
      'taskmaster_generate': 'essential',
      
      // Outras ferramentas com prioridades variadas
      'figma_get_file': 'high',
      'figma_export_assets': 'high',
      'puppeteer_screenshot': 'high',
      'puppeteer_pdf': 'medium',
      'browser_navigate': 'high',
      'browser_click': 'high',
      'browser_input': 'high',
      'stripe_payment': 'high',
      'stripe_subscription': 'medium',
      'context_store': 'high',
      'context_retrieve': 'high'
      // Outras ferramentas têm prioridade 'low' por padrão
    };
    
    this.presets = {
      'minimal': [...this.essentialTools],
      'documentation': [
        ...this.essentialTools,
        ...this.contextualTools.documentation
      ],
      'kanban': [
        ...this.essentialTools,
        ...this.contextualTools.kanban
      ],
      'dashboard': [
        ...this.essentialTools,
        ...this.contextualTools.dashboard
      ],
      'payment': [
        ...this.essentialTools,
        ...this.contextualTools.payment
      ]
    };
    
    this.activeContexts = ['core']; // Contexto inicial
    this.activeTools = [...this.essentialTools];
    
    this.logger = require('./logger')('ToolManager');
    
    // Cache para reduzir chamadas repetidas
    this.toolCache = {};
  }
  
  /**
   * Define os contextos ativos
   */
  setActiveContexts(contexts) {
    this.activeContexts = contexts;
    this.updateActiveTools();
    return this.activeTools;
  }
  
  /**
   * Obtém os contextos ativos
   */
  getActiveContexts() {
    return [...this.activeContexts];
  }
  
  /**
   * Atualiza as ferramentas ativas com base nos contextos
   */
  updateActiveTools() {
    // Começar com ferramentas essenciais
    let newActiveTools = [...this.essentialTools];
    
    // Adicionar ferramentas contextuais
    for (const context of this.activeContexts) {
      if (this.contextualTools[context]) {
        newActiveTools = [...newActiveTools, ...this.contextualTools[context]];
      }
    }
    
    // Remover duplicatas
    newActiveTools = [...new Set(newActiveTools)];
    
    // Verificar limite
    if (newActiveTools.length > 50) {
      this.logger.warn(`Excedendo limite de ferramentas: ${newActiveTools.length}`);
      
      // Priorizar ferramentas por importância
      const prioritizedTools = this.prioritizeTools(newActiveTools);
      
      // Limitar a 50 ferramentas
      newActiveTools = prioritizedTools.slice(0, 50);
      
      this.logger.info(`Ferramentas limitadas a 50 por prioridade`);
    }
    
    // Atualizar ferramentas ativas
    const toolsToActivate = newActiveTools.filter(tool => !this.activeTools.includes(tool));
    const toolsToDeactivate = this.activeTools.filter(tool => !newActiveTools.includes(tool));
    
    // Aqui implementaria a ativação/desativação real via API do Windsurf
    if (toolsToActivate.length > 0) {
      this.logger.info(`Ativando: ${toolsToActivate.join(', ')}`);
    }
    
    if (toolsToDeactivate.length > 0) {
      this.logger.info(`Desativando: ${toolsToDeactivate.join(', ')}`);
    }
    
    this.activeTools = newActiveTools;
    return this.activeTools;
  }
  
  /**
   * Prioriza ferramentas com base em sua importância
   */
  prioritizeTools(tools) {
    // Ordenar ferramentas por prioridade
    return tools.sort((a, b) => {
      const priorityA = this.getToolPriority(a);
      const priorityB = this.getToolPriority(b);
      
      // Mapear prioridades para valores numéricos
      const priorityMap = {
        'essential': 0,
        'high': 1,
        'medium': 2,
        'low': 3
      };
      
      return priorityMap[priorityA] - priorityMap[priorityB];
    });
  }
  
  /**
   * Obtém a prioridade de uma ferramenta
   */
  getToolPriority(tool) {
    return this.toolPriorities[tool] || 'low';
  }
  
  /**
   * Define a prioridade de uma ferramenta
   */
  setPriority(tool, priority) {
    if (!['essential', 'high', 'medium', 'low'].includes(priority)) {
      throw new Error(`Prioridade inválida: ${priority}`);
    }
    
    this.toolPriorities[tool] = priority;
    
    // Atualizar ferramentas ativas se necessário
    if (this.activeTools.length > 50) {
      this.updateActiveTools();
    }
    
    return { success: true };
  }
  
  /**
   * Verifica se uma ferramenta está ativa
   */
  isToolActive(tool) {
    return this.activeTools.includes(tool);
  }
  
  /**
   * Ativa ferramentas essenciais
   */
  activateEssentialTools() {
    // Garantir que todas as ferramentas essenciais estejam ativas
    const missingEssentialTools = this.essentialTools.filter(
      tool => !this.activeTools.includes(tool)
    );
    
    if (missingEssentialTools.length > 0) {
      this.activeTools = [...this.activeTools, ...missingEssentialTools];
      this.logger.info(`Ferramentas essenciais ativadas: ${missingEssentialTools.join(', ')}`);
    }
    
    return this.activeTools;
  }
  
  /**
   * Cria um preset personalizado
   */
  createPreset(name, tools) {
    if (this.presets[name]) {
      this.logger.warn(`Sobrescrevendo preset existente: ${name}`);
    }
    
    this.presets[name] = [...tools];
    return { success: true, toolCount: tools.length };
  }
  
  /**
   * Ativa um preset
   */
  activatePreset(name) {
    if (!this.presets[name]) {
      throw new Error(`Preset não encontrado: ${name}`);
    }
    
    // Ativar ferramentas do preset
    this.activeTools = [...this.presets[name]];
    
    // Determinar contextos correspondentes
    const newContexts = ['core'];
    
    for (const [context, tools] of Object.entries(this.contextualTools)) {
      // Se a maioria das ferramentas do contexto está no preset, incluir o contexto
      const contextToolsInPreset = tools.filter(tool => this.activeTools.includes(tool));
      if (contextToolsInPreset.length > tools.length / 2) {
        newContexts.push(context);
      }
    }
    
    this.activeContexts = newContexts;
    
    this.logger.info(`Preset ativado: ${name}, contextos: ${newContexts.join(', ')}`);
    
    return { 
      success: true, 
      toolCount: this.activeTools.length,
      contexts: newContexts
    };
  }
  
  /**
   * Executa uma operação com contextos específicos ativados
   */
  async withContext(contexts, operation) {
    const previousContexts = [...this.activeContexts];
    
    try {
      // Ativar contextos adicionais
      this.setActiveContexts([...previousContexts, ...contexts]);
      
      // Executar operação
      return await operation();
    } finally {
      // Restaurar contextos anteriores
      this.setActiveContexts(previousContexts);
    }
  }
  
  /**
   * Obtém resultado de cache ou executa operação
   */
  async withCache(key, operation, ttlSeconds = 3600) {
    // Verificar cache
    if (this.toolCache[key] && 
        this.toolCache[key].expiry > Date.now()) {
      this.logger.debug(`Cache hit: ${key}`);
      return this.toolCache[key].data;
    }
    
    // Executar operação
    const result = await operation();
    
    // Armazenar em cache
    this.toolCache[key] = {
      data: result,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
    
    return result;
  }
  
  /**
   * Limpa o cache
   */
  clearCache() {
    this.toolCache = {};
    return { success: true };
  }
  
  /**
   * Obtém estatísticas de uso de ferramentas
   */
  getToolStats() {
    return {
      activeTools: this.activeTools.length,
      activeContexts: this.activeContexts,
      essentialTools: this.essentialTools.length,
      totalContextualTools: Object.values(this.contextualTools)
        .reduce((sum, tools) => sum + tools.length, 0),
      presets: Object.keys(this.presets)
    };
  }
  
  /**
   * Obtém as ferramentas ativas
   */
  getActiveTools() {
    return [...this.activeTools];
  }
}

module.exports = new ToolManager();
