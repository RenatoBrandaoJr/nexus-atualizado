# Guia de Implementação: Como Usar o Template de Automação de Documentação no Windsurf AI

Este guia fornece instruções detalhadas sobre como configurar e utilizar o template de automação de documentação no Windsurf AI, desde a instalação inicial até a execução de fluxos automatizados.

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação do Template](#2-instalação-do-template)
3. [Configuração dos MCPs](#3-configuração-dos-mcps)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Uso dos Agentes](#5-uso-dos-agentes)
6. [Execução de Fluxos Automatizados](#6-execução-de-fluxos-automatizados)
7. [Personalização do Template](#7-personalização-do-template)
8. [Solução de Problemas](#8-solução-de-problemas)

## 1. Pré-requisitos

Antes de começar, certifique-se de que você possui:

- Conta ativa no Windsurf AI
- Acesso aos MCPs necessários (Sequential-Thinking, Supabase, Figma, GitHub, Puppeteer, TaskMaster Claude, Stripe, Browser-Tools, Context7)
- Conhecimento básico de JavaScript e Markdown
- Repositório GitHub para armazenar o código-fonte
- Banco de dados Supabase configurado

## 2. Instalação do Template

### Passo 2.1: Descompactar o Template

1. Descompacte o arquivo `windsurf_template.zip` em uma pasta local
2. Você verá a seguinte estrutura de pastas:

```
windsurf_template/
├── .windsurf/                  # Configurações específicas do Windsurf
│   ├── rules/                  # Regras para os agentes
│   ├── memories/               # Memórias persistentes
│   └── flows/                  # Fluxos de trabalho automatizados
├── src/                        # Código-fonte
│   ├── agents/                 # Implementação dos agentes
│   ├── mcps/                   # Configurações e adaptadores para MCPs
│   ├── utils/                  # Utilitários compartilhados
│   └── config/                 # Configurações do sistema
└── docs/                       # Documentação
```

### Passo 2.2: Importar o Template para o Windsurf AI

1. Abra o Windsurf AI
2. Clique em "Novo Projeto"
3. Selecione "Importar Projeto"
4. Navegue até a pasta onde você descompactou o template
5. Clique em "Importar"

### Passo 2.3: Verificar a Importação

1. Verifique se todas as pastas e arquivos foram importados corretamente
2. Abra o arquivo `docs/README.md` para uma visão geral do template
3. Verifique se os arquivos de regras em `.windsurf/rules/` estão presentes

## 3. Configuração dos MCPs

### Passo 3.1: Acessar Configurações de MCPs

1. No Windsurf AI, clique em "Configurações"
2. Selecione a aba "MCPs"
3. Você verá a lista de MCPs disponíveis

### Passo 3.2: Ativar MCPs Necessários

Ative os seguintes MCPs:

1. **Sequential-Thinking**
   - Clique em "Sequential-Thinking"
   - Ative a ferramenta `sequential_analyze`
   - Clique em "Salvar"

2. **Supabase**
   - Clique em "Supabase"
   - Ative as ferramentas `supabase_query`, `supabase_insert`, `supabase_update`
   - Configure a conexão com seu banco de dados Supabase
   - Clique em "Salvar"

3. **GitHub**
   - Clique em "GitHub"
   - Ative as ferramentas `github_pull`, `github_commit`, `github_commits`
   - Configure a conexão com seu repositório GitHub
   - Clique em "Salvar"

4. **Figma**
   - Clique em "Figma"
   - Ative as ferramentas `figma_get_file`, `figma_export_assets`, `figma_get_components`
   - Configure a conexão com sua conta Figma
   - Clique em "Salvar"

5. **Puppeteer**
   - Clique em "Puppeteer"
   - Ative as ferramentas `puppeteer_screenshot`, `puppeteer_pdf`
   - Clique em "Salvar"

6. **TaskMaster Claude**
   - Clique em "TaskMaster Claude"
   - Ative a ferramenta `taskmaster_generate`
   - Clique em "Salvar"

7. **Stripe** (se necessário para seu SaaS)
   - Clique em "Stripe"
   - Ative as ferramentas necessárias para pagamentos
   - Configure a conexão com sua conta Stripe
   - Clique em "Salvar"

8. **Browser-Tools**
   - Clique em "Browser-Tools"
   - Ative as ferramentas necessárias para automação de navegador
   - Clique em "Salvar"

9. **Context7**
   - Clique em "Context7"
   - Ative as ferramentas `context_store`, `context_retrieve`
   - Clique em "Salvar"

### Passo 3.3: Verificar Ativação de MCPs

1. Volte para a lista de MCPs
2. Verifique se todos os MCPs necessários estão marcados como "Ativo"
3. Verifique se o número total de ferramentas ativas está dentro do limite de 50

## 4. Configuração do Ambiente

### Passo 4.1: Configurar Variáveis de Ambiente

1. No Windsurf AI, clique em "Configurações"
2. Selecione a aba "Ambiente"
3. Configure as seguintes variáveis:

```
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase
GITHUB_TOKEN=seu_token_github
FIGMA_TOKEN=seu_token_figma
STRIPE_SECRET_KEY=sua_chave_stripe (se aplicável)
```

4. Clique em "Salvar"

### Passo 4.2: Criar Tabelas no Supabase

1. Acesse seu painel do Supabase
2. Crie as seguintes tabelas:

- `projects` - Para armazenar informações de projetos
- `repositories` - Para armazenar informações de repositórios
- `document_metadata` - Para armazenar metadados de documentos
- `document_content` - Para armazenar conteúdo de documentos
- `project_members` - Para armazenar membros de projetos
- `project_figma_files` - Para armazenar arquivos Figma associados a projetos

3. Configure as colunas conforme descrito no arquivo `docs/database_schema.md`, que contém a definição completa de todas as tabelas, incluindo colunas, tipos de dados, restrições e exemplos de DDL

4. Opcionalmente, você pode usar os scripts SQL fornecidos em `src/config/database/schema.sql` para criar todas as tabelas automaticamente

### Passo 4.3: Configurar Webhooks do GitHub

1. Acesse seu repositório no GitHub
2. Vá para "Settings" > "Webhooks"
3. Adicione um novo webhook:
   - URL: `https://seu-windsurf-app.com/api/webhooks/github`
   - Eventos: "Push", "Pull Request"
   - Formato: JSON
4. Clique em "Add webhook"

## 5. Uso dos Agentes

### Passo 5.1: Inicializar o Sistema

1. No Windsurf AI, abra o console JavaScript
2. Execute o seguinte código:

```javascript
const orchestratorAgent = require('./src/agents/orchestrator_agent');
const agent = new orchestratorAgent();

// Inicializar o sistema
await agent.initializeSystem({
  environment: 'production',
  configPath: './src/config/default.js'
});
```

### Passo 5.2: Criar um Novo Projeto

1. Execute o seguinte código:

```javascript
// Obter o OrchestratorAgent
const orchestratorAgent = require('./src/agents/orchestrator_agent');
const agent = new orchestratorAgent();

// Executar fluxo de criação de projeto
const result = await agent.executeFlow({
  flowType: 'project_creation',
  params: {
    name: 'Meu Projeto',
    description: 'Descrição do meu projeto',
    ownerId: 'seu_id_de_usuario',
    template: 'default'
  }
});

console.log('Projeto criado:', result);
```

### Passo 5.3: Gerar Documentação Manualmente

1. Execute o seguinte código:

```javascript
// Obter o DocumentAgent
const DocumentAgent = require('./src/agents/document_agent');
const documentAgent = new DocumentAgent();

// Gerar documentação a partir de código-fonte
const result = await documentAgent.generateCodeDocumentation({
  projectId: 'id_do_projeto',
  repositoryId: 'id_do_repositorio',
  branch: 'main',
  options: {
    includeDesignReferences: true,
    generateDiagrams: true,
    format: 'markdown'
  }
});

console.log('Documentação gerada:', result);
```

### Passo 5.4: Atualizar Documentação após Commit

Este processo geralmente é automatizado via webhook, mas você pode executá-lo manualmente:

```javascript
// Obter o DocumentAgent
const DocumentAgent = require('./src/agents/document_agent');
const documentAgent = new DocumentAgent();

// Atualizar documentação após commit
const result = await documentAgent.updateCodeDocumentation({
  projectId: 'id_do_projeto',
  repositoryId: 'id_do_repositorio',
  commitData: {
    id: 'id_do_commit',
    message: 'Mensagem do commit',
    author: 'autor@exemplo.com',
    timestamp: new Date().toISOString()
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

console.log('Documentação atualizada:', result);
```

## 6. Execução de Fluxos Automatizados

### Passo 6.1: Configurar Fluxo de Documentação Automática

1. No Windsurf AI, vá para "Fluxos"
2. Clique em "Novo Fluxo"
3. Selecione "Importar Fluxo"
4. Navegue até `.windsurf/flows/documentation_generation_flow.js`
5. Clique em "Importar"

### Passo 6.2: Configurar Gatilho para o Fluxo

1. No fluxo importado, clique em "Configurar Gatilho"
2. Selecione "Webhook"
3. Configure o caminho do webhook: `/api/webhooks/github`
4. Clique em "Salvar"

### Passo 6.3: Testar o Fluxo

1. Faça um commit em seu repositório GitHub
2. Verifique os logs no Windsurf AI para confirmar que o webhook foi recebido
3. Verifique se o fluxo de documentação foi executado
4. Verifique se a documentação foi gerada/atualizada no Supabase

### Passo 6.4: Visualizar Documentação Gerada

1. No Windsurf AI, vá para "Dados"
2. Selecione a tabela `document_metadata`
3. Encontre o documento gerado
4. Clique em "Ver" para visualizar os metadados
5. Para ver o conteúdo, vá para a tabela `document_content` e encontre o registro correspondente

## 7. Personalização do Template

### Passo 7.1: Personalizar Regras dos Agentes

1. No Windsurf AI, navegue até `.windsurf/rules/`
2. Abra o arquivo de regras que deseja modificar (ex: `document_rules.md`)
3. Faça as alterações necessárias
4. Clique em "Salvar"

### Passo 7.2: Personalizar Implementação dos Agentes

1. Navegue até `src/agents/`
2. Abra o arquivo do agente que deseja modificar (ex: `document_agent.js`)
3. Faça as alterações necessárias
4. Clique em "Salvar"

### Passo 7.3: Adicionar Novo Agente

1. Crie um novo arquivo em `src/agents/` (ex: `my_custom_agent.js`)
2. Implemente o agente seguindo o padrão dos outros agentes
3. Crie um arquivo de regras em `.windsurf/rules/` (ex: `my_custom_rules.md`)
4. Registre o agente no OrchestratorAgent

### Passo 7.4: Personalizar Fluxos

1. Navegue até `.windsurf/flows/`
2. Abra o fluxo que deseja modificar ou crie um novo
3. Faça as alterações necessárias
4. Clique em "Salvar"

## 8. Solução de Problemas

### Problema: Limite de Ferramentas Excedido

Se você encontrar o erro "Cascade limit exceeded (50 tools)":

1. Verifique quais ferramentas estão ativas:

```javascript
const toolManager = require('./src/utils/tool_manager');
console.log(toolManager.getActiveTools());
```

2. Ajuste a prioridade das ferramentas:

```javascript
toolManager.setPriority('tool_name', 'high');
```

3. Crie um preset mais enxuto:

```javascript
toolManager.createPreset('minimal_documentation', [
  'sequential_analyze',
  'supabase_query',
  'github_pull'
]);

// Usar o preset
toolManager.activatePreset('minimal_documentation');
```

### Problema: Falhas de Integração

Se uma integração falhar:

1. Verifique as credenciais no ambiente
2. Verifique se o MCP correspondente está ativo
3. Teste a conexão com o serviço externo

### Problema: Documentação Não Gerada

Se a documentação não for gerada:

1. Verifique os logs do fluxo
2. Verifique se o webhook foi recebido corretamente
3. Verifique se o repositório está configurado corretamente
4. Verifique se as tabelas do Supabase estão configuradas corretamente

## Sequência Recomendada de Uso

Para obter os melhores resultados, siga esta sequência de uso:

1. **Configuração Inicial**
   - Instalar o template
   - Configurar MCPs
   - Configurar ambiente
   - Inicializar o sistema

2. **Configuração de Projeto**
   - Criar projeto
   - Associar repositório GitHub
   - Associar arquivos Figma (se aplicável)
   - Configurar membros do projeto

3. **Configuração de Automação**
   - Configurar fluxo de documentação
   - Configurar webhook do GitHub
   - Testar fluxo com commit manual

4. **Uso Regular**
   - Desenvolver código normalmente
   - Fazer commits no GitHub
   - Verificar documentação gerada automaticamente
   - Exportar documentação quando necessário

5. **Personalização e Expansão**
   - Personalizar regras e agentes conforme necessário
   - Adicionar novos fluxos e agentes
   - Integrar com outros sistemas

## Conclusão

Este guia forneceu instruções passo a passo para configurar e utilizar o template de automação de documentação no Windsurf AI. Seguindo estas etapas, você poderá automatizar a geração e atualização de documentação para seu SaaS de gerenciamento de projetos.

Para mais informações, consulte a documentação completa em `docs/README.md` e o relatório final em `docs/relatorio_final.pdf`.

Se precisar de ajuda adicional, entre em contato com o suporte do Windsurf AI ou consulte a comunidade online.
