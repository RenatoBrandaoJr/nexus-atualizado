# Processo de Deploy do Nexus

Este documento descreve o processo de deploy do sistema Nexus para diferentes ambientes.

## Índice

1. [Ambientes](#ambientes)
2. [Requisitos](#requisitos)
3. [Pipeline de CI/CD](#pipeline-de-cicd)
4. [Deploy Manual](#deploy-manual)
5. [Monitoramento](#monitoramento)
6. [Rollback](#rollback)

## Ambientes

O Nexus suporta três ambientes de deploy:

- **Desenvolvimento (dev)**: Ambiente local para desenvolvimento e testes iniciais
- **Teste (test)**: Ambiente para testes integrados e validação de funcionalidades
- **Produção (prod)**: Ambiente de produção, acessado pelos usuários finais

Cada ambiente possui sua própria configuração, definida nos arquivos `.env.dev`, `.env.test` e `.env.prod`.

## Requisitos

Para realizar o deploy, você precisará:

- Node.js 18 ou superior
- Git
- Acesso SSH aos servidores de teste e produção (para deploy remoto)
- PM2 instalado nos servidores remotos
- Rsync (para deploy remoto)

## Pipeline de CI/CD

O Nexus utiliza GitHub Actions para automação de CI/CD. O fluxo de trabalho é definido no arquivo `.github/workflows/main.yml` e inclui as seguintes etapas:

1. **Testes**: Execução de testes automatizados e verificação de linting
2. **Build**: Compilação da aplicação
3. **Deploy**: Publicação da aplicação no ambiente apropriado

### Triggers

- **Pull Request para `main` ou `develop`**: Executa apenas os testes
- **Push para `develop`**: Executa testes e build
- **Push para `main`**: Executa testes, build e deploy para produção

## Deploy Manual

Para realizar um deploy manual, utilize o script `scripts/deploy.js`:

```bash
# Deploy para ambiente de desenvolvimento (padrão)
node scripts/deploy.js

# Deploy para ambiente de teste
node scripts/deploy.js test

# Deploy para ambiente de produção
node scripts/deploy.js prod
```

O script realiza as seguintes etapas:

1. Verifica se existem alterações não commitadas no Git
2. Executa os testes automatizados
3. Compila a aplicação
4. Configura as variáveis de ambiente para o ambiente selecionado
5. Para ambientes remotos (test e prod), sincroniza os arquivos via rsync e reinicia o serviço

## Monitoramento

Após o deploy, o sistema pode ser monitorado através:

- **Logs**: Disponíveis em `/var/log/nexus/` nos servidores remotos
- **PM2**: Utilize `pm2 status` e `pm2 logs nexus` para monitorar o processo
- **Endpoints de saúde**: Acesse `/api/health` para verificar o status da aplicação

## Rollback

Em caso de problemas após o deploy, é possível realizar rollback:

1. Identifique a versão anterior estável através das tags do Git
2. Execute o deploy específico para essa versão:

```bash
git checkout v1.2.3
node scripts/deploy.js prod
```

Alternativamente, o PM2 permite reverter para uma versão anterior:

```bash
pm2 revert nexus
```

---

Para mais informações, consulte a documentação completa do projeto ou entre em contato com a equipe de DevOps.
