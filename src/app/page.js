'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/components/Auth/AuthScreen';
import AppLayout from '@/components/AppLayout';
import HomeScreen from '@/components/HomeScreen';
import ProjectForm from '@/components/ProjectForm';
import * as unifiedDB from '@/db/unifiedDB';
import { getActiveInsights } from '@/db/unifiedDB';
import { setJournalUserId } from '@/db/journal';

export default function HomePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [projects, setProjects] = useState([]);
  const [todayHours, setTodayHours] = useState(0);
  const [topInsights, setTopInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const loadData = async () => {
    try {
      const allProjects = await unifiedDB.getAllProjects();
      const visibleProjects = allProjects.filter(p => 
        p.status === 'active' || p.status === 'planning'
      );
      setProjects(visibleProjects);
      
      const todayLogs = await unifiedDB.getTodayTimeLogs();
      const totalToday = todayLogs.reduce((sum, log) => sum + log.duration, 0);
      setTodayHours(totalToday);
    
      try {
        const insights = await getActiveInsights();
        setTopInsights(insights.slice(0, 2));
      } catch (insightError) {
        console.error('Error loading insights:', insightError);
        setTopInsights([]);
      }
    
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleCloseForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleProjectSaved = () => {
    loadData();
    handleCloseForm();
  };

  // useEffect(() => {
  //  if (currentUser) {
  //    unifiedDB.setCurrentUser(currentUser.uid);
  //    setJournalUserId(currentUser.uid);
  //  } else {
  //    unifiedDB.setCurrentUser(null);
  //    setJournalUserId(null);
  //  }
  //}, [currentUser]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser) {
      loadData();
    }

    const handleTimeLogAdded = () => loadData();
    window.addEventListener('timeLogAdded', handleTimeLogAdded);
  
    return () => {
      window.removeEventListener('timeLogAdded', handleTimeLogAdded);
    };
  }, [currentUser]);

  if (!currentUser) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden animate-pulse">
            <img src="/icons/icon-192x192.png" alt="RetireWise" className="w-full h-full" />
          </div>
          <p className="text-gray-600">Loading RetireWise...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout showFAB={true}>
      <HomeScreen
        todayHours={todayHours}
        topInsights={topInsights}
        projects={projects}
        handleProjectClick={handleProjectClick}
        setShowProjectForm={setShowProjectForm}
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