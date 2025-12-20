// src/db/unifiedDB.js
// Unified database layer that uses Firestore when logged in, Dexie when offline
import * as firestoreDB from '@/db/firestore/firestoreDB';
import * as dexieProjects from '@/db/projects';
import * as dexieTimeLogs from '@/db/timeLogs';

let currentUserId = null;

// Set the current user ID (call this when user logs in)
export const setCurrentUser = (userId) => {
  currentUserId = userId;
  console.log('📊 Database user set:', userId ? 'Firestore' : 'Local');
};

// Check if using Firestore
const isUsingFirestore = () => !!currentUserId;

// ==================== PROJECTS ====================

export const getAllProjects = async () => {
  if (currentUserId) {
    return await firestoreDB.getProjects(currentUserId);
  }
  return await dexieProjects.getAllProjects();
};

export const getActiveProjects = async () => {
  const projects = await getAllProjects();
  return projects.filter(p => p.status === 'active');
};

export const getProject = async (projectId) => {
  if (currentUserId) {
    return await firestoreDB.getProject(currentUserId, projectId);
  }
  return await dexieProjects.getProject(projectId);
};

export const getProjectWithStats = async (projectId) => {
  if (currentUserId) {
    // Firestore version - calculate stats from time logs
    const project = await firestoreDB.getProject(currentUserId, projectId);
    if (!project) return null;
    
    const allLogs = await firestoreDB.getTimeLogs(currentUserId);
    const projectLogs = allLogs.filter(log => log.projectId === projectId);
    
    // Calculate stats
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const lastWeekLogs = projectLogs.filter(log => new Date(log.date) >= oneWeekAgo);
    const previousWeekLogs = projectLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= twoWeeksAgo && logDate < oneWeekAgo;
    });
    
    const lastWeekHours = lastWeekLogs.reduce((sum, log) => sum + log.duration, 0);
    const previousWeekHours = previousWeekLogs.reduce((sum, log) => sum + log.duration, 0);
    const weeklyChange = previousWeekHours > 0 
      ? ((lastWeekHours - previousWeekHours) / previousWeekHours) * 100 
      : 0;
    
    const stats = {
      lastWeekHours,
      previousWeekHours,
      weeklyChange,
      totalHours: project.totalHoursLogged || 0,
      targetHours: project.targetHours || 0,
      completionRate: project.targetHours > 0 
        ? ((project.totalHoursLogged || 0) / project.targetHours) * 100 
        : 0
    };
    
    return { project, stats };
  }
  
  // Dexie version - use existing function
  return await dexieProjects.getProjectWithStats(projectId);
};

export const createProject = async (projectData) => {
  if (currentUserId) {
    const id = await firestoreDB.createProject(currentUserId, projectData);
    return { id, ...projectData };
  }
  return await dexieProjects.createProject(projectData);
};

export const updateProject = async (projectId, updates) => {
  if (currentUserId) {
    await firestoreDB.updateProject(currentUserId, projectId, updates);
    return;
  }
  return await dexieProjects.updateProject(projectId, updates);
};

export const deleteProject = async (projectId) => {
  if (currentUserId) {
    await firestoreDB.deleteProject(currentUserId, projectId);
    return;
  }
  return await dexieProjects.deleteProject(projectId);
};

// Real-time subscription (Firestore only)
export const subscribeToProjects = (callback) => {
  if (currentUserId) {
    return firestoreDB.subscribeToProjects(currentUserId, callback);
  }
  // For Dexie, do a one-time load
  getAllProjects().then(callback);
  return () => {}; // Return empty unsubscribe function
};


// ==================== TIME LOGS ====================

export const getAllTimeLogs = async () => {
  if (currentUserId) {
    const logs = await firestoreDB.getTimeLogs(currentUserId);
    
    // Enrich with project data
    const projects = await getAllProjects();
    const projectMap = projects.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {});
    
    return logs.map(log => ({
      ...log,
      projectName: projectMap[log.projectId]?.name || 'Unknown',
      projectColor: projectMap[log.projectId]?.color,
      projectIcon: projectMap[log.projectId]?.icon
    }));
  }
  return await dexieTimeLogs.getAllTimeLogs();
};

