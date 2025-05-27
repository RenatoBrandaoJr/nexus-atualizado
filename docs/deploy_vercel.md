# Deploy do Nexus na Vercel

Este documento descreve como realizar o deploy do sistema Nexus na plataforma Vercel.

## Por que a Vercel?

A Vercel é a plataforma ideal para aplicações Next.js como o Nexus pelas seguintes razões:

- **Criada pelos desenvolvedores do Next.js** - Suporte otimizado e integração perfeita
- **Fácil configuração** - Deploy em poucos minutos sem complicações
- **Previews automáticos** - Cada Pull Request gera um ambiente de preview
- **Escalabilidade** - Escala automaticamente conforme necessário
- **Rede global** - Servidores em todo o mundo para melhor performance
- **Integrações** - Funciona perfeitamente com GitHub, GitLab, etc.

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Repositório do projeto no GitHub, GitLab ou Bitbucket
3. Token da Vercel para CI/CD (opcional, apenas para GitHub Actions)

## Configuração Inicial

### Método 1: Deploy pelo Dashboard da Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "New Project"
3. Importe o repositório do Nexus
4. Configure as variáveis de ambiente necessárias:
   - `NODE_ENV`
   - `TASKMASTER_ENABLED`
   - `TASKMASTER_PATH`
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc.
5. Clique em "Deploy"

A Vercel configurará automaticamente o projeto e realizará o deploy. A partir deste momento, cada push para o repositório desencadeará um novo deploy.

### Método 2: CLI da Vercel

Para deploy via linha de comando:

1. Instale a CLI da Vercel:
   ```bash
   npm install -g vercel
   ```

2. Faça login na sua conta:
   ```bash
   vercel login
   ```

3. No diretório do projeto, execute:
   ```bash
   vercel
   ```

4. Siga as instruções para configurar o projeto

### Método 3: GitHub Actions (CI/CD Avançado)

Este método já está configurado no arquivo `.github/workflows/vercel-deploy.yml`.

Para utilizá-lo:

1. Obtenha um token da Vercel:
   - Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Crie um novo token com permissões de deploy
   
2. Adicione o token como segredo no GitHub:
   - Vá para o repositório no GitHub
   - Acesse "Settings" > "Secrets and variables" > "Actions"
   - Adicione um novo segredo chamado `VERCEL_TOKEN` com o valor do token

3. Faça push para as branches `main` ou `develop`

## Ambientes

A Vercel oferece diferentes ambientes para o seu projeto:

1. **Production**: Deploy da branch `main`
2. **Preview**: Deploy automático para cada Pull Request
3. **Development**: Deploy da branch `develop`

## Variáveis de Ambiente

Configure as variáveis de ambiente para cada ambiente na plataforma da Vercel:

1. Acesse o projeto no dashboard da Vercel
2. Vá para "Settings" > "Environment Variables"
3. Adicione as variáveis necessárias para cada ambiente

Importante: Não esqueça de configurar as variáveis específicas do TaskMaster:
- `TASKMASTER_ENABLED=true`
- `TASKMASTER_PATH=/app` (ou caminho relevante no ambiente da Vercel)
- `TASKMASTER_DEFAULT_STATUS=pending`
- `TASKMASTER_DEFAULT_PRIORITY=medium`
- `TASKMASTER_STATUS_COLUMN_MAP={"pending":"A fazer",...}`

## Domínios Personalizados

Para configurar um domínio personalizado:

1. Acesse o projeto no dashboard da Vercel
2. Vá para "Settings" > "Domains"
3. Adicione seu domínio e siga as instruções

## Monitoramento

A Vercel oferece ferramentas integradas de monitoramento:

1. **Analytics**: Acesse métricas de performance no dashboard
2. **Logs**: Visualize logs de execução em tempo real
3. **Status**: Monitore o status da aplicação

## Solução de Problemas

### Build Falhou

Verifique os logs de build para identificar o problema:

1. Acesse o projeto no dashboard da Vercel
2. Clique no deploy com falha
3. Veja a aba "Build Logs"

Problemas comuns:
- Dependências faltando no `package.json`
- Erros de sintaxe ou linting
- Falha nos testes automatizados

### Problemas com Variáveis de Ambiente

Se a aplicação não funciona corretamente:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme que não há erros de digitação nos nomes das variáveis
3. Valide se os valores estão corretos para o ambiente

### Rollback

Para reverter para uma versão anterior:

1. Acesse o projeto no dashboard da Vercel
2. Vá para a aba "Deployments"
3. Encontre o deploy desejado
4. Clique em "..." e selecione "Promote to Production"

## Recursos Adicionais

- [Documentação oficial da Vercel](https://vercel.com/docs)
- [Guia de deploy do Next.js](https://nextjs.org/docs/deployment)
- [Integrações da Vercel](https://vercel.com/integrations)
