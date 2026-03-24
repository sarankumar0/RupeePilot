'use client';

import { useState } from 'react';

interface Props {
  googleId: string;
  currentBudget: number;
  currentIncome: number;
}

export default function BudgetSetter({ googleId, currentBudget, currentIncome }: Props) {
  const [budget, setBudget] = useState(currentBudget > 0 ? String(currentBudget) : '');
  const [income, setIncome] = useState(currentIncome > 0 ? String(currentIncome) : '');
  const [budgetSaved, setBudgetSaved] = useState(currentBudget > 0);
  const [incomeSaved, setIncomeSaved] = useState(currentIncome > 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const budgetAmount = Number(budget);
    const incomeAmount = Number(income);
    if (budgetAmount <= 0 && incomeAmount <= 0) {
      setError('Please enter at least a budget or income.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = `${process.env.NEXT_PUBLIC_API_URL}/users/${googleId}`;
      if (budgetAmount > 0) {
        const res = await fetch(`${base}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyBudget: budgetAmount }),
        });
        if (!res.ok) throw new Error('Failed to save budget');
        setBudgetSaved(true);
      }
      if (incomeAmount > 0) {
        const res = await fetch(`${base}/income`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyIncome: incomeAmount }),
        });
        if (!res.ok) throw new Error('Failed to save income');
        setIncomeSaved(true);
      }
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-blue-500 text-sm';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-gray-200 mb-1">Monthly Finance Settings</h3>
      <p className="text-gray-500 dark:text-gray-500 text-sm mb-5">
        Used for budget alerts and weekly Telegram reports.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1.5">Monthly Income</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-semibold text-sm">₹</span>
            <input
              type="number"
              value={income}
              onChange={(e) => { setIncome(e.target.value); setIncomeSaved(false); }}
              placeholder="e.g. 40000"
              className={inputClass}
            />
          </div>
          {incomeSaved && (
            <p className="text-green-600 dark:text-green-400 text-xs mt-1.5">
              ✓ ₹{Number(income).toLocaleString('en-IN')}/month saved
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1.5">Monthly Budget Limit</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-semibold text-sm">₹</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setBudgetSaved(false); }}
              placeholder="e.g. 25000"
              className={inputClass}
            />
          </div>
          {budgetSaved && (
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1.5">
              ✓ ₹{Number(budget).toLocaleString('en-IN')}/month — alerts at 80% & 100%
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>

      {error && <p className="text-red-500 dark:text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
