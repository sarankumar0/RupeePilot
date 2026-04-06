'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  googleId: string;
  name: string;
}

const STEPS = ['Income', 'Salary Date', 'Budget'];

export default function OnboardingFlow({ googleId, name }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [salaryDate, setSalaryDate] = useState<number | null>(null);
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    if (!income || !salaryDate || !budget) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${googleId}/onboarding`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyIncome: Number(income),
            salaryDate,
            monthlyBudget: Number(budget),
          }),
        },
      );
      if (!res.ok) throw new Error('Failed');
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  function canProceed() {
    if (step === 0) return Number(income) > 0;
    if (step === 1) return salaryDate !== null;
    if (step === 2) return Number(budget) > 0;
    return false;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <span className="text-3xl">💰</span>
        <span className="text-2xl font-bold text-gray-900">RupeePilot</span>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-lg w-full max-w-md p-8">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < step
                  ? 'bg-green-500 text-white'
                  : i === step
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-orange-600' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — Income */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Hey {name}! 👋
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Let's set up your finance profile. Takes 30 seconds.
            </p>
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              What's your monthly income?
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400">
              <span className="px-4 text-gray-500 font-bold bg-gray-50 border-r border-gray-200 py-3">₹</span>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 45000"
                className="flex-1 px-4 py-3 text-gray-900 text-base outline-none"
                autoFocus
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">Used to show how much of your salary you've spent.</p>
          </div>
        )}

        {/* Step 1 — Salary Date */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Salary date 📅
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              Which day of the month do you get paid? We'll track your expenses from this date.
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  onClick={() => setSalaryDate(day)}
                  className={`h-9 w-full rounded-lg text-sm font-semibold transition-colors ${
                    salaryDate === day
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {salaryDate && (
              <p className="text-orange-600 text-xs mt-3 font-medium">
                ✓ Your expense month runs from the {salaryDate}{ordinal(salaryDate)} of each month
              </p>
            )}
          </div>
        )}

        {/* Step 2 — Budget */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Set a budget 🎯
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              We'll alert you on Telegram when you hit 80% and 100% of this.
            </p>
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              Monthly spending limit
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400">
              <span className="px-4 text-gray-500 font-bold bg-gray-50 border-r border-gray-200 py-3">₹</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 25000"
                className="flex-1 px-4 py-3 text-gray-900 text-base outline-none"
                autoFocus
              />
            </div>
            {Number(income) > 0 && Number(budget) > 0 && (
              <p className="text-gray-400 text-xs mt-2">
                That's {Math.round((Number(budget) / Number(income)) * 100)}% of your income — {Number(budget) / Number(income) <= 0.5 ? 'great discipline! 🎉' : 'consider keeping it under 50%.'}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold text-sm transition"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canProceed() || loading}
              className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition"
            >
              {loading ? 'Setting up...' : "Let's go! 🚀"}
            </button>
          )}
        </div>
      </div>

      {/* Step counter */}
      <p className="text-gray-400 text-xs mt-6">Step {step + 1} of {STEPS.length}</p>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
