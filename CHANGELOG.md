# Changelog

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
