#!/usr/bin/env node

/**
 * Demonstração da interface de chat do Nexus
 * Este script simula a interface de chat e processa comandos como /agentes
 */

import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';
import { createLogger } from '../src/utils/logger.js';
import chatCommands from '../src/commands/chat_commands.js';
import OrchestratorAgent from '../src/agents/orchestrator_agent.js';
import AIAssistantAgent from '../src/agents/ai_assistant_agent.js';

// Configuração do diretório
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Carregamento de variáveis de ambiente
function loadEnv() {
  const envPath = resolve(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('Arquivo .env não encontrado. Usando variáveis de ambiente padrão.');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remover aspas se existirem
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        process.env[key] = value;
      }
    }
  });
}

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

class ChatInterface {
  constructor() {
    this.logger = createLogger('ChatInterface');
    this.userId = 'user_' + Math.floor(Math.random() * 1000);
    this.context = {
      userId: this.userId,
      sessionId: 'session_' + Math.floor(Math.random() * 1000),
      projectId: 'nexus_demo'
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.orchestrator = null;
    this.aiAssistant = null;
  }
  
  /**
   * Inicializa a interface de chat
   */
  async initialize() {
    try {
      // Carregar variáveis de ambiente
      loadEnv();
      
      console.log(`\n${colors.cyan}${colors.bright}=== Sistema Nexus - Interface de Chat ====${colors.reset}\n`);
      console.log(`${colors.yellow}Inicializando agentes, por favor aguarde...${colors.reset}\n`);
      
      // Inicializar agentes
      try {
        this.orchestrator = new OrchestratorAgent();
        await this.orchestrator.initializeSystem({
          environment: 'development'
        });
        
        this.aiAssistant = this.orchestrator.getAgent('AIAssistantAgent') || new AIAssistantAgent();
        
        console.log(`${colors.green}${colors.bright}Sistema inicializado com sucesso!${colors.reset}\n`);
      } catch (error) {
        console.log(`${colors.red}Não foi possível inicializar todos os agentes: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Continuando em modo limitado...${colors.reset}\n`);
      }
      
      // Exibir mensagem de boas-vindas
      this.printMessage({
        type: 'system',
        message: `Bem-vindo à interface de chat do Sistema Nexus! 
Digite /ajuda para ver a lista de comandos disponíveis ou faça uma pergunta diretamente.`,
        sender: 'Sistema'
      });
      
      // Iniciar loop de chat
      this.startChatLoop();
    } catch (error) {
      console.error(`${colors.red}Erro ao inicializar interface de chat:${colors.reset}`, error);
      process.exit(1);
    }
  }
  
  /**
   * Inicia o loop de chat
   */
  startChatLoop() {
    this.promptUser();
  }
  
  /**
   * Solicita entrada do usuário
   */
  promptUser() {
    this.rl.question(`${colors.green}Você:${colors.reset} `, async (input) => {
      if (input.toLowerCase() === 'sair' || input.toLowerCase() === 'exit') {
        console.log(`\n${colors.cyan}Obrigado por usar o sistema Nexus!${colors.reset}`);
        this.rl.close();
        process.exit(0);
        return;
      }
      
      await this.processInput(input);
      this.promptUser();
    });
  }
  
  /**
   * Processa a entrada do usuário
   * @param {string} input - Entrada do usuário
   */
  async processInput(input) {
    try {
      // Verificar se é um comando
      if (input.startsWith('/')) {
        const result = await chatCommands.processCommand(input, this.context);
        
        if (result) {
          this.printMessage({
            type: result.type || 'system',
            message: result.message,
            format: result.format || 'text',
            sender: result.agent || 'Sistema'
          });
          return;
        }
      }
      
      // Se não for um comando, enviar para o AIAssistantAgent
      if (this.aiAssistant) {
        console.log(`${colors.yellow}Processando sua mensagem...${colors.reset}`);
        
        try {
          const response = await this.aiAssistant.askQuestion(
            this.userId,
            input,
            this.context
          );
          
          this.printMessage({
            type: 'assistant',
            message: response.answer,
            sender: 'AIAssistant'
          });
        } catch (error) {
          this.printMessage({
            type: 'error',
            message: `Não foi possível processar sua mensagem: ${error.message}`,
            sender: 'AIAssistant'
          });
        }
      } else {
        this.printMessage({
          type: 'error',
          message: `AIAssistantAgent não está disponível. Use comandos como /agentes para interagir com o sistema.`,
          sender: 'Sistema'
        });
      }
    } catch (error) {
      console.error(`${colors.red}Erro ao processar entrada:${colors.reset}`, error);
      this.printMessage({
        type: 'error',
        message: `Erro ao processar sua mensagem: ${error.message}`,
        sender: 'Sistema'
      });
    }
  }
  
  /**
   * Imprime uma mensagem na interface de chat
   * @param {Object} messageObj - Objeto da mensagem
   */
  printMessage(messageObj) {
    const { type, message, sender, format } = messageObj;
    
    // Formatar com base no tipo
    let prefix = '';
    switch (type) {
      case 'system':
        prefix = `${colors.cyan}${sender}:${colors.reset} `;
        break;
      case 'assistant':
        prefix = `${colors.blue}${sender}:${colors.reset} `;
        break;
      case 'error':
        prefix = `${colors.red}${sender} (Erro):${colors.reset} `;
        break;
      case 'info':
        prefix = `${colors.magenta}${sender}:${colors.reset} `;
        break;
      default:
        prefix = `${colors.yellow}${sender}:${colors.reset} `;
    }
    
    // Imprimir mensagem
    console.log(`\n${prefix}${message}\n`);
  }
}

// Executar a interface de chat
const chatInterface = new ChatInterface();
chatInterface.initialize().catch(error => {
  console.error(`${colors.red}Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
