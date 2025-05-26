-- Schema SQL para o Template Windsurf SaaS
-- Criado automaticamente a partir do arquivo database_schema.md

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela: projects
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

-- Índices para projects
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Tabela: repositories
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

-- Índices para repositories
CREATE INDEX idx_repositories_project_id ON repositories(project_id);
CREATE INDEX idx_repositories_provider ON repositories(provider);

-- Tabela: document_metadata
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

-- Índices para document_metadata
CREATE INDEX idx_document_metadata_project_id ON document_metadata(project_id);
CREATE INDEX idx_document_metadata_repository_id ON document_metadata(repository_id);
CREATE INDEX idx_document_metadata_type ON document_metadata(type);
CREATE INDEX idx_document_metadata_status ON document_metadata(status);
CREATE INDEX idx_document_metadata_tags ON document_metadata USING GIN(tags);

-- Tabela: document_content
CREATE TABLE document_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_vector vector(1536),
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para document_content
CREATE INDEX idx_document_content_document_id ON document_content(document_id);
CREATE INDEX idx_document_content_vector ON document_content USING ivfflat (content_vector vector_cosine_ops);

-- Tabela: project_members
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

-- Índices para project_members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_status ON project_members(status);

-- Tabela: project_figma_files
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

-- Índices para project_figma_files
CREATE INDEX idx_project_figma_files_project_id ON project_figma_files(project_id);
CREATE INDEX idx_project_figma_files_figma_file_key ON project_figma_files(figma_file_key);

-- Função para atualização automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gatilhos para atualização automática de timestamps
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

-- Políticas de Segurança RLS (Row Level Security)

-- Habilitar RLS para projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Políticas para projects
CREATE POLICY "Usuários podem ver seus próprios projetos"
ON projects FOR SELECT
USING (
  auth.uid() = owner_id OR 
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar projetos"
ON projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Proprietários e administradores podem atualizar projetos"
ON projects FOR UPDATE
USING (
  auth.uid() = owner_id OR 
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Apenas proprietários podem excluir projetos"
ON projects FOR DELETE
USING (auth.uid() = owner_id);

-- Habilitar RLS para repositories
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Políticas para repositories
CREATE POLICY "Usuários podem ver repositórios de seus projetos"
ON repositories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE repositories.project_id = projects.id
    AND (projects.owner_id = auth.uid() OR project_members.user_id = auth.uid())
  )
);

CREATE POLICY "Administradores podem gerenciar repositórios"
ON repositories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE repositories.project_id = projects.id
    AND (
      projects.owner_id = auth.uid() OR 
      (project_members.user_id = auth.uid() AND project_members.role IN ('owner', 'admin'))
    )
  )
);

-- Habilitar RLS para document_metadata
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;

-- Políticas para document_metadata
CREATE POLICY "Usuários podem ver documentos de seus projetos"
ON document_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE document_metadata.project_id = projects.id
    AND (projects.owner_id = auth.uid() OR project_members.user_id = auth.uid())
  )
);

CREATE POLICY "Usuários com permissões podem gerenciar documentos"
ON document_metadata FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE document_metadata.project_id = projects.id
    AND (
      projects.owner_id = auth.uid() OR 
      (
        project_members.user_id = auth.uid() AND 
        (
          project_members.role IN ('owner', 'admin') OR 
          (project_members.permissions->>'manage_documents')::boolean = true
        )
      )
    )
  )
);

-- Habilitar RLS para document_content
ALTER TABLE document_content ENABLE ROW LEVEL SECURITY;

-- Políticas para document_content
CREATE POLICY "Usuários podem ver conteúdo de documentos de seus projetos"
ON document_content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_metadata
    JOIN projects ON document_metadata.project_id = projects.id
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE document_content.document_id = document_metadata.id
    AND (projects.owner_id = auth.uid() OR project_members.user_id = auth.uid())
  )
);

CREATE POLICY "Usuários com permissões podem gerenciar conteúdo de documentos"
ON document_content FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM document_metadata
    JOIN projects ON document_metadata.project_id = projects.id
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE document_content.document_id = document_metadata.id
    AND (
      projects.owner_id = auth.uid() OR 
      (
        project_members.user_id = auth.uid() AND 
        (
          project_members.role IN ('owner', 'admin') OR 
          (project_members.permissions->>'manage_documents')::boolean = true
        )
      )
    )
  )
);

-- Habilitar RLS para project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Políticas para project_members
CREATE POLICY "Usuários podem ver membros de seus projetos"
ON project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members pm ON projects.id = pm.project_id
    WHERE project_members.project_id = projects.id
    AND (projects.owner_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Administradores podem gerenciar membros"
ON project_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members pm ON projects.id = pm.project_id
    WHERE project_members.project_id = projects.id
    AND (
      projects.owner_id = auth.uid() OR 
      (
        pm.user_id = auth.uid() AND 
        (
          pm.role IN ('owner', 'admin') OR 
          (pm.permissions->>'manage_members')::boolean = true
        )
      )
    )
  )
);

-- Habilitar RLS para project_figma_files
ALTER TABLE project_figma_files ENABLE ROW LEVEL SECURITY;

-- Políticas para project_figma_files
CREATE POLICY "Usuários podem ver arquivos Figma de seus projetos"
ON project_figma_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE project_figma_files.project_id = projects.id
    AND (projects.owner_id = auth.uid() OR project_members.user_id = auth.uid())
  )
);

CREATE POLICY "Usuários com permissões podem gerenciar arquivos Figma"
ON project_figma_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    LEFT JOIN project_members ON projects.id = project_members.project_id
    WHERE project_figma_files.project_id = projects.id
    AND (
      projects.owner_id = auth.uid() OR 
      (
        project_members.user_id = auth.uid() AND 
        (
          project_members.role IN ('owner', 'admin') OR 
          (project_members.permissions->>'manage_figma_files')::boolean = true
        )
      )
    )
  )
);
