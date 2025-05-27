# Integração TaskMaster com Nexus

## Visão Geral

Este documento descreve a integração entre o TaskMaster e o sistema Nexus, permitindo gerenciamento avançado de tarefas com visualização em quadros Kanban, sincronização em tempo real e comandos no terminal.

## Arquivos de Integração

A integração consiste nos seguintes componentes:

- **Utilitários TaskMaster** (`taskmaster_util.js`): Funções para interagir com a CLI do TaskMaster
- **Sistema de Eventos** (`taskmaster_events.js`): Sistema para sincronização em tempo real
- **Comandos Nexus** (`taskmaster_commands.js`): Comandos integrados ao sistema de chat do Nexus
- **Inicialização** (`initialize_taskmaster.js`): Script para inicializar a integração
- **Configuração** (`taskmaster.env`): Variáveis de ambiente para a integração

## Configuração

Para configurar a integração:

1. Certifique-se de que o TaskMaster está instalado globalmente:
   ```
   npm install -g claude-task-master
   ```

2. Edite o arquivo `scripts/taskmaster/taskmaster.env` conforme necessário para ajustar:
   - Caminho do projeto
   - Status padrão de tarefas
   - Mapeamento entre status de tarefas e colunas do Kanban

3. Adicione ao arquivo `.env` principal do projeto:
   ```
   TASKMASTER_ENABLED=true
   ```

## Comandos Disponíveis

A integração adiciona os seguintes comandos ao sistema Nexus:

- `/task list [status]`: Lista todas as tarefas (opcionalmente filtradas por status)
- `/task show <id>`: Mostra detalhes de uma tarefa específica
- `/task next`: Mostra a próxima tarefa a ser trabalhada
- `/task status <id> <novo_status>`: Atualiza o status de uma tarefa
- `/task expand <id> [num]`: Expande uma tarefa em subtarefas
- `/task create`: Mostra instruções para criar uma tarefa

## Integração com Kanban

A integração permite a sincronização bidirecional entre o TaskMaster e o quadro Kanban:

- Quando uma tarefa é atualizada no TaskMaster, seu cartão correspondente é movido no Kanban
- Quando um cartão é movido no Kanban, o status da tarefa é atualizado no TaskMaster

O mapeamento entre status de tarefas e colunas do Kanban é configurável no arquivo `taskmaster.env`.

## Agentes Integrados

Os seguintes agentes do Nexus foram adaptados para trabalhar com o TaskMaster:

- **ProjectManagerAgent**: Gerencia tarefas do TaskMaster
- **KanbanAgent**: Visualiza tarefas como cartões no quadro Kanban

## Fluxo de Dados

```
[Comandos Nexus] <---> [ProjectManagerAgent] <---> [TaskMaster CLI]
                              ^
                              |
                              v
[KanbanAgent] <----------> [Tarefas] <---------> [Arquivos .txt]
```

## Extensão

Para estender a integração:

1. **Novos comandos**: Adicione ao arquivo `taskmaster_commands.js`
2. **Novos eventos**: Configure no arquivo `taskmaster_events.js`
3. **Novos mapeamentos**: Ajuste o arquivo `taskmaster.env`

## Solução de Problemas

Se encontrar problemas:

1. Verifique se o TaskMaster está habilitado (`TASKMASTER_ENABLED=true`)
2. Confira o caminho do projeto em `TASKMASTER_PATH`
3. Verifique se o TaskMaster está inicializado (`npx task-master init --yes`)
4. Consulte os logs para mensagens de erro específicas
