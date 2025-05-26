# Fluxo de Documentação Automática

Este fluxo gerencia a geração automática de documentação a partir de código-fonte e outros artefatos do projeto.

```javascript
// .windsurf/flows/documentation_generation_flow.js

/**
 * Fluxo de Geração de Documentação Automática
 * 
 * Este fluxo gerencia a geração automática de documentação a partir de código-fonte
 * e outros artefatos do projeto, integrando múltiplos agentes e MCPs.
 */
const documentationGenerationFlow = {
  /**
   * Executa o fluxo de geração de documentação
   */
  async execute({ orchestrator, params, context }) {
    const logger = require('../../src/utils/logger')('DocumentationFlow');
    logger.info('Iniciando fluxo de geração de documentação', { params });
    
    try {
      // Obter agentes necessários
      const documentAgent = orchestrator.getAgent('DocumentAgent');
      const githubIntegrationAgent = orchestrator.getAgent('GitHubIntegrationAgent');
      const figmaIntegrationAgent = orchestrator.getAgent('FigmaIntegrationAgent');
      const aiAssistantAgent = orchestrator.getAgent('AIAssistantAgent');
      const notificationAgent = orchestrator.getAgent('NotificationAgent');
      
      // Ativar contexto de documentação
      await orchestrator.activateContext('documentation');
      
      // Etapa 1: Notificação de commit de código
      logger.info('Etapa 1: Processando notificação de commit');
      const { projectId, repositoryId, commitData } = params;
      
      // Etapa 2: Obter detalhes do código
      logger.info('Etapa 2: Obtendo detalhes do código');
      const codeDetails = await githubIntegrationAgent.getCodeDetails({
        repositoryId,
        commitId: commitData.id,
        files: commitData.codeFiles.map(file => file.path)
      });
      
      // Etapa 3: Obter designs relacionados (se disponíveis)
      logger.info('Etapa 3: Obtendo designs relacionados');
      let designAssets = { assets: [] };
      
      try {
        // Verificar se há arquivos Figma associados ao projeto
        const figmaFiles = await orchestrator.withContext(['figma'], async () => {
          return await figmaIntegrationAgent.getProjectFigmaFiles({ projectId });
        });
        
        if (figmaFiles && figmaFiles.length > 0) {
          // Obter assets de design
          designAssets = await figmaIntegrationAgent.getDesignAssets({
            projectId,
            figmaFiles: figmaFiles.map(file => file.figma_file_id),
            filter: {
              updatedSince: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
            }
          });
        }
      } catch (error) {
        logger.warn('Erro ao obter assets de design, continuando sem eles', { error });
        // Continuar sem assets de design
      }
      
      // Etapa 4: Analisar código e gerar documentação
      logger.info('Etapa 4: Analisando código e gerando documentação');
      const documentationResult = await orchestrator.withContext(['ai'], async () => {
        return await aiAssistantAgent.analyzeAndGenerateDocumentation({
          context: {
            codeFiles: codeDetails.files,
            designAssets: designAssets.assets,
            commitHistory: codeDetails.commitHistory,
            documentationConfig: params.config || {}
          },
          options: {
            format: params.config?.format || 'markdown',
            sections: params.config?.sections || ['overview', 'architecture', 'api', 'examples'],
            detailLevel: params.config?.detailLevel || 'standard',
            includeDesignReferences: designAssets.assets.length > 0,
            includeCodeExamples: true,
            generateDiagrams: params.config?.generateDiagrams || false
          }
        });
      });
      
      // Etapa 5: Formatar e estruturar documentação
      logger.info('Etapa 5: Formatando e estruturando documentação');
      const formattedDoc = await documentAgent.formatAndStructureDocumentation(
        projectId,
        documentationResult,
        commitData
      );
      
      // Etapa 6: Notificar atualização de documentação
      logger.info('Etapa 6: Notificando atualização de documentação');
      await notificationAgent.notifyDocumentationUpdate({
        projectId,
        documentId: formattedDoc.documentId,
        isUpdate: formattedDoc.isUpdate,
        commitData
      });
      
      logger.info('Fluxo de documentação concluído com sucesso', {
        documentId: formattedDoc.documentId,
        version: formattedDoc.version
      });
      
      return {
        success: true,
        documentId: formattedDoc.documentId,
        version: formattedDoc.version,
        isUpdate: formattedDoc.isUpdate
      };
    } catch (error) {
      logger.error('Erro no fluxo de documentação', { error });
      throw error;
    } finally {
      // Desativar contexto de documentação
      await orchestrator.deactivateContext('documentation');
    }
  }
};

module.exports = documentationGenerationFlow;
```
