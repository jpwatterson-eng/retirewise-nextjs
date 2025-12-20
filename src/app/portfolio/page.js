// src/app/portfolio/page.js
'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import PortfolioDashboard from '@/components/PortfolioDashboard';

export default function PortfolioPage() {
  return (
    <AppLayout>
      <PortfolioDashboard />
    </AppLayout>
  );
}