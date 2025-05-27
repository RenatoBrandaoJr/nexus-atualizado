// scripts/initialize-system.js

/**
 * Script para inicializar o sistema de agentes Nexus
 */

// Importar o agente orquestrador
import OrchestratorAgent from '../src/agents/orchestrator_agent.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificar se existem módulos necessários
try {
  // Função principal assíncrona para inicialização
  async function main() {
    console.log('Inicializando Sistema de Agentes Nexus...');
    
    try {
      // Instanciar o agente orquestrador
      console.log('Criando instância do OrchestratorAgent...');
      const agent = new OrchestratorAgent();
      
      // Inicializar o sistema
      console.log('Configurando ambiente...');
      await agent.initializeSystem({
        environment: 'production',
        configPath: '../src/config/default.js'
      });
      
      console.log('Sistema de Agentes inicializado com sucesso!');
      console.log('Ambiente: production');
      console.log('Agentes ativos:', Object.keys(agent.agents).join(', ') || 'Nenhum');
      
      // Retornar a instância do agente para uso no console interativo
      return agent;
    } catch (error) {
      console.error('Erro ao inicializar o Sistema de Agentes:', error);
      throw error;
    }
  }
  
  // Executar a função principal
  console.log('Iniciando execução...');
  const agentPromise = main();
  
  // Exportar a promessa para acesso no console interativo
  // Não podemos usar module.exports em módulos ES
  globalThis.agentPromise = agentPromise;
  
  // Mensagem de instrução para uso no console
  console.log('\nPara acessar o agente no console interativo:');
  console.log('const agent = await agentPromise;');
  console.log('// Agora você pode interagir com o agente, por exemplo:');
  console.log('// agent.getStatus();');
  
} catch (error) {
  console.error('Erro fatal:', error);
  process.exit(1);
}
