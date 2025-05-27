# Documentação do Template Windsurf

## Visão Geral

O Template Windsurf é uma arquitetura completa para desenvolvimento de aplicações SaaS baseada em agentes inteligentes interconectados. Esta arquitetura utiliza MCPs (Model-Controller-Processors) configurados para automatizar fluxos de trabalho, gerenciar projetos, processar dados e fornecer assistência contextual aos usuários.

Este documento descreve a arquitetura geral, os agentes disponíveis, suas integrações e fluxos de trabalho principais.

## Arquitetura de Agentes

O Template Windsurf implementa uma arquitetura baseada em agentes especializados que se comunicam através de eventos e interfaces bem definidas. Cada agente é responsável por um domínio específico e pode interagir com outros agentes para realizar tarefas complexas.

### Agentes Disponíveis

1. **ProjectManagerAgent** - Gerencia projetos, tarefas, prazos e recursos
2. **KanbanAgent** - Gerencia quadros Kanban, movimentação de cartões e fluxos de trabalho
3. **DashboardAgent** - Cria e gerencia dashboards e visualizações de dados
4. **AIAssistantAgent** - Fornece assistência contextual baseada em IA
5. **IntegrationAgent** - Gerencia integrações com serviços externos
6. **SecurityAgent** - Implementa autenticação, autorização e políticas de segurança
7. **UIUXAgent** - Gerencia design system, protótipos e fluxos de UX
8. **FrontendAgent** - Gerencia componentes React e interfaces de usuário
9. **BackendAgent** - Implementa APIs, lógica de negócios e processamento de requisições
10. **DatabaseAgent** - Gerencia schemas, queries e migrações de banco de dados
11. **DocumentAgent** - Gerencia documentação técnica e de usuário

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Interface do Usuário                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         Camada de Frontend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │FrontendAgent│  │  UIUXAgent  │  │DashboardAgent│ │    ...      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         Camada de Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │BackendAgent │  │SecurityAgent│  │ProjectManager│  │KanbanAgent │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │AIAssistant  │  │IntegrationAg│  │DocumentAgent│  │    ...      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         Camada de Dados                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │DatabaseAgent│  │  Supabase   │  │   GitHub    │  │    ...      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## MCPs Configurados

O Template Windsurf utiliza os seguintes MCPs (Model-Controller-Processors):

1. **Sequential-Thinking** - Para decomposição de problemas complexos em etapas lógicas
2. **Supabase** - Para persistência de dados, autenticação e gerenciamento de usuários
3. **Figma** - Para design system, protótipos e fluxos de UX
4. **GitHub** - Para gerenciamento de código, issues e pull requests
5. **Puppeteer** - Para automação de testes e interações com navegadores
6. **Claude-TaskMaster** - Para gerenciamento inteligente de tarefas e projetos

## Fluxos de Trabalho Principais

### Fluxo de Gerenciamento de Projetos

1. **Criação de Projeto**
   - Usuário solicita criação de projeto
   - ProjectManagerAgent valida dados e cria projeto
   - DatabaseAgent cria tabelas necessárias
   - KanbanAgent cria quadro Kanban para o projeto
   - DashboardAgent cria dashboard inicial
   - DocumentAgent gera documentação inicial

2. **Gerenciamento de Tarefas**
   - ProjectManagerAgent cria e atribui tarefas
   - Claude-TaskMaster analisa e prioriza tarefas
   - KanbanAgent atualiza quadro Kanban
   - AIAssistantAgent fornece assistência contextual
   - IntegrationAgent sincroniza com GitHub Issues

3. **Monitoramento de Progresso**
   - ProjectManagerAgent monitora prazos e progresso
   - DashboardAgent atualiza visualizações
   - KanbanAgent identifica gargalos
   - AIAssistantAgent sugere otimizações

### Fluxo de Desenvolvimento Frontend

1. **Design e Prototipação**
   - UIUXAgent cria designs no Figma
   - UIUXAgent gera protótipos interativos
   - UIUXAgent emite evento de design concluído

2. **Implementação de Componentes**
   - FrontendAgent recebe designs do Figma
   - FrontendAgent implementa componentes React
   - FrontendAgent executa testes automatizados
   - FrontendAgent gera documentação de componentes

3. **Integração com Backend**
   - FrontendAgent consome APIs do BackendAgent
   - BackendAgent processa requisições
   - DatabaseAgent executa queries
   - IntegrationAgent gerencia integrações externas

### Fluxo de Gerenciamento de Banco de Dados

1. **Criação de Schema**
   - DatabaseAgent cria schema inicial
   - DatabaseAgent implementa políticas de segurança
   - DatabaseAgent gera documentação do schema

2. **Migrações de Banco de Dados**
   - DatabaseAgent cria migrações
   - DatabaseAgent aplica migrações
   - DatabaseAgent valida integridade
   - DatabaseAgent atualiza documentação

