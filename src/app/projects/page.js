// src/app/projects/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ProjectsListView from '@/components/ProjectsListView';
import * as unifiedDB from '@/db/unifiedDB';
import { getAllPerspectives, getPerspective } from '@/utils/perspectiveHelpers';

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerspective, setSelectedPerspective] = useState(searchParams.get('perspective') || 'all');

  useEffect(() => {
    const unsubscribe = unifiedDB.subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter projects by perspective
  const filteredProjects = selectedPerspective === 'all' 
    ? projects 
    : projects.filter(p => p.perspective === selectedPerspective);

  const perspectives = getAllPerspectives();
  const currentPerspective = selectedPerspective !== 'all' ? getPerspective(selectedPerspective) : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          {selectedPerspective !== 'all' && (
            <button
              onClick={() => setSelectedPerspective('all')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">
              {currentPerspective ? (
                <span className="flex items-center gap-2">
                  <span>{currentPerspective.icon}</span>
                  <span>{currentPerspective.label} Projects</span>
                </span>
              ) : (
                'Projects'
              )}
            </h1>
          </div>
        </div>

        {/* Perspective Filter Tabs */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Filter by Perspective</h2>
          
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              <button
                onClick={() => setSelectedPerspective('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPerspective === 'all'
                    ? 'bg-gray-800 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                All Projects ({projects.length})
              </button>

              {perspectives.map((perspective) => {
                const count = projects.filter(p => p.perspective === perspective.id).length;
                return (
                  <button
                    key={perspective.id}
                    onClick={() => setSelectedPerspective(perspective.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      selectedPerspective === perspective.id
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                    style={
                      selectedPerspective === perspective.id
                        ? { backgroundColor: perspective.color }
                        : {}
                    }
                  >
                    <span>{perspective.icon}</span>
                    <span>{perspective.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedPerspective === perspective.id
                        ? 'bg-white bg-opacity-30'
                        : 'bg-gray-100'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ProjectsListView projects={filteredProjects} />
        )}
      </div>
    </AppLayout>
  );
}