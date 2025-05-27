/**
 * API para integração do TaskMaster com o Nexus
 * 
 * Este arquivo implementa endpoints REST para gerenciar tarefas
 * do TaskMaster através da interface web do Nexus.
 */

import express from 'express';
import { execSync } from 'child_process';
import { createLogger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { TaskMasterEventEmitter } from '../../scripts/taskmaster/taskmaster_events.js';

class TaskMasterAPI {
  constructor() {
    this.router = express.Router();
    this.logger = createLogger('TaskMasterAPI');
    this.projectRoot = process.env.TASKMASTER_PATH || process.cwd();
    this.taskMasterEnabled = process.env.TASKMASTER_ENABLED === 'true';
    this.eventEmitter = TaskMasterEventEmitter;
    
    // Inicializar rotas
    this.initializeRoutes();
    
    this.logger.info('API do TaskMaster inicializada');
  }
  
  /**
   * Inicializa as rotas da API
   */
  initializeRoutes() {
    // Middleware para verificar se o TaskMaster está habilitado
    this.router.use((req, res, next) => {
      if (!this.taskMasterEnabled) {
        return res.status(503).json({
          error: 'TaskMaster não está habilitado. Configure TASKMASTER_ENABLED=true no arquivo .env'
        });
      }
      next();
    });
    
    // Rota para listar tarefas
    this.router.get('/tasks', this.listTasks.bind(this));
    
    // Rota para obter detalhes de uma tarefa
    this.router.get('/tasks/:id', this.getTask.bind(this));
    
    // Rota para criar uma nova tarefa
    this.router.post('/tasks', this.createTask.bind(this));
    
    // Rota para atualizar o status de uma tarefa
    this.router.patch('/tasks/:id/status', this.updateTaskStatus.bind(this));
    
    // Rota para expandir uma tarefa em subtarefas
    this.router.post('/tasks/:id/expand', this.expandTask.bind(this));
    
    // Rota para obter a próxima tarefa a ser trabalhada
    this.router.get('/next-task', this.getNextTask.bind(this));
    
    this.logger.info('Rotas da API do TaskMaster registradas com sucesso');
  }
  
  /**
   * Executa um comando do TaskMaster
   * @param {string} command - Comando a ser executado
   * @returns {Object} - Resultado do comando
   */
  executeTaskMasterCommand(command) {
    try {
      const fullCommand = `npx task-master ${command} --json`;
      
      const stdout = execSync(fullCommand, { 
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      
      try {
        // Tentar analisar o resultado como JSON
        return JSON.parse(stdout);
      } catch (parseError) {
        // Se não for JSON, retornar como string
        return { output: stdout.trim() };
      }
    } catch (error) {
      this.logger.error(`Erro ao executar comando TaskMaster: ${error.message}`);
      throw new Error(`Falha ao executar comando TaskMaster: ${error.message}`);
    }
  }
  
  /**
   * Lista todas as tarefas
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async listTasks(req, res) {
    try {
      const status = req.query.status;
      const withSubtasks = req.query.withSubtasks === 'true';
      
      let command = 'get-tasks';
      
      if (status) {
        command += ` --status="${status}"`;
      }
      
      if (withSubtasks) {
        command += ' --withSubtasks';
      }
      
      const tasks = this.executeTaskMasterCommand(command);
      
      res.json(tasks);
    } catch (error) {
      this.logger.error(`Erro ao listar tarefas: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Obtém detalhes de uma tarefa específica
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getTask(req, res) {
    try {
      const taskId = req.params.id;
      
      const task = this.executeTaskMasterCommand(`get-task --id=${taskId}`);
      
      if (!task) {
        return res.status(404).json({ error: `Tarefa ${taskId} não encontrada` });
      }
      
      res.json(task);
    } catch (error) {
      this.logger.error(`Erro ao obter tarefa: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Cria uma nova tarefa
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async createTask(req, res) {
    try {
      const { title, description, priority, details, dependencies } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
      }
      
      // Construir o comando para criar a tarefa
      let command = `add-task --title="${title}" --description="${description}"`;
      
      if (priority) {
        command += ` --priority="${priority}"`;
      }
      
      if (details) {
        command += ` --details="${details}"`;
      }
      
      if (dependencies) {
        command += ` --dependencies="${dependencies}"`;
      }
      
      const result = this.executeTaskMasterCommand(command);
      
      // Emitir evento de criação de tarefa
      this.eventEmitter.emit('taskCreated', result);
      
      res.status(201).json(result);
    } catch (error) {
      this.logger.error(`Erro ao criar tarefa: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Atualiza o status de uma tarefa
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async updateTaskStatus(req, res) {
    try {
      const taskId = req.params.id;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status é obrigatório' });
      }
      
      const validStatus = ['pending', 'in-progress', 'review', 'done', 'deferred', 'cancelled'];
      
      if (!validStatus.includes(status)) {
        return res.status(400).json({ 
          error: `Status inválido. Use um dos seguintes: ${validStatus.join(', ')}` 
        });
      }
      
      const result = this.executeTaskMasterCommand(`set-status --id=${taskId} --status="${status}"`);
      
      // Emitir evento de atualização de status
      this.eventEmitter.emit('taskStatusUpdated', { taskId, newStatus: status });
      
      res.json({ message: `Status da tarefa ${taskId} atualizado para "${status}"` });
    } catch (error) {
      this.logger.error(`Erro ao atualizar status: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Expande uma tarefa em subtarefas
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async expandTask(req, res) {
    try {
      const taskId = req.params.id;
      const { subtasks } = req.body;
      
      let command = `expand --id=${taskId}`;
      
      if (subtasks) {
        command += ` --subtasks=${subtasks}`;
      }
      
      const result = this.executeTaskMasterCommand(command);
      
      // Emitir evento de expansão de tarefa
      this.eventEmitter.emit('taskExpanded', { taskId, subtasks: result.subtasks });
      
      res.json(result);
    } catch (error) {
      this.logger.error(`Erro ao expandir tarefa: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Obtém a próxima tarefa a ser trabalhada
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getNextTask(req, res) {
    try {
      const result = this.executeTaskMasterCommand('next-task');
      
      if (!result || !result.nextTask) {
        return res.json({ message: 'Não há tarefas pendentes para trabalhar no momento.' });
      }
      
      res.json(result);
    } catch (error) {
      this.logger.error(`Erro ao obter próxima tarefa: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
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
const taskMasterAPI = new TaskMasterAPI();
export default taskMasterAPI;
