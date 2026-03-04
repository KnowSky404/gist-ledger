# GistLedger

**GistLedger** 是一个基于 GitHub Gist 的极简个人记账应用。它利用 GitHub Gist 作为免费、私有的云端数据库，实现数据的安全存储与多端同步。

🌐 **核心理念**: Own your data (数据隐私) | Serverless (无后端) | Lightweight (轻量化)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/KnowSky404/gist-ledger)

## 📸 项目预览

<div align="center">
    <img src="./docs/Transaction.PNG" width="32%" alt="Transaction Form" />
    <img src="./docs/HistoryView.PNG" width="32%" alt="History View" />
    <img src="./docs/StatisticsView.PNG" width="32%" alt="Statistics View" />
</div>

## ✨ 功能特性

### 1. 📝 极简记账 (Journal)
*   **快速录入**: 支持收入/支出切换，金额、分类、日期、备注一键录入。
*   **最近记录**: 首页实时展示最近 5 笔交易，方便快速核对。
*   **完全私有**: 数据仅存储在你的 GitHub Gist 中，无第三方服务器读取。

### 2. 📊 统计报表 (Statistics)
*   **双重视图**:
    *   **月度视图**: 聚焦本月收支，展示**当年12个月**的收支变化趋势，辅助判断本月消费水位。
    *   **年度视图**: 聚焦全年收支，展示**近5年**的长期收支变化趋势，掌握宏观财务健康状况。
*   **多维筛选**: 支持按**分类**（可多选）筛选统计数据，例如查看“餐饮”+“交通”的年度支出趋势。
*   **动态图表**: 交互式图表实时响应筛选和日期切换。

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
*   **部署**: Cloudflare Workers / GitHub Pages

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

# 2. 安装依赖 (推荐使用 bun)
bun install

# 3. 启动开发服务器
bun run dev
```

### 部署到 Cloudflare Workers

#### 方式 1: 一键部署

点击文档顶部的 **Deploy to Cloudflare Workers** 按钮，按 Cloudflare 引导完成仓库导入与部署。

#### 方式 2: Wrangler CLI（推荐本仓库维护者使用）

```bash
# 1. 登录 Cloudflare
bunx wrangler login

# 2. 本地预览 Workers 版本
bun run cf:dev

# 3. 发布到 Cloudflare Workers
bun run cf:deploy
```

> 本项目已内置 `wrangler.toml`，使用静态资源托管（`assets.directory = "./dist"`）并启用 SPA 路由回退（`not_found_handling = "single-page-application"`）。

#### 自定义域名迁移（从 Pages 切到 Workers）

1. 先在 `*.workers.dev` 地址验证页面正常。
2. 从 Cloudflare Pages 项目里解绑原自定义域名。
3. 在 Workers 项目中绑定同一个自定义域名。

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
