import React, { useMemo, useState } from 'react';
import type { LedgerItem, LedgerTemplate } from '../services/gist';
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  CalendarDays,
  CopyPlus,
  ReceiptText,
  X,
} from 'lucide-react';
import {
  formatAmount,
  formatDisplayDate,
  messages,
  normalizeKnownCategoryInput,
  localizeCategoryLabel,
  type Locale,
} from '../i18n';
import { getCategoryOptions, getTemplateExecutionState } from '../utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TemplatePanelProps {
  templates: LedgerTemplate[];
  items: LedgerItem[];
  isSaving?: boolean;
  onSaveTemplate: (template: LedgerTemplate) => Promise<void> | void;
  onDeleteTemplate: (id: string) => Promise<void> | void;
  onApplyTemplate: (template: LedgerTemplate) => Promise<void> | void;
  locale: Locale;
}

type TemplateDraft = {
  id?: string;
  name: string;
  type: LedgerTemplate['type'];
  category: string;
  amount: string;
  remark: string;
  dayOfMonth: string;
};

const buildEmptyDraft = (locale: Locale): TemplateDraft => ({
  name: '',
  type: 'expense',
  category: getCategoryOptions([], 'expense', locale)[0],
  amount: '',
  remark: '',
  dayOfMonth: '',
});

const buildDraftFromTemplate = (template: LedgerTemplate, locale: Locale): TemplateDraft => ({
  id: template.id,
  name: template.name,
  type: template.type,
  category: localizeCategoryLabel(template.category, template.type, locale),
  amount: template.amount.toString(),
  remark: template.remark ?? '',
  dayOfMonth: template.dayOfMonth ? String(template.dayOfMonth) : '',
});

const getTemplateStatus = (template: LedgerTemplate, items: LedgerItem[], locale: Locale) => {
  const copy = messages[locale];
  const state = getTemplateExecutionState(template, items, new Date());

  if (state.tone === 'default') {
    return {
      label: copy.template.generic,
      tone: 'default' as const,
      scheduledText: copy.template.defaultDate(formatDisplayDate(locale, state.scheduledDate, { year: 'numeric', month: '2-digit', day: '2-digit' })),
    };
  }

  if (state.tone === 'done' && template.dayOfMonth) {
    return {
      label: copy.template.recordedThisMonth,
      tone: 'done' as const,
      scheduledText: copy.template.ledgerDay(template.dayOfMonth),
    };
  }

  if (state.tone === 'due') {
    return {
      label: copy.template.dueEntry,
      tone: 'due' as const,
      scheduledText: copy.template.dueDate(formatDisplayDate(locale, state.scheduledDate, { year: 'numeric', month: '2-digit', day: '2-digit' })),
    };
  }

  return {
    label: copy.template.dueThisMonth,
    tone: 'upcoming' as const,
    scheduledText: copy.template.dueDate(formatDisplayDate(locale, state.scheduledDate, { year: 'numeric', month: '2-digit', day: '2-digit' })),
  };
};

