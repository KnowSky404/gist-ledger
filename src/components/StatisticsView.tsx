import React, { useMemo, useState } from 'react';
import type { LedgerItem } from '../services/gist';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  Filter,
  X,
  Calendar,
  BarChart3,
  RotateCcw,
  Layers3,
  PiggyBank,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  formatAmount,
  formatDeltaLabel,
  formatMonthPeriod,
  formatPercent,
  formatYearAxisLabel,
  formatYearPeriod,
  localizeCategoryLabel,
  messages,
  monthAxisLabels,
  type Locale,
} from '../i18n';
import { getMonthBudgetSnapshot, parseLedgerDate } from '../utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatisticsViewProps {
  items: LedgerItem[];
  monthlyExpenseBudget?: number;
  onSaveBudget: (budget: number | null) => Promise<void> | void;
  isSaving?: boolean;
  locale: Locale;
}

type Summary = {
  income: number;
  expense: number;
  balance: number;
  count: number;
  activeDays: number;
  categoryCount: number;
};

type BreakdownItem = {
  category: string;
  amount: number;
  ratio: number;
  count: number;
};

const toMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

const buildSummary = (periodItems: LedgerItem[], locale: Locale): Summary => {
  const income = periodItems.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = periodItems.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
    count: periodItems.length,
    activeDays: new Set(periodItems.map((item) => item.date)).size,
    categoryCount: new Set(periodItems.map((item) => localizeCategoryLabel(item.category, item.type, locale))).size,
  };
};

