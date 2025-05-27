# Esquema de Banco de Dados - Windsurf SaaS Template

Este documento descreve a estrutura completa das tabelas do Supabase necessárias para o funcionamento do template de SaaS de gerenciamento de projetos no Windsurf AI.

## Visão Geral do Esquema

O esquema de banco de dados consiste em seis tabelas principais:

1. `projects` - Armazena informações de projetos
2. `repositories` - Armazena informações de repositórios de código
3. `document_metadata` - Armazena metadados de documentos
4. `document_content` - Armazena conteúdo de documentos
5. `project_members` - Armazena membros de projetos
6. `project_figma_files` - Armazena arquivos Figma associados a projetos

## Detalhamento das Tabelas

### Tabela: projects

**Descrição**: Armazena informações básicas sobre projetos no sistema.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do projeto |
| name | text | NOT NULL | Nome do projeto |
| description | text | | Descrição detalhada do projeto |
| owner_id | uuid | NOT NULL, REFERENCES auth.users(id) | ID do usuário proprietário do projeto |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de criação do projeto |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |
| status | text | NOT NULL, DEFAULT 'active' | Status do projeto (active, archived, completed) |
| settings | jsonb | DEFAULT '{}' | Configurações personalizadas do projeto em formato JSON |

#### DDL

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
```

#### Exemplo de Dados

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Sistema de Gestão de Documentos",
  "description": "Projeto para automatizar a gestão de documentos corporativos",
  "owner_id": "98765432-e89b-12d3-a456-426614174000",
  "created_at": "2025-05-20T14:30:00Z",
  "updated_at": "2025-05-26T09:15:00Z",
  "status": "active",
  "settings": {
    "theme": "dark",
    "notification_preferences": {
      "email": true,
      "push": false
    }
  }
}
```

### Tabela: repositories

**Descrição**: Armazena informações sobre repositórios de código associados a projetos.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do repositório |
| project_id | uuid | NOT NULL, REFERENCES projects(id) | ID do projeto ao qual o repositório está associado |
| name | text | NOT NULL | Nome do repositório |
| url | text | NOT NULL | URL do repositório (ex: GitHub, GitLab) |
| provider | text | NOT NULL | Provedor do repositório (github, gitlab, bitbucket) |
| default_branch | text | NOT NULL, DEFAULT 'main' | Branch padrão do repositório |
| webhook_id | text | | ID do webhook configurado para o repositório |
| webhook_secret | text | | Segredo do webhook para validação |
| access_token | text | | Token de acesso para o repositório (criptografado) |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de criação do registro |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |
| settings | jsonb | DEFAULT '{}' | Configurações específicas do repositório |

#### DDL

```sql
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  provider TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  webhook_id TEXT,
  webhook_secret TEXT,
  access_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX idx_repositories_project_id ON repositories(project_id);
CREATE INDEX idx_repositories_provider ON repositories(provider);
```

#### Exemplo de Dados

```json
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "docs-automation",
  "url": "https://github.com/organization/docs-automation",
  "provider": "github",
  "default_branch": "main",
  "webhook_id": "webhook123",
  "webhook_secret": "whsec_abcdefghijklmnopqrstuvwxyz",
  "access_token": "[encrypted]",
  "created_at": "2025-05-20T15:00:00Z",
  "updated_at": "2025-05-26T10:00:00Z",
  "settings": {
    "auto_document": true,
    "document_private_methods": false
  }
}
```

### Tabela: document_metadata

**Descrição**: Armazena metadados de documentos gerados pelo sistema.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do documento |
| project_id | uuid | NOT NULL, REFERENCES projects(id) | ID do projeto ao qual o documento pertence |
| repository_id | uuid | REFERENCES repositories(id) | ID do repositório associado (se aplicável) |
| title | text | NOT NULL | Título do documento |
| description | text | | Descrição do documento |
| type | text | NOT NULL | Tipo do documento (api, guide, tutorial, reference) |
| format | text | NOT NULL, DEFAULT 'markdown' | Formato do documento (markdown, html, pdf) |
| version | text | NOT NULL, DEFAULT '1.0.0' | Versão do documento |
| status | text | NOT NULL, DEFAULT 'draft' | Status do documento (draft, review, published) |
| author_id | uuid | REFERENCES auth.users(id) | ID do autor do documento |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de criação do documento |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |
| published_at | timestamptz | | Data e hora de publicação |
| tags | text[] | DEFAULT '{}' | Array de tags associadas ao documento |
| metadata | jsonb | DEFAULT '{}' | Metadados adicionais em formato JSON |

