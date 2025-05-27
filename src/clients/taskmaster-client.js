/**
 * Cliente para interação com o TaskMaster
 * 
 * Este cliente oferece métodos para interagir com o TaskMaster,
 * tanto via CLI (diretamente) quanto via API REST (quando disponível).
 */

const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');

const execPromise = util.promisify(exec);

class TaskMasterClient {
  constructor(options = {}) {
    this.options = {
      basePath: process.env.TASKMASTER_PATH || path.resolve(process.cwd()),
      apiUrl: process.env.TASKMASTER_API_URL || 'http://localhost:3000/api/taskmaster',
      tasksFile: 'tasks/tasks.json',
      useApi: process.env.USE_TASKMASTER_API === 'true',
      debug: process.env.TASKMASTER_DEBUG === 'true',
      ...options
    };
    
    this.tasksFilePath = path.join(this.options.basePath, this.options.tasksFile);
    
    if (this.options.debug) {
      console.log('TaskMasterClient inicializado com:', {
        basePath: this.options.basePath,
        apiUrl: this.options.apiUrl,
        tasksFile: this.tasksFilePath,
        useApi: this.options.useApi
      });
    }
  }
  
  /**
   * Log de depuração
   * @private
   */
  debug(...args) {
    if (this.options.debug) {
      console.log('[TaskMasterClient]', ...args);
    }
  }
  
  /**
   * Executa um comando do TaskMaster via CLI
   * @param {string} command Comando a ser executado
   * @param {Array} args Argumentos do comando
   * @returns {Promise<Object>} Resultado do comando
   * @private
   */
  async executeCommand(command, args = []) {
    const cliPath = path.join(this.options.basePath, 'node_modules/.bin/task-master');
    const fallbackCliPath = 'npx task-master';
    
    let executable;
    try {
      await fs.access(cliPath);
      executable = cliPath;
    } catch (e) {
      executable = fallbackCliPath;
    }
    
    const cmd = `${executable} ${command} ${args.join(' ')}`;
    this.debug(`Executando comando: ${cmd}`);
    
    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: this.options.basePath });
      
      if (stderr && !stderr.includes('DeprecationWarning')) {
        console.error(`Erro ao executar comando TaskMaster: ${stderr}`);
      }
      
      try {
        // Tentar interpretar a saída como JSON
        return JSON.parse(stdout);
      } catch (e) {
        // Se não for JSON, retornar a saída como texto
        return { output: stdout, success: !stderr };
      }
    } catch (error) {
      console.error(`Erro ao executar comando TaskMaster: ${error.message}`);
      if (error.stdout) console.log(`Saída padrão: ${error.stdout}`);
      if (error.stderr) console.error(`Erro padrão: ${error.stderr}`);
      throw error;
    }
  }
  
  /**
   * Faz uma requisição para a API do TaskMaster
   * @param {string} endpoint Endpoint da API
   * @param {string} method Método HTTP
   * @param {Object} data Dados para POST/PUT
   * @returns {Promise<Object>} Resposta da API
   * @private
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.options.apiUrl}${endpoint}`;
    this.debug(`API Request: ${method} ${url}`);
    
    try {
      const response = await axios({
        method,
        url,
        data: data ? JSON.stringify(data) : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição à API TaskMaster: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Dados: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  /**
   * Lê o arquivo de tarefas diretamente
   * @returns {Promise<Array>} Lista de tarefas
   * @private
   */
  async readTasksFile() {
    try {
      const data = await fs.readFile(this.tasksFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Erro ao ler arquivo de tarefas: ${error.message}`);
      return { tasks: [] };
    }
  }
  
  /**
   * Busca todas as tarefas
   * @param {Object} options Opções de filtragem
   * @returns {Promise<Array>} Lista de tarefas
   */
  async getTasks(options = {}) {
    if (this.options.useApi) {
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.withSubtasks) queryParams.append('withSubtasks', 'true');
      
      const endpoint = `/tasks?${queryParams.toString()}`;
      const response = await this.apiRequest(endpoint);
      return response.tasks || [];
    } else {
      // Tentar usar o comando task-master get-tasks
      try {
        const args = [];
        if (options.status) args.push(`--status=${options.status}`);
        if (options.withSubtasks) args.push('--withSubtasks');
        
        const result = await this.executeCommand('get-tasks', args);
        return result.tasks || [];
      } catch (error) {
        // Fallback: ler o arquivo de tarefas diretamente
        const data = await this.readTasksFile();
        let tasks = data.tasks || [];
        
        // Aplicar filtros
        if (options.status) {
          tasks = tasks.filter(task => task.status === options.status);
        }
        
        return tasks;
      }
    }
  }
  
  /**
   * Busca uma tarefa específica
   * @param {string} taskId ID da tarefa
   * @returns {Promise<Object>} Dados da tarefa
   */
  async getTask(taskId) {
    if (this.options.useApi) {
      const response = await this.apiRequest(`/tasks/${taskId}`);
      return response.task;
    } else {
      try {
        const result = await this.executeCommand('get-task', [`--id=${taskId}`]);
        return result.task;
      } catch (error) {
        // Fallback: buscar no arquivo de tarefas
        const data = await this.readTasksFile();
        const task = data.tasks?.find(t => t.id.toString() === taskId.toString());
        if (!task) throw new Error(`Tarefa não encontrada: ${taskId}`);
        return task;
      }
    }
  }
  
  /**
   * Atualiza o status de uma tarefa
   * @param {string} taskId ID da tarefa
   * @param {string} status Novo status
   * @returns {Promise<Object>} Resultado da operação
   */
  async setTaskStatus(taskId, status) {
    if (this.options.useApi) {
      return this.apiRequest(`/tasks/${taskId}/status`, 'PUT', { status });
    } else {
      return this.executeCommand('set-status', [
        `--id=${taskId}`,
        `--status=${status}`
      ]);
    }
  }
  
  /**
   * Adiciona uma nova tarefa
   * @param {Object} taskData Dados da tarefa
   * @returns {Promise<Object>} Tarefa criada
   */
  async addTask(taskData) {
    if (this.options.useApi) {
      return this.apiRequest('/tasks', 'POST', taskData);
    } else {
      // Construir argumentos para o comando
      const args = [];
      
      if (taskData.title) args.push(`--title="${taskData.title}"`);
      if (taskData.description) args.push(`--description="${taskData.description}"`);
      if (taskData.prompt) args.push(`--prompt="${taskData.prompt}"`);
      if (taskData.priority) args.push(`--priority=${taskData.priority}`);
      if (taskData.dependencies) args.push(`--dependencies=${taskData.dependencies}`);
      
      return this.executeCommand('add-task', args);
    }
  }
  
  /**
   * Expande uma tarefa em subtarefas
   * @param {string} taskId ID da tarefa
   * @param {Object} options Opções de expansão
   * @returns {Promise<Object>} Resultado da operação
   */
  async expandTask(taskId, options = {}) {
    const args = [`--id=${taskId}`];
    
    if (options.subtasks) args.push(`--subtasks=${options.subtasks}`);
    if (options.research) args.push('--research');
    if (options.prompt) args.push(`--prompt="${options.prompt}"`);
    
    return this.executeCommand('expand', args);
  }
  
  /**
   * Analisa a complexidade das tarefas
   * @param {Object} options Opções de análise
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeComplexity(options = {}) {
    const args = [];
    
    if (options.ids) args.push(`--ids=${options.ids}`);
    if (options.from) args.push(`--from=${options.from}`);
    if (options.to) args.push(`--to=${options.to}`);
    if (options.threshold) args.push(`--threshold=${options.threshold}`);
    if (options.research) args.push('--research');
    
    return this.executeCommand('analyze-complexity', args);
  }
  
  /**
   * Busca a próxima tarefa a ser executada
   * @returns {Promise<Object>} Próxima tarefa
   */
  async getNextTask() {
    if (this.options.useApi) {
      const response = await this.apiRequest('/next-task');
      return response.task;
    } else {
      const result = await this.executeCommand('next-task');
      return result.task;
    }
  }
}

module.exports = { TaskMasterClient };