const buildBreakdown = (periodItems: LedgerItem[], type: LedgerItem['type'], locale: Locale): BreakdownItem[] => {
  const scopedItems = periodItems.filter((item) => item.type === type);
  const total = scopedItems.reduce((sum, item) => sum + item.amount, 0);
  const categoryMap = new Map<string, { amount: number; count: number }>();

  scopedItems.forEach((item) => {
    const label = localizeCategoryLabel(item.category, item.type, locale);
    const current = categoryMap.get(label) ?? { amount: 0, count: 0 };
    categoryMap.set(label, {
      amount: current.amount + item.amount,
      count: current.count + 1,
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      ratio: total === 0 ? 0 : (value.amount / total) * 100,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);
};

const SimpleLineChart = ({
  data,
  color,
  height = 100,
  emptyText,
}: {
  data: number[];
  color: string;
  height?: number;
  emptyText: string;
}) => {
  if (data.length === 0 || data.every((item) => item === 0)) {
    return (
      <div className="flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs h-full" style={{ height }}>
        {emptyText}
      </div>
    );
  }

  const safeId = color.replace(/[^a-zA-Z0-9]/g, '');
  const max = Math.max(...data);
  const range = max || 1;
  const denominator = Math.max(data.length - 1, 1);
  const points = data
    .map((value, index) => {
      const x = (index / denominator) * 100;
      const y = 100 - (value / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  const lastPointX = (Math.max(data.length - 1, 0) / denominator) * 100;
  const lastPointY = 100 - (data[data.length - 1] / range) * 100;
  const areaPath = `M0,100 L${data
    .map((value, index) => {
      const x = (index / denominator) * 100;
      const y = 100 - (value / range) * 100;
      return `${x},${y}`;
    })
    .join(' L')} L100,100 Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${safeId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${safeId})`} stroke="none" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPointX} cy={lastPointY} r="2.8" fill={color} />
      </svg>
    </div>
  );
};

const BreakdownCard = ({
  title,
  items,
  tone,
  locale,
}: {
  title: string;
  items: BreakdownItem[];
  tone: 'expense' | 'income';
  locale: Locale;
}) => {
  const copy = messages[locale];
  const theme = tone === 'expense'
    ? {
        text: 'text-rose-600 dark:text-rose-300',
        track: 'bg-rose-100',
        bar: 'bg-rose-50 dark:bg-rose-950/300',
        badge: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-900/60',
      }
    : {
        text: 'text-emerald-600 dark:text-emerald-300',
        track: 'bg-emerald-100',
        bar: 'bg-emerald-50 dark:bg-emerald-950/300',
        badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60',
      };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Layers3 size={18} className={theme.text} />
          {title}
        </h3>
        <span className={cn('text-xs px-2.5 py-1 rounded-full border', theme.badge)}>{copy.stats.top(items.length || 0)}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-6 text-center">{copy.stats.noBreakdown}</div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={`${title}-${item.category}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-500 w-5 shrink-0">{index + 1}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{item.category}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn('font-semibold', theme.text)}>{formatAmount(locale, item.amount)}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{item.count} · {formatPercent(locale, item.ratio)}</div>
                </div>
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden', theme.track)}>
                <div className={cn('h-full rounded-full', theme.bar)} style={{ width: `${Math.max(item.ratio, 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BudgetPlannerCard = ({
  monthlyExpenseBudget,
  onSaveBudget,
  snapshot,
  hasCategoryFilter,
  isSaving,
  locale,
}: {
  monthlyExpenseBudget?: number;
  onSaveBudget: (budget: number | null) => Promise<void> | void;
  snapshot: ReturnType<typeof getMonthBudgetSnapshot>;
  hasCategoryFilter: boolean;
  isSaving?: boolean;
  locale: Locale;
}) => {
  const copy = messages[locale];
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const openEditor = () => {
    setBudgetInput(monthlyExpenseBudget ? monthlyExpenseBudget.toString() : '');
    setIsEditing(true);
  };

  const cancelEditor = () => {
    setBudgetInput('');
    setIsEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedBudget = Number(budgetInput);
    if (!budgetInput || Number.isNaN(parsedBudget) || parsedBudget <= 0) {
      return;
    }

    await onSaveBudget(Math.abs(parsedBudget));
    cancelEditor();
  };

  const handleClear = async () => {
    await onSaveBudget(null);
    cancelEditor();
  };

  if (!monthlyExpenseBudget || !snapshot) {
    return (
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <PiggyBank size={18} className="text-indigo-500" />
          {copy.stats.monthlyBudget}
        </div>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder={copy.stats.setBudgetPlaceholder}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditor}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                {copy.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? copy.common.saving : copy.stats.saveBudget}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 p-4 text-sm text-indigo-700 dark:text-indigo-300 leading-6">
              {copy.stats.setBudgetHint}
            </div>
            <button
              onClick={openEditor}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {copy.stats.setBudget}
            </button>
          </>
        )}
      </div>
    );
  }

  const projectedOverBudget = snapshot.projectedExpense > snapshot.budget;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <PiggyBank size={18} className="text-indigo-500" />
          {copy.stats.monthlyBudget}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openEditor}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:bg-indigo-950/30 transition-colors"
            title={copy.stats.editBudget}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:bg-rose-950/30 transition-colors disabled:opacity-40"
            title={copy.stats.clearBudget}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
            placeholder={copy.stats.modifyBudgetPlaceholder}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelEditor}
              className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-950/60 transition-colors"
            >
              {copy.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? copy.common.saving : copy.stats.saveBudget}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 p-4">
              <div className="text-indigo-600 dark:text-indigo-300/80 text-xs mb-1">{copy.stats.budgetTotal}</div>
              <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatAmount(locale, snapshot.budget)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.stats.spent}</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatAmount(locale, snapshot.expenseTotal)}</div>
            </div>
            <div className={cn('rounded-2xl border p-4', snapshot.overspent > 0 ? 'border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30' : 'border-emerald-100 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30')}>
              <div className={cn('text-xs mb-1', snapshot.overspent > 0 ? 'text-rose-600 dark:text-rose-300/80' : 'text-emerald-600 dark:text-emerald-300/80')}>
                {snapshot.overspent > 0 ? copy.stats.overspent : copy.stats.budgetRemaining}
              </div>
              <div className={cn('text-lg font-bold', snapshot.overspent > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>
                {formatAmount(locale, snapshot.overspent > 0 ? snapshot.overspent : snapshot.remaining)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{copy.stats.budgetProgress}</span>
              <span>{formatAmount(locale, snapshot.expenseTotal)} / {formatAmount(locale, snapshot.budget)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn('h-full rounded-full', snapshot.overspent > 0 ? 'bg-rose-50 dark:bg-rose-950/300' : 'bg-indigo-50 dark:bg-indigo-950/300')}
                style={{ width: `${Math.min(snapshot.progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.stats.projectedMonthEnd}</div>
              <div className={cn('font-semibold', projectedOverBudget ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100')}>
                {snapshot.projectedExpense > 0 ? formatAmount(locale, snapshot.projectedExpense) : copy.common.dash}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.stats.dailyAllowance}</div>
              <div className={cn('font-semibold', snapshot.dailyAllowance < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100')}>
                {snapshot.remainingDays > 0 ? formatAmount(locale, snapshot.dailyAllowance) : copy.common.dash}
              </div>
            </div>
          </div>

          <div className={cn('rounded-xl border p-4 text-sm leading-6', snapshot.overspent > 0 || projectedOverBudget ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-950/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300')}>
            {snapshot.overspent > 0
              ? copy.stats.budgetAdviceOverspent(snapshot.overspent)
              : projectedOverBudget
                ? copy.stats.budgetAdviceProjected(snapshot.projectedExpense - snapshot.budget)
                : snapshot.isFutureMonth
                  ? copy.stats.budgetAdviceFuture(snapshot.budget / snapshot.daysInMonth)
                  : snapshot.isPastMonth
                    ? copy.stats.budgetAdvicePast
                    : copy.stats.budgetAdviceCurrent(snapshot.remainingDays, snapshot.dailyAllowance)}
          </div>

          {hasCategoryFilter && <p className="text-xs text-slate-400 dark:text-slate-500">{copy.stats.budgetFilterNote}</p>}
        </>
      )}
    </div>
  );
};

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  items,
  monthlyExpenseBudget,
  onSaveBudget,
  isSaving,
  locale,
}) => {
  const copy = messages[locale];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const now = new Date();
  const isCurrentPeriod = viewMode === 'month'
    ? currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
    : currentDate.getFullYear() === now.getFullYear();

  const categories = useMemo(() => {
    const income = new Set<string>();
    const expense = new Set<string>();

    items.forEach((item) => {
      const label = localizeCategoryLabel(item.category, item.type, locale);
      if (item.type === 'income') {
        income.add(label);
      } else {
        expense.add(label);
      }
    });

    return {
      income: Array.from(income).sort(),
      expense: Array.from(expense).sort(),
    };
  }, [items, locale]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
      previous.includes(category) ? previous.filter((item) => item !== category) : [...previous, category],
    );
  };

  const clearFilter = () => setSelectedCategories([]);

  const stats = useMemo(() => {
    const filteredItems = items.filter((item) => {
      if (selectedCategories.length === 0) {
        return true;
      }

      return selectedCategories.includes(localizeCategoryLabel(item.category, item.type, locale));
    });

    const monthItems = filteredItems.filter((item) => {
      const date = parseLedgerDate(item.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    const previousMonthDate = new Date(year, month - 2, 1);
    const previousMonthItems = filteredItems.filter((item) => {
      const date = parseLedgerDate(item.date);
      return toMonthKey(date) === toMonthKey(previousMonthDate);
    });

    const yearItems = filteredItems.filter((item) => parseLedgerDate(item.date).getFullYear() === year);
    const previousYearItems = filteredItems.filter((item) => parseLedgerDate(item.date).getFullYear() === year - 1);

    const monthlyTrendIncome = Array(12).fill(0);
    const monthlyTrendExpense = Array(12).fill(0);

    yearItems.forEach((item) => {
      const index = parseLedgerDate(item.date).getMonth();
      if (item.type === 'income') {
        monthlyTrendIncome[index] += item.amount;
      } else {
        monthlyTrendExpense[index] += item.amount;
      }
    });

    const fiveYearTrendIncome = Array(5).fill(0);
    const fiveYearTrendExpense = Array(5).fill(0);
    const startYear = year - 4;

    filteredItems.forEach((item) => {
      const itemYear = parseLedgerDate(item.date).getFullYear();
      const index = itemYear - startYear;
      if (index < 0 || index >= 5) {
        return;
      }

      if (item.type === 'income') {
        fiveYearTrendIncome[index] += item.amount;
      } else {
        fiveYearTrendExpense[index] += item.amount;
      }
    });

    const monthSummary = buildSummary(monthItems, locale);
    const previousMonthSummary = buildSummary(previousMonthItems, locale);
    const yearSummary = buildSummary(yearItems, locale);
    const previousYearSummary = buildSummary(previousYearItems, locale);

    return {
      filteredCount: filteredItems.length,
      month: {
        ...monthSummary,
        previous: previousMonthSummary,
        trend: { income: monthlyTrendIncome, expense: monthlyTrendExpense },
        typeBreakdown: {
          expense: buildBreakdown(monthItems, 'expense', locale),
          income: buildBreakdown(monthItems, 'income', locale),
        },
      },
      year: {
        ...yearSummary,
        previous: previousYearSummary,
        trend: { income: fiveYearTrendIncome, expense: fiveYearTrendExpense },
        typeBreakdown: {
          expense: buildBreakdown(yearItems, 'expense', locale),
          income: buildBreakdown(yearItems, 'income', locale),
        },
      },
    };
  }, [items, locale, month, selectedCategories, year]);

  const budgetSnapshot = useMemo(() => getMonthBudgetSnapshot(items, currentDate, monthlyExpenseBudget), [currentDate, items, monthlyExpenseBudget]);
  const currentStats = viewMode === 'month' ? stats.month : stats.year;
  const currentTrend = currentStats.trend;
  const incomeDelta = formatDeltaLabel(locale, currentStats.income, currentStats.previous.income);
  const expenseDelta = formatDeltaLabel(locale, currentStats.expense, currentStats.previous.expense);
  const balanceDelta = formatDeltaLabel(locale, currentStats.balance, currentStats.previous.balance);
  const topExpense = currentStats.typeBreakdown.expense[0];
  const topIncome = currentStats.typeBreakdown.income[0];
  const savingsRate = currentStats.income === 0 ? null : (currentStats.balance / currentStats.income) * 100;

  const xAxisLabels = useMemo(() => {
    if (viewMode === 'year') {
      const startYear = year - 4;
      return Array.from({ length: 5 }, (_, index) => formatYearAxisLabel(locale, startYear + index));
    }

    return monthAxisLabels[locale];
  }, [locale, viewMode, year]);

  const changeDate = (offset: number) => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setMonth(nextDate.getMonth() + offset);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + offset);
    }
    setCurrentDate(nextDate);
  };

  const resetToCurrent = () => setCurrentDate(new Date());

  const periodTitle = viewMode === 'month' ? formatMonthPeriod(locale, year, month) : formatYearPeriod(locale, year);
  const trendTitle = viewMode === 'month' ? copy.stats.monthTrendTitle(year) : copy.stats.yearTrendTitle;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-center">
          <button
            onClick={() => setViewMode('month')}
            className={cn('flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all', viewMode === 'month' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200')}
          >
            <Calendar size={16} /> {copy.stats.monthView}
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={cn('flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all', viewMode === 'year' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200')}
          >
            <BarChart3 size={16} /> {copy.stats.yearView}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 mt-2">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 dark:text-slate-500">←</button>
          <div className="flex flex-col items-center text-center">
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{periodTitle}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{copy.stats.period}</span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 dark:text-slate-500">→</button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-50 pt-3">
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all', isFilterExpanded || selectedCategories.length > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-950/60')}
          >
            <Filter size={16} />
            {selectedCategories.length > 0 ? copy.stats.selectedCategories(selectedCategories.length) : copy.stats.filterCategories}
          </button>
          {!isCurrentPeriod && (
            <button
              onClick={resetToCurrent}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
            >
              <RotateCcw size={15} /> {copy.stats.backCurrent}
            </button>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            {copy.stats.filteredRecords(stats.filteredCount)}
          </span>
        </div>

        {isFilterExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{copy.stats.chooseCategory}</span>
                {selectedCategories.length > 0 && (
                  <button onClick={clearFilter} className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 flex items-center gap-1 hover:text-rose-500 dark:hover:text-rose-300 transition-colors">
                    <X size={12} /> {copy.stats.clearFilter}
                  </button>
                )}
              </div>

              {categories.expense.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mb-2 block">{copy.common.expense}</span>
                  <div className="flex flex-wrap gap-2">
                    {categories.expense.map((category) => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={cn('px-3 py-1 rounded-full text-sm border transition-all', selectedCategories.includes(category) ? 'bg-rose-100 border-rose-200 text-rose-700 dark:text-rose-300 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-200')}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {categories.income.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mb-2 block">{copy.common.income}</span>
                  <div className="flex flex-wrap gap-2">
                    {categories.income.map((category) => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={cn('px-3 py-1 rounded-full text-sm border transition-all', selectedCategories.includes(category) ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-200')}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {categories.income.length === 0 && categories.expense.length === 0 && <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-2">{copy.stats.noCategoryData}</div>}
            </div>
          </div>
        )}
      </div>

      {viewMode === 'month' && (
        <BudgetPlannerCard
          monthlyExpenseBudget={monthlyExpenseBudget}
          onSaveBudget={onSaveBudget}
          snapshot={budgetSnapshot}
          hasCategoryFilter={selectedCategories.length > 0}
          isSaving={isSaving}
          locale={locale}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex flex-col justify-between min-h-32">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium text-sm">
            <TrendingUp size={16} /> {viewMode === 'month' ? copy.stats.monthIncome : copy.stats.yearIncome}
          </div>
          <div className="text-2xl font-bold text-emerald-800">+{formatAmount(locale, currentStats.income)}</div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300/80">{copy.common.versusPrevious(incomeDelta)}</div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/60 flex flex-col justify-between min-h-32">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium text-sm">
            <TrendingDown size={16} /> {viewMode === 'month' ? copy.stats.monthExpense : copy.stats.yearExpense}
          </div>
          <div className="text-2xl font-bold text-rose-800">-{formatAmount(locale, currentStats.expense)}</div>
          <div className="text-xs text-rose-700 dark:text-rose-300/80">{copy.common.versusPrevious(expenseDelta)}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-32">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
            <Wallet size={16} /> {viewMode === 'month' ? copy.stats.monthBalance : copy.stats.yearBalance}
          </div>
          <div className={cn('text-2xl font-bold', currentStats.balance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-300')}>
            {currentStats.balance > 0 ? '+' : ''}
            {formatAmount(locale, currentStats.balance)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{copy.common.versusPrevious(balanceDelta)}</div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col justify-between min-h-32">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium text-sm">
            <Activity size={16} /> {copy.stats.activity}
          </div>
          <div className="text-2xl font-bold text-indigo-800">{copy.stats.entries(currentStats.count)}</div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300/80">{copy.stats.activeSummary(currentStats.activeDays, currentStats.categoryCount)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="text-indigo-500" size={18} />
              {trendTitle}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              {viewMode === 'month' ? copy.stats.accumulateByMonth : copy.stats.accumulateByYear}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-300 mb-1 font-medium">
                <span>{copy.stats.incomeTrend}</span>
                <span>{copy.common.total(formatAmount(locale, viewMode === 'month' ? stats.year.income : currentStats.income, 0))}</span>
              </div>
              <SimpleLineChart data={currentTrend.income} color="#10b981" height={84} emptyText={copy.stats.noData} />
            </div>
            <div className="pt-4 border-t border-slate-50">
              <div className="flex justify-between text-xs text-rose-600 dark:text-rose-300 mb-1 font-medium">
                <span>{copy.stats.expenseTrend}</span>
                <span>{copy.common.total(formatAmount(locale, viewMode === 'month' ? stats.year.expense : currentStats.expense, 0))}</span>
              </div>
              <SimpleLineChart data={currentTrend.expense} color="#f43f5e" height={84} emptyText={copy.stats.noData} />
            </div>
          </div>

          <div className="flex justify-between px-1 text-xs text-slate-400 dark:text-slate-500">
            {xAxisLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
            <BarChart3 size={18} className="text-indigo-500" />
            {copy.stats.insights}
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
              <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{copy.stats.savingsRate}</div>
              <div className={cn('text-xl font-bold', savingsRate !== null && savingsRate < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100')}>
                {savingsRate === null ? copy.common.dash : formatPercent(locale, savingsRate)}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{copy.stats.savingsRateHint}</div>
            </div>
            <div className="rounded-xl border border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4">
              <div className="text-rose-600 dark:text-rose-300 mb-1">{copy.stats.topExpense}</div>
              <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{topExpense?.category || copy.common.none}</div>
              <div className="text-xs text-rose-600 dark:text-rose-300/80 mt-1">
                {topExpense ? `${formatAmount(locale, topExpense.amount)} · ${formatPercent(locale, topExpense.ratio)}` : copy.stats.noExpense}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-4">
              <div className="text-emerald-600 dark:text-emerald-300 mb-1">{copy.stats.topIncome}</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{topIncome?.category || copy.common.none}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-300/80 mt-1">
                {topIncome ? `${formatAmount(locale, topIncome.amount)} · ${formatPercent(locale, topIncome.ratio)}` : copy.stats.noIncome}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BreakdownCard title={copy.stats.expenseBreakdown} items={currentStats.typeBreakdown.expense} tone="expense" locale={locale} />
        <BreakdownCard title={copy.stats.incomeBreakdown} items={currentStats.typeBreakdown.income} tone="income" locale={locale} />
      </div>
    </div>
  );
};
