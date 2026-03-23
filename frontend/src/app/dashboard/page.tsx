import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

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
            <button
              type="submit"
              className="text-sm text-gray-400 hover:text-white transition"
            >
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

        {/* Placeholder cards */}
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

        {/* Connect Telegram notice */}
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-6">
          <h3 className="font-semibold text-blue-300 mb-1">Connect your Telegram</h3>
          <p className="text-blue-400 text-sm">
            Send expenses to your Telegram bot and they'll appear here automatically.
          </p>
        </div>
      </main>
    </div>
  );
}
