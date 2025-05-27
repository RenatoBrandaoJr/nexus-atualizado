// src/agents/document_agent.js

/**
 * DocumentAgent
 * 
 * Responsável por gerenciar a criação, atualização e organização de documentação.
 * Automatiza a geração de documentação a partir de código-fonte, designs e outros artefatos.
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';

// Importar adaptadores MCP
import supabaseMCP from '../mcps/supabase_adapter.js';
import githubMCP from '../mcps/github_adapter.js';
import figmaMCP from '../mcps/figma_adapter.js';
import puppeteerMCP from '../mcps/puppeteer_adapter.js';
import sequentialThinkingMCP from '../mcps/sequential_thinking_adapter.js';
import taskmasterMCP from '../mcps/taskmaster_claude_adapter.js';

class DocumentAgent {
  constructor(config = {}) {
    this.config = {
      defaultFormat: 'markdown',
      generateDiagrams: true,
      includeDesignReferences: true,
      ...config
    };
    
    this.toolManager = new ToolManager();
    this.logger = createLogger('DocumentAgent');
    this.metrics = createMetrics('DocumentAgent');
    
    // Adaptadores MCP
    this.supabaseMCP = supabaseMCP;
    this.githubMCP = githubMCP;
    this.figmaMCP = figmaMCP;
    this.puppeteerMCP = puppeteerMCP;
    this.sequentialThinkingMCP = sequentialThinkingMCP;
    this.taskmasterMCP = taskmasterMCP;
    
    // Inicializar ferramentas
    this.initializeTools();
    
    console.log('DocumentAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas utilizadas pelo agente
   */
  initializeTools() {
    // Ferramenta para extrair documentação de código-fonte
    this.toolManager.registerTool('document:extractFromCode', async (params) => {
      this.logger.info('Extraindo documentação do código-fonte', params);
      return await this.extractDocumentationFromCode(params.repository, params.options);
    });
    
    // Ferramenta para extrair documentação de design
    this.toolManager.registerTool('document:extractFromDesign', async (params) => {
      this.logger.info('Extraindo documentação de design', params);
      return await this.extractDocumentationFromDesign(params.fileId, params.options);
    });
    
    // Ferramenta para gerar documentação a partir de tarefas
    this.toolManager.registerTool('document:generateFromTasks', async (params) => {
      this.logger.info('Gerando documentação a partir de tarefas', params);
      return await this.generateDocumentationFromTasks(params.projectId, params.options);
    });
    
    // Ferramenta para gerar documentação de API
    this.toolManager.registerTool('document:generateApiDocs', async (params) => {
      this.logger.info('Gerando documentação de API', params);
      return await this.generateApiDocumentation(params.source, params.options);
    });
    
    // Ferramenta para publicar documentação
    this.toolManager.registerTool('document:publish', async (params) => {
      this.logger.info('Publicando documentação', params);
      return await this.publishDocumentation(params.documentation, params.destination, params.options);
    });
  }
  
  /**
   * Extrai documentação a partir de código-fonte
   */
  async extractDocumentationFromCode(repository, options = {}) {
    this.logger.info(`Extraindo documentação do repositório: ${repository}`, options);
    this.metrics.increment('documentation.extract.code');
    
    try {
      // Usar o adaptador do GitHub para extrair documentação
      const result = await this.githubMCP.extractDocumentation(repository, options);
      
      // Processar e estruturar a documentação
      const documentation = {
        source: 'code',
        repository,
        title: `Documentação: ${result.repository.name}`,
        sections: [],
        generatedAt: new Date().toISOString()
      };
      
      // Adicionar seções baseadas nos documentos extraídos
      if (result.documents && result.documents.length > 0) {
        documentation.sections = result.documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          path: doc.path,
          url: doc.url
        }));
      }
      
      this.logger.info(`Documentação extraída com sucesso: ${documentation.sections.length} seções`);
      return documentation;
    } catch (error) {
      this.logger.error(`Erro ao extrair documentação do código: ${error.message}`, { error });
      this.metrics.increment('documentation.extract.code.error');
      throw error;
    }
  }
  
  /**
   * Extrai documentação a partir de designs no Figma
   */
  async extractDocumentationFromDesign(fileId, options = {}) {
    this.logger.info(`Extraindo documentação do design: ${fileId}`, options);
    this.metrics.increment('documentation.extract.design');
    
    try {
      // Usar o adaptador do Figma para extrair documentação
      const result = await this.figmaMCP.extractDocumentation(fileId, options);
      
      this.logger.info(`Documentação de design extraída com sucesso: ${result.sections.length} seções`);
      return {
        source: 'design',
        fileId,
        title: result.title,
        sections: result.sections,
        components: result.components,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Erro ao extrair documentação do design: ${error.message}`, { error });
      this.metrics.increment('documentation.extract.design.error');
      throw error;
    }
  }
  
  /**
   * Gera documentação a partir de tarefas do projeto
   */
  async generateDocumentationFromTasks(projectId, options = {}) {
    this.logger.info(`Gerando documentação a partir de tarefas do projeto: ${projectId}`, options);
    this.metrics.increment('documentation.generate.tasks');
    
    try {
      // Usar o adaptador do TaskMaster para gerar documentação
      const result = await this.taskmasterMCP.generateDocumentation(projectId, {
        format: this.config.defaultFormat,
        ...options
      });
      
      this.logger.info(`Documentação gerada com sucesso para o projeto: ${result.project.name}`);
      return {
        source: 'tasks',
        projectId,
        title: `Documentação do Projeto: ${result.project.name}`,
        content: result.documentation.content,
        format: result.documentation.format,
        generatedAt: result.documentation.generatedAt
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar documentação a partir de tarefas: ${error.message}`, { error });
      this.metrics.increment('documentation.generate.tasks.error');
      throw error;
    }
  }
  
  /**
   * Gera documentação de API
   */
  async generateApiDocumentation(source, options = {}) {
    this.logger.info(`Gerando documentação de API a partir de: ${source.type}`, options);
    this.metrics.increment('documentation.generate.api');
    
    try {
      let apiDoc = {
        title: options.title || 'Documentação da API',
        version: options.version || '1.0.0',
        description: options.description || 'Documentação gerada automaticamente',
        endpoints: [],
        schemas: [],
        generatedAt: new Date().toISOString()
      };
      
      // Processar conforme o tipo de fonte
      switch(source.type) {
        case 'code':
          // Simular extração de endpoints de código
          apiDoc.endpoints = [
            {
              path: '/api/users',
              method: 'GET',
              summary: 'Lista todos os usuários',
              parameters: [],
              responses: [
                { code: 200, description: 'Sucesso', schema: 'UserList' }
              ]
            },
            {
              path: '/api/users/{id}',
              method: 'GET',
              summary: 'Obtém um usuário pelo ID',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID do usuário' }
              ],
              responses: [
                { code: 200, description: 'Sucesso', schema: 'User' },
                { code: 404, description: 'Usuário não encontrado' }
              ]
            }
          ];
          
          apiDoc.schemas = [
            {
              name: 'User',
              properties: [
                { name: 'id', type: 'string', description: 'ID do usuário' },
                { name: 'name', type: 'string', description: 'Nome do usuário' },
                { name: 'email', type: 'string', description: 'Email do usuário' }
              ]
            },
            {
              name: 'UserList',
              properties: [
                { name: 'users', type: 'array', items: 'User', description: 'Lista de usuários' }
              ]
            }
          ];
          break;
          
        case 'openapi':
          // Processar documento OpenAPI existente
          apiDoc = {
            ...apiDoc,
            title: source.spec.info.title || apiDoc.title,
            version: source.spec.info.version || apiDoc.version,
            description: source.spec.info.description || apiDoc.description,
            // Processamento real seria mais complexo
            endpoints: [], 
            schemas: []
          };
          break;
          
        default:
          throw new Error(`Tipo de fonte não suportado: ${source.type}`);
      }
      
      this.logger.info(`Documentação de API gerada com sucesso: ${apiDoc.endpoints.length} endpoints`);
      return apiDoc;
    } catch (error) {
      this.logger.error(`Erro ao gerar documentação de API: ${error.message}`, { error });
      this.metrics.increment('documentation.generate.api.error');
      throw error;
    }
  }
  
  /**
   * Publica documentação no destino especificado
   */
  async publishDocumentation(documentation, destination, options = {}) {
    this.logger.info(`Publicando documentação em: ${destination.type}`, options);
    this.metrics.increment('documentation.publish');
    
    try {
      let result;
      
      switch(destination.type) {
        case 'github':
          // Publicar no GitHub
          result = await this.githubMCP.createOrUpdateFile(
            destination.repository,
            destination.path,
            typeof documentation.content === 'string' ? documentation.content : JSON.stringify(documentation, null, 2),
            options.commitMessage || `Atualização da documentação: ${documentation.title}`,
            destination.branch || 'main'
          );
          
          return {
            success: true,
            url: result.content.html_url,
            commit: result.commit.html_url,
            publishedAt: new Date().toISOString()
          };
          
        case 'supabase':
          // Salvar no Supabase
          result = await this.supabaseMCP.saveDocument({
            title: documentation.title,
            content: typeof documentation.content === 'string' ? documentation.content : JSON.stringify(documentation, null, 2),
            format: documentation.format || this.config.defaultFormat,
            path: destination.path,
            metadata: {
              source: documentation.source,
              generatedAt: documentation.generatedAt
            }
          });
          
          return {
            success: true,
            documentId: result.id,
            publishedAt: new Date().toISOString()
          };
          
        default:
          throw new Error(`Tipo de destino não suportado: ${destination.type}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao publicar documentação: ${error.message}`, { error });
      this.metrics.increment('documentation.publish.error');
      throw error;
    }
  }
  
  /**
   * Inicializa o agente
   */
  async initialize() {
    this.logger.info('Inicializando DocumentAgent');
    
    // Verificar tabelas necessárias
    await this.ensureDatabaseStructure();
    
    this.logger.info('DocumentAgent inicializado com sucesso');
    return { success: true };
  }
  
  /**
   * Garante que a estrutura do banco de dados existe
   */
  async ensureDatabaseStructure() {
    // Verificar se as tabelas necessárias existem
    // Na prática, isso seria feito com migrations
    this.logger.info('Verificando estrutura do banco de dados');
    
    // Exemplo simplificado
    const tables = ['document_metadata', 'document_content', 'document_task_relations'];
    
    for (const table of tables) {
      try {
        await this.supabaseMCP.invoke('supabase_query', {
          table,
          limit: 1
        });
      } catch (error) {
        this.logger.warn(`Tabela ${table} não encontrada, criando...`);
        // Na prática, executaria uma migration para criar a tabela
      }
    }
    
    return { success: true };
  }
  
  /**
   * Gera documentação a partir de código-fonte
   */
  async generateCodeDocumentation(options) {
    const { projectId, repositoryId, branch, options: docOptions } = options;
    
    this.logger.info('Gerando documentação de código', { projectId, repositoryId });
    this.metrics.increment('documentation.code.generate');
    
    try {
      // Obter detalhes do repositório
      const repository = await this.supabaseMCP.invoke('supabase_query', {
        table: 'repositories',
        filter: { id: repositoryId }
      });
      
      if (!repository || repository.length === 0) {
        throw new Error(`Repositório não encontrado: ${repositoryId}`);
      }
      
      // Obter código-fonte
      const codeFiles = await this.githubMCP.invoke('github_pull', {
        repository: repository[0].full_name,
        branch: branch || repository[0].default_branch
      });
      
      // Coletar recursos para documentação
      const resources = await this.collectDocumentationResources(
        projectId, 
        repositoryId, 
        codeFiles
      );
      
      // Gerar documentação
      const documentationResult = await this.generateDocumentation(
        resources,
        docOptions || this.config
      );
      
      // Formatar e estruturar documentação
      const formattedDoc = await this.formatAndStructureDocumentation(
        projectId,
        documentationResult
      );
      
      this.logger.info('Documentação gerada com sucesso', { 
        projectId, 
        documentId: formattedDoc.documentId 
      });
      
      this.metrics.increment('documentation.code.success');
      
      return {
        success: true,
        documentId: formattedDoc.documentId,
        version: formattedDoc.version,
        format: documentationResult.format
      };
    } catch (error) {
      this.logger.error('Falha ao gerar documentação de código', { error });
      this.metrics.increment('documentation.code.failure');
      
      throw error;
    }
  }
  
  /**
   * Atualiza documentação após commit de código
   */
  async updateCodeDocumentation(options) {
    const { projectId, repositoryId, commitData, codeFiles, config } = options;
    
    this.logger.info('Atualizando documentação após commit', { 
      projectId, 
      commitId: commitData.id 
    });
    
    this.metrics.increment('documentation.code.update');
    
    try {
      // Coletar recursos para documentação
      const resources = await this.collectDocumentationResources(
        projectId,
        repositoryId,
        codeFiles,
        commitData
      );
      
      // Verificar documentação existente
      const existingDocs = await this.supabaseMCP.invoke('supabase_query', {
        table: 'document_metadata',
        filter: {
          project_id: projectId,
          type: 'code_documentation',
          status: 'active'
        }
      });
      
      // Adicionar documentação existente aos recursos
      if (existingDocs && existingDocs.length > 0) {
        const latestContent = await this.supabaseMCP.invoke('supabase_query', {
          table: 'document_content',
          filter: {
            document_id: existingDocs[0].id,
            version: existingDocs[0].version
          }
        });
        
        if (latestContent && latestContent.length > 0) {
          resources.existingDocs = {
            metadata: existingDocs[0],
            content: latestContent[0].content
          };
        }
      }
      
      // Gerar documentação
      const documentationResult = await this.generateDocumentation(
        resources,
        config || this.config
      );
      
      // Formatar e estruturar documentação
      const formattedDoc = await this.formatAndStructureDocumentation(
        projectId,
        documentationResult,
        commitData
      );
      
      // Notificar partes interessadas
      await this.notifyDocumentationUpdate(
        projectId,
        formattedDoc.documentId,
        formattedDoc.isUpdate,
        commitData
      );
      
      this.logger.info('Documentação atualizada com sucesso', { 
        projectId, 
        documentId: formattedDoc.documentId 
      });
      
      this.metrics.increment('documentation.code.update.success');
      
      return {
        success: true,
        documentId: formattedDoc.documentId,
        version: formattedDoc.version,
        isUpdate: formattedDoc.isUpdate
      };
    } catch (error) {
      this.logger.error('Falha ao atualizar documentação', { error });
      this.metrics.increment('documentation.code.update.failure');
      
      throw error;
    }
  }
  
  /**
   * Coleta recursos para documentação
   */
  async collectDocumentationResources(projectId, repositoryId, codeFiles, commitData = null) {
    this.logger.info('Coletando recursos para documentação', { projectId });
    
    // Iniciar coleta paralela de recursos
    const [codeDetails, designAssets] = await Promise.all([
      // Obter detalhes do código do GitHub
      this.getCodeDetails(repositoryId, codeFiles, commitData),
      
      // Obter assets de design relacionados do Figma
      this.getDesignAssets(projectId)
    ]);
    
    return {
      code: codeDetails,
      design: designAssets
    };
  }
  
  /**
   * Obtém detalhes do código-fonte
   */
  async getCodeDetails(repositoryId, codeFiles, commitData = null) {
    try {
      // Obter detalhes do repositório
      const repository = await this.supabaseMCP.invoke('supabase_query', {
        table: 'repositories',
        filter: { id: repositoryId }
      });
      
      if (!repository || repository.length === 0) {
        throw new Error(`Repositório não encontrado: ${repositoryId}`);
      }
      
      // Se temos dados de commit específicos
      if (commitData) {
        // Obter detalhes do commit
        const commitDetails = await this.githubMCP.invoke('github_commit', {
          repository: repository[0].full_name,
          commitId: commitData.id
        });
        
        return {
          files: codeFiles,
          commit: commitDetails,
          commitHistory: await this.getCommitHistory(repository[0].full_name, 10)
        };
      }
      
      // Caso contrário, obter arquivos do branch padrão
      return {
        files: codeFiles,
        commitHistory: await this.getCommitHistory(repository[0].full_name, 10)
      };
    } catch (error) {
      this.logger.error('Erro ao obter detalhes do código', { error });
      return { files: codeFiles, error: error.message };
    }
  }
  
  /**
   * Obtém histórico de commits
   */
  async getCommitHistory(repositoryFullName, limit = 10) {
    try {
      return await this.githubMCP.invoke('github_commits', {
        repository: repositoryFullName,
        limit
      });
    } catch (error) {
      this.logger.error('Erro ao obter histórico de commits', { error });
      return [];
    }
  }
  
  /**
   * Obtém assets de design do Figma
   */
  async getDesignAssets(projectId) {
    try {
      // Verificar se há arquivos Figma associados ao projeto
      const figmaFiles = await this.supabaseMCP.invoke('supabase_query', {
        table: 'project_figma_files',
        filter: { project_id: projectId }
      });
      
      if (!figmaFiles || figmaFiles.length === 0) {
        return { success: true, assets: [] };
      }
      
      // Obter assets para cada arquivo Figma
      const assetsPromises = figmaFiles.map(async file => {
        try {
          // Obter arquivo Figma
          const figmaFile = await this.figmaMCP.invoke('figma_get_file', {
            fileId: file.figma_file_id
          });
          
          // Obter componentes
          const components = await this.figmaMCP.invoke('figma_get_components', {
            fileId: file.figma_file_id
          });
          
          // Selecionar componentes relevantes
          const relevantComponents = this.selectRelevantComponents(components);
          
          // Exportar assets
          const assets = await this.figmaMCP.invoke('figma_export_assets', {
            fileId: file.figma_file_id,
            ids: relevantComponents.map(c => c.id),
            format: 'png',
            scale: 2
          });
          
          return {
            fileId: file.figma_file_id,
            fileName: figmaFile.name,
            components: relevantComponents,
            assets
          };
        } catch (error) {
          this.logger.error(`Erro ao processar arquivo Figma ${file.figma_file_id}`, { error });
          return {
            fileId: file.figma_file_id,
            error: error.message
          };
        }
      });
      
      const assetsResults = await Promise.all(assetsPromises);
      
      // Filtrar resultados com erro
      const validResults = assetsResults.filter(result => !result.error);
      
      return {
        success: true,
        assets: validResults.flatMap(result => result.assets || []),
        files: validResults.map(result => ({
          id: result.fileId,
          name: result.fileName
        }))
      };
    } catch (error) {
      this.logger.error('Erro ao obter assets de design', { error });
      return { success: false, error: error.message, assets: [] };
    }
  }
  
  /**
   * Seleciona componentes relevantes do Figma
   */
  selectRelevantComponents(components) {
    // Implementação simplificada
    // Na prática, teria lógica mais sofisticada para selecionar componentes relevantes
    if (!components || !components.length) {
      return [];
    }
    
    // Filtrar por tipo e tags
    return components.filter(component => {
      // Incluir apenas componentes principais
      if (!component.isMain) {
        return false;
      }
      
      // Filtrar por tipo
      const relevantTypes = ['COMPONENT', 'INSTANCE', 'FRAME'];
      if (!relevantTypes.includes(component.type)) {
        return false;
      }
      
      return true;
    }).slice(0, 10); // Limitar a 10 componentes para exemplo
  }
  
  /**
   * Gera documentação a partir dos recursos coletados
   */
  async generateDocumentation(resources, config) {
    this.logger.info('Gerando documentação a partir dos recursos');
    
    // Preparar contexto para análise
    const analysisContext = {
      codeFiles: resources.code.files,
      designAssets: resources.design.assets || [],
      commitHistory: resources.code.commitHistory || [],
      existingDocumentation: resources.existingDocs,
      documentationConfig: config
    };
    
    // Analisar código com Sequential-Thinking
    const codeAnalysis = await this.sequentialThinkingMCP.invoke('sequential_analyze', {
      data: {
        codeFiles: resources.code.files,
        commitHistory: resources.code.commitHistory || []
      },
      parameters: {
        analysisType: 'code_documentation',
        depth: 'standard',
        focusAreas: ['architecture', 'api', 'functionality'],
        structureOutput: true
      }
    });
    
    // Gerar documentação com TaskMaster Claude
    const documentationResult = await this.taskmasterMCP.invoke('taskmaster_generate', {
      task: 'documentation_generation',
      context: {
        codeAnalysis,
        designAssets: resources.design.assets || [],
        existingDocumentation: resources.existingDocs,
        format: config.format || 'markdown'
      },
      parameters: {
        sections: config.sections || ['overview', 'architecture', 'api', 'examples'],
        detailLevel: config.detailLevel || 'standard',
        includeDesignReferences: resources.design.assets && resources.design.assets.length > 0,
        includeCodeExamples: true,
        generateDiagrams: config.generateDiagrams || false
      }
    });
    
    return {
      content: documentationResult.content,
      format: config.format || 'markdown',
      metadata: {
        sections: documentationResult.sections,
        diagrams: documentationResult.diagrams,
        commitId: resources.code.commit ? resources.code.commit.sha : null
      }
    };
  }
  
  /**
   * Formata e estrutura a documentação
   */
  async formatAndStructureDocumentation(projectId, documentationResult, commitData = null) {
    this.logger.info('Formatando e estruturando documentação', { projectId });
    
    // Verificar documentação existente
    const existingDocs = await this.supabaseMCP.invoke('supabase_query', {
      table: 'document_metadata',
      filter: {
        project_id: projectId,
        type: 'code_documentation',
        status: 'active'
      }
    });
    
    let documentId;
    let isUpdate = false;
    let version = 1;
    
    if (existingDocs && existingDocs.length > 0) {
      // Atualizar documentação existente
      documentId = existingDocs[0].id;
      isUpdate = true;
      
      // Incrementar versão
      version = existingDocs[0].version + 1;
      
      // Armazenar nova versão do conteúdo
      await this.supabaseMCP.invoke('supabase_insert', {
        table: 'document_content',
        data: {
          document_id: documentId,
          version: version,
          content: documentationResult.content,
          content_format: documentationResult.format,
          created_at: new Date().toISOString(),
          created_by: 'system'
        }
      });
      
      // Atualizar metadados do documento
      await this.supabaseMCP.invoke('supabase_update', {
        table: 'document_metadata',
        filter: { id: documentId },
        data: {
          version: version,
          updated_at: new Date().toISOString(),
          last_modified_by: 'system',
          metadata: {
            ...existingDocs[0].metadata,
            last_commit_id: commitData ? commitData.id : documentationResult.metadata.commitId,
            sections: documentationResult.metadata.sections,
            generated_diagrams: documentationResult.metadata.diagrams
          }
        }
      });
    } else {
      // Criar nova documentação
      const docMetadata = await this.supabaseMCP.invoke('supabase_insert', {
        table: 'document_metadata',
        data: {
          project_id: projectId,
          title: 'Documentação Técnica',
          description: 'Documentação técnica gerada automaticamente a partir do código-fonte',
          type: 'code_documentation',
          tags: ['auto-generated', 'code', 'technical'],
          status: 'active',
          version: 1,
          author_id: 'system',
          last_modified_by: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            last_commit_id: commitData ? commitData.id : documentationResult.metadata.commitId,
            sections: documentationResult.metadata.sections,
            generated_diagrams: documentationResult.metadata.diagrams
          }
        }
      });
      
      documentId = docMetadata.id;
      
      // Armazenar conteúdo inicial
      await this.supabaseMCP.invoke('supabase_insert', {
        table: 'document_content',
        data: {
          document_id: documentId,
          version: 1,
          content: documentationResult.content,
          content_format: documentationResult.format,
          created_at: new Date().toISOString(),
          created_by: 'system'
        }
      });
    }
    
    // Gerar PDF se configurado
    if (documentationResult.format === 'markdown') {
      try {
        await this.generatePDF(documentId, documentationResult.content, existingDocs && existingDocs.length > 0 ? existingDocs[0].metadata : null);
      } catch (error) {
        this.logger.error('Erro ao gerar PDF', { error });
        // Continuar mesmo se a geração de PDF falhar
      }
    }
    
    return {
      documentId,
      isUpdate,
      version
    };
  }
  
  /**
   * Gera PDF a partir do conteúdo Markdown
   */
  async generatePDF(documentId, markdownContent, metadata) {
    this.logger.info('Gerando PDF para documento', { documentId });
    
    try {
      // Converter Markdown para HTML
      const htmlContent = await this.markdownToHTML(markdownContent);
      
      // Gerar PDF com Puppeteer
      const pdfBuffer = await this.puppeteerMCP.invoke('puppeteer_pdf', {
        content: htmlContent,
        options: {
          format: 'A4',
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
          },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">Documentação Técnica</div>',
          footerTemplate: '<div style="font-size: 8px; text-align: center; width: 100%;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
        }
      });
      
      // Armazenar PDF
      const pdfPath = `documents/${documentId}.pdf`;
      const storedPdf = await this.supabaseMCP.invoke('supabase_storage', {
        bucket: 'exports',
        path: pdfPath,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
      
      // Atualizar metadados com referência ao PDF
      await this.supabaseMCP.invoke('supabase_update', {
        table: 'document_metadata',
        filter: { id: documentId },
        data: {
          metadata: {
            ...(metadata || {}),
            pdf_export_path: pdfPath,
            pdf_export_url: storedPdf.url,
            pdf_export_date: new Date().toISOString()
          }
        }
      });
      
      return { success: true, pdfUrl: storedPdf.url };
    } catch (error) {
      this.logger.error('Erro ao gerar PDF', { error });
      throw error;
    }
  }
  
  /**
   * Converte Markdown para HTML
   */
  async markdownToHTML(markdownContent) {
    // Implementação simplificada
    // Na prática, usaria uma biblioteca como marked ou remark
    const marked = require('marked');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          h1 { color: #333; }
          h2 { color: #444; border-bottom: 1px solid #eee; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 3px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        ${marked.parse(markdownContent)}
      </body>
      </html>
    `;
  }
  
  /**
   * Notifica sobre atualização de documentação
   */
  async notifyDocumentationUpdate(projectId, documentId, isUpdate, commitData) {
    this.logger.info('Notificando atualização de documentação', { projectId, documentId });
    
    try {
      // Obter stakeholders do projeto
      const projectStakeholders = await this.getProjectStakeholders(projectId);
      
      // Filtrar stakeholders com interesse em documentação
      const interestedStakeholders = projectStakeholders.filter(
        stakeholder => stakeholder.notification_preferences.documentation
      );
      
      if (interestedStakeholders.length === 0) {
        this.logger.info('Nenhum stakeholder interessado em notificações de documentação');
        return { success: true, message: 'Nenhum stakeholder interessado em notificações de documentação' };
      }
      
      // Obter agente de notificação
      const notificationAgent = require('./notification_agent');
      
      // Enviar notificações
      await Promise.all(interestedStakeholders.map(stakeholder => 
        notificationAgent.sendNotification({
          userId: stakeholder.user_id,
          title: isUpdate ? 'Documentação técnica atualizada' : 'Nova documentação técnica disponível',
          message: `A documentação técnica foi ${isUpdate ? 'atualizada' : 'gerada'} ${
            commitData ? `com base no commit "${commitData.message.substring(0, 50)}${commitData.message.length > 50 ? '...' : ''}"` : ''
          }`,
          type: 'info',
          data: {
            documentId: documentId,
            projectId: projectId,
            commitId: commitData ? commitData.id : null,
            isUpdate: isUpdate
          },
          action: {
            type: 'link',
            target: `/projects/${projectId}/documents/${documentId}`,
            label: 'Ver documentação'
          }
        })
      ));
      
      return { success: true, notifiedUsers: interestedStakeholders.length };
    } catch (error) {
      this.logger.error('Erro ao notificar atualização de documentação', { error });
      // Não falhar o processo principal se a notificação falhar
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém stakeholders de um projeto
   */
  async getProjectStakeholders(projectId) {
    try {
      const stakeholders = await this.supabaseMCP.invoke('supabase_query', {
        table: 'project_members',
        filter: { project_id: projectId }
      });
      
      return stakeholders || [];
    } catch (error) {
      this.logger.error('Erro ao obter stakeholders do projeto', { error });
      return [];
    }
  }
  
  /**
   * Exporta documentação para um formato específico
   */
  async exportDocumentation(options) {
    const { documentId, format, options: exportOptions } = options;
    
    this.logger.info('Exportando documentação', { documentId, format });
    this.metrics.increment(`documentation.export.${format}`);
    
    try {
      // Obter metadados do documento
      const documentMetadata = await this.supabaseMCP.invoke('supabase_query', {
        table: 'document_metadata',
        filter: { id: documentId }
      });
      
      if (!documentMetadata || documentMetadata.length === 0) {
        throw new Error(`Documento não encontrado: ${documentId}`);
      }
      
      // Obter conteúdo do documento
      const documentContent = await this.supabaseMCP.invoke('supabase_query', {
        table: 'document_content',
        filter: {
          document_id: documentId,
          version: documentMetadata[0].version
        }
      });
      
      if (!documentContent || documentContent.length === 0) {
        throw new Error(`Conteúdo do documento não encontrado: ${documentId}`);
      }
      
      // Exportar para o formato solicitado
      switch (format.toLowerCase()) {
        case 'pdf':
          return await this.exportToPDF(documentId, documentContent[0].content, exportOptions);
        
        case 'html':
          return await this.exportToHTML(documentId, documentContent[0].content, exportOptions);
        
        case 'markdown':
        case 'md':
          return {
            success: true,
            content: documentContent[0].content,
            format: 'markdown'
          };
        
        default:
          throw new Error(`Formato de exportação não suportado: ${format}`);
      }
    } catch (error) {
      this.logger.error('Falha ao exportar documentação', { error });
      this.metrics.increment(`documentation.export.${format}.failure`);
      
      throw error;
    }
  }
  
  /**
   * Exporta documentação para PDF
   */
  async exportToPDF(documentId, content, options = {}) {
    // Verificar se já temos um PDF exportado recentemente
    const documentMetadata = await this.supabaseMCP.invoke('supabase_query', {
      table: 'document_metadata',
      filter: { id: documentId }
    });
    
    if (documentMetadata[0].metadata && 
        documentMetadata[0].metadata.pdf_export_url && 
        documentMetadata[0].metadata.pdf_export_date) {
      
      const exportDate = new Date(documentMetadata[0].metadata.pdf_export_date);
      const now = new Date();
      
      // Se o PDF foi gerado nas últimas 24 horas e não há opções especiais, retornar o existente
      if ((now - exportDate) < 24 * 60 * 60 * 1000 && !options.force) {
        return {
          success: true,
          url: documentMetadata[0].metadata.pdf_export_url,
          format: 'pdf',
          cached: true
        };
      }
    }
    
    // Gerar novo PDF
    const pdfResult = await this.generatePDF(documentId, content, documentMetadata[0].metadata);
    
    return {
      success: true,
      url: pdfResult.pdfUrl,
      format: 'pdf',
      cached: false
    };
  }
  
  /**
   * Exporta documentação para HTML
   */
  async exportToHTML(documentId, content, options = {}) {
    // Converter Markdown para HTML
    const htmlContent = await this.markdownToHTML(content);
    
    // Armazenar HTML
    const htmlPath = `documents/${documentId}.html`;
    const storedHtml = await this.supabaseMCP.invoke('supabase_storage', {
      bucket: 'exports',
      path: htmlPath,
      content: htmlContent,
      contentType: 'text/html'
    });
    
    // Atualizar metadados
    await this.supabaseMCP.invoke('supabase_update', {
      table: 'document_metadata',
      filter: { id: documentId },
      data: {
        metadata: {
          ...(documentMetadata[0].metadata || {}),
          html_export_path: htmlPath,
          html_export_url: storedHtml.url,
          html_export_date: new Date().toISOString()
        }
      }
    });
    
    return {
      success: true,
      url: storedHtml.url,
      format: 'html'
    };
  }
}

export default DocumentAgent;
