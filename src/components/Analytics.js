'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Target, Zap, Calendar, BarChart3, List } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as unifiedDB from '@/db/unifiedDB';
import { useRouter } from 'next/navigation';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [projects, setProjects] = useState([]);
  const [timeStats, setTimeStats] = useState(null);
  const [journalStats, setJournalStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [perspectiveData, setPerspectiveData] = useState([]);

  const router = useRouter();

    const prepareChartData = async (projects, stats) => {
    // Weekly trend data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = days.map(day => ({
      day,
      hours: stats.byDay[day] || 0
    }));
    setWeeklyData(weekData);

    // Project distribution data
    const projData = projects
      .filter(p => p.totalHoursLogged > 0)
      .sort((a, b) => b.totalHoursLogged - a.totalHoursLogged)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        hours: p.totalHoursLogged,
        color: p.color
      }));
    setProjectData(projData);

    // Activity type distribution
    const actData = Object.entries(stats.byActivity || {})
      .map(([type, hours]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: Math.round(hours * 10) / 10
      }))
      .sort((a, b) => b.value - a.value);
    setActivityData(actData);

    // Perspective alignment
    const typeHours = {};
    projects.forEach(p => {
      if (p.totalHoursLogged > 0) {
        typeHours[p.type] = (typeHours[p.type] || 0) + p.totalHoursLogged;
      }
    });

    const total = Object.values(typeHours).reduce((sum, h) => sum + h, 0);
    
    const perspectives = [
      { 
        name: 'Builder', 
        score: total > 0 ? Math.round((typeHours.building || 0) / total * 100) : 0,
        color: '#3B82F6' 
      },
      { 
        name: 'Contributor', 
        score: total > 0 ? Math.round(((typeHours.consulting || 0) + (typeHours.contributing || 0)) / total * 100) : 0,
        color: '#10B981' 
      },
      { 
        name: 'Integrator', 
        score: total > 0 && projects.length > 2 ? Math.min(100, projects.filter(p => p.totalHoursLogged > 0).length * 20) : 0,
        color: '#8B5CF6' 
      },
      { 
        name: 'Experimenter', 
        score: total > 0 ? Math.round((typeHours.learning || 0) / total * 100) : 0,
        color: '#F59E0B' 
      }
    ];
    setPerspectiveData(perspectives);
  };


  const loadAnalytics = async () => {
    try {
      const [allProjects, stats, jStats] = await Promise.all([
        unifiedDB.getAllProjects(),
        unifiedDB.getTimeLogStats(),
        unifiedDB.getJournalStats()
      ]);

      setProjects(allProjects);
      setTimeStats(stats);
      setJournalStats(jStats);

      prepareChartData(allProjects, stats);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);


  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <div className="flex gap-2">
          {['week', 'month', 'all'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Clock className="w-5 h-5" />
            <p className="text-sm font-medium">Total Hours</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {timeStats?.totalHours?.toFixed(1) || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {timeStats?.thisWeek?.toFixed(1) || 0}h this week
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Target className="w-5 h-5" />
            <p className="text-sm font-medium">Projects</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {projects.filter(p => p.totalHoursLogged > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active projects</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <BarChart3 className="w-5 h-5" />
            <p className="text-sm font-medium">Sessions</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {timeStats?.totalLogs || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg {timeStats?.averageSessionLength?.toFixed(1) || 0}h
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Calendar className="w-5 h-5" />
            <p className="text-sm font-medium">Journal</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {journalStats?.total || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {journalStats?.thisWeek || 0} this week
          </p>
        </div>
      </div>

      {/* Weekly Activity Pattern */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Weekly Activity Pattern</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => [`${value}h`, 'Hours']}
            />
            <Bar dataKey="hours" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Time by Project</h2>
          {projectData.length > 0 ? (
            <>
              <div className="px-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={projectData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={63}
                      fill="#8884d8"
                      dataKey="hours"
                      
                       label={({ percent, x, y }) => (
                        <text 
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                          fill="#333"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )}
                      
                      >
                      {projectData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value}h`}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {projectData.map((project, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-gray-700">{project.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{project.hours}h</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No time logged yet</p>
          )}
        </div>

        {/* Activity Type Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Activity Types</h2>
          {activityData.length > 0 ? (
            <div className="space-y-3">
              {activityData.map((activity, idx) => {
                const total = activityData.reduce((sum, a) => sum + a.value, 0);
                const percentage = (activity.value / total * 100).toFixed(0);
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{activity.name}</span>
                      <span className="font-semibold text-gray-800">{activity.value}h ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No activities logged yet</p>
          )}
        </div>
      </div>

      {/* Perspective Alignment */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Perspective Alignment</h2>
        <p className="text-sm text-gray-600 mb-6">
          Based on your project types and time allocation
        </p>
        <div className="space-y-4">
          {perspectiveData.map((perspective) => (
            <div key={perspective.name}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{perspective.name}</span>
                <span className="font-bold text-gray-800">{perspective.score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${perspective.score}%`,
                    backgroundColor: perspective.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Energy & Productivity Metrics */}
      {timeStats && (timeStats.averageEnergy > 0 || timeStats.averageProductivity > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">How You Are Feeling</h2>
          <div className="grid grid-cols-3 gap-4">
            {timeStats.averageEnergy > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm font-medium text-gray-700">Energy</p>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {timeStats.averageEnergy.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 5</p>
              </div>
            )}
            {timeStats.averageProductivity > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">Productivity</p>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {timeStats.averageProductivity.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 5</p>
              </div>
            )}
            {timeStats.averageEnjoyment > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Enjoyment</p>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {timeStats.averageEnjoyment.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 5</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Time Logs Management */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-sm text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <List className="w-6 h-6" />
              <h2 className="text-xl font-bold">Time Logs</h2>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              View, edit, and manage all your time entries with advanced filtering options
            </p>
            <ul className="text-sm text-blue-100 space-y-1 mb-4">
              <li>• View all time logs with project details</li>
              <li>• Edit duration, date, notes, and more</li>
              <li>• Filter by project, date range, or search</li>
              <li>• Delete logs with automatic project updates</li>
            </ul>
          </div>
        </div>
        <button
          onClick={() => router.push('/timelogs')}
          className="w-full px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          View All Time Logs
        </button>
      </div>

    </div>
  );
};

export default Analytics;