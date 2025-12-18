'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProjectDetails from '@/components/ProjectDetails';
import ProjectForm from '@/components/ProjectForm';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleClose = () => {
    router.back(); // Go back to previous page
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditForm(true);
  };

  const handleDeleted = () => {
    router.push('/'); // Go to home after deletion
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingProject(null);
  };

  const handleProjectSaved = () => {
    handleCloseEditForm();
    // ProjectDetails will auto-refresh
  };

  return (
    <AppLayout>
      <ProjectDetails
        projectId={params.id}
        onClose={handleClose}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
      />

      {showEditForm && editingProject && (
        <ProjectForm
          project={editingProject}
          onClose={handleCloseEditForm}
          onSaved={handleProjectSaved}
        />
      )}
    </AppLayout>
  );
}