import type { LedgerItem, LedgerTemplate } from '../services/gist';
import { areCategoriesEquivalent, formatAmount, getDefaultCategories, localizeCategoryLabel, messages, type Locale } from '../i18n';

export const DEFAULT_CATEGORIES: Record<LedgerItem['type'], string[]> = {
  expense: [...getDefaultCategories('zh').expense],
  income: [...getDefaultCategories('zh').income],
};

export type MonthBudgetSnapshot = {
  budget: number;
  expenseTotal: number;
  remaining: number;
  overspent: number;
  progress: number;
  daysInMonth: number;
  elapsedDays: number;
  remainingDays: number;
  dailyAllowance: number;
  projectedExpense: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
};

const pad = (value: number) => String(value).padStart(2, '0');

export const formatDateValue = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseLedgerDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const isSameMonth = (left: Date, right: Date) => {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
};

export const getDateForDayOfMonth = (referenceDate: Date, dayOfMonth: number) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(dayOfMonth, 1), daysInMonth));
};

export const getTemplateEntryDate = (template: LedgerTemplate, referenceDate = new Date()) => {
  if (template.dayOfMonth) {
    return formatDateValue(getDateForDayOfMonth(referenceDate, template.dayOfMonth));
  }

  return formatDateValue(referenceDate);
};

export type TemplateExecutionTone = 'default' | 'done' | 'due' | 'upcoming';

export const getTemplateExecutionState = (
  template: LedgerTemplate,
  items: LedgerItem[],
  referenceDate = new Date(),
) => {
  const scheduledDate = template.dayOfMonth ? getDateForDayOfMonth(referenceDate, template.dayOfMonth) : referenceDate;
  const matchedThisMonth = items.some((item) => {
    const itemDate = parseLedgerDate(item.date);
    if (!isSameMonth(itemDate, referenceDate)) {
      return false;
    }

    if (item.templateId === template.id) {
      return true;
    }

    return (
      item.type === template.type &&
      item.amount === template.amount &&
      areCategoriesEquivalent(item.category, template.category, template.type) &&
      (item.remark ?? '') === (template.remark ?? '')
    );
  });

  if (!template.dayOfMonth) {
    return {
      tone: 'default' as TemplateExecutionTone,
      scheduledDate,
      matchedThisMonth,
    };
  }

  if (matchedThisMonth) {
    return {
      tone: 'done' as TemplateExecutionTone,
      scheduledDate,
      matchedThisMonth,
    };
  }

  const monthEndTime = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  return {
    tone: scheduledDate.getTime() <= monthEndTime ? 'due' as TemplateExecutionTone : 'upcoming' as TemplateExecutionTone,
    scheduledDate,
    matchedThisMonth,
  };
};

const getCategoryRank = (items: LedgerItem[], type: LedgerItem['type']) => {
  const rankMap = new Map<string, { count: number; lastUsed: number }>();

  items.forEach((item) => {
    if (item.type !== type) {
      return;
    }

    const current = rankMap.get(item.category) ?? { count: 0, lastUsed: 0 };
    const usedAt = parseLedgerDate(item.date).getTime();

    rankMap.set(item.category, {
      count: current.count + 1,
      lastUsed: Math.max(current.lastUsed, usedAt),
    });
  });

  return Array.from(rankMap.entries())
    .sort((left, right) => {
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count;
      }

      return right[1].lastUsed - left[1].lastUsed;
    })
    .map(([category]) => category);
};

export const getCategoryOptions = (
  items: LedgerItem[],
  type: LedgerItem['type'],
  locale: Locale = 'zh',
) => {
  const defaults = getDefaultCategories(locale)[type];
  const ranked = getCategoryRank(items, type).map((category) => localizeCategoryLabel(category, type, locale));
  return Array.from(new Set([...defaults, ...ranked])).filter(Boolean);
};

export const getFrequentCategories = (
  items: LedgerItem[],
  type: LedgerItem['type'],
  limit = 6,
  locale: Locale = 'zh',
) => {
  const ranked = getCategoryRank(items, type).map((category) => localizeCategoryLabel(category, type, locale));

  if (ranked.length >= limit) {
    return Array.from(new Set(ranked)).slice(0, limit);
  }

  return Array.from(new Set([...ranked, ...getDefaultCategories(locale)[type]])).slice(0, limit);
};

const escapeCsvCell = (value: string | number) => {
  const normalized = String(value ?? '');

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
};

export const ledgerItemsToCsv = (items: LedgerItem[], locale: Locale) => {
  const copy = messages[locale];
  const rows = [
    [copy.common.date, copy.history.typeHeader, copy.common.category, copy.common.amount, copy.common.notes],
    ...items.map((item) => [
      item.date,
      item.type === 'expense' ? copy.common.expense : copy.common.income,
      localizeCategoryLabel(item.category, item.type, locale),
      formatAmount(locale, item.amount),
      item.remark ?? '',
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}`;
};

export const createExportFilename = (extension: 'csv' | 'json') => {
  const today = formatDateValue(new Date());
  return `gist-ledger-${today}.${extension}`;
};

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const getMonthBudgetSnapshot = (
  items: LedgerItem[],
  referenceDate: Date,
  monthlyBudget?: number | null,
  options?: { excludeId?: string; extraExpense?: number },
): MonthBudgetSnapshot | null => {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return null;
  }

  const targetYear = referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth();
  const expenseTotal = items.reduce((sum, item) => {
    if (item.id === options?.excludeId || item.type !== 'expense') {
      return sum;
    }

    const itemDate = parseLedgerDate(item.date);
    if (itemDate.getFullYear() !== targetYear || itemDate.getMonth() !== targetMonth) {
      return sum;
    }

    return sum + item.amount;
  }, 0) + (options?.extraExpense ?? 0);

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const today = new Date();
  const targetKey = targetYear * 12 + targetMonth;
  const todayKey = today.getFullYear() * 12 + today.getMonth();
  const isCurrentMonth = targetKey === todayKey;
  const isPastMonth = targetKey < todayKey;
  const isFutureMonth = targetKey > todayKey;
  const elapsedDays = isPastMonth ? daysInMonth : isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : 0;
  const remainingDays = isPastMonth ? 0 : isCurrentMonth ? Math.max(daysInMonth - today.getDate() + 1, 0) : daysInMonth;
  const remaining = monthlyBudget - expenseTotal;
  const projectedExpense = elapsedDays > 0 ? (expenseTotal / elapsedDays) * daysInMonth : 0;

  return {
    budget: monthlyBudget,
    expenseTotal,
    remaining,
    overspent: Math.max(expenseTotal - monthlyBudget, 0),
    progress: Math.min((expenseTotal / monthlyBudget) * 100, 100),
    daysInMonth,
    elapsedDays,
    remainingDays,
    dailyAllowance: remainingDays > 0 ? remaining / remainingDays : remaining,
    projectedExpense,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
  };
};
