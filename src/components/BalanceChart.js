// src/components/BalanceChart.js
'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PERSPECTIVES } from '@/utils/perspectiveHelpers';

const BalanceChart = ({ balance }) => {
  const data = Object.entries(balance.actualBalance).map(([key, value]) => ({
    name: PERSPECTIVES[key].label,
    value: value,
    icon: PERSPECTIVES[key].icon,
    color: PERSPECTIVES[key].color
  })).filter(item => item.value > 0); // Only show perspectives with hours

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">
            {payload[0].payload.icon} {payload[0].name}
          </p>
          <p className="text-sm text-gray-600">
            {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Distribution</h3>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No time logged yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => `${entry.payload.icon} ${value}`}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default BalanceChart;