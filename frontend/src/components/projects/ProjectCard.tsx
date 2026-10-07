import React from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import { FolderKanban, Database, Sparkles, ArrowRight } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00509D] flex items-center justify-center font-bold border border-blue-100 group-hover:bg-[#00296B] group-hover:text-white transition-colors">
            <FolderKanban className="w-5 h-5 stroke-[2]" />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            project.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {project.status}
          </span>
        </div>

        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-[#00509D] transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-700 font-semibold" title="Associated Datasets">
            <Database className="w-3.5 h-3.5 text-[#00509D]" /> {project.datasetCount} Datasets
          </span>
          <span className="flex items-center gap-1 text-slate-700 font-semibold" title="Executed Analyses">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {project.analysisCount} Analyses
          </span>
        </div>

        <Link
          to={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#00509D] hover:text-[#00296B] hover:underline"
        >
          Open <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
