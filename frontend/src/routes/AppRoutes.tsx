import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutShell } from '../components/layout/LayoutShell';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { DatasetsPage } from '../pages/DatasetsPage';
import { UploadDatasetPage } from '../pages/UploadDatasetPage';
import { DatasetReadyPage } from '../pages/DatasetReadyPage';
import { DatasetDetailPage } from '../pages/DatasetDetailPage';
import { AnalyzePage } from '../pages/AnalyzePage';
import { AnalysisDetailPage } from '../pages/AnalysisDetailPage';
import { HistoryPage } from '../pages/HistoryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ApiStatusPage } from '../pages/ApiStatusPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SignInPage } from '../pages/SignInPage';
import { useAuth } from '../auth/useAuth';

export const AppRoutes: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-slate-50 text-sm font-semibold text-slate-600">Restoring secure session…</main>;
  }
  if (!session) return <SignInPage />;

  return (
    <LayoutShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/upload" element={<UploadDatasetPage />} />
        <Route path="/datasets/ready" element={<DatasetReadyPage />} />
        <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/analysis/:analysisId" element={<AnalysisDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/api-status" element={<ApiStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutShell>
  );
};
