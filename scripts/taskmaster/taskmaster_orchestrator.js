/**
 * Integração do TaskMaster com o Orquestrador do Nexus
 * 
 * Este script integra o TaskMaster com o sistema de orquestração do Nexus,
 * permitindo que seja iniciado automaticamente junto com o sistema.
 */

import initializeTaskMaster from './initialize_taskmaster.js';

/**
 * Registra o TaskMaster no orquestrador do Nexus
 * @param {Object} orchestratorAgent - Agente orquestrador do Nexus
 */
async function registerTaskMasterWithOrchestrator(orchestratorAgent) {
  if (!orchestratorAgent) {
    console.error('Agente orquestrador não fornecido. A integração não será registrada.');
    return;
  }
  
  // Registrar como subsistema
  orchestratorAgent.registerSubsystem('taskmaster', {
    name: 'TaskMaster',
    description: 'Sistema de gerenciamento de tarefas integrado com o Nexus',
    initialize: async (nexusSystem) => {
      console.log('Inicializando integração do TaskMaster...');
      
      try {
        // Inicializar TaskMaster
        const taskMasterControl = await initializeTaskMaster(nexusSystem);
        
        // Armazenar controles no orquestrador para uso posterior
        orchestratorAgent.subsystemControls.taskmaster = taskMasterControl;
        
        console.log('Integração do TaskMaster inicializada com sucesso');
        return true;
      } catch (error) {
        console.error('Erro ao inicializar integração do TaskMaster:', error);
        return false;
      }
    },
    shutdown: async () => {
      console.log('Desligando integração do TaskMaster...');
      
      try {
        // Parar observador de arquivos
        if (orchestratorAgent.subsystemControls.taskmaster?.stopWatcher) {
          orchestratorAgent.subsystemControls.taskmaster.stopWatcher();
        }
        
        console.log('Integração do TaskMaster desligada com sucesso');
        return true;
      } catch (error) {
        console.error('Erro ao desligar integração do TaskMaster:', error);
        return false;
      }
    },
    status: () => {
      return {
        running: orchestratorAgent.subsystemControls.taskmaster?.initialized || false,
        details: {
          enabled: process.env.TASKMASTER_ENABLED === 'true',
          path: process.env.TASKMASTER_PATH
        }
      };
    }
  });
  
  console.log('TaskMaster registrado no orquestrador do Nexus');
}

export {
  registerTaskMasterWithOrchestrator
};