export const getTodayTimeLogs = async () => {
  if (currentUserId) {
    const allLogs = await firestoreDB.getTimeLogs(currentUserId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= today && logDate < tomorrow;
    });
  }
  return await dexieTimeLogs.getTodayTimeLogs();
};

export const createTimeLog = async (logData) => {
  if (currentUserId) {
    const id = await firestoreDB.createTimeLog(currentUserId, logData);
    
    // Update project hours in Firestore
    const project = await getProject(logData.projectId);
    if (project) {
      await updateProject(logData.projectId, {
        totalHoursLogged: (project.totalHoursLogged || 0) + logData.duration,
        lastWorkedAt: logData.date
      });
    }
    
    return { id, ...logData };
  }
  return await dexieTimeLogs.createTimeLog(logData);
};

export const updateTimeLog = async (logId, updates) => {
  if (currentUserId) {
    // Get old log to calculate hour difference
    const allLogs = await firestoreDB.getTimeLogs(currentUserId);
    const oldLog = allLogs.find(l => l.id === logId);
    
    await firestoreDB.updateTimeLog(currentUserId, logId, updates);
    
    // Update project hours if duration or project changed
    if (oldLog && (updates.duration !== undefined || updates.projectId !== undefined)) {
      const oldProject = await getProject(oldLog.projectId);
      const newProjectId = updates.projectId || oldLog.projectId;
      const newDuration = updates.duration !== undefined ? updates.duration : oldLog.duration;
      
      // Remove hours from old project
      if (oldProject) {
        await updateProject(oldLog.projectId, {
          totalHoursLogged: Math.max(0, oldProject.totalHoursLogged - oldLog.duration)
        });
      }
      
      // Add hours to new project
      const newProject = await getProject(newProjectId);
      if (newProject) {
        await updateProject(newProjectId, {
          totalHoursLogged: (newProject.totalHoursLogged || 0) + newDuration,
          lastWorkedAt: updates.date || oldLog.date
        });
      }
    }
    
    return;
  }
  return await dexieTimeLogs.updateTimeLog(logId, updates);
};

export const deleteTimeLog = async (logId) => {
  if (currentUserId) {
    // Get log to update project hours
    const allLogs = await firestoreDB.getTimeLogs(currentUserId);
    const log = allLogs.find(l => l.id === logId);
    
    await firestoreDB.deleteTimeLog(currentUserId, logId);
    
    // Update project hours
    if (log) {
      const project = await getProject(log.projectId);
      if (project) {
        await updateProject(log.projectId, {
          totalHoursLogged: Math.max(0, project.totalHoursLogged - log.duration)
        });
      }
    }
    
    return;
  }
  return await dexieTimeLogs.deleteTimeLog(logId);
};

// ==================== JOURNAL ====================

export const getAllJournalEntries = async () => {
  if (currentUserId) {
    return await firestoreDB.getJournalEntries(currentUserId);
  }
  const db = (await import('./database')).default;
  return await db.journalEntries.toArray();
};

export const createJournalEntry = async (entryData) => {
  if (currentUserId) {
    const id = await firestoreDB.createJournalEntry(currentUserId, entryData);
    return { id, ...entryData };
  }
  const db = (await import('./database')).default;
  const id = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.journalEntries.add({ id, ...entryData });
  return { id, ...entryData };
};

export const updateJournalEntry = async (entryId, updates) => {
  if (currentUserId) {
    await firestoreDB.updateJournalEntry(currentUserId, entryId, updates);
    return;
  }
  const db = (await import('./database')).default;
  await db.journalEntries.update(entryId, updates);
};

