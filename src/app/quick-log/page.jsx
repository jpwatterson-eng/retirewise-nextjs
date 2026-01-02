// app/quick-log/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, orderBy, limit } from 'firebase/firestore';

const PERSPECTIVES = [
  { id: 'enjoy', label: 'Enjoy', icon: '🎨', color: 'bg-purple-500' },
  { id: 'learn', label: 'Learn', icon: '📚', color: 'bg-blue-500' },
  { id: 'earn', label: 'Earn', icon: '💰', color: 'bg-green-500' },
  { id: 'contribute', label: 'Contribute', icon: '🤝', color: 'bg-orange-500' },
];

const QUICK_DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: 'Custom', minutes: null },
];

export default function QuickLogPage() {
  const { user } = useAuth();
  const [perspective, setPerspective] = useState(null);
  const [project, setProject] = useState('');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [note, setNote] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load recent projects
  useEffect(() => {
    if (!user) return;
    
    const loadRecentProjects = async () => {
      try {
        const timeLogsRef = collection(db, `users/${user.uid}/timeLogs`);
        const q = query(
          timeLogsRef,
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const projects = new Set();
        snapshot.docs.forEach(doc => {
          const projectName = doc.data().project;
          if (projectName) projects.add(projectName);
        });
        
        setRecentProjects(Array.from(projects).slice(0, 5));
      } catch (error) {
        console.error('Error loading recent projects:', error);
      }
    };
    
    loadRecentProjects();
  }, [user]);

  const handleLog = async () => {
    if (!user || !perspective || !project) return;
    
    setIsLogging(true);
    
    try {
      const timeLogsRef = collection(db, `users/${user.uid}/timeLogs`);
      await addDoc(timeLogsRef, {
        perspective,
        project,
        duration,
        note: note || null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: 'quick-log',
        appId: 'retirewise', // Add this for multi-app support
      });
      
      // Show success animation
      setShowSuccess(true);
      
      // Reset form after brief delay
      setTimeout(() => {
        setPerspective(null);
        setProject('');
        setDuration(60);
        setCustomDuration('');
        setNote('');
        setShowSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleCustomDuration = (value) => {
    setCustomDuration(value);
    const parsed = parseInt(value);
    setDuration(isNaN(parsed) ? 0 : parsed);
  };

  const canSubmit = perspective && project && duration > 0;

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-700">Logged!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">Quick Log</h1>
        <p className="text-sm text-gray-600">What did you just do?</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Perspective Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Perspective
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PERSPECTIVES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPerspective(p.id)}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${perspective === p.id
                    ? `${p.color} border-transparent text-white scale-105`
                    : 'bg-white border-gray-200 text-gray-700'
                  }
                `}
              >
                <div className="text-3xl mb-1">{p.icon}</div>
                <div className="font-semibold">{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        {perspective && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            {recentProjects.length > 0 && !project && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Recent:</p>
                <div className="flex flex-wrap gap-2">
                  {recentProjects.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProject(p)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Enter project name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
              autoFocus={!recentProjects.length}
            />
          </div>
        )}

        {/* Duration */}
        {project && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => {
                    if (d.minutes) {
                      setDuration(d.minutes);
                      setCustomDuration('');
                    } else {
                      setCustomDuration('');
                    }
                  }}
                  className={`
                    py-3 rounded-lg border-2 font-semibold transition-all text-sm
                    ${duration === d.minutes && d.minutes
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700'
                    }
                  `}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {(customDuration || (!QUICK_DURATIONS.slice(0, -1).some(d => d.minutes === duration))) && (
              <input
                type="number"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                placeholder="Custom minutes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            )}
          </div>
        )}

        {/* Optional Note */}
        {duration > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any quick thoughts?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
            />
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <button
          onClick={handleLog}
          disabled={!canSubmit || isLogging}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all
            ${canSubmit && !isLogging
              ? 'bg-blue-600 text-white active:scale-95'
              : 'bg-gray-200 text-gray-400'
            }
          `}
        >
          {isLogging ? 'Logging...' : 'Log It ✓'}
        </button>
      </div>
    </div>
  );
}