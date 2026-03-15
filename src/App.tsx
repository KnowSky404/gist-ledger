import { useCallback, useEffect, useMemo, useState } from 'react';
import { GistService } from './services/gist';
import type { LedgerItem, LedgerSettings, LedgerTemplate } from './services/gist';
import {
  Loader2,
  CheckCircle,
  Wallet,
  LogOut,
  PieChart as PieChartIcon,
  PlusCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Languages,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { TransactionForm } from './components/TransactionForm';
import { StatisticsView } from './components/StatisticsView';
import { HistoryView } from './components/HistoryView';
import { TemplatePanel } from './components/TemplatePanel';
import { TemplateTodoPanel } from './components/TemplateTodoPanel';
import {
  formatAmount,
  formatDisplayDate,
  formatDisplayTime,
  getPreferredLocale,
  localeMeta,
  localizeCategoryLabel,
  messages,
  type Locale,
} from './i18n';
import {
  getMonthBudgetSnapshot,
  getTemplateEntryDate,
  getTemplateExecutionState,
  parseLedgerDate,
} from './utils/ledger';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SyncState = 'idle' | 'saving' | 'saved' | 'error';
type Notice = { type: 'success' | 'error'; text: string } | null;
type ActiveTab = 'journal' | 'stats' | 'history';
type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

const APP_SHELL_CLASS = 'max-w-[1680px] mx-auto px-4 md:px-6 xl:px-8';


const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getPreferredTheme = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const saved = window.localStorage.getItem('gist_theme');
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }

  return 'system';
};

const getSavedTab = (): ActiveTab => {
  if (typeof window === 'undefined') {
    return 'journal';
  }

  const savedTab = window.localStorage.getItem('gist_active_tab');
  return savedTab === 'history' || savedTab === 'stats' || savedTab === 'journal' ? savedTab : 'journal';
};

const removeBudget = (settings: LedgerSettings): LedgerSettings => {
  const nextSettings = { ...settings };
  delete nextSettings.monthlyExpenseBudget;
  return nextSettings;
};

const removeTemplate = (settings: LedgerSettings, templateId: string): LedgerSettings => {
  const currentTemplates = settings.quickTemplates ?? [];
  return {
    ...settings,
    quickTemplates: currentTemplates.filter((template) => template.id !== templateId),
  };
};

const upsertTemplate = (settings: LedgerSettings, nextTemplate: LedgerTemplate): LedgerSettings => {
  const currentTemplates = settings.quickTemplates ?? [];
  const existingIndex = currentTemplates.findIndex((template) => template.id === nextTemplate.id);

  if (existingIndex === -1) {
    return { ...settings, quickTemplates: [nextTemplate, ...currentTemplates] };
  }

  const nextTemplates = [...currentTemplates];
  nextTemplates[existingIndex] = nextTemplate;
  return { ...settings, quickTemplates: nextTemplates };
};

const LanguageSwitcher = ({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) => {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 gap-1 shadow-sm">
      <Languages size={14} className="text-slate-400 dark:text-slate-500 ml-2 mr-1 hidden sm:block" />
      {(['zh', 'en'] as const).map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm transition-colors',
            locale === value
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100',
          )}
        >
          {localeMeta[value].short}
        </button>
      ))}
    </div>
  );
};

