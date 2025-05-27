#!/usr/bin/env node

/**
 * Script para listar e consultar agentes do sistema Nexus
 * Use o comando: node scripts/list-agents.js
 */

import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';

// Configuração do diretório
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const agentsDir = resolve(rootDir, 'src/agents');

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

// Definição dos agentes com suas descrições
const agents = [
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
    • Verificação de configurações de segurança
    
    Use este agente quando precisar implementar ou verificar aspectos de segurança no seu projeto.`
  },
  {
    id: 2,
    name: 'NotificationAgent',
    description: 'Gerencia e envia notificações por diferentes canais',
    details: `O NotificationAgent é responsável por enviar e gerenciar notificações, incluindo:
    • Envio de notificações por diferentes canais (console, email, Slack)
    • Configuração de canais de notificação
    • Gerenciamento de prioridades de notificação
    • Formatação de mensagens
    
    Use este agente quando precisar implementar um sistema de notificações no seu projeto.`
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
    • Gerenciamento de versões de documentação
    
    Use este agente quando precisar gerar ou manter documentação para seu projeto.`
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
    • Análise de desempenho de consultas
    
    Use este agente quando precisar trabalhar com banco de dados no seu projeto.`
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
    • Ajuda contextual
    
    Este é o agente principal para obter assistência ao iniciar um projeto ou quando precisar de ajuda com tarefas complexas.`
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
    • Sincronização com design systems
    
    Use este agente quando estiver trabalhando com desenvolvimento frontend.`
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
    • Gerenciamento de limites de requisição
    
    Use este agente quando estiver trabalhando com desenvolvimento backend.`
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
    • Verificação de status de serviços
    
    Use este agente quando precisar integrar seu projeto com serviços externos.`
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
    • Rastreamento de operações
    
    Este é o agente principal para gerenciar o sistema como um todo e coordenar operações entre múltiplos agentes.`
  }
];

// Interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Função principal
async function main() {
  // Carregar variáveis de ambiente
  loadEnv();
  
  console.log(`\n${colors.cyan}${colors.bright}=== Sistema Nexus - Lista de Agentes ====${colors.reset}\n`);
  
  listAgents();
  promptForAgentSelection();
}

// Lista todos os agentes disponíveis
function listAgents() {
  agents.forEach(agent => {
    console.log(`${colors.yellow}${agent.id}.${colors.reset} ${colors.bright}${agent.name}${colors.reset} - ${agent.description}`);
  });
  console.log(`\n${colors.yellow}0.${colors.reset} Sair\n`);
}

// Solicita a seleção de um agente
function promptForAgentSelection() {
  rl.question(`${colors.green}Digite o número do agente que deseja consultar: ${colors.reset}`, (answer) => {
    const selection = parseInt(answer.trim());
    
    if (selection === 0) {
      console.log(`\n${colors.cyan}Obrigado por usar o sistema Nexus!${colors.reset}`);
      rl.close();
      return;
    }
    
    const selectedAgent = agents.find(a => a.id === selection);
    
    if (selectedAgent) {
      showAgentDetails(selectedAgent);
    } else {
      console.log(`\n${colors.red}Seleção inválida. Por favor, escolha um número válido.${colors.reset}\n`);
    }
    
    promptForAgentSelection();
  });
}

// Mostra detalhes de um agente específico
function showAgentDetails(agent) {
  console.log(`\n${colors.bgBlue}${colors.white}${colors.bright} ${agent.name} ${colors.reset}\n`);
  console.log(agent.details);
  
  // Verificar se o arquivo do agente existe
  const agentFilePath = resolve(agentsDir, `${agent.name.toLowerCase()}.js`);
  
  if (fs.existsSync(agentFilePath)) {
    console.log(`\n${colors.green}Arquivo do agente: ${agentFilePath}${colors.reset}`);
  } else {
    console.log(`\n${colors.red}Arquivo do agente não encontrado!${colors.reset}`);
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
}

// Executar a função principal
main().catch(error => {
  console.error(`${colors.red}Erro:${colors.reset}`, error);
  rl.close();
});
