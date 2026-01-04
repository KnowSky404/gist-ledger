// src/services/gist.ts
import { Octokit } from "octokit";

const DATA_FILENAME = "ledger_data.json";

/**
 * Ledger data item structure
 */
export interface LedgerItem {
  id: string;
  date: string;
  amount: number;
  category: string;
  remark?: string;
  type: 'expense' | 'income';
}

export class GistService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // 1. 获取用户信息 (用于验证 Token 是否有效)
  async getUser() {
    const { data } = await this.octokit.request("GET /user");
    return data;
  }

  // 2. 初始化或查找存储数据的 Gist
  async initGist() {
    const { data: gists } = await this.octokit.request("GET /gists");
    const target = gists.find(g => g.description === "GistLedger-Data");

    if (target) return target.id;

    // 不存在则创建
    const { data: newGist } = await this.octokit.request("POST /gists", {
      description: "GistLedger-Data",
      public: false, // 私有
      files: {
        [DATA_FILENAME]: { content: "[]" } // 空数组初始化
      }
    });
    return newGist.id!;
  }

  // 3. 读取数据
  async getData(gistId: string): Promise<LedgerItem[]> {
    // timestamp 只要为了防止浏览器缓存请求
    const { data } = await this.octokit.request(`GET /gists/{gist_id}?t=${Date.now()}`, {
      gist_id: gistId,
    });

    const content = data.files?.[DATA_FILENAME]?.content;
    return content ? JSON.parse(content) : [];
  }

  // 4. 保存数据
  async saveData(gistId: string, items: LedgerItem[]) {
    await this.octokit.request("PATCH /gists/{gist_id}", {
      gist_id: gistId,
      files: {
        [DATA_FILENAME]: {
          content: JSON.stringify(items, null, 2)
        }
      }
    });
  }
}