export const deleteJournalEntry = async (entryId) => {
  if (currentUserId) {
    await firestoreDB.deleteJournalEntry(currentUserId, entryId);
    return;
  }
  const db = (await import('./database')).default;
  await db.journalEntries.delete(entryId);
};

// ==================== ANALYTICS & STATS ====================

export const getTimeLogStats = async () => {
  if (currentUserId) {
    // Firestore version - calculate stats from time logs
    const logs = await firestoreDB.getTimeLogs(currentUserId);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const thisWeekLogs = logs.filter(log => new Date(log.date) >= oneWeekAgo);
    
    // Calculate by day
    const byDay = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    logs.forEach(log => {
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(log.date).getDay()];
      byDay[day] += log.duration;
    });
    
    // Calculate by activity
    const byActivity = {};
    logs.forEach(log => {
      if (log.activity) {
        byActivity[log.activity] = (byActivity[log.activity] || 0) + log.duration;
      }
    });
    
    return {
      totalHours: logs.reduce((sum, log) => sum + log.duration, 0),
      thisWeek: thisWeekLogs.reduce((sum, log) => sum + log.duration, 0),
      totalLogs: logs.length,
      averageSessionLength: logs.length > 0 ? logs.reduce((sum, log) => sum + log.duration, 0) / logs.length : 0,
      averageEnergy: logs.filter(l => l.energy).length > 0 
        ? logs.filter(l => l.energy).reduce((sum, l) => sum + l.energy, 0) / logs.filter(l => l.energy).length 
        : 0,
      averageProductivity: logs.filter(l => l.productivity).length > 0
        ? logs.filter(l => l.productivity).reduce((sum, l) => sum + l.productivity, 0) / logs.filter(l => l.productivity).length
        : 0,
      averageEnjoyment: logs.filter(l => l.enjoyment).length > 0
        ? logs.filter(l => l.enjoyment).reduce((sum, l) => sum + l.enjoyment, 0) / logs.filter(l => l.enjoyment).length
        : 0,
      byDay,
      byActivity
    };
  }
  
  // Dexie version
  const dexieTimeLogs = await import('./timeLogs');
  return await dexieTimeLogs.getTimeLogStats();
};

export const getJournalStats = async () => {
  if (currentUserId) {
    // Firestore version
    const entries = await firestoreDB.getJournalEntries(currentUserId);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekEntries = entries.filter(e => new Date(e.createdAt) >= oneWeekAgo);
    
    return {
      total: entries.length,
      thisWeek: thisWeekEntries.length
    };
  }
  
  // Dexie version
  const dexieJournal = await import('./journal');
  return await dexieJournal.getJournalStats();
};

// ==================== INSIGHTS ====================

export const getActiveInsights = async () => {
  if (currentUserId) {
    const insights = await firestoreDB.getInsights(currentUserId);
    const active = insights.filter(i => !i.dismissed);
    return active;
  }
  const db = (await import('./database')).default;
  return await db.insights
    .where('dismissed')
    .equals(0)
    .or('dismissed')
    .equals(false)
    .sortBy('generatedAt');
};

export const dismissInsight = async (insightId, reason = null) => {
  if (currentUserId) {
    await firestoreDB.updateInsight(currentUserId, insightId, {
      dismissed: true,
      dismissedAt: new Date().toISOString(),
      dismissReason: reason
    });
    return;
  }
  const db = (await import('./database')).default;
  await db.insights.update(insightId, {
    dismissed: true,
    dismissedAt: new Date().toISOString(),
    dismissReason: reason
  });
};

export const markInsightActedOn = async (insightId) => {
  if (currentUserId) {
    await firestoreDB.updateInsight(currentUserId, insightId, {
      actedOn: true,
      actedOnAt: new Date().toISOString()
    });
    return;
  }
  const db = (await import('./database')).default;
  await db.insights.update(insightId, {
    actedOn: true,
    actedOnAt: new Date().toISOString()
  });
};

