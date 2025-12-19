// src/components/ProjectsListView.js
'use client';

import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, Filter, Clock } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';

const ProjectsListView = ({ onProjectClick, onEditProject, onNewProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadProjects();
    
    // Listen for project updates
    const handleProjectUpdated = () => {
      console.log('🔄 Refreshing projects list');
      loadProjects();
    };
  
    window.addEventListener('projectUpdated', handleProjectUpdated);
  
    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdated);
    };
  }, []);

  const loadProjects = async () => {
    try {
      const allProjects = await unifiedDB.getAllProjects();
      setProjects(allProjects);
      setLoading(false);
    } catch (error) {
      console.error('Error loading projects:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    if (!window.confirm(`Delete "${projectName}"? This will also delete all related time logs and journal entries. This cannot be undone.`)) {
      return;
    }
    
    try {
      await unifiedDB.deleteProject(projectId);
      await loadProjects();
      console.log('✅ Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const getFilteredProjects = () => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => p.status === statusFilter);
  };

  const filteredProjects = getFilteredProjects();

  const statusCounts = {
    all: projects.length,
    planning: projects.filter(p => p.status === 'planning').length,
    active: projects.filter(p => p.status === 'active').length,
    paused: projects.filter(p => p.status === 'paused').length,
    completed: projects.filter(p => p.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-blue-600" />
            All Projects
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredProjects.length} projects
          </p>
        </div>
        <button
          onClick={onNewProject}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New
        </button>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
          <Filter className="w-4 h-4" />
          Filter by Status
        </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All', count: statusCounts.all },
            { value: 'planning', label: 'Planning', count: statusCounts.planning },
            { value: 'active', label: 'Active', count: statusCounts.active },
            { value: 'paused', label: 'Paused', count: statusCounts.paused },
            { value: 'completed', label: 'Completed', count: statusCounts.completed }
          ].map(status => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.label} ({status.count})
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {projects.length === 0 
              ? "No projects yet. Create your first one!"
              : `No ${statusFilter} projects.`
            }
          </p>
          {projects.length === 0 && (
            <button
              onClick={onNewProject}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* Project Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                >
                  {project.icon || project.name[0]}
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      project.status === 'active' ? 'bg-green-100 text-green-700' :
                      project.status === 'planning' ? 'bg-purple-100 text-purple-700' :
                      project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {project.status}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{project.totalHoursLogged || 0}h logged</span>
                    </div>
                    {project.lastWorkedAt && (
                      <span className="text-xs">
                        Last: {new Date(project.lastWorkedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onProjectClick(project)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onEditProject(project)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsListView;