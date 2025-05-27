import express from 'express';
import crypto from 'crypto';
import { config } from 'dotenv';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obter o equivalente a __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
config();

const app = express();

// Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Definir o secret para validação das requisições
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'nexus-webhook-secret';

// Função para verificar a assinatura do GitHub
function verificarAssinatura(payload, assinaturaRecebida) {
  const assinaturaCalculada = `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(assinaturaCalculada),
      Buffer.from(assinaturaRecebida)
    );
  } catch (e) {
    return false;
  }
}

// Função para executar o script de migração
function executarMigracao() {
  console.log('Executando script de migração...');
  
  const scriptPath = path.join(__dirname, 'migrate.js');
  
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao executar migração: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Script de migração executado com sucesso:\n${stdout}`);
  });
}

// Rota para verificação de saúde do servidor
app.get('/', (req, res) => {
  console.log('Recebida requisição GET na rota /');
  res.status(200).send('Servidor de webhook funcionando');
});

// Rota de ping simples para verificar se o servidor está respondendo
app.get('/ping', (req, res) => {
  console.log('Recebido ping');
  res.status(200).send('pong');
});

// Rota para receber webhooks do GitHub
app.post('/api/webhooks/github', (req, res) => {
  console.log('Recebida requisição POST na rota /api/webhooks/github');
  console.log('Headers:', JSON.stringify(req.headers));
  
  const githubEvent = req.headers['x-github-event'];
  const assinaturaRecebida = req.headers['x-hub-signature-256'];
  
  // Para ping inicial, não precisamos verificar a assinatura
  if (githubEvent === 'ping') {
    console.log('Recebido evento ping do GitHub');
    return res.status(200).send('Webhook recebido com sucesso');
  }
  
  // Converter o corpo para string JSON
  const payload = JSON.stringify(req.body);
  console.log('Payload:', payload.substring(0, 100) + '...');
  
  // Verificar se a assinatura está presente
  if (!assinaturaRecebida) {
    console.log('Requisição sem assinatura');
    return res.status(200).send('Webhook recebido (sem assinatura)');
  }
  
  // Verificar se a assinatura é válida - desativado para teste inicial
  // if (!verificarAssinatura(payload, assinaturaRecebida)) {
  //   console.log('Assinatura inválida');
  //   return res.status(200).send('Webhook recebido (assinatura inválida)');
  // }
  
  console.log(`Recebido evento do GitHub: ${githubEvent}`);
  
  // Processar diferentes tipos de eventos
  if (githubEvent === 'push') {
    const ref = req.body.ref;
    console.log(`Push recebido na referência: ${ref}`);
    
    // Verificar se o push foi para a branch principal
    if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
      console.log('Push na branch principal detectado');
      
      // Verificar se há alterações no schema de banco de dados
      const alteracoesDB = req.body.commits.some(commit => {
        return commit.modified.some(file => file.includes('schema.sql')) ||
               commit.added.some(file => file.includes('schema.sql'));
      });
      
      if (alteracoesDB) {
        console.log('Alterações no schema de banco de dados detectadas');
        executarMigracao();
      } else {
        console.log('Sem alterações no schema de banco de dados');
      }
    }
  } else if (githubEvent === 'pull_request') {
    const action = req.body.action;
    const prNumber = req.body.number;
    console.log(`Pull request #${prNumber} ${action}`);
    
    // Aqui você pode adicionar lógica específica para pull requests
  }
  
  // Responder com sucesso
  res.status(200).send('Webhook processado com sucesso');
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).send('Erro interno do servidor');
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Servidor de webhook rodando na porta ${PORT}`);
  console.log(`URL para configurar no GitHub: http://seu-servidor.com:${PORT}/api/webhooks/github`);
  console.log(`Não esqueça de configurar o secret: ${WEBHOOK_SECRET}`);
});

// Configurar tratamento adequado de erros
server.on('error', (error) => {
  console.error('Erro no servidor HTTP:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejeição não tratada:', reason);
});
