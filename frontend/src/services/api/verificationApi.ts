import { apiFetch } from './apiClient';
import type { DatasetDetail, VerificationResponse } from '../../types/verification';

export const verificationApi = {
  getDataset: (datasetId: string) =>
    apiFetch<DatasetDetail>(`/datasets/${encodeURIComponent(datasetId)}`),

  verify: (datasetId: string, question: string) =>
    apiFetch<VerificationResponse>('/verify', {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, question }),
    }),
};
