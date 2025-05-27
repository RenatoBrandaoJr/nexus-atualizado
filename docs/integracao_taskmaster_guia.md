# Guia de Integração do TaskMaster com o Nexus

Este documento apresenta um guia completo sobre como utilizar a integração do TaskMaster com o sistema Nexus.

## Índice

1. [Visão Geral](#visão-geral)
2. [Comandos de Terminal](#comandos-de-terminal)
3. [Interface Web](#interface-web)
4. [API REST](#api-rest)
5. [Integração com Kanban](#integração-com-kanban)
6. [Solução de Problemas](#solução-de-problemas)

## Visão Geral

A integração do TaskMaster com o Nexus permite gerenciar tarefas de forma eficiente, com suporte para:

- Criação e gerenciamento de tarefas via linha de comando
- Visualização e manipulação de tarefas através de interface web
- Sincronização de tarefas com o quadro Kanban
- API REST para integrações personalizadas
- Eventos para comunicação em tempo real

## Comandos de Terminal

Os seguintes comandos estão disponíveis no terminal do Nexus:

### Comandos Básicos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `tm` | Comando principal do TaskMaster | `tm list` |
| `tm-list` | Listar todas as tarefas | `tm-list` ou `tm-list pending` |
| `tm-show` | Mostrar detalhes de uma tarefa | `tm-show 1` |
| `tm-next` | Mostrar a próxima tarefa a ser trabalhada | `tm-next` |
| `tm-status` | Atualizar o status de uma tarefa | `tm-status 1 done` |
| `tm-expand` | Expandir uma tarefa em subtarefas | `tm-expand 1 5` |
| `tm-create` | Criar uma nova tarefa | Ver abaixo |

### Criação de Tarefas

Para criar uma nova tarefa:

```
tm-create --title="Implementar login" --description="Criar tela de login" --priority="high"
```

Opções disponíveis:

- `--title`: Título da tarefa (obrigatório)
- `--description`: Descrição da tarefa (obrigatório)
- `--details`: Detalhes da implementação
- `--priority`: Prioridade da tarefa (high, medium, low)
- `--dependencies`: IDs de tarefas dependentes (separados por vírgula)

### Status de Tarefas

Os seguintes status estão disponíveis:

- `pending`: Tarefa pendente
- `in-progress`: Tarefa em andamento
- `review`: Tarefa em revisão
- `done`: Tarefa concluída
- `deferred`: Tarefa adiada
- `cancelled`: Tarefa cancelada

## Interface Web

A interface web do TaskMaster está disponível em `/taskmaster` no navegador. Ela oferece:

### Visualização de Tarefas

- Lista de todas as tarefas com filtros por status
- Detalhes completos de cada tarefa
- Visualização de subtarefas

### Gerenciamento de Tarefas

- Criação de novas tarefas
- Atualização de status
- Expansão de tarefas em subtarefas

### Como Acessar

1. Inicie o servidor Nexus
2. Acesse `http://localhost:3000/taskmaster` no navegador
3. Utilize a interface para gerenciar suas tarefas

## API REST

A integração inclui uma API REST completa para gerenciar tarefas:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/taskmaster/tasks` | GET | Listar tarefas |
| `/api/taskmaster/tasks/:id` | GET | Obter detalhes de uma tarefa |
| `/api/taskmaster/tasks` | POST | Criar uma nova tarefa |
| `/api/taskmaster/tasks/:id/status` | PATCH | Atualizar o status de uma tarefa |
| `/api/taskmaster/tasks/:id/expand` | POST | Expandir uma tarefa em subtarefas |
| `/api/taskmaster/next-task` | GET | Obter a próxima tarefa a ser trabalhada |

### Exemplos de Uso

#### Listar Tarefas

```
GET /api/taskmaster/tasks
```

Parâmetros opcionais:
- `status`: Filtrar por status
- `withSubtasks`: Incluir subtarefas (true/false)

#### Criar Tarefa

```
POST /api/taskmaster/tasks
Content-Type: application/json

{
  "title": "Implementar login",
  "description": "Criar tela de login",
  "priority": "high",
  "details": "Utilizar autenticação JWT"
}
```

#### Atualizar Status

```
PATCH /api/taskmaster/tasks/1/status
Content-Type: application/json

{
  "status": "done"
}
```

## Integração com Kanban

A integração com o Kanban permite visualizar e gerenciar tarefas do TaskMaster no quadro Kanban do Nexus.

### Mapeamento de Status

Os status do TaskMaster são mapeados para colunas do Kanban conforme configuração:

- `pending` → "A fazer"
- `in-progress` → "Em andamento"
- `review` → "Revisão"
- `done` → "Concluído"
- `deferred` → "Adiado"
- `cancelled` → "Cancelado"

### Sincronização

- Atualizações de status no TaskMaster são refletidas automaticamente no Kanban
- Movimentação de cartões no Kanban atualiza o status das tarefas no TaskMaster
- Criação de tarefas no TaskMaster gera cartões no Kanban

## Solução de Problemas

### Problemas Comuns

1. **TaskMaster não está habilitado**
   - Verifique se `TASKMASTER_ENABLED=true` está configurado no arquivo `.env`

2. **Comandos não funcionam**
   - Certifique-se de que o TaskMaster está instalado: `npm install -g claude-task-master`
   - Verifique o caminho correto em `TASKMASTER_PATH` no arquivo `.env`

3. **Tarefas não aparecem no Kanban**
   - Verifique se o mapeamento de status está configurado corretamente
   - Certifique-se de que o sistema de eventos está funcionando

### Logs

Os logs do TaskMaster estão disponíveis em:

- `logs/taskmaster.log`: Logs gerais do TaskMaster
- `logs/server.log`: Logs do servidor incluindo chamadas à API
- `logs/events.log`: Logs de eventos de sincronização

### Suporte

Para problemas não resolvidos, entre em contato com a equipe de suporte ou consulte a documentação completa do TaskMaster em `docs/taskmaster/`.
