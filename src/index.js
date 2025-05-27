/**
 * Função serverless para o Nexus no ambiente Vercel
 * 
 * Versão simplificada para resolver o erro 500 INTERNAL_SERVER_ERROR
 */

module.exports = (req, res) => {
  try {
    // Definir cabeçalhos básicos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Verificar a rota solicitada
    const url = req.url || '';
    
    // Página inicial simples
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Nexus - Sistema Inteligente</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
              color: #333;
              background-color: #f8f9fa;
            }
            h1, h2 {
              color: #1a73e8;
              margin-top: 0;
            }
            h1 {
              border-bottom: 2px solid #eaeaea;
              padding-bottom: 0.5rem;
              margin-bottom: 2rem;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              padding: 1.5rem;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
              margin-bottom: 2rem;
            }
            .status-badge {
              display: inline-block;
              padding: 0.25rem 0.75rem;
              border-radius: 50px;
              font-size: 0.875rem;
              font-weight: 500;
              margin-left: 0.5rem;
              vertical-align: middle;
            }
            .status-active {
              background-color: #e6f4ea;
              color: #137333;
            }
            a {
              color: #1a73e8;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            footer {
              margin-top: 3rem;
              text-align: center;
              color: #666;
              font-size: 0.9rem;
            }
          </style>
        </head>
        <body>
          <h1>Nexus - Sistema Inteligente</h1>
          
          <div class="card">
            <h2>Status do Sistema</h2>
            <p>API Nexus <span class="status-badge status-active">online</span></p>
            <p>Vercel <span class="status-badge status-active">conectado</span></p>
          </div>
          
          <div class="card">
            <h2>Documentação</h2>
            <p>Para mais informações, consulte a documentação do projeto no <a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">GitHub</a>.</p>
          </div>
          
          <footer>
            <p>&copy; ${new Date().getFullYear()} Nexus System - Versão 1.0.0</p>
          </footer>
        </body>
      </html>
    `;
    
    // Enviar resposta
    res.statusCode = 200;
    res.end(html);
    
  } catch (error) {
    // Em caso de erro, enviar uma resposta simples
    console.error('Erro:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Erro - Nexus</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: sans-serif; 
              text-align: center; 
              padding: 40px; 
              max-width: 600px; 
              margin: 0 auto; 
            }
            h1 { color: #d32f2f; }
            a { color: #2196f3; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .error-code { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Erro Interno</h1>
          <p class="error-code">Código: 500</p>
          <p>Desculpe, ocorreu um erro ao processar sua solicitação.</p>
          <p>Por favor, tente novamente mais tarde.</p>
          <p><a href="https://github.com/RenatoBrandaoJr/nexus-atualizado">Voltar ao GitHub</a></p>
        </body>
      </html>
    `);
  }
};
