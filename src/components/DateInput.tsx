import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatMonthPeriod, messages, type Locale } from '../i18n';
import { formatDateValue, parseLedgerDate } from '../utils/ledger';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  allowClear?: boolean;
  showToday?: boolean;
};

const WEEKDAY_LABELS = {
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

const isSameDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  locale,
  className,
  required,
  disabled,
  min,
  max,
  placeholder,
  allowClear = false,
  showToday = true,
}) => {
  const [useNative, setUseNative] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.matchMedia('(pointer: coarse), (hover: none), (max-width: 767px)').matches;
  });
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseLedgerDate(value) : null;
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const copy = messages[locale];
  const weekStartsOn = locale === 'zh' ? 1 : 0;
  const weekdayLabels = useMemo(() => {
    const base = WEEKDAY_LABELS[locale];
    return [...base.slice(weekStartsOn), ...base.slice(0, weekStartsOn)];
  }, [locale, weekStartsOn]);

  const minDate = useMemo(() => (min ? toStartOfDay(parseLedgerDate(min)) : null), [min]);
  const maxDate = useMemo(() => (max ? toStartOfDay(parseLedgerDate(max)) : null), [max]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse), (hover: none), (max-width: 767px)');
    const handleChange = () => setUseNative(mediaQuery.matches);
    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() - weekStartsOn + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const total = 42;

    return Array.from({ length: total }, (_, index) => {
      if (index < offset) {
        const day = daysInPrevMonth - offset + 1 + index;
        return { date: new Date(year, month - 1, day), label: day, outside: true };
      }

      if (index >= offset + daysInMonth) {
        const day = index - (offset + daysInMonth) + 1;
        return { date: new Date(year, month + 1, day), label: day, outside: true };
      }

      const day = index - offset + 1;
      return { date: new Date(year, month, day), label: day, outside: false };
    });
  }, [viewDate, weekStartsOn]);

  const isDisabledDate = (date: Date) => {
    const normalized = toStartOfDay(date);
    if (minDate && normalized < minDate) {
      return true;
    }
    if (maxDate && normalized > maxDate) {
      return true;
    }
    return false;
  };

  const handleSelectDate = (date: Date) => {
    if (isDisabledDate(date)) {
      return;
    }

    onChange(formatDateValue(date));
    setOpen(false);
  };

  const handleOpen = () => {
    if (disabled) {
      return;
    }
    setViewDate(selectedDate ?? new Date());
    setOpen(true);
  };

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setViewDate(selectedDate ?? new Date());
      }
      return next;
    });
  };

  if (useNative) {
    return (
      <input
        type="date"
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(className, 'date-input')}
      />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        readOnly
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onClick={handleOpen}
        onFocus={handleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleToggle();
          }
        }}
        className={cn(
          className,
          'pr-10 tabular-nums tracking-[0.01em]',
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      />
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors',
          disabled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200',
        )}
        aria-label={copy.common.date}
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-slate-950/80">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              {formatMonthPeriod(locale, viewDate.getFullYear(), viewDate.getMonth() + 1)}
            </div>
            <button
              type="button"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-400 dark:text-slate-500">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
            {calendarDays.map(({ date, label, outside }) => {
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
              const isToday = isSameDay(date, new Date());
              const disabledDate = isDisabledDate(date);

              return (
                <button
                  key={`${date.toISOString()}-${label}`}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  disabled={disabledDate}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                    outside ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200',
                    disabledDate && 'cursor-not-allowed opacity-40',
                    isSelected
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70',
                    isToday && !isSelected && 'border border-indigo-200 text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-300',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {(showToday || allowClear) && (
            <div className="mt-3 flex items-center justify-between gap-2">
              {showToday ? (
                <button
                  type="button"
                  onClick={() => handleSelectDate(new Date())}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300"
                >
                  {copy.form.today}
                </button>
              ) : (
                <span />
              )}
              {allowClear && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/50 dark:hover:text-rose-300',
                    !value && 'opacity-50',
                  )}
                >
                  {copy.history.clear}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
