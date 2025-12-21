// src/components/ProjectsListView.js
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Target, ChevronRight } from 'lucide-react';
import { getPerspective } from '@/utils/perspectiveHelpers';

const ProjectsListView = ({ projects }) => {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">No projects found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const perspective = getPerspective(project.perspective);
        
        return (
          <div
            key={project.id}
            onClick={() => router.push(`/projects/${project.id}`)}
            className="bg-white rounded-xl p-4 shadow-sm border-2 border-gray-100 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
            style={{ 
              borderLeftColor: perspective?.color,
              borderLeftWidth: '4px'
            }}
          >
            <div className="flex items-start gap-4">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Line 1: Icon + Title (left aligned) */}
                <div className="flex items-center gap-2 mb-2">
                  {project.icon && (
                    <span className="text-xl flex-shrink-0">{project.icon}</span>
                  )}
                  <h3 className="font-bold text-gray-800 text-lg">
                    {project.name}
                  </h3>
                </div>

                {/* Line 2: Perspective + Status (right aligned) */}
                <div className="flex items-center justify-end gap-2 mb-2">
                  {perspective && (
                    <div 
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${perspective.color}20`,
                        color: perspective.color
                      }}
                    >
                      <span>{perspective.icon}</span>
                      <span>{perspective.label}</span>
                    </div>
                  )}
                  
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                    project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    project.status === 'complete' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {project.status}
                  </div>
                </div>

                {/* Line 3: Description */}
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Line 4: Stats and Tags */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{project.totalHoursLogged?.toFixed(1) || '0'} hrs</span>
                    </div>
                    
                    {project.targetHours && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Target className="w-4 h-4" />
                        <span className="font-medium">
                          {((project.totalHoursLogged / project.targetHours) * 100).toFixed(0)}% of {project.targetHours}h
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {project.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectsListView;