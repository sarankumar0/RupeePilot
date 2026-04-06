'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  googleId: string;
  currentGoal: number;
  monthlyIncome: number;
}

export default function InvestmentGoalSetter({ googleId, currentGoal, monthlyIncome }: Props) {
  const [goal, setGoal] = useState(currentGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const targetAmount = monthlyIncome > 0 ? Math.round((goal / 100) * monthlyIncome) : null;

  async function handleSave() {
    if (goal < 1 || goal > 80) return;
    setSaving(true);
    try {
      await fetch(`${API}/users/${googleId}/investment-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentGoalPercent: goal }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎯</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Investment Goal</h3>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        What % of your salary do you want to invest each month?
      </p>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={80}
          value={goal}
          onChange={(e) => setGoal(Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-gray-500 dark:text-gray-400 font-medium">% of salary</span>
        {targetAmount && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            = ₹{targetAmount.toLocaleString('en-IN')}/month
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-50"
        >
          {saved ? '✅ Saved' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={80}
        value={goal}
        onChange={(e) => setGoal(Number(e.target.value))}
        className="w-full mt-4 accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>1%</span>
        <span className="text-emerald-500 font-medium">20% recommended</span>
        <span>80%</span>
      </div>
    </div>
  );
}
