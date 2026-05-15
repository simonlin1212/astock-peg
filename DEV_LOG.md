# EP-PEG 开发日志 & 交接清单

> 创建日期：2026-05-13
> 目标：PEG 为核心的 A 股估值分析工具

---

## 一、项目由来

Simon 的 V2 交易系统包含完整的逻辑链分析、壁垒评估、三级评分体系、持仓管理等私有策略。EP-PEG 是从 V2 中提取 PEG 估值这一公开投资理念，做成一个可开源分享的独立产品，用于品牌建设和流量获取。

**核心理念**：PEG = PE / 盈利增速(%) — 彼得·林奇的经典估值指标。大部分散户只看 PE，不知道 PEG，这个工具帮他们理解"贵得值不值"。

---

## 二、从 V2 复制了什么、删了什么

### 保留（核心可公开能力）

| 模块 | 文件 | 说明 |
|------|------|------|
| PEG 计算引擎 | `api/quotes/route.ts` | 前瞻PE、PEG、PE消化年限公式 |
| 腾讯行情 API | `lib/portfolio.ts` + `api/sector/route.ts` | `qt.gtimg.cn` 实时行情，GBK 解码 |
| 自选股管理 | `lib/portfolio.ts` + `api/stocks/` | JSON 文件持久化，零数据库 |
| AI 分析报告 | `lib/analysis.ts` + `api/analysis/` | 生成 PEG 分析报告 + PDF 导出 |
| 新闻采集 | `api/news/route.ts` + `scripts/` | Python 脚本 + akshare |
| NEON QUANT 主题 | `globals.css` | 40 个 CSS 变量，暗色主题 |
| 数据可视化表格 | `WatchlistTable.tsx` + `sector/page.tsx` | 带颜色标注的数据表 |

### 删除（私有策略内容）

| V2 模块 | 删除原因 |
|---------|---------|
| 逻辑链 (`catalyst-chains/`) | 核心投资策略，不公开 |
| 壁垒分析 (`moatType`, `highlight`) | 私有评估框架 |
| 三级评分体系 | 专有板块/细分/个股评分方法 |
| 持仓管理 (`HoldingsSnapshot`) | 个人交易信息 |
| 板块轮动 (`SectorMatrix`, `SectorScore`) | 私有轮动决策逻辑 |
| 系统状态 (`SystemStatus`) | V2 仪表盘组件 |
| 资金流向 (`CapitalFlow`) | V2 专属面板 |
| 近期研报 (`RecentResearch`) | V2 专属面板 |
| 今日操作 (`TodaysActions`) | V2 专属面板 |
| 同步脚本 (`sync_portfolio.py`) | V2 自动同步逻辑 |
| `stock-config.ts` | 硬编码的私有股票池 |

### 改造（公开 + 重写）

| 改动 | 具体内容 |
|------|---------|
| AI 引擎 | Claude CLI 子进程 → API 调用（Anthropic / OpenAI 双支持） |
| 分析 Prompt | 7 节 PEG 教育导向报告（基本面快照 → PEG 核心分析 → PE 消化 → 盈利质量 → 同行对比 → 风险 → 结论） |
| 板块页面 | 全新开发。4 个预设板块 + 自定义输入 → 市值前 20 名 PE 分布 + 板块统计 |
| 品牌 | "交易终端" → "EP-PEG"，导航重组为 PEG 看板 / 个股分析 / 板块 PEG / 新闻资讯 |
| 设置入口 | 齿轮图标 → GitHub 链接（SVG 内联，lucide-react 1.x 无 Github 图标） |

---

## 三、关键技术决策记录

### 3.1 AI 引擎改造

**V2 做法**：`child_process.execFile('claude', [...])` 调用本地安装的 Claude CLI。
**EP-PEG 做法**：直接 HTTP 调用 Anthropic API / OpenAI API。

```typescript
// lib/analysis.ts 核心逻辑
if (process.env.ANTHROPIC_API_KEY) {
  report = await callAnthropicApi(userMessage);  // claude-sonnet-4-20250514
} else if (process.env.OPENAI_API_KEY) {
  report = await callOpenAiApi(userMessage);      // gpt-4o
} else {
  throw new Error("未配置 API Key");
}
```

- 用户在 `.env` 填自己的 key，EP-PEG 不需要 Claude CLI 安装
- Anthropic SDK 用原生 `fetch`（不引入 `@anthropic-ai/sdk`），减少依赖
- 分析报告异步生成：POST `/api/analysis` 火并返回 id，前端轮询 `/api/analysis/[id]`

