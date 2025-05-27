/**
 * TaskMaster Commands - Integração de comandos do TaskMaster com o Nexus
 * 
 * Este arquivo implementa comandos para integrar o TaskMaster com o sistema
 * de comandos do Nexus, permitindo gerenciar tarefas diretamente pela interface.
 */

import {
  listTasks,
  getTask,
  createTask,
  updateTaskStatus,
  expandTask,
  getNextTask,
  checkTaskMasterSetup,
  TASKMASTER_ENABLED
} from './taskmaster_util.js';

/**
 * Registra comandos do TaskMaster no sistema de comandos do Nexus
 * @param {Object} chatCommands - Sistema de comandos do Nexus
 */
function registerTaskMasterCommands(chatCommands) {
  if (!TASKMASTER_ENABLED) {
    console.warn('TaskMaster não está habilitado. Os comandos não serão registrados.');
    return;
  }
  
  // Comando /task list - Lista todas as tarefas
  chatCommands.registerCommand('task', {
    description: 'Gerencia tarefas usando o TaskMaster',
    handler: handleTaskCommand.bind(null, chatCommands),
    params: ['subcommand', 'param1', 'param2', 'param3']
  });
  
  console.log('Comandos do TaskMaster registrados com sucesso');
}

/**
 * Processa comandos relacionados a tarefas
 * @param {Object} chatCommands - Sistema de comandos do Nexus
 * @param {Array} params - Parâmetros do comando
 * @param {Object} context - Contexto do usuário
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskCommand(chatCommands, params, context) {
  const [subcommand, param1, param2, param3] = params;
  
  // Verificar se o TaskMaster está configurado
  const isSetup = await checkTaskMasterSetup();
  if (!isSetup) {
    return {
      type: 'error',
      message: 'O TaskMaster não está configurado corretamente. Configure o ambiente primeiro.'
    };
  }
  
  try {
    switch (subcommand) {
      case 'list':
        return await handleTaskList(param1);
      
      case 'show':
        if (!param1) {
          return {
            type: 'error',
            message: 'É necessário fornecer o ID da tarefa. Exemplo: /task show 1'
          };
        }
        return await handleTaskShow(param1);
      
      case 'next':
        return await handleTaskNext();
      
      case 'create':
        return {
          type: 'info',
          message: 'Para criar uma tarefa, use o comando: /task create --title="Título" --description="Descrição" [--priority="high|medium|low"] [--details="Detalhes da tarefa"]'
        };
      
      case 'status':
        if (!param1 || !param2) {
          return {
            type: 'error',
            message: 'É necessário fornecer o ID da tarefa e o novo status. Exemplo: /task status 1 done'
          };
        }
        return await handleTaskStatus(param1, param2, context.userId);
      
      case 'expand':
        if (!param1) {
          return {
            type: 'error',
            message: 'É necessário fornecer o ID da tarefa. Exemplo: /task expand 1 [número_subtarefas]'
          };
        }
        return await handleTaskExpand(param1, param2);
      
      default:
        return {
          type: 'info',
          message: `
### Comandos disponíveis do TaskMaster:

- **/task list [status]**: Lista todas as tarefas (opcionalmente filtradas por status)
- **/task show <id>**: Mostra detalhes de uma tarefa específica
- **/task next**: Mostra a próxima tarefa a ser trabalhada
- **/task status <id> <novo_status>**: Atualiza o status de uma tarefa
- **/task expand <id> [num]**: Expande uma tarefa em subtarefas
- **/task create**: Mostra instruções para criar uma tarefa

**Exemplos:**
/task list
/task list done
/task show 3
/task status 2 in-progress
/task expand 4 5
`
        };
    }
  } catch (error) {
    console.error(`Erro ao processar comando do TaskMaster:`, error);
    return {
      type: 'error',
      message: `Erro ao processar o comando: ${error.message}`
    };
  }
}

/**
 * Processa o comando de listar tarefas
 * @param {string} status - Status para filtrar (opcional)
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskList(status) {
  const tasks = await listTasks({ status });
  
  if (tasks.length === 0) {
    return {
      type: 'info',
      message: status ? 
        `Nenhuma tarefa encontrada com status "${status}".` : 
        'Nenhuma tarefa encontrada.'
    };
  }
  
  const statusEmojis = {
    'pending': '⏱️',
    'in-progress': '🔄',
    'review': '👀',
    'done': '✅',
    'deferred': '⏳',
    'cancelled': '❌'
  };
  
  const taskList = tasks.map(task => {
    const emoji = statusEmojis[task.status] || '❓';
    return `${emoji} **Tarefa ${task.id}**: ${task.title} [${task.status}] - ${task.description}`;
  }).join('\n\n');
  
  return {
    type: 'success',
    message: `### Tarefas ${status ? `com status "${status}"` : ''}\n\n${taskList}`
  };
}

