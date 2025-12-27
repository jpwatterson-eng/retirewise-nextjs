// src/components/JournalList.js
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Star, Calendar, Tag, Trash2, Edit2, Eye } from 'lucide-react';
import * as unifiedDB from '../db/unifiedDB';
import { getJournalStats } from '@/db/journal';
import { getAllProjects } from '@/db/unifiedDB';
import { format } from 'date-fns';
import JournalEntryForm from '@/components/JournalEntryForm';

const JournalList = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery, filterType, filterProject]);

  const loadData = async () => {
    try {
      const [allEntries, allProjects, journalStats] = await Promise.all([
        unifiedDB.getAllJournalEntries(),
        unifiedDB.getAllProjects(),
        getJournalStats()
      ]);
      
      setEntries(allEntries);
      setProjects(allProjects);
      setStats(journalStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading journal data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.content?.toLowerCase().includes(query) ||
        entry.title?.toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'favorites') {
        filtered = filtered.filter(entry => entry.favorite);
      } else {
        filtered = filtered.filter(entry => entry.entryType === filterType);
      }
    }

    // Project filter
    if (filterProject !== 'all') {
      filtered = filtered.filter(entry => entry.projectId === filterProject);
    }

    setFilteredEntries(filtered);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    
    try {
      await unifiedDB.deleteJournalEntry(entryId);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleEntrySaved = () => {
    loadData();
  };

  const getEntryTypeEmoji = (type) => {
    const emojis = {
      reflection: '💭',
      learning: '📚',
      decision: '🎯',
      milestone: '🏆',
      struggle: '💪',
      idea: '💡',
      general: '📝'
    };
    return emojis[type] || '📝';
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: 'text-green-600',
      neutral: 'text-gray-600',
      negative: 'text-red-600'
    };
    return colors[sentiment] || 'text-gray-600';
  };

  const getProjectName = (projectId) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.icon || '📁'} ${project.name}` : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading journal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">This Week</p>
            <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Favorites</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.favorites}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('favorites')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              filterType === 'favorites'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⭐ Favorites
          </button>
          {['reflection', 'learning', 'milestone', 'decision'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getEntryTypeEmoji(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.icon || '📁'} {project.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <p className="text-gray-500 mb-4">
            {entries.length === 0 
              ? 'No journal entries yet. Start writing!' 
              : 'No entries match your filters.'
            }
          </p>
          {entries.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Create First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getEntryTypeEmoji(entry.entryType)}</span>
                    {entry.title && (
                      <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                    )}
                    {entry.favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(entry.date), 'MMM d, yyyy • h:mm a')}</span>
                    {entry.sentiment && (
                      <span className={`${getSentimentColor(entry.sentiment)} font-medium`}>
                        • {entry.sentiment}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                {entry.content}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.projectId && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {getProjectName(entry.projectId)}
                    </span>
                  )}
                  {entry.tags?.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {entry.tags?.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{entry.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Entry Form Modal */}
      {showForm && (
        <JournalEntryForm
          entry={editingEntry}
          onClose={handleCloseForm}
          onSaved={handleEntrySaved}
        />
      )}
    </div>
  );
};

export default JournalList;