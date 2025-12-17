// src/db/journal.js
import db, { generateId } from '@/db/database';

let currentUserId = null;

export const setJournalUserId = (userId) => {
  currentUserId = userId;
};

// Create a new journal entry
export const createJournalEntry = async (entryData) => {
  // If user is logged in, don't save to Dexie (Firestore handles it)  
  if (currentUserId) {
    console.log('⏭️ Skipping Dexie save - using Firestore');
    return;
  }
    
  const entry = {
    id: generateId('journal'),
    date: entryData.date || new Date().toISOString(),
    title: entryData.title || null,
    content: entryData.content,
    contentType: 'text',
    projectId: entryData.projectId || null,
    entryType: entryData.entryType || 'general',
    sentiment: entryData.sentiment || null,
    mood: entryData.mood || null,
    embedding: null,
    aiSummary: null,
    aiExtractedInsights: null,
    aiSuggestedTags: [],
    tags: entryData.tags || [],
    favorite: entryData.favorite || false,
    attachments: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    embeddingGeneratedAt: null
  };
  
  await db.journalEntries.add(entry);
  console.log('✅ Journal entry created:', entry.title || 'Untitled');
  return entry;
};

// Get all journal entries (sorted by date, newest first)
export const getAllJournalEntries = async () => {
  return await db.journalEntries
    .orderBy('date')
    .reverse()
    .toArray();
};

// Get journal entries by project
export const getJournalEntriesByProject = async (projectId) => {
  return await db.journalEntries
    .where('projectId')
    .equals(projectId)
    .reverse()
    .sortBy('date');
};

// Get journal entries by type
export const getJournalEntriesByType = async (entryType) => {
  return await db.journalEntries
    .where('entryType')
    .equals(entryType)
    .reverse()
    .sortBy('date');
};

// Get favorite entries
export const getFavoriteEntries = async () => {
  return await db.journalEntries
    .where('favorite')
    .equals(true)
    .reverse()
    .sortBy('date');
};

// Get recent entries (last N days)
export const getRecentEntries = async (days = 7) => {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  
  return await db.journalEntries
    .where('date')
    .above(sinceDate.toISOString())
    .reverse()
    .sortBy('date');
};

// Get single entry
export const getJournalEntry = async (entryId) => {
  return await db.journalEntries.get(entryId);
};

// Update journal entry
export const updateJournalEntry = async (entryId, updates) => {
  await db.journalEntries.update(entryId, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  
  const updated = await db.journalEntries.get(entryId);
  console.log('✅ Journal entry updated');
  return updated;
};

// Delete journal entry
export const deleteJournalEntry = async (entryId) => {
  await db.journalEntries.delete(entryId);
  console.log('✅ Journal entry deleted');
};

// Search journal entries (simple text search)
export const searchJournalEntries = async (query) => {
  const allEntries = await db.journalEntries.toArray();
  const lowerQuery = query.toLowerCase();
  
  return allEntries.filter(entry => 
    entry.content?.toLowerCase().includes(lowerQuery) ||
    entry.title?.toLowerCase().includes(lowerQuery) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Get entry statistics
export const getJournalStats = async () => {
  const allEntries = await db.journalEntries.toArray();
  
  const stats = {
    total: allEntries.length,
    byType: {},
    bySentiment: {},
    favorites: allEntries.filter(e => e.favorite).length,
    thisWeek: 0,
    thisMonth: 0
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  allEntries.forEach(entry => {
    // Count by type
    stats.byType[entry.entryType] = (stats.byType[entry.entryType] || 0) + 1;
    
    // Count by sentiment
    if (entry.sentiment) {
      stats.bySentiment[entry.sentiment] = (stats.bySentiment[entry.sentiment] || 0) + 1;
    }
    
    // Count recent entries
    const entryDate = new Date(entry.date);
    if (entryDate >= weekAgo) stats.thisWeek++;
    if (entryDate >= monthAgo) stats.thisMonth++;
  });
  
  return stats;
};

export default {
  createJournalEntry,
  getAllJournalEntries,
  getJournalEntriesByProject,
  getJournalEntriesByType,
  getFavoriteEntries,
  getRecentEntries,
  getJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  searchJournalEntries,
  getJournalStats
};