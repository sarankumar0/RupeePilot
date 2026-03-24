'use client';

import { useState } from 'react';

interface Props {
  googleId: string;
  isLinked: boolean;
}

export default function TelegramLink({ googleId, isLinked }: Props) {
  const [linked, setLinked] = useState(isLinked);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${googleId}/generate-link-code`,
        { method: 'POST' },
      );
      const data = await res.json();
      setCode(data.code);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${googleId}`);
      const data = await res.json();
      if (data.user?.telegramUserId) {
        setLinked(true);
        setCode(null);
      } else {
        setError('Not linked yet. Make sure you typed the code in Telegram and try again.');
      }
    } catch {
      setError('Could not verify. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Already linked
  if (linked) {
    return (
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300">Telegram Connected</p>
          <p className="text-green-700 dark:text-green-400 text-sm">Send expenses anytime — they'll appear here automatically.</p>
        </div>
      </div>
    );
  }

  // Code generated — show instructions
  if (code) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Step 2 — Type this in Telegram</h3>
        <p className="text-blue-600 dark:text-blue-400 text-sm mb-4">Open your Telegram bot and send this message:</p>

        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-gray-700 rounded-xl px-6 py-4 font-mono text-2xl font-bold text-gray-900 dark:text-white tracking-widest mb-4 text-center">
          /link {code}
        </div>

        <a
          href="https://t.me/rupeepilot_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4"
        >
          Open @rupeepilot_bot →
        </a>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition"
        >
          {loading ? 'Checking...' : "I've linked it ✓"}
        </button>
      </div>
    );
  }

  // Default — link button
  return (
    <div className="bg-orange-50 dark:bg-blue-950 border border-orange-200 dark:border-blue-800 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-blue-300 mb-1">Connect your Telegram</h3>
          <p className="text-gray-600 dark:text-blue-400 text-sm mb-4">
            Link your Telegram account to start tracking expenses by chat.
          </p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-xl transition"
            >
              {loading ? 'Generating...' : 'Link Telegram →'}
            </button>
            <a
              href="https://t.me/rupeepilot_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 dark:text-blue-400 hover:underline text-sm flex items-center"
            >
              @rupeepilot_bot
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
