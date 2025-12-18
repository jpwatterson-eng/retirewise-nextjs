'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProjectsListView from '@/components/ProjectsListView';
import ProjectForm from '@/components/ProjectForm';

export default function ProjectsPage() {
  const router = useRouter();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleProjectClick = (project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleCloseForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleProjectSaved = () => {
    handleCloseForm();
    // ProjectsListView will auto-refresh via event listener
  };

  return (
    <AppLayout>
      <ProjectsListView
        onProjectClick={handleProjectClick}
        onEditProject={handleEditProject}
        onNewProject={handleNewProject}
      />

      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onClose={handleCloseForm}
          onSaved={handleProjectSaved}
        />
      )}
    </AppLayout>
  );
}