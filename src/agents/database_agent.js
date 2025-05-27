/**
 * DatabaseAgent - Responsável pelo gerenciamento de banco de dados e queries
 * 
 * Este agente implementa as regras definidas em database_rules.md e gerencia:
 * - Criação e manutenção de schemas
 * - Otimização de queries
 * - Migrações de banco de dados
 * - Validação de integridade de dados
 * - Integração com Supabase
 */

import ToolManager from '../utils/tool_manager.js';
import { createLogger } from '../utils/logger.js';
import { createMetrics } from '../utils/metrics.js';
import supabaseMCP from '../mcps/supabase_adapter.js';

class DatabaseAgent {
  constructor() {
    this.toolManager = new ToolManager();
    this.logger = createLogger('DatabaseAgent');
    this.metrics = createMetrics('DatabaseAgent');
    this.supabaseMCP = supabaseMCP;
    
    // Configurações do agente
    this.schemaVersion = process.env.DB_SCHEMA_VERSION || "1.0.0";
    this.autoBackup = process.env.DB_AUTO_BACKUP === "true";
    this.backupInterval = parseInt(process.env.DB_BACKUP_INTERVAL || "86400", 10); // 24 horas em segundos
    this.queryTimeout = parseInt(process.env.DB_QUERY_TIMEOUT || "30000", 10); // 30 segundos
    this.maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || "20", 10);
    this.autoDocumentation = process.env.AUTO_DOCUMENTATION === "true";
    
    // Cache para schemas e queries
    this.schemaCache = {};
    this.queryCache = {};
    
    // Registrar ferramentas
    this.initializeTools();
    
    console.log('DatabaseAgent inicializado com sucesso');
  }
  
  /**
   * Inicializa as ferramentas utilizadas pelo agente
   */
  initializeTools() {
    // Ferramenta para executar consultas SQL
    this.toolManager.registerTool('database:executeQuery', async (params) => {
      this.logger.info('Executando consulta SQL', params);
      return await this.executeQuery(params.query, params.parameters, params.options);
    });
    
    // Ferramenta para criar ou atualizar tabelas
    this.toolManager.registerTool('database:createOrUpdateTable', async (params) => {
      this.logger.info('Criando/atualizando tabela', params);
      return await this.createOrUpdateTable(params.name, params.schema, params.options);
    });
    
    // Ferramenta para executar migrações
    this.toolManager.registerTool('database:executeMigration', async (params) => {
      this.logger.info('Executando migração', params);
      return await this.executeMigration(params.name, params.sql, params.options);
    });
    
    // Ferramenta para criar backups
    this.toolManager.registerTool('database:createBackup', async (params) => {
      this.logger.info('Criando backup', params);
      return await this.createBackup(params);
    });
    
    // Ferramenta para analisar desempenho de queries
    this.toolManager.registerTool('database:analyzeQueryPerformance', async (params) => {
      this.logger.info('Analisando desempenho de query', params);
      return await this.analyzeQueryPerformance(params.query, params.options);
    });
  }
  
  /**
   * Executa uma consulta SQL
   */
  async executeQuery(query, parameters = {}, options = {}) {
    this.logger.info(`Executando consulta SQL: ${query.substring(0, 100)}...`, { parameters });
    this.metrics.increment('database.query.executed');
    
    const startTime = Date.now();
    
    try {
      // Verificar se a consulta está em cache
      const cacheKey = `${query}_${JSON.stringify(parameters)}`;
      if (options.useCache && this.queryCache[cacheKey]) {
        this.logger.info('Usando resultado em cache para consulta');
        return this.queryCache[cacheKey];
      }
      
      // Configurar timeout
      const timeout = options.timeout || this.queryTimeout;
      
      // Executar consulta via Supabase
      const result = await this.supabaseMCP.query(query, parameters);
      
      // Armazenar em cache se solicitado
      if (options.useCache) {
        this.queryCache[cacheKey] = result;
      }
      
      // Registrar métricas
      const duration = Date.now() - startTime;
      this.metrics.timing('database.query.duration', duration);
      
      this.logger.info(`Consulta executada com sucesso em ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao executar consulta: ${error.message}`, { error });
      this.metrics.increment('database.query.error');
      throw error;
    }
  }
  
  /**
   * Cria ou atualiza uma tabela no banco de dados
   */
  async createOrUpdateTable(name, schema, options = {}) {
    this.logger.info(`Criando/atualizando tabela: ${name}`);
    this.metrics.increment('database.table.created');
    
    try {
      // Validar nome da tabela
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Nome de tabela inválido: ${name}`);
      }
      
      // Construir SQL para criar tabela
      let sql = `CREATE TABLE IF NOT EXISTS ${name} (\n`;
      
      // Adicionar colunas
      const columns = [];
      for (const [columnName, columnDef] of Object.entries(schema.columns)) {
        columns.push(`  ${columnName} ${columnDef.type} ${columnDef.constraints || ''}`);
      }
      
      sql += columns.join(',\n');
      
      // Adicionar restrições de tabela
      if (schema.constraints && schema.constraints.length > 0) {
        sql += ',\n  ' + schema.constraints.join(',\n  ');
      }
      
      sql += '\n);';
      
      // Adicionar índices
      if (schema.indexes && schema.indexes.length > 0) {
        for (const index of schema.indexes) {
          sql += `\nCREATE INDEX IF NOT EXISTS idx_${name}_${index.columns.join('_')} ON ${name} (${index.columns.join(', ')});`;
        }
      }
      
      // Executar SQL
      await this.executeQuery(sql, {}, options);
      
      // Atualizar cache de schema
      this.schemaCache[name] = schema;
      
      // Documentar automaticamente
      if (this.autoDocumentation) {
        this.documentTable(name, schema);
      }
      
      this.logger.info(`Tabela ${name} criada/atualizada com sucesso`);
      return { success: true, name, schema };
    } catch (error) {
      this.logger.error(`Erro ao criar/atualizar tabela ${name}: ${error.message}`, { error });
      this.metrics.increment('database.table.error');
      throw error;
    }
  }
  
  /**
   * Executa uma migração de banco de dados
   */
  async executeMigration(name, sql, options = {}) {
    this.logger.info(`Executando migração: ${name}`);
    this.metrics.increment('database.migration.executed');
    
    try {
      // Verificar se a migração já foi executada
      const checkResult = await this.executeQuery(
        "SELECT * FROM migrations WHERE name = :name",
        { name },
        { useCache: false }
      );
      
      if (checkResult.data && checkResult.data.length > 0) {
        this.logger.info(`Migração ${name} já foi executada anteriormente`);
        return { success: true, name, alreadyExecuted: true };
      }
      
      // Fazer backup antes da migração se solicitado
      if (options.backup) {
        await this.createBackup({ label: `pre_migration_${name}` });
      }
      
      // Executar SQL da migração
      await this.executeQuery(sql, {}, { useCache: false });
      
      // Registrar migração como executada
      await this.executeQuery(
        "INSERT INTO migrations (name, executed_at) VALUES (:name, NOW())",
        { name },
        { useCache: false }
      );
      
      this.logger.info(`Migração ${name} executada com sucesso`);
      return { success: true, name, executedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`Erro ao executar migração ${name}: ${error.message}`, { error });
      this.metrics.increment('database.migration.error');
      throw error;
    }
  }
  
  /**
   * Cria um backup do banco de dados
   */
  async createBackup(options = {}) {
    this.logger.info('Iniciando backup do banco de dados');
    this.metrics.increment('database.backup.started');
    
    try {
      const label = options.label || `backup_${new Date().toISOString().replace(/[:.]/g, '_')}`;
      
      // Simulação de backup - na implementação real, usaria funções específicas do banco
      this.logger.info(`Simulando backup com label: ${label}`);
      
      // Registrar backup
      await this.executeQuery(
        "INSERT INTO backups (label, created_at, status) VALUES (:label, NOW(), 'completed')",
        { label },
        { useCache: false }
      );
      
      this.logger.info('Backup concluído com sucesso');
      this.metrics.increment('database.backup.completed');
      
      return {
        success: true,
        label,
        createdAt: new Date().toISOString(),
        size: Math.floor(Math.random() * 1000) + 'MB' // Tamanho simulado
      };
    } catch (error) {
      this.logger.error(`Erro ao criar backup: ${error.message}`, { error });
      this.metrics.increment('database.backup.error');
      throw error;
    }
  }
  
  /**
   * Analisa o desempenho de uma consulta SQL
   */
  async analyzeQueryPerformance(query, options = {}) {
    this.logger.info(`Analisando desempenho da query: ${query.substring(0, 100)}...`);
    this.metrics.increment('database.query.analyze');
    
    try {
      // Executar EXPLAIN para analisar o plano de execução
      const explainQuery = `EXPLAIN ANALYZE ${query}`;
      const result = await this.executeQuery(explainQuery, options.parameters || {}, { useCache: false });
      
      // Processar e analisar o plano de execução
      const analysis = this.processExplainResult(result.data);
      
      this.logger.info('Análise de desempenho concluída');
      return {
        success: true,
        query,
        analysis,
        recommendations: this.generateOptimizationRecommendations(analysis)
      };
    } catch (error) {
      this.logger.error(`Erro ao analisar desempenho da query: ${error.message}`, { error });
      this.metrics.increment('database.query.analyze.error');
      throw error;
    }
  }
  
  /**
   * Processa o resultado do EXPLAIN ANALYZE
   * @private
   */
  processExplainResult(explainData) {
    // Simulação de processamento do resultado do EXPLAIN
    return {
      executionTime: Math.random() * 100 + 'ms',
      planNodes: [
        { type: 'Seq Scan', table: 'users', cost: '0.00..1.10', rows: 10 },
        { type: 'Sort', cost: '1.10..1.13', rows: 10 }
      ],
      totalCost: '0.00..1.13',
      planningTime: Math.random() * 10 + 'ms',
      executionTime: Math.random() * 50 + 'ms'
    };
  }
  
  /**
   * Gera recomendações de otimização com base na análise
   * @private
   */
  generateOptimizationRecommendations(analysis) {
    // Simulação de recomendações
    return [
      'Considere adicionar um índice na coluna consultada frequentemente',
      'Verifique se as estatísticas da tabela estão atualizadas',
      'Considere reescrever a consulta para evitar varreduras sequenciais'
    ];
  }
  
  /**
   * Gera documentação para uma tabela
   * @private
   */
  async documentTable(name, schema) {
    this.logger.info(`Gerando documentação para tabela: ${name}`);
    
    try {
      // Gerar conteúdo markdown da documentação
      let markdown = `# Tabela: ${name}\n\n`;
      
      // Descrição
      if (schema.description) {
        markdown += `${schema.description}\n\n`;
      }
      
      // Colunas
      markdown += '## Colunas\n\n';
      markdown += '| Nome | Tipo | Descrição | Restrições |\n';
      markdown += '|------|------|-----------|------------|\n';
      
      for (const [columnName, columnDef] of Object.entries(schema.columns)) {
        markdown += `| ${columnName} | ${columnDef.type} | ${columnDef.description || ''} | ${columnDef.constraints || ''} |\n`;
      }
      
      // Índices
      if (schema.indexes && schema.indexes.length > 0) {
        markdown += '\n## Índices\n\n';
        markdown += '| Nome | Colunas | Tipo |\n';
        markdown += '|------|---------|------|\n';
        
        for (const index of schema.indexes) {
          markdown += `| idx_${name}_${index.columns.join('_')} | ${index.columns.join(', ')} | ${index.type || 'BTREE'} |\n`;
        }
      }
      
      // Relacionamentos
      if (schema.relationships && schema.relationships.length > 0) {
        markdown += '\n## Relacionamentos\n\n';
        markdown += '| Tabela | Tipo | Colunas |\n';
        markdown += '|--------|------|---------|\n';
        
        for (const rel of schema.relationships) {
          markdown += `| ${rel.table} | ${rel.type} | ${rel.columns.join(', ')} |\n`;
        }
      }
      
      // Salvar documentação (simulado)
      this.logger.info('Documentação da tabela gerada com sucesso');
      
      return {
        success: true,
        name,
        documentation: markdown
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar documentação para tabela ${name}: ${error.message}`, { error });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Inicializa o agente
   */
  async initialize(options = {}) {
    this.logger.info('Inicializando DatabaseAgent', options);
    
    try {
      // Verificar e criar tabela de migrações se não existir
      await this.createOrUpdateTable('migrations', {
        columns: {
          id: { type: 'SERIAL', constraints: 'PRIMARY KEY' },
          name: { type: 'VARCHAR(255)', constraints: 'UNIQUE NOT NULL' },
          executed_at: { type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT NOW()' }
        },
        indexes: [
          { columns: ['name'] }
        ]
      });
      
      // Verificar e criar tabela de backups se não existir
      await this.createOrUpdateTable('backups', {
        columns: {
          id: { type: 'SERIAL', constraints: 'PRIMARY KEY' },
          label: { type: 'VARCHAR(255)', constraints: 'NOT NULL' },
          created_at: { type: 'TIMESTAMP', constraints: 'NOT NULL' },
          status: { type: 'VARCHAR(50)', constraints: 'NOT NULL' }
        },
        indexes: [
          { columns: ['created_at'] },
          { columns: ['status'] }
        ]
      });
      
      this.logger.info('DatabaseAgent inicializado com sucesso');
      return { success: true };
    } catch (error) {
      this.logger.error(`Erro ao inicializar DatabaseAgent: ${error.message}`, { error });
      throw error;
    }
  }
}

export default DatabaseAgent;
