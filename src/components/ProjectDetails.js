// src/components/ProjectDetails.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit2, Trash2, Clock, Target, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as unifiedDB from '@/db/unifiedDB';
import { getPerspective, getPerspectiveColor, getPerspectiveIcon } from '@/utils/perspectiveHelpers';
import ProjectForm from './ProjectForm';
import TimeLogForm from './TimeLogForm';

const ProjectDetails = ({ projectId }) => {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  

const loadProject = useCallback(async () => {
  try {
    const data = await unifiedDB.getProjectWithStats(projectId);
    if (data) {
      setProject(data.project);
      setStats(data.stats);
      
      // Load time logs
      const logs = await unifiedDB.getAllTimeLogs();
      const projectLogs = logs.filter(log => log.projectId === projectId);
      setTimeLogs(projectLogs);
    } else {
      console.error('Project not found:', projectId);
    }
  } catch (error) {
    console.error('Error loading project:', error);
  } finally {
    setLoading(false);
  }
}, [projectId]); // ✅ Dependencies: only projectId

useEffect(() => {
  if (projectId && projectId !== 'new') {
    loadProject();
  }
}, [projectId, loadProject]); // ✅ Now include loadProject


  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await unifiedDB.deleteProject(projectId);
        window.dispatchEvent(new Event('projectUpdated'));
        router.push('/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Project not found</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const perspective = getPerspective(project.perspective);
  const perspectiveColor = getPerspectiveColor(project.perspective);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Project Details</h1>
        <button
          onClick={() => setShowForm(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Edit2 className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
        </button>
      </div>

      {/* Project Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          {project.icon && (
            <div className="text-4xl">{project.icon}</div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{project.name}</h2>
            
            {/* Perspective Badge - NEW */}
            {perspective && (
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ 
                    backgroundColor: `${perspectiveColor}20`,
                    color: perspectiveColor,
                    border: `2px solid ${perspectiveColor}`
                  }}
                >
                  <span className="text-lg">{perspective.icon}</span>
                  <span>{perspective.label}</span>
                  <span className="opacity-75">•</span>
                  <span>{project.perspectiveAlignment}% aligned</span>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-700' :
                  project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  project.status === 'complete' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </div>
              </div>
            )}

            {/* Perspective Description - NEW */}
            {perspective && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{perspective.label}:</span> {perspective.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Examples: {perspective.examples}
                </p>
              </div>
            )}

            {project.description && (
              <p className="text-gray-600 mb-3">{project.description}</p>
            )}
            
            {project.motivation && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Why:</span> {project.motivation}
                </p>
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {project.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Goals */}
        {project.goals && project.goals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Goals</h3>
            <ul className="space-y-2">
              {project.goals.map((goal, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Stats Cards - BETTER RESPONSIVE FIX */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {/* Total Hours */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center bg-blue-100 rounded-lg p-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats?.totalHours?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center bg-green-100 rounded-lg p-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">This Week</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats?.lastWeekHours?.toFixed(1) || '0.0'}
              <span className="text-base">h</span>
            </p>
            {stats?.weeklyChange !== 0 && (
            <p className={`text-xs mt-1 ${stats?.weeklyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats?.weeklyChange > 0 ? '+' : ''}{stats?.weeklyChange.toFixed(0)}%
            </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 col-span-2 sm:col-span-1">
          <div className="text-center">
          <div className="inline-flex items-center justify-center bg-purple-100 rounded-lg p-2 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs text-gray-600 mb-1">Progress</p>
          {project.targetHours ? (
            <>
            <p className="text-2xl font-bold text-gray-800">
              {stats?.completionRate?.toFixed(0) || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.totalHours?.toFixed(0) || 0} / {project.targetHours}h
            </p>
            </>
          ) : (
          <p className="text-sm text-gray-500">No target</p>
          )}
          </div>
        </div>
      </div>

      {/* Time Logs Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Time Logs</h3>
          <button
            onClick={() => setShowTimeLog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Log Time
          </button>
        </div>

        {timeLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No time logs yet</p>
        ) : (
          <div className="space-y-3">
            {timeLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">{log.duration}h</p>
                  {log.activity && (
                    <p className="text-xs text-gray-500">{log.activity}</p>
                  )}
                </div>
              </div>
            ))}
            {timeLogs.length > 5 && (
              <p className="text-sm text-gray-500 text-center pt-2">
                +{timeLogs.length - 5} more logs
              </p>
            )}
          </div>
        )}
      </div>

      {/* Forms */}
      {showForm && (
        <ProjectForm
          project={project}
          onClose={ () => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadProject();
          }}
        />
      )}

      {showTimeLog && (
        <TimeLogForm
          projectId={projectId}
          projectName={project.name}
          timeLog={editingTimeLog}
          onClose={() => {
            setShowTimeLog(false);
            setEditingTimeLog(null);
          }}
          onSaved={() => {
            setShowTimeLog(false);
            setEditingTimeLog(null);
            loadProject();
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetails;