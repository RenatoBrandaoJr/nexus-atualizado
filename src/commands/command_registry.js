/**
 * Registro de comandos do Nexus
 * 
 * Este arquivo gerencia o registro e execução de comandos
 * de terminal no sistema Nexus.
 */

import taskMasterTerminalCommands from './taskmaster_terminal_commands.js';
import { createLogger } from '../utils/logger.js';

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.logger = createLogger('CommandRegistry');
    
    // Inicializar comandos
    this.initializeCommands();
    
    this.logger.info('Registro de comandos inicializado');
  }
  
  /**
   * Inicializa todos os comandos disponíveis
   */
  initializeCommands() {
    // Registrar comandos do TaskMaster
    this.registerCommands(taskMasterTerminalCommands.commands);
    
    // Registrar comandos padrão
    this.registerCommand('help', {
      description: 'Mostra a lista de comandos disponíveis',
      usage: 'help [comando]',
      action: this.handleHelpCommand.bind(this)
    });
    
    this.registerCommand('echo', {
      description: 'Exibe o texto fornecido',
      usage: 'echo <texto>',
      action: (args) => args.join(' ')
    });
    
    this.registerCommand('clear', {
      description: 'Limpa o terminal',
      usage: 'clear',
      action: () => ({ clear: true })
    });
    
    this.logger.info('Comandos registrados com sucesso');
  }
  
  /**
   * Registra um comando individual
   * @param {string} name - Nome do comando
   * @param {Object} config - Configuração do comando
   */
  registerCommand(name, config) {
    this.commands.set(name, {
      description: config.description,
      usage: config.usage,
      action: config.action
    });
  }
  
  /**
   * Registra vários comandos de uma vez
   * @param {Map} commands - Mapa de comandos
   */
  registerCommands(commands) {
    for (const [name, config] of commands.entries()) {
      this.registerCommand(name, config);
    }
  }
  
  /**
   * Executa um comando
   * @param {string} input - Texto completo do comando
   * @returns {Promise<string|Object>} - Resultado do comando
   */
  async executeCommand(input) {
    const args = input.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    if (!commandName) {
      return '';
    }
    
    const command = this.commands.get(commandName);
    
    if (!command) {
      return `Comando não encontrado: ${commandName}. Use 'help' para ver os comandos disponíveis.`;
    }
    
    try {
      return await command.action(args);
    } catch (error) {
      this.logger.error(`Erro ao executar comando ${commandName}: ${error.message}`);
      return `Erro ao executar ${commandName}: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de ajuda
   * @param {Array} args - Argumentos do comando
   * @returns {string} - Texto de ajuda formatado
   */
  handleHelpCommand(args) {
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = this.commands.get(commandName);
      
      if (!command) {
        return `Comando não encontrado: ${commandName}`;
      }
      
      return `${commandName}: ${command.description}\nUso: ${command.usage}`;
    }
    
    let help = 'Comandos disponíveis:\n\n';
    
    for (const [name, config] of this.commands.entries()) {
      help += `${name}: ${config.description}\n`;
    }
    
    help += '\nPara mais informações sobre um comando específico, use: help <comando>';
    
    return help;
  }
  
  /**
   * Obtém a lista de comandos registrados
   * @returns {Map} - Mapa de comandos
   */
  getCommands() {
    return this.commands;
  }
}

// Exportar como singleton
const commandRegistry = new CommandRegistry();
export default commandRegistry;
