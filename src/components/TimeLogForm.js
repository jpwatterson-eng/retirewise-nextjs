// src/components/TimeLogForm.js
'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Zap, TrendingUp, Smile } from 'lucide-react';
import * as unifiedDB from '@/db/unifiedDB';
import { format } from 'date-fns';

const TimeLogForm = ({ log, onClose, onSaved, projectId, projectName }) => {
  const isEdit = !!log;
  
  const [formData, setFormData] = useState({
    projectId: projectId || '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration: '',
    activityType: 'coding',
    perspective: 'builder', // Default for new logs
    description: '',
    energyLevel: 3, // Provide a numeric default
    productivityFeeling: 3,
    enjoymentLevel: 3,
    location: '', // Initialized as empty string, not undefined
    notes: ''
  });
  
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

useEffect(() => {
    loadProjects();
    
    if (log) {
      setFormData({
        // Use logical OR (||) to provide fallbacks for EVERY field
        projectId: log.projectId || '',
        date: log.date ? format(new Date(log.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duration: log.duration || '',
        activityType: log.activityType || 'coding',
        perspective: log.perspective || 'builder', // Fallback for legacy logs
        description: log.description || '',
        energyLevel: log.energyLevel || 3,
        productivityFeeling: log.productivityFeeling || 3,
        enjoymentLevel: log.enjoymentLevel || 3,
        location: log.location || '', // Ensure this is never undefined
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

  const handleDelete = async () => {
  // 1. Safety Confirmation
  if (!window.confirm("Are you sure you want to delete this time log? This cannot be undone.")) {
    return;
  }

  setSaving(true);

  try {
    // 2. Call the deletion method in unifiedDB
    await unifiedDB.deleteTimeLog(log.id);
    
    // 3. Trigger Hub refresh and close the form
    onSaved(); 
    onClose();
  } catch (error) {
    console.error("Error deleting log:", error);
    alert("Failed to delete the log. Please try again.");
  } finally {
    setSaving(false);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.projectId || !formData.duration) {
    console.error("Missing required fields:", { 
      project: formData.projectId, 
      duration: formData.duration 
    });
    return;
  }

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const normalizedPerspective = (selectedProject?.perspective || formData.perspective || 'builder').toLowerCase();

  setSaving(true);
try {
    const logData = {
      ...formData,
      date: new Date(formData.date).toISOString(),
      duration: parseFloat(formData.duration),
      projectName: selectedProject?.name || "Unknown Project",
      perspective: normalizedPerspective,
      sourceApp: 'retirewise', // 🔥 THIS WAS MISSING
      // If we are passing a custom source from the parent, use it, else default
      source: formData.source || (isEdit ? 'edit' : 'Method C - Full Form'),
      updatedAt: new Date().toISOString()
    };

    if (isEdit) {
      await unifiedDB.updateTimeLog(log.id, logData);
    } else {
      await unifiedDB.createTimeLog(logData);
    }

    // Reset form after successful save to prevent "ghosting"
setFormData({
      projectId: projectId || '', 
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration: '',
      activityType: 'coding',
      description: '',
      energyLevel: 3,
      productivityFeeling: 3,
      enjoymentLevel: 3,
      location: '',
      notes: ''
    });
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
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* FIXED HEADER - projectName is now defined */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 italic tracking-tighter">
              <Clock className="w-6 h-6 text-blue-600" />
              {isEdit ? 'Refine History' : 'Log Momentum'}
            </h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Project: {projectName || log?.projectName || "Legacy Record"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

      {/* 2. SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-white">
        <form id="time-log-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
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
        </form>
        </div>
        {/* 3. FIXED FOOTER (Buttons are always visible here) */}
        <div className="flex flex-col gap-3">
        <div className="flex gap-3">
        {/*<div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex gap-3"> */}
          <button type="button" onClick={onClose} className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs">
            Cancel
          </button>
          <button 
            form="time-log-form"
            type="submit" 
            disabled={saving}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg"
          >
            {saving ? 'Syncing...' : isEdit ? 'Update Entry ✨' : 'Log Effort 🚀'}
          </button>
        </div>
        {/* NEW: Delete Button for existing records */}
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="w-full py-3 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors mt-2"
          >
            Delete Record
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default TimeLogForm;