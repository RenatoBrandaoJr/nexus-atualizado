# Especificação Técnica de Ferramentas e MCPs por Agente

Este documento detalha as ferramentas específicas e MCPs (Model Context Protocols) utilizados por cada agente no sistema de automação para o SaaS de gerenciamento de projetos no Windsurf AI. A especificação inclui parâmetros, formatos de dados e considerações técnicas para cada integração.

## Visão Geral da Arquitetura de Ferramentas

A arquitetura de ferramentas segue um modelo de camadas:

1. **Camada de Agentes**: Agentes especializados com responsabilidades específicas
2. **Camada de Adaptadores**: Interfaces padronizadas para comunicação com MCPs
3. **Camada de MCPs**: Protocolos de contexto de modelo que fornecem funcionalidades específicas
4. **Camada de Ferramentas**: Ferramentas individuais expostas por cada MCP

### Convenções de Nomenclatura

As ferramentas seguem a convenção de nomenclatura `mcp_ferramenta`, onde:
- `mcp` é o identificador do MCP (ex: supabase, github)
- `ferramenta` é a funcionalidade específica (ex: query, insert)

## Especificação por Agente

### 1. OrchestratorAgent

**Descrição**: Agente central responsável pela coordenação de todos os outros agentes e gerenciamento de fluxos de trabalho.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Sequential-Thinking | sequential_plan | `objective`: string<br>`context`: object<br>`constraints`: array | `plan`: object<br>`steps`: array<br>`criticalPath`: array | Planejamento de fluxos de trabalho |
| Sequential-Thinking | sequential_analyze | `data`: object<br>`parameters`: object | `analysis`: object<br>`insights`: array | Análise de dependências e conflitos |
| TaskMaster Claude | taskmaster_plan | `task`: string<br>`context`: object<br>`constraints`: object | `plan`: object<br>`tasks`: array | Planejamento de tarefas complexas |
| Context7 | context_search | `query`: string<br>`filters`: object | `results`: array<br>`relevance`: object | Busca contextual de informações |

#### Especificações Técnicas

**Formato de Mensagens**:
```json
{
  "messageId": "uuid-v4",
  "timestamp": "ISO-8601",
  "sender": {
    "agentId": "string",
    "agentType": "string"
  },
  "recipient": {
    "agentId": "string",
    "agentType": "string"
  },
  "messageType": "REQUEST|RESPONSE|EVENT|ERROR",
  "priority": "HIGH|MEDIUM|LOW",
  "payload": {
    "action": "string",
    "parameters": {},
    "data": {}
  },
  "metadata": {
    "correlationId": "string",
    "sessionId": "string",
    "userId": "string"
  }
}
```

**Configuração de Retry**:
- Máximo de tentativas: 3
- Backoff inicial: 1000ms
- Multiplicador de backoff: 2
- Jitter: 0.1

**Limites de Rate**:
- sequential_plan: 10 requisições/minuto
- sequential_analyze: 20 requisições/minuto
- taskmaster_plan: 5 requisições/minuto
- context_search: 30 requisições/minuto

**Timeout**:
- sequential_plan: 30s
- sequential_analyze: 15s
- taskmaster_plan: 45s
- context_search: 10s

### 2. ProjectManagerAgent

**Descrição**: Responsável pelo ciclo de vida completo dos projetos, desde a inicialização até o encerramento.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Sequential-Thinking | sequential_analyze | `projectData`: object<br>`metrics`: object<br>`threshold`: object | `score`: number<br>`risks`: array<br>`recommendations`: array | Análise de saúde do projeto |
| Sequential-Thinking | sequential_plan | `objectives`: array<br>`resources`: object<br>`timeline`: object | `phases`: array<br>`milestones`: array<br>`schedule`: object | Planejamento de fases do projeto |
| Supabase | supabase_query | `table`: string<br>`filter`: object<br>`join`: object | `data`: array | Consulta de dados do projeto |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Criação de projetos |
| Supabase | supabase_update | `table`: string<br>`filter`: object<br>`data`: object | `affected`: number<br>`status`: string | Atualização de projetos |
| TaskMaster Claude | taskmaster_plan | `projectData`: object<br>`constraints`: object | `plan`: object<br>`tasks`: array | Planejamento de projetos |

#### Especificações Técnicas

