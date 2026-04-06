'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TypeBreakdown {
  type: string;
  total: number;
}

interface Props {
  byType: TypeBreakdown[];
  totalAmount: number;
}

const TYPE_COLORS: Record<string, string> = {
  'Stock':           '#10b981', // emerald
  'ETF':             '#06b6d4', // cyan
  'Mutual Fund':     '#3b82f6', // blue
  'Gold':            '#eab308', // yellow
  'Fixed Deposit':   '#f97316', // orange
  'PPF/NPS':         '#6366f1', // indigo
  'Bond':            '#8b5cf6', // violet
  'Crypto':          '#ec4899', // pink
  'ULIP/Endowment':  '#64748b', // slate
};

const TYPE_EMOJIS: Record<string, string> = {
  'Stock':           '📈',
  'ETF':             '📊',
  'Mutual Fund':     '🔄',
  'Gold':            '🥇',
  'Fixed Deposit':   '🔒',
  'PPF/NPS':         '🏛️',
  'Bond':            '📜',
  'Crypto':          '₿',
  'ULIP/Endowment':  '🛡️',
};

export default function InvestmentPieChart({ byType, totalAmount }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  if (byType.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[280px]">
        <span className="text-4xl mb-3">🥧</span>
        <p className="text-gray-400 dark:text-gray-500 text-sm">No investments logged yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Log investments via Telegram to see your diversification</p>
      </div>
    );
  }

  const data = byType.map((item) => ({
    name: item.type,
    value: item.total,
    color: TYPE_COLORS[item.type] ?? '#6b7280',
  }));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🥧</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">Portfolio Diversification</h3>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#f9fafb' : '#111827',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 space-y-2">
        {data.map((item) => {
          const pct = Math.round((item.value / totalAmount) * 100);
          const emoji = TYPE_EMOJIS[item.name] ?? '💰';
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-700 dark:text-gray-300">{emoji} {item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400 text-xs">{pct}%</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{item.value.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
