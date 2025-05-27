// scripts/test-with-dotenv.cjs

/**
 * Script para testar o OrchestratorAgent com carregamento
 * adequado das variáveis de ambiente
 */

// Carregar variáveis de ambiente
const fs = require('fs');
const path = require('path');

// Carregamento manual de variáveis de ambiente do arquivo .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
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

const OrchestratorAgent = require('../src/agents/orchestrator_agent');

// Função principal assíncrona para testes
async function main() {
  console.log('Inicializando o sistema com OrchestratorAgent...');
  
  try {
    // Instanciar o agente orquestrador
    const agent = new OrchestratorAgent();
    
    // Inicializar o sistema
    await agent.initializeSystem({
      environment: 'production',
      configPath: '/Users/renatobrandao/Documents/Nexus atualizado/src/config/default.js'
    });
    
    console.log('Sistema inicializado com sucesso!');
    return agent;
  } catch (error) {
    console.error('Erro ao inicializar o sistema:', error);
    throw error;
  }
}

// Executar a função principal
console.log('Iniciando testes do OrchestratorAgent com dotenv...');
main().then(result => {
  console.log('Testes concluídos com sucesso!');
}).catch(error => {
  console.error('Falha nos testes:', error);
});
