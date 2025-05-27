/**
 * Configuração das rotas da API do Nexus
 * 
 * Este arquivo registra todas as rotas da API do sistema Nexus,
 * incluindo a integração com o TaskMaster.
 */

import express from 'express';
import taskMasterAPI from './taskmaster_api.js';
import { createLogger } from '../utils/logger.js';

class APIRoutes {
  constructor() {
    this.router = express.Router();
    this.logger = createLogger('APIRoutes');
    
    // Inicializar rotas
    this.initializeRoutes();
    
    this.logger.info('Rotas da API inicializadas');
  }
  
  /**
   * Inicializa todas as rotas da API
   */
  initializeRoutes() {
    // Middleware de log para todas as requisições
    this.router.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.originalUrl}`);
      next();
    });
    
    // Rota principal
    this.router.get('/', (req, res) => {
      res.json({
        message: 'API do Nexus',
        version: '1.0.0',
        endpoints: [
          '/api/taskmaster/tasks',
          '/api/taskmaster/tasks/:id',
          '/api/taskmaster/next-task'
        ]
      });
    });
    
    // Registrar rotas do TaskMaster
    this.router.use('/taskmaster', taskMasterAPI.getRouter());
    
    // Captura de erros para rotas não encontradas
    this.router.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.originalUrl
      });
    });
    
    this.logger.info('Rotas registradas com sucesso');
  }
  
  /**
   * Retorna o roteador Express configurado
   * @returns {Object} - Roteador Express
   */
  getRouter() {
    return this.router;
  }
}

// Exportar como singleton
const apiRoutes = new APIRoutes();
export default apiRoutes;
