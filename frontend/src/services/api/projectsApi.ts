import type { Project } from '../../types';
import { apiFetch } from './apiClient';

export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    return apiFetch<Project[]>('/projects');
  },

  getProject: async (projectId: string): Promise<Project> => {
    return apiFetch<Project>(`/projects/${projectId}`);
  },

  createProject: async (name: string, description: string): Promise<Project> => {
    return apiFetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }
};
