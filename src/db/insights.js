// src/db/insights.js
import db, { generateId } from '@/db/database';

// Create a new insight
export const createInsight = async (insightData) => {
  const insight = {
    id: generateId('insight'),
    type: insightData.type,
    title: insightData.title,
    description: insightData.description,
    confidence: insightData.confidence || 0.8,
    basedOn: insightData.basedOn || {},
    actionable: insightData.actionable || false,
    suggestedActions: insightData.suggestedActions || [],
    priority: insightData.priority || 'medium',
    dismissed: false,
    dismissedAt: null,
    dismissReason: null,
    actedOn: false,
    actedOnAt: null,
    userFeedback: null,
    generatedAt: new Date().toISOString(),
    validUntil: insightData.validUntil || null,
    lastShownAt: new Date().toISOString()
  };
  
  await db.insights.add(insight);
  console.log('✅ Insight created:', insight.title);
  return insight;
};

// Get all active insights (not dismissed, still valid)
export const getActiveInsights = async () => {
  try {
    const now = new Date().toISOString();
    
    // Get all insights first
    const allInsights = await db.insights.toArray();
    
    // Filter in JavaScript instead of using Dexie queries
    const activeInsights = allInsights.filter(insight => {
      // Must not be dismissed
      if (insight.dismissed) return false;
      
      // Must not be expired
      if (insight.validUntil && insight.validUntil < now) return false;
      
      return true;
    });
    
    // Sort by priority then date
    return activeInsights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.generatedAt) - new Date(a.generatedAt);
    });
  } catch (error) {
    console.error('Error getting active insights:', error);
    return []; // Return empty array on error instead of throwing
  }
};

// Get insights by type
export const getInsightsByType = async (type) => {
  return await db.insights
    .where('type')
    .equals(type)
    .and(insight => !insight.dismissed)
    .toArray();
};

// Get insights by priority
export const getInsightsByPriority = async (priority) => {
  return await db.insights
    .where('priority')
    .equals(priority)
    .and(insight => !insight.dismissed)
    .toArray();
};

// Dismiss an insight
export const dismissInsight = async (insightId, reason = null) => {
  await db.insights.update(insightId, {
    dismissed: true,
    dismissedAt: new Date().toISOString(),
    dismissReason: reason
  });
  
  console.log('✅ Insight dismissed');
};

// Mark insight as acted upon
export const markInsightActedOn = async (insightId) => {
  await db.insights.update(insightId, {
    actedOn: true,
    actedOnAt: new Date().toISOString()
  });
  
  console.log('✅ Insight marked as acted on');
};

// Provide feedback on insight
export const provideFeedback = async (insightId, feedback) => {
  await db.insights.update(insightId, {
    userFeedback: feedback
  });
  
  console.log('✅ Feedback recorded');
};

// Get all dismissed insights
export const getDismissedInsights = async () => {
  return await db.insights
    .where('dismissed')
    .equals(true)
    .reverse()
    .sortBy('dismissedAt');
};

// Clear old dismissed insights (cleanup)
export const clearOldInsights = async (daysOld = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const oldInsights = await db.insights
    .where('dismissedAt')
    .below(cutoffDate.toISOString())
    .toArray();
  
  for (const insight of oldInsights) {
    await db.insights.delete(insight.id);
  }
  
  console.log(`✅ Cleared ${oldInsights.length} old insights`);
  return oldInsights.length;
};

// Generate insights based on current data
export const generateInsights = async () => {
  
  console.log('🔍 generateInsights() CALLED');

  const insights = [];
  
  // Get data for analysis
  console.log('📊 Fetching data...');

  const projects = await db.projects.toArray();
  const timeLogs = await db.timeLogs.toArray();
  const journalEntries = await db.journalEntries.toArray();
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  console.log(`📊 Data: ${projects.length} projects, ${timeLogs.length} logs, ${journalEntries.length} journals`);
  
  // ==================== PERSPECTIVE INSIGHTS ====================
  
  // Calculate perspective distribution
  const perspectiveHours = {
    builder: 0,
    contributor: 0,
    integrator: 0,
    experimenter: 0
  };
  
  const projectPerspectives = {};
  projects.forEach(p => {
    if (p.perspective) {
      projectPerspectives[p.id] = p.perspective;
    }
  });
  
  timeLogs.forEach(log => {
    const perspective = projectPerspectives[log.projectId];
    if (perspective && perspectiveHours[perspective] !== undefined) {
      perspectiveHours[perspective] += log.duration;
    }
  });
  
  const totalHours = Object.values(perspectiveHours).reduce((sum, h) => sum + h, 0);
  
  console.log('⚖️ Perspective Hours:', perspectiveHours);
  console.log('⚖️ Total Hours:', totalHours);

  const perspectiveBalance = {
    builder: totalHours > 0 ? (perspectiveHours.builder / totalHours) * 100 : 0,
    contributor: totalHours > 0 ? (perspectiveHours.contributor / totalHours) * 100 : 0,
    integrator: totalHours > 0 ? (perspectiveHours.integrator / totalHours) * 100 : 0,
    experimenter: totalHours > 0 ? (perspectiveHours.experimenter / totalHours) * 100 : 0
  };
  
  console.log('⚖️ Balance:', perspectiveBalance);

  // Check for overconcentration in one perspective
  console.log('🔍 Checking overconcentration...');

  Object.entries(perspectiveBalance).forEach(([perspective, percentage]) => {
    console.log(`  ${perspective}: ${percentage.toFixed(1)}% - Should trigger? ${percentage > 70 && totalHours > 10}`);
    if (percentage > 70 && totalHours > 10) {
      console.log(`  ✅ TRIGGERING overconcentration insight for ${perspective}`);
    // ... rest of insight code
      const perspectiveNames = {
        builder: 'Builder',
        contributor: 'Contributor',
        integrator: 'Integrator',
        experimenter: 'Experimenter'
      };
      
      const perspectiveIcons = {
        builder: '🔨',
        contributor: '🤝',
        integrator: '🔄',
        experimenter: '🧪'
      };
      
      const suggestions = {
        builder: 'Consider adding Experimenter activities to explore new interests, or Contributor projects to give back.',
        contributor: 'Balance with Builder projects to create tangible outputs, or Experimenter activities to learn new skills.',
        integrator: 'Add Builder projects for concrete outcomes, or Experimenter activities for fresh perspectives.',
        experimenter: 'Consider Builder projects to apply your learnings, or Contributor work to share your knowledge.'
      };
      
      insights.push({
        type: 'balance',
        title: `${perspectiveIcons[perspective]} Portfolio Heavily Weighted Toward ${perspectiveNames[perspective]}`,
        description: `You're spending ${percentage.toFixed(0)}% of your time on ${perspectiveNames[perspective]} projects. ${suggestions[perspective]}`,
        confidence: 0.85,
        actionable: true,
        suggestedActions: [
          'Review your portfolio balance on the Portfolio page',
          'Start a project in an underrepresented perspective',
          'Set target percentages for each perspective'
        ],
        priority: 'medium',
        basedOn: {
          perspective,
          percentage: percentage.toFixed(1),
          totalHours
        }
      });
    }
  });
  
  // Check for missing perspectives
  const missingPerspectives = Object.entries(perspectiveBalance)
    .filter(([_, percentage]) => percentage === 0 && totalHours > 5)
    .map(([perspective, _]) => perspective);
  
  if (missingPerspectives.length > 0) {
    const perspectiveNames = {
      builder: 'Builder',
      contributor: 'Contributor', 
      integrator: 'Integrator',
      experimenter: 'Experimenter'
    };
    
    const perspectiveDescriptions = {
      builder: 'create something tangible like a product, book, or business',
      contributor: 'give back through teaching, mentoring, or volunteering',
      integrator: 'connect different interests and explore interdisciplinary ideas',
      experimenter: 'learn new skills and try new things without pressure to complete'
    };
    
    const names = missingPerspectives.map(p => perspectiveNames[p]).join(' and ');
    const descriptions = missingPerspectives.map(p => perspectiveDescriptions[p]).join(', or ');
    
    insights.push({
      type: 'suggestion',
      title: `Missing Perspective${missingPerspectives.length > 1 ? 's' : ''}: ${names}`,
      description: `You haven't logged any ${names} activities yet. Consider starting a project to ${descriptions}.`,
      confidence: 0.7,
      actionable: true,
      suggestedActions: [
        `Create a ${perspectiveNames[missingPerspectives[0]]} project`,
        'Explore the Portfolio page for ideas',
        'Review the perspective descriptions for inspiration'
      ],
      priority: 'low',
      basedOn: {
        missingPerspectives,
        totalHours
      }
    });
  }
  
  // Check for inactive perspectives (no activity in 2+ weeks)
  const recentLogs = timeLogs.filter(log => new Date(log.date) > twoWeeksAgo);
  const recentPerspectives = new Set();
  
  recentLogs.forEach(log => {
    const perspective = projectPerspectives[log.projectId];
    if (perspective) {
      recentPerspectives.add(perspective);
    }
  });
  
  const inactivePerspectives = ['builder', 'contributor', 'integrator', 'experimenter']
    .filter(p => perspectiveHours[p] > 0 && !recentPerspectives.has(p));
  
  if (inactivePerspectives.length > 0 && totalHours > 10) {
    const perspectiveNames = {
      builder: 'Builder',
      contributor: 'Contributor',
      integrator: 'Integrator',
      experimenter: 'Experimenter'
    };
    
    const perspectiveIcons = {
      builder: '🔨',
      contributor: '🤝',
      integrator: '🔄',
      experimenter: '🧪'
    };
    
    const names = inactivePerspectives.map(p => `${perspectiveIcons[p]} ${perspectiveNames[p]}`).join(', ');
    
    insights.push({
      type: 'pattern',
      title: 'Perspective Neglect',
      description: `You haven't worked on ${names} project${inactivePerspectives.length > 1 ? 's' : ''} in over 2 weeks. Consider rebalancing your portfolio.`,
      confidence: 0.75,
      actionable: true,
      suggestedActions: [
        'Review your portfolio balance',
        'Schedule time for neglected perspectives',
        'Consider if you need to pause or archive projects'
      ],
      priority: 'medium',
      basedOn: {
        inactivePerspectives,
        daysSinceActivity: 14
      }
    });
  }
  
  // Celebrate balanced portfolio
  const balancedPerspectives = Object.values(perspectiveBalance).filter(p => p >= 15 && p <= 35);
  if (balancedPerspectives.length >= 3 && totalHours > 20) {
    insights.push({
      type: 'achievement',
      title: '🎯 Well-Balanced Portfolio!',
      description: `Excellent work! You're maintaining good balance across multiple perspectives. This diversity enriches your retirement experience.`,
      confidence: 1.0,
      actionable: false,
      suggestedActions: [],
      priority: 'medium',
      basedOn: {
        balancedCount: balancedPerspectives.length,
        balance: perspectiveBalance
      },
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // ==================== EXISTING INSIGHTS ====================
  
  // Check for dormant projects
  const dormantProjects = projects.filter(p => {
    if (!p.lastWorkedAt) return false;
    const lastWorked = new Date(p.lastWorkedAt);
    const daysSince = Math.floor((now - lastWorked) / (1000 * 60 * 60 * 24));
    return daysSince > 14 && p.status === 'active';
  });
  
  if (dormantProjects.length > 0) {
    insights.push({
      type: 'alert',
      title: `${dormantProjects.length} Project${dormantProjects.length > 1 ? 's' : ''} Need Attention`,
      description: `${dormantProjects.map(p => p.name).join(', ')} ${dormantProjects.length === 1 ? 'has' : 'have'} been inactive for over 2 weeks. Consider updating status or logging time.`,
      confidence: 0.9,
      actionable: true,
      suggestedActions: [
        'Log time on dormant projects',
        'Change project status to paused',
        'Add journal entry about these projects'
      ],
      priority: 'high',
      basedOn: {
        dormantProjects: dormantProjects.map(p => p.name)
      }
    });
  }
  
  // Check for low activity week
  const recentTimeLogs = timeLogs.filter(log => new Date(log.date) > weekAgo);
  const weeklyHours = recentTimeLogs.reduce((sum, log) => sum + log.duration, 0);
  
  if (weeklyHours < 5 && timeLogs.length > 10) {
    insights.push({
      type: 'pattern',
      title: 'Lower Activity This Week',
      description: `You've logged ${weeklyHours.toFixed(1)} hours this week, which is below your typical pace. This might be intentional, or it could be worth checking in on your goals.`,
      confidence: 0.7,
      actionable: true,
      suggestedActions: [
        'Review your current priorities',
        'Consider if you need a break',
        'Schedule time for your active projects'
      ],
      priority: 'medium',
      basedOn: {
        weeklyHours,
        averageWeekly: (timeLogs.reduce((sum, log) => sum + log.duration, 0) / Math.max(1, Math.ceil(timeLogs.length / 7))).toFixed(1)
      }
    });
  }
  
  // Check for lack of journaling
  const recentJournals = journalEntries.filter(e => new Date(e.date) > weekAgo);
  
  if (recentJournals.length === 0 && journalEntries.length > 5) {
    insights.push({
      type: 'suggestion',
      title: 'Time to Reflect',
      description: 'You haven\'t written a journal entry this week. Regular reflection helps you notice patterns and make better decisions.',
      confidence: 0.6,
      actionable: true,
      suggestedActions: [
        'Write about your week so far',
        'Reflect on a recent milestone',
        'Capture any learnings or insights'
      ],
      priority: 'low',
      basedOn: {
        daysSinceLastJournal: journalEntries.length > 0 
          ? Math.floor((now - new Date(journalEntries[0].date)) / (1000 * 60 * 60 * 24))
          : null
      }
    });
  }
  
  // Check for milestone achievements
  const milestonesThisWeek = journalEntries.filter(e => 
    e.entryType === 'milestone' && new Date(e.date) > weekAgo
  );
  
  if (milestonesThisWeek.length > 0) {
    insights.push({
      type: 'achievement',
      title: 'Great Progress This Week! 🎉',
      description: `You logged ${milestonesThisWeek.length} milestone${milestonesThisWeek.length > 1 ? 's' : ''} this week. Take a moment to acknowledge your achievements!`,
      confidence: 1.0,
      actionable: false,
      suggestedActions: [],
      priority: 'medium',
      basedOn: {
        milestones: milestonesThisWeek.length
      },
      validUntil: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // Save all generated insights
  for (const insightData of insights) {
    await createInsight(insightData);
  }
  
  console.log(`✅ Generated ${insights.length} insights (${insights.filter(i => i.type === 'balance' || i.type === 'suggestion' && i.basedOn.missingPerspectives).length} perspective-aware)`);
  
  return insights;
};


export default {
  createInsight,
  getActiveInsights,
  getInsightsByType,
  getInsightsByPriority,
  dismissInsight,
  markInsightActedOn,
  provideFeedback,
  getDismissedInsights,
  clearOldInsights,
  generateInsights
};