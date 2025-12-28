'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Trash2, Calendar, Filter, X, Search } from 'lucide-react';

import * as unifiedDB from '@/db/unifiedDB';

const TimeLogsView = () => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logs, projs] = await Promise.all([
        unifiedDB.getAllTimeLogs(),
        unifiedDB.getAllProjects()
      ]);
      setTimeLogs(logs);
      setProjects(projs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleEdit = (log) => {
    setEditingLog({ ...log });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    
    try {
      await unifiedDB.updateTimeLog(editingLog.id, {
        projectId: editingLog.projectId,
        duration: parseFloat(editingLog.duration),
        date: editingLog.date,
        notes: editingLog.notes
      });
      
      await loadData();
      setShowEditModal(false);
      setEditingLog(null);
    } catch (error) {
      console.error('Error updating time log:', error);
      alert('Failed to update time log');
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this time log?')) {
      return;
    }
    
    try {
      await unifiedDB.deleteTimeLog(logId);
      await loadData();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('Failed to delete time log');
    }
  };

  // Filter logic
  const getFilteredLogs = () => {
    let filtered = [...timeLogs];

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(log => log.projectId === selectedProject);
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= today;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekAgo;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= monthAgo;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= start && logDate <= end;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredLogs = getFilteredLogs();
  const totalHours = filteredLogs.reduce((sum, log) => sum + log.duration, 0);

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = new Date(log.date).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading time logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-7 h-7 text-blue-600" />
            Time Logs
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredLogs.length} logs • {totalHours.toFixed(1)} hours total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Project Filter */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Date Range</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">From</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">To</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {(selectedProject !== 'all' || dateFilter !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setSelectedProject('all');
              setDateFilter('all');
              setSearchTerm('');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Time Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {timeLogs.length === 0 
              ? "No time logs yet. Start tracking your time!"
              : "No logs match your filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLogs).map(([date, logs]) => (
            <div key={date} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">{date}</h3>
                <span className="text-sm text-gray-500 ml-auto">
                  {logs.reduce((sum, log) => sum + log.duration, 0).toFixed(1)}h
                </span>
              </div>

              <div className="space-y-2">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: log.projectColor || '#6B7280' }}
                    >
                      {log.projectIcon || log.projectName?.[0] || '?'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {log.projectName || 'Unknown Project'}
                          </p>
                          {log.notes && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {log.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-900">
                            {log.duration}h
                          </span>
                          <button
                            onClick={() => handleEdit(log)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Time Log</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLog(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={editingLog.projectId}
                    onChange={(e) => setEditingLog({ ...editingLog, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={editingLog.duration}
                    onChange={(e) => setEditingLog({ ...editingLog, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={new Date(editingLog.date).toISOString().split('T')[0]}
                    onChange={(e) => setEditingLog({ ...editingLog, date: new Date(e.target.value).getTime() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editingLog.notes || ''}
                    onChange={(e) => setEditingLog({ ...editingLog, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLog(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeLogsView;