import { getDemoModeSetting } from '../config/env';
import type { Dataset, HealthStatus, Project } from '../types';
import { datasetsApi } from './api/datasetsApi';
import { healthApi } from './api/healthApi';
import { projectsApi } from './api/projectsApi';
import { DEMO_DATASET, demoDatasetsList } from './demo/demoDatasets';
import { demoProjectsList } from './demo/demoProjects';

let localProjectsState = [...demoProjectsList];
let localDatasetsState = [...demoDatasetsList];

export const projectsService = {
  getProjects: async (): Promise<Project[]> => {
    if (getDemoModeSetting()) {
      return Promise.resolve([...localProjectsState]);
    }
    try {
      return await projectsApi.getProjects();
    } catch {
      return [...localProjectsState];
    }
  },

  getProject: async (projectId: string): Promise<Project> => {
    if (getDemoModeSetting()) {
      const found = localProjectsState.find(p => p.id === projectId);
      if (found) return Promise.resolve(found);
      return Promise.reject(new Error(`Project ${projectId} not found`));
    }
    try {
      return await projectsApi.getProject(projectId);
    } catch {
      const found = localProjectsState.find(p => p.id === projectId);
      if (found) return found;
      throw new Error(`Project ${projectId} not found`);
    }
  },

  createProject: async (name: string, description: string): Promise<Project> => {
    if (getDemoModeSetting()) {
      const newProj: Project = {
        id: `proj-${Date.now().toString(36)}`,
        name,
        description,
        status: 'active',
        datasetCount: 0,
        analysisCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localProjectsState.unshift(newProj);
      return Promise.resolve(newProj);
    }
    return projectsApi.createProject(name, description);
  }
};

export const datasetsService = {
  getDatasets: async (): Promise<Dataset[]> => {
    if (getDemoModeSetting()) {
      return Promise.resolve([...localDatasetsState]);
    }
    try {
      return await datasetsApi.getDatasets();
    } catch {
      return [...localDatasetsState];
    }
  },

  getDataset: async (datasetId: string): Promise<Dataset> => {
    if (getDemoModeSetting()) {
      const found = localDatasetsState.find(d => d.id === datasetId);
      if (found) return Promise.resolve(found);
      return Promise.resolve(DEMO_DATASET);
    }
    try {
      return await datasetsApi.getDataset(datasetId);
    } catch {
      return DEMO_DATASET;
    }
  },

  uploadDataset: async (file: File): Promise<Dataset> => {
    if (getDemoModeSetting()) {
      const newDs: Dataset = {
        id: `ds-${Date.now().toString(36)}`,
        name: file.name,
        status: 'READY',
        createdAt: new Date().toISOString(),
        profile: {
          rowCount: Math.floor(Math.random() * 500000 + 50000),
          columnCount: 12,
          fileSizeBytes: file.size,
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          encoding: 'UTF-8',
          uploadedAt: new Date().toISOString(),
          qualityScore: 97.8,
          duplicateRowCount: 124,
          columns: DEMO_DATASET.profile.columns
        },
        previewRows: DEMO_DATASET.previewRows
      };
      localDatasetsState.unshift(newDs);
      return Promise.resolve(newDs);
    }

    await datasetsApi.uploadDataset(file);
    return DEMO_DATASET;
  }
};

export const healthService = {
  checkHealth: async (): Promise<HealthStatus> => {
    const isDemo = getDemoModeSetting();
    if (isDemo) {
      return Promise.resolve({
        status: 'ok',
        mode: 'demo',
        apiConnected: true,
        dbConnected: true,
        version: '0.1.0-demo',
        timestamp: new Date().toISOString()
      });
    }
    return healthApi.checkHealth();
  }
};