### 3.2 板块 PEG 对比（新功能）

V2 没有这个功能。EP-PEG 新建了：

- **前端**：`sector/page.tsx` — 4 个预设板块按钮（人形机器人 / AI 算力 / 新能源 / 创新药），每个按钮绑定 20 个 ticker
- **后端**：`api/sector/route.ts` — 接收 `?tickers=688017,300308,...`，批量调腾讯 API，按市值排序取前 20，算板块平均 PE / 中位 PE

预设板块的 ticker 列表硬编码在前端（`PRESET_SECTORS` 常量），方便用户看到源码后自行修改。

### 3.3 PEG 计算公式

```
前瞻 PE = 当前价格 / 一致预期 EPS(2026)
PEG    = 前瞻 PE / (净利润 CAGR × 100)
消化年限 = ln(前瞻PE / 30) / ln(1 + CAGR)
```

- 一致预期 EPS 和 CAGR 由用户添加股票时手动输入（`consensusEps26` / `cagr` 字段在 `portfolio.json`）
- 消化年限假设合理 PE = 30x，计算当前 PE 自然增长消化到 30x 需要几年
- PEG 评级：< 0.5 极度低估 / 0.5-1 低估 / 1-1.5 合理 / 1.5-2 偏贵 / > 2 高估

### 3.4 数据持久化

零数据库设计：
- `web/portfolio.json` — 自选股列表（ticker → config 映射）
- `analyses/index.json` — 分析记录索引
- `analyses/<id>/report.md` — 每份 AI 报告的 markdown
- `analyses/<id>/raw.json` — 分析用的原始数据

### 3.5 腾讯财经 API

```
GET http://qt.gtimg.cn/q=sh688017,sz300308
```

- GBK 编码响应，用 `iconv-lite` 解码
- `~` 分隔的 88 个字段，关键索引：1=名称, 3=现价, 32=涨跌%, 38=PE动, 39=PE(TTM), 44=总市值(亿), 46=PB
- 不封 IP、不限频、无需 token — 最稳定的 A 股数据源

---

## 四、已知问题 & 待改进

### 4.1 功能层面

| 优先级 | 问题 | 说明 |
|--------|------|------|
| **P0** | 添加股票时需手动输入 EPS 和 CAGR | 当前 `consensusEps26` 和 `cagr` 靠用户填，应该自动从同花顺/东财拉一致预期 |
| **P1** | 板块对比只有 PE，没有 PEG | 板块页面只展示 PE 分布，缺少 PEG 列（因为批量拉 EPS 预期成本高） |
| **P1** | 新闻采集依赖 Python 脚本 | `/api/news` 调 `python3 scripts/collect_news.py`，需要用户装 Python + akshare |
| **P2** | 分析报告没有图表 | 纯 markdown 文本报告，可以加 recharts 可视化 |
| **P2** | GitHub 链接是占位符 | TopNav 里的 GitHub 链接指向 `https://github.com`，需要改成真实 repo URL |
| **P3** | 移动端适配 | 当前只适配桌面端（max-width: 1440px），移动端需要响应式改造 |

### 4.2 技术层面

| 问题 | 说明 |
|------|------|
| html2pdf.js 类型 | `pagebreak` 属性不在 `@types/html2pdf.js` 里，用 `as Record<string, unknown>` 绕过了 |
| lucide-react 1.x 无 Github 图标 | 用内联 SVG 替代，如果将来需要更多图标可能要降级或换库 |
| Next.js 16 Suspense 要求 | `useSearchParams()` 必须包在 `<Suspense>` 里，analysis 页面已修复 |
| Python 脚本无 requirements.txt | `scripts/` 目录缺 `requirements.txt`（需要 akshare, mootdx） |

---

## 五、文件清单 & 各文件职责

