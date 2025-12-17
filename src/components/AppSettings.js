'use client';

import React, { useState, useEffect } from 'react';
import { Key, Download, Upload, Trash2, AlertTriangle, Check, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import db from '@/db/database';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { currentUser } = useAuth();

  // Check if API key is configured via environment variable
  // const isApiKeyConfigured = !!process.env.REACT_APP_ANTHROPIC_API_KEY;
  // const isApiKeyConfigured = !!process.env.NEXT_PUBLIC_CLAUDE_API_KEY;

  const isApiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await db.settings.get('user_settings');
      if (userSettings) {
        setSettings(userSettings);
        // Don't load the actual API key for security
        setApiKey(userSettings.ai?.apiKey ? '••••••••••••••••' : '');
      } else {
        // No settings found, create default settings
        const defaultSettings = {
          id: 'user_settings',
          notifications: {
            dailyCheckIn: true,
            weeklyReview: true,
            insightAlerts: true
          },
          ui: {
            theme: 'auto',
            showPerspectiveScores: true
          },
          ai: {
            apiKey: null
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.settings.add(defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default settings even on error
      setSettings({
        notifications: { dailyCheckIn: true, weeklyReview: true, insightAlerts: true },
        ui: { theme: 'auto', showPerspectiveScores: true },
        ai: { apiKey: null }
      });
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey === '••••••••••••••••') return;
    
    setSaving(true);
    try {
      await db.settings.update('user_settings', {
        ai: {
          ...settings.ai,
          apiKey: apiKey
        },
        updatedAt: new Date().toISOString()
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Reload settings
      await loadSettings();
      setShowApiKey(false);
      
      console.log('✅ API key saved');
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePreference = async (category, key, value) => {
    try {
      const updates = {
        [category]: {
          ...settings[category],
          [key]: value
        },
        updatedAt: new Date().toISOString()
      };
      
      await db.settings.update('user_settings', updates);
      await loadSettings();
      
      console.log(`✅ Updated ${category}.${key}`);
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const allData = {
        projects: await db.projects.toArray(),
        timeLogs: await db.timeLogs.toArray(),
        journalEntries: await db.journalEntries.toArray(),
        conversations: await db.conversations.toArray(),
        settings: await db.settings.toArray(),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `retirewise-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      alert('✅ Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.projects || !data.exportDate) {
        throw new Error('Invalid backup file format');
      }
      
      const confirmed = window.confirm(
        'This will replace all current data. Are you sure you want to import?'
      );
      
      if (!confirmed) return;
      
      // Clear existing data
      await db.projects.clear();
      await db.timeLogs.clear();
      await db.journalEntries.clear();
      await db.conversations.clear();
      
      // Import new data
      await db.projects.bulkAdd(data.projects);
      await db.timeLogs.bulkAdd(data.timeLogs);
      await db.journalEntries.bulkAdd(data.journalEntries);
      if (data.conversations) {
        await db.conversations.bulkAdd(data.conversations);
      }
      
      alert('✅ Data imported successfully! Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data: ' + error.message);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL your data including projects, time logs, journal entries, and conversations. This cannot be undone.\n\nAre you absolutely sure?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = window.confirm(
      'Last chance! Type YES in the next prompt to confirm deletion.'
    );
    
    if (!doubleConfirm) return;
    
    const finalConfirm = prompt('Type YES to confirm deletion:');
    
    if (finalConfirm !== 'YES') {
      alert('Deletion cancelled');
      return;
    }
    
    try {
      await db.projects.clear();
      await db.timeLogs.clear();
      await db.journalEntries.clear();
      await db.conversations.clear();
      await db.insights.clear();
      await db.perspectiveScores.clear();
      await db.embeddingsCache.clear();
      
      alert('✅ All data cleared. Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data');
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* API Key Section - Only show in development or if not configured */}
      {(isDevelopment && !isApiKeyConfigured) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Claude API Key</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Your API key is stored locally and never leaves your device. Get your key from{' '}
            <a 
              href="https://console.anthropic.com/settings/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              console.anthropic.com
            </a>
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <button
              onClick={handleSaveApiKey}
              disabled={saving || !apiKey || apiKey === '••••••••••••••••'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : saveSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved!
                </>
              ) : 'Save API Key'}
            </button>
          </div>
        </div>
      )}

      {/* API Key Status - Show in production */}
      {isApiKeyConfigured && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="w-5 h-5" />
            <p className="font-medium">API Key Configured</p>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Your AI features are enabled and ready to use.
          </p>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Notifications</h2>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-700">Daily check-in reminder</span>
            <input
              type="checkbox"
              checked={settings.notifications?.dailyCheckIn}
              onChange={(e) => handleUpdatePreference('notifications', 'dailyCheckIn', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-700">Weekly review notification</span>
            <input
              type="checkbox"
              checked={settings.notifications?.weeklyReview}
              onChange={(e) => handleUpdatePreference('notifications', 'weeklyReview', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-700">AI insight alerts</span>
            <input
              type="checkbox"
              checked={settings.notifications?.insightAlerts}
              onChange={(e) => handleUpdatePreference('notifications', 'insightAlerts', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* UI Preferences */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Appearance</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={settings.ui?.theme || 'auto'}
              onChange={(e) => handleUpdatePreference('ui', 'theme', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          <label className="flex items-center justify-between">
            <span className="text-gray-700">Show perspective scores</span>
            <input
              type="checkbox"
              checked={settings.ui?.showPerspectiveScores}
              onChange={(e) => handleUpdatePreference('ui', 'showPerspectiveScores', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Data Management</h2>
        
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Export All Data
          </button>
          
          <label className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium cursor-pointer">
            <Upload className="w-5 h-5" />
            Import Data
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
          
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleClearAllData}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              <Trash2 className="w-5 h-5" />
              Clear All Local Data
            </button>
            <p className="text-xs text-red-600 text-center mt-2">
              ⚠️ This only clears local storage, not cloud data
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-800">About RetireWise</h2>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Version:</strong> 1.0.0 MVP</p>
          <p><strong>Built:</strong> December 2024</p>
          <p><strong>Storage:</strong> Firebase Firestore (Cloud)</p>
          <p><strong>AI Model:</strong> Claude Sonnet 4</p>
          <p className="pt-3 border-t border-gray-200">
            Your intelligent retirement portfolio advisor. Data syncs across all your devices via the cloud.
          </p>
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-2">☁️ Cloud Storage</p>
        <p>
          Your data is securely stored in Firebase Firestore and syncs automatically across all your devices. 
          When you use AI chat features, messages are sent to Claude API via a secure proxy server.
        </p>
      </div>
    </div>
  );
};

export default Settings;