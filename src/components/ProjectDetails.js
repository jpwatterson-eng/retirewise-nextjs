// src/components/ProjectDetails.js
'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Clock, Target, TrendingUp, Calendar } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';

// import { getProjectWithStats } from '../db/projects';
import { format } from 'date-fns';

const ProjectDetails = ({ projectId, onClose, onEdit, onDeleted }) => {

  console.log('## ProjectDetails RENDERING with projectId: ', projectId);
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

//  const loadProject = async () => {
//    try {
//      // const projectData = await getProjectWithStats(projectId);
//      const projectData = await unifiedDB.getProjectWithStats(projectId);
//
//      if (!projectData) {
//        console.error('Project not found:', projectId);
//        return;
//      }
//
//      setProject(projectData);
//      setLoading(false);
//    } catch (error) {
//      console.error('Error loading project:', error);
//      setLoading(false);
//    }
//  };

// In ProjectDetails.js, replace the loadProject function (around line 19-36):

const loadProject = async () => {
  try {
    const result = await unifiedDB.getProjectWithStats(projectId);
    
    if (!result || !result.project) {
      console.error('Project not found:', projectId);
      return;
    }

    // Merge project and stats into one object for easier access
    const projectData = {
      ...result.project,
      stats: result.stats
    };

    setProject(projectData);
    setLoading(false);
  } catch (error) {
    console.error('Error loading project:', error);
    setLoading(false);
  }
};

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.name}"? This will also delete all related time logs and journal entries. This cannot be undone.`)) {
    return;
  }
    
    try {
      await unifiedDB.deleteProject(projectId);
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  
  if (!project) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'planning': return 'bg-purple-100 text-purple-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'complete': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      building: 'Building',
      consulting: 'Consulting',
      learning: 'Learning',
      contributing: 'Contributing',
      wildcard: 'Wildcard'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-semibold"
              style={{ backgroundColor: project.color }}
            >
              {project.icon || project.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className="text-xs text-gray-500">{getTypeLabel(project.type)}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Total Hours</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{project.totalHoursLogged}h</p>
              {project.targetHours && (
                <p className="text-xs text-blue-600 mt-1">
                  of {project.targetHours}h target
                </p>
              )}
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">This Week</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {project.stats.lastWeekHours}h
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Days Active</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {project.stats.daysActive}
              </p>
            </div>

            <div className="bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">Entries</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {project.stats.totalJournalEntries}
              </p>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 text-sm">{project.description}</p>
            </div>
          )}

          {/* Motivation */}
          {project.motivation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Motivation</h3>
              <p className="text-gray-600 text-sm italic">"{project.motivation}"</p>
            </div>
          )}

          {/* Goals */}
          {project.goals && project.goals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Goals</h3>
              <ul className="space-y-1">
                {project.goals.map((goal, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-200">
            <p>Created: {format(new Date(project.createdAt), 'MMM d, yyyy')}</p>
            {project.startedAt && (
              <p>Started: {format(new Date(project.startedAt), 'MMM d, yyyy')}</p>
            )}
            {project.lastWorkedAt && (
              <p>Last worked: {format(new Date(project.lastWorkedAt), 'MMM d, yyyy')}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onEdit(project)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Edit Project
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Project?</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete "{project.name}" and all associated time logs and journal entries. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;