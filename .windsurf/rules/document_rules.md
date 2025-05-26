# Regras para DocumentAgent

## Propósito
O DocumentAgent é responsável por gerenciar a criação, atualização e organização de documentação no sistema de SaaS de gerenciamento de projetos. Ele automatiza a geração de documentação a partir de código-fonte, designs e outros artefatos do projeto, garantindo que a documentação esteja sempre atualizada e acessível.

## Comportamento

1. **Geração de Documentação**
   - Deve gerar documentação a partir de código-fonte e comentários
   - Deve integrar referências a designs do Figma quando relevante
   - Deve estruturar a documentação de forma clara e navegável
   - Deve gerar diagramas quando apropriado para ilustrar conceitos

2. **Formatação e Estruturação**
   - Deve formatar documentação em Markdown por padrão
   - Deve suportar exportação para PDF e outros formatos
   - Deve manter consistência de estilo em todos os documentos
   - Deve incluir metadados para facilitar busca e organização

3. **Versionamento**
   - Deve manter histórico de versões de documentos
   - Deve rastrear mudanças entre versões
   - Deve permitir comparação de versões
   - Deve associar versões de documentação a commits de código

4. **Validação de Conteúdo**
   - Deve validar a qualidade do conteúdo gerado
   - Deve verificar links e referências
   - Deve garantir completude da documentação
   - Deve identificar seções que precisam de atualização

## Integrações

O DocumentAgent integra-se com os seguintes agentes:

- **OrchestratorAgent**: Para coordenação de fluxos de documentação
- **GitHubIntegrationAgent**: Para obter código-fonte e metadados
- **FigmaIntegrationAgent**: Para obter designs e assets visuais
- **AIAssistantAgent**: Para análise de código e geração de conteúdo
- **NotificationAgent**: Para notificar sobre atualizações de documentação

## Ferramentas MCP

O DocumentAgent utiliza as seguintes ferramentas MCP:

- **Sequential-Thinking**: `sequential_analyze` para análise estruturada
- **TaskMaster Claude**: `taskmaster_generate` para geração de conteúdo
- **Supabase**: `supabase_query`, `supabase_insert`, `supabase_update` para persistência
- **GitHub**: `github_pull` para obter código-fonte
- **Figma**: `figma_get_file`, `figma_export_assets` para obter designs
- **Puppeteer**: `puppeteer_screenshot`, `puppeteer_pdf` para captura e exportação

## Exemplos de Uso

### Geração de Documentação a partir de Código

```javascript
// Gerar documentação a partir de código-fonte
const result = await DocumentAgent.generateCodeDocumentation({
  projectId: 'project123',
  repositoryId: 'repo456',
  branch: 'main',
  options: {
    includeDesignReferences: true,
    generateDiagrams: true,
    format: 'markdown'
  }
});
```

### Atualização de Documentação após Commit

```javascript
// Atualizar documentação após commit
const result = await DocumentAgent.updateCodeDocumentation({
  projectId: 'project123',
  repositoryId: 'repo456',
  commitData: {
    id: 'abc123',
    message: 'Implementa nova funcionalidade',
    author: 'dev@example.com',
    timestamp: '2025-05-26T12:00:00Z'
  },
  codeFiles: [
    {
      path: 'src/feature.js',
      status: 'modified',
      additions: 25,
      deletions: 10
    }
  ],
  config: {
    format: 'markdown',
    sections: ['overview', 'api', 'examples']
  }
});
```

### Exportação de Documentação para PDF

```javascript
// Exportar documentação para PDF
const result = await DocumentAgent.exportDocumentation({
  documentId: 'doc123',
  format: 'pdf',
  options: {
    includeTableOfContents: true,
    includeFooter: true,
    paperSize: 'A4'
  }
});
```

## Limitações

- Geração de diagramas complexos pode requerer intervenção manual
- Análise de código em linguagens menos comuns pode ser limitada
- Exportação para formatos além de Markdown e PDF pode requerer configuração adicional
- Integração com sistemas de controle de versão além do GitHub requer adaptação

## Melhores Práticas

1. Estruture a documentação em seções lógicas e consistentes
2. Inclua exemplos de código para ilustrar conceitos
3. Utilize diagramas para explicar fluxos e arquiteturas
4. Mantenha metadados ricos para facilitar busca e organização
5. Implemente validação de qualidade antes de publicar documentação