```
EP-PEG/
├── README.md                    项目说明（PEG 解释 + Quick Start + 技术栈）
├── DEV_LOG.md                   本文件（开发日志 + 交接清单）
├── .gitignore                   排除 node_modules, .next, .env, analyses/*
│
├── analyses/
│   └── index.json               AI 分析记录索引（空数组起始）
│
├── scripts/
│   ├── collect_stock_data.py    股票数据采集（mootdx + akshare）
│   └── collect_news.py          新闻采集（akshare 个股新闻 + 财联社 + 东财）
│
└── web/
    ├── .env.example             API key 模板（ANTHROPIC_API_KEY / OPENAI_API_KEY）
    ├── package.json             依赖清单（Next.js 16 + React 19 + iconv-lite + recharts）
    ├── tsconfig.json            TypeScript 配置（路径别名 @/ → src/）
    ├── portfolio.json           自选股数据（JSON 文件持久化）
    │
    └── src/
        ├── app/
        │   ├── globals.css      NEON QUANT 暗色主题（40 CSS 变量 + 排版系统）
        │   ├── layout.tsx       根布局（metadata + TopNav + main）
        │   ├── page.tsx         首页：PEG 看板 + 颜色图例 + LiveDashboard
        │   │
        │   ├── analysis/
        │   │   └── page.tsx     个股分析：输入代码 → AI 报告 → PDF 导出 → 历史记录
        │   ├── sector/
        │   │   └── page.tsx     板块对比：4 预设板块 + 自定义 → PE 分布表 + 统计卡片
        │   ├── news/
        │   │   └── page.tsx     新闻：双栏（个股新闻 + 市场快讯）
        │   │
        │   └── api/
        │       ├── quotes/route.ts       行情 API（腾讯 → PEG 计算 → 返回给看板）
        │       ├── stocks/route.ts       自选股 CRUD（GET 列表 / POST 添加）
        │       ├── stocks/[ticker]/route.ts  单股操作（PATCH 更新 / DELETE 删除）
        │       ├── sector/route.ts       板块批量查询（腾讯 API → 前 20 + 统计）
        │       ├── analysis/route.ts     分析任务提交（POST → 异步 AI 生成）
        │       ├── analysis/[id]/route.ts 分析状态查询 + 报告读取
        │       └── news/route.ts         新闻采集（调 Python 脚本）
        │
        ├── components/
        │   ├── layout/TopNav.tsx          顶栏导航（EP-PEG 品牌 + 4 页面 + GitHub 链接）
        │   └── dashboard/
        │       ├── LiveDashboard.tsx      看板容器（useQuotes hook + 添加/删除/分析操作）
        │       └── WatchlistTable.tsx     自选股表格（11 列 + PEG 颜色标注 + 操作按钮）
        │
        ├── hooks/
        │   └── useQuotes.ts              行情轮询 hook（30s 间隔拉 /api/quotes）
        │
        ├── lib/
        │   ├── portfolio.ts              portfolio.json 读写 + 腾讯单股查询
        │   ├── analysis.ts               AI 分析引擎（双 API + prompt + 文件管理）
        │   └── utils.ts                  cn() 工具函数（clsx + tailwind-merge）
        │
        └── data/
            └── mock.ts                   类型定义（SectorKey, WatchlistStock 等）
```

---

## 六、交接清单

### 接手后第一步：环境准备

```bash
cd EP-PEG/web
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY 或 OPENAI_API_KEY

npm install    # 已有 node_modules 可跳过
npm run dev    # 启动开发服务器 → http://localhost:3000
```

Python 环境（新闻采集功能需要）：
```bash
pip install akshare mootdx
```

### 接手后可以立即做的事

1. **初始化 Git 仓库**
   ```bash
   cd EP-PEG
   git init
   git add .
   git commit -m "feat: EP-PEG v1.0 — A股 PEG 估值分析工具"
   ```

2. **更新 GitHub 链接**
   - 文件：`web/src/components/layout/TopNav.tsx`
   - 搜索 `https://github.com` → 替换为真实 repo URL

3. **添加 Python requirements.txt**
   ```
   # scripts/requirements.txt
   akshare>=1.12.0
   mootdx>=0.7.0
   ```

4. **自动拉取一致预期 EPS（P0 改进）**
   - 当前：用户添加股票时手动输入 `consensusEps26` 和 `cagr`
   - 改进：调 `akshare.stock_profit_forecast_ths(symbol, indicator="预测年报每股收益")` 自动填充
   - 改动文件：`api/stocks/route.ts` 的 POST handler + 可能新增 Python 脚本

