import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import TelegramLink from './TelegramLink';
import ExpenseSummary from './ExpenseSummary';
import BudgetSetter from './BudgetSetter';
import ThemeToggle from '@/components/ThemeToggle';

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

async function getExpenseSummary(telegramUserId: number) {
  try {
    const res = await fetch(`${API}/expenses/summary?telegramUserId=${telegramUserId}`, { cache: 'no-store' });
    return await res.json();
  } catch {
    return null;
  }
}

async function getExpenses(telegramUserId: number) {
  try {
    const res = await fetch(`${API}/expenses?telegramUserId=${telegramUserId}`, { cache: 'no-store' });
    const data = await res.json();
    return data.expenses ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const googleId = (session.user as any).googleId as string;
  const userProfile = await getUserProfile(googleId);
  const isTelegramLinked = !!userProfile?.telegramUserId;

  const [summary, expenses] = isTelegramLinked
    ? await Promise.all([
        getExpenseSummary(userProfile.telegramUserId),
        getExpenses(userProfile.telegramUserId),
      ])
    : [null, []];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">RupeePilot</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:block">
              {session.user?.email}
            </span>
            <ThemeToggle />
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hey, {session.user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isTelegramLinked ? "Here's your financial overview" : "Let's get you set up"}
          </p>
        </div>

        {/* Telegram link — always shown */}
        <div className="mb-6">
          <TelegramLink googleId={googleId} isLinked={isTelegramLinked} />
        </div>

        {/* Finance settings — only when linked */}
        {isTelegramLinked && (
          <BudgetSetter
            googleId={googleId}
            currentBudget={userProfile?.monthlyBudget ?? 0}
            currentIncome={userProfile?.monthlyIncome ?? 0}
          />
        )}

        {/* Expense dashboard */}
        {isTelegramLinked && summary ? (
          <div className="mt-6">
            <ExpenseSummary
              summary={summary}
              expenses={expenses}
              monthlyBudget={userProfile?.monthlyBudget ?? 0}
              monthlyIncome={userProfile?.monthlyIncome ?? 0}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {[
              { label: 'This Month', icon: '💸' },
              { label: 'Total Expenses', icon: '📊' },
              { label: 'Top Category', icon: '🏆' },
            ].map(({ label, icon }) => (
              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                <p className="text-gray-400 dark:text-gray-500 text-sm">{icon} {label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-300 dark:text-gray-700">—</p>
                <p className="text-gray-400 text-xs mt-2">Link Telegram to see data</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
