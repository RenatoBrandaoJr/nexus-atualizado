#!/usr/bin/env node

/**
 * Demonstração simplificada da interface de chat do Nexus
 * Este script simula a interface de chat e processa comandos como /agentes
 */

import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';
import { createLogger } from '../src/utils/logger.js';
import chatCommands from '../src/commands/chat_commands.js';

// Configuração do diretório
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Criar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Contexto do usuário
const context = {
  userId: 'user_demo',
  sessionId: 'session_demo',
  projectId: 'nexus_demo'
};

// Função para imprimir mensagem formatada
function printMessage(type, message, sender) {
  let prefix = '';
  
  switch (type) {
    case 'system':
      prefix = `${colors.cyan}${sender}:${colors.reset} `;
      break;
    case 'info':
      prefix = `${colors.magenta}${sender}:${colors.reset} `;
      break;
    case 'error':
      prefix = `${colors.red}${sender} (Erro):${colors.reset} `;
      break;
    default:
      prefix = `${colors.yellow}${sender}:${colors.reset} `;
  }
  
  console.log(`\n${prefix}${message}\n`);
}

// Função para processar input do usuário
async function processInput(input) {
  try {
    // Verificar se é um comando
    if (input.startsWith('/')) {
      const result = await chatCommands.processCommand(input, context);
      
      if (result) {
        printMessage(
          result.type || 'system', 
          result.message, 
          result.agent || 'Sistema'
        );
        return;
      }
    }
    
    // Se não for um comando reconhecido
    printMessage(
      'system',
      'Esse comando não foi reconhecido. Digite /ajuda para ver a lista de comandos disponíveis.',
      'Sistema'
    );
  } catch (error) {
    console.error(`${colors.red}Erro ao processar entrada:${colors.reset}`, error);
    printMessage('error', `Erro ao processar sua mensagem: ${error.message}`, 'Sistema');
  }
}

// Função para perguntar ao usuário
function promptUser() {
  rl.question(`${colors.green}Você:${colors.reset} `, async (input) => {
    if (input.toLowerCase() === 'sair' || input.toLowerCase() === 'exit') {
      console.log(`\n${colors.cyan}Obrigado por usar o sistema Nexus!${colors.reset}`);
      rl.close();
      return;
    }
    
    await processInput(input);
    promptUser();
  });
}

// Função principal
async function main() {
  console.log(`\n${colors.cyan}${colors.bright}=== Sistema Nexus - Chat Simplificado ====${colors.reset}\n`);
  
  printMessage('system', `Bem-vindo à interface de chat do Sistema Nexus! 
Digite /ajuda para ver a lista de comandos disponíveis, /agentes para ver a lista de agentes, 
ou digite 'sair' para encerrar.`, 'Sistema');
  
  promptUser();
}

// Iniciar o chat
main().catch(error => {
  console.error(`${colors.red}Erro:${colors.reset}`, error);
  rl.close();
});
