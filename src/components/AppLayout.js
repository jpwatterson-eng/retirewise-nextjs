'use client';

import React, { useState } from 'react';
import { Home as HomeIcon, MessageSquare, BookOpen, BarChart3, Settings, Plus, FolderOpen, Lightbulb, Target } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import QuickTimeLog from './QuickTimeLog';
import ProjectForm from './ProjectForm';

export default function AppLayout({ children, showFAB = false }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { id: 'hub', path: '/', icon: HomeIcon, label: 'Hub' },
    { id: 'chat', path: '/chat', icon: MessageSquare, label: 'AI Advisor' },
    { id: 'journal', path: '/journal', icon: BookOpen, label: 'Journal' },
    { id: 'stats', path: '/analytics', icon: BarChart3, label: 'Analytics' },

    { id: 'portfolio', path: '/portfolio', icon: Target, label: 'Portfolio' }
  ];

  const [showProjectForm, setShowProjectForm] = useState(false);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/icons/icon-192x192.png" alt="RetireWise" className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">RetireWise</h1>
            <p className="text-xs text-gray-500">MVP v0.1</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/projects')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push('/insights')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <Lightbulb className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {/* Quick Time Log (only on home) */}
      {pathname === '/' && <QuickTimeLog />}

      {/* Floating Action Button (only on home) */}
      {showProjectForm && (
        <ProjectForm
          onClose={() => setShowProjectForm(false)}
          onSaved={() => {
          setShowProjectForm(false);
        // Optionally refresh projects list if on projects page
          if (pathname === '/projects') {
            window.location.reload();
          }
        }}
      />
      )}

      {showFAB && pathname === '/' && (
      <button
        onClick={() => setShowProjectForm(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center justify-center"
        aria-label="New Project"
      >
        <Plus className="w-6 h-6" />
      </button>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}