#### DDL

```sql
CREATE TABLE document_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown',
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX idx_document_metadata_project_id ON document_metadata(project_id);
CREATE INDEX idx_document_metadata_repository_id ON document_metadata(repository_id);
CREATE INDEX idx_document_metadata_type ON document_metadata(type);
CREATE INDEX idx_document_metadata_status ON document_metadata(status);
CREATE INDEX idx_document_metadata_tags ON document_metadata USING GIN(tags);
```

#### Exemplo de Dados

```json
{
  "id": "323e4567-e89b-12d3-a456-426614174002",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "repository_id": "223e4567-e89b-12d3-a456-426614174001",
  "title": "API de Gerenciamento de Documentos",
  "description": "Documentação completa da API de gerenciamento de documentos",
  "type": "api",
  "format": "markdown",
  "version": "1.2.0",
  "status": "published",
  "author_id": "98765432-e89b-12d3-a456-426614174000",
  "created_at": "2025-05-21T09:00:00Z",
  "updated_at": "2025-05-26T11:30:00Z",
  "published_at": "2025-05-26T12:00:00Z",
  "tags": ["api", "reference", "v1"],
  "metadata": {
    "generated_from_commit": "a1b2c3d4e5f6",
    "coverage": 0.95,
    "endpoints_count": 42
  }
}
```

### Tabela: document_content

**Descrição**: Armazena o conteúdo dos documentos, separado dos metadados para melhor performance.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do conteúdo |
| document_id | uuid | NOT NULL, REFERENCES document_metadata(id) | ID do documento ao qual o conteúdo pertence |
| content | text | NOT NULL | Conteúdo do documento |
| content_vector | vector(1536) | | Vetor de embedding do conteúdo para busca semântica |
| version | text | NOT NULL, DEFAULT '1.0.0' | Versão do conteúdo |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de criação do conteúdo |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |

#### DDL

```sql
-- Habilitar a extensão vector (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_vector vector(1536),
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_document_content_document_id ON document_content(document_id);
CREATE INDEX idx_document_content_vector ON document_content USING ivfflat (content_vector vector_cosine_ops);
```

#### Exemplo de Dados

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174003",
  "document_id": "323e4567-e89b-12d3-a456-426614174002",
  "content": "# API de Gerenciamento de Documentos\n\n## Introdução\n\nEsta API permite gerenciar documentos corporativos...",
  "content_vector": "[0.123, 0.456, 0.789, ...]",
  "version": "1.2.0",
  "created_at": "2025-05-21T09:00:00Z",
  "updated_at": "2025-05-26T11:30:00Z"
}
```

### Tabela: project_members

**Descrição**: Armazena informações sobre membros de projetos e suas permissões.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do membro do projeto |
| project_id | uuid | NOT NULL, REFERENCES projects(id) | ID do projeto |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) | ID do usuário membro |
| role | text | NOT NULL, DEFAULT 'member' | Papel do usuário no projeto (owner, admin, member, viewer) |
| permissions | jsonb | NOT NULL, DEFAULT '{}' | Permissões específicas do usuário |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de adição do membro |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |
| invited_by | uuid | REFERENCES auth.users(id) | ID do usuário que convidou o membro |
| status | text | NOT NULL, DEFAULT 'active' | Status do membro (invited, active, suspended) |

#### DDL

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(project_id, user_id)
);

-- Índices
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_status ON project_members(status);
```

#### Exemplo de Dados

```json
{
  "id": "523e4567-e89b-12d3-a456-426614174004",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "abcde123-e89b-12d3-a456-426614174000",
  "role": "admin",
  "permissions": {
    "manage_documents": true,
    "manage_members": true,
    "manage_repositories": false
  },
  "created_at": "2025-05-20T16:00:00Z",
  "updated_at": "2025-05-26T14:00:00Z",
  "invited_by": "98765432-e89b-12d3-a456-426614174000",
  "status": "active"
}
```

### Tabela: project_figma_files

**Descrição**: Armazena informações sobre arquivos Figma associados a projetos.

