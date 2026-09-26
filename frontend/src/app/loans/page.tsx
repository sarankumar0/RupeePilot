import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL;

function authGet(token: string) {
  return { cache: 'no-store' as const, headers: { Authorization: `Bearer ${token}` } };
}

async function getUserProfile(token: string) {
  try {
    const res = await fetch(`${API}/users/me`, authGet(token));
    return (await res.json()).user;
  } catch {
    return null;
  }
}

interface LoanEntry { type: string; amount: number; date: string; note?: string }
interface Loan {
  id: string;
  direction: 'lent' | 'borrowed';
  counterpartyName: string;
  counterpartyType: string;
  principal: number;
  repaid: number;
  outstanding: number;
  status: string;
  startDate: string;
  entries: LoanEntry[];
}
interface Person {
  name: string; key: string; type: string;
  lent: number; borrowed: number; netToYou: number;
  loans: Loan[];
}
interface Summary {
  totalReceivable: number; totalPayable: number; net: number; people: Person[];
}

async function getLoanSummary(token: string): Promise<Summary> {
  try {
    const res = await fetch(`${API}/loans/me/summary`, authGet(token));
    return await res.json();
  } catch {
    return { totalReceivable: 0, totalPayable: 0, net: 0, people: [] };
  }
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default async function LoansPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const token = (session as any).backendToken as string;
  const [userProfile, summary] = await Promise.all([getUserProfile(token), getLoanSummary(token)]);
  const isTelegramLinked = !!userProfile?.telegramUserId;

  const hasLoans = summary.people.some((p) => p.loans.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <Sidebar userName={session.user?.name} userEmail={session.user?.email} userAvatar={session.user?.image} />

      <main className="sidebar-offset px-6 py-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loans &amp; Debts</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Money you lent out and money you owe — tracked per person.</p>
          </div>

          {/* Not linked */}
          {!isTelegramLinked && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-sm mb-6">
              <span className="text-4xl">🔗</span>
              <p className="mt-3 text-gray-600 dark:text-gray-300 font-medium">Link Telegram to track loans</p>
              <p className="text-sm text-gray-400 mt-1">Go to the dashboard to connect your Telegram account.</p>
              <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Owed to you', value: summary.totalReceivable, icon: '💰', color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'You owe', value: summary.totalPayable, icon: '💸', color: 'text-red-500 dark:text-red-400' },
              { label: 'Net position', value: summary.net, icon: '📊', color: summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-sm">{icon} {label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>
                  {label === 'Net position' && value < 0 ? `-${fmt(-value)}` : fmt(Math.abs(value))}
                </p>
                {label === 'Net position' && (
                  <p className="text-xs text-gray-400 mt-1">{value >= 0 ? "you're owed overall" : 'you owe overall'}</p>
                )}
              </div>
            ))}
          </div>

          {/* How to log tip */}
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">🤝 How to log loans via Telegram</p>
            <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
              <li>• <strong>&quot;Lent 5000 to Ravi&quot;</strong> or <strong>&quot;Borrowed 2000 from Kumar&quot;</strong></li>
              <li>• When repaid: <strong>&quot;Ravi paid back 500&quot;</strong> or <strong>&quot;Paid back 500 to Kumar&quot;</strong></li>
              <li>• Ask anytime: <strong>&quot;Who owes me?&quot;</strong></li>
            </ul>
          </div>

          {/* Per-person list */}
          {hasLoans ? (
            <div className="space-y-4">
              {summary.people.filter((p) => p.loans.length > 0).map((person) => (
                <div key={person.key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                  {/* Person header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{person.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{person.type}</p>
                    </div>
                    <span className={`text-sm font-semibold ${
                      person.netToYou > 0 ? 'text-emerald-600 dark:text-emerald-400'
                      : person.netToYou < 0 ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-400'
                    }`}>
                      {person.netToYou > 0 ? `owes you ${fmt(person.netToYou)}`
                        : person.netToYou < 0 ? `you owe ${fmt(-person.netToYou)}`
                        : 'settled ✓'}
                    </span>
                  </div>
                  {/* That person's loans */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {person.loans.map((loan) => {
                      const pct = loan.principal > 0 ? Math.min(Math.round((loan.repaid / loan.principal) * 100), 100) : 0;
                      const isLent = loan.direction === 'lent';
                      return (
                        <div key={loan.id} className={`px-6 py-4 ${loan.status === 'closed' ? 'opacity-60' : ''}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {isLent ? '➡️ You lent' : '⬅️ You borrowed'} {fmt(loan.principal)}
                              <span className="text-gray-400 font-normal"> · {fmtDate(loan.startDate)}</span>
                            </span>
                            <span className={`text-sm font-semibold ${loan.status === 'closed' ? 'text-gray-400' : isLent ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {loan.status === 'closed' ? 'settled ✓' : `${fmt(loan.outstanding)} left`}
                            </span>
                          </div>
                          {loan.status !== 'closed' && loan.repaid > 0 && (
                            <>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${isLent ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{fmt(loan.repaid)} of {fmt(loan.principal)} repaid ({pct}%)</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            isTelegramLinked && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center shadow-sm">
                <span className="text-5xl">🤝</span>
                <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">No loans logged yet</p>
                <p className="text-sm text-gray-400 mt-1">Send &quot;Lent 5000 to Ravi&quot; on Telegram to start tracking.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
