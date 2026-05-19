"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface HistoryPoint {
  date: string;
  lp: number;
}

interface PlayerChartProps {
  data: HistoryPoint[];
  color?: string;
}

const PlayerChart = React.memo(function PlayerChart({ data, color = "#10b981" }: PlayerChartProps) {
  return (
    <div className="h-48 w-full mt-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #1e293b',
              borderRadius: '0.5rem',
              color: '#f8fafc'
            }} 
            itemStyle={{ color: '#f8fafc' }}
          />
          <Line 
            type="monotone" 
            dataKey="lp" 
            stroke={color} 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default PlayerChart;