export const TemplatePanel: React.FC<TemplatePanelProps> = ({
  templates,
  items,
  isSaving,
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  locale,
}) => {
  const copy = messages[locale];
  const [draft, setDraft] = useState<TemplateDraft | null>(null);

  const sortedTemplates = useMemo(() => {
    const order = { due: 0, upcoming: 1, done: 2, default: 3 } as const;

    return [...templates].sort((left, right) => {
      const leftStatus = getTemplateStatus(left, items, locale);
      const rightStatus = getTemplateStatus(right, items, locale);
      if (order[leftStatus.tone] !== order[rightStatus.tone]) {
        return order[leftStatus.tone] - order[rightStatus.tone];
      }
      if (left.type !== right.type) {
        return left.type === 'expense' ? -1 : 1;
      }
      return left.name.localeCompare(right.name, locale === 'zh' ? 'zh-CN' : 'en-US');
    });
  }, [items, locale, templates]);

  const categoryOptions = useMemo(() => {
    if (!draft) {
      return [];
    }

    return Array.from(new Set([draft.category, ...getCategoryOptions(items, draft.type, locale)])).filter(Boolean);
  }, [draft, items, locale]);

  const templateSummary = useMemo(() => {
    return templates.reduce(
      (accumulator, template) => {
        const status = getTemplateStatus(template, items, locale);
        accumulator.total += 1;
        if (status.tone === 'due') {
          accumulator.due += 1;
        }
        if (status.tone === 'done') {
          accumulator.done += 1;
        }
        return accumulator;
      },
      { total: 0, due: 0, done: 0 },
    );
  }, [items, locale, templates]);

  const handleStartCreate = () => {
    setDraft(buildEmptyDraft(locale));
  };

  const handleEdit = (template: LedgerTemplate) => {
    setDraft(buildDraftFromTemplate(template, locale));
  };

  const handleCancel = () => {
    setDraft(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    const amount = Number(draft.amount);
    const normalizedName = draft.name.trim();
    const normalizedCategory = normalizeKnownCategoryInput(draft.category.trim(), draft.type, locale);
    const normalizedDay = Number(draft.dayOfMonth);

    if (!normalizedName || !normalizedCategory || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const nextTemplate: LedgerTemplate = {
      id: draft.id ?? crypto.randomUUID(),
      name: normalizedName,
      type: draft.type,
      category: normalizedCategory,
      amount: Math.abs(amount),
      remark: draft.remark.trim() || undefined,
      dayOfMonth:
        draft.dayOfMonth && Number.isInteger(normalizedDay) && normalizedDay >= 1 && normalizedDay <= 31
          ? normalizedDay
          : undefined,
    };

    await onSaveTemplate(nextTemplate);
    setDraft(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(copy.template.confirmDelete)) {
      return;
    }

    await onDeleteTemplate(id);
    if (draft?.id === id) {
      setDraft(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
            <ReceiptText size={18} className="text-indigo-500" />
            {copy.template.title}
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{copy.template.subtitle}</p>
        </div>
        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {copy.template.createNew}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
          <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">{copy.template.count}</div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{templateSummary.total}</div>
        </div>
        <div className="rounded-xl border border-amber-100 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-amber-600 dark:text-amber-300/80 text-xs mb-1">{copy.template.due}</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{templateSummary.due}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-emerald-600 dark:text-emerald-300/80 text-xs mb-1">{copy.template.done}</div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{templateSummary.done}</div>
        </div>
      </div>

      {draft && (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{draft.id ? copy.template.editTitle : copy.template.createTitle}</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 hover:bg-white dark:bg-slate-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((previous) => previous ? { ...previous, name: event.target.value } : previous)}
              placeholder={copy.template.namePlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amount}
              onChange={(event) => setDraft((previous) => previous ? { ...previous, amount: event.target.value } : previous)}
              placeholder={copy.template.amountPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDraft((previous) => previous ? {
                  ...previous,
                  type,
                  category: getCategoryOptions(items, type, locale)[0],
                } : previous)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  draft.type === type
                    ? type === 'expense'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300'
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200',
                )}
              >
                {type === 'expense' ? copy.template.expenseTemplate : copy.template.incomeTemplate}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input
                list="template-category-options"
                value={draft.category}
                onChange={(event) => setDraft((previous) => previous ? { ...previous, category: event.target.value } : previous)}
                placeholder={copy.template.categoryPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <datalist id="template-category-options">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="number"
                min="1"
                max="31"
                value={draft.dayOfMonth}
                onChange={(event) => setDraft((previous) => previous ? { ...previous, dayOfMonth: event.target.value } : previous)}
                placeholder={copy.template.schedulePlaceholder}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <input
            type="text"
            value={draft.remark}
            onChange={(event) => setDraft((previous) => previous ? { ...previous, remark: event.target.value } : previous)}
            placeholder={copy.template.notesOptional}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-950/60 transition-colors"
            >
              {copy.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? copy.common.saving : draft.id ? copy.template.saveTemplate : copy.template.createTemplate}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {sortedTemplates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-8 text-center text-sm text-slate-400 dark:text-slate-500">
            {copy.template.empty}
          </div>
        ) : (
          sortedTemplates.map((template) => {
            const status = getTemplateStatus(template, items, locale);

            return (
              <div key={template.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{template.name}</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        template.type === 'expense'
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60',
                      )}>
                        {template.type === 'expense' ? copy.common.expense : copy.common.income}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        status.tone === 'due'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-900/60'
                          : status.tone === 'done'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60'
                            : status.tone === 'upcoming'
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60'
                              : 'bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800',
                      )}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 break-words">
                      {localizeCategoryLabel(template.category, template.type, locale)}
                      {template.remark ? ` · ${template.remark}` : ''}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">{status.scheduledText}</span>
                      {template.dayOfMonth && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                          {copy.template.monthly(template.dayOfMonth)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn('text-right text-lg font-bold shrink-0', template.type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-300')}>
                    {template.type === 'expense' ? '-' : '+'}
                    {formatAmount(locale, template.amount)}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => onApplyTemplate(template)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <CopyPlus size={16} />
                    {copy.template.apply}
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:bg-indigo-950/30 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
