// scripts/test-security-agent.js

/**
 * Script para testar o SecurityAgent
 */

import SecurityAgent from '../src/agents/security_agent.js';

// Função principal assíncrona para testes
async function main() {
  console.log('Inicializando SecurityAgent...');
  
  try {
    // Instanciar o agente de segurança
    const agent = new SecurityAgent({
      mfaEnabled: false,
      sessionTimeout: 1800
    });
    
    console.log('SecurityAgent inicializado com sucesso!');
    
    // Testar autenticação de usuário
    console.log('\n--- Teste de Autenticação ---');
    try {
      const authResult = await agent.authenticateUser({
        email: 'usuario@exemplo.com',
        password: 'senha_segura',
        ip: '192.168.1.1'
      });
      console.log('Autenticação bem-sucedida:', authResult);
    } catch (error) {
      console.error('Erro na autenticação:', error.message);
    }
    
    // Testar autenticação com credenciais inválidas
    console.log('\n--- Teste de Autenticação Inválida ---');
    try {
      const authResult = await agent.authenticateUser({
        email: 'usuario@exemplo.com',
        password: 'senha_errada',
        ip: '192.168.1.1'
      });
      console.log('Autenticação bem-sucedida:', authResult);
    } catch (error) {
      console.error('Erro na autenticação:', error.message);
    }
    
    // Testar autorização
    console.log('\n--- Teste de Autorização ---');
    const canAccessDocument = await agent.authorizeAccess(
      'user_123',
      'document',
      'doc_456',
      'read'
    );
    console.log('Acesso ao documento permitido:', canAccessDocument);
    
    // Testar validação de webhook
    console.log('\n--- Teste de Validação de Webhook ---');
    const webhookPayload = { event: 'push', repository: { name: 'nexus-atualizado' } };
    const webhookSignature = 'sha256=invalid-signature';
    const isWebhookValid = agent.validateWebhook(webhookPayload, webhookSignature);
    console.log('Webhook válido:', isWebhookValid);
    
    // Testar sanitização de dados
    console.log('\n--- Teste de Sanitização de Dados ---');
    const inputData = {
      name: '<script>alert("XSS")</script>Nome do Usuário',
      email: 'email@teste.com',
      age: '30',
      isActive: 'true'
    };
    const schema = {
      name: { type: 'string', required: true, maxLength: 50 },
      email: { type: 'email', required: true },
      age: { type: 'number' },
      isActive: { type: 'boolean' }
    };
    const sanitizeResult = agent.sanitizeInput(inputData, schema);
    console.log('Resultado da sanitização:', sanitizeResult);
    
    // Testar geração de relatório
    console.log('\n--- Teste de Geração de Relatório ---');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 dias atrás
    const securityReport = agent.generateSecurityReport(startDate.toISOString(), new Date().toISOString());
    console.log('Relatório de segurança:', JSON.stringify(securityReport, null, 2));
    
    // Testar verificação de configuração de segurança
    console.log('\n--- Teste de Verificação de Configuração ---');
    const configVerification = await agent.verifySecurityConfig({ environment: 'production' });
    console.log('Verificação de configuração:', configVerification);
    
    return agent;
  } catch (error) {
    console.error('Erro ao testar SecurityAgent:', error);
    throw error;
  }
}

// Executar a função principal
console.log('Iniciando testes do SecurityAgent...');
const agentPromise = main();

// Exportar a promessa para acesso no console interativo
globalThis.agentPromise = agentPromise;
