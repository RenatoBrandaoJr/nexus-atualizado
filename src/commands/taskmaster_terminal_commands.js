/**
 * Comandos de terminal para integração do TaskMaster com o Nexus
 * 
 * Este arquivo implementa comandos de terminal para gerenciar tarefas
 * do TaskMaster diretamente da interface do Nexus.
 */

import { createLogger } from '../utils/logger.js';
import path from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';

class TaskMasterTerminalCommands {
  constructor() {
    this.logger = createLogger('TaskMasterCommands');
    this.commands = new Map();
    this.projectRoot = process.env.TASKMASTER_PATH || process.cwd();
    this.taskMasterEnabled = process.env.TASKMASTER_ENABLED === 'true';
    
    // Registrar comandos
    this.registerCommands();
    
    this.logger.info('Comandos de terminal do TaskMaster inicializados');
  }
  
  /**
   * Registra todos os comandos disponíveis
   */
  registerCommands() {
    this.registerCommand('tm', {
      description: 'Gerenciar tarefas com TaskMaster',
      usage: 'tm [comando] [opções]',
      action: this.handleTaskMasterCommand.bind(this)
    });
    
    this.registerCommand('tm-list', {
      description: 'Listar todas as tarefas',
      usage: 'tm-list [status]',
      action: this.handleListCommand.bind(this)
    });
    
    this.registerCommand('tm-show', {
      description: 'Mostrar detalhes de uma tarefa',
      usage: 'tm-show <id>',
      action: this.handleShowCommand.bind(this)
    });
    
    this.registerCommand('tm-next', {
      description: 'Mostrar a próxima tarefa a ser trabalhada',
      usage: 'tm-next',
      action: this.handleNextCommand.bind(this)
    });
    
    this.registerCommand('tm-status', {
      description: 'Atualizar o status de uma tarefa',
      usage: 'tm-status <id> <status>',
      action: this.handleStatusCommand.bind(this)
    });
    
    this.registerCommand('tm-expand', {
      description: 'Expandir uma tarefa em subtarefas',
      usage: 'tm-expand <id> [num_subtarefas]',
      action: this.handleExpandCommand.bind(this)
    });
    
    this.registerCommand('tm-create', {
      description: 'Criar uma nova tarefa',
      usage: 'tm-create --title="Título" --description="Descrição" [opções]',
      action: this.handleCreateCommand.bind(this)
    });
    
    this.logger.info('Comandos TaskMaster registrados com sucesso');
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
   * Executa um comando do TaskMaster
   * @param {string} command - Comando a ser executado
   * @returns {Promise<string|Object>} - Resultado do comando
   */
  executeTaskMasterCommand(command) {
    return new Promise((resolve, reject) => {
      const fullCommand = `npx task-master ${command}`;
      
      exec(fullCommand, { cwd: this.projectRoot }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Erro ao executar comando TaskMaster: ${error.message}`);
          this.logger.error(`stderr: ${stderr}`);
          return reject(error);
        }
        
        if (stderr) {
          this.logger.warn(`Aviso do TaskMaster: ${stderr}`);
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
  
  /**
   * Formata uma tarefa para exibição no terminal
   * @param {Object} task - Tarefa a ser formatada
   * @returns {string} - Texto formatado
   */
  formatTask(task) {
    const statusEmojis = {
      'pending': '⏱️',
      'in-progress': '🔄',
      'review': '👀',
      'done': '✅',
      'deferred': '⏳',
      'cancelled': '❌'
    };
    
    const emoji = statusEmojis[task.status] || '❓';
    let output = `${emoji} Tarefa ${task.id}: ${task.title} [${task.status}]`;
    output += `\n   Descrição: ${task.description}`;
    
    if (task.priority) {
      output += `\n   Prioridade: ${task.priority}`;
    }
    
    if (task.dependencies && task.dependencies.length > 0) {
      output += `\n   Dependências: ${task.dependencies.join(', ')}`;
    }
    
    return output;
  }
  
  /**
   * Processa o comando principal do TaskMaster
   * @param {Array} args - Argumentos do comando
   * @param {Object} options - Opções adicionais
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleTaskMasterCommand(args, options) {
    if (!this.taskMasterEnabled) {
      return 'TaskMaster não está habilitado. Configure TASKMASTER_ENABLED=true no arquivo .env';
    }
    
    const subcommand = args[0];
    
    if (!subcommand) {
      // Mostrar ajuda
      return this.showHelp();
    }
    
    // Verificar se existe um comando específico
    const specificCommand = this.commands.get(`tm-${subcommand}`);
    
    if (specificCommand) {
      // Executar o comando específico
      return specificCommand.action(args.slice(1), options);
    }
    
    // Executar comando diretamente no TaskMaster
    try {
      const result = await this.executeTaskMasterCommand(args.join(' '));
      
      if (typeof result === 'string') {
        return result;
      }
      
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `Erro: ${error.message}`;
    }
  }
  
  /**
   * Mostra a ajuda com a lista de comandos disponíveis
   * @returns {string} - Texto de ajuda formatado
   */
  showHelp() {
    let help = 'Comandos TaskMaster disponíveis:\n\n';
    
    for (const [name, config] of this.commands.entries()) {
      help += `${name}: ${config.description}\n`;
      help += `   Uso: ${config.usage}\n\n`;
    }
    
    return help;
  }
  
  /**
   * Processa o comando de listar tarefas
   * @param {Array} args - Argumentos do comando
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleListCommand(args) {
    try {
      const status = args[0];
      const command = status ? `get-tasks --status="${status}" --json` : 'get-tasks --json';
      
      const tasks = await this.executeTaskMasterCommand(command);
      
      if (!tasks || tasks.length === 0) {
        return status ? 
          `Nenhuma tarefa encontrada com status "${status}".` : 
          'Nenhuma tarefa encontrada.';
      }
      
      let output = status ? 
        `Tarefas com status "${status}":\n\n` : 
        'Todas as tarefas:\n\n';
      
      output += tasks.map(task => this.formatTask(task)).join('\n\n');
      
      return output;
    } catch (error) {
      return `Erro ao listar tarefas: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de mostrar detalhes de uma tarefa
   * @param {Array} args - Argumentos do comando
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleShowCommand(args) {
    if (!args[0]) {
      return 'Erro: É necessário fornecer o ID da tarefa. Exemplo: tm-show 1';
    }
    
    try {
      const taskId = args[0];
      const task = await this.executeTaskMasterCommand(`get-task --id=${taskId} --json`);
      
      if (!task) {
        return `Tarefa ${taskId} não encontrada.`;
      }
      
      let output = `=== Tarefa ${task.id}: ${task.title} ===\n\n`;
      output += `Status: ${task.status}\n`;
      output += `Prioridade: ${task.priority || 'média'}\n`;
      output += `Descrição: ${task.description}\n`;
      
      if (task.dependencies && task.dependencies.length > 0) {
        output += `Dependências: ${task.dependencies.join(', ')}\n`;
      }
      
      if (task.details) {
        output += `\nDetalhes:\n${task.details}\n`;
      }
      
      if (task.testStrategy) {
        output += `\nEstratégia de Teste:\n${task.testStrategy}\n`;
      }
      
      if (task.subtasks && task.subtasks.length > 0) {
        output += `\nSubtarefas:\n`;
        
        for (const subtask of task.subtasks) {
          output += `- ${subtask.id}: ${subtask.title} [${subtask.status}]\n`;
        }
      }
      
      return output;
    } catch (error) {
      return `Erro ao mostrar tarefa: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de mostrar a próxima tarefa
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleNextCommand() {
    try {
      const result = await this.executeTaskMasterCommand('next-task');
      
      if (!result || !result.nextTask) {
        return 'Não há tarefas pendentes para trabalhar no momento.';
      }
      
      const task = result.nextTask;
      
      let output = `=== Próxima Tarefa: ${task.id} - ${task.title} ===\n\n`;
      output += `Status: ${task.status}\n`;
      output += `Prioridade: ${task.priority}\n`;
      output += `Descrição: ${task.description}\n\n`;
      
      output += `Para começar a trabalhar nesta tarefa, use:\n`;
      output += `tm-status ${task.id} in-progress\n\n`;
      
      output += `Para ver detalhes completos, use:\n`;
      output += `tm-show ${task.id}`;
      
      return output;
    } catch (error) {
      return `Erro ao buscar próxima tarefa: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de atualizar o status de uma tarefa
   * @param {Array} args - Argumentos do comando
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleStatusCommand(args) {
    if (!args[0] || !args[1]) {
      return 'Erro: É necessário fornecer o ID da tarefa e o novo status. Exemplo: tm-status 1 done';
    }
    
    const taskId = args[0];
    const newStatus = args[1];
    
    const validStatus = ['pending', 'in-progress', 'review', 'done', 'deferred', 'cancelled'];
    
    if (!validStatus.includes(newStatus)) {
      return `Erro: Status inválido. Use um dos seguintes: ${validStatus.join(', ')}`;
    }
    
    try {
      await this.executeTaskMasterCommand(`set-status --id=${taskId} --status="${newStatus}"`);
      
      return `Status da tarefa ${taskId} atualizado para "${newStatus}".`;
    } catch (error) {
      return `Erro ao atualizar status: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de expandir uma tarefa em subtarefas
   * @param {Array} args - Argumentos do comando
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleExpandCommand(args) {
    if (!args[0]) {
      return 'Erro: É necessário fornecer o ID da tarefa. Exemplo: tm-expand 1 [número_subtarefas]';
    }
    
    const taskId = args[0];
    const subtaskCount = args[1];
    
    try {
      let command = `expand --id=${taskId}`;
      
      if (subtaskCount) {
        command += ` --subtasks=${subtaskCount}`;
      }
      
      const result = await this.executeTaskMasterCommand(command);
      
      if (!result || !result.subtasks || result.subtasks.length === 0) {
        return `A tarefa ${taskId} não pôde ser expandida.`;
      }
      
      let output = `Tarefa ${taskId} expandida em ${result.subtasks.length} subtarefas:\n\n`;
      
      for (const subtask of result.subtasks) {
        output += `- ${subtask.id}: ${subtask.title}\n`;
      }
      
      output += `\nPara ver detalhes completos, use: tm-show ${taskId}`;
      
      return output;
    } catch (error) {
      return `Erro ao expandir tarefa: ${error.message}`;
    }
  }
  
  /**
   * Processa o comando de criar uma nova tarefa
   * @param {Array} args - Argumentos do comando
   * @returns {Promise<string>} - Resultado formatado
   */
  async handleCreateCommand(args) {
    if (args.length === 0) {
      return `
Erro: Parâmetros insuficientes.

Uso: tm-create --title="Título" --description="Descrição" [opções]

Opções:
  --title="Título"               Título da tarefa (obrigatório)
  --description="Descrição"      Descrição da tarefa (obrigatório)
  --details="Detalhes"           Detalhes da implementação
  --priority="high|medium|low"   Prioridade da tarefa
  --dependencies="1,2,3"         IDs de tarefas dependentes (separados por vírgula)

Exemplo:
  tm-create --title="Implementar login" --description="Criar tela de login" --priority="high"
`;
    }
    
    try {
      // Montar comando com todos os argumentos fornecidos
      const command = `add-task ${args.join(' ')}`;
      
      const result = await this.executeTaskMasterCommand(command);
      
      return `Tarefa criada com sucesso: Tarefa ${result.id} - ${result.title}`;
    } catch (error) {
      return `Erro ao criar tarefa: ${error.message}`;
    }
  }
}

// Exportar como singleton
const taskMasterTerminalCommands = new TaskMasterTerminalCommands();
export default taskMasterTerminalCommands;
