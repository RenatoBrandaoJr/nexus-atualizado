// src/config/default.js

/**
 * Configuração padrão para o sistema Nexus
 * Utilizado pelo OrchestratorAgent para inicialização
 */
export default {
  // Configurações do ambiente
  environment: {
    production: {
      logLevel: 'info',
      maxConcurrentRequests: 10,
      timeout: 30000 // 30 segundos
    },
    development: {
      logLevel: 'debug',
      maxConcurrentRequests: 5,
      timeout: 60000 // 60 segundos
    }
  },
  
  // Configurações dos agentes
  agents: {
    SecurityAgent: {
      enabled: true,
      module: 'security_agent',
      options: {
        mfaEnabled: process.env.MFA_ENABLED === 'true',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600', 10)
      }
    },
    NotificationAgent: {
      enabled: true,
      module: 'notification_agent',
      options: {
        channels: ['console'],
        defaultPriorities: { info: 'low', error: 'high' }
      }
    },
    DocumentAgent: {
      enabled: true,
      module: 'document_agent',
      options: {
        defaultFormat: 'markdown',
        generateDiagrams: true,
        includeDesignReferences: true
      }
    },
    DatabaseAgent: {
      enabled: true,
      module: 'database_agent',
      options: {
        schemaVersion: process.env.DB_SCHEMA_VERSION || '1.0.0',
        autoBackup: process.env.DB_AUTO_BACKUP === 'true',
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10)
      }
    },
    AIAssistantAgent: {
      enabled: true,
      module: 'ai_assistant_agent',
      options: {
        model: process.env.AI_ASSISTANT_MODEL || 'claude-task-master',
        temperature: parseFloat(process.env.AI_ASSISTANT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_ASSISTANT_MAX_TOKENS || '2000', 10)
      }
    },
    FrontendAgent: {
      enabled: true,
      module: 'frontend_agent',
      options: {
        reactVersion: process.env.REACT_VERSION || '18.2.0',
        bundler: process.env.FRONTEND_BUNDLER || 'vite',
        cssFramework: process.env.CSS_FRAMEWORK || 'tailwind'
      }
    },
    BackendAgent: {
      enabled: true,
      module: 'backend_agent',
      options: {
        apiPrefix: process.env.API_PREFIX || '/api/v1',
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100', 10)
      }
    },
    IntegrationAgent: {
      enabled: true,
      module: 'integration_agent',
      options: {
        retryAttempts: parseInt(process.env.INTEGRATION_RETRY_ATTEMPTS || '3', 10),
        cacheTTL: parseInt(process.env.INTEGRATION_CACHE_TTL || '300', 10)
      }
    }
  },
  
  // Configurações de notificação
  notifications: {
    channels: ['console'],
    defaultPriorities: {
      info: 'low',
      warning: 'medium',
      error: 'high'
    }
  },
  
  // Configurações das ferramentas
  tools: {
    core: {
      enabled: true,
      priority: 'high'
    },
    database: {
      enabled: true,
      priority: 'medium',
      connectionPoolSize: 5
    },
    document: {
      enabled: true,
      priority: 'medium'
    }
  },
  
  // Configurações de integração
  integrations: {
    github: {
      webhookPath: '/api/webhooks/github',
      events: ['push', 'pull_request']
    },
    figma: {
      enabled: true
    },
    supabase: {
      enabled: true
    }
  }
};