const ThemeSwitcher = ({
  preference,
  onChange,
  label,
  systemLabel,
  lightLabel,
  darkLabel,
}: {
  preference: ThemePreference;
  onChange: (value: ThemePreference) => void;
  label: string;
  systemLabel: string;
  lightLabel: string;
  darkLabel: string;
}) => {
  const options = [
    { value: 'system' as const, label: systemLabel, icon: Monitor },
    { value: 'light' as const, label: lightLabel, icon: Sun },
    { value: 'dark' as const, label: darkLabel, icon: Moon },
  ];

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 gap-1 shadow-sm"
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors inline-flex items-center gap-1.5',
              preference === option.value
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100',
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

function App() {
  const [locale, setLocale] = useState<Locale>(getPreferredLocale);
  const [themePreference, setThemePreference] = useState<ThemePreference>(getPreferredTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const theme = themePreference === 'system' ? systemTheme : themePreference;
  const copy = messages[locale];
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [settings, setSettings] = useState<LedgerSettings>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [log, setLog] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(getSavedTab);

  const quickTemplates = useMemo(() => settings.quickTemplates ?? [], [settings.quickTemplates]);

  const recentItems = useMemo(
    () =>
      [...items]
        .sort((left, right) => parseLedgerDate(right.date).getTime() - parseLedgerDate(left.date).getTime())
        .slice(0, 8),
    [items],
  );

  const currentMonthSummary = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return items.reduce(
      (accumulator, item) => {
        const itemDate = parseLedgerDate(item.date);
        if (itemDate.getFullYear() !== currentYear || itemDate.getMonth() !== currentMonth) {
          return accumulator;
        }

        accumulator.count += 1;
        if (item.type === 'income') {
          accumulator.income += item.amount;
        } else {
          accumulator.expense += item.amount;
        }

        return accumulator;
      },
      { income: 0, expense: 0, count: 0 },
    );
  }, [items]);

  const currentBudgetSnapshot = useMemo(
    () => getMonthBudgetSnapshot(items, new Date(), settings.monthlyExpenseBudget),
    [items, settings.monthlyExpenseBudget],
  );

  const templateReminderSummary = useMemo(() => {
    return quickTemplates.reduce(
      (accumulator, template) => {
        const state = getTemplateExecutionState(template, items, new Date());
        if (state.tone === 'due') {
          accumulator.due += 1;
        }
        if (state.tone === 'upcoming') {
          accumulator.upcoming += 1;
        }
        return accumulator;
      },
      { due: 0, upcoming: 0 },
    );
  }, [items, quickTemplates]);

  const markSynced = useCallback(() => {
    setSyncState('saved');
    setLastSyncedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    window.localStorage.setItem('gist_locale', locale);
    document.title = copy.appName;
  }, [copy.appName, locale]);

  useEffect(() => {
    window.localStorage.setItem('gist_theme', themePreference);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light');
    handleChange();

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('gist_token');
    const savedGistId = localStorage.getItem('gist_id');

    if (!savedToken || !savedGistId) {
      return;
    }

    setToken(savedToken);
    setGistId(savedGistId);

    void (async () => {
      setStatus('loading');
      setLog(copy.login.syncing);

      try {
        const service = new GistService(savedToken);
        const ledger = await service.getLedger(savedGistId);
        setItems(ledger.items);
        setSettings(ledger.settings);
        setIsLoggedIn(true);
        setStatus('idle');
        setLog('');
        markSynced();
      } catch (error) {
        console.error(error);
        setStatus('error');
        setLog(copy.login.autoLoginFailed);
        setSyncState('error');
        localStorage.removeItem('gist_token');
        localStorage.removeItem('gist_id');
      }
    })();
  }, [copy.login.autoLoginFailed, copy.login.syncing, markSynced]);

  useEffect(() => {
    localStorage.setItem('gist_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleConnect = async () => {
    if (!token) {
      return;
    }

    setStatus('loading');
    setLog(copy.login.verifyingToken);

    try {
      const service = new GistService(token);
      const user = await service.getUser();
      setLog(copy.login.greeting(user.login));

      const id = await service.initGist();
      setGistId(id);
      setLog(copy.login.connectedDb(id));

      const ledger = await service.getLedger(id);
      setItems(ledger.items);
      setSettings(ledger.settings);
      setLog(copy.login.syncCompleted(ledger.items.length));
      setStatus('success');
      markSynced();

      localStorage.setItem('gist_token', token);
      localStorage.setItem('gist_id', id);

      window.setTimeout(() => {
        setIsLoggedIn(true);
        setStatus('idle');
        setLog('');
      }, 1000);
    } catch (error) {
      console.error(error);
      setLog(copy.login.connectFailed);
      setStatus('error');
      setSyncState('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gist_token');
    localStorage.removeItem('gist_id');
    setIsLoggedIn(false);
    setToken('');
    setGistId('');
    setItems([]);
    setSettings({});
    setLog('');
    setStatus('idle');
    setSyncState('idle');
    setLastSyncedAt('');
    setNotice(null);
    setActiveTab('journal');
  };

  const syncItems = async (nextItems: LedgerItem[], rollbackItems: LedgerItem[], successMessage: string) => {
    setIsSaving(true);
    setSyncState('saving');

    try {
      const service = new GistService(token);
      await service.saveData(gistId, nextItems);
      markSynced();
      setNotice({ type: 'success', text: successMessage });
      return true;
    } catch (error) {
      console.error('Failed to save ledger items', error);
      setItems(rollbackItems);
      setSyncState('error');
      setNotice({ type: 'error', text: copy.toast.syncRollback });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const syncSettings = async (
    nextSettings: LedgerSettings,
    rollbackSettings: LedgerSettings,
    successMessage: string,
    failureMessage: string,
  ) => {
    setIsSaving(true);
    setSyncState('saving');

    try {
      const service = new GistService(token);
      await service.saveSettings(gistId, nextSettings);
      markSynced();
      setNotice({ type: 'success', text: successMessage });
      return true;
    } catch (error) {
      console.error('Failed to save ledger settings', error);
      setSettings(rollbackSettings);
      setSyncState('error');
      setNotice({ type: 'error', text: failureMessage });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTransaction = async (newItem: LedgerItem) => {
    const previousItems = items;
    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    await syncItems(updatedItems, previousItems, copy.toast.newRecordSynced);
  };

  const handleDeleteTransaction = async (id: string) => {
    const previousItems = items;
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    await syncItems(updatedItems, previousItems, copy.toast.recordDeleted);
  };

  const handleUpdateTransaction = async (updatedItem: LedgerItem) => {
    const previousItems = items;
    const updatedItems = items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
    setItems(updatedItems);
    await syncItems(updatedItems, previousItems, copy.toast.recordUpdated);
  };

  const handleBudgetSave = async (monthlyBudget: number | null) => {
    const previousSettings = settings;
    const nextSettings = monthlyBudget && monthlyBudget > 0
      ? { ...settings, monthlyExpenseBudget: monthlyBudget }
      : removeBudget(settings);

    setSettings(nextSettings);
    await syncSettings(
      nextSettings,
      previousSettings,
      monthlyBudget && monthlyBudget > 0 ? copy.toast.budgetSaved : copy.toast.budgetCleared,
      copy.toast.budgetRollback,
    );
  };

  const handleTemplateSave = async (template: LedgerTemplate) => {
    const previousSettings = settings;
    const nextSettings = upsertTemplate(settings, template);
    setSettings(nextSettings);
    await syncSettings(
      nextSettings,
      previousSettings,
      previousSettings.quickTemplates?.some((item) => item.id === template.id) ? copy.toast.templateUpdated : copy.toast.templateCreated,
      copy.toast.templateRollback,
    );
  };

  const handleTemplateDelete = async (templateId: string) => {
    const previousSettings = settings;
    const nextSettings = removeTemplate(settings, templateId);
    setSettings(nextSettings);
    await syncSettings(nextSettings, previousSettings, copy.toast.templateDeleted, copy.toast.templateDeleteRollback);
  };

  const handleApplyTemplate = async (template: LedgerTemplate) => {
    const item: LedgerItem = {
      id: crypto.randomUUID(),
      date: getTemplateEntryDate(template, new Date()),
      amount: template.amount,
      category: template.category,
      remark: template.remark,
      type: template.type,
      templateId: template.id,
    };

    await handleAddTransaction(item);
  };

  const syncIndicator = {
    idle: {
      label: copy.dashboard.statusIdle,
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700',
      icon: null,
    },
    saving: {
      label: copy.dashboard.statusSaving,
      className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 border-amber-200',
      icon: <Loader2 size={14} className="animate-spin" />,
    },
    saved: {
      label: copy.dashboard.statusSaved,
      className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-200',
      icon: <CheckCircle size={14} />,
    },
    error: {
      label: copy.dashboard.statusError,
      className: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-200',
      icon: <AlertCircle size={14} />,
    },
  }[syncState];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-2">
              <ThemeSwitcher
                preference={themePreference}
                onChange={setThemePreference}
                label={copy.common.themeToggle}
                systemLabel={copy.common.themeSystem}
                lightLabel={copy.common.themeLight}
                darkLabel={copy.common.themeDark}
              />
              <LanguageSwitcher locale={locale} onChange={setLocale} />
            </div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mb-4">
              <Wallet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{copy.appName}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 text-center">{copy.appSubtitle}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{copy.login.tokenLabel}</label>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">{copy.login.tokenHint}</p>
            </div>

            <button
              onClick={handleConnect}
              disabled={status === 'loading' || !token}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' && <Loader2 className="animate-spin" size={20} />}
              {status === 'success' ? copy.login.connected : copy.login.connect}
            </button>
          </div>

          {log && (
            <div className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-3 ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {status === 'success' ? <CheckCircle size={18} className="mt-0.5" /> : null}
              <p className="leading-relaxed">{log}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/60 pb-10">
      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 px-4 w-[calc(100%-2rem)] max-w-md">
          <div
            className={cn(
              'rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm text-sm flex items-center gap-2',
              notice.type === 'success' ? 'bg-white dark:bg-slate-900/95 text-emerald-600 dark:text-emerald-300 border-emerald-200' : 'bg-white dark:bg-slate-900/95 text-rose-600 dark:text-rose-300 border-rose-200',
            )}
          >
            {notice.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notice.text}</span>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
        <div className={cn(APP_SHELL_CLASS, 'py-4 flex justify-between items-center gap-4')}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 dark:text-slate-100 truncate">{copy.appName}</h1>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{copy.appTagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeSwitcher
              preference={themePreference}
              onChange={setThemePreference}
              label={copy.common.themeToggle}
              systemLabel={copy.common.themeSystem}
              lightLabel={copy.common.themeLight}
              darkLabel={copy.common.themeDark}
            />
            <LanguageSwitcher locale={locale} onChange={setLocale} />
            <button
              onClick={handleLogout}
              className="text-gray-500 dark:text-slate-400 hover:text-red-500 dark:text-red-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 dark:bg-slate-800"
              title={copy.nav.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className={cn(APP_SHELL_CLASS, 'flex')}>
          <button
            onClick={() => setActiveTab('journal')}
            className={cn('flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2', activeTab === 'journal' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200')}
          >
            <PlusCircle size={16} />
            {copy.nav.journal}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn('flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2', activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200')}
          >
            <Search size={16} />
            {copy.nav.history}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={cn('flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2', activeTab === 'stats' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200')}
          >
            <PieChartIcon size={16} />
            {copy.nav.stats}
          </button>
        </div>
      </header>

      <main className={cn(APP_SHELL_CLASS, 'py-6 xl:py-8 space-y-6')}>
        <section className="grid grid-cols-2 xl:grid-cols-5 gap-3 xl:gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">{copy.dashboard.syncStatus}</div>
            <div className={cn('inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border', syncIndicator.className)}>
              {syncIndicator.icon ?? <RefreshCw size={14} />}
              {syncIndicator.label}
            </div>
            {lastSyncedAt && (
              <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                {copy.dashboard.lastSynced(formatDisplayTime(locale, new Date(lastSyncedAt)))}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">{copy.dashboard.monthEntries}</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentMonthSummary.count}</div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">{copy.dashboard.monthIncome} {formatAmount(locale, currentMonthSummary.income, 0)} · {copy.dashboard.monthExpense} {formatAmount(locale, currentMonthSummary.expense, 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">{copy.dashboard.monthBalance}</div>
            <div className={cn('text-2xl font-bold', currentMonthSummary.income - currentMonthSummary.expense >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-300')}>
              {formatAmount(locale, currentMonthSummary.income - currentMonthSummary.expense)}
            </div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">{copy.dashboard.overviewSubtitle}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">{copy.dashboard.monthBudget}</div>
            <div className={cn('text-2xl font-bold', currentBudgetSnapshot?.overspent ? 'text-rose-600 dark:text-rose-300' : 'text-indigo-600 dark:text-indigo-300')}>
              {currentBudgetSnapshot
                ? currentBudgetSnapshot.overspent > 0
                  ? `-${formatAmount(locale, currentBudgetSnapshot.overspent)}`
                  : formatAmount(locale, currentBudgetSnapshot.remaining)
                : copy.common.dash}
            </div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {currentBudgetSnapshot
                ? currentBudgetSnapshot.overspent > 0
                  ? copy.dashboard.budgetOver(currentBudgetSnapshot.overspent)
                  : copy.dashboard.budgetRemaining(currentBudgetSnapshot.remaining)
                : copy.dashboard.budgetUnset}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm col-span-2 xl:col-span-1">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">{copy.dashboard.fixedTemplates}</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{quickTemplates.length}</div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {templateReminderSummary.due > 0
                ? copy.dashboard.fixedTemplatesPending(templateReminderSummary.due)
                : quickTemplates.length > 0
                  ? copy.dashboard.fixedTemplatesAllClear
                  : copy.dashboard.fixedTemplatesDesc}
            </div>
          </div>
        </section>

        {activeTab === 'journal' && (
          <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.1fr)_460px_420px] items-start">
            <section className="space-y-6">
              <TransactionForm
                key={`add-${locale}`}
                onSubmit={handleAddTransaction}
                isLoading={isSaving}
                existingItems={items}
                monthlyExpenseBudget={settings.monthlyExpenseBudget}
                locale={locale}
              />
            </section>

            <aside className="space-y-6 xl:col-span-1 2xl:col-span-1">
              <TemplatePanel
                templates={quickTemplates}
                items={items}
                isSaving={isSaving}
                onSaveTemplate={handleTemplateSave}
                onDeleteTemplate={handleTemplateDelete}
                onApplyTemplate={handleApplyTemplate}
                locale={locale}
              />
            </aside>

            <section className="space-y-6 xl:col-span-2 2xl:col-span-1">
              <TemplateTodoPanel
                templates={quickTemplates}
                items={items}
                locale={locale}
                isSaving={isSaving}
                onApplyTemplate={handleApplyTemplate}
              />

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{copy.dashboard.overviewTitle}</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{copy.dashboard.overviewSubtitle}</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    {formatDisplayDate(locale, new Date())}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                    <div className="text-emerald-600 dark:text-emerald-300/80 text-xs mb-1">{copy.dashboard.monthIncome}</div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatAmount(locale, currentMonthSummary.income)}</div>
                  </div>
                  <div className="rounded-xl border border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4">
                    <div className="text-rose-600 dark:text-rose-300/80 text-xs mb-1">{copy.dashboard.monthExpense}</div>
                    <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{formatAmount(locale, currentMonthSummary.expense)}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 p-4">
                    <div className="text-indigo-600 dark:text-indigo-300/80 text-xs mb-1">{copy.dashboard.monthBudget}</div>
                    <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                      {settings.monthlyExpenseBudget ? formatAmount(locale, settings.monthlyExpenseBudget) : copy.common.dash}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 gap-4">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{copy.dashboard.recentRecords}</h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:text-indigo-300 transition-colors"
                  >
                    {copy.dashboard.viewAll}
                  </button>
                </div>
                {recentItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    {copy.dashboard.noRecords}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="hidden lg:grid lg:grid-cols-[120px_minmax(0,1fr)_120px] px-4 py-3 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800">
                      <span>{copy.common.date}</span>
                      <span>{copy.common.category} / {copy.common.notes}</span>
                      <span className="text-right">{copy.common.amount}</span>
                    </div>
                    {recentItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 lg:grid-cols-[120px_minmax(0,1fr)_120px] gap-3 lg:gap-4 items-start lg:items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-950/60 transition-colors"
                      >
                        <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 lg:text-slate-400 dark:text-slate-500">{formatDisplayDate(locale, parseLedgerDate(item.date))}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 dark:text-slate-100">{localizeCategoryLabel(item.category, item.type, locale)}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', item.type === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300')}>
                              {item.type === 'expense' ? copy.common.expense : copy.common.income}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{item.remark || copy.common.dash}</div>
                        </div>
                        <div className={cn('text-right font-semibold', item.type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-300')}>
                          {item.type === 'expense' ? '-' : '+'}
                          {formatAmount(locale, item.amount)}
                        </div>
                      </div>
                    ))}
                    {items.length > recentItems.length && (
                      <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800">
                        {copy.dashboard.showingRecent(recentItems.length, items.length)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            items={items}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            isLoading={isSaving}
            monthlyExpenseBudget={settings.monthlyExpenseBudget}
            locale={locale}
          />
        )}

        {activeTab === 'stats' && (
          <StatisticsView
            items={items}
            monthlyExpenseBudget={settings.monthlyExpenseBudget}
            onSaveBudget={handleBudgetSave}
            isSaving={isSaving}
            locale={locale}
          />
        )}
      </main>
    </div>
  );
}

export default App;
