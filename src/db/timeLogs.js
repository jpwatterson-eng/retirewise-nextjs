// src/db/timeLogs.js
import db, { generateId } from '@/db/database';
import { updateProjectHours } from '@/db/projects';

// Create a new time log
export const createTimeLog = async (logData) => {
  const log = {
    id: generateId('time'),
    projectId: logData.projectId,
    date: logData.date || new Date().toISOString(),
    startTime: logData.startTime || null,
    endTime: logData.endTime || null,
    duration: logData.duration,
    activityType: logData.activityType || 'other',
    description: logData.description || '',
    energyLevel: logData.energyLevel || null,
    productivityFeeling: logData.productivityFeeling || null,
    enjoymentLevel: logData.enjoymentLevel || null,
    tags: logData.tags || [],
    location: logData.location || null,
    notes: logData.notes || '',
    linkedJournalId: logData.linkedJournalId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await db.timeLogs.add(log);
  
  // Update project total hours
  await updateProjectHours(logData.projectId, logData.duration);
  
  console.log('✅ Time log created:', logData.duration, 'hours');
  return log;
};

// Get all time logs (sorted by date, newest first)
// Get all time logs (sorted by date, newest first) with project details
export const getAllTimeLogs = async () => {
  const logs = await db.timeLogs
    .orderBy('date')
    .reverse()
    .toArray();
  
  // Get all projects to enrich the logs
  const projects = await db.projects.toArray();
  
  // Create a map for quick project lookup
  const projectMap = projects.reduce((map, project) => {
    map[project.id] = project;
    return map;
  }, {});
  
  // Enrich logs with project data
  return logs.map(log => {
    const project = projectMap[log.projectId];
    return {
      ...log,
      projectName: project?.name || 'Unknown Project',
      projectColor: project?.color,
      projectIcon: project?.icon
    };
  });
};

// Get time logs for a specific project
export const getTimeLogsByProject = async (projectId) => {
  return await db.timeLogs
    .where('projectId')
    .equals(projectId)
    .reverse()
    .sortBy('date');
};

// Get time logs for a date range
export const getTimeLogsByDateRange = async (startDate, endDate) => {
  return await db.timeLogs
    .where('date')
    .between(startDate.toISOString(), endDate.toISOString(), true, true)
    .reverse()
    .sortBy('date');
};

// Get recent time logs (last N days)
export const getRecentTimeLogs = async (days = 7) => {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  
  return await db.timeLogs
    .where('date')
    .above(sinceDate.toISOString())
    .reverse()
    .sortBy('date');
};

// Get today's time logs
export const getTodayTimeLogs = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await db.timeLogs
    .where('date')
    .between(today.toISOString(), tomorrow.toISOString(), true, false)
    .toArray();
};

// Get single time log
export const getTimeLog = async (logId) => {
  return await db.timeLogs.get(logId);
};

// Update time log
export const updateTimeLog = async (logId, updates) => {
  const oldLog = await db.timeLogs.get(logId);
  
  await db.timeLogs.update(logId, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  
  // If duration or project changed, update project hours
  if (updates.duration !== undefined || updates.projectId !== undefined) {
    // Remove old hours from old project
    if (oldLog.projectId) {
      await updateProjectHours(oldLog.projectId, -oldLog.duration);
    }
    
    // Add new hours to new project
    const newProjectId = updates.projectId || oldLog.projectId;
    const newDuration = updates.duration !== undefined ? updates.duration : oldLog.duration;
    await updateProjectHours(newProjectId, newDuration);
  }
  
  const updated = await db.timeLogs.get(logId);
  console.log('✅ Time log updated');
  return updated;
};

// Delete time log
export const deleteTimeLog = async (logId) => {
  const log = await db.timeLogs.get(logId);
  
  if (log) {
    // Remove hours from project
    await updateProjectHours(log.projectId, -log.duration);
    
    await db.timeLogs.delete(logId);
    console.log('✅ Time log deleted');
  }
};

// Get time log statistics
export const getTimeLogStats = async (projectId = null) => {
  let logs;
  
  if (projectId) {
    logs = await getTimeLogsByProject(projectId);
  } else {
    logs = await getAllTimeLogs();
  }
  
  const stats = {
    totalHours: 0,
    totalLogs: logs.length,
    byActivity: {},
    byDay: {},
    averageSessionLength: 0,
    averageEnergy: 0,
    averageProductivity: 0,
    averageEnjoyment: 0,
    thisWeek: 0,
    thisMonth: 0
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  let energyCount = 0;
  let productivityCount = 0;
  let enjoymentCount = 0;
  
  logs.forEach(log => {
    // Total hours
    stats.totalHours += log.duration;
    
    // By activity type
    stats.byActivity[log.activityType] = (stats.byActivity[log.activityType] || 0) + log.duration;
    
    // By day of week
    const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });
    stats.byDay[day] = (stats.byDay[day] || 0) + log.duration;
    
    // Average ratings
    if (log.energyLevel) {
      stats.averageEnergy += log.energyLevel;
      energyCount++;
    }
    if (log.productivityFeeling) {
      stats.averageProductivity += log.productivityFeeling;
      productivityCount++;
    }
    if (log.enjoymentLevel) {
      stats.averageEnjoyment += log.enjoymentLevel;
      enjoymentCount++;
    }
    
    // Recent time
    const logDate = new Date(log.date);
    if (logDate >= weekAgo) stats.thisWeek += log.duration;
    if (logDate >= monthAgo) stats.thisMonth += log.duration;
  });
  
  // Calculate averages
  if (logs.length > 0) {
    stats.averageSessionLength = stats.totalHours / logs.length;
  }
  if (energyCount > 0) {
    stats.averageEnergy = stats.averageEnergy / energyCount;
  }
  if (productivityCount > 0) {
    stats.averageProductivity = stats.averageProductivity / productivityCount;
  }
  if (enjoymentCount > 0) {
    stats.averageEnjoyment = stats.averageEnjoyment / enjoymentCount;
  }
  
  return stats;
};

// Get all projects (helper for components)
export const getAllProjects = async () => {
  return await db.projects.toArray();
};

export default {
  createTimeLog,
  getAllTimeLogs,
  getTimeLogsByProject,
  getTimeLogsByDateRange,
  getRecentTimeLogs,
  getTodayTimeLogs,
  getTimeLog,
  updateTimeLog,
  deleteTimeLog,
  getTimeLogStats,
  getAllProjects
};