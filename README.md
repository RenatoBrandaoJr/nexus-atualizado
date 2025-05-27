# Nexus

Sistema integrado de gerenciamento de projetos e tarefas com TaskMaster.

## Visão Geral

O Nexus é uma plataforma que integra diversos agentes para facilitar o gerenciamento de projetos, tarefas, documentação e comunicação. A integração com o TaskMaster permite um gerenciamento avançado de tarefas, com suporte para expansão em subtarefas, análise de complexidade e muito mais.

## Requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- Git

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/sua-organizacao/nexus.git
cd nexus
```

2. Execute o script de configuração do ambiente:

```bash
node scripts/setup-environment.js
```

3. Instale as dependências (caso não tenha feito no passo anterior):

```bash
npm install
```

4. Configure as variáveis de ambiente:

```bash
# Copie o arquivo de ambiente de desenvolvimento
cp .env.dev .env
# Edite conforme necessário
nano .env
```

5. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Desenvolvimento

### Estrutura do Projeto

```
/
├── .github/            # Configurações do GitHub (Actions, etc.)
├── docs/               # Documentação
├── public/             # Arquivos estáticos
├── scripts/            # Scripts utilitários
│   └── taskmaster/     # Scripts para integração com TaskMaster
├── src/
│   ├── agents/         # Agentes do sistema
│   ├── api/            # Endpoints da API
│   ├── commands/       # Comandos de terminal
│   ├── components/     # Componentes React
│   ├── services/       # Serviços
│   └── utils/          # Utilitários
└── tasks/              # Tarefas gerenciadas pelo TaskMaster
```

### TaskMaster

Para gerenciar tarefas, você pode usar:

1. **Interface Web**: Acesse `/taskmaster` no navegador
2. **Comandos de Terminal**: Use os comandos iniciados com `tm-`, como `tm-list` ou `tm-show 1`
3. **CLI do TaskMaster**: Execute `npx task-master list` ou outros comandos

Para mais informações, consulte o [Guia de Integração do TaskMaster](docs/integracao_taskmaster_guia.md).

## Deploy

### Pipeline Automatizado

O projeto utiliza GitHub Actions para CI/CD automático. Quando código é enviado para:

- **develop**: Executa testes e build
- **main**: Executa testes, build e deploy para produção

### Deploy Manual

Para realizar um deploy manual:

```bash
# Deploy para desenvolvimento (padrão)
node scripts/deploy.js

# Deploy para teste
node scripts/deploy.js test

# Deploy para produção
node scripts/deploy.js prod
```

Para mais informações, consulte a [documentação de deploy](docs/processo_deploy.md).

## Contribuição

1. Crie um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Envie para o GitHub (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.
