// src/components/PerspectiveAnalytics.js
'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as unifiedDB from '@/db/unifiedDB';
import { PERSPECTIVES, getAllPerspectives } from '@/utils/perspectiveHelpers';

const PerspectiveAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [statsData, balanceData, logsData, projectsData] = await Promise.all([
        unifiedDB.getPerspectiveStats(),
        unifiedDB.calculatePortfolioBalance(),
        unifiedDB.getAllTimeLogs(),
        unifiedDB.getAllProjects()
      ]);

      setStats(statsData);
      setBalance(balanceData);
      setTimeLogs(logsData);
      setProjects(projectsData);
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

  // Prepare data for charts
  const perspectives = getAllPerspectives();
  
  const perspectiveData = perspectives.map(p => ({
    name: p.label,
    icon: p.icon,
    hours: stats[p.id].hours,
    projects: stats[p.id].count,
    color: p.color
  }));

  // Calculate weekly trends
  const getWeeklyTrends = () => {
    const now = new Date();
    const weeks = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekData = {
        week: `Week ${4 - i}`,
        builder: 0,
        contributor: 0,
        integrator: 0,
        experimenter: 0
      };
      
      timeLogs.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate >= weekStart && logDate < weekEnd) {
          const project = projects.find(p => p.id === log.projectId);
          if (project && project.perspective) {
            weekData[project.perspective] += log.duration;
          }
        }
      });
      
      weeks.push(weekData);
    }
    
    return weeks;
  };

  const weeklyTrends = getWeeklyTrends();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-1">{payload[0].payload.name}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
{/* Summary Cards - STACKED LAYOUT */}
<div className="space-y-3">
  {perspectives.map((perspective) => {
    const data = stats[perspective.id];
    return (
      <div
        key={perspective.id}
        className="bg-white rounded-xl p-4 shadow-sm border-2"
        style={{ borderLeftColor: perspective.color, borderLeftWidth: '4px' }}
      >
        {/* Row 1: Icon + Name */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{perspective.icon}</span>
          <h3 className="font-semibold text-gray-800 text-lg">{perspective.label}</h3>
        </div>

        {/* Row 2: Headings */}
        <div className="flex items-center gap-8 mb-1">
          <p className="text-xs text-gray-600 w-24">Hours</p>
          <p className="text-xs text-gray-600 w-24">Projects</p>
          <p className="text-xs text-gray-600 w-24">Portfolio</p>
        </div>

        {/* Row 3: Numbers */}
        <div className="flex items-center gap-8">
          <p className="text-2xl font-bold text-gray-800 w-24">{data.hours.toFixed(1)}</p>
          <p className="text-2xl font-bold text-gray-800 w-24">{data.count}</p>
          <p className="text-2xl font-bold w-24" style={{ color: perspective.color }}>
            {balance.actualBalance[perspective.id].toFixed(1)}%
          </p>
        </div>
      </div>
    );
  })}
</div>

      {/* Hours by Perspective Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Hours by Perspective</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={perspectiveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="icon" 
              tick={{ fontSize: 20 }}
            />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" name="Hours" radius={[8, 8, 0, 0]}>
              {perspectiveData.map((entry, index) => (
                <Bar key={`cell-${index}`} dataKey="hours" fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Trends */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">4-Week Trend by Perspective</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="builder" 
              name="🔨 Builder" 
              stroke={PERSPECTIVES.builder.color} 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="contributor" 
              name="🤝 Contributor" 
              stroke={PERSPECTIVES.contributor.color} 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="integrator" 
              name="🔄 Integrator" 
              stroke={PERSPECTIVES.integrator.color} 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="experimenter" 
              name="🧪 Experimenter" 
              stroke={PERSPECTIVES.experimenter.color} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projects by Perspective */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Projects by Perspective</h3>
        <div className="space-y-4">
          {perspectives.map((perspective) => {
            const perspectiveProjects = projects.filter(p => p.perspective === perspective.id);
            return (
              <div key={perspective.id} className="border-l-4 pl-4" style={{ borderColor: perspective.color }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{perspective.icon}</span>
                    <h4 className="font-semibold text-gray-800">{perspective.label}</h4>
                  </div>
                  <span className="text-sm text-gray-500">{perspectiveProjects.length} projects</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {perspectiveProjects.map((project) => (
                    <div
                      key={project.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full text-sm"
                    >
                      {project.icon && <span>{project.icon}</span>}
                      <span className="text-gray-700">{project.name}</span>
                      <span className="text-gray-400 text-xs">
                        ({project.totalHoursLogged?.toFixed(1) || 0}h)
                      </span>
                    </div>
                  ))}
                  {perspectiveProjects.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No projects yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PerspectiveAnalytics;