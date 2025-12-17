// src/components/TimeLogForm.js
'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Zap, TrendingUp, Smile } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';
import { format } from 'date-fns';

const TimeLogForm = ({ log, onClose, onSaved, preselectedProjectId = null }) => {
  const isEdit = !!log;
  
  const [formData, setFormData] = useState({
    projectId: preselectedProjectId || '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration: '',
    activityType: 'coding',
    description: '',
    energyLevel: null,
    productivityFeeling: null,
    enjoymentLevel: null,
    location: '',
    notes: ''
  });
  
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
    
    if (log) {
      setFormData({
        projectId: log.projectId || '',
        date: log.date ? format(new Date(log.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duration: log.duration || '',
        activityType: log.activityType || 'coding',
        description: log.description || '',
        energyLevel: log.energyLevel || null,
        productivityFeeling: log.productivityFeeling || null,
        enjoymentLevel: log.enjoymentLevel || null,
        location: log.location || '',
        notes: log.notes || ''
      });
    }
  }, [log]);

  const loadProjects = async () => {
    const allProjects = await unifiedDB.getAllProjects();
    setProjects(allProjects);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.duration) return;
    
    setSaving(true);

    try {
      const logData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        duration: parseFloat(formData.duration)
      };

      if (isEdit) {
        await unifiedDB.updateTimeLog(log.id, logData);
      } else {
        await unifiedDB.createTimeLog(logData);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving time log:', error);
      alert('Failed to save time log');
    } finally {
      setSaving(false);
    }
  };

  const activityTypes = [
    { value: 'coding', label: 'Coding' },
    { value: 'planning', label: 'Planning' },
    { value: 'learning', label: 'Learning' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'writing', label: 'Writing' },
    { value: 'testing', label: 'Testing' },
    { value: 'research', label: 'Research' },
    { value: 'other', label: 'Other' }
  ];

  const RatingButtons = ({ value, onChange, icon: Icon, label }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(value === rating ? null : rating)}
            className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
              value === rating
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            {isEdit ? 'Edit Time Log' : 'Log Time'}
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
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.icon || '📁'} {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duration (hours) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                required
                min="0.25"
                step="0.25"
                placeholder="e.g., 2.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Activity Type
            </label>
            <select
              value={formData.activityType}
              onChange={(e) => handleChange('activityType', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What did you work on?
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of what you accomplished..."
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Ratings */}
          <div className="space-y-4 bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700">How did it feel? (Optional)</h3>
            
            <RatingButtons
              value={formData.energyLevel}
              onChange={(val) => handleChange('energyLevel', val)}
              icon={Zap}
              label="Energy Level"
            />
            
            <RatingButtons
              value={formData.productivityFeeling}
              onChange={(val) => handleChange('productivityFeeling', val)}
              icon={TrendingUp}
              label="Productivity"
            />
            
            <RatingButtons
              value={formData.enjoymentLevel}
              onChange={(val) => handleChange('enjoymentLevel', val)}
              icon={Smile}
              label="Enjoyment"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location (optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., home, coffee shop, office"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any other observations or context..."
              rows="2"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              disabled={saving || !formData.projectId || !formData.duration}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeLogForm;