// src/components/PortfolioDashboard.js
'use client';

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Clock, Award } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';
import { 
  PERSPECTIVES, 
  calculateBalanceScore, 
  getBalanceStatus,
  getUnderrepresentedPerspectives,
  getOverrepresentedPerspectives 
} from '@/utils/perspectiveHelpers';
import PerspectiveCard from './PerspectiveCard';
import BalanceChart from './BalanceChart';
import BalanceComparison from './BalanceComparison';
import RecentActivityByPerspective from './RecentActivityByPerspective';

const PortfolioDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [balance, setBalance] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [portfolioData, balanceData, statsData, projectsData] = await Promise.all([
        unifiedDB.getPortfolio(),
        unifiedDB.calculatePortfolioBalance(),
        unifiedDB.getPerspectiveStats(),
        unifiedDB.getAllProjects()
      ]);

      setPortfolio(portfolioData);
      setBalance(balanceData);
      setStats(statsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio || !balance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No portfolio data found</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Initialize Portfolio
          </button>
        </div>
      </div>
    );
  }

  const balanceScore = calculateBalanceScore(balance.actualBalance, portfolio.targetBalance);
  const balanceStatus = getBalanceStatus(balanceScore);
  const underrepresented = getUnderrepresentedPerspectives(balance.actualBalance);
  const overrepresented = getOverrepresentedPerspectives(balance.actualBalance);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Portfolio Overview</h1>
        <p className="text-gray-600">
          Track your balance across the four perspectives
        </p>
      </div>

      {/* Balance Score Card */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Portfolio Balance Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{balanceScore}</span>
              <span className="text-2xl text-blue-100">/100</span>
            </div>
            <p className="text-blue-100 mt-2">
              Status: <span className="font-semibold">{balanceStatus.label}</span>
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-4">
            <Target className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"> */}
      <div className="grid grid-cols-1 gap-2 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-3">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-800">{balance.totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-3">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-800">
                {projects.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-3">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Perspectives</p>
              <p className="text-2xl font-bold text-gray-800">
                {Object.values(balance.actualBalance).filter(v => v > 0).length}/4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Insights */}
      {(underrepresented.length > 0 || overrepresented.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Balance Insights</h3>
              {underrepresented.length > 0 && (
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Underrepresented:</strong>{' '}
                  {underrepresented.map(p => `${p.icon} ${p.label}`).join(', ')} - 
                  Consider adding more activities in these areas.
                </p>
              )}
              {overrepresented.length > 0 && (
                <p className="text-sm text-yellow-800">
                  <strong>Overrepresented:</strong>{' '}
                  {overrepresented.map(p => `${p.icon} ${p.label}`).join(', ')} - 
                  You are focusing heavily here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balance Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
        <BalanceChart balance={balance} />
        <BalanceComparison 
          actualBalance={balance.actualBalance} 
          targetBalance={portfolio.targetBalance} 
        />
      </div>

      {/* Perspective Cards */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Perspectives</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-2">
          {Object.values(PERSPECTIVES).map(perspective => (
            <PerspectiveCard
              key={perspective.id}
              perspective={perspective}
              stats={stats[perspective.id]}
              actualPercentage={balance.actualBalance[perspective.id]}
              targetPercentage={portfolio.targetBalance[perspective.id]}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityByPerspective projects={projects} />

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default PortfolioDashboard;