/**
 * Interface de usuário para o TaskMaster
 * 
 * Este componente fornece uma interface visual para interagir com
 * as tarefas do TaskMaster dentro do sistema Nexus.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Componente principal
const TaskMasterUI = ({ showTitle = true }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'detail', 'create', 'edit'
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    details: ''
  });

  // Status disponíveis
  const availableStatus = [
    { value: 'all', label: 'Todos', color: '#6B7280' },
    { value: 'pending', label: 'Pendente', color: '#F59E0B' },
    { value: 'in-progress', label: 'Em Andamento', color: '#3B82F6' },
    { value: 'review', label: 'Revisão', color: '#8B5CF6' },
    { value: 'done', label: 'Concluído', color: '#10B981' },
    { value: 'deferred', label: 'Adiado', color: '#6B7280' },
    { value: 'cancelled', label: 'Cancelado', color: '#EF4444' }
  ];

  // Carrega as tarefas
  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // Chamar a API para obter tarefas
      const response = await axios.get('/api/taskmaster/tasks', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      
      setTasks(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Falha ao carregar tarefas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega detalhes de uma tarefa específica
  const loadTaskDetails = async (taskId) => {
    try {
      setLoading(true);
      
      // Chamar a API para obter detalhes da tarefa
      const response = await axios.get(`/api/taskmaster/tasks/${taskId}`);
      
      setSelectedTask(response.data);
      setActiveView('detail');
      setError(null);
    } catch (err) {
      console.error(`Erro ao carregar detalhes da tarefa ${taskId}:`, err);
      setError(`Falha ao carregar detalhes da tarefa ${taskId}.`);
    } finally {
      setLoading(false);
    }
  };

  // Atualiza o status de uma tarefa
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      setLoading(true);
      
      // Chamar a API para atualizar o status da tarefa
      await axios.patch(`/api/taskmaster/tasks/${taskId}/status`, {
        status: newStatus
      });
      
      // Recarregar a lista de tarefas
      await loadTasks();
      
      // Se estiver visualizando a tarefa, recarregar os detalhes
      if (selectedTask && selectedTask.id === taskId) {
        await loadTaskDetails(taskId);
      }
      
      setError(null);
    } catch (err) {
      console.error(`Erro ao atualizar status da tarefa ${taskId}:`, err);
      setError(`Falha ao atualizar status da tarefa ${taskId}.`);
    } finally {
      setLoading(false);
    }
  };

  // Criar uma nova tarefa
  const createTask = async () => {
    try {
      setLoading(true);
      
      // Chamar a API para criar a tarefa
      await axios.post('/api/taskmaster/tasks', formData);
      
      // Recarregar a lista de tarefas
      await loadTasks();
      
      // Voltar para a visualização de lista
      setActiveView('list');
      
      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        details: ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      setError('Falha ao criar tarefa. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Expandir uma tarefa em subtarefas
  const expandTask = async (taskId, numSubtasks = 5) => {
    try {
      setLoading(true);
      
      // Chamar a API para expandir a tarefa
      await axios.post(`/api/taskmaster/tasks/${taskId}/expand`, {
        subtasks: numSubtasks
      });
      
      // Recarregar os detalhes da tarefa
      await loadTaskDetails(taskId);
      
      setError(null);
    } catch (err) {
      console.error(`Erro ao expandir tarefa ${taskId}:`, err);
      setError(`Falha ao expandir tarefa ${taskId}.`);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar tarefas inicialmente e quando o filtro mudar
  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  // Manipular alterações no formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Renderizar a visualização atual
  const renderView = () => {
    switch (activeView) {
      case 'detail':
        return renderTaskDetail();
      case 'create':
        return renderCreateForm();
      case 'edit':
        return renderEditForm();
      case 'list':
      default:
        return renderTaskList();
    }
  };

  // Renderizar a lista de tarefas
  const renderTaskList = () => {
    if (loading && tasks.length === 0) {
      return (
        <div className="flex justify-center py-8">
          <div className="loader">Carregando tarefas...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhuma tarefa encontrada.</p>
          <button 
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setActiveView('create')}
          >
            Criar Nova Tarefa
          </button>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            {availableStatus.map(status => (
              <button
                key={status.value}
                className={`px-3 py-1 rounded text-sm ${statusFilter === status.value ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setActiveView('create')}
          >
            Nova Tarefa
          </button>
        </div>

        <div className="grid gap-4">
          {tasks.map(task => (
            <div 
              key={task.id} 
              className="border rounded-lg p-4 hover:shadow-md cursor-pointer bg-white"
              onClick={() => loadTaskDetails(task.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{task.title}</h3>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded" 
                    style={{ 
                      backgroundColor: availableStatus.find(s => s.value === task.status)?.color + '20',
                      color: availableStatus.find(s => s.value === task.status)?.color
                    }}
                  >
                    {availableStatus.find(s => s.value === task.status)?.label}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 mt-2">{task.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">ID: {task.id}</span>
                <span className="text-sm text-gray-500">Prioridade: {task.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar detalhes da tarefa
  const renderTaskDetail = () => {
    if (!selectedTask) {
      return (
        <div className="text-center py-8">
          <p>Nenhuma tarefa selecionada.</p>
          <button 
            className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setActiveView('list')}
          >
            Voltar para Lista
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
          <div className="flex space-x-2">
            <button 
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
              onClick={() => setActiveView('list')}
            >
              Voltar
            </button>
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
              onClick={() => expandTask(selectedTask.id)}
            >
              Expandir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-600">ID: {selectedTask.id}</p>
            <p className="text-gray-600">Prioridade: {selectedTask.priority}</p>
          </div>
          <div>
            <p className="text-gray-600">
              Status: 
              <select 
                className="ml-2 p-1 border rounded"
                value={selectedTask.status}
                onChange={(e) => updateTaskStatus(selectedTask.id, e.target.value)}
              >
                {availableStatus.filter(s => s.value !== 'all').map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </p>
            {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
              <p className="text-gray-600">
                Dependências: {selectedTask.dependencies.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Descrição</h3>
          <p className="text-gray-800">{selectedTask.description}</p>
        </div>

        {selectedTask.details && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Detalhes</h3>
            <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap">
              {selectedTask.details}
            </div>
          </div>
        )}

        {selectedTask.testStrategy && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Estratégia de Teste</h3>
            <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap">
              {selectedTask.testStrategy}
            </div>
          </div>
        )}

        {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Subtarefas</h3>
            <div className="bg-gray-50 p-4 rounded border">
              {selectedTask.subtasks.map(subtask => (
                <div 
                  key={subtask.id}
                  className="py-2 border-b last:border-b-0 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{subtask.id}:</span> {subtask.title}
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded" 
                    style={{ 
                      backgroundColor: availableStatus.find(s => s.value === subtask.status)?.color + '20',
                      color: availableStatus.find(s => s.value === subtask.status)?.color
                    }}
                  >
                    {availableStatus.find(s => s.value === subtask.status)?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar formulário de criação
  const renderCreateForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Criar Nova Tarefa</h2>
          <button 
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
            onClick={() => setActiveView('list')}
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createTask(); }}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="title">
              Título
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="title"
              name="title"
              type="text"
              placeholder="Título da tarefa"
              value={formData.title}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="description">
              Descrição
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="description"
              name="description"
              placeholder="Descrição da tarefa"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="priority">
              Prioridade
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleFormChange}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="details">
              Detalhes
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="details"
              name="details"
              placeholder="Detalhes da tarefa"
              value={formData.details}
              onChange={handleFormChange}
              rows={6}
            />
          </div>

          <div className="flex justify-end">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Renderizar formulário de edição (não implementado)
  const renderEditForm = () => {
    return (
      <div className="bg-gray-100 p-4 rounded">
        <p>Funcionalidade de edição ainda não implementada.</p>
        <button 
          className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setActiveView('detail')}
        >
          Voltar para Detalhes
        </button>
      </div>
    );
  };

  return (
    <div className="taskmaster-ui bg-gray-100 p-6 rounded-lg">
      {showTitle && (
        <h1 className="text-3xl font-bold mb-6 border-b pb-2">TaskMaster</h1>
      )}
      
      {renderView()}
      
      {loading && activeView !== 'list' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p>Processando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMasterUI;
