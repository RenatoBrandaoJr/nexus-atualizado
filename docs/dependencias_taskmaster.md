# Dependências para Integração do TaskMaster

## Dependências do Node.js

```json
{
  "dependencies": {
    "claude-task-master": "^1.0.0",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "inquirer": "^9.2.10",
    "node-notifier": "^10.0.1",
    "json-diff": "^1.0.0"
  }
}
```

## Descrição das Dependências

- **claude-task-master**: Pacote principal do TaskMaster para gerenciamento de tarefas
- **commander**: Biblioteca para criação de interfaces de linha de comando
- **chalk**: Formatação colorida para saída no terminal
- **ora**: Spinners elegantes para operações assíncronas no terminal
- **inquirer**: Interface interativa para prompts de linha de comando
- **node-notifier**: Sistema de notificações nativo para desktop
- **json-diff**: Utilitário para comparar e visualizar diferenças em arquivos JSON

## Configuração Adicional

### Configuração do TaskMaster

O arquivo `.taskmasterconfig` já contém a configuração básica, mas pode precisar de ajustes:

```json
{
  "models": {
    "main": {
      "provider": "anthropic",
      "modelId": "claude-3-7-sonnet-20250219",
      "maxTokens": 120000,
      "temperature": 0.2
    }
  },
  "global": {
    "logLevel": "info",
    "debug": false,
    "defaultSubtasks": 5,
    "defaultPriority": "medium",
    "projectName": "Nexus"
  }
}
```

### Aliases para facilitar o uso

Adicionar no arquivo `.bashrc` ou `.zshrc`:

```bash
# Aliases para TaskMaster
alias tm="npx task-master"
alias tasks="npx task-master list"
alias nexttask="npx task-master next"
```

## Integração com Sistema de Eventos

Para garantir sincronização em tempo real, será necessário integrar com o sistema de eventos do Nexus:

```javascript
// Exemplo de código para integração de eventos
import { EventEmitter } from 'events';

const taskMasterEvents = new EventEmitter();

// Escutar por mudanças nas tarefas
taskMasterEvents.on('task:updated', (taskId, changes) => {
  // Notificar KanbanAgent sobre a mudança
  kanbanAgent.updateCardFromTask(taskId, changes);
  
  // Notificar ProjectManagerAgent
  projectManagerAgent.handleTaskUpdate(taskId, changes);
});

// Emitir eventos quando tarefas forem atualizadas
function updateTask(taskId, changes) {
  // Lógica para atualizar a tarefa
  // ...
  
  // Emitir evento
  taskMasterEvents.emit('task:updated', taskId, changes);
}
```
