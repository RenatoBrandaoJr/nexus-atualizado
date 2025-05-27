/**
 * TaskMaster Util - Utilitários para integração do TaskMaster com o Nexus
 * 
 * Este arquivo contém funções utilitárias para facilitar a integração
 * entre o sistema Nexus e o TaskMaster para gerenciamento de tarefas.
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do TaskMaster
const TASKMASTER_PATH = process.env.TASKMASTER_PATH || process.cwd();
const TASKMASTER_ENABLED = process.env.TASKMASTER_ENABLED === 'true';
const TASKMASTER_DEFAULT_STATUS = process.env.TASKMASTER_DEFAULT_STATUS || 'pending';
const TASKMASTER_DEFAULT_PRIORITY = process.env.TASKMASTER_DEFAULT_PRIORITY || 'medium';

/**
 * Executa um comando do TaskMaster e retorna o resultado
 * @param {string} command - Comando a ser executado (sem o prefixo 'npx task-master')
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object|string>} - Resultado do comando
 */
async function executeTaskMasterCommand(command, options = {}) {
  if (!TASKMASTER_ENABLED) {
    throw new Error('TaskMaster não está habilitado. Configure TASKMASTER_ENABLED=true no arquivo .env');
  }

  const fullCommand = `npx task-master ${command}`;
  const cwd = options.cwd || TASKMASTER_PATH;
  
  return new Promise((resolve, reject) => {
    exec(fullCommand, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar comando TaskMaster: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return reject(error);
      }
      
      if (stderr) {
        console.warn(`Aviso do TaskMaster: ${stderr}`);
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
 * Lista todas as tarefas do TaskMaster
 * @param {Object} filters - Filtros para as tarefas (ex: status, withSubtasks)
 * @returns {Promise<Array>} - Lista de tarefas
 */
async function listTasks(filters = {}) {
  const { status, withSubtasks } = filters;
  let command = 'get-tasks --json';
  
  if (status) {
    command += ` --status="${status}"`;
  }
  
  if (withSubtasks) {
    command += ' --withSubtasks';
  }
  
  return executeTaskMasterCommand(command);
}

/**
 * Obtém detalhes de uma tarefa específica
 * @param {string} taskId - ID da tarefa
 * @returns {Promise<Object>} - Detalhes da tarefa
 */
async function getTask(taskId) {
  return executeTaskMasterCommand(`get-task --id=${taskId} --json`);
}

/**
 * Cria uma nova tarefa no TaskMaster
 * @param {Object} taskData - Dados da tarefa
 * @returns {Promise<Object>} - Tarefa criada
 */
async function createTask(taskData) {
  const { title, description, priority, details, dependencies } = taskData;
  
  // Preparar comando
  const depStr = dependencies && dependencies.length > 0 ? 
    `--dependencies="${dependencies.join(',')}"` : '';
  const priorityStr = priority ? `--priority="${priority}"` : '';
  
  const command = `add-task --title="${title}" --description="${description}" ${priorityStr} --details="${details}" ${depStr}`;
  
  return executeTaskMasterCommand(command);
}

/**
 * Atualiza o status de uma tarefa
 * @param {string} taskId - ID da tarefa
 * @param {string} status - Novo status
 * @returns {Promise<Object>} - Resultado da atualização
 */
async function updateTaskStatus(taskId, status) {
  return executeTaskMasterCommand(`set-status --id=${taskId} --status="${status}"`);
}

/**
 * Expande uma tarefa em subtarefas
 * @param {string} taskId - ID da tarefa
 * @param {number} subtasks - Número de subtarefas (opcional)
 * @returns {Promise<Object>} - Resultado da expansão
 */
async function expandTask(taskId, subtasks) {
  let command = `expand --id=${taskId}`;
  
  if (subtasks) {
    command += ` --subtasks=${subtasks}`;
  }
  
  return executeTaskMasterCommand(command);
}

/**
 * Obtém a próxima tarefa a ser trabalhada
 * @returns {Promise<Object>} - Próxima tarefa
 */
async function getNextTask() {
  return executeTaskMasterCommand('next-task');
}

/**
 * Verifica se o TaskMaster está inicializado e configurado corretamente
 * @returns {Promise<boolean>} - true se estiver configurado, false caso contrário
 */
async function checkTaskMasterSetup() {
  if (!TASKMASTER_ENABLED) {
    return false;
  }
  
  try {
    // Verificar se o arquivo .taskmasterconfig existe
    const configPath = path.join(TASKMASTER_PATH, '.taskmasterconfig');
    await fs.access(configPath);
    
    // Verificar se a pasta tasks existe
    const tasksPath = path.join(TASKMASTER_PATH, 'tasks');
    await fs.access(tasksPath);
    
    // Verificar se o arquivo tasks.json existe
    const tasksJsonPath = path.join(tasksPath, 'tasks.json');
    await fs.access(tasksJsonPath);
    
    return true;
  } catch (error) {
    console.error('TaskMaster não está configurado corretamente:', error.message);
    return false;
  }
}

/**
 * Sincroniza o status de uma tarefa com o quadro Kanban
 * @param {string} taskId - ID da tarefa
 * @param {string} status - Novo status
 * @param {Object} eventEmitter - Emissor de eventos do sistema
 * @returns {Promise<void>}
 */
async function syncTaskWithKanban(taskId, status, eventEmitter) {
  try {
    // Atualizar o status da tarefa
    await updateTaskStatus(taskId, status);
    
    // Obter a tarefa atualizada
    const updatedTask = await getTask(taskId);
    
    // Emitir evento para atualizar o Kanban
    if (eventEmitter) {
      eventEmitter.emit('taskmaster:task:updated', updatedTask);
    }
  } catch (error) {
    console.error(`Erro ao sincronizar tarefa ${taskId} com Kanban:`, error);
    throw error;
  }
}

export {
  listTasks,
  getTask,
  createTask,
  updateTaskStatus,
  expandTask,
  getNextTask,
  checkTaskMasterSetup,
  syncTaskWithKanban,
  executeTaskMasterCommand,
  TASKMASTER_PATH,
  TASKMASTER_ENABLED,
  TASKMASTER_DEFAULT_STATUS,
  TASKMASTER_DEFAULT_PRIORITY
};
