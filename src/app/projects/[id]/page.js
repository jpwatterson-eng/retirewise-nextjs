'use client';

import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProjectDetails from '@/components/ProjectDetails';
import ProjectForm from '@/components/ProjectForm';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();

  // Handle "new" project route
  if (params.id === 'new') {
    return (
      <AppLayout>
        <ProjectForm
          onClose={() => router.push('/projects')}
          onSaved={() => router.push('/projects')}
        />
      </AppLayout>
    );
  }

  // Regular project detail
  return (
    <AppLayout>
      <ProjectDetails projectId={params.id} />
    </AppLayout>
  );
}