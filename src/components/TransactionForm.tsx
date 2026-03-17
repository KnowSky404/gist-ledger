import React, { useMemo, useState } from 'react';
import {
  PlusCircle,
  MinusCircle,
  Calendar,
  Tag,
  FileText,
  IndianRupee,
  Wallet,
  Save,
  Sparkles,
  PiggyBank,
  AlertTriangle,
} from 'lucide-react';
import type { LedgerItem } from '../services/gist';
import { formatAmount, localeMeta, messages, normalizeKnownCategoryInput, type Locale } from '../i18n';
import {
  formatDateValue,
  getCategoryOptions,
  getFrequentCategories,
  getMonthBudgetSnapshot,
  parseLedgerDate,
} from '../utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TransactionFormProps {
  onSubmit: (item: LedgerItem) => void;
  isLoading?: boolean;
  initialData?: LedgerItem | null;
  onCancel?: () => void;
  existingItems?: LedgerItem[];
  monthlyExpenseBudget?: number;
  locale: Locale;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  isLoading,
  initialData,
  onCancel,
  existingItems = [],
  monthlyExpenseBudget,
  locale,
}) => {
  const copy = messages[locale];
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [category, setCategory] = useState(
    normalizeKnownCategoryInput(initialData?.category || '', initialData?.type || 'expense', locale) ||
      getCategoryOptions(existingItems, initialData?.type || 'expense', locale)[0],
  );
  const [date, setDate] = useState(initialData?.date || formatDateValue(new Date()));
  const [remark, setRemark] = useState(initialData?.remark || '');

  const parsedAmount = Number(amount);
  const normalizedAmount = Number.isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);

  const dateShortcuts = useMemo(
    () => [
      {
        label: copy.form.today,
        value: formatDateValue(new Date()),
      },
      {
        label: copy.form.yesterday,
        value: (() => {
          const next = new Date();
          next.setDate(next.getDate() - 1);
          return formatDateValue(next);
        })(),
      },
      {
        label: copy.form.monthStart,
        value: (() => {
          const next = new Date();
          next.setDate(1);
          return formatDateValue(next);
        })(),
      },
    ],
    [copy.form.monthStart, copy.form.today, copy.form.yesterday],
  );



  const quickCategories = useMemo(() => getFrequentCategories(existingItems, type, 6, locale), [existingItems, locale, type]);
  const categoryOptions = useMemo(() => {
    const trimmed = category.trim();
    return Array.from(new Set([...(trimmed ? [trimmed] : []), ...getCategoryOptions(existingItems, type, locale)])).filter(Boolean);
  }, [category, existingItems, locale, type]);

  const budgetSnapshot = useMemo(() => {
    if (initialData || type !== 'expense') {
      return null;
    }

    return getMonthBudgetSnapshot(existingItems, parseLedgerDate(date), monthlyExpenseBudget, {
      extraExpense: normalizedAmount > 0 ? normalizedAmount : 0,
    });
  }, [date, existingItems, initialData, monthlyExpenseBudget, normalizedAmount, type]);

  const datalistId = initialData ? `transaction-category-edit-${initialData.id}` : 'transaction-category-create';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedCategory = normalizeKnownCategoryInput(category.trim(), type, locale);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !normalizedCategory) {
      return;
    }

    const newItem: LedgerItem = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      date,
      amount: normalizedAmount,
      category: normalizedCategory,
      remark: remark.trim(),
      type,
    };

    onSubmit(newItem);

    if (!initialData) {
      setAmount('');
      setRemark('');
    }
  };

  const handleTypeChange = (nextType: 'expense' | 'income') => {
    setType(nextType);

    if (!category.trim()) {
      setCategory(getCategoryOptions(existingItems, nextType, locale)[0]);
      return;
    }

    const nextOptions = getCategoryOptions(existingItems, nextType, locale);
    if (!nextOptions.includes(normalizeKnownCategoryInput(category, nextType, locale))) {
      setCategory(nextOptions[0]);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 lg:p-7 xl:p-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {initialData ? <Save className="w-5 h-5 text-indigo-500" /> : <Wallet className="w-5 h-5 text-indigo-500" />}
          {initialData ? copy.form.titleEdit : copy.form.titleNew}
        </h2>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 rounded-full bg-slate-50 dark:bg-slate-950/60 px-3 py-1 border border-slate-100 dark:border-slate-800">
            {copy.form.autoSync}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 rounded-full bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1 border border-slate-100 dark:border-slate-800">
            {localeMeta[locale].label}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium',
              type === 'expense' ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200',
            )}
          >
            <MinusCircle className="w-4 h-4" />
            {copy.common.expense}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium',
              type === 'income' ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200',
            )}
          >
            <PlusCircle className="w-4 h-4" />
            {copy.common.income}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            {copy.common.amount}
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            min="0.01"
            required
            autoFocus={!initialData}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-lg font-semibold transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {copy.common.category}
            </label>
            <input
              list={datalistId}
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={copy.form.categoryPlaceholder}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
            <datalist id={datalistId}>
              {categoryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {copy.common.date}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all date-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {copy.form.frequentCategories}
          </div>
          <div className="flex flex-wrap gap-2">
            {quickCategories.map((quickCategory) => (
              <button
                key={quickCategory}
                type="button"
                onClick={() => setCategory(quickCategory)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-all',
                  category === quickCategory
                    ? type === 'expense'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-200'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-200 hover:text-slate-800 dark:hover:text-slate-100 dark:text-slate-100',
                )}
              >
                {quickCategory}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            {copy.form.quickDate}
          </div>
          <div className="flex flex-wrap gap-2">
            {dateShortcuts.map((shortcut) => {
              const isActive = date === shortcut.value;

              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setDate(shortcut.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-all',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 border-indigo-200'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300',
                  )}
                >
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </div>

        {budgetSnapshot && (
          <div className={cn(
            'rounded-2xl border p-4 space-y-3',
            budgetSnapshot.overspent > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/60' : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/60',
          )}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {budgetSnapshot.overspent > 0 ? (
                  <AlertTriangle size={16} className="text-rose-500" />
                ) : (
                  <PiggyBank size={16} className="text-indigo-500" />
                )}
                {copy.form.budgetWarning}
              </div>
              <span className={cn(
                'text-xs px-2.5 py-1 rounded-full border',
                budgetSnapshot.overspent > 0
                  ? 'bg-rose-100 text-rose-600 dark:text-rose-300 border-rose-200'
                  : 'bg-white dark:bg-slate-900/80 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60',
              )}>
                {copy.form.budgetLabel(budgetSnapshot.budget)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <span>{copy.form.expenseAfterSave}</span>
                <span>{formatAmount(locale, budgetSnapshot.expenseTotal)} / {formatAmount(locale, budgetSnapshot.budget)}</span>
              </div>
              <div className="h-2 rounded-full bg-white dark:bg-slate-900/80 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', budgetSnapshot.overspent > 0 ? 'bg-rose-50 dark:bg-rose-950/300' : 'bg-indigo-50 dark:bg-indigo-950/300')}
                  style={{ width: `${Math.min(budgetSnapshot.progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white dark:bg-slate-900/80 p-3 border border-white/80">
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.form.remainingBudget}</div>
                <div className={cn('font-semibold', budgetSnapshot.remaining >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-300')}>
                  {formatAmount(locale, budgetSnapshot.remaining)}
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-900/80 p-3 border border-white/80">
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.form.projectedMonthExpense}</div>
                <div className={cn(
                  'font-semibold',
                  budgetSnapshot.projectedExpense > budgetSnapshot.budget ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100',
                )}>
                  {budgetSnapshot.projectedExpense > 0 ? formatAmount(locale, budgetSnapshot.projectedExpense) : copy.common.dash}
                </div>
              </div>
            </div>

            <p className={cn('text-xs leading-5', budgetSnapshot.overspent > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500')}>
              {budgetSnapshot.overspent > 0
                ? copy.form.overspentAfterSave(budgetSnapshot.overspent)
                : budgetSnapshot.isCurrentMonth && budgetSnapshot.remainingDays > 0
                  ? copy.form.dailyAllowanceTip(budgetSnapshot.dailyAllowance)
                  : copy.form.stillWithinBudget}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {copy.common.notes}
          </label>
          <input
            type="text"
            maxLength={60}
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder={copy.form.notesPlaceholder}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-1">
          {initialData && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
            >
              {copy.common.cancel}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex-1 py-3 rounded-xl font-semibold text-white transition-all shadow-lg active:scale-[0.99]',
              type === 'expense'
                ? 'bg-rose-400 hover:bg-rose-600 dark:bg-rose-400 dark:hover:bg-rose-500 shadow-rose-200/70 dark:shadow-rose-900/40'
                : 'bg-emerald-400 hover:bg-emerald-600 dark:bg-emerald-400 dark:hover:bg-emerald-500 shadow-emerald-200/70 dark:shadow-emerald-900/40',
              isLoading && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}
          >
            {isLoading ? copy.common.saving : initialData ? copy.form.saveChanges : copy.form.confirmEntry}
          </button>
        </div>
      </form>
    </div>
  );
};