3. **Otimização e Monitoramento**
   - DatabaseAgent monitora performance
   - DatabaseAgent otimiza queries
   - DatabaseAgent gera backups regulares
   - DatabaseAgent emite alertas de problemas

## Integrações entre Agentes

### Matriz de Integrações

| Agente             | Integra com                                                  |
|--------------------|--------------------------------------------------------------|
| ProjectManagerAgent| KanbanAgent, DashboardAgent, AIAssistantAgent, DocumentAgent |
| KanbanAgent        | ProjectManagerAgent, AIAssistantAgent, IntegrationAgent      |
| DashboardAgent     | ProjectManagerAgent, DatabaseAgent, BackendAgent             |
| AIAssistantAgent   | Todos os outros agentes                                      |
| IntegrationAgent   | Todos os outros agentes, serviços externos                   |
| SecurityAgent      | Todos os outros agentes                                      |
| UIUXAgent          | FrontendAgent, DocumentAgent                                 |
| FrontendAgent      | UIUXAgent, BackendAgent, DocumentAgent                       |
| BackendAgent       | FrontendAgent, DatabaseAgent, SecurityAgent                  |
| DatabaseAgent      | BackendAgent, DocumentAgent, SecurityAgent                   |
| DocumentAgent      | Todos os outros agentes                                      |

### Eventos Principais

| Evento               | Emitido por           | Consumido por                                    |
|----------------------|------------------------|--------------------------------------------------|
| project:created      | ProjectManagerAgent    | Vários agentes                                   |
| task:created         | ProjectManagerAgent    | KanbanAgent, AIAssistantAgent                    |
| task:updated         | ProjectManagerAgent    | KanbanAgent, DashboardAgent                      |
| design:implemented   | FrontendAgent          | DocumentAgent, ProjectManagerAgent               |
| component:created    | FrontendAgent          | DocumentAgent, UIUXAgent                         |
| api:request          | BackendAgent           | SecurityAgent, DatabaseAgent                     |
| schema:updated       | DatabaseAgent          | DocumentAgent, BackendAgent                      |
| documentation:generated | DocumentAgent       | ProjectManagerAgent                              |
| security:breach      | SecurityAgent          | Todos os agentes                                 |
| integration:event    | IntegrationAgent       | Vários agentes                                   |

## Extensão e Personalização

O Template Windsurf foi projetado para ser extensível e personalizável. Novos agentes podem ser adicionados seguindo o padrão de arquitetura existente, e os agentes atuais podem ser modificados para atender a requisitos específicos.

### Adicionando um Novo Agente

1. Criar arquivo de implementação em `src/agents/nome_do_agente.js`
2. Criar arquivo de regras em `.windsurf/rules/nome_do_agente_rules.md`
3. Implementar métodos públicos, eventos e integrações
4. Registrar o agente no sistema
5. Atualizar documentação

### Personalizando um Agente Existente

1. Modificar arquivo de implementação em `src/agents/nome_do_agente.js`
2. Atualizar arquivo de regras em `.windsurf/rules/nome_do_agente_rules.md`
3. Garantir compatibilidade com outros agentes
4. Atualizar documentação

## Boas Práticas

1. **Comunicação via Eventos** - Utilizar eventos para comunicação entre agentes
2. **Validação de Entrada** - Validar rigorosamente todos os dados de entrada
3. **Logging Estruturado** - Utilizar logging estruturado para facilitar análise
4. **Tratamento de Erros** - Implementar tratamento de erros consistente
5. **Documentação Automática** - Manter documentação atualizada automaticamente
6. **Testes Automatizados** - Implementar testes para todos os componentes
7. **Segurança Primeiro** - Priorizar segurança em todas as operações
8. **Performance** - Otimizar performance desde o início
9. **Acessibilidade** - Garantir acessibilidade em componentes frontend
10. **Versionamento** - Utilizar versionamento semântico para todos os componentes

## Requisitos Técnicos

- Node.js 18+
- PostgreSQL 14+ (via Supabase)
- React 18+
- GitHub
- Figma

## Configuração Inicial

1. Clonar repositório
2. Instalar dependências: `npm install`
3. Configurar variáveis de ambiente
4. Inicializar banco de dados: `npm run db:init`
5. Iniciar aplicação: `npm run dev`

## Conclusão

O Template Windsurf fornece uma arquitetura robusta e flexível para desenvolvimento de aplicações SaaS baseada em agentes inteligentes. Com seus MCPs configurados e fluxos de trabalho automatizados, o template permite desenvolvimento rápido e manutenção simplificada de aplicações complexas.

Para mais detalhes sobre cada agente, consulte os arquivos de regras em `.windsurf/rules/` e as implementações em `src/agents/`.
