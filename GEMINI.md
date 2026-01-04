# Project Context: GistLedger

## 1. 项目简介 (Project Overview)
**GistLedger** 是一个极简的、无后端的个人记账应用。
- **核心理念**: 数据隐私（Own your data）、Serverless、轻量化。
- **运行模式**: 纯前端 SPA (Single Page Application)。
- **数据存储**: 利用 GitHub Gist 作为 JSON 数据库 (通过 GitHub API 读写)。
- **托管环境**: Cloudflare Pages。

## 2. 技术栈 (Tech Stack)
请严格遵守以下技术选型，不要引入额外的重量级库：
- **包管理器**: pnpm (v10+)
- **构建工具**: Vite
- **框架**: React (v18+) + TypeScript
- **样式**: Tailwind CSS (PostCSS)
    - *注意*: 项目手动配置了 `postcss.config.js` 和 `tailwind.config.js`，避免使用 CLI 命令初始化。
- **图标库**: lucide-react
- **API 交互**: octokit (GitHub Rest API)
- **工具库**: clsx, tailwind-merge (用于合并样式)

## 3. 核心数据结构 (Data Schema)
数据存储在 Gist 的 `ledger_data.json` 文件中，格式为 JSON 数组：

```typescript
interface LedgerItem {
  id: string;       // UUID
  date: string;     // YYYY-MM-DD
  amount: number;   // 金额
  category: string; // 分类 (e.g., "餐饮", "交通", "购物")
  remark?: string;  // 备注 (可选)
  type: 'expense' | 'income'; // 收支类型
}