/**
 * Processa o comando de mostrar detalhes de uma tarefa
 * @param {string} taskId - ID da tarefa
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskShow(taskId) {
  const task = await getTask(taskId);
  
  if (!task) {
    return {
      type: 'error',
      message: `Tarefa ${taskId} não encontrada.`
    };
  }
  
  const details = task.details || 'Sem detalhes adicionais.';
  const dependencies = task.dependencies?.length > 0 ? 
    `\n\n**Dependências:** ${task.dependencies.join(', ')}` : 
    '';
  
  const subtasksSection = task.subtasks?.length > 0 ? 
    `\n\n### Subtarefas:\n${task.subtasks.map(st => 
      `- **${st.id}**: ${st.title} [${st.status}]`
    ).join('\n')}` : 
    '';
  
  return {
    type: 'success',
    message: `
### Tarefa ${task.id}: ${task.title}

**Status:** ${task.status}
**Prioridade:** ${task.priority || 'média'}
**Descrição:** ${task.description}${dependencies}

**Detalhes:**
${details}${subtasksSection}
`
  };
}

/**
 * Processa o comando de mostrar a próxima tarefa
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskNext() {
  const result = await getNextTask();
  
  if (!result || !result.nextTask) {
    return {
      type: 'info',
      message: 'Não há tarefas pendentes para trabalhar no momento.'
    };
  }
  
  const task = result.nextTask;
  
  return {
    type: 'success',
    message: `
### Próxima Tarefa: ${task.id} - ${task.title}

**Status:** ${task.status}
**Prioridade:** ${task.priority}
**Descrição:** ${task.description}

Para começar a trabalhar nesta tarefa, use:
\`\`\`
/task status ${task.id} in-progress
\`\`\`

Para ver detalhes completos, use:
\`\`\`
/task show ${task.id}
\`\`\`
`
  };
}

/**
 * Processa o comando de atualizar o status de uma tarefa
 * @param {string} taskId - ID da tarefa
 * @param {string} newStatus - Novo status
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskStatus(taskId, newStatus, userId) {
  const validStatus = ['pending', 'in-progress', 'review', 'done', 'deferred', 'cancelled'];
  
  if (!validStatus.includes(newStatus)) {
    return {
      type: 'error',
      message: `Status inválido. Use um dos seguintes: ${validStatus.join(', ')}`
    };
  }
  
  await updateTaskStatus(taskId, newStatus);
  
  return {
    type: 'success',
    message: `Status da tarefa ${taskId} atualizado para "${newStatus}".`,
    metadata: {
      taskId,
      newStatus,
      userId,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Processa o comando de expandir uma tarefa em subtarefas
 * @param {string} taskId - ID da tarefa
 * @param {string} subtaskCount - Número de subtarefas (opcional)
 * @returns {Promise<Object>} - Resultado do comando
 */
async function handleTaskExpand(taskId, subtaskCount) {
  const numSubtasks = subtaskCount ? parseInt(subtaskCount, 10) : undefined;
  
  const result = await expandTask(taskId, numSubtasks);
  
  if (!result || !result.subtasks || result.subtasks.length === 0) {
    return {
      type: 'info',
      message: `A tarefa ${taskId} não pôde ser expandida.`
    };
  }
  
  const subtaskList = result.subtasks.map(st => 
    `- **${st.id}**: ${st.title}`
  ).join('\n');
  
  return {
    type: 'success',
    message: `
### Tarefa ${taskId} expandida em ${result.subtasks.length} subtarefas:

${subtaskList}

Para ver detalhes completos, use:
\`\`\`
/task show ${taskId}
\`\`\`
`
  };
}

export {
  registerTaskMasterCommands
};