#### Colunas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Identificador único do arquivo Figma |
| project_id | uuid | NOT NULL, REFERENCES projects(id) | ID do projeto ao qual o arquivo está associado |
| figma_file_key | text | NOT NULL | Chave do arquivo Figma |
| name | text | NOT NULL | Nome do arquivo Figma |
| description | text | | Descrição do arquivo |
| thumbnail_url | text | | URL da miniatura do arquivo |
| last_modified | timestamptz | | Data e hora da última modificação no Figma |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora de criação do registro |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() | Data e hora da última atualização |
| added_by | uuid | REFERENCES auth.users(id) | ID do usuário que adicionou o arquivo |
| settings | jsonb | DEFAULT '{}' | Configurações específicas do arquivo |

#### DDL

```sql
CREATE TABLE project_figma_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  figma_file_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  UNIQUE(project_id, figma_file_key)
);

-- Índices
CREATE INDEX idx_project_figma_files_project_id ON project_figma_files(project_id);
CREATE INDEX idx_project_figma_files_figma_file_key ON project_figma_files(figma_file_key);
```

#### Exemplo de Dados

```json
{
  "id": "623e4567-e89b-12d3-a456-426614174005",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "figma_file_key": "abcDEF123456",
  "name": "Design System - Componentes",
  "description": "Biblioteca de componentes para o sistema de gestão de documentos",
  "thumbnail_url": "https://figma.com/thumbnails/abcDEF123456",
  "last_modified": "2025-05-25T10:00:00Z",
  "created_at": "2025-05-20T17:00:00Z",
  "updated_at": "2025-05-26T15:00:00Z",
  "added_by": "98765432-e89b-12d3-a456-426614174000",
  "settings": {
    "auto_sync": true,
    "components_to_document": ["buttons", "forms", "cards"]
  }
}
```

## Relações entre Tabelas

O diagrama abaixo ilustra as relações entre as tabelas:

```
projects
  ↑
  |
  +--- repositories
  |
  +--- document_metadata
  |      ↑
  |      |
  |      +--- document_content
  |
  +--- project_members
  |
  +--- project_figma_files
```

## Funções e Gatilhos

### Função para Atualizar Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Gatilhos para Atualização Automática de Timestamps

```sql
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repositories_updated_at
BEFORE UPDATE ON repositories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_document_metadata_updated_at
BEFORE UPDATE ON document_metadata
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_document_content_updated_at
BEFORE UPDATE ON document_content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_project_members_updated_at
BEFORE UPDATE ON project_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_project_figma_files_updated_at
BEFORE UPDATE ON project_figma_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

## Políticas de Segurança (RLS)

### Políticas para Tabela projects

```sql
-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Política para visualização de projetos
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- Política para inserção de projetos
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Política para atualização de projetos
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = id AND user_id = auth.uid() AND role IN ('admin') AND status = 'active'
    )
  );

-- Política para exclusão de projetos
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (auth.uid() = owner_id);
```

### Políticas para Tabela repositories

```sql
-- Habilitar RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Política para visualização de repositórios
CREATE POLICY repositories_select_policy ON repositories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid() AND status = 'active'
        )
      )
    )
  );

-- Política para inserção de repositórios
CREATE POLICY repositories_insert_policy ON repositories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
      )
    )
  );

-- Política para atualização de repositórios
CREATE POLICY repositories_update_policy ON repositories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
      )
    )
  );

-- Política para exclusão de repositórios
CREATE POLICY repositories_delete_policy ON repositories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('admin') AND status = 'active'
        )
      )
    )
  );
```

## Considerações de Performance

1. **Índices Compostos**: Para consultas frequentes que filtram por múltiplas colunas, considere adicionar índices compostos.

2. **Particionamento**: Para tabelas que crescem significativamente (como `document_content`), considere implementar particionamento.

3. **Busca Vetorial**: A tabela `document_content` utiliza a extensão `vector` para busca semântica. Ajuste os parâmetros do índice `ivfflat` conforme o volume de dados.

4. **Monitoramento**: Implemente monitoramento de performance para identificar consultas lentas e otimizá-las.

5. **Vacuum**: Configure operações de vacuum automáticas para manter a performance do banco de dados.

## Integração com o DatabaseAgent

O DatabaseAgent do template Windsurf é responsável por gerenciar este esquema de banco de dados, incluindo:

1. Criação e manutenção de tabelas
2. Gerenciamento de migrações
3. Otimização de queries
4. Validação de integridade de dados
5. Geração de documentação automática do schema

Para mais detalhes sobre como o DatabaseAgent interage com este esquema, consulte o arquivo `database_rules.md` na pasta `.windsurf/rules/`.
