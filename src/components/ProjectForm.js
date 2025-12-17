// src/components/ProjectForm.js
'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';

const ProjectForm = ({ project, onClose, onSaved }) => {
  const isEdit = !!project;
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'building',
    status: 'planning',
    description: '',
    motivation: '',
    goals: [],
    tags: [],
    color: '#3B82F6',
    icon: '',
    targetHours: ''
  });
  
  const [goalInput, setGoalInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        type: project.type || 'building',
        status: project.status || 'planning',
        description: project.description || '',
        motivation: project.motivation || '',
        goals: project.goals || [],
        tags: project.tags || [],
        color: project.color || '#3B82F6',
        icon: project.icon || '',
        targetHours: project.targetHours || ''
      });
    }
  }, [project]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addGoal = () => {
    if (goalInput.trim()) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, goalInput.trim()]
      }));
      setGoalInput('');
    }
  };

  const removeGoal = (index) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const projectData = {
        ...formData,
        targetHours: formData.targetHours ? parseFloat(formData.targetHours) : null
      };

      if (isEdit) {
        await unifiedDB.updateProject(project.id, projectData);
      } else {
        await unifiedDB.createProject(projectData);
      }
      
      // Dispatch event
      window.dispatchEvent(new Event('projectUpdated'));

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const projectTypes = [
    { value: 'building', label: 'Building', description: 'Creating products or tools' },
    { value: 'consulting', label: 'Consulting', description: 'Advising others' },
    { value: 'learning', label: 'Learning', description: 'Acquiring new skills' },
    { value: 'contributing', label: 'Contributing', description: 'Helping others directly' },
    { value: 'wildcard', label: 'Wildcard', description: 'Something completely different' }
  ];

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'complete', label: 'Complete' },
    { value: 'archived', label: 'Archived' }
  ];

  const colorPresets = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
    '#EF4444', '#EC4899', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="e.g., Wanderwise, AI Learning"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projectTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('type', type.value)}
                  className={`p-3 border-2 rounded-xl text-left transition-colors ${
                    formData.type === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800 text-sm">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Status (only show for edit) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What is this project about?"
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivation
            </label>
            <textarea
              value={formData.motivation}
              onChange={(e) => handleChange('motivation', e.target.value)}
              placeholder="Why are you doing this?"
              rows="2"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Goals
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                placeholder="Add a goal..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {formData.goals.length > 0 && (
              <ul className="space-y-2">
                {formData.goals.map((goal, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="flex-1 text-sm text-gray-700">{goal}</span>
                    <button
                      type="button"
                      onClick={() => removeGoal(idx)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Color & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleChange('color', color)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Icon (emoji)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => handleChange('icon', e.target.value)}
                placeholder="🚀"
                maxLength="2"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl"
              />
            </div>
          </div>

          {/* Target Hours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Hours (optional)
            </label>
            <input
              type="number"
              value={formData.targetHours}
              onChange={(e) => handleChange('targetHours', e.target.value)}
              placeholder="e.g., 100"
              min="0"
              step="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;