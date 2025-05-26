# Regras para OrchestratorAgent

## Propósito
O OrchestratorAgent é responsável por coordenar fluxos complexos e gerenciar a comunicação entre agentes no sistema de SaaS de gerenciamento de projetos. Ele atua como o ponto central de orquestração, garantindo que os fluxos de trabalho sejam executados de forma eficiente e dentro dos limites do sistema.

## Comportamento

1. **Coordenação de Fluxos**
   - Deve iniciar e coordenar fluxos multi-agente
   - Deve monitorar o progresso dos fluxos e intervir quando necessário
   - Deve garantir a conclusão bem-sucedida dos fluxos ou lidar com falhas de forma adequada

2. **Gerenciamento de Recursos**
   - Deve gerenciar o limite de ferramentas ativas (máximo de 50)
   - Deve priorizar ferramentas essenciais sobre ferramentas contextuais
   - Deve implementar ativação dinâmica de ferramentas baseada no contexto atual

3. **Tratamento de Erros**
   - Deve implementar estratégias de retry para operações falhas
   - Deve fornecer fallbacks para componentes indisponíveis
   - Deve registrar erros detalhados para diagnóstico

4. **Observabilidade**
   - Deve registrar eventos significativos para auditoria
   - Deve coletar métricas de performance
   - Deve fornecer rastreamento de operações distribuídas

## Integrações

O OrchestratorAgent integra-se com todos os outros agentes do sistema:

- **ProjectManagerAgent**: Para operações relacionadas a projetos
- **DocumentAgent**: Para operações de documentação
- **KanbanAgent**: Para operações de quadro Kanban
- **DashboardAgent**: Para operações de dashboard
- **AIAssistantAgent**: Para análises e recomendações baseadas em IA
- **IntegrationAgents**: Para integrações com serviços externos

## Ferramentas MCP

O OrchestratorAgent utiliza as seguintes ferramentas MCP:

- **Sequential-Thinking**: `sequential_analyze` para análise estruturada
- **Supabase**: `supabase_query`, `supabase_insert`, `supabase_update` para persistência de estado
- **Context7**: `context_store`, `context_retrieve` para gerenciamento de contexto

## Exemplos de Uso

### Inicialização do Sistema

```javascript
// Inicializar o sistema
await OrchestratorAgent.initializeSystem({
  environment: 'production',
  configPath: '/path/to/config.json'
});
```

### Execução de Fluxo Multi-Agente

```javascript
// Executar fluxo de criação de projeto
const result = await OrchestratorAgent.executeFlow({
  flowType: 'project_creation',
  params: {
    name: 'Novo Projeto',
    description: 'Descrição do projeto',
    ownerId: 'user123',
    template: 'default'
  }
});
```

### Gerenciamento de Ferramentas

```javascript
// Ativar contexto específico
await OrchestratorAgent.activateContext('documentation');

// Executar operação no contexto
const result = await OrchestratorAgent.withContext(['documentation'], async () => {
  return await DocumentAgent.generateDocumentation({
    projectId: 'project123',
    template: 'api_docs'
  });
});
```

## Limitações

- Máximo de 50 ferramentas ativas simultaneamente
- Operações de longa duração podem ser interrompidas por timeout
- Dependências circulares entre agentes devem ser evitadas

## Melhores Práticas

1. Utilize o padrão mediador para comunicação entre agentes
2. Implemente idempotência para operações críticas
3. Utilize transações distribuídas para operações multi-agente
4. Mantenha estado mínimo no orquestrador
5. Prefira comunicação assíncrona entre agentes
