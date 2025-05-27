// scripts/test-environment-override.cjs

/**
 * Script para testar o SecurityAgent com configurações personalizadas
 * que substituem as variáveis de ambiente
 */

const SecurityAgent = require('../src/agents/security_agent');

// Função principal assíncrona para testes
async function main() {
  console.log('Inicializando SecurityAgent com configurações personalizadas...');
  
  // Sobrescrever as variáveis de ambiente diretamente
  process.env.JWT_SECRET = "nexus_jwt_prod_secret_9a2f4e8d7c6b5a3f2e1d8c7b6a5f4e3d2c1b0a9f";
  process.env.WEBHOOK_SECRET = "nexus_webhook_prod_secret_7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a";
  process.env.MFA_ENABLED = "true";
  process.env.SESSION_TIMEOUT = "1800";
  
  try {
    // Instanciar o agente de segurança
    const agent = new SecurityAgent();
    
    console.log('\n--- Verificação de Configuração de Segurança ---');
    const securityConfig = await agent.verifySecurityConfig({ 
      environment: 'production',
      timestamp: new Date().toISOString()
    });
    
    console.log('Resultado da verificação:', securityConfig);
    
    if (securityConfig.valid) {
      console.log('\n✅ Configuração de segurança válida para ambiente de produção!');
    } else {
      console.log('\n❌ Problemas encontrados na configuração de segurança:');
      securityConfig.issues.forEach(issue => console.log(`- ${issue}`));
      
      if (securityConfig.recommendations && securityConfig.recommendations.length > 0) {
        console.log('\nRecomendações:');
        securityConfig.recommendations.forEach(rec => console.log(`- ${rec}`));
      }
    }
    
    return agent;
  } catch (error) {
    console.error('Erro ao testar SecurityAgent:', error);
    throw error;
  }
}

// Executar a função principal
console.log('Iniciando testes do SecurityAgent com configurações personalizadas...');
main().then(result => {
  console.log('\nTestes concluídos com sucesso!');
}).catch(error => {
  console.error('\nFalha nos testes:', error);
});
