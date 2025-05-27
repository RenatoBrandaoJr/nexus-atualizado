# GerenciaMente SaaS - Arquitetura Técnica

## 1. Visão Geral da Arquitetura

O GerenciaMente SaaS seguirá uma arquitetura moderna baseada em microsserviços, com separação clara entre frontend e backend. A arquitetura será projetada para ser escalável, segura e de fácil manutenção, especialmente considerando que o desenvolvimento será realizado por uma única pessoa.

![Diagrama de Arquitetura](diagrama_arquitetura.png)

## 2. Stack Tecnológico

### 2.1 Frontend

- **Framework Principal**: Next.js 14+ com App Router
- **Linguagem**: TypeScript
- **UI/Componentes**: React 18+
- **Estilização**: Tailwind CSS
- **Gerenciamento de Estado**:
  - Zustand para estado global
  - React Query para estado do servidor e caching
  - Formulários: React Hook Form + Zod
- **Visualização de Dados**:
  - Gráficos: Recharts/D3.js
  - Gráficos de conexão: React Flow/Vis.js
- **Calendário**: FullCalendar
- **Editor de Texto Rico**: TipTap/Slate.js

### 2.2 Backend

- **API**: tRPC para tipagem end-to-end
- **Runtime**: Node.js
- **Banco de Dados**: PostgreSQL via Supabase
- **Autenticação**: NextAuth.js/Supabase Auth
- **Armazenamento**: Supabase Storage
- **Cache**: Upstash Redis
- **Filas de Tarefas**: QStash

### 2.3 Integrações com IA

- **Processamento de Linguagem Natural**: OpenAI API (GPT-4) e Anthropic API (Claude)
- **Framework de IA**: LangChain.js
- **Embedding/Vetorização**: OpenAI Embeddings + Supabase pgvector

### 2.4 DevOps

- **CI/CD**: GitHub Actions
- **Hospedagem Frontend**: Vercel
- **Hospedagem Backend**: Supabase + Vercel Edge Functions
- **Monitoramento**: Sentry
- **Analytics**: LogSnag

## 3. Modelos de Dados

### 3.1 Principais Entidades

#### Usuários e Autenticação

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}'::JSONB,
  theme TEXT DEFAULT 'light',
  last_active TIMESTAMP WITH TIME ZONE
);
```

#### Workspace e Projetos

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Quadro Kanban

```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#9CA3AF'
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position FLOAT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE card_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9CA3AF'
);

CREATE TABLE card_label_assignments (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID REFERENCES card_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE card_assignees (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);
```

#### Documentos

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  folder_path TEXT DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL
);
```

#### Calendário

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recurrence_rule TEXT
);

CREATE TABLE event_attendees (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  response TEXT DEFAULT 'pending',
  PRIMARY KEY (event_id, user_id)
);
```

#### Gráfico de Conexões

```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content_id UUID, -- Referência dinâmica (documento, card, etc)
  properties JSONB DEFAULT '{}'::JSONB,
  position_x FLOAT,
  position_y FLOAT
);

CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  label TEXT,
  type TEXT DEFAULT 'default',
  properties JSONB DEFAULT '{}'::JSONB
);
```

#### Formulários

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'submitted'
);
```

## 4. Arquitetura de APIs

### 4.1 Endpoints tRPC

A API será estruturada em roteadores tRPC, seguindo princípios de design orientado a domínio:

- **Usuários**: Autenticação, perfil, preferências
- **Workspaces**: Gerenciamento de espaços de trabalho e membros
- **Projetos**: CRUD de projetos
- **Kanban**: Quadros, colunas, cards e etiquetas
- **Documentos**: CRUD de documentos, versionamento, pesquisa
- **Calendário**: Eventos, recorrências, lembretes
- **Gráficos**: Nós, conexões, layouts
- **Formulários**: Criação, respostas, análise
- **IA**: Assistência, geração de conteúdo, análise

### 4.2 Middleware

Implementaremos os seguintes middlewares:

- **Autenticação**: Validação de sessão
- **Autorização**: Verificação de permissões baseada em função
- **Logging**: Registro de atividades importantes
- **Limitação de Taxa**: Proteção contra abuso de API
- **Validação**: Esquemas Zod para validação de entrada

## 5. Segurança

### 5.1 Autenticação

- Login com email/senha
- Suporte a OAuth (Google, GitHub)
- Autenticação de dois fatores (2FA)
- Tokens JWT com expiração curta + refresh tokens

### 5.2 Autorização

- Sistema de permissões baseado em RBAC (Role-Based Access Control)
- Níveis de acesso: Proprietário, Administrador, Membro, Convidado
- Permissões granulares por recurso

### 5.3 Proteção de Dados

- Criptografia de dados sensíveis em repouso
- HTTPS/TLS para todas as comunicações
- Sanitização de entrada de dados
- Políticas de CORS restritivas
- Headers de segurança (CSP, X-XSS-Protection, etc.)

## 6. Persistência e Cache

### 6.1 Estratégia de Banco de Dados

- PostgreSQL como banco de dados principal
- Índices otimizados para consultas frequentes
- Esquema de banco de dados com verificações de integridade
- RLS (Row Level Security) do Supabase para segurança adicional

### 6.2 Estratégia de Cache

- Redis para caching de dados frequentemente acessados
- Cache de SSR/ISR no Next.js
- Cache de consultas com React Query

## 7. Escalabilidade

### 7.1 Estratégia de Crescimento

- Arquitetura serverless para escalabilidade automática
- Separação de preocupações para manutenção mais fácil
- Edge functions para operações de baixa latência
- Banco de dados com capacidade de crescimento vertical e horizontal

### 7.2 Considerações de Performance

- Paginação para conjuntos de dados grandes
- Carregamento lazy de componentes e dados
- Otimização de assets (imagens, JS)
- Estratégias eficientes de re-renderização no React

## 8. Monitoramento e Observabilidade

- Sentry para rastreamento de erros
- LogSnag para eventos críticos de negócios
- Métricas de performance com Vercel Analytics
- Logs estruturados para debug

## 9. Integração com Agentes Nexus

Para facilitar o desenvolvimento, o GerenciaMente SaaS se integrará com os seguintes agentes do sistema Nexus:

| Agente | Responsabilidade |
|--------|-----------------|
| SecurityAgent | Implementação de autenticação e autorização |
| NotificationAgent | Sistema de notificações e alertas |
| DocumentAgent | Geração de documentação técnica |
| DatabaseAgent | Design e otimização do banco de dados |
| AIAssistantAgent | Integração de IA e processamento de linguagem natural |
| FrontendAgent | Desenvolvimento de componentes de UI |
| BackendAgent | Desenvolvimento de APIs e lógica de negócios |
| IntegrationAgent | Conexão com serviços externos |
| OrchestratorAgent | Coordenação de fluxos complexos entre componentes |

## 10. Considerações Futuras

- **Internacionalização**: Preparação para suporte multi-idioma
- **PWA**: Transformação em Progressive Web App
- **API Pública**: Para integração com ferramentas de terceiros
- **Modo Offline**: Sincronização para trabalhar sem conexão
- **Extensibilidade**: Sistema de plugins para funcionalidades personalizadas
