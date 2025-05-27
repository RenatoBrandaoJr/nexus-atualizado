/**
 * Comandos de chat para o sistema Nexus
 * Estes comandos podem ser utilizados diretamente na interface de chat
 */

import { createLogger } from '../utils/logger.js';

// Lista de agentes com suas descrições
const agentsList = [
  {
    id: 1,
    name: 'SecurityAgent',
    description: 'Gerencia autenticação, autorização e segurança',
    details: `O SecurityAgent é responsável por todos os aspectos de segurança do sistema, incluindo:
    • Autenticação de usuários
    • Autorização e controle de acesso
    • Validação de tokens JWT
    • Verificação de webhooks
    • Sanitização de entrada de dados
    • Auditoria de segurança
    • Verificação de configurações de segurança`
  },
  {
    id: 2,
    name: 'NotificationAgent',
    description: 'Gerencia e envia notificações por diferentes canais',
    details: `O NotificationAgent é responsável por enviar e gerenciar notificações, incluindo:
    • Envio de notificações por diferentes canais (console, email, Slack)
    • Configuração de canais de notificação
    • Gerenciamento de prioridades de notificação
    • Formatação de mensagens`
  },
  {
    id: 3,
    name: 'DocumentAgent',
    description: 'Extrai e gera documentação para código e APIs',
    details: `O DocumentAgent é responsável pela documentação do sistema, incluindo:
    • Extração de documentação de código-fonte
    • Extração de documentação de designs do Figma
    • Geração de documentação de API
    • Publicação de documentação em diferentes formatos
    • Gerenciamento de versões de documentação`
  },
  {
    id: 4,
    name: 'DatabaseAgent',
    description: 'Gerencia operações de banco de dados e otimização',
    details: `O DatabaseAgent é responsável pelo gerenciamento de banco de dados, incluindo:
    • Execução de consultas SQL
    • Criação e atualização de tabelas
    • Execução de migrações
    • Criação de backups
    • Análise de desempenho de consultas`
  },
  {
    id: 5,
    name: 'AIAssistantAgent',
    description: 'Fornece assistência inteligente e respostas contextuais',
    details: `O AIAssistantAgent é o assistente inteligente do sistema, incluindo:
    • Resposta a perguntas baseadas em contexto
    • Geração de sugestões inteligentes
    • Análise de conteúdo
    • Geração de conteúdo
    • Explicação de funcionalidades
    • Ajuda contextual`
  },
  {
    id: 6,
    name: 'FrontendAgent',
    description: 'Gerencia componentes e interfaces frontend',
    details: `O FrontendAgent é responsável pelo desenvolvimento frontend, incluindo:
    • Criação de componentes React
    • Implementação de designs do Figma
    • Geração de páginas a partir de templates
    • Execução de testes em componentes
    • Geração de documentação para componentes
    • Sincronização com design systems`
  },
  {
    id: 7,
    name: 'BackendAgent',
    description: 'Processa requisições API e executa lógica de negócios',
    details: `O BackendAgent é responsável pelo desenvolvimento backend, incluindo:
    • Processamento de requisições API
    • Execução de lógica de negócios
    • Integração com banco de dados
    • Roteamento de requisições
    • Validação de entrada
    • Gerenciamento de limites de requisição`
  },
  {
    id: 8,
    name: 'IntegrationAgent',
    description: 'Gerencia conexões com serviços externos e APIs',
    details: `O IntegrationAgent é responsável pela integração com serviços externos, incluindo:
    • Conexão com serviços como GitHub, Figma
    • Sincronização de dados entre sistemas
    • Execução de ações em serviços externos
    • Registro e processamento de webhooks
    • Verificação de status de serviços`
  },
  {
    id: 9,
    name: 'OrchestratorAgent',
    description: 'Coordena fluxos complexos e gerencia comunicação entre agentes',
    details: `O OrchestratorAgent é o coordenador central do sistema, incluindo:
    • Inicialização do sistema
    • Gerenciamento de agentes
    • Execução de fluxos de trabalho
    • Gerenciamento de contextos
    • Rastreamento de operações`
  }
];

