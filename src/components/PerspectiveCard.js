// src/components/PerspectiveCard.js
'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PerspectiveCard = ({ perspective, stats, actualPercentage, targetPercentage }) => {
  const router = useRouter();
  
  const deviation = actualPercentage - targetPercentage;
  const isUnderrepresented = deviation < -10;
  const isOverrepresented = deviation > 10;

  const handleClick = () => {
    // Navigate to projects filtered by this perspective
    router.push(`/projects?perspective=${perspective.id}`);
  };

  return (
    <div 
      className="bg-white rounded-xl p-5 shadow-sm border-2 border-gray-100 hover:border-gray-300 transition-all cursor-pointer"
      onClick={handleClick}
      style={{ borderTopColor: perspective.color, borderTopWidth: '4px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{perspective.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{perspective.label}</h3>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>

      {/* Stats */}
      <div className="space-y-3">
        {/* Hours & Projects */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Hours:</span>
          <span className="font-semibold text-gray-800">{stats.hours.toFixed(1)}h</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Projects:</span>
          <span className="font-semibold text-gray-800">{stats.count}</span>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Current</span>
            <span className="font-semibold" style={{ color: perspective.color }}>
              {actualPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${actualPercentage}%`,
                backgroundColor: perspective.color
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-400">Target: {targetPercentage}%</span>
            {Math.abs(deviation) > 5 && (
              <span className={`font-medium ${deviation > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {isUnderrepresented && (
          <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full text-center">
            Underrepresented
          </div>
        )}
        {isOverrepresented && (
          <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full text-center">
            Overrepresented
          </div>
        )}
      </div>
    </div>
  );
};

export default PerspectiveCard;