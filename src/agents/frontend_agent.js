/**
 * FrontendAgent - Responsável pelo gerenciamento de componentes e interfaces frontend
 * 
 * Este agente implementa as regras definidas em frontend_rules.md e gerencia:
 * - Implementação de componentes React
 * - Integração com design system
 * - Gerenciamento de estado da aplicação
 * - Otimização de performance
 * - Testes automatizados de interface
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';
import puppeteerMCP from '../mcps/puppeteer_adapter.js';

class FrontendAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('FrontendAgent');
    this.metrics = createMetrics('FrontendAgent');
    this.puppeteerMCP = puppeteerMCP;
    
    // Configurações do agente
    this.reactVersion = process.env.REACT_VERSION || '18.2.0';
    this.bundler = process.env.FRONTEND_BUNDLER || 'vite';
    this.cssFramework = process.env.CSS_FRAMEWORK || 'tailwind';
    this.stateManager = process.env.STATE_MANAGER || 'redux';
    this.testFramework = process.env.TEST_FRAMEWORK || 'jest';
    this.autoDocumentation = process.env.AUTO_DOCUMENTATION === 'true';
    this.componentPrefix = process.env.COMPONENT_PREFIX || 'Ws';
    
    // Inicializar ferramentas
    this.initializeTools();
    
    console.log('FrontendAgent inicializado com sucesso');
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    console.log('FrontendAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas necessárias para o FrontendAgent
   * @private
   */
  initializeTools() {
    // Ferramentas para gerenciamento de código
    this.toolManager.registerTool('github:code:get');
    this.toolManager.registerTool('github:code:update');
    this.toolManager.registerTool('github:pull:create');
    
    // Ferramentas para testes e build
    this.toolManager.registerTool('npm:test');
    this.toolManager.registerTool('npm:build');
    this.toolManager.registerTool('npm:lint');
    
    // Ferramentas para integração com Figma
    this.toolManager.registerTool('figma:components:get');
    this.toolManager.registerTool('figma:styles:get');
    
    // Ferramentas para documentação
    this.toolManager.registerTool('storybook:generate');
    this.toolManager.registerTool('jsdoc:generate');
  }
  
  /**
   * Registra handlers para eventos relacionados ao frontend
   * @private
   */
  registerEventHandlers() {
    // Eventos de design
    this.toolManager.on('design:synced', this.handleDesignSync.bind(this));
    this.toolManager.on('prototype:created', this.handlePrototypeCreated.bind(this));
    
    // Eventos de componentes
    this.toolManager.on('component:updated', this.handleComponentUpdated.bind(this));
    this.toolManager.on('component:deprecated', this.handleComponentDeprecated.bind(this));
    
    // Eventos de projeto
    this.toolManager.on('project:created', this.handleProjectCreated.bind(this));
    this.toolManager.on('project:updated', this.handleProjectUpdated.bind(this));
    
    // Eventos de documentação
    this.toolManager.on('documentation:requested', this.handleDocumentationRequested.bind(this));
  }
  
  /**
   * Cria um novo componente React baseado em especificações
   * @param {Object} componentSpec - Especificações do componente
   * @param {string} userId - ID do usuário criando o componente
   * @returns {Promise<Object>} Componente criado com metadados
   * @throws {Error} Se a criação falhar
   */
  async createComponent(componentSpec, userId) {
    try {
      // Validar permissões do usuário
      const canCreate = await this.securityAgent.authorizeAccess(
        userId,
        'frontend',
        null,
        'create'
      );
      
      if (!canCreate) {
        throw new Error('Usuário não tem permissão para criar componentes');
      }
      
      // Sanitizar e validar especificações do componente
      const sanitizedSpec = this.securityAgent.sanitizeInput(componentSpec, {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['atom', 'molecule', 'organism', 'template', 'page'] },
          description: { type: 'string' },
          props: { type: 'array' },
          figmaNodeId: { type: 'string' },
          dependencies: { type: 'array' }
        }
      });
      
      // Verificar se o componente já existe
      const existingComponent = await this.getComponentByName(sanitizedSpec.name);
      if (existingComponent) {
        throw new Error(`Componente com nome '${sanitizedSpec.name}' já existe`);
      }
      
      // Obter design do Figma se disponível
      let designData = null;
      if (sanitizedSpec.figmaNodeId) {
        designData = await this.toolManager.executeTool('figma:components:get', {
          nodeId: sanitizedSpec.figmaNodeId
        });
      }
      
      // Gerar código do componente
      const componentCode = await this.generateComponentCode(sanitizedSpec, designData);
      
      // Gerar testes para o componente
      const testCode = await this.generateComponentTests(sanitizedSpec, componentCode);
      
      // Gerar documentação do componente
      const componentDocs = await this.generateComponentDocs(sanitizedSpec, componentCode);
      
      // Salvar componente no repositório
      const componentPath = `src/components/${this.getComponentDirectory(sanitizedSpec.type)}/${this.componentPrefix}${sanitizedSpec.name}.jsx`;
      const testPath = `src/components/${this.getComponentDirectory(sanitizedSpec.type)}/${this.componentPrefix}${sanitizedSpec.name}.test.jsx`;
      const storybookPath = `src/stories/${this.getComponentDirectory(sanitizedSpec.type)}/${this.componentPrefix}${sanitizedSpec.name}.stories.jsx`;
      
      await this.toolManager.executeTool('github:code:update', {
        path: componentPath,
        content: componentCode,
        message: `feat(components): Add ${this.componentPrefix}${sanitizedSpec.name} component`,
        branch: `feature/component-${sanitizedSpec.name.toLowerCase()}`,
        createBranch: true
      });
      
      await this.toolManager.executeTool('github:code:update', {
        path: testPath,
        content: testCode,
        message: `test(components): Add tests for ${this.componentPrefix}${sanitizedSpec.name}`,
        branch: `feature/component-${sanitizedSpec.name.toLowerCase()}`,
        createBranch: false
      });
      
      await this.toolManager.executeTool('github:code:update', {
        path: storybookPath,
        content: componentDocs.storybook,
        message: `docs(storybook): Add stories for ${this.componentPrefix}${sanitizedSpec.name}`,
        branch: `feature/component-${sanitizedSpec.name.toLowerCase()}`,
        createBranch: false
      });
      
      // Registrar componente no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'frontend_components',
        data: {
          name: `${this.componentPrefix}${sanitizedSpec.name}`,
          type: sanitizedSpec.type,
          description: sanitizedSpec.description || '',
          props: sanitizedSpec.props || [],
          figma_node_id: sanitizedSpec.figmaNodeId || null,
          dependencies: sanitizedSpec.dependencies || [],
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: '1.0.0',
          status: 'active',
          path: componentPath
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao registrar componente no banco de dados');
      }
      
      // Criar pull request se necessário
      if (process.env.AUTO_CREATE_PR === 'true') {
        await this.toolManager.executeTool('github:pull:create', {
          title: `Add ${this.componentPrefix}${sanitizedSpec.name} component`,
          description: `
# New Component: ${this.componentPrefix}${sanitizedSpec.name}

${sanitizedSpec.description || ''}

## Type
${sanitizedSpec.type}

## Props
${JSON.stringify(sanitizedSpec.props || [], null, 2)}

## Dependencies
${JSON.stringify(sanitizedSpec.dependencies || [], null, 2)}
          `,
          branch: `feature/component-${sanitizedSpec.name.toLowerCase()}`,
          base: 'main'
        });
      }
      
      // Emitir evento de componente criado
      this.toolManager.emit('component:created', {
        component: result,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Gerar documentação automática se habilitado
      if (this.autoDocumentation) {
        await this.documentAgent.generateComponentDocumentation(result.id);
      }
      
      return {
        id: result.id,
        name: `${this.componentPrefix}${sanitizedSpec.name}`,
        type: sanitizedSpec.type,
        path: componentPath,
        testPath,
        storybookPath,
        pullRequestCreated: process.env.AUTO_CREATE_PR === 'true'
      };
    } catch (error) {
      console.error('Erro ao criar componente:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza um componente existente
   * @param {string} componentId - ID do componente a ser atualizado
   * @param {Object} updates - Atualizações a serem aplicadas
   * @param {string} userId - ID do usuário atualizando o componente
   * @returns {Promise<Object>} Componente atualizado
   * @throws {Error} Se a atualização falhar
   */
  async updateComponent(componentId, updates, userId) {
    try {
      // Obter componente atual
      const currentComponent = await this.toolManager.executeTool('supabase:query', {
        table: 'frontend_components',
        id: componentId
      });
      
      if (!currentComponent) {
        throw new Error('Componente não encontrado');
      }
      
      // Validar permissões do usuário
      const canUpdate = await this.securityAgent.authorizeAccess(
        userId,
        'frontend',
        componentId,
        'update'
      );
      
      if (!canUpdate) {
        throw new Error('Usuário não tem permissão para atualizar este componente');
      }
      
      // Sanitizar e validar atualizações
      const sanitizedUpdates = this.securityAgent.sanitizeInput(updates, {
        type: 'object',
        properties: {
          description: { type: 'string' },
          props: { type: 'array' },
          figmaNodeId: { type: 'string' },
          dependencies: { type: 'array' },
          code: { type: 'string' }
        }
      });
      
      // Preparar dados para atualização
      const updateData = {
        updated_at: new Date().toISOString(),
        updated_by: userId
      };
      
      if (sanitizedUpdates.description !== undefined) {
        updateData.description = sanitizedUpdates.description;
      }
      
      if (sanitizedUpdates.props !== undefined) {
        updateData.props = sanitizedUpdates.props;
      }
      
      if (sanitizedUpdates.figmaNodeId !== undefined) {
        updateData.figma_node_id = sanitizedUpdates.figmaNodeId;
      }
      
      if (sanitizedUpdates.dependencies !== undefined) {
        updateData.dependencies = sanitizedUpdates.dependencies;
      }
      
      // Incrementar versão do componente
      const currentVersion = currentComponent.version.split('.');
      const newVersion = `${currentVersion[0]}.${parseInt(currentVersion[1]) + 1}.0`;
      updateData.version = newVersion;
      
      // Atualizar código do componente se fornecido
      if (sanitizedUpdates.code) {
        await this.toolManager.executeTool('github:code:update', {
          path: currentComponent.path,
          content: sanitizedUpdates.code,
          message: `chore(components): Update ${currentComponent.name} to version ${newVersion}`,
          branch: `update/component-${currentComponent.name.toLowerCase()}-${newVersion.replace(/\./g, '-')}`,
          createBranch: true
        });
        
        // Gerar novos testes se o código foi atualizado
        const newTestCode = await this.generateComponentTests(
          { ...currentComponent, ...updateData },
          sanitizedUpdates.code
        );
        
        const testPath = currentComponent.path.replace('.jsx', '.test.jsx');
        await this.toolManager.executeTool('github:code:update', {
          path: testPath,
          content: newTestCode,
          message: `test(components): Update tests for ${currentComponent.name}`,
          branch: `update/component-${currentComponent.name.toLowerCase()}-${newVersion.replace(/\./g, '-')}`,
          createBranch: false
        });
        
        // Atualizar documentação do Storybook
        const newDocs = await this.generateComponentDocs(
          { ...currentComponent, ...updateData },
          sanitizedUpdates.code
        );
        
        const storybookPath = currentComponent.path
          .replace('src/components', 'src/stories')
          .replace('.jsx', '.stories.jsx');
        
        await this.toolManager.executeTool('github:code:update', {
          path: storybookPath,
          content: newDocs.storybook,
          message: `docs(storybook): Update stories for ${currentComponent.name}`,
          branch: `update/component-${currentComponent.name.toLowerCase()}-${newVersion.replace(/\./g, '-')}`,
          createBranch: false
        });
        
        // Criar pull request para as alterações
        if (process.env.AUTO_CREATE_PR === 'true') {
          await this.toolManager.executeTool('github:pull:create', {
            title: `Update ${currentComponent.name} component to version ${newVersion}`,
            description: `
# Updated Component: ${currentComponent.name}

${updateData.description || currentComponent.description || ''}

## Changes
${Object.keys(sanitizedUpdates).join(', ')}

## Version
${newVersion}
            `,
            branch: `update/component-${currentComponent.name.toLowerCase()}-${newVersion.replace(/\./g, '-')}`,
            base: 'main'
          });
        }
      }
      
      // Atualizar componente no banco de dados
      const result = await this.toolManager.executeTool('supabase:update', {
        table: 'frontend_components',
        id: componentId,
        data: updateData
      });
      
      if (!result) {
        throw new Error('Falha ao atualizar componente no banco de dados');
      }
      
      // Emitir evento de componente atualizado
      this.toolManager.emit('component:updated', {
        component: result,
        updater: userId,
        changes: this.calculateChanges(currentComponent, result),
        timestamp: new Date().toISOString()
      });
      
      // Atualizar documentação automática se habilitado
      if (this.autoDocumentation) {
        await this.documentAgent.updateComponentDocumentation(componentId);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar componente:', error);
      throw error;
    }
  }
  
  /**
   * Implementa um design do Figma como componente React
   * @param {string} figmaNodeId - ID do nó do Figma
   * @param {Object} options - Opções de implementação
   * @param {string} userId - ID do usuário solicitando a implementação
   * @returns {Promise<Object>} Componente implementado
   * @throws {Error} Se a implementação falhar
   */
  async implementFigmaDesign(figmaNodeId, options, userId) {
    try {
      // Validar permissões do usuário
      const canImplement = await this.securityAgent.authorizeAccess(
        userId,
        'frontend',
        null,
        'create'
      );
      
      if (!canImplement) {
        throw new Error('Usuário não tem permissão para implementar designs');
      }
      
      // Obter dados do design do Figma
      const designData = await this.toolManager.executeTool('figma:components:get', {
        nodeId: figmaNodeId
      });
      
      if (!designData) {
        throw new Error('Design não encontrado no Figma');
      }
      
      // Sanitizar e validar opções
      const sanitizedOptions = this.securityAgent.sanitizeInput(options || {}, {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['atom', 'molecule', 'organism', 'template', 'page'] },
          description: { type: 'string' },
          isStateful: { type: 'boolean' },
          createStorybook: { type: 'boolean' }
        }
      });
      
      // Usar nome do nó do Figma se não for fornecido
      const componentName = sanitizedOptions.name || this.formatComponentName(designData.name);
      const componentType = sanitizedOptions.type || this.inferComponentType(designData);
      
      // Extrair propriedades do design
      const extractedProps = await this.extractPropsFromDesign(designData);
      
      // Criar especificação do componente
      const componentSpec = {
        name: componentName,
        type: componentType,
        description: sanitizedOptions.description || `Implementação do design '${designData.name}' do Figma`,
        props: extractedProps,
        figmaNodeId,
        dependencies: this.inferDependencies(designData, extractedProps)
      };
      
      // Criar o componente
      const component = await this.createComponent(componentSpec, userId);
      
      // Emitir evento de design implementado
      this.toolManager.emit('design:implemented', {
        figmaNodeId,
        component: component.id,
        implementer: userId,
        timestamp: new Date().toISOString()
      });
      
      return component;
    } catch (error) {
      console.error('Erro ao implementar design do Figma:', error);
      throw error;
    }
  }
  
  /**
   * Gera uma página React a partir de um template e dados
   * @param {string} templateId - ID do template a ser usado
   * @param {Object} pageData - Dados para preencher o template
   * @param {string} userId - ID do usuário gerando a página
   * @returns {Promise<Object>} Página gerada
   * @throws {Error} Se a geração falhar
   */
  async generatePage(templateId, pageData, userId) {
    try {
      // Validar permissões do usuário
      const canGenerate = await this.securityAgent.authorizeAccess(
        userId,
        'frontend',
        null,
        'create'
      );
      
      if (!canGenerate) {
        throw new Error('Usuário não tem permissão para gerar páginas');
      }
      
      // Obter template
      const template = await this.toolManager.executeTool('supabase:query', {
        table: 'frontend_components',
        id: templateId
      });
      
      if (!template || template.type !== 'template') {
        throw new Error('Template não encontrado ou inválido');
      }
      
      // Sanitizar e validar dados da página
      const sanitizedPageData = this.securityAgent.sanitizeInput(pageData, {
        type: 'object',
        required: ['name', 'route'],
        properties: {
          name: { type: 'string', minLength: 1 },
          route: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          description: { type: 'string' },
          metadata: { type: 'object' },
          content: { type: 'object' }
        }
      });
      
      // Gerar código da página a partir do template
      const pageCode = await this.applyTemplateWithData(template, sanitizedPageData);
      
      // Salvar página no repositório
      const pagePath = `src/pages/${sanitizedPageData.name}.jsx`;
      
      await this.toolManager.executeTool('github:code:update', {
        path: pagePath,
        content: pageCode,
        message: `feat(pages): Add ${sanitizedPageData.name} page`,
        branch: `feature/page-${sanitizedPageData.name.toLowerCase()}`,
        createBranch: true
      });
      
      // Atualizar arquivo de rotas
      await this.updateRoutes(sanitizedPageData.name, sanitizedPageData.route);
      
      // Registrar página no banco de dados
      const result = await this.toolManager.executeTool('supabase:insert', {
        table: 'frontend_pages',
        data: {
          name: sanitizedPageData.name,
          route: sanitizedPageData.route,
          title: sanitizedPageData.title || sanitizedPageData.name,
          description: sanitizedPageData.description || '',
          template_id: templateId,
          metadata: sanitizedPageData.metadata || {},
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active',
          path: pagePath
        }
      });
      
      if (!result || !result.id) {
        throw new Error('Falha ao registrar página no banco de dados');
      }
      
      // Criar pull request
      if (process.env.AUTO_CREATE_PR === 'true') {
        await this.toolManager.executeTool('github:pull:create', {
          title: `Add ${sanitizedPageData.name} page`,
          description: `
# New Page: ${sanitizedPageData.name}

${sanitizedPageData.description || ''}

## Route
${sanitizedPageData.route}

## Template
Based on template: ${template.name}
          `,
          branch: `feature/page-${sanitizedPageData.name.toLowerCase()}`,
          base: 'main'
        });
      }
      
      // Emitir evento de página criada
      this.toolManager.emit('page:created', {
        page: result,
        creator: userId,
        timestamp: new Date().toISOString()
      });
      
      // Gerar documentação automática se habilitado
      if (this.autoDocumentation) {
        await this.documentAgent.generatePageDocumentation(result.id);
      }
      
      return {
        id: result.id,
        name: sanitizedPageData.name,
        route: sanitizedPageData.route,
        path: pagePath,
        pullRequestCreated: process.env.AUTO_CREATE_PR === 'true'
      };
    } catch (error) {
      console.error('Erro ao gerar página:', error);
      throw error;
    }
  }
  
  /**
   * Executa testes em componentes frontend
   * @param {string|Array} componentIds - ID ou IDs dos componentes a serem testados
   * @param {Object} options - Opções de teste
   * @returns {Promise<Object>} Resultados dos testes
   * @throws {Error} Se a execução dos testes falhar
   */
  async runComponentTests(componentIds, options = {}) {
    try {
      // Normalizar para array
      const ids = Array.isArray(componentIds) ? componentIds : [componentIds];
      
      // Validar opções
      const testOptions = {
        coverage: options.coverage === true,
        updateSnapshots: options.updateSnapshots === true,
        watch: false, // Sempre false para execução automatizada
        ...options
      };
      
      // Construir comando de teste
      let testCommand = this.testFramework === 'jest' ? 'jest' : 'vitest';
      
      // Obter componentes
      const components = [];
      for (const id of ids) {
        const component = await this.toolManager.executeTool('supabase:query', {
          table: 'frontend_components',
          id
        });
        
        if (component) {
          components.push(component);
        }
      }
      
      if (components.length === 0) {
        throw new Error('Nenhum componente válido encontrado para teste');
      }
      
      // Adicionar padrões de teste específicos para cada componente
      const testPatterns = components.map(c => c.path.replace(/\.jsx$/, '.test.jsx').replace(/^src\//, '')).join(' ');
      
      // Adicionar opções ao comando
      if (testOptions.coverage) {
        testCommand += ' --coverage';
      }
      
      if (testOptions.updateSnapshots) {
        testCommand += ' -u';
      }
      
      // Executar testes
      const testResults = await this.toolManager.executeTool('npm:test', {
        command: `${testCommand} ${testPatterns}`
      });
      
      // Processar resultados
      const processedResults = this.processTestResults(testResults, components);
      
      // Emitir evento de testes executados
      this.toolManager.emit('tests:executed', {
        components: ids,
        results: processedResults,
        timestamp: new Date().toISOString()
      });
      
      return processedResults;
    } catch (error) {
      console.error('Erro ao executar testes de componentes:', error);
      throw error;
    }
  }
  
  /**
   * Gera documentação para componentes frontend
   * @param {string|Array} componentIds - ID ou IDs dos componentes
   * @param {Object} options - Opções de documentação
   * @returns {Promise<Object>} Resultados da geração de documentação
   * @throws {Error} Se a geração falhar
   */
  async generateDocumentation(componentIds, options = {}) {
    try {
      // Normalizar para array
      const ids = Array.isArray(componentIds) ? componentIds : [componentIds];
      
      // Validar opções
      const docOptions = {
        format: options.format || 'markdown',
        includeExamples: options.includeExamples !== false,
        includeProps: options.includeProps !== false,
        includeTests: options.includeTests === true,
        outputPath: options.outputPath || 'docs/components',
        ...options
      };
      
      // Obter componentes
      const components = [];
      for (const id of ids) {
        const component = await this.toolManager.executeTool('supabase:query', {
          table: 'frontend_components',
          id
        });
        
        if (component) {
          components.push(component);
        }
      }
      
      if (components.length === 0) {
        throw new Error('Nenhum componente válido encontrado para documentação');
      }
      
      // Gerar documentação para cada componente
      const results = [];
      for (const component of components) {
        // Obter código do componente
        const componentCode = await this.toolManager.executeTool('github:code:get', {
          path: component.path
        });
        
        if (!componentCode) {
          console.warn(`Código não encontrado para o componente ${component.name}`);
          continue;
        }
        
        // Gerar documentação
        const docs = await this.generateComponentDocs(component, componentCode, docOptions);
        
        // Salvar documentação
        const docPath = `${docOptions.outputPath}/${component.name}.${docOptions.format === 'markdown' ? 'md' : 'html'}`;
        
        await this.toolManager.executeTool('github:code:update', {
          path: docPath,
          content: docOptions.format === 'markdown' ? docs.markdown : docs.html,
          message: `docs(components): Update documentation for ${component.name}`,
          branch: 'docs/component-documentation',
          createBranch: true
        });
        
        results.push({
          componentId: component.id,
          componentName: component.name,
          docPath,
          format: docOptions.format
        });
      }
      
      // Criar pull request para documentação
      if (process.env.AUTO_CREATE_PR === 'true' && results.length > 0) {
        await this.toolManager.executeTool('github:pull:create', {
          title: `Update documentation for ${results.length} components`,
          description: `
# Component Documentation Update

Updated documentation for the following components:
${results.map(r => `- ${r.componentName}`).join('\n')}

## Format
${docOptions.format}

## Included
- Props: ${docOptions.includeProps ? 'Yes' : 'No'}
- Examples: ${docOptions.includeExamples ? 'Yes' : 'No'}
- Tests: ${docOptions.includeTests ? 'Yes' : 'No'}
          `,
          branch: 'docs/component-documentation',
          base: 'main'
        });
      }
      
      // Emitir evento de documentação gerada
      this.toolManager.emit('documentation:generated', {
        components: ids,
        results,
        timestamp: new Date().toISOString()
      });
      
      return {
        components: results,
        pullRequestCreated: process.env.AUTO_CREATE_PR === 'true' && results.length > 0
      };
    } catch (error) {
      console.error('Erro ao gerar documentação de componentes:', error);
      throw error;
    }
  }
  
  /**
   * Sincroniza componentes com o design system do Figma
   * @param {string} figmaFileId - ID do arquivo Figma do design system
   * @param {string} userId - ID do usuário solicitando a sincronização
   * @returns {Promise<Object>} Resultados da sincronização
   * @throws {Error} Se a sincronização falhar
   */
  async syncWithDesignSystem(figmaFileId, userId) {
    try {
      // Validar permissões do usuário
      const canSync = await this.securityAgent.authorizeAccess(
        userId,
        'frontend',
        null,
        'update'
      );
      
      if (!canSync) {
        throw new Error('Usuário não tem permissão para sincronizar com o design system');
      }
      
      // Obter componentes do design system do Figma
      const designSystemComponents = await this.toolManager.executeTool('figma:components:get', {
        fileId: figmaFileId,
        includeStyles: true
      });
      
      if (!designSystemComponents || !designSystemComponents.components) {
        throw new Error('Falha ao obter componentes do design system do Figma');
      }
      
      // Obter estilos do design system
      const designSystemStyles = await this.toolManager.executeTool('figma:styles:get', {
        fileId: figmaFileId
      });
      
      // Obter componentes existentes no sistema
      const existingComponents = await this.toolManager.executeTool('supabase:query', {
        table: 'frontend_components',
        filters: {
          status: 'active'
        }
      });
      
      // Mapear componentes por ID do Figma
      const componentsByFigmaId = {};
      for (const component of existingComponents) {
        if (component.figma_node_id) {
          componentsByFigmaId[component.figma_node_id] = component;
        }
      }
      
      // Resultados da sincronização
      const syncResults = {
        updated: [],
        created: [],
        unchanged: [],
        failed: []
      };
      
      // Processar cada componente do design system
      for (const dsComponent of designSystemComponents.components) {
        try {
          // Verificar se o componente já existe
          if (componentsByFigmaId[dsComponent.id]) {
            // Componente existe, verificar se precisa de atualização
            const existingComponent = componentsByFigmaId[dsComponent.id];
            
            // Verificar se o componente foi modificado no Figma desde a última sincronização
            if (dsComponent.lastModified > existingComponent.updated_at) {
              // Componente foi modificado, atualizar
              const extractedProps = await this.extractPropsFromDesign(dsComponent);
              
              // Atualizar componente
              await this.updateComponent(existingComponent.id, {
                description: dsComponent.description || existingComponent.description,
                props: extractedProps,
                figmaNodeId: dsComponent.id
              }, userId);
              
              syncResults.updated.push({
                id: existingComponent.id,
                name: existingComponent.name,
                figmaNodeId: dsComponent.id
              });
            } else {
              // Componente não foi modificado
              syncResults.unchanged.push({
                id: existingComponent.id,
                name: existingComponent.name,
                figmaNodeId: dsComponent.id
              });
            }
          } else {
            // Componente não existe, criar novo
            const componentName = this.formatComponentName(dsComponent.name);
            const componentType = this.inferComponentType(dsComponent);
            const extractedProps = await this.extractPropsFromDesign(dsComponent);
            
            // Criar especificação do componente
            const componentSpec = {
              name: componentName,
              type: componentType,
              description: dsComponent.description || `Componente do design system: ${dsComponent.name}`,
              props: extractedProps,
              figmaNodeId: dsComponent.id,
              dependencies: this.inferDependencies(dsComponent, extractedProps)
            };
            
            // Criar o componente
            const newComponent = await this.createComponent(componentSpec, userId);
            
            syncResults.created.push({
              id: newComponent.id,
              name: newComponent.name,
              figmaNodeId: dsComponent.id
            });
          }
        } catch (error) {
          console.error(`Erro ao sincronizar componente ${dsComponent.name}:`, error);
          syncResults.failed.push({
            name: dsComponent.name,
            figmaNodeId: dsComponent.id,
            error: error.message
          });
        }
      }
      
      // Sincronizar estilos do design system
      if (designSystemStyles && designSystemStyles.styles) {
        await this.syncDesignSystemStyles(designSystemStyles.styles, userId);
      }
      
      // Emitir evento de sincronização concluída
      this.toolManager.emit('design_system:synced', {
        figmaFileId,
        results: syncResults,
        syncer: userId,
        timestamp: new Date().toISOString()
      });
      
      return syncResults;
    } catch (error) {
      console.error('Erro ao sincronizar com design system:', error);
      throw error;
    }
  }
  
  /**
   * Gera código de um componente React
   * @private
   * @param {Object} componentSpec - Especificações do componente
   * @param {Object} designData - Dados de design do Figma (opcional)
   * @returns {Promise<string>} Código do componente
   */
  async generateComponentCode(componentSpec, designData) {
    // Implementação para gerar código de componente React
    const componentName = `${this.componentPrefix}${componentSpec.name}`;
    const isStateful = componentSpec.props && componentSpec.props.some(p => p.stateful);
    
    // Determinar imports necessários
    const imports = ['import React'];
    if (isStateful) {
      imports[0] += ', { useState, useEffect }';
    }
    imports.push('from "react";');
    
    // Adicionar imports de dependências
    if (componentSpec.dependencies && componentSpec.dependencies.length > 0) {
      for (const dep of componentSpec.dependencies) {
        if (dep.type === 'component') {
          imports.push(`import ${dep.name} from "${dep.path}";`);
        } else if (dep.type === 'library') {
          imports.push(`import ${dep.import} from "${dep.name}";`);
        }
      }
    }
    
    // Gerar props do componente
    const propsDefinition = componentSpec.props && componentSpec.props.length > 0
      ? `{${componentSpec.props.map(p => ` ${p.name}`).join(',')}${componentSpec.props.length > 0 ? ' ' : ''}}`
      : 'props';
    
    // Gerar estado inicial se for componente stateful
    let stateCode = '';
    if (isStateful) {
      const statefulProps = componentSpec.props.filter(p => p.stateful);
      for (const prop of statefulProps) {
        const defaultValue = prop.defaultValue !== undefined 
          ? JSON.stringify(prop.defaultValue) 
          : prop.type === 'string' 
            ? '""' 
            : prop.type === 'boolean' 
              ? 'false' 
              : prop.type === 'array' 
                ? '[]' 
                : prop.type === 'object' 
                  ? '{}' 
                  : 'null';
        
        stateCode += `  const [${prop.name}, set${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}] = useState(${prop.name} || ${defaultValue});\n`;
      }
      
      if (stateCode) {
        stateCode += '\n';
      }
    }
    
    // Gerar JSDoc para o componente
    const jsDoc = [
      '/**',
      ` * ${componentName} - ${componentSpec.description || 'Componente React'}`,
      ' *',
    ];
    
    if (componentSpec.props && componentSpec.props.length > 0) {
      jsDoc.push(' * @param {Object} props - Propriedades do componente');
      for (const prop of componentSpec.props) {
        jsDoc.push(` * @param {${prop.type || 'any'}} props.${prop.name} - ${prop.description || ''}`);
      }
    } else {
      jsDoc.push(' * @param {Object} props - Propriedades do componente');
    }
    
    jsDoc.push(' * @returns {JSX.Element} Elemento React');
    jsDoc.push(' */');
    
    // Gerar corpo do componente
    let componentBody = '';
    
    if (designData && this.cssFramework === 'tailwind') {
      // Extrair classes Tailwind do design
      componentBody = this.extractTailwindFromDesign(designData, componentSpec);
    } else {
      // Componente básico
      componentBody = `  return (\n    <div className="${componentName.toLowerCase()}">\n      {/* Conteúdo do componente ${componentName} */}\n    </div>\n  );`;
    }
    
    // Montar código completo do componente
    const componentCode = `${imports.join('\n')}\n\n${jsDoc.join('\n')}\nconst ${componentName} = (${propsDefinition}) => {\n${stateCode}${componentBody}\n};\n\nexport default ${componentName};\n`;
    
    return componentCode;
  }
  
  /**
   * Gera testes para um componente React
   * @private
   * @param {Object} componentSpec - Especificações do componente
   * @param {string} componentCode - Código do componente
   * @returns {Promise<string>} Código dos testes
   */
  async generateComponentTests(componentSpec, componentCode) {
    const componentName = `${this.componentPrefix}${componentSpec.name}`;
    
    // Determinar framework de testes
    const isJest = this.testFramework === 'jest';
    
    // Gerar imports para testes
    const imports = [
      `import React from "react";`,
      isJest 
        ? `import { render, screen${componentSpec.props && componentSpec.props.some(p => p.stateful) ? ', fireEvent' : ''} } from "@testing-library/react";`
        : `import { describe, it, expect } from "vitest";`,
      !isJest ? `import { render, screen${componentSpec.props && componentSpec.props.some(p => p.stateful) ? ', fireEvent' : ''} } from "@testing-library/react";` : '',
      `import ${componentName} from "./${componentName}";`
    ].filter(Boolean);
    
    // Gerar suites de teste
    let testSuites = '';
    
    if (isJest) {
      testSuites = `
describe("${componentName}", () => {
  it("renders without crashing", () => {
    render(<${componentName} />);
    // Verificar se o componente foi renderizado
    const element = screen.getByTestId("${componentName.toLowerCase()}") || document.querySelector(".${componentName.toLowerCase()}");
    expect(element).toBeInTheDocument();
  });
`;
    } else {
      testSuites = `
describe("${componentName}", () => {
  it("renders without crashing", () => {
    render(<${componentName} />);
    // Verificar se o componente foi renderizado
    const element = screen.getByTestId("${componentName.toLowerCase()}") || document.querySelector(".${componentName.toLowerCase()}");
    expect(element).toBeDefined();
  });
`;
    }
    
    // Adicionar testes para props
    if (componentSpec.props && componentSpec.props.length > 0) {
      for (const prop of componentSpec.props) {
        if (prop.type === 'string') {
          testSuites += `
  it("displays the ${prop.name} prop correctly", () => {
    const test${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)} = "Test ${prop.name}";
    render(<${componentName} ${prop.name}={test${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}} />);
    expect(screen.getByText(test${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)})).toBeInTheDocument();
  });
`;
        } else if (prop.type === 'function' && prop.name.startsWith('on')) {
          testSuites += `
  it("calls the ${prop.name} callback when triggered", () => {
    const mock${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)} = ${isJest ? 'jest.fn()' : 'vi.fn()'};
    render(<${componentName} ${prop.name}={mock${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}} />);
    // Nota: Este teste precisa ser ajustado para o evento específico
    // fireEvent.click(screen.getByTestId("${componentName.toLowerCase()}"));
    // expect(mock${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}).toHaveBeenCalled();
  });
`;
        }
      }
    }
    
    // Fechar a suite de testes
    testSuites += '});\n';
    
    // Montar código completo dos testes
    return `${imports.join('\n')}\n${testSuites}`;
  }
  
  /**
   * Gera documentação para um componente
   * @private
   * @param {Object} componentSpec - Especificações do componente
   * @param {string} componentCode - Código do componente
   * @param {Object} options - Opções de documentação
   * @returns {Promise<Object>} Documentação gerada em diferentes formatos
   */
  async generateComponentDocs(componentSpec, componentCode, options = {}) {
    const componentName = `${this.componentPrefix}${componentSpec.name}`;
    
    // Gerar documentação em Markdown
    const markdownDocs = [
      `# ${componentName}`,
      '',
      componentSpec.description || `Componente React ${componentSpec.type || ''}`,
      '',
      '## Importação',
      '',
      '```jsx',
      `import ${componentName} from "components/${this.getComponentDirectory(componentSpec.type)}/${componentName}";`,
      '```',
      '',
    ];
    
    // Adicionar seção de props
    if (componentSpec.props && componentSpec.props.length > 0) {
      markdownDocs.push('## Props');
      markdownDocs.push('');
      markdownDocs.push('| Nome | Tipo | Padrão | Descrição |');
      markdownDocs.push('| ---- | ---- | ------ | --------- |');
      
      for (const prop of componentSpec.props) {
        const defaultValue = prop.defaultValue !== undefined 
          ? JSON.stringify(prop.defaultValue) 
          : '-';
        
        markdownDocs.push(`| ${prop.name} | \`${prop.type || 'any'}\` | ${defaultValue} | ${prop.description || ''} |`);
      }
      
      markdownDocs.push('');
    }
    
    // Adicionar exemplos de uso
    markdownDocs.push('## Exemplo de Uso');
    markdownDocs.push('');
    markdownDocs.push('```jsx');
    
    let exampleCode = `import React from "react";\nimport ${componentName} from "components/${this.getComponentDirectory(componentSpec.type)}/${componentName}";\n\nconst Example = () => {\n  return (\n    <${componentName}`;
    
    // Adicionar props de exemplo
    if (componentSpec.props && componentSpec.props.length > 0) {
      for (const prop of componentSpec.props) {
        if (prop.type === 'string') {
          exampleCode += `\n      ${prop.name}="Exemplo de ${prop.name}"`;
        } else if (prop.type === 'number') {
          exampleCode += `\n      ${prop.name}={42}`;
        } else if (prop.type === 'boolean') {
          exampleCode += `\n      ${prop.name}={true}`;
        } else if (prop.type === 'function' && prop.name.startsWith('on')) {
          exampleCode += `\n      ${prop.name}={() => console.log("${prop.name} acionado")}`;
        } else if (prop.type === 'array') {
          exampleCode += `\n      ${prop.name}={[]}`;
        } else if (prop.type === 'object') {
          exampleCode += `\n      ${prop.name}={{}}`;
        }
      }
    }
    
    exampleCode += `\n    />\n  );\n};\n\nexport default Example;`;
    
    markdownDocs.push(exampleCode);
    markdownDocs.push('```');
    markdownDocs.push('');
    
    // Gerar código Storybook
    const storybookCode = this.generateStorybookCode(componentSpec, componentCode);
    
    return {
      markdown: markdownDocs.join('\n'),
      storybook: storybookCode,
      html: this.convertMarkdownToHTML(markdownDocs.join('\n'))
    };
  }
  
  /**
   * Gera código Storybook para um componente
   * @private
   * @param {Object} componentSpec - Especificações do componente
   * @param {string} componentCode - Código do componente
   * @returns {string} Código Storybook
   */
  generateStorybookCode(componentSpec, componentCode) {
    const componentName = `${this.componentPrefix}${componentSpec.name}`;
    
    // Imports para Storybook
    const imports = [
      `import React from "react";`,
      `import ${componentName} from "../../components/${this.getComponentDirectory(componentSpec.type)}/${componentName}";`
    ];
    
    // Definir metadados da história
    const meta = `
export default {
  title: "${this.getComponentDirectory(componentSpec.type).charAt(0).toUpperCase() + this.getComponentDirectory(componentSpec.type).slice(1)}/${componentName}",
  component: ${componentName},
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: \`${componentSpec.description || `Componente React ${componentSpec.type || ''}`}\`
      }
    }
  },
  tags: ["autodocs"],
  argTypes: {`;
    
    // Adicionar argTypes para cada prop
    let argTypes = '';
    if (componentSpec.props && componentSpec.props.length > 0) {
      for (const prop of componentSpec.props) {
        argTypes += `\n    ${prop.name}: {`;
        
        if (prop.description) {
          argTypes += `\n      description: "${prop.description}",`;
        }
        
        if (prop.type) {
          let controlType = 'text';
          
          switch (prop.type) {
            case 'string':
              controlType = 'text';
              break;
            case 'number':
              controlType = 'number';
              break;
            case 'boolean':
              controlType = 'boolean';
              break;
            case 'array':
              controlType = 'object';
              break;
            case 'object':
              controlType = 'object';
              break;
            case 'function':
              controlType = 'function';
              break;
            default:
              controlType = 'text';
          }
          
          argTypes += `\n      control: { type: "${controlType}" },`;
        }
        
        if (prop.defaultValue !== undefined) {
          argTypes += `\n      defaultValue: ${JSON.stringify(prop.defaultValue)},`;
        }
        
        argTypes += '\n    },';
      }
    }
    
    // Fechar metadados
    const metaEnd = `\n  }\n};\n`;
    
    // Criar template
    const template = `
const Template = (args) => <${componentName} {...args} />;
`;
    
    // Criar histórias
    const stories = `
export const Default = Template.bind({});
Default.args = {`;
    
    // Adicionar args padrão para cada prop
    let args = '';
    if (componentSpec.props && componentSpec.props.length > 0) {
      for (const prop of componentSpec.props) {
        if (prop.defaultValue !== undefined) {
          args += `\n  ${prop.name}: ${JSON.stringify(prop.defaultValue)},`;
        } else if (prop.type === 'string') {
          args += `\n  ${prop.name}: "Exemplo de ${prop.name}",`;
        } else if (prop.type === 'number') {
          args += `\n  ${prop.name}: 42,`;
        } else if (prop.type === 'boolean') {
          args += `\n  ${prop.name}: true,`;
        } else if (prop.type === 'function' && prop.name.startsWith('on')) {
          args += `\n  ${prop.name}: () => console.log("${prop.name} acionado"),`;
        }
      }
    }
    
    // Fechar histórias
    const storiesEnd = `\n};\n`;
    
    // Adicionar variantes se aplicável
    let variants = '';
    
    if (componentSpec.props && componentSpec.props.some(p => p.type === 'boolean')) {
      // Criar variante para cada prop booleana
      for (const prop of componentSpec.props.filter(p => p.type === 'boolean')) {
        variants += `
export const With${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)} = Template.bind({});
With${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}.args = {
  ...Default.args,
  ${prop.name}: true
};
`;
      }
    }
    
    // Montar código completo do Storybook
    return `${imports.join('\n')}\n${meta}${argTypes}${metaEnd}${template}${stories}${args}${storiesEnd}${variants}`;
  }
  
  /**
   * Converte Markdown para HTML
   * @private
   * @param {string} markdown - Conteúdo em Markdown
   * @returns {string} Conteúdo em HTML
   */
  convertMarkdownToHTML(markdown) {
    // Implementação simplificada de conversão Markdown para HTML
    // Em um cenário real, usaria uma biblioteca como marked ou remark
    
    let html = markdown
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // Processar tabelas
    const tableRegex = /\| (.*?) \|\n\| [-|]+ \|\n((?:\| .*? \|\n)+)/g;
    html = html.replace(tableRegex, (match, header, rows) => {
      const headerCells = header.split('|').map(cell => cell.trim());
      const tableRows = rows.trim().split('\n');
      
      let tableHTML = '<table><thead><tr>';
      headerCells.forEach(cell => {
        tableHTML += `<th>${cell}</th>`;
      });
      tableHTML += '</tr></thead><tbody>';
      
      tableRows.forEach(row => {
        const cells = row.split('|').map(cell => cell.trim());
        tableHTML += '<tr>';
        cells.forEach(cell => {
          tableHTML += `<td>${cell}</td>`;
        });
        tableHTML += '</tr>';
      });
      
      tableHTML += '</tbody></table>';
      return tableHTML;
    });
    
    // Processar blocos de código
    const codeBlockRegex = /```(.*?)\n([\s\S]*?)```/g;
    html = html.replace(codeBlockRegex, (match, language, code) => {
      return `<pre><code class="language-${language}">${code}</code></pre>`;
    });
    
    return `<div class="markdown-content"><p>${html}</p></div>`;
  }
  
  /**
   * Obtém o diretório apropriado para um tipo de componente
   * @private
   * @param {string} componentType - Tipo do componente
   * @returns {string} Caminho do diretório
   */
  getComponentDirectory(componentType) {
    switch (componentType) {
      case 'atom':
        return 'atoms';
      case 'molecule':
        return 'molecules';
      case 'organism':
        return 'organisms';
      case 'template':
        return 'templates';
      case 'page':
        return 'pages';
      default:
        return 'components';
    }
  }
  
  /**
   * Formata um nome para padrão de componente React
   * @private
   * @param {string} name - Nome original
   * @returns {string} Nome formatado em PascalCase
   */
  formatComponentName(name) {
    // Remover caracteres especiais e espaços
    const cleanName = name.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // Converter para PascalCase
    return cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
  
  /**
   * Infere o tipo de componente com base em suas características
   * @private
   * @param {Object} designData - Dados de design
   * @returns {string} Tipo inferido do componente
   */
  inferComponentType(designData) {
    // Implementação para inferir tipo de componente
    // Baseado em heurísticas como tamanho, complexidade, etc.
    
    if (!designData) {
      return 'atom';
    }
    
    // Verificar se o nome contém indicações
    const name = designData.name.toLowerCase();
    if (name.includes('page') || name.includes('página') || name.includes('screen')) {
      return 'page';
    }
    
    if (name.includes('template') || name.includes('layout')) {
      return 'template';
    }
    
    if (name.includes('section') || name.includes('seção') || name.includes('block')) {
      return 'organism';
    }
    
    if (name.includes('card') || name.includes('form') || name.includes('list')) {
      return 'molecule';
    }
    
    // Verificar complexidade
    if (designData.children && designData.children.length > 10) {
      return 'organism';
    }
    
    if (designData.children && designData.children.length > 3) {
      return 'molecule';
    }
    
    return 'atom';
  }
  
  /**
   * Extrai propriedades de um design do Figma
   * @private
   * @param {Object} designData - Dados de design
   * @returns {Promise<Array>} Propriedades extraídas
   */
  async extractPropsFromDesign(designData) {
    // Implementação para extrair props de um design
    const props = [];
    
    if (!designData) {
      return props;
    }
    
    // Extrair textos como possíveis props
    if (designData.texts) {
      for (const text of designData.texts) {
        const propName = this.formatPropName(text.name || text.characters);
        
        // Evitar duplicatas
        if (!props.some(p => p.name === propName)) {
          props.push({
            name: propName,
            type: 'string',
            description: `Texto para ${text.name || 'elemento'}`,
            defaultValue: text.characters
          });
        }
      }
    }
    
    // Extrair interações como possíveis props de função
    if (designData.interactions) {
      for (const interaction of designData.interactions) {
        const propName = `on${this.formatPropName(interaction.trigger || 'Interaction')}`;
        
        // Evitar duplicatas
        if (!props.some(p => p.name === propName)) {
          props.push({
            name: propName,
            type: 'function',
            description: `Callback para quando o usuário ${interaction.trigger || 'interage'}`
          });
        }
      }
    }
    
    // Extrair variantes como possíveis props booleanas ou de seleção
    if (designData.variantProperties) {
      for (const [property, values] of Object.entries(designData.variantProperties)) {
        const propName = this.formatPropName(property);
        
        if (values.length === 2 && values.includes('true') && values.includes('false')) {
          // Provavelmente uma prop booleana
          props.push({
            name: propName,
            type: 'boolean',
            description: `Define se o componente está em estado ${property}`,
            defaultValue: false
          });
        } else {
          // Prop de seleção
          props.push({
            name: propName,
            type: 'string',
            description: `Define a variante ${property} do componente`,
            defaultValue: values[0],
            options: values
          });
        }
      }
    }
    
    return props;
  }
  
  /**
   * Formata um nome para padrão de propriedade React
   * @private
   * @param {string} name - Nome original
   * @returns {string} Nome formatado em camelCase
   */
  formatPropName(name) {
    // Remover caracteres especiais e espaços
    const cleanName = name.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // Converter para camelCase
    return cleanName.split(' ')
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }
  
  /**
   * Infere dependências necessárias para um componente
   * @private
   * @param {Object} designData - Dados de design
   * @param {Array} props - Propriedades do componente
   * @returns {Array} Dependências inferidas
   */
  inferDependencies(designData, props) {
    const dependencies = [];
    
    // Adicionar dependências básicas com base no framework CSS
    if (this.cssFramework === 'tailwind') {
      // Não precisa de dependências adicionais para Tailwind
    } else if (this.cssFramework === 'material-ui') {
      dependencies.push({
        type: 'library',
        name: '@mui/material',
        import: '{ Box, Typography }'
      });
    } else if (this.cssFramework === 'styled-components') {
      dependencies.push({
        type: 'library',
        name: 'styled-components',
        import: 'styled'
      });
    }
    
    // Inferir dependências com base nas props
    if (props) {
      const hasFormProps = props.some(p => 
        p.name.includes('value') || 
        p.name.includes('onChange') || 
        p.name.includes('onSubmit')
      );
      
      if (hasFormProps && this.cssFramework === 'material-ui') {
        dependencies.push({
          type: 'library',
          name: '@mui/material',
          import: '{ TextField, Button }'
        });
      }
    }
    
    return dependencies;
  }
  
  /**
   * Extrai classes Tailwind de um design do Figma
   * @private
   * @param {Object} designData - Dados de design
   * @param {Object} componentSpec - Especificações do componente
   * @returns {string} Código do componente com classes Tailwind
   */
  extractTailwindFromDesign(designData, componentSpec) {
    // Implementação simplificada para extrair classes Tailwind
    // Em um cenário real, usaria algoritmos mais sofisticados
    
    const componentName = `${this.componentPrefix}${componentSpec.name}`;
    
    // Classes básicas com base no tipo de componente
    let baseClasses = '';
    
    switch (componentSpec.type) {
      case 'atom':
        baseClasses = 'inline-flex items-center';
        break;
      case 'molecule':
        baseClasses = 'flex flex-col gap-2';
        break;
      case 'organism':
        baseClasses = 'flex flex-col gap-4 p-4';
        break;
      case 'template':
        baseClasses = 'grid grid-cols-12 gap-4 p-6';
        break;
      case 'page':
        baseClasses = 'min-h-screen w-full';
        break;
      default:
        baseClasses = 'flex';
    }
    
    // Adicionar classes com base em propriedades de design
    if (designData) {
      if (designData.width && designData.height) {
        baseClasses += ' w-full h-auto';
      }
      
      if (designData.cornerRadius && designData.cornerRadius > 0) {
        baseClasses += ' rounded-md';
      }
      
      if (designData.fills && designData.fills.length > 0) {
        baseClasses += ' bg-white';
      }
      
      if (designData.strokes && designData.strokes.length > 0) {
        baseClasses += ' border border-gray-200';
      }
      
      if (designData.effects && designData.effects.some(e => e.type === 'DROP_SHADOW')) {
        baseClasses += ' shadow-md';
      }
    }
    
    // Gerar conteúdo com base nas props
    let content = '';
    
    if (componentSpec.props) {
      const textProps = componentSpec.props.filter(p => p.type === 'string' && !p.name.startsWith('on'));
      
      if (textProps.length > 0) {
        content = textProps.map(p => `{${p.name}}`).join('\n      ');
      } else {
        content = `{/* Conteúdo do componente ${componentName} */}`;
      }
    } else {
      content = `{/* Conteúdo do componente ${componentName} */}`;
    }
    
    // Gerar código do componente
    return `  return (
    <div className="${baseClasses} ${componentName.toLowerCase()}" data-testid="${componentName.toLowerCase()}">
      ${content}
    </div>
  );`;
  }
  
  /**
   * Aplica um template com dados para gerar uma página
   * @private
   * @param {Object} template - Template a ser usado
   * @param {Object} pageData - Dados para preencher o template
   * @returns {Promise<string>} Código da página gerada
   */
  async applyTemplateWithData(template, pageData) {
    // Obter código do template
    const templateCode = await this.toolManager.executeTool('github:code:get', {
      path: template.path
    });
    
    if (!templateCode) {
      throw new Error('Código do template não encontrado');
    }
    
    // Substituir placeholders no código
    let pageCode = templateCode;
    
    // Substituir nome do componente
    pageCode = pageCode.replace(
      new RegExp(template.name, 'g'),
      this.formatComponentName(pageData.name)
    );
    
    // Substituir título
    if (pageData.title) {
      pageCode = pageCode.replace(
        /<title>.*?<\/title>/,
        `<title>${pageData.title}</title>`
      );
    }
    
    // Substituir descrição
    if (pageData.description) {
      pageCode = pageCode.replace(
        /<meta name="description" content=".*?">/,
        `<meta name="description" content="${pageData.description}">`
      );
    }
    
    // Substituir conteúdo
    if (pageData.content) {
      for (const [key, value] of Object.entries(pageData.content)) {
        pageCode = pageCode.replace(
          new RegExp(`{\\s*${key}\\s*}`, 'g'),
          value
        );
      }
    }
    
    return pageCode;
  }
  
  /**
   * Atualiza o arquivo de rotas com uma nova página
   * @private
   * @param {string} pageName - Nome da página
   * @param {string} route - Rota da página
   * @returns {Promise<void>}
   */
  async updateRoutes(pageName, route) {
    try {
      // Obter arquivo de rotas atual
      const routesPath = 'src/routes.jsx';
      const routesCode = await this.toolManager.executeTool('github:code:get', {
        path: routesPath
      });
      
      if (!routesCode) {
        throw new Error('Arquivo de rotas não encontrado');
      }
      
      // Formatar nome do componente
      const componentName = this.formatComponentName(pageName);
      
      // Verificar se a importação já existe
      const importRegex = new RegExp(`import\\s+${componentName}\\s+from\\s+["']./pages/${pageName}["'];`);
      const routeRegex = new RegExp(`<Route\\s+path=["']${route}["']\\s+element={<${componentName}\\s+/>}\\s*/>`);
      
      if (importRegex.test(routesCode) || routeRegex.test(routesCode)) {
        console.warn(`Rota para ${pageName} já existe no arquivo de rotas`);
        return;
      }
      
      // Adicionar importação
      let updatedCode = routesCode;
      
      // Encontrar o último import
      const lastImportIndex = updatedCode.lastIndexOf('import');
      const lastImportEndIndex = updatedCode.indexOf(';', lastImportIndex) + 1;
      
      updatedCode = 
        updatedCode.substring(0, lastImportEndIndex) + 
        `\nimport ${componentName} from "./pages/${pageName}";` + 
        updatedCode.substring(lastImportEndIndex);
      
      // Adicionar rota
      const routesStartIndex = updatedCode.indexOf('<Routes>');
      const routesEndIndex = updatedCode.indexOf('</Routes>');
      
      if (routesStartIndex === -1 || routesEndIndex === -1) {
        throw new Error('Estrutura de rotas não encontrada no arquivo');
      }
      
      const beforeRoutes = updatedCode.substring(0, routesEndIndex);
      const afterRoutes = updatedCode.substring(routesEndIndex);
      
      updatedCode = 
        beforeRoutes + 
        `\n  <Route path="${route}" element={<${componentName} />} />` + 
        afterRoutes;
      
      // Atualizar arquivo de rotas
      await this.toolManager.executeTool('github:code:update', {
        path: routesPath,
        content: updatedCode,
        message: `feat(routes): Add route for ${pageName} page`,
        branch: `feature/page-${pageName.toLowerCase()}`,
        createBranch: false
      });
    } catch (error) {
      console.error('Erro ao atualizar arquivo de rotas:', error);
      throw error;
    }
  }
  
  /**
   * Sincroniza estilos do design system
   * @private
   * @param {Array} styles - Estilos do design system
   * @param {string} userId - ID do usuário realizando a sincronização
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async syncDesignSystemStyles(styles, userId) {
    try {
      // Implementação para sincronizar estilos do design system
      // Dependendo do framework CSS, isso pode variar
      
      if (this.cssFramework === 'tailwind') {
        // Atualizar arquivo de configuração do Tailwind
        const tailwindConfigPath = 'tailwind.config.js';
        const tailwindConfig = await this.toolManager.executeTool('github:code:get', {
          path: tailwindConfigPath
        });
        
        if (!tailwindConfig) {
          throw new Error('Arquivo de configuração do Tailwind não encontrado');
        }
        
        // Extrair tokens de cores, espaçamento, etc.
        const colorTokens = {};
        const spacingTokens = {};
        const fontTokens = {};
        
        for (const style of styles) {
          if (style.styleType === 'FILL') {
            // Extrair tokens de cor
            if (style.name.startsWith('color/')) {
              const colorName = style.name.replace('color/', '');
              const colorValue = this.rgbToHex(style.value);
              colorTokens[colorName] = colorValue;
            }
          } else if (style.styleType === 'TEXT') {
            // Extrair tokens de tipografia
            if (style.name.startsWith('text/')) {
              const fontName = style.name.replace('text/', '');
              fontTokens[fontName] = {
                fontFamily: style.value.fontFamily,
                fontWeight: style.value.fontWeight,
                fontSize: style.value.fontSize,
                lineHeight: style.value.lineHeight
              };
            }
          } else if (style.styleType === 'EFFECT') {
            // Extrair tokens de sombra
            // Implementação específica para sombras
          }
        }
        
        // Atualizar configuração do Tailwind
        let updatedConfig = tailwindConfig;
        
        // Atualizar cores
        if (Object.keys(colorTokens).length > 0) {
          updatedConfig = this.updateTailwindConfigSection(updatedConfig, 'colors', colorTokens);
        }
        
        // Atualizar tipografia
        if (Object.keys(fontTokens).length > 0) {
          updatedConfig = this.updateTailwindConfigSection(updatedConfig, 'fontFamily', 
            Object.fromEntries(Object.entries(fontTokens).map(([k, v]) => [k, v.fontFamily.split(',')])));
          
          updatedConfig = this.updateTailwindConfigSection(updatedConfig, 'fontSize',
            Object.fromEntries(Object.entries(fontTokens).map(([k, v]) => [k, v.fontSize])));
          
          updatedConfig = this.updateTailwindConfigSection(updatedConfig, 'lineHeight',
            Object.fromEntries(Object.entries(fontTokens).map(([k, v]) => [k, v.lineHeight])));
        }
        
        // Salvar configuração atualizada
        await this.toolManager.executeTool('github:code:update', {
          path: tailwindConfigPath,
          content: updatedConfig,
          message: 'chore(tailwind): Update design tokens from Figma',
          branch: 'update/design-tokens',
          createBranch: true
        });
        
        // Criar pull request
        if (process.env.AUTO_CREATE_PR === 'true') {
          await this.toolManager.executeTool('github:pull:create', {
            title: 'Update design tokens from Figma',
            description: `
# Design Tokens Update

Sincronização automática de tokens de design do Figma.

## Tokens Atualizados
- Cores: ${Object.keys(colorTokens).length}
- Tipografia: ${Object.keys(fontTokens).length}
- Espaçamento: ${Object.keys(spacingTokens).length}
            `,
            branch: 'update/design-tokens',
            base: 'main'
          });
        }
        
        return {
          colors: Object.keys(colorTokens).length,
          typography: Object.keys(fontTokens).length,
          spacing: Object.keys(spacingTokens).length
        };
      } else {
        // Implementação para outros frameworks CSS
        return {};
      }
    } catch (error) {
      console.error('Erro ao sincronizar estilos do design system:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza uma seção da configuração do Tailwind
   * @private
   * @param {string} config - Configuração atual
   * @param {string} section - Nome da seção
   * @param {Object} values - Valores a serem atualizados
   * @returns {string} Configuração atualizada
   */
  updateTailwindConfigSection(config, section, values) {
    // Encontrar a seção na configuração
    const sectionRegex = new RegExp(`${section}:\\s*{[^}]*}`, 'g');
    const sectionMatch = config.match(sectionRegex);
    
    if (!sectionMatch) {
      // Seção não encontrada, adicionar nova seção
      const themeIndex = config.indexOf('theme: {');
      if (themeIndex === -1) {
        // Configuração não tem seção theme
        return config;
      }
      
      const themeEndIndex = config.indexOf('}', themeIndex);
      const beforeThemeEnd = config.substring(0, themeEndIndex);
      const afterThemeEnd = config.substring(themeEndIndex);
      
      return `${beforeThemeEnd},\n    ${section}: ${JSON.stringify(values, null, 6).replace(/"/g, "'").replace(/^{/, '{\n      ').replace(/}$/, '\n    }')}${afterThemeEnd}`;
    }
    
    // Seção encontrada, atualizar valores
    const sectionContent = sectionMatch[0];
    const sectionStart = config.indexOf(sectionContent);
    const sectionEnd = sectionStart + sectionContent.length;
    
    // Extrair valores existentes
    const existingValuesMatch = sectionContent.match(/{([^}]*)}/);
    let existingValues = {};
    
    if (existingValuesMatch) {
      try {
        // Converter string de valores para objeto
        const valuesStr = `{${existingValuesMatch[1]}}`;
        existingValues = eval(`(${valuesStr})`);
      } catch (error) {
        console.warn('Erro ao extrair valores existentes:', error);
      }
    }
    
    // Mesclar valores existentes com novos valores
    const mergedValues = { ...existingValues, ...values };
    
    // Gerar nova seção
    const newSection = `${section}: ${JSON.stringify(mergedValues, null, 6).replace(/"/g, "'").replace(/^{/, '{\n      ').replace(/}$/, '\n    }')}`;
    
    // Substituir seção na configuração
    return config.substring(0, sectionStart) + newSection + config.substring(sectionEnd);
  }
  
  /**
   * Converte valor RGB para hexadecimal
   * @private
   * @param {Object} rgb - Valor RGB
   * @returns {string} Valor hexadecimal
   */
  rgbToHex(rgb) {
    if (!rgb || !rgb.r) {
      return '#000000';
    }
    
    const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
  }
  
  /**
   * Processa resultados de testes
   * @private
   * @param {Object} testResults - Resultados brutos dos testes
   * @param {Array} components - Componentes testados
   * @returns {Object} Resultados processados
   */
  processTestResults(testResults, components) {
    // Implementação para processar resultados de testes
    // Em um cenário real, isso seria mais complexo
    
    const processed = {
      success: testResults.exitCode === 0,
      stats: {
        passed: 0,
        failed: 0,
        total: 0
      },
      components: {}
    };
    
    // Extrair estatísticas básicas
    const statsMatch = testResults.stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/);
    if (statsMatch) {
      processed.stats.passed = parseInt(statsMatch[1], 10);
      processed.stats.failed = parseInt(statsMatch[2], 10);
      processed.stats.total = parseInt(statsMatch[3], 10);
    }
    
    // Processar resultados por componente
    for (const component of components) {
      const componentName = component.name;
      const filePattern = component.path.replace(/^src\//, '').replace(/\.jsx$/, '.test.jsx');
      
      // Verificar se o componente tem resultados
      const componentRegex = new RegExp(`${filePattern}.*?\\n((?:.*?\\n)*?)\\n`);
      const componentMatch = testResults.stdout.match(componentRegex);
      
      if (componentMatch) {
        const componentResults = componentMatch[1];
        const passedTests = (componentResults.match(/✓/g) || []).length;
        const failedTests = (componentResults.match(/✕/g) || []).length;
        
        processed.components[componentName] = {
          passed: passedTests,
          failed: failedTests,
          total: passedTests + failedTests,
          success: failedTests === 0
        };
      } else {
        processed.components[componentName] = {
          passed: 0,
          failed: 0,
          total: 0,
          success: false,
          error: 'Nenhum resultado de teste encontrado'
        };
      }
    }
    
    return processed;
  }
  
  /**
   * Calcula as alterações entre duas versões de um objeto
   * @private
   * @param {Object} oldObj - Objeto antigo
   * @param {Object} newObj - Objeto novo
   * @returns {Object} Alterações detectadas
   */
  calculateChanges(oldObj, newObj) {
    const changes = {};
    
    // Comparar propriedades
    for (const key in newObj) {
      // Ignorar propriedades internas
      if (key.startsWith('_') || key === 'updated_at' || key === 'updated_by') {
        continue;
      }
      
      // Verificar se a propriedade existe no objeto antigo
      if (key in oldObj) {
        // Verificar se o valor mudou
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
          changes[key] = {
            old: oldObj[key],
            new: newObj[key]
          };
        }
      } else {
        // Propriedade nova
        changes[key] = {
          old: null,
          new: newObj[key]
        };
      }
    }
    
    // Verificar propriedades removidas
    for (const key in oldObj) {
      if (!(key in newObj) && !key.startsWith('_')) {
        changes[key] = {
          old: oldObj[key],
          new: null
        };
      }
    }
    
    return changes;
  }
  
  /**
   * Obtém um componente pelo nome
   * @private
   * @param {string} name - Nome do componente
   * @returns {Promise<Object>} Componente encontrado ou null
   */
  async getComponentByName(name) {
    try {
      const fullName = `${this.componentPrefix}${name}`;
      
      const components = await this.toolManager.executeTool('supabase:query', {
        table: 'frontend_components',
        filters: {
          name: fullName,
          status: 'active'
        }
      });
      
      return components && components.length > 0 ? components[0] : null;
    } catch (error) {
      console.error('Erro ao buscar componente por nome:', error);
      return null;
    }
  }
  
  /**
   * Handler para evento de sincronização de design
   * @private
   * @param {Object} event - Evento de sincronização
   */
  async handleDesignSync(event) {
    try {
      console.log('Design sincronizado, atualizando componentes relacionados');
      
      // Implementação para lidar com sincronização de design
      if (event.components && event.components.length > 0) {
        for (const component of event.components) {
          // Verificar se o componente existe no frontend
          const frontendComponent = await this.getComponentByName(component.name);
          
          if (frontendComponent) {
            // Atualizar componente
            await this.updateComponent(frontendComponent.id, {
              figmaNodeId: component.id,
              description: component.description || frontendComponent.description
            }, event.syncer);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de sincronização de design:', error);
    }
  }
  
  /**
   * Handler para evento de criação de protótipo
   * @private
   * @param {Object} event - Evento de criação de protótipo
   */
  async handlePrototypeCreated(event) {
    try {
      console.log('Protótipo criado, iniciando implementação');
      
      // Implementação para lidar com criação de protótipo
      if (event.prototype && event.prototype.figmaNodeId) {
        // Implementar design do Figma
        await this.implementFigmaDesign(event.prototype.figmaNodeId, {
          name: event.prototype.name,
          type: event.prototype.type,
          description: event.prototype.description
        }, event.creator);
      }
    } catch (error) {
      console.error('Erro ao processar evento de criação de protótipo:', error);
    }
  }
  
  /**
   * Handler para evento de atualização de componente
   * @private
   * @param {Object} event - Evento de atualização de componente
   */
  async handleComponentUpdated(event) {
    try {
      console.log('Componente atualizado, verificando dependências');
      
      // Implementação para lidar com atualização de componente
      if (event.component && event.component.id) {
        // Verificar componentes que dependem deste
        const dependentComponents = await this.toolManager.executeTool('supabase:query', {
          table: 'frontend_components',
          filters: {
            status: 'active'
          }
        });
        
        const componentsToUpdate = [];
        
        for (const component of dependentComponents) {
          if (component.dependencies && component.dependencies.some(d => 
            d.type === 'component' && d.name === event.component.name
          )) {
            componentsToUpdate.push(component);
          }
        }
        
        // Atualizar documentação dos componentes dependentes
        if (componentsToUpdate.length > 0 && this.autoDocumentation) {
          for (const component of componentsToUpdate) {
            await this.documentAgent.updateComponentDocumentation(component.id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de atualização de componente:', error);
    }
  }
  
  /**
   * Handler para evento de depreciação de componente
   * @private
   * @param {Object} event - Evento de depreciação de componente
   */
  async handleComponentDeprecated(event) {
    try {
      console.log('Componente depreciado, atualizando dependências');
      
      // Implementação para lidar com depreciação de componente
      if (event.component && event.component.id) {
        // Verificar componentes que dependem deste
        const dependentComponents = await this.toolManager.executeTool('supabase:query', {
          table: 'frontend_components',
          filters: {
            status: 'active'
          }
        });
        
        const componentsToUpdate = [];
        
        for (const component of dependentComponents) {
          if (component.dependencies && component.dependencies.some(d => 
            d.type === 'component' && d.name === event.component.name
          )) {
            componentsToUpdate.push(component);
          }
        }
        
        // Notificar sobre componentes que precisam ser atualizados
        if (componentsToUpdate.length > 0) {
          this.toolManager.emit('components:need_update', {
            deprecatedComponent: event.component.id,
            affectedComponents: componentsToUpdate.map(c => c.id),
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de depreciação de componente:', error);
    }
  }
  
  /**
   * Handler para evento de criação de projeto
   * @private
   * @param {Object} event - Evento de criação de projeto
   */
  async handleProjectCreated(event) {
    try {
      console.log('Projeto criado, configurando frontend');
      
      // Implementação para lidar com criação de projeto
      if (event.project && event.project.id) {
        // Verificar se o projeto tem configurações de frontend
        if (event.project.settings && event.project.settings.frontend) {
          const frontendSettings = event.project.settings.frontend;
          
          // Configurar frontend com base nas configurações do projeto
          if (frontendSettings.createPages) {
            // Criar páginas básicas para o projeto
            const pages = ['Home', 'About', 'Dashboard'];
            
            for (const page of pages) {
              // Obter template padrão
              const templates = await this.toolManager.executeTool('supabase:query', {
                table: 'frontend_components',
                filters: {
                  type: 'template',
                  status: 'active'
                }
              });
              
              if (templates && templates.length > 0) {
                // Usar o primeiro template disponível
                await this.generatePage(templates[0].id, {
                  name: `${event.project.name}${page}`,
                  route: `/${event.project.name.toLowerCase()}/${page.toLowerCase()}`,
                  title: `${event.project.name} - ${page}`,
                  description: `${page} page for ${event.project.name} project`
                }, event.creator);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de criação de projeto:', error);
    }
  }
  
  /**
   * Handler para evento de atualização de projeto
   * @private
   * @param {Object} event - Evento de atualização de projeto
   */
  async handleProjectUpdated(event) {
    // Implementação para lidar com atualização de projeto
    console.log('Projeto atualizado, verificando alterações relevantes para o frontend');
  }
  
  /**
   * Handler para evento de solicitação de documentação
   * @private
   * @param {Object} event - Evento de solicitação de documentação
   */
  async handleDocumentationRequested(event) {
    try {
      console.log('Documentação solicitada, gerando documentação de componentes');
      
      // Implementação para lidar com solicitação de documentação
      if (event.type === 'components' && event.componentIds) {
        await this.generateDocumentation(event.componentIds, event.options || {});
      } else if (event.type === 'all') {
        // Obter todos os componentes ativos
        const components = await this.toolManager.executeTool('supabase:query', {
          table: 'frontend_components',
          filters: {
            status: 'active'
          }
        });
        
        if (components && components.length > 0) {
          await this.generateDocumentation(
            components.map(c => c.id),
            event.options || {}
          );
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de solicitação de documentação:', error);
    }
  }
}

export default FrontendAgent;