class ChatCommands {
  constructor() {
    this.logger = createLogger('ChatCommands');
    this.commandRegistry = new Map();
    
    // Registrar comandos
    this.registerCommands();
  }
  
  /**
   * Registra todos os comandos disponíveis
   */
  registerCommands() {
    // Comando /agentes - Lista todos os agentes
    this.registerCommand('agentes', {
      description: 'Lista todos os agentes disponíveis no sistema',
      handler: this.handleAgentsList.bind(this)
    });
    
    // Comando /agente [id] - Mostra detalhes de um agente específico
    this.registerCommand('agente', {
      description: 'Mostra detalhes de um agente específico',
      handler: this.handleAgentDetails.bind(this),
      params: ['id']
    });
    
    // Comando /ajuda - Mostra todos os comandos disponíveis
    this.registerCommand('ajuda', {
      description: 'Mostra todos os comandos disponíveis',
      handler: this.handleHelp.bind(this)
    });
    
    this.logger.info('Comandos de chat registrados com sucesso');
  }
  
  /**
   * Registra um comando
   * @param {string} name - Nome do comando
   * @param {Object} config - Configuração do comando
   */
  registerCommand(name, config) {
    this.commandRegistry.set(name, config);
  }
  
  /**
   * Processa um comando de chat
   * @param {string} message - Mensagem do chat
   * @param {Object} context - Contexto do usuário
   * @returns {Promise<Object|null>} - Resultado do comando ou null se não for um comando
   */
  async processCommand(message, context = {}) {
    if (!message.startsWith('/')) {
      return null;
    }
    
    // Extrair comando e parâmetros
    const parts = message.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const params = parts.slice(1);
    
    // Verificar se o comando existe
    if (!this.commandRegistry.has(commandName)) {
      return {
        type: 'error',
        message: `Comando "/${commandName}" não encontrado. Digite /ajuda para ver a lista de comandos disponíveis.`
      };
    }
    
    try {
      // Executar o handler do comando
      const command = this.commandRegistry.get(commandName);
      return await command.handler(params, context);
    } catch (error) {
      this.logger.error(`Erro ao executar comando /${commandName}:`, error);
      return {
        type: 'error',
        message: `Erro ao executar comando /${commandName}: ${error.message}`
      };
    }
  }
  
  /**
   * Handler para o comando /agentes
   */
  async handleAgentsList(params, context) {
    let response = "## Agentes disponíveis no sistema Nexus\n\n";
    
    agentsList.forEach(agent => {
      response += `**${agent.id}.** **${agent.name}** - ${agent.description}\n`;
    });
    
    response += "\nPara ver detalhes de um agente específico, digite `/agente [número]`";
    
    return {
      type: 'info',
      message: response,
      format: 'markdown'
    };
  }
  
  /**
   * Handler para o comando /agente [id]
   */
  async handleAgentDetails(params, context) {
    if (!params.length) {
      return {
        type: 'error',
        message: "Por favor, especifique o ID do agente. Exemplo: `/agente 5`"
      };
    }
    
    const agentId = parseInt(params[0]);
    const agent = agentsList.find(a => a.id === agentId);
    
    if (!agent) {
      return {
        type: 'error',
        message: `Agente com ID ${agentId} não encontrado. Digite /agentes para ver a lista de agentes disponíveis.`
      };
    }
    
    let response = `## ${agent.name}\n\n`;
    response += `**Descrição:** ${agent.description}\n\n`;
    response += `**Detalhes:**\n${agent.details}\n\n`;
    response += `Para voltar à lista de agentes, digite \`/agentes\``;
    
    return {
      type: 'info',
      message: response,
      format: 'markdown',
      agent: agent.name
    };
  }
  
  /**
   * Handler para o comando /ajuda
   */
  async handleHelp(params, context) {
    let response = "## Comandos disponíveis no chat\n\n";
    
    this.commandRegistry.forEach((config, name) => {
      response += `**/${name}** - ${config.description}\n`;
    });
    
    return {
      type: 'info',
      message: response,
      format: 'markdown'
    };
  }
}

// Exportar como singleton
const chatCommands = new ChatCommands();
export default chatCommands;
