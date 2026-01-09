// src/components/ProjectDetails.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit2, Trash2, Clock, Target, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as unifiedDB from '@/db/unifiedDB';
import { getPerspective, getPerspectiveColor, getPerspectiveIcon } from '@/utils/perspectiveHelpers';
import ProjectForm from './ProjectForm';
import TimeLogForm from './TimeLogForm';

const MASTERY_TIERS = [
  { level: 1, minHours: 0, title: "Novice", color: "text-slate-400", bg: "bg-slate-50", icon: "🌱" },
  { level: 2, minHours: 10, title: "Apprentice", color: "text-blue-500", bg: "bg-blue-50", icon: "🛠️" },
  { level: 3, minHours: 50, title: "Practitioner", color: "text-purple-500", bg: "bg-purple-50", icon: "📈" },
  { level: 4, minHours: 100, title: "Expert", color: "text-orange-500", bg: "bg-orange-50", icon: "🔥" },
  { level: 5, minHours: 250, title: "Master", color: "text-yellow-600", bg: "bg-yellow-50", icon: "👑" },
];

const getMastery = (hours) => {
  return [...MASTERY_TIERS].reverse().find(t => hours >= t.minHours) || MASTERY_TIERS[0];
};

const ProjectDetails = ({ projectId }) => {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

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

  const mastery = getMastery(stats?.totalHours || 0);
  
  const nextRank = MASTERY_TIERS.find(t => t.level === mastery.level + 1);
const progressToNext = nextRank 
  ? ((stats.totalHours - mastery.minHours) / (nextRank.minHours - mastery.minHours)) * 100 
  : 100;
  
  
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
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 relative overflow-hidden">
  {/* Line 1: Icon + Name */}
  <div className="flex items-center gap-3 mb-3">
    {project.icon && (
      <span className="text-3xl flex-shrink-0">{project.icon}</span>
    )}
    <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
    
  </div>
<div className="absolute top-0 right-0 p-4">
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl ${mastery.bg} border-2 border-white shadow-inner`}>
          <span className="text-xl">{mastery.icon}</span>
          <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400">Lvl {mastery.level}</span>
        </div>
      </div>

<div className="flex items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{project.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${mastery.color}`}>
              {mastery.title} Rank
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {stats?.totalHours?.toFixed(1)} Total Hours
            </span>
          </div>
        </div>
      </div>


  {/* Content Container - Always Left Aligned (no conditional margin) */}
  <div>
    {/* Perspective Badge */}
    {perspective && (
      <div className="flex flex-wrap items-center gap-2 mb-3">
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

    {/* Perspective Description */}
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

    {/* Description */}
    {project.description && (
      <p className="text-gray-600 mb-3">{project.description}</p>
    )}
    
    {/* Motivation */}
    {project.motivation && (
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Why:</span> {project.motivation}
        </p>
      </div>
    )}

    {/* Tags */}
    {project.tags && project.tags.length > 0 && (
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
    )}
  </div>

  {/* Goals - Full Width */}
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

          {nextRank && (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-4">
    <div className="flex justify-between items-end mb-2">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Rank: {nextRank.title}</p>
      <p className="text-xs font-bold text-blue-600">{(nextRank.minHours - stats.totalHours).toFixed(1)}h to go</p>
    </div>
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
      <div 
        className={`h-full transition-all duration-1000 rounded-full ${mastery.color.replace('text', 'bg')}`}
        style={{ width: `${Math.min(progressToNext, 100)}%` }}
      />
    </div>
  </div>
)}


{/* UPGRADED ACTIVITY HISTORY SECTION */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
  <div className="flex items-center justify-between mb-8">
    <div>
      <h3 className="text-lg font-bold text-gray-800">Project History</h3>
      <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">The Journey to Mastery</p>
    </div>
    <button
      onClick={() => setShowTimeLog(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 text-sm font-bold"
    >
      + Log Time
    </button>
  </div>

  {timeLogs.length === 0 ? (
    <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-10 text-center">
      <p className="text-gray-400 text-sm italic">No logs recorded for this journey yet.</p>
    </div>
  ) : (
    <div className="relative border-l-2 border-gray-100 ml-4 pl-8 space-y-10">
      {timeLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, showAllLogs ? undefined : 5) // undefined means "no limit"
      .map((log) => (
        <div key={log.id} className="relative pl-8 pb-3 last:pb-0">
          {/* Timeline Connector Dot */}
          <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-600 shadow-sm" />
          
          <div className="group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {new Date(log.date).toLocaleDateString(undefined, { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  {/* Fallback to 'Verified' if activity isn't present */}
                  {log.activityType || "General Activity"}
                </p>
            {log.notes && (
                 <p className="text-xs text-gray-500 mt-1 italic leading-relaxed max-w-md">
                  "{log.notes}"
                </p>          
            )}
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                  {log.duration}h
                </span>
              </div>
            </div>
            
            {/* Optional interaction footer for future "Edit" feature */}
            <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                setEditingTimeLog(log);
                setShowTimeLog(true);
                }}
                className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600"
              >
                 Edit Entry
               </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Visual Indicator of more history */}
{timeLogs.length > 5 && (
  <div className="pt-6 text-center border-t border-gray-50">
    <button 
      onClick={() => setShowAllLogs(!showAllLogs)}
      className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]"
    >
      {showAllLogs ? "Collapse Chronicle" : `View Full Chronicle (+${timeLogs.length - 5} More)`}
    </button>
  </div>
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
    projectName={project?.name || "Unknown Project"} 
    log={editingTimeLog} // Corrected prop name to 'log'
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