// scripts/test-all-agents.js

/**
 * Script para testar todos os agentes do sistema Nexus
 */

// Carregar variáveis de ambiente
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregamento manual de variáveis de ambiente do arquivo .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
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
  
  console.log('Variáveis de ambiente carregadas do arquivo .env');
}

// Carregar variáveis de ambiente antes de importar os agentes
loadEnv();

// Importar OrchestratorAgent e outros agentes
import OrchestratorAgent from '../src/agents/orchestrator_agent.js';
import SecurityAgent from '../src/agents/security_agent.js';
import DocumentAgent from '../src/agents/document_agent.js';
import DatabaseAgent from '../src/agents/database_agent.js';
import AIAssistantAgent from '../src/agents/ai_assistant_agent.js';
import FrontendAgent from '../src/agents/frontend_agent.js';
import BackendAgent from '../src/agents/backend_agent.js';
import IntegrationAgent from '../src/agents/integration_agent.js';
import NotificationAgent from '../src/agents/notification_agent.js';

// Função principal assíncrona para testes
async function main() {
  console.log('========== Iniciando teste de todos os agentes do sistema Nexus ==========');
  
  try {
    console.log('\n----- Inicializando SecurityAgent -----');
    const securityAgent = new SecurityAgent();
    
    console.log('\n----- Inicializando NotificationAgent -----');
    const notificationAgent = new NotificationAgent();
    
    console.log('\n----- Inicializando DocumentAgent -----');
    const documentAgent = new DocumentAgent();
    
    console.log('\n----- Inicializando DatabaseAgent -----');
    const databaseAgent = new DatabaseAgent();
    
    console.log('\n----- Inicializando AIAssistantAgent -----');
    const aiAssistantAgent = new AIAssistantAgent();
    
    console.log('\n----- Inicializando FrontendAgent -----');
    const frontendAgent = new FrontendAgent();
    
    console.log('\n----- Inicializando BackendAgent -----');
    const backendAgent = new BackendAgent();
    
    console.log('\n----- Inicializando IntegrationAgent -----');
    const integrationAgent = new IntegrationAgent();
    
    console.log('\n----- Inicializando OrchestratorAgent -----');
    const orchestratorAgent = new OrchestratorAgent();
    
    // Verificar configurações de segurança
    console.log('\n----- Verificando configurações de segurança -----');
    const securityConfig = await securityAgent.verifySecurityConfig({ 
      environment: 'production',
      timestamp: new Date().toISOString()
    });
    
    console.log('Resultado da verificação de segurança:', 
      securityConfig.valid ? '✅ Válida' : '❌ Inválida');
    
    if (!securityConfig.valid && securityConfig.issues) {
      console.log('Problemas encontrados:');
      securityConfig.issues.forEach(issue => console.log(`- ${issue}`));
    }
    
    // Inicializar o sistema usando o OrchestratorAgent
    console.log('\n----- Inicializando o sistema completo -----');
    const systemInitResult = await orchestratorAgent.initializeSystem({
      environment: 'production',
      configPath: path.resolve(__dirname, '../src/config/default.js')
    });
    
    console.log('Sistema inicializado com sucesso:', systemInitResult ? '✅ Sucesso' : '❌ Falha');
    
    console.log('\n========== Teste de todos os agentes concluído ==========');
    return true;
  } catch (error) {
    console.error('Erro ao testar agentes:', error);
    throw error;
  }
}

// Executar a função principal
console.log('Iniciando testes do sistema Nexus...');
main().then(result => {
  console.log('Testes concluídos com sucesso!');
}).catch(error => {
  console.error('Falha nos testes:', error);
});
