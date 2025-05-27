/**
 * Servidor HTTP do Nexus
 * 
 * Este arquivo configura e inicia o servidor HTTP do Nexus,
 * registrando as rotas da API e middleware necessários.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import apiRoutes from '../api/api_routes.js';
import { createLogger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NexusServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.logger = createLogger('Server');
    
    // Configurar middleware
    this.configureMiddleware();
    
    // Configurar rotas
    this.configureRoutes();
    
    this.logger.info('Servidor Nexus configurado');
  }
  
  /**
   * Configura o middleware do Express
   */
  configureMiddleware() {
    // Segurança
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors());
    
    // Logging
    this.app.use(morgan('dev'));
    
    // Compressão
    this.app.use(compression());
    
    // Parsing de JSON
    this.app.use(express.json());
    
    // Parsing de URL encoded
    this.app.use(express.urlencoded({ extended: true }));
    
    // Servir arquivos estáticos
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    this.logger.info('Middleware configurado');
  }
  
  /**
   * Configura as rotas do Express
   */
  configureRoutes() {
    // Registrar rotas da API
    this.app.use('/api', apiRoutes.getRouter());
    
    // Rota raiz
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
    
    // Captura de erros 404
    this.app.use((req, res, next) => {
      res.status(404).json({
        error: 'Página não encontrada',
        path: req.originalUrl
      });
    });
    
    // Captura de erros 500
    this.app.use((err, req, res, next) => {
      this.logger.error(`Erro interno: ${err.stack}`);
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro interno' : err.message
      });
    });
    
    this.logger.info('Rotas configuradas');
  }
  
  /**
   * Inicia o servidor
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          this.logger.info(`Servidor Nexus iniciado na porta ${this.port}`);
          resolve(this.server);
        });
      } catch (error) {
        this.logger.error(`Erro ao iniciar servidor: ${error.message}`);
        reject(error);
      }
    });
  }
  
  /**
   * Para o servidor
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            this.logger.error(`Erro ao parar servidor: ${err.message}`);
            reject(err);
          } else {
            this.logger.info('Servidor Nexus parado');
            resolve();
          }
        });
      } else {
        this.logger.warn('Tentativa de parar servidor que não está em execução');
        resolve();
      }
    });
  }
}

// Exportar como singleton
const nexusServer = new NexusServer();
export default nexusServer;