### 关键 API 端点速查

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/quotes` | GET | 返回自选股实时行情 + PEG 计算结果 |
| `/api/stocks` | GET/POST | 自选股列表 / 添加新股票 |
| `/api/stocks/[ticker]` | PATCH/DELETE | 更新 / 删除单个股票 |
| `/api/sector?tickers=xxx` | GET | 板块批量查询（逗号分隔的6位代码） |
| `/api/analysis` | GET/POST | 分析历史 / 提交新分析任务 |
| `/api/analysis/[id]` | GET | 查询分析状态和报告内容 |
| `/api/news` | GET | 新闻采集（调 Python 脚本） |

### 数据流

```
用户添加股票 → POST /api/stocks → 写入 portfolio.json
                                         ↓
看板页面加载 → GET /api/quotes → 读 portfolio.json + 调腾讯 API → 计算 PEG → 返回前端
                                         ↓
用户点"分析" → POST /api/analysis → 采集数据 → 调 AI API → 写入 analyses/<id>/
                                         ↓
前端轮询    → GET /api/analysis/[id] → 返回状态/报告 → 渲染 Markdown → 可导出 PDF
```

### 板块预设数据

4 个预设板块的 ticker 列表在 `web/src/app/sector/page.tsx` 的 `PRESET_SECTORS` 常量中，每个板块 20 只股票，如需更新直接改这个数组。

### 主题系统

NEON QUANT 暗色主题在 `globals.css` 里，所有颜色通过 CSS 变量控制。如果要加浅色模式，新增一组 `:root[data-theme="light"]` 变量覆盖即可。

---

## 七、V2 的哪些代码绝对不能带进 EP-PEG

这是安全红线，确保开源不泄露私有策略：

- [ ] `catalyst-chains/` 或任何逻辑链相关代码
- [ ] `moatType` / `highlight` 字段或任何壁垒评估逻辑
- [ ] `SectorScore` / `SCORING_FRAMEWORK` / 三级评分体系
- [ ] `HoldingsSnapshot` / 持仓数据 / `holdings` 字段
- [ ] `SectorMatrix` / 板块轮动决策逻辑
- [ ] `SystemStatus` / `TodaysActions` / `CapitalFlow`
- [ ] `sync_portfolio.py` / 自动同步脚本
- [ ] `stock-config.ts`（硬编码的私有股票池）
- [ ] `STRATEGY.md` / `DASHBOARD.md` / 任何决策系统文档
- [ ] 任何包含具体持仓 / 买卖点 / 个人交易记录的文件

**验证方法**：在 EP-PEG 目录下 `grep -r "moat\|catalyst\|holding\|scoring\|轮动\|逻辑链" --include="*.ts" --include="*.tsx" --include="*.json"` 应该零结果（已于 2026-05-14 再次验证通过）。

> **2026-05-13 补充清理**：初始复制后发现 `quotes/route.ts`、`useQuotes.ts`、`stocks/[ticker]/route.ts`、`portfolio.ts`、`portfolio.json` 中残留 holdings 相关代码（LiveHolding 接口、holdingsData 计算、HoldingConfig 类型、holdings 数组字段）。已全部移除，build 验证通过。

---

## 八、2026-05-14 架构审查 & 全量修复

对整个项目做了一次架构级审查，按严重程度分 4 批修复了 26 个问题。所有修复后 `npm run build` 通过，V2 策略泄露扫描零结果。

### 8.1 第一批：阻塞开源（让 clone 后能正常跑）

| 编号 | 问题 | 修复 |
|------|------|------|
| C1 | `portfolio.json` 未被 gitignore，用户数据会提交到仓库 | 根 `.gitignore` 加 `web/portfolio.json`，新增 `portfolio.example.json` 模板 |
| H1 | `btn` CSS 类从未定义，5 处按钮无样式 | `globals.css` 新增 `.btn` 基础样式（border + hover + disabled） |
| H2 | Tailwind 动态类名 `text-${align}` 被 tree-shake | 新建 `components/ui/Table.tsx`，用 map 对象映射对齐类 |
| H3 | `Th`/`Td` 在 3 个文件重复定义 | 提取到共享 `components/ui/Table.tsx`，3 个文件改为 import |
| H5 | `readPortfolio()` 文件不存在时 500 崩溃 | 加 `existsSync` 检查，不存在时自动创建默认空文件 |
| M8 | GitHub 链接指向 `https://github.com`（空占位符） | 改为 `https://github.com/YOUR_USERNAME/EP-PEG`，开源前替换 |
| L2 | 3 个未使用依赖（lucide-react, recharts, class-variance-authority） | 从 `package.json` 移除 |
| M9 | `web/README.md` 是 create-next-app 默认模板 | 删除 |
| M11 | `public/` 5 个 Next.js 默认 SVG 未引用 | 删除 file.svg, globe.svg, next.svg, vercel.svg, window.svg |
| L6 | README Credits 链接为空 | 改为 `YOUR_USERNAME` 占位符 |

