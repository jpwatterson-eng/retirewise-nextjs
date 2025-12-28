// src/hooks/usePortfolioContext.js
// COMPLETE VERSION - Copy this entire file
'use client';

import { useState, useEffect } from 'react';
import { getPortfolio, calculatePortfolioBalance, getAllProjects, getAllTimeLogs } from '@/db/unifiedDB';

export function usePortfolioContext() {
  const [portfolioContext, setPortfolioContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPortfolioContext();
  }, []);

  async function loadPortfolioContext() {
    try {
      setLoading(true);
      
      const [portfolio, balance, projects, timeLogs] = await Promise.all([
        getPortfolio(),
        calculatePortfolioBalance(),
        getAllProjects(),
        getAllTimeLogs()
      ]);

      const activeProjects = projects.filter(p => p.status !== 'completed').length;
      const targetBalance = portfolio?.targetBalance || {
        builder: 25, contributor: 25, integrator: 25, experimenter: 25
      };

      // Calculate balance score using the helper function below
      const balanceScore = calculateBalanceScore(balance.actualBalance, targetBalance);

      const recentActivity = timeLogs.slice(0, 20).map(log => ({
        perspective: log.perspective,
        date: log.date,
        hours: log.duration
      }));

      const context = {
        userName: portfolio?.displayName || 'User',
        actualBalance: balance.actualBalance,
        targetBalance,
        balanceScore,
        totalHours: Math.round(balance.totalHours || 0),
        activeProjects,
        recentActivity
      };

      setPortfolioContext(context);
      setError(null);
    } catch (err) {
      console.error('Failed to load portfolio context:', err);
      setError(err);
      setPortfolioContext(null);
    } finally {
      setLoading(false);
    }
  }

  return { portfolioContext, loading, error, refresh: loadPortfolioContext };
}

// Helper function to calculate balance score
// This was missing - causing your error!
function calculateBalanceScore(actual, target) {
  const perspectives = ['builder', 'contributor', 'integrator', 'experimenter'];
  
  // Calculate absolute deviations
  const deviations = perspectives.map(p => 
    Math.abs((actual[p] || 0) - (target[p] || 25))
  );
  
  // Total drift (industry standard formula)
  const totalDrift = deviations.reduce((sum, d) => sum + d, 0) / 2;
  
  // Calculate score with graduated penalties
  let score = 100;
  if (totalDrift <= 5) {
    score = 100 - (totalDrift * 2);
  } else if (totalDrift <= 10) {
    score = 90 - ((totalDrift - 5) * 3);
  } else if (totalDrift <= 15) {
    score = 75 - ((totalDrift - 10) * 3);
  } else {
    score = Math.max(0, 60 - ((totalDrift - 15) * 4));
  }
  
  // Assign grade
  let grade = 'A';
  if (score < 90) grade = 'B';
  if (score < 75) grade = 'C';
  if (score < 60) grade = 'D';
  
  // Assign status
  let status;
  if (score >= 90) status = 'Excellent Balance';
  else if (score >= 75) status = 'Good Balance';
  else if (score >= 60) status = 'Needs Attention';
  else status = 'Critical - Rebalancing Required';
  
  return {
    score: Math.round(score * 10) / 10,
    drift: Math.round(totalDrift * 10) / 10,
    grade,
    status
  };
}