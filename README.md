# GistLedger

**GistLedger** 是一个基于 GitHub Gist 的极简个人记账应用。它利用 GitHub Gist 作为免费、私有的云端数据库，实现数据的安全存储与多端同步。

🌐 **核心理念**: Own your data (数据隐私) | Serverless (无后端) | Lightweight (轻量化)

## ✨ 功能特性

### 1. 📝 极简记账 (Journal)
*   **快速录入**: 支持收入/支出切换，金额、分类、日期、备注一键录入。
*   **最近记录**: 首页实时展示最近 5 笔交易，方便快速核对。
*   **完全私有**: 数据仅存储在你的 GitHub Gist 中，无第三方服务器读取。

### 2. 📊 统计报表 (Statistics)
*   **月度概览**: 清晰展示本月收入、支出及结余。
*   **趋势分析**: 可视化年度收支趋势图，掌握财务健康状况。
*   **历史回溯**: 支持按月切换，查看过往月份的财务数据。

### 3. 🔍 查询管理 (Query)
*   **多维筛选**: 支持按类型（收入/支出）、日期范围、关键词（分类/备注）进行组合查询。
*   **数据管理**: 支持对历史记录进行**修改**或**删除**。
*   **客户端分页**: 即使数据量大也能流畅分页浏览。

## 🛠 技术栈

*   **框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **构建工具**: [Vite](https://vitejs.dev/)
*   **样式**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **图标**: [Lucide React](https://lucide.dev/)
*   **API**: [Octokit](https://github.com/octokit/octokit.js) (GitHub REST API)
*   **部署**: Cloudflare Pages / Vercel / GitHub Pages (纯静态部署)

## 🚀 快速开始

### 前置准备
1.  拥有一个 GitHub 账号。
2.  生成一个 [GitHub Personal Access Token (Classic)](https://github.com/settings/tokens)。
    *   **Scope 权限**: 必须勾选 `gist` 权限。

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/KnowSky404/gist-ledger.git
cd gist-ledger

# 2. 安装依赖 (推荐使用 pnpm)
pnpm install

# 3. 启动开发服务器
pnpm dev
```

### 使用说明

1.  打开应用后，在登录页输入你的 **GitHub Personal Access Token**。
2.  点击 **"连接数据库"**。
    *   如果是首次使用，应用会自动在你的 Gist 中创建一个名为 `GistLedger-Data` 的私有 Gist 和 `ledger_data.json` 文件。
    *   如果已有数据，会自动同步拉取。
3.  开始记账！你的 Token 和 Gist ID 会保存在本地浏览器缓存中，下次访问无需重复输入（除非清除缓存或点击退出）。

## 🔒 数据安全

*   应用**不会**将你的 Token 发送给除 GitHub API 以外的任何服务器。
*   数据存储在你的**私有 Gist** 中，只有拥有该 Token 的人才能访问。
*   建议定期备份 Gist 数据或使用 GitHub 的版本历史功能回滚误操作。

## 📄 License

GNU General Public License v3.0 (GPL-3.0)
