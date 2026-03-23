'use client';

// This component handles the Telegram account linking flow.
// It is a CLIENT component because it needs useState and button click handlers.

import { useState } from 'react';

interface Props {
  googleId: string;          // The logged-in user's Google ID
  isLinked: boolean;         // Whether Telegram is already connected
}

export default function TelegramLink({ googleId, isLinked }: Props) {
  const [linked, setLinked] = useState(isLinked);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Called when user clicks "Link Telegram" button
  // Asks backend to generate a one-time code and saves it on the user in MongoDB
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

  // Called when user clicks "I've linked it" — re-fetches their profile to confirm
  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${googleId}`,
      );
      const data = await res.json();

      if (data.user?.telegramUserId) {
        setLinked(true);
        setCode(null);
      } else {
        setError("Not linked yet. Make sure you typed the code in Telegram and try again.");
      }
    } catch {
      setError('Could not verify. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Already linked — show success state
  if (linked) {
    return (
      <div className="bg-green-950 border border-green-800 rounded-xl p-6">
        <h3 className="font-semibold text-green-300 mb-1">✅ Telegram Connected</h3>
        <p className="text-green-400 text-sm">
          Your Telegram is linked. Send expenses anytime and they'll show up here.
        </p>
      </div>
    );
  }

  // Code has been generated — show instructions
  if (code) {
    return (
      <div className="bg-blue-950 border border-blue-800 rounded-xl p-6">
        <h3 className="font-semibold text-blue-300 mb-2">Step 2 — Type this in Telegram</h3>
        <p className="text-blue-400 text-sm mb-4">
          Open your Telegram bot and send this message:
        </p>

        {/* The code to type — big and easy to copy */}
        <div className="bg-gray-900 rounded-lg px-6 py-4 font-mono text-2xl font-bold text-white tracking-widest mb-4 text-center">
          /link {code}
        </div>

        <p className="text-blue-400 text-xs mb-2">
          This code expires once used. If it doesn't work, come back and generate a new one.
        </p>

        <a
          href="https://t.me/rupeepilot_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-400 hover:text-blue-200 text-sm mb-4 underline"
        >
          Open @rupeepilot_bot →
        </a>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Checking...' : "I've linked it ✓"}
        </button>
      </div>
    );
  }

  // Default — show "Link Telegram" button
  return (
    <div className="bg-blue-950 border border-blue-800 rounded-xl p-6">
      <h3 className="font-semibold text-blue-300 mb-1">Connect your Telegram</h3>
      <p className="text-blue-400 text-sm mb-4">
        Send expenses to your Telegram bot and they'll appear here automatically.
      </p>

      {/* Bot link — opens Telegram directly */}
      <a
        href="https://t.me/rupeepilot_bot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-blue-400 hover:text-blue-200 text-sm mb-4 underline"
      >
        @rupeepilot_bot →
      </a>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleGenerateCode}
        disabled={loading}
        className="block w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-lg transition"
      >
        {loading ? 'Generating...' : 'Link Telegram →'}
      </button>
    </div>
  );
}
