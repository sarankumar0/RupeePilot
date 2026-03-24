'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';

interface Expense {
  _id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
}

interface Summary {
  thisMonthTotal: number;
  thisMonthInvested: number;
  allTimeTotal: number;
  totalCount: number;
  topCategory: string;
  byCategory: { category: string; total: number }[];
}

interface Props {
  summary: Summary;
  expenses: Expense[];
  monthlyBudget: number;
  monthlyIncome: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Shopping: '#a855f7',
  Entertainment: '#ec4899',
  EMI: '#ef4444',
  Health: '#22c55e',
  Utilities: '#eab308',
  Investment: '#10b981',
  Others: '#6b7280',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔', Transport: '🚗', Shopping: '🛍', Entertainment: '🎬',
  Health: '🏥', Utilities: '💡', EMI: '🏦', Investment: '📈', Others: '📦',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDateStr(d: Date): string { return d.toISOString().split('T')[0]; }

function toISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function weekBounds(weekStr: string): { start: Date; end: Date } {
  const [yearStr, wStr] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const startOfW1 = new Date(jan4);
  startOfW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const start = new Date(startOfW1);
  start.setDate(startOfW1.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function monthBounds(monthStr: string): { start: Date; end: Date } {
  const [year, month] = monthStr.split('-').map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

function fmt(n: number): string { return `₹${n.toLocaleString('en-IN')}`; }

function periodLabel(str: string, type: 'day' | 'week' | 'month'): string {
  if (type === 'day') return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (type === 'week') return `Week ${str.split('-W')[1]}`;
  const [yr, mo] = str.split('-');
  return new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm shadow-lg">
      {label && <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color ?? '#111' }}>
          {p.name && p.name !== 'total' ? `${p.name}: ` : ''}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <p className="text-gray-500 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function ExpenseSummary({ summary, expenses, monthlyBudget, monthlyIncome }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Before mount, default to light to match server render
  const isDark = mounted && theme === 'dark';

  // Chart axis colors based on theme
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const cursorFill = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const today = toDateStr(new Date());
  const currentWeek = toISOWeek(new Date());
  const currentMonth = today.substring(0, 7);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [compareType, setCompareType] = useState<'day' | 'week' | 'month'>('week');
  const [periodA, setPeriodA] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return toISOWeek(d); });
  const [periodB, setPeriodB] = useState(currentWeek);
  const [recentDay, setRecentDay] = useState(today);
  const [search, setSearch] = useState('');

  const filteredExpenses = useMemo(
    () => activeCategory ? expenses.filter(e => e.category === activeCategory) : expenses,
    [expenses, activeCategory],
  );

  const categories = useMemo(
    () => Array.from(new Set(expenses.map(e => e.category))).sort(),
    [expenses],
  );

  // ── MAIN CHART DATA ──
  const mainChartData = useMemo(() => {
    if (chartPeriod === 'day') {
      const map: Record<string, number> = {};
      for (const e of filteredExpenses.filter(e => toDateStr(new Date(e.date)) === selectedDay)) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
      return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    }
    if (chartPeriod === 'week') {
      const { start } = weekBounds(selectedWeek);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const ds = toDateStr(d);
        return {
          name: DAY_NAMES[d.getDay()],
          total: filteredExpenses.filter(e => toDateStr(new Date(e.date)) === ds).reduce((s, e) => s + e.amount, 0),
        };
      });
    }
    const { start, end } = monthBounds(selectedMonth);
    const days: { name: string; total: number }[] = [];
    const cur = new Date(start);
    while (cur < end) {
      const ds = toDateStr(cur);
      days.push({
        name: String(cur.getDate()),
        total: filteredExpenses.filter(e => toDateStr(new Date(e.date)) === ds).reduce((s, e) => s + e.amount, 0),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [chartPeriod, selectedDay, selectedWeek, selectedMonth, filteredExpenses]);

  const mainChartTotal = mainChartData.reduce((s, d) => s + d.total, 0);

  const mainChartTitle = useMemo(() => {
    if (chartPeriod === 'day') return new Date(selectedDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (chartPeriod === 'week') return `Week ${selectedWeek.split('-W')[1]}`;
    const [yr, mo] = selectedMonth.split('-');
    return new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [chartPeriod, selectedDay, selectedWeek, selectedMonth]);

  // ── 30-DAY TREND ──
  const trendData = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const ds = toDateStr(d);
      return {
        day: i === 29 ? 'Today' : ds.slice(5),
        total: expenses.filter(e => toDateStr(new Date(e.date)) === ds).reduce((s, e) => s + e.amount, 0),
      };
    }), [expenses]);

  // ── SPEND PATTERN ──
  const { weekendAvg, weekdayAvg, heaviestDay } = useMemo(() => {
    const dayTotals: Record<number, number[]> = {};
    for (const e of expenses) {
      const day = new Date(e.date).getDay();
      (dayTotals[day] = dayTotals[day] || []).push(e.amount);
    }
    const avg = (days: number[]) => {
      const amounts = days.flatMap(d => dayTotals[d] || []);
      return amounts.length ? Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length) : 0;
    };
    const dayAvgs = Object.entries(dayTotals)
      .map(([d, amounts]) => ({ day: parseInt(d), avg: amounts.reduce((s, a) => s + a, 0) / amounts.length }))
      .sort((a, b) => b.avg - a.avg);
    return {
      weekendAvg: avg([0, 6]),
      weekdayAvg: avg([1, 2, 3, 4, 5]),
      heaviestDay: dayAvgs[0] ? FULL_DAY_NAMES[dayAvgs[0].day] : null,
    };
  }, [expenses]);

  // ── COMPARISON CHART ──
  function getForPeriod(str: string, type: 'day' | 'week' | 'month'): Expense[] {
    if (type === 'day') return expenses.filter(e => toDateStr(new Date(e.date)) === str);
    const bounds = type === 'week' ? weekBounds(str) : monthBounds(str);
    return expenses.filter(e => { const d = new Date(e.date); return d >= bounds.start && d < bounds.end; });
  }

  const comparisonData = useMemo(() => {
    const aExp = getForPeriod(periodA, compareType);
    const bExp = getForPeriod(periodB, compareType);
    const cats = new Set([...aExp.map(e => e.category), ...bExp.map(e => e.category)]);
    const mapA: Record<string, number> = {};
    for (const e of aExp) mapA[e.category] = (mapA[e.category] || 0) + e.amount;
    const mapB: Record<string, number> = {};
    for (const e of bExp) mapB[e.category] = (mapB[e.category] || 0) + e.amount;
    return Array.from(cats)
      .map(cat => ({ category: cat, A: mapA[cat] || 0, B: mapB[cat] || 0 }))
      .sort((a, b) => (b.A + b.B) - (a.A + a.B));
  }, [periodA, periodB, compareType, expenses]);

  // ── RECENT EXPENSES ──
  const recentExpenses = useMemo(() => {
    let list = expenses.filter(e => toDateStr(new Date(e.date)) === recentDay);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.merchant.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    return list;
  }, [expenses, recentDay, search]);

  const recentDayTotal = recentExpenses.reduce((s, e) => s + e.amount, 0);

  const thisMonthSpent = summary.thisMonthTotal - (summary.thisMonthInvested ?? 0);
  const thisMonthInvested = summary.thisMonthInvested ?? 0;
  const budgetPct = monthlyBudget > 0 ? Math.round((thisMonthSpent / monthlyBudget) * 100) : null;
  const freeCash = monthlyIncome > 0 ? monthlyIncome - summary.thisMonthTotal : null;
  const savingsRate = monthlyIncome > 0
    ? Math.round(((thisMonthInvested + Math.max(0, freeCash ?? 0)) / monthlyIncome) * 100)
    : null;

  // Shared style tokens
  const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm';
  const pickerClass = 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400 dark:focus:ring-blue-500';
  const toggleBase = 'px-4 py-1.5 text-sm font-medium transition capitalize';
  const toggleActive = 'bg-orange-500 dark:bg-blue-600 text-white';
  const toggleInactive = 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';

  function resetComparePeriods(type: 'day' | 'week' | 'month') {
    if (type === 'day') {
      const y = new Date(); y.setDate(y.getDate() - 1);
      setPeriodA(toDateStr(y)); setPeriodB(today);
    } else if (type === 'week') {
      const w = new Date(); w.setDate(w.getDate() - 7);
      setPeriodA(toISOWeek(w)); setPeriodB(currentWeek);
    } else {
      const m = new Date(); m.setMonth(m.getMonth() - 1);
      setPeriodA(m.toISOString().substring(0, 7)); setPeriodB(currentMonth);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Spent This Month"
          value={fmt(thisMonthSpent)}
          sub={summary.totalCount > 0 ? `${summary.totalCount} expenses` : undefined}
        />
        <StatCard
          label="Invested"
          value={thisMonthInvested > 0 ? fmt(thisMonthInvested) : '—'}
          sub={thisMonthInvested > 0 && monthlyIncome > 0
            ? `${Math.round((thisMonthInvested / monthlyIncome) * 100)}% of income`
            : 'Log SIP / stocks'}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Budget Used"
          value={budgetPct !== null ? `${budgetPct}%` : '—'}
          sub={monthlyBudget > 0 ? `of ${fmt(monthlyBudget)}` : 'Not set'}
          accent={budgetPct !== null
            ? (budgetPct >= 100 ? 'text-red-500 dark:text-red-400' : budgetPct >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')
            : undefined}
        />
        <StatCard
          label="Free Cash"
          value={freeCash !== null ? fmt(Math.max(0, freeCash)) : '—'}
          sub={freeCash !== null && freeCash < 0 ? '⚠️ Over income' : (savingsRate !== null ? `${savingsRate}% savings rate` : undefined)}
          accent={freeCash !== null ? (freeCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') : undefined}
        />
        <StatCard label="Top Category" value={summary.topCategory ?? '—'} sub="highest spend" />
      </div>

      {/* ── CATEGORY FILTER PILLS ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${!activeCategory ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className="px-3 py-1 rounded-full text-sm font-medium transition"
              style={{
                backgroundColor: activeCategory === cat
                  ? (CATEGORY_COLORS[cat] ?? '#6b7280')
                  : isDark ? '#1f2937' : '#f3f4f6',
                color: activeCategory === cat ? '#fff' : isDark ? '#9ca3af' : '#4b5563',
              }}
            >
              {CATEGORY_EMOJIS[cat] ?? '📦'} {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN CHART + INSIGHTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Main chart */}
        <div className={`${card} lg:col-span-2 p-6`}>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {(['day', 'week', 'month'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`${toggleBase} ${chartPeriod === p ? toggleActive : toggleInactive}`}>
                  {p}
                </button>
              ))}
            </div>
            {chartPeriod === 'day' && (
              <input type="date" value={selectedDay} max={today}
                onChange={e => setSelectedDay(e.target.value)} className={pickerClass} />
            )}
            {chartPeriod === 'week' && (
              <input type="week" value={selectedWeek} max={currentWeek}
                onChange={e => setSelectedWeek(e.target.value)} className={pickerClass} />
            )}
            {chartPeriod === 'month' && (
              <input type="month" value={selectedMonth} max={currentMonth}
                onChange={e => setSelectedMonth(e.target.value)} className={pickerClass} />
            )}
            <div className="ml-auto text-right">
              <p className="text-gray-400 dark:text-gray-500 text-xs">{mainChartTitle}</p>
              <p className="text-gray-900 dark:text-white font-bold text-lg">{fmt(mainChartTotal)}</p>
            </div>
          </div>

          {mainChartData.length === 0 || mainChartTotal === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No expenses for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mainChartData} barSize={chartPeriod === 'month' ? 10 : 30}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {mainChartData.map((entry, i) => (
                    <Cell key={i}
                      fill={chartPeriod === 'day' ? (CATEGORY_COLORS[entry.name] ?? '#6b7280') : '#f97316'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Insights sidebar */}
        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">30-Day Trend</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={trendData}>
                <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} dot={false} />
                <Tooltip content={<CustomTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {(weekendAvg > 0 || weekdayAvg > 0) && (
            <div className={`${card} p-5`}>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">Spend Pattern</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Weekday avg</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{fmt(weekdayAvg)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Weekend avg</span>
                  <span className={`font-semibold ${weekendAvg > weekdayAvg ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {fmt(weekendAvg)}
                  </span>
                </div>
                {weekendAvg > weekdayAvg && weekdayAvg > 0 && (
                  <p className="text-yellow-600 dark:text-yellow-500 text-xs pt-1">
                    ⚠️ {Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100)}% more on weekends
                  </p>
                )}
                {heaviestDay && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">📆 Heaviest: {heaviestDay}</p>
                )}
              </div>
            </div>
          )}

          <div className={`${card} p-5`}>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">All-time Spent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(summary.allTimeTotal)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{summary.totalCount} expenses</p>
          </div>
        </div>
      </div>

      {/* ── COMPARISON CHART ── */}
      <div className={`${card} p-6`}>
        <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-4">Compare Periods</h3>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {(['day', 'week', 'month'] as const).map(p => (
              <button key={p}
                onClick={() => { setCompareType(p); resetComparePeriods(p); }}
                className={`${toggleBase} ${compareType === p ? 'bg-purple-500 text-white' : toggleInactive}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            {compareType === 'day' && <input type="date" value={periodA} max={today} onChange={e => setPeriodA(e.target.value)} className={pickerClass} />}
            {compareType === 'week' && <input type="week" value={periodA} max={currentWeek} onChange={e => setPeriodA(e.target.value)} className={pickerClass} />}
            {compareType === 'month' && <input type="month" value={periodA} max={currentMonth} onChange={e => setPeriodA(e.target.value)} className={pickerClass} />}
          </div>
          <span className="text-gray-400 font-medium">vs</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            {compareType === 'day' && <input type="date" value={periodB} max={today} onChange={e => setPeriodB(e.target.value)} className={pickerClass} />}
            {compareType === 'week' && <input type="week" value={periodB} max={currentWeek} onChange={e => setPeriodB(e.target.value)} className={pickerClass} />}
            {compareType === 'month' && <input type="month" value={periodB} max={currentMonth} onChange={e => setPeriodB(e.target.value)} className={pickerClass} />}
          </div>
        </div>

        {comparisonData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            No data for the selected periods
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData} barSize={18} barGap={4}>
              <XAxis dataKey="category" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
              <Legend
                formatter={(value) => value === 'A' ? periodLabel(periodA, compareType) : periodLabel(periodB, compareType)}
                wrapperStyle={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
              />
              <Bar dataKey="A" name="A" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="B" name="B" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── RECENT EXPENSES ── */}
      <div className={`${card} p-6`}>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h3 className="text-gray-700 dark:text-gray-300 font-semibold">Expenses</h3>
          <input type="date" value={recentDay} max={today}
            onChange={e => setRecentDay(e.target.value)} className={pickerClass} />
          <input type="text" placeholder="Search merchant..." value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${pickerClass} w-44`} />
          <div className="ml-auto flex items-center gap-4">
            <span className="text-gray-400 text-sm">{recentExpenses.length} items</span>
            {recentDayTotal > 0 && (
              <span className="text-gray-900 dark:text-white font-semibold">{fmt(recentDayTotal)}</span>
            )}
          </div>
        </div>

        {recentExpenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses found.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentExpenses.map(e => (
              <li key={e._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_EMOJIS[e.category] ?? '📦'}</span>
                  <div>
                    <p className="text-gray-900 dark:text-white text-sm font-medium">{e.merchant}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{e.category}</p>
                  </div>
                </div>
                <p className="text-gray-900 dark:text-white font-semibold">{fmt(e.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
