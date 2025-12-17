'use client';

import { useState, useEffect } from 'react';
import { Home as HomeIcon, MessageSquare, BookOpen, BarChart3, Settings, Plus, FolderOpen } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/components/Auth/AuthScreen';
// import db from './db/database';

import * as unifiedDB from '@/db/unifiedDB';

import { getActiveInsights } from '@/db/unifiedDB';

import ProjectDetails from '@/components/ProjectDetails';
import ProjectForm from '@/components/ProjectForm';
import AIChat from '@/components/AIChat';
import JournalList from '@/components/JournalList';
import QuickTimeLog from '@/components/QuickTimeLog';
import Analytics from '@/components/Analytics';
import AppSettings from '@/components/AppSettings';

import InsightsPanel from '@/components/InsightsPanel';
import TimeLogsView from '@/components/TimeLogsView';
import ProjectsListView from '@/components/ProjectsListView';
import { setJournalUserId } from '@/db/journal';
import HomeScreen from '@/components/HomeScreen';


export default function HomePage() {
  const { currentUser } = useAuth();
 
  const [currentScreen, setCurrentScreen] = useState('home');

  const [projects, setProjects] = useState([]);
  const [todayHours, setTodayHours] = useState(0);
  const [topInsights, setTopInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const loadData = async () => {
    console.log('🔄 Loading data...');
    try {
      console.log('📦 Fetching projects...');
      const allProjects = await unifiedDB.getAllProjects();
      console.log('📦 Projects fetched:', allProjects);
      // Show active and planning projects on home
      const visibleProjects = allProjects.filter(p => 
        p.status === 'active' || p.status === 'planning'
      );
      console.log('👁️ Visible projects:', visibleProjects);
      setProjects(visibleProjects);
      
      console.log('⏰ Fetching time logs...');
      const todayLogs = await unifiedDB.getTodayTimeLogs();
      console.log('⏰ Today logs:', todayLogs);
      const totalToday = todayLogs.reduce((sum, log) => sum + log.duration, 0);
    
      setTodayHours(totalToday);
    
      // Load insights separately with error handling
      try {
        const insights = await getActiveInsights();
        console.log('💡 Insights:', insights);
        setTopInsights(insights.slice(0, 2));
      } catch (insightError) {
        console.error('Error loading insights:', insightError);
        setTopInsights([]); // Set empty array if insights fail
      }
    
      setLoading(false);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    console.log('Project clicked: ', project);
    console.log('handleProjectClick called:', project.name);
    console.log('Before - showProjectDetails:', showProjectDetails);

    setSelectedProject(project);
    setShowProjectDetails(true);
  };

   const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectDetails(false);
    setShowProjectForm(true);
  };

  const handleCloseDetails = () => {
    setShowProjectDetails(false);
    setSelectedProject(null);
  };

  const handleCloseForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleProjectSaved = () => {
    loadData();
  };

  const handleProjectDeleted = () => {
    loadData();
  };

  // Set the user for unified DB
  useEffect(() => {
      console.log('🔐 Setting user:', currentUser?.uid);
      
    if (currentUser) {
      unifiedDB.setCurrentUser(currentUser.uid);
      setJournalUserId(currentUser.uid);
    } else {
      unifiedDB.setCurrentUser(null);
      setJournalUserId(null);
    }
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (currentUser){
      loadData();
    }

    // Listen for time log additions
    const handleTimeLogAdded = () => loadData();
    window.addEventListener('timeLogAdded', handleTimeLogAdded);
  
    // Listen for navigation to time logs
    const handleNavigateToTimeLogs = () => setCurrentScreen('timelogs');
    window.addEventListener('navigateToTimeLogs', handleNavigateToTimeLogs);
  
    return () => {
      window.removeEventListener('timeLogAdded', handleTimeLogAdded);
      window.removeEventListener('navigateToTimeLogs', handleNavigateToTimeLogs);
    };
  }, [currentUser]);

    // Navigation items
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'chat', icon: MessageSquare, label: 'AI Advisor' },
    { id: 'journal', icon: BookOpen, label: 'Journal' },
    { id: 'stats', icon: BarChart3, label: 'Analytics' }
  ];

  console.log('Modal check - showProjectDetails:', {showProjectDetails});
  console.log('Modal check - selectedProject:', {selectedProject});

  // If not logged in, show auth screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  // If logged in but still loading data, show loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl animate-pulse">
            R
          </div>
          <p className="text-gray-600">Loading RetireWise...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">RetireWise</h1>
            <p className="text-xs text-gray-500">MVP v0.2</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen('projects')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentScreen('insights')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <Lightbulb className="w-5 h-5 text-gray-600" />
            {topInsights && topInsights.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full"></span>
            )}
          </button>
          <button 
            onClick={() => setCurrentScreen('settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentScreen === 'home' && <HomeScreen
          projects={projects}
          todayHours={todayHours}
          topInsights={topInsights}
          setCurrentScreen={setCurrentScreen}
          setShowProjectForm={setShowProjectForm}
          handleProjectClick={handleProjectClick}
         />
         }

        {currentScreen === 'chat' && (
          <div className="h-full -m-4">
            <AIChat />
          </div>
        )}
        {currentScreen === 'projects' && (
          <ProjectsListView
            onProjectClick={handleProjectClick}
            onEditProject={handleEditProject}
            onNewProject={() => setShowProjectForm(true)}
          />
        )}
        {currentScreen === 'journal' && <JournalList />}
        {currentScreen === 'stats' && <Analytics />}
        {currentScreen === 'insights' && <InsightsPanel />}
        {currentScreen === 'settings' && <AppSettings />}
        {currentScreen === 'timelogs' && <TimeLogsView />}

      </div>

      {/* Quick Time Log Button (only on Home screen) */}
      {currentScreen === 'home' && <QuickTimeLog />}

      {/* Floating Action Button (only on Home screen) */}
      {currentScreen === 'home' && (
        <button
          onClick={() => setShowProjectForm(true)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      

      {showProjectDetails && selectedProject && (
        <ProjectDetails
          projectId={selectedProject.id}
          onClose={handleCloseDetails}
          onEdit={handleEditProject}
          onDeleted={handleProjectDeleted}
        />
      )}


      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onClose={handleCloseForm}
          onSaved={handleProjectSaved}
        />
      )}
    </div>
  );
}

