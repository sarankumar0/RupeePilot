'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

interface Props {
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/investments', label: 'Investments', icon: '📈' },
];

export default function Sidebar({ userName, userEmail, userAvatar }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setCollapsed(true);
      document.documentElement.classList.add('sidebar-collapsed');
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
    if (next) {
      document.documentElement.classList.add('sidebar-collapsed');
    } else {
      document.documentElement.classList.remove('sidebar-collapsed');
    }
  };

  // Avoid layout shift before mount
  if (!mounted) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 z-30 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo + toggle */}
        <div className="px-3 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-2xl flex-shrink-0">💰</span>
            {!collapsed && (
              <span className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                RupeePilot
              </span>
            )}
          </div>
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="text-base flex-shrink-0">{icon}</span>
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + controls */}
        <div className="px-2 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <div className={`flex items-center px-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <ThemeToggle />
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Sign out
              </button>
            )}
          </div>
          <div
            className={`flex items-center gap-2 px-1 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? `${userName} · Sign out` : undefined}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName ?? ''}
                onClick={collapsed ? () => signOut({ callbackUrl: '/login' }) : undefined}
                className={`w-7 h-7 rounded-full flex-shrink-0 ${collapsed ? 'cursor-pointer' : ''}`}
              />
            ) : (
              <div
                onClick={collapsed ? () => signOut({ callbackUrl: '/login' }) : undefined}
                className={`w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-300 flex-shrink-0 ${collapsed ? 'cursor-pointer' : ''}`}
              >
                {userName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-xl">{icon}</span>
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
        >
          <span className="text-xl">🚪</span>
          Sign out
        </button>
        <div className="flex flex-col items-center gap-0.5 px-2 py-1">
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
}
