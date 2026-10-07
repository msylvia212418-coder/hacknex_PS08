import type { Dataset } from '../../types';
import { apiFetch } from './apiClient';

export const datasetsApi = {
  getDatasets: async (): Promise<Dataset[]> => {
    return apiFetch<Dataset[]>('/datasets');
  },

  getDataset: async (datasetId: string): Promise<Dataset> => {
    return apiFetch<Dataset>(`/datasets/${datasetId}`);
  },

  uploadDataset: async (file: File): Promise<{ status: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ status: string; message: string }>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  }
};
