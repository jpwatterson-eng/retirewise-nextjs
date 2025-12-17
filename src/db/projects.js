// src/db/projects.js
import db, { generateId } from '@/db/database';

// Create a new project
export const createProject = async (projectData) => {
  const project = {
    id: generateId('proj'),
    name: projectData.name,
    type: projectData.type || 'building',
    status: 'planning',
    createdAt: new Date().toISOString(),
    startedAt: null,
    lastWorkedAt: null,
    completedAt: null,
    totalHoursLogged: 0,
    targetHours: projectData.targetHours || null,
    description: projectData.description || '',
    goals: projectData.goals || [],
    motivation: projectData.motivation || '',
    tags: projectData.tags || [],
    color: projectData.color || '#3B82F6',
    icon: projectData.icon || null,
    externalLinks: projectData.externalLinks || {},
    aiSummary: null,
    lastAIReviewAt: null
  };
  
  await db.projects.add(project);
  console.log('✅ Project created:', project.name);
  return project;
};

// Get all projects
export const getAllProjects = async () => {
  return await db.projects.toArray();
};

// Get projects by status
export const getProjectsByStatus = async (status) => {
  return await db.projects.where('status').equals(status).toArray();
};

// Get active projects (active, planning, or recently worked on)
export const getActiveProjects = async () => {
  const allProjects = await db.projects.toArray();
  
  return allProjects.filter(project => {
    if (project.status === 'active' || project.status === 'planning') return true;
    if (project.status === 'paused' && project.lastWorkedAt) {
      const daysSinceWork = Math.floor(
        (new Date() - new Date(project.lastWorkedAt)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceWork < 30; // Show paused projects worked on in last 30 days
    }
    return false;
  });
};

// getProject moved from unifiedDB.js

export const getProject = async (projectId) => {
//  if (currentUserId) {
//    return await firestoreDB.getProject(currentUserId, projectId);
//  }
//  return await dexieProjects.getProject(projectId);
  return await db.projects.get(projectId);

};

// Update project
export const updateProject = async (projectId, updates) => {
  await db.projects.update(projectId, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  
  const updated = await db.projects.get(projectId);
  console.log('✅ Project updated:', updated.name);
  return updated;
};

// Update project hours (called when time log added)
export const updateProjectHours = async (projectId, additionalHours) => {
  const project = await db.projects.get(projectId);
  
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  const updates = {
    totalHoursLogged: project.totalHoursLogged + additionalHours,
    lastWorkedAt: new Date().toISOString()
  };
  
  // Auto-activate project if in planning
  if (project.status === 'planning' && !project.startedAt) {
    updates.status = 'active';
    updates.startedAt = new Date().toISOString();
  }
  
  await db.projects.update(projectId, updates);
  return await db.projects.get(projectId);
};

// Delete project
export const deleteProject = async (projectId) => {
  // Also delete related time logs and journal entries
  await db.timeLogs.where('projectId').equals(projectId).delete();
  await db.journalEntries.where('projectId').equals(projectId).delete();
  await db.projects.delete(projectId);
  
  console.log('✅ Project and related data deleted');
};

// Get project with stats
export const getProjectWithStats = async (projectId) => {
  const project = await db.projects.get(projectId);
  
  if (!project) return null;
  
  const timeLogs = await db.timeLogs.where('projectId').equals(projectId).toArray();
  const journals = await db.journalEntries.where('projectId').equals(projectId).toArray();
  
  const avgEnergyLevel = timeLogs.length > 0
    ? timeLogs.reduce((sum, log) => sum + (log.energyLevel || 0), 0) / timeLogs.filter(l => l.energyLevel).length
    : null;
  
  const lastWeekHours = timeLogs
    .filter(log => {
      const logDate = new Date(log.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    })
    .reduce((sum, log) => sum + log.duration, 0);
  
  return {
    ...project,
    stats: {
      totalTimeLogs: timeLogs.length,
      totalJournalEntries: journals.length,
      averageEnergyLevel: avgEnergyLevel ? avgEnergyLevel.toFixed(1) : null,
      lastWeekHours,
      daysActive: timeLogs.length > 0 ? new Set(timeLogs.map(l => l.date)).size : 0
    }
  };
};

export default {
  createProject,
  getAllProjects,
  getProjectsByStatus,
  getActiveProjects,
  updateProject,
  updateProjectHours,
  deleteProject,
  getProject,
  getProjectWithStats
};