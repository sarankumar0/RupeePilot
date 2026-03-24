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

      // Save budget if provided
      if (budgetAmount > 0) {
        const res = await fetch(`${base}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyBudget: budgetAmount }),
        });
        if (!res.ok) throw new Error('Failed to save budget');
        setBudgetSaved(true);
      }

      // Save income if provided
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

  return (
    <div className="bg-gray-900 rounded-xl p-6 mt-6">
      <h3 className="text-gray-300 font-semibold mb-1">Monthly Finance Settings</h3>
      <p className="text-gray-500 text-sm mb-5">
        Set your income and budget — used in budget alerts and the weekly report.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Monthly Income */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Monthly Income</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              value={income}
              onChange={(e) => { setIncome(e.target.value); setIncomeSaved(false); }}
              placeholder="e.g. 40000"
              className="bg-gray-800 text-white rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {incomeSaved && (
            <p className="text-green-400 text-xs mt-1">
              ✓ ₹{Number(income).toLocaleString('en-IN')}/month saved
            </p>
          )}
        </div>

        {/* Monthly Budget */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Monthly Budget Limit</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setBudgetSaved(false); }}
              placeholder="e.g. 25000"
              className="bg-gray-800 text-white rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {budgetSaved && (
            <p className="text-blue-400 text-xs mt-1">
              ✓ ₹{Number(budget).toLocaleString('en-IN')}/month — bot alerts at 80% & 100%
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
