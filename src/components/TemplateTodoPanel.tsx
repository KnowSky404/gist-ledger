import React, { useMemo } from 'react';
import type { LedgerItem, LedgerTemplate } from '../services/gist';
import { CalendarClock, CopyPlus, BellRing } from 'lucide-react';
import { formatAmount, formatDisplayDate, localizeCategoryLabel, messages, type Locale } from '../i18n';
import { getTemplateExecutionState } from '../utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TemplateTodoPanelProps {
  templates: LedgerTemplate[];
  items: LedgerItem[];
  locale: Locale;
  isSaving?: boolean;
  onApplyTemplate: (template: LedgerTemplate) => Promise<void> | void;
}

type TemplateReminder = {
  template: LedgerTemplate;
  tone: 'due' | 'upcoming';
  scheduledDate: Date;
};

export const TemplateTodoPanel: React.FC<TemplateTodoPanelProps> = ({
  templates,
  items,
  locale,
  isSaving,
  onApplyTemplate,
}) => {
  const copy = messages[locale];

  const reminders = useMemo(() => {
    const result: TemplateReminder[] = [];

    templates.forEach((template) => {
      const state = getTemplateExecutionState(template, items, new Date());
      if (state.tone === 'due' || state.tone === 'upcoming') {
        result.push({ template, tone: state.tone, scheduledDate: state.scheduledDate });
      }
    });

    return result.sort((left, right) => {
      if (left.tone !== right.tone) {
        return left.tone === 'due' ? -1 : 1;
      }
      if (left.scheduledDate.getTime() !== right.scheduledDate.getTime()) {
        return left.scheduledDate.getTime() - right.scheduledDate.getTime();
      }
      return left.template.name.localeCompare(right.template.name, locale === 'zh' ? 'zh-CN' : 'en-US');
    });
  }, [items, locale, templates]);

  const dueItems = reminders.filter((item) => item.tone === 'due');
  const upcomingItems = reminders.filter((item) => item.tone === 'upcoming');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
            <BellRing size={18} className="text-amber-500" />
            {copy.template.remindersTitle}
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{copy.template.remindersSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300">
            {copy.template.dueCount(dueItems.length)}
          </span>
          <span className="px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300">
            {copy.template.upcomingCount(upcomingItems.length)}
          </span>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {copy.template.allClear}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.template.dueSection}</div>
            {dueItems.length === 0 ? (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-sm text-slate-400 dark:text-slate-500">{copy.template.allClear}</div>
            ) : (
              dueItems.map(({ template, scheduledDate }) => (
                <div key={`due-${template.id}`} className="rounded-2xl border border-amber-100 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{template.name}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border',
                          template.type === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-900/60' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60',
                        )}>
                          {template.type === 'expense' ? copy.common.expense : copy.common.income}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 break-words">
                        {localizeCategoryLabel(template.category, template.type, locale)}
                        {template.remark ? ` · ${template.remark}` : ''}
                      </div>
                    </div>
                    <div className={cn('shrink-0 text-right text-lg font-bold', template.type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-300')}>
                      {template.type === 'expense' ? '-' : '+'}
                      {formatAmount(locale, template.amount)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/60 rounded-full px-3 py-1.5">
                      <CalendarClock size={14} />
                      {formatDisplayDate(locale, scheduledDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </div>
                    <button
                      onClick={() => onApplyTemplate(template)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <CopyPlus size={16} />
                      {copy.template.quickLog}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.template.upcomingSection}</div>
            {upcomingItems.length === 0 ? (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-sm text-slate-400 dark:text-slate-500">{copy.template.noUpcoming}</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {upcomingItems.map(({ template, scheduledDate }) => (
                  <div key={`upcoming-${template.id}`} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{template.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{localizeCategoryLabel(template.category, template.type, locale)}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 shrink-0">{formatAmount(locale, template.amount)}</div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-full px-3 py-1.5">
                      <CalendarClock size={14} />
                      {formatDisplayDate(locale, scheduledDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
