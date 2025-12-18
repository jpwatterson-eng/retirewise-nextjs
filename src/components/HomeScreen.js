'use client';

import { Lightbulb, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function HomeScreen({ 
  todayHours = 0, 
  topInsights = [], 
  setCurrentScreen, 
  projects = [], 
  handleProjectClick,
  setShowProjectForm 
}) {
  const router = useRouter();
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">Welcome to</p>
            <h2 className="text-3xl font-bold">RetireWise</h2>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Today</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold">{(todayHours || 0).toFixed(1)}</p>
              <p className="text-sm">hours</p>
            </div>
          </div>
        </div>
        <p className="text-sm opacity-90">Your intelligent retirement portfolio advisor</p>
      </div>

      {/* Top Insights Preview */}
      {topInsights && topInsights.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Latest Insights
            </h3>
            <button
              onClick={() => router.push('insights')}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {topInsights.map(insight => (
              <div key={insight.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800">{insight.title}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Your Projects</h3>
          <span className="text-sm text-gray-500">{projects.length} active</span>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No projects yet. Create your first one to get started!</p>
            <button 
              onClick={() => setShowProjectForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                >
                  {project.icon || project.name[0]}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-gray-800 truncate">{project.name}</p>
                  <p className="text-xs text-gray-500">
                    {project.totalHoursLogged}h logged
                    {project.lastWorkedAt && ` • Last: ${new Date(project.lastWorkedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                  project.status === 'active' ? 'bg-green-100 text-green-700' :
                  project.status === 'planning' ? 'bg-purple-100 text-purple-700' :
                  project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {project.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}