export const provideFeedback = async (insightId, feedback) => {
  if (currentUserId) {
    await firestoreDB.updateInsight(currentUserId, insightId, {
      userFeedback: feedback,
      feedbackAt: new Date().toISOString()
    });
    return;
  }
  const db = (await import('./database')).default;
  await db.insights.update(insightId, {
    userFeedback: feedback,
    feedbackAt: new Date().toISOString()
  });
};

export const generateInsights = async () => {
  if (currentUserId) {
    // For Firestore, use the insights generator
    const dexieInsights = await import('./insights');
    const newInsights = await dexieInsights.generateInsights();
    
    // Save to Firestore
    const savedInsights = [];
    for (const insight of newInsights) {
      const id = await firestoreDB.createInsight(currentUserId, insight);
      savedInsights.push({ id, ...insight });
    }
    return savedInsights;
  }
  
  // Dexie version
  const dexieInsights = await import('./insights');
  return await dexieInsights.generateInsights();
};

// ==================== PORTFOLIO ====================

export const getPortfolio = async () => {
  if (currentUserId) {
    return await firestoreDB.getPortfolio(currentUserId);
  }
  
  // For local Dexie, store in a simple structure
  const db = (await import('./database')).default;
  const portfolios = await db.portfolios?.toArray() || [];
  return portfolios[0] || null;
};

export const updatePortfolio = async (portfolioData) => {
  if (currentUserId) {
    await firestoreDB.updatePortfolio(currentUserId, portfolioData);
    return;
  }
  
  const db = (await import('./database')).default;
  await db.portfolios?.clear();
  await db.portfolios?.add({
    id: 'portfolio_1',
    ...portfolioData
  });
};

export const calculatePortfolioBalance = async () => {
  if (currentUserId) {
    return await firestoreDB.calculatePortfolioBalance(currentUserId);
  }
  
  // For Dexie, calculate locally
  const projects = await getAllProjects();
  const timeLogs = await getAllTimeLogs();
  
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
  
  const actualBalance = {
    builder: totalHours > 0 ? (perspectiveHours.builder / totalHours) * 100 : 0,
    contributor: totalHours > 0 ? (perspectiveHours.contributor / totalHours) * 100 : 0,
    integrator: totalHours > 0 ? (perspectiveHours.integrator / totalHours) * 100 : 0,
    experimenter: totalHours > 0 ? (perspectiveHours.experimenter / totalHours) * 100 : 0
  };
  
  return {
    actualBalance,
    totalHours,
    perspectiveHours,
    lastCalculated: new Date().toISOString()
  };
};

export const getProjectsByPerspective = async (perspective) => {
  const projects = await getAllProjects();
  return projects.filter(p => p.perspective === perspective);
};

export const getPerspectiveStats = async () => {
  const projects = await getAllProjects();
  const balance = await calculatePortfolioBalance();
  
  const stats = {
    builder: { count: 0, hours: balance.perspectiveHours.builder },
    contributor: { count: 0, hours: balance.perspectiveHours.contributor },
    integrator: { count: 0, hours: balance.perspectiveHours.integrator },
    experimenter: { count: 0, hours: balance.perspectiveHours.experimenter }
  };
  
  projects.forEach(p => {
    if (p.perspective && stats[p.perspective]) {
      stats[p.perspective].count++;
    }
  });
  
  return stats;
};


export default {
  setCurrentUser,
  
  // Projects
  getAllProjects,
  getActiveProjects,
  getProject,
  getProjectWithStats,
  createProject,
  updateProject,
  deleteProject,
  subscribeToProjects,
  
  // Time Logs
  getAllTimeLogs,
  getTodayTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
  
  // Journal
  getAllJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  
  // Analytics & Stats
  getTimeLogStats,
  getJournalStats,
  
  // Insights
  getActiveInsights,
  dismissInsight,
  markInsightActedOn,
  provideFeedback,
  generateInsights,

  // Portfolio
  getPortfolio,
  updatePortfolio,
  calculatePortfolioBalance,
  getProjectsByPerspective,
  getPerspectiveStats  
};