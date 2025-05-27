# Diagrama de Fluxo de Dados: Nexus ↔ TaskMaster

## Fluxo de Comandos e Dados

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|    Interface     |     |    Sistema de    |     |   TaskMaster     |
|    do Usuário    +---->+    Comandos      +---->+    CLI/API       |
|                  |     |                  |     |                  |
+--------^---------+     +--------^---------+     +--------^---------+
         |                        |                        |
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   KanbanAgent    |<--->| ProjectManager   |<--->|   Arquivos de    |
|                  |     |     Agent        |     |     Tarefas      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         ^                        ^                        ^
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Visualização    |     |  Gerenciamento   |     |  Banco de Dados |
|    Kanban        |     |   de Projetos    |     |                 |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

## Fluxo de Operações de Tarefas

```
+---------------------------+
|                           |
|  Comando de Criação       |
|  de Tarefa no Nexus       |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  ProjectManagerAgent      |
|  processa o comando       |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Chamada para API do      |
|  TaskMaster (CLI)         |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Criação da tarefa no     |
|  tasks.json               |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Geração do arquivo       |
|  individual da tarefa     |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Atualização da UI        |
|  e notificação            |
|                           |
+---------------------------+
```

## Fluxo de Sincronização com Kanban

```
+---------------------------+
|                           |
|  Atualização de status    |
|  no TaskMaster            |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Evento de mudança        |
|  de status detectado      |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  KanbanAgent notificado   |
|  sobre a mudança          |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Cartão movido para       |
|  coluna correspondente    |
|  no quadro Kanban         |
|                           |
+---------------------------+
```

## Fluxo de Dados de Análise

```
+---------------------------+
|                           |
|  Solicitação de relatório |
|  de progresso             |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  ProjectManagerAgent      |
|  coleta dados do          |
|  TaskMaster               |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Análise e processamento  |
|  dos dados de tarefas     |
|                           |
+-------------+-------------+
              |
              v
+---------------------------+
|                           |
|  Geração e exibição       |
|  do relatório para        |
|  o usuário                |
|                           |
+---------------------------+
```
