// scripts/test-orchestrator.cjs

/**
 * Script para testar o OrchestratorAgent
 */

// Usar require para CommonJS
const OrchestratorAgent = require('../src/agents/orchestrator_agent');

// Função principal assíncrona para testes
async function main() {
  const agent = new OrchestratorAgent();
  console.log('Inicializando o sistema com OrchestratorAgent...');
  
  try {
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
console.log('Iniciando testes do OrchestratorAgent...');
main().then(result => {
  console.log('Testes concluídos com sucesso!');
}).catch(error => {
  console.error('Falha nos testes:', error);
});
