// src/components/JournalEntryForm.js
'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Tag, BookOpen, Smile, Meh, Frown } from 'lucide-react';
import { Sparkles, Loader2 } from 'lucide-react';
import { suggestJournalPerspectives } from '@/services/insightService';
import * as unifiedDB from '@/db/unifiedDB';

const JournalEntryForm = ({ entry, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entryType: 'general',
    date: new Date().toISOString(),
    projectId: null,
    tags: [],
    sentiment: 'neutral',
    favorite: false
  });
  const [tagInput, setTagInput] = useState('');
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadProjects();
    
    if (entry) {
      setFormData({
        title: entry.title || '',
        content: entry.content || '',
        entryType: entry.entryType || 'general',
        date: entry.date || new Date().toISOString(),
        projectId: entry.projectId || null,
        tags: entry.tags || [],
        sentiment: entry.sentiment || 'neutral',
        favorite: entry.favorite || false
      });
    }
  }, [entry]);

  const loadProjects = async () => {
    try {
      const allProjects = await unifiedDB.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      alert('Please write some content');
      return;
    }

    setSaving(true);
    
    try {
      if (entry) {
        // Update existing entry
        await unifiedDB.updateJournalEntry(entry.id, formData);
        console.log('✅ Journal entry updated');
      } else {
        // Create new entry
        await unifiedDB.createJournalEntry(formData);
        console.log('✅ Journal entry created');
      }
      
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAISuggestTags = async () => {
  if (!formData.content) return;
  
  setIsAnalyzing(true);
  try {
    const suggestions = await suggestJournalPerspectives(formData.content);
    
    // Merge suggestions with existing tags, avoiding duplicates
    const newTags = [...new Set([...formData.tags, ...suggestions])];
    setFormData({ ...formData, tags: newTags });
  } catch (error) {
    console.error("Failed to get AI tags", error);
  } finally {
    setIsAnalyzing(false);
  }
};
  const entryTypes = [
    { value: 'general', label: 'General', emoji: '📝' },
    { value: 'reflection', label: 'Reflection', emoji: '💭' },
    { value: 'learning', label: 'Learning', emoji: '📚' },
    { value: 'decision', label: 'Decision', emoji: '🎯' },
    { value: 'milestone', label: 'Milestone', emoji: '🏆' },
    { value: 'struggle', label: 'Struggle', emoji: '💪' },
    { value: 'idea', label: 'Idea', emoji: '💡' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {entry ? 'Edit Entry' : 'New Journal Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Give your entry a title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entry Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {entryTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, entryType: type.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    formData.entryType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1 block">{type.emoji}</span>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="What's on your mind?"
              rows={8}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Project Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Project (Optional)
            </label>
            <select
              value={formData.projectId || ''}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.icon || '📁'} {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
            {/*<label className="block text-sm font-medium text-gray-700 mb-2"> */}
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Tag className="w-3 h-3" />
              Tags & Perspectives
            </label>

            {/* NEW: AI Suggest Button */}
            <button
              type="button"
              onClick={handleAISuggestTags}
              disabled={isAnalyzing || !formData.content}
              className="text-xs flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
              <Sparkles className="w-3 h-3" />
              )}
              AI Suggest
            </button>

            </div>
{/* original div */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add
              </button>
            </div>
            {/* end orig div */}

            

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => ( // Added 'index' here
  <span
    key={index} 
    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
      ["BUILDER", "EXPERIMENTER", "CONTRIBUTOR", "INTEGRATOR"].includes(tag.toUpperCase())
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    {tag}
    <button
      type="button"
      onClick={() => removeTag(tag)}
      className="hover:text-red-200 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
))}
              </div>
            )}
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How are you feeling?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sentiment: 'positive' })}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.sentiment === 'positive'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smile className={`w-8 h-8 mx-auto mb-1 ${
                  formData.sentiment === 'positive' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className="text-xs font-medium">Positive</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sentiment: 'neutral' })}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.sentiment === 'neutral'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Meh className={`w-8 h-8 mx-auto mb-1 ${
                  formData.sentiment === 'neutral' ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <span className="text-xs font-medium">Neutral</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sentiment: 'negative' })}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.sentiment === 'negative'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Frown className={`w-8 h-8 mx-auto mb-1 ${
                  formData.sentiment === 'negative' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <span className="text-xs font-medium">Negative</span>
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="datetime-local"
              value={new Date(formData.date).toISOString().slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 pb-20 border-t border-gray-200 flex gap-3 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {entry ? 'Update' : 'Save'} Entry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryForm;