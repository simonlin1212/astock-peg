# Changelog

## v1.1.1 (2026-06-04)

### Added

- **支持任意 OpenAI 兼容供应商做 AI 分析引擎（#5，DeepSeek/Qwen/GLM/Kimi/OpenRouter/Ollama）**：
  此前 OpenAI 路径写死 `https://api.openai.com` + `gpt-4o`，无法接 DeepSeek。现在 `callOpenAiApi`
  支持 `OPENAI_BASE_URL` 与 `OPENAI_MODEL` 覆盖（与 Anthropic 路径的 `ANTHROPIC_BASE_URL/MODEL`
  一致）。DeepSeek 示例（`.env`）：
  ```
  OPENAI_API_KEY=sk-your-deepseek-key
  OPENAI_BASE_URL=https://api.deepseek.com
  OPENAI_MODEL=deepseek-chat
  ```
  （未设 `ANTHROPIC_API_KEY` 时即走 OpenAI 兼容路径。）

### Fixed

- **`detect_sector.py` 解析报错 / 获取不到数据（#4，感谢 @xiaogangqq123 反馈）**：行业检测脚本对
  mootdx `F10(name="category")` 的返回做了多处健壮性加固，避免在格式差异 / 无效代码时崩溃产生
  非 JSON 输出（崩溃会让 Web 端 `JSON.parse` 失败、报「解析行业数据失败」）：
  - F10 调用包 `try/except`，网络 / TCP 出错时返回 `{"error", "industry":"", "tickers":[]}` 合法 JSON；
  - 校验返回值为 dict（无效代码 / 指数时 F10 会返回结构完全不同的 dict，非 dict 也安全降级）；
  - **行业类别分隔符容错**：不同 mootdx 版本 / 数据里可能是全角 `｜`、半角 `|`、竖线 `│` 或冒号，
    旧代码只认全角 `｜`、匹配不到就空 → 改为字符集 `[｜|│:：]`；
  - **同行业个股段标题容错**：`【2.同行业个股】` 编号格式微变（`2.` / `2．` / `2、` / 空白）也能解析。
  - 实测：600519（白酒，21 只）、000001（银行，9 只）、000858（白酒）行业 + 同行个股解析正常；
    无效代码 999999 安全返回空而非崩溃。

### Notes

- 纯 `detect_sector.py` 健壮性加固，Web 端 `route.ts`（空结果 404 / 异常 500）逻辑无需改动。
- 未能在本地复现报告者的确切报错（mootdx 在我环境正常出数），本次为针对最可能根因
  （返回格式差异 + 崩溃产生非 JSON）的防御性修复。

## v1.1.0 (2026-05-30)

### Fixed

- **Windows 执行报错（#3）**：Next.js 4 处 API 路由硬编码 `python3` 调用脚本，
  而 Windows 通常只有 `python` → 全部脚本调用 spawn 失败（"Command failed: python3 ..."）。
  新增 `getPythonBin()`（Windows→`python`，其余→`python3`，可用 `PYTHON_BIN` 覆盖），
  4 处统一改用，Windows 开箱即用。

### Changed（依赖变更）

- **全量移除 akshare 依赖**：6 个 akshare 接口全部替换为直连 HTTP（移植自姊妹项目
  a-stock-data，已实测），新增共享模块 `scripts/datafeeds.py`：
  - `stock_news_em` → 东财 search-api-web（个股新闻）
  - `stock_info_global_cls`（财联社，已下线）→ 东财全球资讯 np-weblist（**市场快讯替代源**）
  - `stock_zh_a_disclosure_*_cninfo` → 巨潮 cninfo（公告）
  - `stock_profit_forecast_ths` → 同花顺 10jqka（一致预期 EPS）
  - `stock_research_report_em` → 东财 reportapi（研报）
  - `stock_financial_abstract_ths` → 新浪利润表（多期成长：营收/净利润/EPS+同比）
- **东财防封**：所有东财接口经统一节流入口 `em_get()`（串行限流≥1s+随机抖动+会话复用）
- `requirements.txt`：移除 `akshare`，改为 `mootdx + requests + pandas + lxml`

### Notes

- 行情（腾讯）、行业检测/财务快照（mootdx）保持不变
- 已用真实 API 实测 6 个替换接口 + 两脚本端到端输出合法 JSON

## v1.0.0 (2026-05-15)

首个开源版本。

### Features

- **PEG 看板** — 自选股实时行情监控，一键添加/删除，PE/PB/市值/涨跌幅
- **AI PEG 估值报告** — 数据采集 → AI 生成 7 节结构化分析 → PDF 导出
- **行业板块 PE 对比** — 自动行业识别 + 市值前 20 名 PE 分布
- **新闻资讯** — 个股新闻 + 市场快讯 + 公司公告聚合

### Data Sources

- 腾讯财经 API（实时行情）
- mootdx（行业识别 + F10）
- akshare（财务数据 + 新闻）

### Tech

- Next.js 16 + React 19 + Tailwind CSS
- Anthropic / OpenAI 双 AI 引擎
- JSON 文件存储，零数据库依赖