### 8.2 第二批：代码质量提升

| 编号 | 问题 | 修复 |
|------|------|------|
| C3 | `analysis.ts` 中 `require("child_process")` ESM/CJS 混用 | 改为顶部 `import { execFile } from "child_process"` |
| C4 | AI prompt 无大小限制，可能 token 爆炸 | 加 `MAX_RAW_DATA_CHARS = 30_000` 截断 |
| H4 | AI API 返回值无空值检查 | Anthropic/OpenAI 两个函数都加 `typeof text !== "string"` 校验 |
| L4 | AI prompt 中包含服务器绝对路径 | 从 `buildPegAnalysisPrompt` 移除 `rawDataPath` 参数 |
| M5 | 腾讯 API 字段索引在 3 个文件各自定义 | 新建 `lib/tencent-api.ts` 统一 TF 常量 + `fetchTencentQuotes()` + `detectMarket()`，3 个消费者改为 import |
| M2/M3 | `SectorStock` 和 `AnalysisRecord` 接口各重复定义 2 次 | 新建 `lib/types.ts` 统一定义，消费者改为 import |
| M7 | `mock.ts` 文件名误导（实际是生产类型+常量） | 重命名为 `data/constants.ts`，删除未使用的 `watchlist` 空数组导出 |
| L1 | `SECTOR_LABELS` 颜色混用 CSS 变量和硬编码 hex | 全部改为 CSS 变量引用 |

### 8.3 第三批：健壮性

| 编号 | 问题 | 修复 |
|------|------|------|
| C2 | 文件写入无锁，并发时数据丢失 | `portfolio.ts` 和 `analysis.ts` 的 write 函数改为 write-tmp-then-rename 原子写入 |
| H6 | PATCH 接口用 `as Record<string, unknown>` 不安全 | 改为显式字段展开 + 类型检查（`typeof body.name === "string"`） |
| H8 | 新闻 API 同步阻塞 60 秒，云平台会超时 | 添加 `export const maxDuration = 60` 兼容 Vercel |
| M1 | `analysis/page.tsx` 两处空 `catch {}` 吞错误 | 改为 `catch (e) { console.error(...) }` |
| L5 | `news/page.tsx` `getTime` 函数中 "新闻内容" 误入时间候选字段 | 从候选列表移除 |
| H7 | Python 脚本缺 `requirements.txt` | 新增 `scripts/requirements.txt`（akshare + mootdx） |

### 8.4 第四批：锦上添花

| 编号 | 问题 | 修复 |
|------|------|------|
| M6 | 板块预设 80 个 ticker 硬编码在组件里 | 提取到 `data/sectors.ts` 配置文件 |
| L3 | A 股工具用 `en-US` locale 格式化数字 | `lib/utils.ts` 改为 `zh-CN` |

### 8.5 新增文件清单

```
web/src/components/ui/Table.tsx      共享 Th/Td 表格组件（解决 H2 动态类名 + H3 重复定义）
web/src/lib/tencent-api.ts           统一腾讯财经 API 层（TF 常量 + fetchTencentQuotes）
web/src/lib/types.ts                 共享类型（SectorStock, AnalysisRecord）
web/src/data/constants.ts            原 mock.ts 重命名（SectorKey, WatchlistStock, SECTOR_LABELS）
web/src/data/sectors.ts              板块预设配置（4 个板块 × 20 只 ticker）
web/portfolio.example.json           自选股模板文件（portfolio.json 的示例）
scripts/requirements.txt             Python 依赖声明
```

### 8.6 删除文件清单

```
web/src/data/mock.ts                 → 重命名为 constants.ts
web/README.md                        create-next-app 默认模板（冗余）
web/public/file.svg                  未使用的脚手架资源
web/public/globe.svg                 同上
web/public/next.svg                  同上
web/public/vercel.svg                同上
web/public/window.svg                同上
```

### 8.7 开源前 TODO

- [ ] 替换 `YOUR_USERNAME`：`TopNav.tsx` 和 `README.md` 中的 GitHub 链接
- [ ] `git init` + 首次提交
- [ ] 创建 GitHub repo 并 push
