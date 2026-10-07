import React, { useEffect, useState } from 'react';
import { ProjectCard } from '../components/projects/ProjectCard';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { projectsService } from '../services';
import type { Project } from '../types';
import { Button } from '../components/ui/Button';
import { FolderKanban, Plus } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = () => {
    projectsService.getProjects().then(setProjects);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#00296B]" /> Verification Projects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage data verification projects, grouped datasets, and analytical claim history
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadProjects}
      />
    </div>
  );
};
