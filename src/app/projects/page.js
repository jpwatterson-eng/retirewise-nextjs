'use client';

import React, { useState, useEffect } from 'react';
import * as unifiedDB from '@/db/unifiedDB';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProjectsListView from '@/components/ProjectsListView';
import ProjectForm from '@/components/ProjectForm';

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

    useEffect(() => {
    // Real-time subscription
    const unsubscribe = unifiedDB.subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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