"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { showError, showSuccess } from "@/utils/toast";
import { useSession } from "../components/SessionContextProvider";

export interface Task {
  id: string;
  created_at: string;
  client: string | null;
  project_campaign: string | null;
  task_description: string;
  responsible_id: string | null;
  status: 'Pendente' | 'Em Progresso' | 'Concluído' | 'Cancelado';
  due_date: string | null;
  observations: string | null;
  created_by: string | null;
}

interface CreateTaskPayload {
  client?: string;
  project_campaign?: string;
  task_description: string;
  responsible_id: string;
  status?: 'Pendente' | 'Em Progresso' | 'Concluído' | 'Cancelado';
  due_date?: string;
  observations?: string;
}

interface UpdateTaskPayload {
  id: string;
  client?: string;
  project_campaign?: string;
  task_description?: string;
  responsible_id?: string;
  status?: 'Pendente' | 'Em Progresso' | 'Concluído' | 'Cancelado';
  due_date?: string;
  observations?: string;
}

interface FetchTasksFilters {
  status?: Task['status'] | 'Todos';
  responsible_id?: string | 'Todos';
  page?: number;
  pageSize?: number;
}

export const useTasks = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user?.id;

  const fetchTasks = (filters: FetchTasksFilters = {}) =>
    useQuery<{ tasks: Task[]; totalCount: number }, Error>({
      queryKey: ["tasks", filters],
      queryFn: async () => {
        const { page = 1, pageSize = 9 } = filters;
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (filters.status && filters.status !== 'Todos') params.set('status', filters.status);
        if (filters.responsible_id && filters.responsible_id !== 'Todos') params.set('responsible_id', filters.responsible_id);
        return api.get<{ tasks: Task[]; totalCount: number }>(`/api/tasks?${params}`);
      },
      enabled: !!userId,
      staleTime: 1000 * 60,
      onError: (error: Error) => showError(`Falha ao carregar as tarefas: ${error.message}`),
    });

  const createTask = useMutation<Task, Error, CreateTaskPayload>({
    mutationFn: async (newTask) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      const data = await api.post<Task>('/api/tasks', { ...newTask, created_by: userId });

      const webhookUrl = import.meta.env.VITE_TASK_WEBHOOK_URL;
      if (webhookUrl?.trim()) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, source: 'Darks Gym App - Task Creation', timestamp: new Date().toISOString() }),
          });
        } catch (e) { console.error('Webhook error (create):', e); }
      }

      showSuccess("Tarefa criada com sucesso!");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (error) => showError(`Falha ao criar tarefa: ${error.message}`),
  });

  const updateTask = useMutation<Task, Error, UpdateTaskPayload>({
    mutationFn: async (updatedTask) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      const { id, ...updates } = updatedTask;
      const data = await api.patch<Task>(`/api/tasks/${id}`, updates);

      const webhookUrl = import.meta.env.VITE_TASK_WEBHOOK_URL;
      if (webhookUrl?.trim()) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, source: 'Darks Gym App - Task Update', timestamp: new Date().toISOString() }),
          });
        } catch (e) { console.error('Webhook error (update):', e); }
      }

      showSuccess("Tarefa atualizada com sucesso!");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (error) => showError(`Falha ao atualizar tarefa: ${error.message}`),
  });

  const deleteTask = useMutation<void, Error, string>({
    mutationFn: async (taskId) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      await api.delete(`/api/tasks/${taskId}`);
      showSuccess("Tarefa excluída com sucesso!");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (error) => showError(`Falha ao excluir tarefa: ${error.message}`),
  });

  return { fetchTasks, createTask, updateTask, deleteTask };
};