**Formato de Dados de Projeto**:
```json
{
  "id": "uuid-v4",
  "name": "string",
  "description": "string",
  "status": "planning|active|on_hold|completed|cancelled",
  "start_date": "ISO-8601",
  "end_date": "ISO-8601",
  "owner_id": "uuid-v4",
  "team_ids": ["uuid-v4"],
  "metadata": {
    "template": "string",
    "priority": "low|medium|high",
    "tags": ["string"]
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Métricas**:
```json
{
  "schedule_variance": "number",
  "cost_variance": "number",
  "task_completion_rate": "number",
  "resource_utilization": "number",
  "quality_metrics": {
    "defect_density": "number",
    "test_coverage": "number"
  }
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- supabase_update: 20 requisições/minuto
- sequential_analyze: 15 requisições/minuto
- sequential_plan: 10 requisições/minuto
- taskmaster_plan: 5 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 10s
- supabase_update: 10s
- sequential_analyze: 20s
- sequential_plan: 30s
- taskmaster_plan: 45s

### 3. KanbanAgent

**Descrição**: Especializado na gestão de tarefas em formato Kanban, incluindo criação, movimentação e análise de fluxo.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de quadros e tarefas |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Criação de tarefas |
| Supabase | supabase_update | `table`: string<br>`filter`: object<br>`data`: object | `affected`: number<br>`status`: string | Atualização de status de tarefas |
| Supabase | supabase_delete | `table`: string<br>`filter`: object | `affected`: number<br>`status`: string | Remoção de tarefas |
| Supabase | supabase_realtime | `channel`: string<br>`event`: string<br>`payload`: object | `success`: boolean | Notificações em tempo real |
| Sequential-Thinking | sequential_analyze | `boardData`: object<br>`flowMetrics`: object | `bottlenecks`: array<br>`recommendations`: array | Análise de fluxo Kanban |
| TaskMaster Claude | taskmaster_generate | `task`: string<br>`context`: object | `content`: string | Geração de descrições de tarefas |

#### Especificações Técnicas

**Formato de Dados de Quadro Kanban**:
```json
{
  "id": "uuid-v4",
  "project_id": "uuid-v4",
  "name": "string",
  "description": "string",
  "columns": [
    {
      "id": "uuid-v4",
      "name": "string",
      "order": "number",
      "wip_limit": "number|null"
    }
  ],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Dados de Tarefa**:
```json
{
  "id": "uuid-v4",
  "board_id": "uuid-v4",
  "column_id": "uuid-v4",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "low|medium|high",
  "assignee_id": "uuid-v4|null",
  "due_date": "ISO-8601|null",
  "tags": ["string"],
  "order": "number",
  "metadata": {
    "estimate": "number|null",
    "actual": "number|null",
    "attachments": ["uuid-v4"]
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Métricas de Fluxo**:
```json
{
  "cycle_time": {
    "average": "number",
    "median": "number",
    "percentile_85": "number"
  },
  "throughput": {
    "daily": "number",
    "weekly": "number"
  },
  "wip": {
    "current": "number",
    "average": "number"
  },
  "aging": {
    "by_column": {
      "column_id": {
        "average_days": "number",
        "oldest_task_id": "uuid-v4",
        "oldest_task_days": "number"
      }
    }
  }
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- supabase_update: 30 requisições/minuto
- supabase_delete: 10 requisições/minuto
- supabase_realtime: 100 eventos/minuto
- sequential_analyze: 10 requisições/minuto
- taskmaster_generate: 15 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 8s
- supabase_update: 8s
- supabase_delete: 8s
- supabase_realtime: 2s
- sequential_analyze: 15s
- taskmaster_generate: 20s

### 4. CalendarAgent

**Descrição**: Gerencia eventos, agendamentos e visualizações temporais do projeto.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de eventos |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Criação de eventos |
| Supabase | supabase_update | `table`: string<br>`filter`: object<br>`data`: object | `affected`: number<br>`status`: string | Atualização de eventos |
| Browser-Tools | browser_navigate | `url`: string | `success`: boolean | Navegação para calendários externos |
| Browser-Tools | browser_click | `selector`: string | `success`: boolean | Interação com calendários externos |
| Sequential-Thinking | sequential_analyze | `events`: array<br>`constraints`: object | `conflicts`: array<br>`suggestions`: array | Otimização de agenda |

#### Especificações Técnicas

**Formato de Dados de Evento**:
```json
{
  "id": "uuid-v4",
  "project_id": "uuid-v4",
  "title": "string",
  "description": "string",
  "start_time": "ISO-8601",
  "end_time": "ISO-8601",
  "all_day": "boolean",
  "location": "string|null",
  "attendees": [
    {
      "user_id": "uuid-v4",
      "status": "pending|accepted|declined"
    }
  ],
  "recurrence": {
    "pattern": "daily|weekly|monthly|yearly|null",
    "interval": "number",
    "end_date": "ISO-8601|null",
    "end_occurrences": "number|null"
  },
  "reminders": [
    {
      "time": "number",
      "unit": "minutes|hours|days"
    }
  ],
  "metadata": {
    "external_id": "string|null",
    "external_calendar": "string|null",
    "color": "string|null",
    "visibility": "public|private"
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Conflitos**:
```json
{
  "conflicts": [
    {
      "event_id": "uuid-v4",
      "conflicting_event_id": "uuid-v4",
      "type": "overlap|adjacent|resource_conflict",
      "severity": "low|medium|high",
      "resolution_suggestions": [
        {
          "type": "reschedule|split|merge|cancel",
          "details": "object"
        }
      ]
    }
  ]
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- supabase_update: 20 requisições/minuto
- browser_navigate: 10 requisições/minuto
- browser_click: 30 requisições/minuto
- sequential_analyze: 10 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 8s
- supabase_update: 8s
- browser_navigate: 15s
- browser_click: 5s
- sequential_analyze: 15s

### 5. DocumentAgent

**Descrição**: Especializado na gestão, criação e análise de documentos do projeto.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object<br>`join`: object | `data`: array | Consulta de documentos |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Criação de metadados de documentos |
| Supabase | supabase_update | `table`: string<br>`filter`: object<br>`data`: object | `affected`: number<br>`status`: string | Atualização de documentos |
| Supabase | supabase_storage | `bucket`: string<br>`path`: string<br>`content`: binary<br>`contentType`: string | `path`: string<br>`url`: string | Armazenamento de conteúdo de documentos |
| Sequential-Thinking | sequential_document | `context`: object<br>`format`: string<br>`sections`: array | `content`: string<br>`tableOfContents`: object | Geração de documentação estruturada |
| TaskMaster Claude | taskmaster_document | `codeAnalysis`: object<br>`projectContext`: object<br>`format`: string<br>`sections`: array | `content`: string<br>`tableOfContents`: object<br>`coverage`: object | Geração de documentação técnica |
| Puppeteer | puppeteer_screenshot | `url`: string<br>`selector`: string<br>`fullPage`: boolean | `image`: binary | Captura de screenshots para documentação |
| Puppeteer | puppeteer_pdf | `content`: string<br>`options`: object | `pdf`: binary | Geração de PDFs |

#### Especificações Técnicas

**Formato de Metadados de Documento**:
```json
{
  "id": "uuid-v4",
  "project_id": "uuid-v4",
  "title": "string",
  "description": "string",
  "type": "project_overview|technical_spec|user_guide|code_documentation|report",
  "tags": ["string"],
  "status": "draft|review|approved|archived",
  "version": "number",
  "storage_path": "string",
  "mime_type": "string",
  "size_bytes": "number",
  "author_id": "uuid-v4",
  "last_modified_by": "uuid-v4",
  "metadata": {
    "template_id": "string|null",
    "related_documents": ["uuid-v4"],
    "related_tasks": ["uuid-v4"],
    "pdf_export_path": "string|null",
    "pdf_export_url": "string|null",
    "pdf_export_date": "ISO-8601|null"
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Conteúdo de Documento**:
```json
{
  "id": "uuid-v4",
  "document_id": "uuid-v4",
  "version": "number",
  "content": "string",
  "content_format": "markdown|html|plain",
  "created_at": "ISO-8601",
  "created_by": "uuid-v4"
}
```

**Formato de Opções de PDF**:
```json
{
  "format": "A4|Letter|Legal",
  "orientation": "portrait|landscape",
  "margin": {
    "top": "string",
    "right": "string",
    "bottom": "string",
    "left": "string"
  },
  "printBackground": "boolean",
  "displayHeaderFooter": "boolean",
  "headerTemplate": "string",
  "footerTemplate": "string",
  "preferCSSPageSize": "boolean"
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- supabase_update: 20 requisições/minuto
- supabase_storage: 10 requisições/minuto
- sequential_document: 5 requisições/minuto
- taskmaster_document: 5 requisições/minuto
- puppeteer_screenshot: 10 requisições/minuto
- puppeteer_pdf: 5 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 8s
- supabase_update: 8s
- supabase_storage: 30s
- sequential_document: 45s
- taskmaster_document: 60s
- puppeteer_screenshot: 20s
- puppeteer_pdf: 60s

**Limites de Tamanho**:
- Conteúdo de documento: 10MB
- Arquivo PDF: 20MB
- Screenshot: 5MB

### 6. AIAssistantAgent

**Descrição**: Fornece assistência inteligente, previsões e automações baseadas em IA para todos os módulos.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Sequential-Thinking | sequential_analyze | `data`: object<br>`parameters`: object | `analysis`: object<br>`insights`: array | Análise de dados e padrões |
| Sequential-Thinking | sequential_plan | `objective`: string<br>`context`: object<br>`constraints`: array | `plan`: object<br>`steps`: array | Planejamento de ações |
| TaskMaster Claude | taskmaster_generate | `task`: string<br>`context`: object<br>`parameters`: object | `content`: string<br>`metadata`: object | Geração de conteúdo e sugestões |
| Context7 | context_search | `query`: string<br>`filters`: object | `results`: array<br>`relevance`: object | Busca contextual de informações |
| Context7 | context_examples | `concept`: string<br>`count`: number | `examples`: array | Obtenção de exemplos contextuais |
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Acesso a dados para análise |

#### Especificações Técnicas

**Formato de Solicitação de Análise**:
```json
{
  "data": {
    "type": "project_metrics|task_data|user_activity|document_content",
    "content": "object",
    "timeRange": {
      "start": "ISO-8601",
      "end": "ISO-8601"
    }
  },
  "parameters": {
    "analysisType": ["trends|anomalies|forecasts|recommendations|correlations"],
    "depth": "basic|standard|deep",
    "focusAreas": ["array of specific metrics or aspects"],
    "comparisonBaseline": "object|null"
  }
}
```

**Formato de Resposta de Análise**:
```json
{
  "analysis": {
    "summary": "string",
    "trends": [
      {
        "metric": "string",
        "direction": "increasing|decreasing|stable",
        "magnitude": "number",
        "significance": "low|medium|high",
        "period": "string"
      }
    ],
    "anomalies": [
      {
        "metric": "string",
        "expected": "number",
        "actual": "number",
        "deviation": "number",
        "timestamp": "ISO-8601",
        "possibleCauses": ["string"]
      }
    ],
    "forecasts": [
      {
        "metric": "string",
        "predictions": [
          {
            "timestamp": "ISO-8601",
            "value": "number",
            "confidence": "number"
          }
        ],
        "methodology": "string"
      }
    ]
  },
  "insights": [
    {
      "description": "string",
      "importance": "low|medium|high",
      "relatedMetrics": ["string"],
      "actionable": "boolean",
      "suggestedActions": ["string"]
    }
  ],
  "metadata": {
    "analysisTimestamp": "ISO-8601",
    "dataPoints": "number",
    "confidenceScore": "number",
    "modelVersion": "string"
  }
}
```

**Formato de Sugestões Contextuais**:
```json
{
  "suggestions": [
    {
      "type": "action|resource|insight",
      "title": "string",
      "description": "string",
      "relevanceScore": "number",
      "action": {
        "type": "navigate|execute|view",
        "parameters": "object"
      }
    }
  ],
  "context": {
    "currentActivity": "string",
    "recentActivities": ["string"],
    "userPreferences": "object"
  }
}
```

**Limites de Rate**:
- sequential_analyze: 15 requisições/minuto
- sequential_plan: 10 requisições/minuto
- taskmaster_generate: 20 requisições/minuto
- context_search: 30 requisições/minuto
- context_examples: 20 requisições/minuto
- supabase_query: 50 requisições/minuto

**Timeout**:
- sequential_analyze: 20s
- sequential_plan: 30s
- taskmaster_generate: 25s
- context_search: 10s
- context_examples: 10s
- supabase_query: 5s

### 7. DashboardAgent

**Descrição**: Responsável pela geração, atualização e personalização de dashboards e visualizações.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de dados para dashboards |
| Puppeteer | puppeteer_screenshot | `url`: string<br>`selector`: string<br>`fullPage`: boolean<br>`waitFor`: object | `image`: binary | Captura de visualizações |
| Sequential-Thinking | sequential_analyze | `data`: object<br>`metrics`: array | `analysis`: object<br>`insights`: array | Análise de métricas |
| Browser-Tools | browser_navigate | `url`: string | `success`: boolean | Navegação para visualizações |
| Browser-Tools | browser_click | `selector`: string | `success`: boolean | Interação com elementos de dashboard |

#### Especificações Técnicas

**Formato de Configuração de Dashboard**:
```json
{
  "id": "uuid-v4",
  "project_id": "uuid-v4",
  "name": "string",
  "description": "string",
  "type": "project_overview|task_metrics|resource_utilization|custom",
  "layout": [
    {
      "id": "uuid-v4",
      "widget_id": "uuid-v4",
      "x": "number",
      "y": "number",
      "width": "number",
      "height": "number"
    }
  ],
  "widgets": [
    {
      "id": "uuid-v4",
      "type": "chart|metric|table|status|custom",
      "title": "string",
      "data_source": {
        "type": "query|api|function",
        "config": "object"
      },
      "visualization": {
        "type": "bar|line|pie|gauge|table|card",
        "config": "object"
      },
      "refresh_interval": "number|null"
    }
  ],
  "filters": [
    {
      "id": "uuid-v4",
      "name": "string",
      "type": "date_range|select|multi_select|text",
      "default_value": "any",
      "options": "array|null",
      "affects_widgets": ["uuid-v4"]
    }
  ],
  "permissions": {
    "view": ["role|user_id"],
    "edit": ["role|user_id"]
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Dados de Widget**:
```json
{
  "chart": {
    "type": "bar|line|pie|scatter|area",
    "data": {
      "labels": ["string"],
      "datasets": [
        {
          "label": "string",
          "data": ["number"],
          "backgroundColor": "string|array",
          "borderColor": "string|array"
        }
      ]
    },
    "options": {
      "scales": "object",
      "plugins": "object",
      "animation": "object"
    }
  }
}
```

**Formato de Opções de Exportação**:
```json
{
  "format": "pdf|png|csv|excel",
  "title": "string",
  "description": "string",
  "includeFilters": "boolean",
  "dateRange": {
    "start": "ISO-8601",
    "end": "ISO-8601"
  },
  "orientation": "portrait|landscape",
  "paperSize": "A4|Letter|Legal"
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- puppeteer_screenshot: 10 requisições/minuto
- sequential_analyze: 10 requisições/minuto
- browser_navigate: 10 requisições/minuto
- browser_click: 30 requisições/minuto

**Timeout**:
- supabase_query: 10s
- puppeteer_screenshot: 20s
- sequential_analyze: 15s
- browser_navigate: 15s
- browser_click: 5s

**Limites de Tamanho**:
- Dashboard: 20 widgets
- Widget data: 1000 pontos de dados
- Screenshot: 5MB

### 8. FormAgent

**Descrição**: Especializado na criação, validação e processamento de formulários personalizados.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de definições de formulários |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Armazenamento de submissões |
| Browser-Tools | browser_input | `selector`: string<br>`text`: string | `success`: boolean | Preenchimento de formulários |
| Sequential-Thinking | sequential_analyze | `data`: object<br>`rules`: object | `valid`: boolean<br>`errors`: array | Validação lógica |
| TaskMaster Claude | taskmaster_generate | `task`: string<br>`context`: object | `content`: string | Geração de formulários |

#### Especificações Técnicas

**Formato de Definição de Formulário**:
```json
{
  "id": "uuid-v4",
  "project_id": "uuid-v4",
  "name": "string",
  "description": "string",
  "fields": [
    {
      "id": "uuid-v4",
      "name": "string",
      "label": "string",
      "type": "text|textarea|select|multi_select|checkbox|radio|date|file|number",
      "required": "boolean",
      "placeholder": "string|null",
      "default_value": "any|null",
      "options": ["string"]|null,
      "validation": {
        "type": "regex|function|schema",
        "value": "string",
        "error_message": "string"
      },
      "conditional": {
        "field": "string|null",
        "operator": "equals|not_equals|contains|greater_than|less_than",
        "value": "any|null"
      },
      "metadata": {
        "order": "number",
        "width": "full|half|third",
        "help_text": "string|null"
      },
      "selector": "string"
    }
  ],
  "layout": {
    "type": "single_page|multi_step|tabs",
    "steps": [
      {
        "id": "uuid-v4",
        "title": "string",
        "fields": ["uuid-v4"]
      }
    ]|null
  },
  "submission": {
    "destination": {
      "type": "database|email|webhook|function",
      "config": "object"
    },
    "success_message": "string",
    "success_redirect": "string|null",
    "submit_button_text": "string"
  },
  "validation_rules": "object",
  "permissions": {
    "submit": ["role|user_id"],
    "view_results": ["role|user_id"]
  },
  "url": "string",
  "submit_button_selector": "string",
  "result_selector": "string",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Submissão de Formulário**:
```json
{
  "id": "uuid-v4",
  "form_id": "uuid-v4",
  "submitter_id": "uuid-v4|null",
  "data": {
    "field_name": "value"
  },
  "metadata": {
    "ip_address": "string|null",
    "user_agent": "string|null",
    "duration_seconds": "number|null",
    "source": "string|null"
  },
  "status": "complete|partial|error",
  "validation_results": {
    "valid": "boolean",
    "errors": [
      {
        "field": "string",
        "message": "string"
      }
    ]
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Formato de Regras de Validação**:
```json
{
  "rules": [
    {
      "field": "string",
      "type": "required|format|range|custom",
      "parameters": "object",
      "message": "string"
    }
  ],
  "custom_validators": [
    {
      "name": "string",
      "function": "string",
      "fields": ["string"]
    }
  ]
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- browser_input: 30 requisições/minuto
- sequential_analyze: 15 requisições/minuto
- taskmaster_generate: 10 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 8s
- browser_input: 5s
- sequential_analyze: 10s
- taskmaster_generate: 20s

**Limites de Tamanho**:
- Formulário: 50 campos
- Submissão: 1MB
- Arquivo anexado: 10MB

### 9. GitHubIntegrationAgent

**Descrição**: Gerencia a integração com GitHub para controle de versão e colaboração.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| GitHub | github_commit | `repository`: string<br>`branch`: string<br>`message`: string<br>`files`: array | `sha`: string<br>`url`: string | Criação de commits |
| GitHub | github_push | `repository`: string<br>`branch`: string | `success`: boolean<br>`details`: object | Push de alterações |
| GitHub | github_pull | `repository`: string<br>`branch`: string | `success`: boolean<br>`details`: object | Pull de alterações |
| GitHub | github_create_pr | `repository`: string<br>`sourceBranch`: string<br>`targetBranch`: string<br>`title`: string<br>`body`: string<br>`reviewers`: array | `number`: number<br>`url`: string<br>`state`: string | Criação de PRs |
| GitHub | github_actions | `repository`: string<br>`workflow`: string<br>`ref`: string | `id`: number<br>`status`: string<br>`conclusion`: string | Interação com CI/CD |
| Sequential-Thinking | sequential_analyze | `code`: string<br>`language`: string | `analysis`: object | Análise de código |
| TaskMaster Claude | taskmaster_refactor | `code`: string<br>`instructions`: string | `refactoredCode`: string<br>`changes`: array | Refatoração de código |

#### Especificações Técnicas

**Formato de Dados de Commit**:
```json
{
  "repository": "string",
  "branch": "string",
  "message": "string",
  "files": [
    {
      "path": "string",
      "content": "string",
      "encoding": "utf-8|base64"
    }
  ],
  "author": {
    "name": "string",
    "email": "string"
  },
  "committer": {
    "name": "string",
    "email": "string"
  }
}
```

**Formato de Dados de PR**:
```json
{
  "repository": "string",
  "sourceBranch": "string",
  "targetBranch": "string",
  "title": "string",
  "body": "string",
  "labels": ["string"],
  "reviewers": ["string"],
  "draft": "boolean"
}
```

**Formato de Resposta de PR**:
```json
{
  "number": "number",
  "url": "string",
  "state": "open|closed|merged",
  "title": "string",
  "body": "string",
  "user": {
    "login": "string",
    "id": "number"
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "merged_at": "ISO-8601|null",
  "closed_at": "ISO-8601|null",
  "labels": [
    {
      "name": "string",
      "color": "string"
    }
  ],
  "requested_reviewers": [
    {
      "login": "string",
      "id": "number"
    }
  ]
}
```

**Limites de Rate**:
- github_commit: 10 requisições/minuto
- github_push: 5 requisições/minuto
- github_pull: 5 requisições/minuto
- github_create_pr: 2 requisições/minuto
- github_actions: 10 requisições/minuto
- sequential_analyze: 10 requisições/minuto
- taskmaster_refactor: 5 requisições/minuto

**Timeout**:
- github_commit: 15s
- github_push: 30s
- github_pull: 30s
- github_create_pr: 20s
- github_actions: 10s
- sequential_analyze: 20s
- taskmaster_refactor: 45s

**Limites de Tamanho**:
- Commit: 100 arquivos, 10MB total
- PR: 3000 alterações
- Mensagem de commit: 2000 caracteres
- Corpo de PR: 65536 caracteres

### 10. FigmaIntegrationAgent

**Descrição**: Gerencia a integração com Figma para design e assets visuais.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Figma | figma_get_file | `fileId`: string | `document`: object<br>`components`: array | Obtenção de arquivos Figma |
| Figma | figma_get_components | `fileId`: string | `components`: array | Acesso a componentes |
| Figma | figma_export_assets | `fileId`: string<br>`ids`: array<br>`format`: string<br>`scale`: number | `images`: array | Exportação de assets |
| Figma | figma_get_styles | `fileId`: string | `styles`: object | Obtenção de estilos |
| Figma | figma_get_prototypes | `fileId`: string | `prototypes`: array | Acesso a protótipos |
| Puppeteer | puppeteer_screenshot | `url`: string<br>`selector`: string | `image`: binary | Captura de designs |
| Sequential-Thinking | sequential_design | `designData`: object<br>`requirements`: object | `analysis`: object<br>`suggestions`: array | Análise de design |

#### Especificações Técnicas

**Formato de Componente Figma**:
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "key": "string",
  "type": "COMPONENT|INSTANCE|FRAME",
  "isMain": "boolean",
  "parent": {
    "id": "string",
    "type": "string"
  },
  "children": [
    {
      "id": "string",
      "type": "string",
      "name": "string"
    }
  ],
  "styles": {
    "fill": "string",
    "stroke": "string",
    "text": "string",
    "effect": "string",
    "grid": "string"
  },
  "absoluteBoundingBox": {
    "x": "number",
    "y": "number",
    "width": "number",
    "height": "number"
  }
}
```

**Formato de Estilo Figma**:
```json
{
  "styles": {
    "color": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "key": "string",
        "value": {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        },
        "hex": "string"
      }
    ],
    "text": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "key": "string",
        "fontFamily": "string",
        "fontSize": "number",
        "fontWeight": "number",
        "letterSpacing": "number",
        "lineHeight": "number",
        "textCase": "string",
        "textDecoration": "string"
      }
    ],
    "effect": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "key": "string",
        "effects": [
          {
            "type": "DROP_SHADOW|INNER_SHADOW|LAYER_BLUR|BACKGROUND_BLUR",
            "visible": "boolean",
            "radius": "number",
            "color": {
              "r": "number",
              "g": "number",
              "b": "number",
              "a": "number"
            },
            "offset": {
              "x": "number",
              "y": "number"
            }
          }
        ]
      }
    ]
  }
}
```

**Formato de Exportação de Asset**:
```json
{
  "fileId": "string",
  "ids": ["string"],
  "format": "png|jpg|svg|pdf",
  "scale": "number",
  "svg_include_id": "boolean",
  "svg_simplify_stroke": "boolean",
  "use_absolute_bounds": "boolean"
}
```

**Limites de Rate**:
- figma_get_file: 10 requisições/minuto
- figma_get_components: 20 requisições/minuto
- figma_export_assets: 10 requisições/minuto
- figma_get_styles: 20 requisições/minuto
- figma_get_prototypes: 10 requisições/minuto
- puppeteer_screenshot: 10 requisições/minuto
- sequential_design: 5 requisições/minuto

**Timeout**:
- figma_get_file: 15s
- figma_get_components: 10s
- figma_export_assets: 30s
- figma_get_styles: 10s
- figma_get_prototypes: 15s
- puppeteer_screenshot: 20s
- sequential_design: 20s

**Limites de Tamanho**:
- Arquivo Figma: 50MB
- Exportação de assets: 20 componentes por requisição
- Asset individual: 5MB

### 11. StripeIntegrationAgent

**Descrição**: Gerencia a integração com Stripe para pagamentos e assinaturas.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Stripe | stripe_payment | `action`: string<br>`amount`: number<br>`currency`: string<br>`paymentMethodId`: string | `id`: string<br>`status`: string | Processamento de pagamentos |
| Stripe | stripe_customer | `action`: string<br>`customerId`: string<br>`data`: object | `id`: string<br>`object`: string | Gerenciamento de clientes |
| Stripe | stripe_subscription | `action`: string<br>`customerId`: string<br>`items`: array | `id`: string<br>`status`: string | Gerenciamento de assinaturas |
| Stripe | stripe_invoice | `action`: string<br>`customerId`: string<br>`items`: array | `id`: string<br>`status`: string | Emissão de faturas |
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de dados de pagamento |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Registro de transações |
| Supabase | supabase_update | `table`: string<br>`filter`: object<br>`data`: object | `affected`: number<br>`status`: string | Atualização de status de pagamento |
| Sequential-Thinking | sequential_analyze | `transactions`: array<br>`metrics`: object | `analysis`: object<br>`insights`: array | Análise de transações |

#### Especificações Técnicas

**Formato de Dados de Pagamento**:
```json
{
  "action": "create|retrieve|update|capture|cancel",
  "amount": "number",
  "currency": "string",
  "paymentMethodId": "string",
  "customerId": "string",
  "description": "string",
  "metadata": {
    "projectId": "string",
    "planId": "string"
  },
  "confirm": "boolean",
  "capture_method": "automatic|manual",
  "receipt_email": "string"
}
```

**Formato de Dados de Assinatura**:
```json
{
  "action": "create|retrieve|update|cancel",
  "customerId": "string",
  "items": [
    {
      "price": "string",
      "quantity": "number"
    }
  ],
  "trial_period_days": "number|null",
  "metadata": {
    "projectId": "string",
    "source": "string"
  },
  "expand": ["string"],
  "cancel_at_period_end": "boolean"
}
```

**Formato de Resposta de Assinatura**:
```json
{
  "id": "string",
  "object": "subscription",
  "status": "incomplete|incomplete_expired|trialing|active|past_due|canceled|unpaid",
  "current_period_start": "number",
  "current_period_end": "number",
  "customer": "string",
  "items": {
    "object": "list",
    "data": [
      {
        "id": "string",
        "object": "subscription_item",
        "price": {
          "id": "string",
          "object": "price",
          "product": "string",
          "active": "boolean",
          "currency": "string",
          "unit_amount": "number",
          "nickname": "string"
        },
        "quantity": "number"
      }
    ]
  },
  "latest_invoice": {
    "id": "string",
    "object": "invoice",
    "amount_due": "number",
    "amount_paid": "number",
    "status": "draft|open|paid|uncollectible|void",
    "hosted_invoice_url": "string",
    "payment_intent": {
      "id": "string",
      "object": "payment_intent",
      "status": "requires_payment_method|requires_confirmation|requires_action|processing|requires_capture|canceled|succeeded"
    }
  }
}
```

**Limites de Rate**:
- stripe_payment: 10 requisições/minuto
- stripe_customer: 20 requisições/minuto
- stripe_subscription: 10 requisições/minuto
- stripe_invoice: 10 requisições/minuto
- supabase_query: 50 requisições/minuto
- supabase_insert: 20 requisições/minuto
- supabase_update: 20 requisições/minuto
- sequential_analyze: 10 requisições/minuto

**Timeout**:
- stripe_payment: 15s
- stripe_customer: 10s
- stripe_subscription: 15s
- stripe_invoice: 15s
- supabase_query: 5s
- supabase_insert: 8s
- supabase_update: 8s
- sequential_analyze: 15s

**Limites de Segurança**:
- Valor máximo de transação: Configurável por projeto
- Número máximo de tentativas de pagamento: 3
- Período de retenção de dados de pagamento: 90 dias

### 12. NotificationAgent

**Descrição**: Gerencia todas as notificações e comunicações do sistema.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object | `data`: array | Consulta de preferências de notificação |
| Supabase | supabase_insert | `table`: string<br>`data`: object | `id`: string<br>`status`: string | Registro de notificações |
| Browser-Tools | browser_navigate | `url`: string | `success`: boolean | Navegação para entrega de notificações |
| Sequential-Thinking | sequential_analyze | `notification`: object<br>`userContext`: object | `priority`: string<br>`channel`: string | Priorização de notificações |

#### Especificações Técnicas

**Formato de Notificação**:
```json
{
  "id": "uuid-v4",
  "user_id": "uuid-v4",
  "project_id": "uuid-v4|null",
  "title": "string",
  "message": "string",
  "type": "info|success|warning|error",
  "priority": "low|medium|high|urgent",
  "channel": "in_app|email|push|sms",
  "action": {
    "type": "link|function",
    "target": "string",
    "parameters": "object|null"
  },
  "data": "object",
  "read": "boolean",
  "read_at": "ISO-8601|null",
  "expires_at": "ISO-8601|null",
  "created_at": "ISO-8601"
}
```

**Formato de Preferências de Notificação**:
```json
{
  "user_id": "uuid-v4",
  "channels": {
    "in_app": "boolean",
    "email": "boolean",
    "push": "boolean",
    "sms": "boolean"
  },
  "types": {
    "project_updates": {
      "in_app": "boolean",
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    },
    "task_assignments": {
      "in_app": "boolean",
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    },
    "document_changes": {
      "in_app": "boolean",
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    },
    "system_alerts": {
      "in_app": "boolean",
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    }
  },
  "quiet_hours": {
    "enabled": "boolean",
    "start": "string",
    "end": "string",
    "timezone": "string"
  },
  "digest": {
    "enabled": "boolean",
    "frequency": "daily|weekly",
    "time": "string"
  }
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- supabase_insert: 30 requisições/minuto
- browser_navigate: 10 requisições/minuto
- sequential_analyze: 20 requisições/minuto

**Timeout**:
- supabase_query: 5s
- supabase_insert: 8s
- browser_navigate: 10s
- sequential_analyze: 10s

**Limites de Notificação**:
- Tamanho da mensagem: 500 caracteres
- Notificações por usuário por hora: 20
- Notificações por projeto por hora: 50
- Retenção de notificações: 30 dias

### 13. SecurityAgent

**Descrição**: Monitora e garante a segurança e privacidade em todo o sistema.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_auth | `action`: string<br>`userId`: string<br>`data`: object | `user`: object<br>`session`: object | Autenticação e autorização |
| Sequential-Thinking | sequential_analyze | `activity`: object<br>`patterns`: array | `risk`: object<br>`anomalies`: array | Análise de segurança |
| TaskMaster Claude | taskmaster_analyze | `data`: object<br>`context`: object | `analysis`: object<br>`recommendations`: array | Avaliação de riscos |

#### Especificações Técnicas

**Formato de Verificação de Permissão**:
```json
{
  "user_id": "uuid-v4",
  "resource_type": "project|document|board|dashboard",
  "resource_id": "uuid-v4",
  "action": "view|create|update|delete|share",
  "context": {
    "ip_address": "string",
    "user_agent": "string",
    "timestamp": "ISO-8601",
    "session_id": "string"
  }
}
```

**Formato de Resposta de Permissão**:
```json
{
  "allowed": "boolean",
  "reason": "string|null",
  "conditions": [
    {
      "type": "time_limit|data_limit|location_limit",
      "details": "object"
    }
  ],
  "audit_log_id": "uuid-v4"
}
```

**Formato de Log de Auditoria**:
```json
{
  "id": "uuid-v4",
  "user_id": "uuid-v4",
  "action": "login|logout|access|create|update|delete|share",
  "resource_type": "string",
  "resource_id": "string|null",
  "status": "success|failure",
  "reason": "string|null",
  "metadata": {
    "ip_address": "string",
    "user_agent": "string",
    "location": "string|null",
    "session_id": "string"
  },
  "timestamp": "ISO-8601"
}
```

**Limites de Rate**:
- supabase_auth: 30 requisições/minuto
- sequential_analyze: 20 requisições/minuto
- taskmaster_analyze: 10 requisições/minuto

**Timeout**:
- supabase_auth: 5s
- sequential_analyze: 10s
- taskmaster_analyze: 15s

**Políticas de Segurança**:
- Bloqueio após 5 tentativas de login malsucedidas
- Rotação de tokens a cada 24 horas
- Verificação de IP para mudanças de permissão
- Expiração de sessão após 8 horas de inatividade

### 14. DataAnalysisAgent

**Descrição**: Especializado na análise e processamento de dados em todo o sistema.

#### MCPs e Ferramentas

| MCP | Ferramenta | Parâmetros | Formato de Resposta | Uso |
|-----|------------|------------|---------------------|-----|
| Supabase | supabase_query | `table`: string<br>`filter`: object<br>`join`: object | `data`: array | Acesso a dados |
| Sequential-Thinking | sequential_analyze | `data`: object<br>`parameters`: object | `analysis`: object<br>`insights`: array | Análise de dados |
| TaskMaster Claude | taskmaster_analyze | `data`: object<br>`context`: object<br>`objective`: string | `analysis`: object<br>`recommendations`: array | Interpretação de dados |

#### Especificações Técnicas

**Formato de Solicitação de Análise**:
```json
{
  "data_source": {
    "type": "project_metrics|task_data|user_activity|financial_data",
    "project_id": "uuid-v4|null",
    "time_range": {
      "start": "ISO-8601",
      "end": "ISO-8601"
    },
    "filters": "object"
  },
  "analysis_type": [
    "descriptive|diagnostic|predictive|prescriptive"
  ],
  "metrics": [
    {
      "name": "string",
      "aggregation": "sum|avg|min|max|count|median",
      "group_by": "string|null",
      "filters": "object|null"
    }
  ],
  "visualization": {
    "type": "table|chart|summary",
    "chart_type": "bar|line|pie|scatter|null",
    "dimensions": ["string"],
    "measures": ["string"]
  }
}
```

**Formato de Resposta de Análise**:
```json
{
  "summary": {
    "key_findings": ["string"],
    "data_quality": {
      "completeness": "number",
      "accuracy": "number",
      "consistency": "number"
    },
    "sample_size": "number",
    "time_period": "string"
  },
  "metrics": [
    {
      "name": "string",
      "value": "number",
      "change": "number|null",
      "change_period": "string|null",
      "benchmark": "number|null",
      "percentile": "number|null"
    }
  ],
  "segments": [
    {
      "dimension": "string",
      "values": [
        {
          "name": "string",
          "count": "number",
          "percentage": "number",
          "metrics": "object"
        }
      ]
    }
  ],
  "correlations": [
    {
      "variables": ["string", "string"],
      "coefficient": "number",
      "significance": "number",
      "direction": "positive|negative|none"
    }
  ],
  "predictions": [
    {
      "metric": "string",
      "forecast": [
        {
          "period": "string",
          "value": "number",
          "confidence_low": "number",
          "confidence_high": "number"
        }
      ],
      "factors": [
        {
          "name": "string",
          "importance": "number",
          "direction": "positive|negative"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "rationale": "string",
      "metrics_affected": ["string"]
    }
  ],
  "visualization_data": "object",
  "metadata": {
    "analysis_timestamp": "ISO-8601",
    "processing_time_ms": "number",
    "model_version": "string"
  }
}
```

**Limites de Rate**:
- supabase_query: 50 requisições/minuto
- sequential_analyze: 15 requisições/minuto
- taskmaster_analyze: 10 requisições/minuto

**Timeout**:
- supabase_query: 10s
- sequential_analyze: 30s
- taskmaster_analyze: 45s

**Limites de Processamento**:
- Tamanho máximo do conjunto de dados: 1 milhão de registros
- Complexidade máxima de consulta: 5 joins
- Período máximo de análise: 5 anos
- Número máximo de métricas por análise: 20

## Matriz de Compatibilidade de MCPs e Agentes

A tabela abaixo mostra a compatibilidade entre MCPs e agentes, indicando quais MCPs são utilizados por cada agente:

| Agente | Sequential-Thinking | Supabase | TaskMaster Claude | Context7 | Browser-Tools | GitHub | Figma | Puppeteer | Stripe |
|--------|---------------------|----------|-------------------|----------|---------------|--------|-------|-----------|--------|
| OrchestratorAgent | ✓ | | ✓ | ✓ | | | | | |
| ProjectManagerAgent | ✓ | ✓ | ✓ | | | | | | |
| KanbanAgent | ✓ | ✓ | ✓ | | | | | | |
| CalendarAgent | ✓ | ✓ | | | ✓ | | | | |
| DocumentAgent | ✓ | ✓ | ✓ | | | | | ✓ | |
| AIAssistantAgent | ✓ | ✓ | ✓ | ✓ | | | | | |
| DashboardAgent | ✓ | ✓ | | | ✓ | | | ✓ | |
| FormAgent | ✓ | ✓ | ✓ | | ✓ | | | | |
| GitHubIntegrationAgent | ✓ | ✓ | ✓ | | | ✓ | | | |
| FigmaIntegrationAgent | ✓ | ✓ | | | | | ✓ | ✓ | |
| StripeIntegrationAgent | ✓ | ✓ | | | | | | | ✓ |
| NotificationAgent | ✓ | ✓ | | | ✓ | | | | |
| SecurityAgent | ✓ | ✓ | ✓ | | | | | | |
| DataAnalysisAgent | ✓ | ✓ | ✓ | | | | | | |

## Considerações de Implementação

### Gestão de Dependências

Cada agente deve declarar explicitamente suas dependências de MCPs e ferramentas, permitindo:
- Carregamento sob demanda de MCPs
- Verificação de disponibilidade antes da execução
- Fallback para alternativas quando necessário

### Versionamento de Ferramentas

As ferramentas seguem um esquema de versionamento semântico:
- Versão principal: Mudanças incompatíveis na API
- Versão secundária: Adições de funcionalidade compatíveis
- Versão de patch: Correções de bugs

### Monitoramento e Telemetria

Cada ferramenta implementa:
- Métricas de uso e performance
- Logs estruturados
- Rastreamento de erros
- Alertas para degradação

### Segurança e Privacidade

Todas as ferramentas implementam:
- Validação de entrada
- Sanitização de saída
- Controle de acesso baseado em papéis
- Auditoria de operações sensíveis

## Próximos Passos

Com base nesta especificação detalhada de ferramentas e MCPs, os próximos passos incluem:
1. Desenhar o fluxo técnico de tarefas e automações entre agentes
2. Validar a integridade e coerência das integrações propostas
3. Criar a estrutura de pastas e arquivos para o template Windsurf
4. Gerar documentação de uso e integração do template
