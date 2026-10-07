import type { HealthStatus } from '../../types';
import { apiFetch } from './apiClient';

export const healthApi = {
  checkHealth: async (): Promise<HealthStatus> => {
    try {
      const basic = await apiFetch<{ status: string }>('/health');
      let dbConnected = false;
      try {
        const dbRes = await apiFetch<{ status: string }>('/health/db');
        dbConnected = dbRes.status === 'ok';
      } catch {
        dbConnected = false;
      }

      return {
        status: basic.status === 'ok' ? 'ok' : 'degraded',
        mode: 'api',
        apiConnected: true,
        dbConnected,
        version: '0.1.0',
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        status: 'unavailable',
        mode: 'api',
        apiConnected: false,
        dbConnected: false,
        version: '0.1.0',
        timestamp: new Date().toISOString()
      };
    }
  }
};
