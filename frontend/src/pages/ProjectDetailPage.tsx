import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsService, datasetsService } from '../services';
import type { Project, Dataset, Analysis } from '../types';
import { FolderKanban, Database, Sparkles, ArrowLeft } from 'lucide-react';
import { RecentAnalysesTable } from '../components/dashboard/RecentAnalysesTable';
import { Button } from '../components/ui/Button';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [analyses] = useState<Analysis[]>([]);

  useEffect(() => {
    if (projectId) {
      projectsService.getProject(projectId).then(setProject).catch(() => {});
      datasetsService.getDatasets().then(setDatasets);
    }
  }, [projectId]);

  if (!project) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading project details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00296B] flex items-center justify-center font-bold border border-blue-100">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">{project.name}</h1>
                <p className="text-xs text-slate-500">{project.description}</p>
              </div>
            </div>

            <Link to="/analyze">
              <Button variant="amber" icon={Sparkles}>
                Run New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00509D]" /> Project Datasets
          </h3>
          <div className="space-y-2">
            {datasets.slice(0, 2).map((ds) => (
              <div key={ds.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{ds.name}</div>
                  <div className="text-[11px] text-slate-500">{ds.profile.rowCount.toLocaleString()} rows • {ds.profile.columnCount} columns</div>
                </div>
                <Link to={`/datasets/${ds.id}`}>
                  <Button size="sm" variant="outline">Inspect Profile</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Verification Summary
          </h3>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Verification results are returned by the API and are not persisted as project history yet.
          </p>
        </div>
      </div>

      <RecentAnalysesTable analyses={analyses} />
    </div>
  );
};
