// src/components/Analytics.js
'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as unifiedDB from '@/db/unifiedDB';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [statsData, projectsData, logsData, journalData] = await Promise.all([
        unifiedDB.getTimeLogStats(),
        unifiedDB.getAllProjects(),
        unifiedDB.getAllTimeLogs(),
        unifiedDB.getAllJournalEntries()
      ]);

      setStats(statsData);
      setProjects(projectsData);
      setTimeLogs(logsData);
      setJournalEntries(journalData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter data based on time range
  const getFilteredData = () => {
    const now = new Date();
    let startDate = new Date(0);

    if (timeRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredLogs = timeLogs.filter(log => new Date(log.date) >= startDate);
    const filteredJournal = journalEntries.filter(entry => new Date(entry.date) >= startDate);
    
    const totalHours = filteredLogs.reduce((sum, log) => sum + log.duration, 0);
    const sessions = filteredLogs.length;

    return { filteredLogs, totalHours, sessions, filteredJournal };
  };

  const { filteredLogs, totalHours, sessions, filteredJournal } = getFilteredData();

  // Time by project
  const projectHours = {};
  filteredLogs.forEach(log => {
    const project = projects.find(p => p.id === log.projectId);
    const projectName = project?.name || 'Unknown';
    projectHours[projectName] = (projectHours[projectName] || 0) + log.duration;
  });

  const projectData = Object.entries(projectHours)
    .map(([name, hours]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      value: parseFloat(hours.toFixed(1))
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Activity types
  const activityHours = {};
  filteredLogs.forEach(log => {
    if (log.activity) {
      activityHours[log.activity] = (activityHours[log.activity] || 0) + log.duration;
    }
  });

  const activityData = Object.entries(activityHours)
    .map(([name, value]) => ({ 
      name: name.length > 15 ? name.substring(0, 15) + '...' : name, 
      value: parseFloat(value.toFixed(1)) 
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value}h</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeRange === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeRange === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeRange === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Total Hours</p>
          <p className="text-3xl font-bold text-gray-800">{totalHours.toFixed(1)}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Sessions</p>
          <p className="text-3xl font-bold text-gray-800">{sessions}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Projects</p>
          <p className="text-3xl font-bold text-gray-800">{projects.length}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Journal</p>
          <p className="text-3xl font-bold text-gray-800">{filteredJournal.length}</p>
        </div>
      </div>

      {/* Charts - Vertical Stack */}
      <div className="space-y-6">
        {/* Time by Project */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Time by Project</h3>
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No project data yet
            </div>
          )}
        </div>

        {/* Time by Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Time by Activity</h3>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No activity types logged
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;