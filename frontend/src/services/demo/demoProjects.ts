import type { Project } from '../../types';

export const demoProjectsList: Project[] = [
  {
    id: 'proj-retail-001',
    name: 'Retail Revenue Intelligence',
    description: 'Historical retail transaction analysis over 1.05M records (2009-2011)',
    status: 'active',
    datasetCount: 1,
    analysisCount: 28,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-07T08:30:00Z'
  },
  {
    id: 'proj-tech-002',
    name: 'SaaS ARR & Retention Audit',
    description: 'B2B subscription revenue and customer churn verification cohort analysis',
    status: 'active',
    datasetCount: 1,
    analysisCount: 14,
    createdAt: '2026-10-03T14:15:00Z',
    updatedAt: '2026-10-06T16:45:00Z'
  },
  {
    id: 'proj-supply-003',
    name: 'Supply Chain Anomaly Detection',
    description: 'Cross-border logistics shipment duration and invoice discrepancies',
    status: 'draft',
    datasetCount: 0,
    analysisCount: 6,
    createdAt: '2026-10-04T11:20:00Z',
    updatedAt: '2026-10-05T12:00:00Z'
  }
];
