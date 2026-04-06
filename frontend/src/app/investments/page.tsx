import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import InvestmentGoalSetter from './InvestmentGoalSetter';
import InvestmentPieChart from './InvestmentPieChart';

const API = process.env.NEXT_PUBLIC_API_URL;

async function getUserProfile(googleId: string) {
  try {
    const res = await fetch(`${API}/users/${googleId}`, { cache: 'no-store' });
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

async function getInvestmentSummary(telegramUserId: number, salaryDate: number) {
  try {
    const res = await fetch(`${API}/investments/summary?telegramUserId=${telegramUserId}&salaryDate=${salaryDate}`, { cache: 'no-store' });
    return await res.json();
  } catch {
    return { thisMonthTotal: 0, allTimeTotal: 0, byType: [], investments: [] };
  }
}

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const googleId = (session.user as any).googleId as string;
  const userProfile = await getUserProfile(googleId);
  const isTelegramLinked = !!userProfile?.telegramUserId;

  const summary = isTelegramLinked
    ? await getInvestmentSummary(userProfile.telegramUserId, userProfile.salaryDate ?? 1)
    : { thisMonthTotal: 0, allTimeTotal: 0, byType: [], investments: [] };

  const monthlyIncome: number = userProfile?.monthlyIncome ?? 0;
  const goalPercent: number = userProfile?.investmentGoalPercent ?? 20;
  const goalAmount = monthlyIncome > 0 ? Math.round((goalPercent / 100) * monthlyIncome) : 0;
  const invested: number = summary.thisMonthTotal ?? 0;
  const goalProgress = goalAmount > 0 ? Math.min(Math.round((invested / goalAmount) * 100), 100) : 0;
  const savingsRate = monthlyIncome > 0 ? Math.round((invested / monthlyIncome) * 100) : 0;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">

      <Sidebar
        userName={session.user?.name}
        userEmail={session.user?.email}
        userAvatar={session.user?.image}
      />

      <main className="sidebar-offset px-6 py-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Investment Tracker</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your wealth — separate from your expenses
          </p>
        </div>

        {/* No telegram linked */}
        {!isTelegramLinked && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-sm mb-6">
            <span className="text-4xl">🔗</span>
            <p className="mt-3 text-gray-600 dark:text-gray-300 font-medium">Link Telegram to track investments</p>
            <p className="text-sm text-gray-400 mt-1">Go to the dashboard to connect your Telegram account</p>
            <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition">
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'This Month', value: isTelegramLinked ? fmt(invested) : '—', icon: '💰', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Goal', value: goalAmount > 0 ? fmt(goalAmount) : '—', icon: '🎯', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Savings Rate', value: savingsRate > 0 ? `${savingsRate}%` : '—', icon: '📊', color: 'text-purple-600 dark:text-purple-400' },
            { label: 'All Time', value: isTelegramLinked ? fmt(summary.allTimeTotal ?? 0) : '—', icon: '🏆', color: 'text-orange-600 dark:text-orange-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-sm">{icon} {label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Goal progress bar */}
        {goalAmount > 0 && isTelegramLinked && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="font-semibold text-gray-900 dark:text-white">This Month's Progress</span>
              </div>
              <span className={`text-sm font-medium ${goalProgress >= 100 ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {goalProgress >= 100 ? '🎉 Goal reached!' : `${goalProgress}% of goal`}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Invested: {fmt(invested)}</span>
              <span>Goal: {fmt(goalAmount)} ({goalPercent}% of salary)</span>
            </div>
            {goalAmount > invested && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {fmt(goalAmount - invested)} more to reach your goal this month
              </p>
            )}
          </div>
        )}

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Goal setter */}
          <InvestmentGoalSetter
            googleId={googleId}
            currentGoal={goalPercent}
            monthlyIncome={monthlyIncome}
          />

          {/* Pie chart */}
          <InvestmentPieChart
            byType={summary.byType ?? []}
            totalAmount={summary.allTimeTotal ?? 0}
          />
        </div>

        {/* How to log investments tip */}
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">💡 How to log investments via Telegram</p>
          <ul className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
            <li>• Say <strong>"SIP 5000"</strong> or <strong>"Invested 10000 in Zerodha"</strong></li>
            <li>• For stocks: <strong>"Bought Tata Motors shares"</strong> → bot will ask price + quantity</li>
            <li>• Log after the actual purchase — not platform transfers (Groww/Zerodha deposits)</li>
          </ul>
        </div>

        {/* Recent investments list */}
        {isTelegramLinked && summary.investments && summary.investments.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Investments</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {summary.investments.slice(0, 20).map((inv: any) => (
                <div key={inv._id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{inv.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {inv.type}
                      {inv.quantity && inv.avgPrice ? ` · ${inv.quantity} units @ ₹${inv.avgPrice}` : ''}
                      {' · '}{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {fmt(inv.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isTelegramLinked && (!summary.investments || summary.investments.length === 0) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center shadow-sm">
            <span className="text-5xl">📈</span>
            <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">No investments logged yet</p>
            <p className="text-sm text-gray-400 mt-1">Send "SIP 5000" or "Invested in Zerodha" on Telegram to start</p>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
