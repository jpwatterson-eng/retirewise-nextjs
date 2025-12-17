// src/db/database.js
import Dexie from 'dexie';

// Initialize the database
const db = new Dexie('RetireWiseDB');

// Define schema version 1
db.version(2).stores({
  projects: 'id, status, type, lastWorkedAt',
  timeLogs: 'id, projectId, date, [projectId+date]',
  journalEntries: 'id, date, projectId, entryType, favorite',
  conversations: 'id, startedAt, lastMessageAt, conversationType, archived',
  insights: 'id, type, priority, dismissed, generatedAt, [dismissed+validUntil]',
  perspectiveScores: 'id, date',
  settings: 'id',
  embeddingsCache: 'id, sourceType, sourceId, lastUsedAt'
});

// Helper function to generate UUIDs
export const generateId = (prefix = '') => {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
};

// Initialize with default settings if first time
db.on('ready', async () => {
  const settings = await db.settings.get('user_settings');
  
  if (!settings) {
    await db.settings.add({
      id: 'user_settings',
      profile: {
        name: null,
        retirementDate: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        weekStartsOn: 'monday'
      },
      ai: {
        apiKey: null,
        personality: 'friendly',
        proactiveness: 'medium',
        contextDepth: 'moderate'
      },
      notifications: {
        enabled: true,
        dailyCheckIn: true,
        weeklyReview: true,
        insightAlerts: true,
        preferredTime: '09:00'
      },
      privacy: {
        syncEnabled: false,
        backupEnabled: false,
        encryptionEnabled: false,
        lastBackup: null,
        lastSync: null
      },
      ui: {
        theme: 'auto',
        dateFormat: 'EU',
        timeFormat: '24h',
        compactMode: false,
        showPerspectiveScores: true
      },
      tracking: {
        autoLogFromCalendar: false,
        requireActivityType: true,
        requireEnergyFeedback: true,
        defaultLogDuration: 2
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0'
    });
    
    console.log('✅ Default settings initialized');
  }
});

export default db;