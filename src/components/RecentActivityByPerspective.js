// src/components/RecentActivityByPerspective.js
'use client';

import React from 'react';
import { PERSPECTIVES } from '@/utils/perspectiveHelpers';
import { Clock } from 'lucide-react';

const RecentActivityByPerspective = ({ projects }) => {
  // Group projects by perspective
  const projectsByPerspective = projects.reduce((acc, project) => {
    if (project.perspective) {
      if (!acc[project.perspective]) {
        acc[project.perspective] = [];
      }
      acc[project.perspective].push(project);
    }
    return acc;
  }, {});

  // Sort by last worked date
  Object.keys(projectsByPerspective).forEach(key => {
    projectsByPerspective[key].sort((a, b) => {
      const dateA = a.lastWorkedAt ? new Date(a.lastWorkedAt) : new Date(0);
      const dateB = b.lastWorkedAt ? new Date(b.lastWorkedAt) : new Date(0);
      return dateB - dateA;
    });
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Projects by Perspective</h3>
      
      <div className="space-y-4">
        {Object.values(PERSPECTIVES).map(perspective => {
          const perspectiveProjects = projectsByPerspective[perspective.id] || [];
          
          return (
            <div key={perspective.id} className="border-l-4 pl-4" style={{ borderColor: perspective.color }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{perspective.icon}</span>
                <h4 className="font-semibold text-gray-800">{perspective.label}</h4>
                <span className="text-sm text-gray-500">({perspectiveProjects.length})</span>
              </div>
              
              {perspectiveProjects.length === 0 ? (
                <p className="text-sm text-gray-400 ml-7">No projects yet</p>
              ) : (
                <div className="space-y-2 ml-7">
                  {perspectiveProjects.slice(0, 3).map(project => (
                    <div key={project.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {project.icon && <span>{project.icon}</span>}
                        <span className="text-gray-700">{project.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-700' :
                          project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                          project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      {project.lastWorkedAt && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">
                            {new Date(project.lastWorkedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {perspectiveProjects.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{perspectiveProjects.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivityByPerspective;