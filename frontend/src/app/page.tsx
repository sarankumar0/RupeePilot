import Link from 'next/link';

const features = [
  {
    emoji: '🤖',
    title: 'Just Type, We Handle the Rest',
    desc: 'Send "Spent 450 Zomato" on Telegram. AI extracts amount, merchant, and category automatically.',
    color: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100',
  },
  {
    emoji: '📊',
    title: 'Smart Dashboard',
    desc: 'See where your money goes — daily, weekly, monthly. Category charts, trends, and comparisons.',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    emoji: '💼',
    title: 'Track Investments Too',
    desc: '"SIP 5000" or "invested 10000 in Zerodha" — investments tracked separately from spending.',
    color: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
  {
    emoji: '🔔',
    title: 'Budget Alerts',
    desc: 'Get a Telegram alert when you hit 80% or 100% of your monthly budget. No surprises.',
    color: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
  },
  {
    emoji: '📅',
    title: 'Salary-Cycle Aware',
    desc: 'Salary on the 10th? We track your month as 10th → 9th, not 1st → 31st.',
    color: 'bg-pink-50 border-pink-200',
    iconBg: 'bg-pink-100',
  },
  {
    emoji: '💡',
    title: 'Weekly AI Tips',
    desc: 'Every Sunday, get a personalised saving tip based on your actual spending patterns.',
    color: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
  },
];

const steps = [
  {
    number: '1',
    title: 'Sign in with Google',
    desc: 'One click — no forms, no passwords.',
    color: 'bg-orange-500',
  },
  {
    number: '2',
    title: 'Link your Telegram',
    desc: 'Connect your Telegram account in 30 seconds.',
    color: 'bg-blue-500',
  },
  {
    number: '3',
    title: 'Start chatting',
    desc: 'Send expenses naturally. Dashboard updates live.',
    color: 'bg-green-500',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold text-gray-900">RupeePilot</span>
        </div>
        <Link
          href="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl transition text-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-block bg-orange-100 text-orange-600 text-sm font-semibold px-4 py-1 rounded-full mb-6">
          Built for young Indian professionals 🇮🇳
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-gray-900 mb-6">
          Stop guessing where your{' '}
          <span className="text-orange-500">money went</span>
        </h1>
        <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-10">
          Track expenses by chatting on Telegram. AI does the categorising.
          Dashboard shows the full picture. No spreadsheets needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl text-lg transition shadow-lg shadow-orange-200"
          >
            Get Started Free →
          </Link>
          <a
            href="https://t.me/rupeepilot_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-8 py-4 rounded-2xl text-lg transition border border-blue-200"
          >
            Try the Bot
          </a>
        </div>

        {/* Fake chat preview */}
        <div className="mt-16 max-w-sm mx-auto bg-gray-50 rounded-2xl border border-gray-200 p-4 text-left shadow-sm">
          <div className="text-xs text-gray-400 mb-3 font-medium">RupeePilot Bot · Telegram</div>
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white text-sm px-4 py-2 rounded-2xl rounded-br-sm max-w-xs">
                Spent 450 Zomato
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-800 text-sm px-4 py-2 rounded-2xl rounded-bl-sm max-w-xs shadow-sm">
                ✅ Saved! ₹450 at Zomato<br />
                <span className="text-gray-400 text-xs">Category: Food</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white text-sm px-4 py-2 rounded-2xl rounded-br-sm max-w-xs">
                SIP 5000
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-800 text-sm px-4 py-2 rounded-2xl rounded-bl-sm max-w-xs shadow-sm">
                ✅ Saved! ₹5,000 · SIP<br />
                <span className="text-gray-400 text-xs">Category: Investment</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Up and running in 2 minutes
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className={`${step.color} text-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold mb-4`}>
                  {step.number}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className={`${f.color} border rounded-2xl p-6`}>
                <div className={`${f.iconBg} w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4`}>
                  {f.emoji}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-orange-500 to-pink-500 rounded-3xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Take control of your money today</h2>
          <p className="text-orange-100 mb-8 text-lg">Free to use. No credit card needed.</p>
          <Link
            href="/login"
            className="bg-white text-orange-500 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-orange-50 transition inline-block"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-gray-700">RupeePilot</span>
        </div>
        <p>Built with ❤️ for Indian professionals</p>
      </footer>

    </div>
  );
}
