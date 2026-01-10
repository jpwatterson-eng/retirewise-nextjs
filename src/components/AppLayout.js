'use client';

import React, { useState } from 'react';
import { Home as HomeIcon, MessageSquare, BookOpen, BarChart3, Settings, Plus, FolderOpen, Lightbulb, Target, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ProjectForm from './ProjectForm';

export function AppHeader() {
  const { user } = useAuth(); // Get the current logged-in user

  const displayEmail = user?.email || auth.currentUser?.email;

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-50 h-16">
      <div className="w-full flex justify-between items-center">
      {/* Branded Left Side */}
      <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
                    <img
                      src="/icons/icon-192x192.png"
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">RetireWise</h1>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Hub</span>
        </div>
      </div>
      
    {/* Right: Actions & Identity Stack */}
        <div className="flex flex-col items-end gap-1">
          {/* Top Row: Navigation Icons */}
          <div className="flex items-center gap-3">

        <Link href="/projects" className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
          <FolderOpen className="w-5 h-5" />
        </Link>
        <Link href="/insights" className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
          <Lightbulb className="w-5 h-5" />
        </Link>
        <Link href="/settings" className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
        {/* The Logout / Exit button */}
        <button 
          onClick={handleLogout}
          className="ml-1 pl-3 border-l border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
      {/* Bottom Row: User Email (Subtle & Right-Aligned) */}
          {displayEmail && (
            <div className="flex items-center gap-1 opacity-80">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                ID:
              </span>
              <span className="text-[10px] text-gray-500 font-medium truncate max-w-[180px]">
                {displayEmail}
              </span>
            </div>
          )}
        </div>
        </div>
    </header>
  );
}

// 2. THE LAYOUT WRAPPER
// Used for pages that need the specific "New Project" FAB button
export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [showProjectForm, setShowProjectForm] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="max-w-md mx-auto min-h-screen shadow-sm bg-white relative">
        {children}

        {/* Floating Action Button - Only shows on Hub */}
        {pathname === '/' && (
          <button
            onClick={() => setShowProjectForm(true)}
            className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-40 flex items-center justify-center"
            aria-label="New Project"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {showProjectForm && (
          <ProjectForm onClose={() => setShowProjectForm(false)} />
        )}
      </div>
    </div>
  );
}