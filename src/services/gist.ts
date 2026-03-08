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
  templateId?: string;
}

export interface LedgerTemplate {
  id: string;
  name: string;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  remark?: string;
  dayOfMonth?: number;
}

export interface LedgerSettings {
  monthlyExpenseBudget?: number;
  quickTemplates?: LedgerTemplate[];
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
    templateId: typeof candidate.templateId === 'string' && candidate.templateId.trim() ? candidate.templateId : undefined,
  };
};

const normalizeTemplate = (value: unknown): LedgerTemplate | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.category !== 'string' ||
    typeof candidate.amount !== 'number' ||
    Number.isNaN(candidate.amount) ||
    candidate.amount <= 0 ||
    !isLedgerType(candidate.type)
  ) {
    return null;
  }

  const template: LedgerTemplate = {
    id: candidate.id,
    name: candidate.name.trim(),
    category: candidate.category.trim(),
    amount: candidate.amount,
    type: candidate.type,
  };

  if (typeof candidate.remark === 'string' && candidate.remark.trim()) {
    template.remark = candidate.remark.trim();
  }

  if (
    typeof candidate.dayOfMonth === 'number' &&
    Number.isInteger(candidate.dayOfMonth) &&
    candidate.dayOfMonth >= 1 &&
    candidate.dayOfMonth <= 31
  ) {
    template.dayOfMonth = candidate.dayOfMonth;
  }

  if (!template.name || !template.category) {
    return null;
  }

  return template;
};

const normalizeItems = (value: unknown): LedgerItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeLedgerItem).filter((item): item is LedgerItem => Boolean(item));
};

const normalizeSettings = (value: unknown): LedgerSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const settings: LedgerSettings = {};

  if (
    typeof candidate.monthlyExpenseBudget === 'number' &&
    !Number.isNaN(candidate.monthlyExpenseBudget) &&
    candidate.monthlyExpenseBudget > 0
  ) {
    settings.monthlyExpenseBudget = candidate.monthlyExpenseBudget;
  }

  if (Array.isArray(candidate.quickTemplates)) {
    settings.quickTemplates = candidate.quickTemplates
      .map(normalizeTemplate)
      .filter((template): template is LedgerTemplate => Boolean(template));
  }

  return settings;
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

    return normalizeItems(data.files?.[DATA_FILENAME]?.content ? JSON.parse(data.files[DATA_FILENAME].content!) as unknown : []);
  }

  async getSettings(gistId: string): Promise<LedgerSettings> {
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    const content = data.files?.[SETTINGS_FILENAME]?.content;
    if (!content) {
      return {};
    }

    return normalizeSettings(JSON.parse(content) as unknown);
  }

  async getLedger(gistId: string): Promise<LedgerPayload> {
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    const itemsContent = data.files?.[DATA_FILENAME]?.content;
    const settingsContent = data.files?.[SETTINGS_FILENAME]?.content;

    return {
      items: normalizeItems(itemsContent ? JSON.parse(itemsContent) as unknown : []),
      settings: normalizeSettings(settingsContent ? JSON.parse(settingsContent) as unknown : {}),
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
    await this.octokit.request('PATCH /gists/{gist_id}', {
      gist_id: gistId,
      files: {
        [SETTINGS_FILENAME]: {
          content: JSON.stringify(settings, null, 2),
        },
      },
    });
  }
}
