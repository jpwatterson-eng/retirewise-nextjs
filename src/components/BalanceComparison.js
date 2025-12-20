// src/components/BalanceComparison.js
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PERSPECTIVES } from '@/utils/perspectiveHelpers';

const BalanceComparison = ({ actualBalance, targetBalance }) => {
  const data = Object.keys(PERSPECTIVES).map(key => ({
    name: PERSPECTIVES[key].label,
    icon: PERSPECTIVES[key].icon,
    actual: actualBalance[key],
    target: targetBalance[key],
    color: PERSPECTIVES[key].color
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-1">
            {payload[0].payload.icon} {payload[0].payload.name}
          </p>
          <p className="text-sm text-blue-600">
            Actual: {payload[0].value.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600">
            Target: {payload[1].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Target vs Actual</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="icon" 
            tick={{ fontSize: 20 }}
          />
          <YAxis 
            label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Bar dataKey="actual" fill="#3B82F6" name="Actual" radius={[8, 8, 0, 0]} />
          <Bar dataKey="target" fill="#E5E7EB" name="Target" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BalanceComparison;