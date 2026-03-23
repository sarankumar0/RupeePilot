'use client';

// This is a CLIENT component — it uses Recharts which needs the browser to render charts
// It receives pre-fetched data from the server component (dashboard/page.tsx)

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Shape of the summary data we get from GET /expenses/summary
interface Summary {
  thisMonthTotal: number;
  allTimeTotal: number;
  totalCount: number;
  topCategory: string;
  byCategory: { category: string; total: number }[];
}

interface Props {
  summary: Summary;
  expenses: {
    _id: string;
    amount: number;
    merchant: string;
    category: string;
    date: string;
  }[];
}

// Different color for each category bar in the chart
const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Shopping: '#a855f7',
  Entertainment: '#ec4899',
  EMI: '#ef4444',
  Health: '#22c55e',
  Utilities: '#eab308',
  Others: '#6b7280',
};

// Custom tooltip shown when hovering over a bar in the chart
function CustomTooltip({ active, payload }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-semibold">₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
}

export default function ExpenseSummary({ summary, expenses }: Props) {
  return (
    <div>
      {/* Stat cards — 3 numbers at the top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400 text-sm">This Month</p>
          <p className="text-3xl font-bold mt-1">
            ₹{summary.thisMonthTotal.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold mt-1">{summary.totalCount}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Top Category</p>
          <p className="text-3xl font-bold mt-1">{summary.topCategory}</p>
        </div>
      </div>

      {/* Category breakdown bar chart */}
      {summary.byCategory.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h3 className="text-gray-300 font-semibold mb-6">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.byCategory} barSize={36}>
              <XAxis
                dataKey="category"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {summary.byCategory.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent expenses list */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-gray-300 font-semibold mb-4">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet. Send one via Telegram!</p>
        ) : (
          <ul className="space-y-3">
            {expenses.slice(0, 10).map((e) => (
              <li key={e._id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{e.merchant}</p>
                  <p className="text-gray-500 text-xs">
                    {e.category} · {new Date(e.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <p className="text-white font-semibold">
                  ₹{e.amount.toLocaleString('en-IN')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
