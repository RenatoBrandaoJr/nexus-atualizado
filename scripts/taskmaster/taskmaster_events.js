/**
 * TaskMaster Events - Sistema de eventos para integração do TaskMaster com o Nexus
 * 
 * Este arquivo implementa um sistema de eventos para facilitar a comunicação
 * entre o TaskMaster e os agentes do Nexus, permitindo sincronização em tempo real.
 */

import { EventEmitter } from 'events';
import { 
  getTask, 
  listTasks, 
  updateTaskStatus,
  TASKMASTER_ENABLED 
} from './taskmaster_util.js';

// Criar emissor de eventos global
const taskMasterEvents = new EventEmitter();

/**
 * Inicializa o sistema de eventos do TaskMaster
 * @param {Object} toolManager - Gerenciador de ferramentas do Nexus
 * @returns {EventEmitter} - Emissor de eventos configurado
 */
function initializeTaskMasterEvents(toolManager) {
  if (!TASKMASTER_ENABLED) {
    console.warn('TaskMaster não está habilitado. Os eventos não serão registrados.');
    return taskMasterEvents;
  }
  
  // Registrar evento para atualização de status de tarefa
  toolManager.eventEmitter.on('taskmaster:status:updated', async (data) => {
    try {
      const { taskId, status, userId } = data;
      
      // Atualizar status da tarefa no TaskMaster
      await updateTaskStatus(taskId, status);
      
      // Obter a tarefa atualizada
      const updatedTask = await getTask(taskId);
      
      // Emitir evento para notificar outros componentes
      toolManager.eventEmitter.emit('taskmaster:task:updated', updatedTask);
      
      console.log(`Status da tarefa ${taskId} atualizado para ${status} por ${userId}`);
    } catch (error) {
      console.error('Erro ao processar evento de atualização de status:', error);
    }
  });
  
  // Registrar evento para movimentação de cartão no Kanban
  toolManager.eventEmitter.on('card:moved', async (data) => {
    try {
      const { cardId, columnId, boardId, metadata } = data;
      
      // Verificar se é um cartão associado a uma tarefa do TaskMaster
      if (metadata && metadata.isTaskMasterCard && metadata.taskId) {
        // Obter informações da coluna
        const column = await toolManager.executeTool('supabase:query', {
          table: 'kanban_columns',
          query: { id: columnId }
        });
        
        if (column && column.length > 0) {
          // Mapear o nome da coluna para o status do TaskMaster
          const columnName = column[0].name;
          const statusMap = {
            'A fazer': 'pending',
            'Em andamento': 'in-progress',
            'Revisão': 'review',
            'Concluído': 'done',
            'Adiado': 'deferred',
            'Cancelado': 'cancelled'
          };
          
          const newStatus = statusMap[columnName] || 'pending';
          
          // Atualizar o status da tarefa no TaskMaster
          await updateTaskStatus(metadata.taskId, newStatus);
          
          // Emitir evento para notificar outros componentes
          const updatedTask = await getTask(metadata.taskId);
          toolManager.eventEmitter.emit('taskmaster:task:updated', updatedTask);
          
          console.log(`Status da tarefa ${metadata.taskId} atualizado para ${newStatus} via Kanban`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de movimentação de cartão:', error);
    }
  });
  
  // Registrar evento para atualização de tarefas no TaskMaster (via linha de comando)
  taskMasterEvents.on('taskmaster:external:update', async (taskId) => {
    try {
      // Obter a tarefa atualizada
      const updatedTask = await getTask(taskId);
      
      // Emitir evento para notificar os agentes do Nexus
      toolManager.eventEmitter.emit('taskmaster:task:updated', updatedTask);
      
      console.log(`Tarefa ${taskId} atualizada externamente foi sincronizada com o Nexus`);
    } catch (error) {
      console.error('Erro ao processar atualização externa de tarefa:', error);
    }
  });
  
  return taskMasterEvents;
}

/**
 * Configura um observador para verificar alterações nos arquivos de tarefas
 * @param {Object} toolManager - Gerenciador de ferramentas do Nexus
 * @returns {function} - Função para parar a observação
 */
function setupTaskFileWatcher(toolManager) {
  if (!TASKMASTER_ENABLED) {
    console.warn('TaskMaster não está habilitado. O observador de arquivos não será iniciado.');
    return () => {};
  }
  
  let isWatching = true;
  let previousTasks = {};
  
  // Armazenar estado inicial das tarefas
  listTasks({ withSubtasks: true })
    .then(tasks => {
      tasks.forEach(task => {
        previousTasks[task.id] = JSON.stringify(task);
      });
    })
    .catch(error => console.error('Erro ao inicializar observador de tarefas:', error));
  
  // Configurar intervalo para verificar alterações
  const intervalId = setInterval(async () => {
    if (!isWatching) return;
    
    try {
      const currentTasks = await listTasks({ withSubtasks: true });
      const currentTasksMap = {};
      
      // Verificar alterações em tarefas existentes
      currentTasks.forEach(task => {
        currentTasksMap[task.id] = JSON.stringify(task);
        
        if (previousTasks[task.id] && previousTasks[task.id] !== currentTasksMap[task.id]) {
          // Tarefa foi atualizada
          toolManager.eventEmitter.emit('taskmaster:task:updated', task);
          console.log(`Tarefa ${task.id} foi atualizada externamente e sincronizada`);
        } else if (!previousTasks[task.id]) {
          // Nova tarefa criada
          toolManager.eventEmitter.emit('taskmaster:task:created', task);
          console.log(`Nova tarefa ${task.id} foi criada externamente e sincronizada`);
        }
      });
      
      // Verificar tarefas removidas
      Object.keys(previousTasks).forEach(taskId => {
        if (!currentTasksMap[taskId]) {
          // Tarefa foi removida
          toolManager.eventEmitter.emit('taskmaster:task:deleted', { id: taskId });
          console.log(`Tarefa ${taskId} foi removida externamente e sincronizada`);
        }
      });
      
      // Atualizar estado anterior
      previousTasks = currentTasksMap;
    } catch (error) {
      console.error('Erro ao verificar alterações nas tarefas:', error);
    }
  }, 5000); // Verificar a cada 5 segundos
  
  // Retornar função para parar a observação
  return () => {
    isWatching = false;
    clearInterval(intervalId);
    console.log('Observador de tarefas parado');
  };
}

export {
  initializeTaskMasterEvents,
  setupTaskFileWatcher,
  taskMasterEvents
};
