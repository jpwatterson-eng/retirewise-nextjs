// src/components/QuickTimeLog.js
'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import TimeLogForm from '@/components/TimeLogForm';

const QuickTimeLog = ({ projectId = null }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-36 right-6 w-12 h-12 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-110 flex items-center justify-center z-40"
        title="Quick time log"
      >
        <Clock className="w-5 h-5" />
      </button>

      {showForm && (
        <TimeLogForm
          preselectedProjectId={projectId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            // Optionally trigger a refresh of parent component
            window.dispatchEvent(new Event('timeLogAdded'));
          }}
        />
      )}
    </>
  );
};

export default QuickTimeLog;