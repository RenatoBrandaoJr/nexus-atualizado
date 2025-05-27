/**
 * Inicialização do TaskMaster para o sistema Nexus
 * 
 * Este script inicializa a integração entre o TaskMaster e o sistema Nexus,
 * configurando eventos, comandos e verificando a instalação.
 */

import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';

import { 
  checkTaskMasterSetup, 
  TASKMASTER_ENABLED, 
  TASKMASTER_PATH 
} from './taskmaster_util.js';

import { 
  initializeTaskMasterEvents,
  setupTaskFileWatcher 
} from './taskmaster_events.js';

import { registerTaskMasterCommands } from './taskmaster_commands.js';

/**
 * Carrega as variáveis de ambiente do TaskMaster
 */
function loadTaskMasterEnv() {
  // Carregar configurações específicas do TaskMaster
  const taskMasterEnvPath = path.join(__dirname, 'taskmaster.env');
  dotenv.config({ path: taskMasterEnvPath });
  
  console.log('Variáveis de ambiente do TaskMaster carregadas');
}

/**
 * Verifica se o TaskMaster está instalado e o inicializa se necessário
 * @returns {Promise<boolean>} - true se inicializado com sucesso, false caso contrário
 */
async function ensureTaskMasterInitialized() {
  if (!TASKMASTER_ENABLED) {
    console.warn('TaskMaster não está habilitado. Configure TASKMASTER_ENABLED=true para ativar.');
    return false;
  }
  
  try {
    // Verificar se o TaskMaster está configurado
    const isSetup = await checkTaskMasterSetup();
    
    if (!isSetup) {
      console.log('TaskMaster não está inicializado. Inicializando...');
      
      // Executar comando de inicialização
      await new Promise((resolve, reject) => {
        exec(`npx task-master init --yes`, { cwd: TASKMASTER_PATH }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erro ao inicializar TaskMaster: ${error.message}`);
            console.error(`stderr: ${stderr}`);
            return reject(error);
          }
          
          console.log(stdout);
          resolve();
        });
      });
      
      console.log('TaskMaster inicializado com sucesso');
    } else {
      console.log('TaskMaster já está inicializado');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar/inicializar TaskMaster:', error);
    return false;
  }
}

/**
 * Inicializa a integração do TaskMaster com o sistema Nexus
 * @param {Object} nexusSystem - Sistema Nexus (com toolManager e chatCommands)
 * @returns {Promise<Object>} - Objeto com as funções de controle
 */
async function initializeTaskMaster(nexusSystem) {
  if (!nexusSystem || !nexusSystem.toolManager || !nexusSystem.chatCommands) {
    throw new Error('Sistema Nexus inválido. Certifique-se de fornecer toolManager e chatCommands.');
  }
  
  // Carregar variáveis de ambiente
  loadTaskMasterEnv();
  
  // Verificar/inicializar TaskMaster
  const isInitialized = await ensureTaskMasterInitialized();
  
  if (!isInitialized) {
    console.warn('Não foi possível inicializar o TaskMaster. A integração não será realizada.');
    return {
      initialized: false,
      stopWatcher: () => {}
    };
  }
  
  // Inicializar sistema de eventos
  const taskMasterEvents = initializeTaskMasterEvents(nexusSystem.toolManager);
  
  // Configurar observador de arquivos
  const stopWatcher = setupTaskFileWatcher(nexusSystem.toolManager);
  
  // Registrar comandos
  registerTaskMasterCommands(nexusSystem.chatCommands);
  
  console.log('Integração do TaskMaster com o sistema Nexus concluída com sucesso');
  
  // Retornar funções de controle
  return {
    initialized: true,
    stopWatcher,
    events: taskMasterEvents
  };
}

export default initializeTaskMaster;
