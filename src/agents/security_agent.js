/**
 * SecurityAgent - Responsável por gerenciar todos os aspectos de segurança no sistema Windsurf
 * 
 * Este agente implementa as regras definidas em security_rules.md e gerencia:
 * - Autenticação de usuários
 * - Autorização e controle de acesso
 * - Validação de dados
 * - Proteção contra ataques
 * - Auditoria e logging
 * - Integração segura com serviços externos
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';

class SecurityAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('SecurityAgent');
    this.metrics = createMetrics('SecurityAgent');
    this.jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_replace_in_production';
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'default_webhook_secret_replace_in_production';
    this.mfaEnabled = process.env.MFA_ENABLED === 'true';
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '3600', 10);
    
    // Inicializar ferramentas necessárias
    this.initializeTools();
    
    // Registrar handlers de eventos
    this.registerEventHandlers();
    
    this.logger.info('SecurityAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas necessárias para o SecurityAgent
   * @private
   */
  initializeTools() {
    // Registrar ferramentas do Supabase para autenticação
    this.toolManager.registerTool('supabase:auth:signIn');
    this.toolManager.registerTool('supabase:auth:signOut');
    this.toolManager.registerTool('supabase:auth:verifyToken');
    
    // Registrar ferramentas para validação de dados
    this.toolManager.registerTool('validation:sanitizeInput');
    this.toolManager.registerTool('validation:validateSchema');
    
    // Registrar ferramentas para auditoria
    this.toolManager.registerTool('logging:securityEvent');
    this.toolManager.registerTool('logging:auditTrail');
  }
  
  /**
   * Registra handlers para eventos de segurança
   * @private
   */
  registerEventHandlers() {
    // Registrar handlers para eventos de autenticação
    this.toolManager.on('security:authentication_attempt', this.handleAuthenticationAttempt.bind(this));
    
    // Registrar handlers para eventos de autorização
    this.toolManager.on('security:authorization_check', this.handleAuthorizationCheck.bind(this));
    
    // Registrar handlers para eventos de atividade suspeita
    this.toolManager.on('security:suspicious_activity', this.handleSuspiciousActivity.bind(this));
  }
  
  /**
   * Autentica um usuário com base em suas credenciais
   * @param {Object} credentials - Credenciais do usuário (email/username e senha)
   * @returns {Promise<string>} Token JWT para o usuário autenticado
   * @throws {Error} Se a autenticação falhar
   */
  async authenticateUser(credentials) {
    try {
      // Registrar tentativa de autenticação
      this.toolManager.emit('security:authentication_attempt', {
        user: credentials.email || credentials.username,
        timestamp: new Date().toISOString(),
        ip: this.getCurrentIp()
      });
      
      // Validar credenciais usando Supabase
      const authResult = await this.toolManager.executeTool('supabase:auth:signIn', {
        email: credentials.email,
        password: credentials.password
      });
      
      if (!authResult.user) {
        throw new Error('Credenciais inválidas');
      }
      
      // Verificar se MFA é necessário
      if (this.mfaEnabled && authResult.user.mfa_enabled) {
        return {
          requiresMfa: true,
          mfaToken: this.generateMfaToken(authResult.user.id)
        };
      }
      
      // Gerar token JWT
      const token = this.generateJwtToken(authResult.user);
      
      // Registrar autenticação bem-sucedida
      this.toolManager.executeTool('logging:securityEvent', {
        event: 'user_login',
        user: authResult.user.id,
        success: true,
        timestamp: new Date().toISOString(),
        metadata: {
          ip: this.getCurrentIp()
        }
      });
      
      return token;
    } catch (error) {
      // Registrar falha de autenticação
      this.toolManager.executeTool('logging:securityEvent', {
        event: 'user_login',
        user: credentials.email || credentials.username,
        success: false,
        timestamp: new Date().toISOString(),
        metadata: {
          error: error.message,
          ip: this.getCurrentIp()
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Verifica se um usuário tem permissão para realizar uma ação em um recurso
   * @param {string} userId - ID do usuário
   * @param {string} resourceType - Tipo de recurso (documento, projeto, etc.)
   * @param {string} resourceId - ID do recurso
   * @param {string} action - Ação a ser realizada (ler, escrever, excluir, etc.)
   * @returns {Promise<boolean>} Indica se o acesso é permitido
   */
  async authorizeAccess(userId, resourceType, resourceId, action) {
    try {
      // Registrar verificação de autorização
      this.toolManager.emit('security:authorization_check', {
        user: userId,
        resource: `${resourceType}:${resourceId}`,
        action,
        timestamp: new Date().toISOString()
      });
      
      // Verificar permissões no banco de dados
      let isAuthorized = false;
      
      switch (resourceType) {
        case 'document':
          isAuthorized = await this.checkDocumentPermission(userId, resourceId, action);
          break;
        case 'project':
          isAuthorized = await this.checkProjectPermission(userId, resourceId, action);
          break;
        case 'repository':
          isAuthorized = await this.checkRepositoryPermission(userId, resourceId, action);
          break;
        default:
          isAuthorized = false;
      }
      
      // Registrar resultado da autorização
      this.toolManager.executeTool('logging:securityEvent', {
        event: 'authorization_check',
        user: userId,
        resource: `${resourceType}:${resourceId}`,
        action,
        success: isAuthorized,
        timestamp: new Date().toISOString()
      });
      
      return isAuthorized;
    } catch (error) {
      console.error('Erro ao verificar autorização:', error);
      return false;
    }
  }
  
  /**
   * Valida a autenticidade de um webhook recebido
   * @param {Object} payload - Conteúdo do webhook
   * @param {string} signature - Assinatura do webhook
   * @param {string} secret - Segredo compartilhado
   * @returns {boolean} Indica se o webhook é válido
   */
  validateWebhook(payload, signature, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret || this.webhookSecret);
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const calculatedSignature = 'sha256=' + hmac.update(payloadString).digest('hex');
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature),
        Buffer.from(signature)
      );
      
      // Registrar validação de webhook
      this.toolManager.executeTool('logging:securityEvent', {
        event: 'webhook_validation',
        success: isValid,
        timestamp: new Date().toISOString(),
        metadata: {
          source: this.detectWebhookSource(payload)
        }
      });
      
      return isValid;
    } catch (error) {
      console.error('Erro ao validar webhook:', error);
      return false;
    }
  }
  
  /**
   * Sanitiza e valida entrada de dados conforme um schema
   * @param {Object} input - Dados a serem sanitizados
   * @param {Object} schema - Schema de validação
   * @returns {Object} Dados sanitizados
   * @throws {Error} Se a validação falhar
   */
  sanitizeInput(input, schema) {
    try {
      // Sanitizar entrada para prevenir XSS e injeção
      const sanitizedInput = this.toolManager.executeTool('validation:sanitizeInput', {
        input
      });
      
      // Validar contra schema
      const validationResult = this.toolManager.executeTool('validation:validateSchema', {
        data: sanitizedInput,
        schema
      });
      
      if (!validationResult.valid) {
        throw new Error(`Validação falhou: ${validationResult.errors.join(', ')}`);
      }
      
      return sanitizedInput;
    } catch (error) {
      console.error('Erro ao sanitizar entrada:', error);
      throw error;
    }
  }
  
  /**
   * Gera um relatório de segurança para um período específico
   * @param {string} startDate - Data de início (formato ISO)
   * @param {string} endDate - Data de fim (formato ISO)
   * @returns {Promise<Object>} Relatório de segurança
   */
  async generateSecurityReport(startDate, endDate) {
    try {
      // Buscar eventos de segurança no período especificado
      const securityEvents = await this.toolManager.executeTool('logging:auditTrail', {
        startDate,
        endDate,
        eventTypes: [
          'user_login',
          'authorization_check',
          'webhook_validation',
          'suspicious_activity'
        ]
      });
      
      // Processar eventos e gerar estatísticas
      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        authentication: {
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0
        },
        authorization: {
          totalChecks: 0,
          allowed: 0,
          denied: 0
        },
        webhooks: {
          totalReceived: 0,
          valid: 0,
          invalid: 0
        },
        suspiciousActivities: {
          total: 0,
          byType: {}
        },
        recommendations: []
      };
      
      // Processar eventos para preencher o relatório
      securityEvents.forEach(event => {
        switch (event.event) {
          case 'user_login':
            report.authentication.totalAttempts++;
            if (event.success) {
              report.authentication.successfulAttempts++;
            } else {
              report.authentication.failedAttempts++;
            }
            break;
          case 'authorization_check':
            report.authorization.totalChecks++;
            if (event.success) {
              report.authorization.allowed++;
            } else {
              report.authorization.denied++;
            }
            break;
          case 'webhook_validation':
            report.webhooks.totalReceived++;
            if (event.success) {
              report.webhooks.valid++;
            } else {
              report.webhooks.invalid++;
            }
            break;
          case 'suspicious_activity':
            report.suspiciousActivities.total++;
            const type = event.metadata.type || 'unknown';
            report.suspiciousActivities.byType[type] = (report.suspiciousActivities.byType[type] || 0) + 1;
            break;
        }
      });
      
      // Gerar recomendações com base nos dados
      this.generateSecurityRecommendations(report);
      
      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de segurança:', error);
      throw error;
    }
  }
  
  /**
   * Verifica permissões de acesso a documentos
   * @private
   * @param {string} userId - ID do usuário
   * @param {string} documentId - ID do documento
   * @param {string} action - Ação a ser realizada
   * @returns {Promise<boolean>} Indica se o acesso é permitido
   */
  async checkDocumentPermission(userId, documentId, action) {
    // Implementação específica para verificar permissões de documentos
    // Consulta o banco de dados para verificar se o usuário tem a permissão necessária
    
    // Exemplo simplificado:
    const document = await this.toolManager.executeTool('supabase:query', {
      table: 'document_metadata',
      id: documentId
    });
    
    if (!document) {
      return false;
    }
    
    // Verificar se o usuário é o autor
    if (document.author_id === userId) {
      return true;
    }
    
    // Verificar permissões do projeto
    return this.checkProjectPermission(userId, document.project_id, action);
  }
  
  /**
   * Verifica permissões de acesso a projetos
   * @private
   * @param {string} userId - ID do usuário
   * @param {string} projectId - ID do projeto
   * @param {string} action - Ação a ser realizada
   * @returns {Promise<boolean>} Indica se o acesso é permitido
   */
  async checkProjectPermission(userId, projectId, action) {
    // Implementação específica para verificar permissões de projetos
    
    // Exemplo simplificado:
    const project = await this.toolManager.executeTool('supabase:query', {
      table: 'projects',
      id: projectId
    });
    
    if (!project) {
      return false;
    }
    
    // Verificar se o usuário é o proprietário
    if (project.owner_id === userId) {
      return true;
    }
    
    // Verificar se o usuário é membro do projeto
    const membership = await this.toolManager.executeTool('supabase:query', {
      table: 'project_members',
      filters: {
        project_id: projectId,
        user_id: userId
      }
    });
    
    if (!membership) {
      return false;
    }
    
    // Verificar papel e permissões específicas
    switch (action) {
      case 'read':
        // Qualquer membro pode ler
        return true;
      case 'write':
      case 'update':
        // Apenas admin ou owner podem escrever/atualizar
        return ['owner', 'admin'].includes(membership.role) || 
               (membership.permissions && membership.permissions.can_write);
      case 'delete':
        // Apenas owner pode excluir
        return membership.role === 'owner' || 
               (membership.permissions && membership.permissions.can_delete);
      default:
        return false;
    }
  }
  
  /**
   * Verifica permissões de acesso a repositórios
   * @private
   * @param {string} userId - ID do usuário
   * @param {string} repositoryId - ID do repositório
   * @param {string} action - Ação a ser realizada
   * @returns {Promise<boolean>} Indica se o acesso é permitido
   */
  async checkRepositoryPermission(userId, repositoryId, action) {
    // Implementação específica para verificar permissões de repositórios
    
    // Exemplo simplificado:
    const repository = await this.toolManager.executeTool('supabase:query', {
      table: 'repositories',
      id: repositoryId
    });
    
    if (!repository) {
      return false;
    }
    
    // Verificar permissões do projeto ao qual o repositório pertence
    return this.checkProjectPermission(userId, repository.project_id, action);
  }
  
  /**
   * Gera um token JWT para um usuário
   * @private
   * @param {Object} user - Dados do usuário
   * @returns {string} Token JWT
   */
  generateJwtToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.sessionTimeout
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }
  
  /**
   * Gera um token temporário para autenticação multifator
   * @private
   * @param {string} userId - ID do usuário
   * @returns {string} Token MFA
   */
  generateMfaToken(userId) {
    const payload = {
      sub: userId,
      type: 'mfa',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }
  
  /**
   * Obtém o endereço IP atual da requisição
   * @private
   * @returns {string} Endereço IP
   */
  getCurrentIp() {
    // Em um ambiente real, isso seria obtido do contexto da requisição
    return '127.0.0.1';
  }
  
  /**
   * Detecta a fonte de um webhook com base no payload
   * @private
   * @param {Object} payload - Conteúdo do webhook
   * @returns {string} Fonte do webhook
   */
  detectWebhookSource(payload) {
    if (payload.repository && payload.sender) {
      return 'github';
    }
    
    if (payload.file && payload.version) {
      return 'figma';
    }
    
    return 'unknown';
  }
  
  /**
   * Verifica a configuração de segurança do sistema
   * @param {Object} options - Opções de verificação
   * @returns {Promise<Object>} Resultado da verificação
   */
  async verifySecurityConfig(options = {}) {
    const { environment = 'development' } = options;
    const timestamp = new Date().toISOString();
    
    // Verificar configurações de segurança com base no ambiente
    const issues = [];
    
    // Em produção, verificar JWT Secret
    if (environment === 'production') {
      if (this.jwtSecret === 'default_jwt_secret_replace_in_production') {
        issues.push('JWT Secret padrão em uso. Defina um segredo forte para JWT em produção.');
      }
      
      if (this.webhookSecret === 'default_webhook_secret_replace_in_production') {
        issues.push('Webhook Secret padrão em uso. Defina um segredo forte para webhooks em produção.');
      }
      
      if (!this.mfaEnabled) {
        issues.push('Autenticação multifator desabilitada em produção. Considere habilitá-la para maior segurança.');
      }
    }
    
    // Registrar a verificação de configuração
    console.log(`Verificação de configuração de segurança concluída: ${issues.length} problemas encontrados`);
    
    return {
      valid: issues.length === 0,
      environment,
      timestamp,
      issues,
      recommendations: issues.length > 0 ? [
        'Resolva os problemas identificados antes de prosseguir.',
        'Consulte a documentação de segurança para obter mais informações.'
      ] : []
    };
  }
  
  /**
   * Gera recomendações de segurança com base nos dados do relatório
   * @private
   * @param {Object} report - Relatório de segurança
   */
  generateSecurityRecommendations(report) {
    // Verificar falhas de autenticação
    if (report.authentication.failedAttempts > report.authentication.successfulAttempts * 0.2) {
      report.recommendations.push({
        severity: 'high',
        message: 'Alto número de falhas de autenticação detectado. Considere implementar proteção contra força bruta.',
        action: 'Implementar rate limiting e bloqueio temporário de contas após múltiplas falhas.'
      });
    }
    
    // Verificar negações de autorização
    if (report.authorization.denied > report.authorization.allowed * 0.3) {
      report.recommendations.push({
        severity: 'medium',
        message: 'Número significativo de tentativas de acesso não autorizado detectado.',
        action: 'Revisar políticas de acesso e melhorar a comunicação das permissões aos usuários.'
      });
    }
    
    // Verificar webhooks inválidos
    if (report.webhooks.invalid > 0) {
      report.recommendations.push({
        severity: 'medium',
        message: 'Webhooks inválidos detectados. Possível tentativa de falsificação.',
        action: 'Verificar a configuração dos webhooks e considerar a rotação dos segredos.'
      });
    }
    
    // Verificar atividades suspeitas
    if (report.suspiciousActivities.total > 0) {
      report.recommendations.push({
        severity: 'high',
        message: 'Atividades suspeitas detectadas no sistema.',
        action: 'Investigar os logs detalhados e considerar medidas adicionais de segurança.'
      });
    }
  }
  
  /**
   * Handler para eventos de tentativa de autenticação
   * @private
   * @param {Object} data - Dados do evento
   */
  handleAuthenticationAttempt(data) {
    // Implementação do handler para eventos de autenticação
    console.log('Tentativa de autenticação:', data);
    
    // Verificar padrões suspeitos (exemplo: muitas tentativas em curto período)
    // Implementação real dependeria de um sistema de rate limiting
  }
  
  /**
   * Handler para eventos de verificação de autorização
   * @private
   * @param {Object} data - Dados do evento
   */
  handleAuthorizationCheck(data) {
    // Implementação do handler para eventos de autorização
    console.log('Verificação de autorização:', data);
    
    // Verificar padrões suspeitos (exemplo: muitas tentativas de acesso a recursos restritos)
  }
  
  /**
   * Handler para eventos de atividade suspeita
   * @private
   * @param {Object} data - Dados do evento
   */
  handleSuspiciousActivity(data) {
    // Implementação do handler para eventos de atividade suspeita
    console.log('Atividade suspeita detectada:', data);
    
    // Registrar no sistema de logs
    this.toolManager.executeTool('logging:securityEvent', {
      event: 'suspicious_activity_detected',
      timestamp: new Date().toISOString(),
      metadata: data
    });
    
    // Enviar alerta (em um sistema real)
    // this.sendSecurityAlert(data);
  }
}

export default SecurityAgent;
