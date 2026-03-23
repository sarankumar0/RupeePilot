import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import TelegramLink from './TelegramLink';
import ExpenseSummary from './ExpenseSummary';

const API = process.env.NEXT_PUBLIC_API_URL;

// Fetch the user profile from backend (has telegramUserId if linked)
async function getUserProfile(googleId: string) {
  try {
    const res = await fetch(`${API}/users/${googleId}`, { cache: 'no-store' });
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// Fetch summary stats for the chart and stat cards
async function getExpenseSummary(telegramUserId: number) {
  try {
    const res = await fetch(`${API}/expenses/summary?telegramUserId=${telegramUserId}`, {
      cache: 'no-store',
    });
    return await res.json();
  } catch {
    return null;
  }
}

// Fetch the list of recent expenses
async function getExpenses(telegramUserId: number) {
  try {
    const res = await fetch(`${API}/expenses?telegramUserId=${telegramUserId}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return data.expenses ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const googleId = (session.user as any).googleId as string;

  // Fetch user profile to check if Telegram is linked
  const userProfile = await getUserProfile(googleId);
  const isTelegramLinked = !!userProfile?.telegramUserId;

  // Only fetch expense data if Telegram is linked
  const [summary, expenses] = isTelegramLinked
    ? await Promise.all([
        getExpenseSummary(userProfile.telegramUserId),
        getExpenses(userProfile.telegramUserId),
      ])
    : [null, []];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">💰 RupeePilot</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{session.user?.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button type="submit" className="text-sm text-gray-400 hover:text-white transition">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            Welcome, {session.user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-400 mt-1">Here's your expense summary</p>
        </div>

        {/* If Telegram is linked, show real data. Otherwise show placeholder + link prompt */}
        {isTelegramLinked && summary ? (
          <ExpenseSummary summary={summary} expenses={expenses} />
        ) : (
          // Placeholder cards shown before Telegram is linked
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-gray-900 rounded-xl p-6">
              <p className="text-gray-400 text-sm">This Month</p>
              <p className="text-3xl font-bold mt-1">₹0</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <p className="text-gray-400 text-sm">Total Expenses</p>
              <p className="text-3xl font-bold mt-1">0</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <p className="text-gray-400 text-sm">Top Category</p>
              <p className="text-3xl font-bold mt-1">—</p>
            </div>
          </div>
        )}

        {/* Telegram link section — always shown */}
        <div className={isTelegramLinked ? 'mt-8' : ''}>
          <TelegramLink googleId={googleId} isLinked={isTelegramLinked} />
        </div>
      </main>
    </div>
  );
}
