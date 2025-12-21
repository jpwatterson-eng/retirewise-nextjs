// src/app/analytics/page.js
'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Analytics from '@/components/Analytics';
import PerspectiveAnalytics from '@/components/PerspectiveAnalytics';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'perspectives'

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('perspectives')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'perspectives'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            By Perspective
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' ? (
          <Analytics />
        ) : (
          <PerspectiveAnalytics />
        )}
      </div>
    </AppLayout>
  );
}