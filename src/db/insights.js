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
  const insights = [];
  
  // Get data for analysis
  const projects = await db.projects.toArray();
  const timeLogs = await db.timeLogs.toArray();
  const journalEntries = await db.journalEntries.toArray();
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
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
      validUntil: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() // Valid for 3 days
    });
  }
  
  // Save all generated insights
  for (const insightData of insights) {
    await createInsight(insightData);
  }
  
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