import React, { useEffect, useMemo, useState } from 'react';
import type { LedgerItem } from '../services/gist';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Download,
  ArrowDownUp,
  CalendarDays,
} from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { DateInput } from './DateInput';
import { formatAmount, formatDisplayDate, localizeCategoryLabel, messages, type Locale } from '../i18n';
import { createExportFilename, downloadTextFile, ledgerItemsToCsv, parseLedgerDate } from '../utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryViewProps {
  items: LedgerItem[];
  onDelete: (id: string) => void;
  onUpdate: (item: LedgerItem) => void;
  isLoading: boolean;
  monthlyExpenseBudget?: number;
  locale: Locale;
}

const PAGE_SIZE = 12;

type SortMode = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const formatDateValue = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onDelete,
  onUpdate,
  isLoading,
  monthlyExpenseBudget,
  locale,
}) => {
  const copy = messages[locale];
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchRemark, setSearchRemark] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState<LedgerItem | null>(null);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) {
        return false;
      }

      if (startDate && item.date < startDate) {
        return false;
      }

      if (endDate && item.date > endDate) {
        return false;
      }

      if (searchRemark) {
        const query = searchRemark.trim().toLowerCase();
        const localizedCategory = localizeCategoryLabel(item.category, item.type, locale).toLowerCase();
        const rawCategory = item.category.toLowerCase();
        const matchCategory = localizedCategory.includes(query) || rawCategory.includes(query);
        const matchRemark = item.remark?.toLowerCase().includes(query);

        if (!matchCategory && !matchRemark) {
          return false;
        }
      }

      return true;
    });

    return result.sort((left, right) => {
      switch (sortMode) {
        case 'date-asc':
          return parseLedgerDate(left.date).getTime() - parseLedgerDate(right.date).getTime();
        case 'amount-desc':
          return right.amount - left.amount;
        case 'amount-asc':
          return left.amount - right.amount;
        case 'date-desc':
        default:
          return parseLedgerDate(right.date).getTime() - parseLedgerDate(left.date).getTime();
      }
    });
  }, [endDate, filterType, items, locale, searchRemark, sortMode, startDate]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (accumulator, item) => {
        if (item.type === 'income') {
          accumulator.income += item.amount;
        } else {
          accumulator.expense += item.amount;
        }
        return accumulator;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const hasActiveFilters = filterType !== 'all' || Boolean(startDate) || Boolean(endDate) || Boolean(searchRemark);

  useEffect(() => {
    if (!editingItem) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingItem(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingItem]);

  const clearAllFilters = () => {
    setFilterType('all');
    setStartDate('');
    setEndDate('');
    setSearchRemark('');
    setSortMode('date-desc');
    setCurrentPage(1);
  };

  const applyDatePreset = (preset: 'month' | '30days' | 'year' | 'all') => {
    const today = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
      return;
    }

    const start = new Date(today);
    if (preset === 'month') {
      start.setDate(1);
    }
    if (preset === '30days') {
      start.setDate(today.getDate() - 29);
    }
    if (preset === 'year') {
      start.setMonth(0, 1);
    }

    setStartDate(formatDateValue(start));
    setEndDate(formatDateValue(today));
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(copy.history.confirmDelete)) {
      onDelete(id);
    }
  };

  const handleEditSubmit = (updatedItem: LedgerItem) => {
    onUpdate(updatedItem);
    setEditingItem(null);
  };

  const handleExport = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? ledgerItemsToCsv(filteredItems, locale) : JSON.stringify(filteredItems, null, 2);
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';

    downloadTextFile(createExportFilename(format), content, mimeType);
  };

  const typeLabel = filterType === 'expense' ? copy.common.expense : copy.common.income;

  return (
    <>
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto overscroll-contain bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={() => setEditingItem(null)}
        >
          <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
            <TransactionForm
              key={`${editingItem.id}-${locale}`}
              initialData={editingItem}
              onSubmit={handleEditSubmit}
              isLoading={isLoading}
              onCancel={() => setEditingItem(null)}
              existingItems={items}
              monthlyExpenseBudget={monthlyExpenseBudget}
              locale={locale}
            />
          </div>
        </div>
      )}

      <div className="space-y-6 xl:grid xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-6 xl:space-y-0 items-start">
        <aside className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 xl:sticky xl:top-24">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
            <Filter size={18} className="text-indigo-500" />
            {copy.history.filterTitle}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['all', 'expense', 'income'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                    filterType === type ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200',
                  )}
                >
                  {type === 'all' ? copy.common.all : type === 'expense' ? copy.common.expense : copy.common.income}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder={copy.history.searchPlaceholder}
                value={searchRemark}
                onChange={(event) => {
                  setSearchRemark(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <CalendarDays size={14} className="text-indigo-500" />
                {copy.history.quickRange}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'month', label: copy.history.thisMonth },
                  { key: '30days', label: copy.history.last30Days },
                  { key: 'year', label: copy.history.thisYear },
                  { key: 'all', label: copy.history.allTime },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => applyDatePreset(preset.key as 'month' | '30days' | 'year' | 'all')}
                    className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-sm hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <DateInput
                value={startDate}
                onChange={(next) => {
                  setStartDate(next);
                  setCurrentPage(1);
                }}
                locale={locale}
                placeholder={copy.common.start}
                allowClear
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <DateInput
                value={endDate}
                onChange={(next) => {
                  setEndDate(next);
                  setCurrentPage(1);
                }}
                locale={locale}
                placeholder={copy.common.end}
                allowClear
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{copy.history.filteredResult}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{filteredItems.length} / {items.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{copy.common.income}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">{formatAmount(locale, summary.income)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{copy.common.expense}</span>
                <span className="font-semibold text-rose-600 dark:text-rose-300">{formatAmount(locale, summary.expense)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{copy.common.balance}</span>
                <span className={cn('font-semibold', summary.income - summary.expense >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-rose-600 dark:text-rose-300')}>
                  {formatAmount(locale, summary.income - summary.expense)}
                </span>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <ArrowDownUp size={16} className="text-slate-400 dark:text-slate-500" />
            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value as SortMode);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="date-desc">{copy.history.sortDateDesc}</option>
              <option value="date-asc">{copy.history.sortDateAsc}</option>
              <option value="amount-desc">{copy.history.sortAmountDesc}</option>
              <option value="amount-asc">{copy.history.sortAmountAsc}</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {copy.history.exportCsv}
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {copy.history.exportJson}
            </button>
            {(hasActiveFilters || sortMode !== 'date-desc') && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:bg-rose-950/30 transition-colors"
              >
                <X size={14} />
                {copy.history.clear}
              </button>
            )}
          </div>
        </aside>

        <section className="space-y-4 min-w-0">
          {(hasActiveFilters || sortMode !== 'date-desc') && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                  {copy.history.typeLabel(typeLabel)}
                </span>
              )}
              {searchRemark && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {copy.history.keywordLabel(searchRemark)}
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {copy.history.timeLabel(startDate, endDate)}
                </span>
              )}
              {sortMode !== 'date-desc' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {copy.history.sortAdjusted}
                </span>
              )}
            </div>
          )}

          {currentItems.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3">
              <Inbox size={48} className="text-slate-200" />
              <p>{copy.history.noMatch}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden xl:grid xl:grid-cols-[130px_minmax(0,1.3fr)_110px_130px_84px] bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                <span>{copy.history.dateHeader}</span>
                <span>{copy.history.categoryRemarkHeader}</span>
                <span>{copy.history.typeHeader}</span>
                <span className="text-right">{copy.history.amountHeader}</span>
                <span className="text-right">{copy.history.actionHeader}</span>
              </div>

              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md xl:grid xl:grid-cols-[130px_minmax(0,1.3fr)_110px_130px_84px] xl:items-center xl:gap-4"
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 xl:text-slate-400 dark:text-slate-500">{formatDisplayDate(locale, parseLedgerDate(item.date))}</div>

                  <div className="min-w-0 mt-2 xl:mt-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{localizeCategoryLabel(item.category, item.type, locale)}</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium xl:hidden',
                        item.type === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300',
                      )}>
                        {item.type === 'expense' ? copy.common.expense : copy.common.income}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{item.remark || copy.common.dash}</div>
                  </div>

                  <div className="hidden xl:flex xl:items-center">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      item.type === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300',
                    )}>
                      {item.type === 'expense' ? copy.common.expense : copy.common.income}
                    </span>
                  </div>

                  <div className={cn('mt-3 xl:mt-0 text-lg xl:text-right font-bold font-mono', item.type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-300')}>
                    {item.type === 'expense' ? '-' : '+'}
                    {formatAmount(locale, item.amount)}
                  </div>

                  <div className="mt-3 xl:mt-0 flex justify-end gap-1 opacity-100 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:bg-indigo-950/30 rounded-lg transition-colors"
                      title={copy.common.edit}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:bg-rose-950/30 rounded-lg transition-colors"
                      title={copy.common.delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{copy.history.page(safeCurrentPage, totalPages)}</span>
              <button
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
};
