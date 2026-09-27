# Nexdo · AI 学习工作台

Nexdo 视觉风格的个人学习工作台：概念学习、学习记录、项目搜集、项目灵感、经验复盘，全部集中在一张 Dashboard 里。

- **打开即用**：无需注册/登录，打开链接直接进入工作台。
- **多端自动同步**：所有设备默认共用同一个「共享工作区」，打开即自动同步同一份云端数据，无需手动交换同步码。
- **改完自动上线**：代码托管在 Git，连 Cloudflare Pages 后，每次 `git push` 自动构建并部署（也可用 `deploy.bat` / `auto-deploy.js` 一键发布）。

## 技术栈

React 18 + Vite · Tailwind CSS 3 · react-router-dom 6 · @supabase/supabase-js · lucide-react · date-fns

## 快速开始（本地开发）

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 生产构建到 dist/
```

> **未配置 Supabase 也能直接跑**：应用进入本地模式，内置种子数据，改动存浏览器 localStorage。配置环境变量并部署后，自动切换到云端同步模式。

## 环境变量

复制 `.env.example` 为 `.env`，填入你的 Supabase 项目信息：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
# 所有设备用同一个值即自动共用同一份云端数据，无需手动交换同步码
VITE_WORKSPACE_ID=nexdo-shared-0001
```

1. 在 [supabase.com](https://supabase.com) 创建项目；
2. 打开 SQL Editor，整体执行 [`supabase/schema.sql`](./supabase/schema.sql)（建表 + updated_at 触发器）。**只需执行一次**；
3. 本地开发可直接填 `.env`；部署到 Cloudflare 时，把这三个 `VITE_` 变量填到 Cloudflare 的**构建设置 → 环境变量**里（不要提交 `.env`）。

> 关于登录：`schema.sql` 已去掉基于账号的 RLS，云端隔离靠「共享工作区 ID（不可枚举的随机串）+ 应用层按 ID 过滤」。请勿把你的部署链接泄露给外人。

## 数据同步策略

- 所有设备默认使用同一个 `VITE_WORKSPACE_ID`，因此打开即自动读写同一份云端数据；
- 写入操作先更新本地状态（乐观更新），**防抖 1.5 秒**后批量 `upsert` 到 Supabase；
- 离线时写入进入 `pending` 队列（localStorage），恢复联网后自动补发；
- 侧边栏底部「云同步」卡片显示状态：🟢 已同步 / 🟡 连接中 / ⚪ 本地模式；
- 所有统计（连续天数、周/月累计等）在前端计算，不额外查询数据库。

## 全局搜索

- 快捷键 `⌘K` / `Ctrl+K` 聚焦搜索框；
- 覆盖概念、学习记录、资源、项目灵感、复盘五个板块；
- `↑` `↓` 选择结果，`Enter` 跳转，目标条目自动滚动并高亮 2 秒。

## 部署（改完自动上线）

完整图文步骤见 [`部署指引.md`](./部署指引.md)。要点：

1. 在 GitHub 新建仓库（如 `nexdo-learning-workbench`），本地 `git remote add origin <仓库地址>`；
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接 Git 仓库，构建命令 `npm run build`、输出目录 `dist`、分支 `main`；
3. 在 Cloudflare **构建设置 → 环境变量** 填入三个 `VITE_` 变量，保存并重新部署；
4. 之后每次改动：
   - 双击 `deploy.bat`（一键提交并推送），或
   - 运行 `node auto-deploy.js`（监听 `src/`，保存即自动发布）；
   - Cloudflare 会在几十秒内自动构建并上线，刷新页面即可看到。

> Vercel 也可行：导入 Git 仓库，Framework 选 **Vite**，构建命令 `npm run build`、输出 `dist`，并配置同样的三个 `VITE_` 环境变量。

## 目录结构

```
src/
├── components/       # Sidebar（含云同步卡）、Header(含全局搜索)、cards、ui 基础组件
├── lib/              # supabase 客户端、DataContext 同步层、种子数据
├── pages/            # 六大页面 + 项目详情/复盘编辑
└── supabase/         # schema.sql 建表脚本
部署指引.md            # 一键发布 / 自动部署图文步骤
deploy.bat            # 一键发布（提交 + 推送）
auto-deploy.js        # 监听 src/，保存即自动发布
```
