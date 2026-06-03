<h1 align="center">astock-peg</h1>

<p align="center">
  A 股 PEG 估值分析工具 — 彼得·林奇 PEG 投资法的本地化实践<br>
  Next.js 全栈应用 · AI 自动生成估值报告 · 行业板块 PE 对比 · 零数据库依赖
</p>

<p align="center">
  <b>⚠️ 免责声明：本项目仅供学习研究与技术演示，不构成任何投资建议。投资决策请咨询持牌专业机构。</b>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue"/></a>
</p>

---

## 目录

- [为什么做这个工具](#为什么做这个工具)
- [功能演示](#功能演示)
- [技术架构](#技术架构)
- [数据源](#数据源)
- [快速开始](#快速开始)
- [PEG 计算逻辑](#peg-计算逻辑)
- [项目结构](#项目结构)
- [Donate](#donate)
- [许可证](#许可证)

---

## 为什么做这个工具

PE 只告诉你一只股票"贵不贵"，但不告诉你"贵得值不值"。

**PEG（市盈率相对盈利增长比率）** 是彼得·林奇提出的核心估值指标，用一个公式把"估值"和"成长性"绑在一起：

```
PEG = PE / 盈利增速(%)
```

| PEG 区间 | 评级 | 含义 |
|----------|------|------|
| < 0.5 | 极度低估 | 增速远超估值，估值显著偏低 |
| 0.5 - 1.0 | 低估 | 估值偏低 |
| 1.0 - 1.5 | 合理 | 估值与增速匹配 |
| 1.5 - 2.0 | 偏贵 | 需要更高增速支撑 |
| > 2.0 | 高估 | 估值偏高 |

**问题是**：手动计算 PEG 需要翻财报、查一致预期、算 CAGR、对比同行 —— 每只股票重复一遍非常低效。

**这个工具解决的问题**：输入 6 位股票代码，自动完成数据采集 → PEG 计算 → AI 估值报告生成 → 同行业 PE 对比，全流程 < 30 秒。

---

## 功能演示

### 1. PEG 看板
输入股票代码，实时监控价格、涨跌幅、PE(TTM)、PB、市值。一键发起 AI 分析。

### 2. AI PEG 估值报告
自动采集财务数据 → 送入大模型 → 生成 7 节结构化分析报告（基本面快照、PEG 核心分析、PE 消化时间、盈利质量验证、同行对比、风险提示、综合结论），支持导出 PDF。

### 3. 行业板块 PE 对比
输入任意一只股票 → 自动识别所属行业 → 展示行业市值前 20 名的 PE 分布、板块均值/中位数。

### 4. 新闻资讯
个股新闻 + 市场快讯聚合，辅助判断 PEG 分析中的定性因素。

---

## 技术架构

```
┌───────────────────────────────────────────────────┐
│                   Browser (Next.js)                │
│  Dashboard · AI Analysis · Sector · News          │
├───────────────────────────────────────────────────┤
│               Next.js API Routes                  │
│  /api/quotes · /api/stocks · /api/analysis        │
│  /api/sector · /api/sector/detect · /api/news     │
├───────────────────────────────────────────────────┤
│           Data Layer (Multi-Source)                │
│  腾讯财经 API ──── 实时行情（PE/PB/价格/市值）     │
│  mootdx ────────── 行业检测（F10）+ 财务快照        │
│  直连 HTTP ─────── 研报/新闻/公告/一致预期/财报     │
│   （东财·同花顺·新浪·巨潮，零 akshare，东财已限流） │
├───────────────────────────────────────────────────┤
│              AI Engine (Pluggable)                 │
│  Anthropic Claude / OpenAI GPT / 兼容接口          │
├───────────────────────────────────────────────────┤
│              Storage (JSON Files)                  │
│  portfolio.json · analyses/index.json             │
│         零数据库 · 零外部服务依赖                   │
└───────────────────────────────────────────────────┘
```

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Next.js 16 + React 19 + Tailwind CSS | Turbopack 热更新 |
| 行情数据 | 腾讯财经 HTTP API | 免费、不限频、无需 token |
| 财务/研报/新闻 | 直连 HTTP（东财·同花顺·新浪·巨潮）+ mootdx | Python 脚本采集，零 akshare 依赖 |
| AI 引擎 | Anthropic / OpenAI（用户自备 key） | 可接任何兼容接口 |
| 存储 | JSON 文件 | 无数据库依赖 |

---

## 数据源

| 数据源 | 协议 | 提供数据 | 限制 |
|--------|------|----------|------|
| 腾讯财经 | HTTP (qt.gtimg.cn) | 实时行情、PE、PB、市值、涨跌幅 | 免费，无需认证 |
| mootdx | TCP (7709) | F10 行业归属、同行业个股、财务快照 | 免费，需国内 IP |
| 东财 eastmoney | HTTP | 研报、个股新闻、全球资讯（替代财联社） | 免费，已内置 `em_get` 限流防封 |
| 同花顺 10jqka | HTTP | 机构一致预期 EPS | 免费 |
| 新浪财经 | HTTP | 多期利润表（成长历史） | 免费 |
| 巨潮 cninfo | HTTP | 公司公告全文 | 免费 |

全部数据源**免费 + 无需申请 API Key**（AI 分析除外），且**零 akshare 依赖**（v1.1.0 全量替换为直连 HTTP）。东财系接口有访问频率风控，已统一经 `em_get()` 串行限流防封。

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+（Windows 用户：仓库已自动适配 `python`，无需 `python3`）
- `pip install -r scripts/requirements.txt`（mootdx / requests / pandas / lxml，**已移除 akshare**）

### 安装 & 运行

```bash
git clone https://github.com/simonlin1212/astock-peg.git
cd astock-peg/web

# 配置 AI key（AI 分析功能需要，行情和板块对比不需要）
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY 或 OPENAI_API_KEY

npm install
npm run dev
```

打开 http://localhost:3000

### 不配置 AI Key 也能用

行情看板和板块 PE 对比不需要 AI key，装好 Node.js + Python 依赖就能直接用。AI 分析报告功能需要配置一个大模型 API key。

### 兼容的 AI 提供商

两条接入路径，任选其一：

- **Anthropic 格式**：Claude 官方，或任何兼容 Anthropic Messages API 的中转（配 `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL`）。
- **OpenAI 兼容格式**：未设 `ANTHROPIC_API_KEY` 时自动启用。除 OpenAI 官方外，可通过 `OPENAI_BASE_URL` + `OPENAI_MODEL` 接入任意 OpenAI 兼容供应商——**DeepSeek / 通义 / 智谱 / Kimi / OpenRouter / 本地 Ollama** 等。

DeepSeek 示例（`web/.env`）：

```
OPENAI_API_KEY=sk-你的deepseek-key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

---

## PEG 计算逻辑

```
前瞻 PE = 当前价格 / 一致预期 EPS(2026)
PEG = 前瞻 PE / (净利润 CAGR × 100)
PE 消化年限 = ln(前瞻PE / 30) / ln(1 + CAGR)
```

- **一致预期 EPS**：来自机构研报的一致预期数据
- **CAGR**：近 3 年净利润复合增速
- **消化年限**：假设合理 PE = 30x，计算当前估值自然消化到合理水平需要几年
  - < 2 年 = 成长性强
  - 2-4 年 = 正常
  - \> 4 年 = 需谨慎

---

## 项目结构

```
astock-peg/
├── web/                        Next.js 全栈应用
│   ├── src/app/                页面（首页看板 / AI分析 / 板块对比 / 新闻）
│   ├── src/app/api/            API Routes（行情 / 股票管理 / 分析 / 板块）
│   ├── src/components/         React 组件
│   ├── src/lib/                数据层（portfolio / analysis / tencent-api）
│   ├── src/hooks/              React Hooks
│   ├── portfolio.json          运行时数据（你的自选股列表，gitignore）
│   └── .env.example            API Key 配置模板
├── scripts/                    Python 数据采集脚本
│   ├── collect_stock_data.py   个股财务数据采集
│   ├── collect_news.py         新闻公告采集
│   └── detect_sector.py        行业板块识别
├── analyses/                   AI 分析报告存储（自动生成）
│   └── index.json              分析记录索引
├── LICENSE                     Apache 2.0
└── README.md
```

---

## Donate

如果这个工具帮到了你的投研工作流，欢迎请作者喝杯咖啡 ☕

<p align="center">
  <img src="./assets/wechat-sponsor.jpg" width="240" alt="微信赞赏码">
</p>
<p align="center">
  <a href="https://ifdian.net/a/simonlin">爱发电</a> ·
  <a href="https://buymeacoffee.com/simonlin1212">Buy Me a Coffee</a>
</p>

> 想要什么功能？欢迎开 [Issue](https://github.com/simonlin1212/astock-peg/issues) 提需求，赞助者的 Issue 优先处理。

---

## 许可证

[Apache License 2.0](./LICENSE)

---

**作者：** Simon 林 · 抖音「Simon林」 · 公众号「硅基世纪」

---

<details>
<summary>🇬🇧 English</summary>

# astock-peg

A PEG (Price/Earnings-to-Growth) valuation analysis tool for China A-shares, inspired by Peter Lynch's investment methodology.

## Features

- **PEG Dashboard** — Real-time stock monitoring with PE, PB, market cap, and instant PEG calculation
- **AI Analysis Reports** — Auto-collect financial data → AI generates structured 7-section PEG valuation report → Export as PDF
- **Sector PE Comparison** — Input any ticker → Auto-detect industry → Show top-20 peers by market cap with PE distribution
- **News Feed** — Stock-specific news + market headlines aggregation

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS
- **Data**: Tencent Finance API (real-time quotes) + mootdx (sector detection + financial snapshot) + direct HTTP (Eastmoney / THS / Sina / cninfo for reports, news, announcements, consensus EPS, statements — zero akshare)
- **AI**: Anthropic Claude / OpenAI GPT (bring your own key)
- **Storage**: JSON files (zero database dependency)

## Quick Start

```bash
git clone https://github.com/simonlin1212/astock-peg.git
cd astock-peg/web
cp .env.example .env  # Fill in your AI API key
npm install && npm run dev
```

Prerequisites: Node.js 18+, Python 3.10+ (Windows auto-detected, no `python3` needed), `pip install -r scripts/requirements.txt` (akshare removed in v1.1.0)

## PEG Calculation

```
Forward PE = Current Price / Consensus EPS (2026)
PEG = Forward PE / (Net Profit CAGR × 100)
PE Digestion Years = ln(Forward PE / 30) / ln(1 + CAGR)
```

## Disclaimer

This tool is for educational and research purposes only. It does not constitute investment advice. Please consult licensed professionals for investment decisions.

## License

Apache 2.0

**Author:** Simon Lin · TikTok [@simonlin121212](https://www.tiktok.com/@simonlin121212) · Douyin "Simon林" · WeChat Official Account "硅基世纪"

</details>
