import { Octokit } from 'octokit';

const DATA_FILENAME = 'ledger_data.json';
const SETTINGS_FILENAME = 'ledger_settings.json';

export interface LedgerItem {
  id: string;
  date: string;
  amount: number;
  category: string;
  remark?: string;
  type: 'expense' | 'income';
}

export interface LedgerSettings {
  monthlyExpenseBudget?: number;
}

export interface LedgerPayload {
  items: LedgerItem[];
  settings: LedgerSettings;
}

const isLedgerType = (value: unknown): value is LedgerItem['type'] => value === 'expense' || value === 'income';

const normalizeLedgerItem = (value: unknown): LedgerItem | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.category !== 'string' ||
    typeof candidate.amount !== 'number' ||
    Number.isNaN(candidate.amount) ||
    candidate.amount <= 0 ||
    !isLedgerType(candidate.type)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    date: candidate.date,
    category: candidate.category.trim(),
    amount: candidate.amount,
    type: candidate.type,
    remark: typeof candidate.remark === 'string' && candidate.remark.trim() ? candidate.remark.trim() : undefined,
  };
};

const normalizeItems = (value: unknown): LedgerItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeLedgerItem).filter((item): item is LedgerItem => Boolean(item));
};

const parseItemsContent = (content?: string): LedgerItem[] => {
  if (!content) {
    return [];
  }

  try {
    return normalizeItems(JSON.parse(content) as unknown);
  } catch {
    return [];
  }
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isValidMonthlyBudget = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && value > 0;

const normalizeSettings = (value: unknown): LedgerSettings => {
  if (!isPlainRecord(value)) {
    return {};
  }

  const settings: LedgerSettings = {};

  if (isValidMonthlyBudget(value.monthlyExpenseBudget)) {
    settings.monthlyExpenseBudget = value.monthlyExpenseBudget;
  }

  return settings;
};

const needsSettingsCleanup = (value: unknown): boolean => {
  if (!isPlainRecord(value)) {
    return true;
  }

  if (Object.keys(value).some((key) => key !== 'monthlyExpenseBudget')) {
    return true;
  }

  if ('monthlyExpenseBudget' in value && !isValidMonthlyBudget(value.monthlyExpenseBudget)) {
    return true;
  }

  return false;
};

const parseSettingsContent = (content?: string): { settings: LedgerSettings; needsCleanup: boolean } => {
  if (!content) {
    return { settings: {}, needsCleanup: false };
  }

  try {
    const raw = JSON.parse(content) as unknown;
    return { settings: normalizeSettings(raw), needsCleanup: needsSettingsCleanup(raw) };
  } catch {
    return { settings: {}, needsCleanup: true };
  }
};

export class GistService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getUser() {
    const { data } = await this.octokit.request('GET /user');
    return data;
  }

  async initGist() {
    const { data: gists } = await this.octokit.request('GET /gists');
    const target = gists.find((gist) => gist.description === 'GistLedger-Data');

    if (target) {
      return target.id;
    }

    const { data: newGist } = await this.octokit.request('POST /gists', {
      description: 'GistLedger-Data',
      public: false,
      files: {
        [DATA_FILENAME]: { content: '[]' },
        [SETTINGS_FILENAME]: { content: '{}' },
      },
    });
    return newGist.id!;
  }

  async getData(gistId: string): Promise<LedgerItem[]> {
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    return parseItemsContent(data.files?.[DATA_FILENAME]?.content);
  }

  async getSettings(gistId: string): Promise<LedgerSettings> {
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    const { settings, needsCleanup } = parseSettingsContent(data.files?.[SETTINGS_FILENAME]?.content);
    if (needsCleanup) {
      try {
        await this.saveSettings(gistId, settings);
      } catch (error) {
        console.warn('Failed to clean up ledger settings', error);
      }
    }

    return settings;
  }

  async getLedger(gistId: string): Promise<LedgerPayload> {
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    const items = parseItemsContent(data.files?.[DATA_FILENAME]?.content);
    const { settings, needsCleanup } = parseSettingsContent(data.files?.[SETTINGS_FILENAME]?.content);

    if (needsCleanup) {
      try {
        await this.saveSettings(gistId, settings);
      } catch (error) {
        console.warn('Failed to clean up ledger settings', error);
      }
    }

    return {
      items,
      settings,
    };
  }

  async saveData(gistId: string, items: LedgerItem[]) {
    await this.octokit.request('PATCH /gists/{gist_id}', {
      gist_id: gistId,
      files: {
        [DATA_FILENAME]: {
          content: JSON.stringify(items, null, 2),
        },
      },
    });
  }

  async saveSettings(gistId: string, settings: LedgerSettings) {
    const normalizedSettings = normalizeSettings(settings);
    await this.octokit.request('PATCH /gists/{gist_id}', {
      gist_id: gistId,
      files: {
        [SETTINGS_FILENAME]: {
          content: JSON.stringify(normalizedSettings, null, 2),
        },
      },
    });
  }
}
