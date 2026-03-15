# GistLedger Agent Notes

## 项目定位
- 英文名：`GistLedger`
- 中文名：`云笺账本`
- 这是一个基于 GitHub Gist 的私有云记账应用，核心方向是：轻量、无后端、数据自持、桌面与移动端响应式可用。

## 当前工作记忆
- 当前仓库已经支持：中英双语、浅色/深色主题、月预算、响应式桌面布局、本地化金额/日期展示与导出。
- 数据当前拆分为：`ledger_data.json`（账目）和 `ledger_settings.json`（预算等设置）。

## 关键约束
- 每一次实际代码或文档变动完成后，都要立即执行一次 `git commit`，不要把多轮改动长期堆在工作区里。
- 如果本轮同时包含“功能改动”和“文档/流程约束改动”，优先拆成两次提交，保持提交历史清晰。
- 任何影响产品能力、工作流、命名或使用方式的改动，都要同步更新 `README.md`。
- 任何影响代理协作方式的改动，都要同步更新 `AGENTS.md` 和 `GEMINI.md`。
- 临时文件如 `tmp*.json` 不要加入版本控制。

## 提交建议
- 提交信息尽量短而明确，推荐使用：`feat:`、`fix:`、`docs:`、`refactor:`、`chore:` 前缀。
- 提交前至少保证本地通过 `bun run lint` 和 `bun run build`。

## 技术栈
- 包管理器：`bun`
- 前端：`React` + `TypeScript` + `Vite`
- 样式：`Tailwind CSS v4`
- 图标：`lucide-react`
- 数据访问：`octokit`
- 部署：`Cloudflare Workers`
