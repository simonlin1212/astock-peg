import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { execFile } from "child_process";
import path from "path";

import type { AnalysisRecord } from "./types";
import { getPythonBin } from "./python";

export type { AnalysisRecord };

const MAX_RAW_DATA_CHARS = 30_000;

const ANALYSES_DIR = path.join(process.cwd(), "..", "analyses");
const INDEX_PATH = path.join(ANALYSES_DIR, "index.json");
const SCRIPTS_DIR = path.join(process.cwd(), "..", "scripts");

export function readIndex(): AnalysisRecord[] {
  if (!existsSync(INDEX_PATH)) return [];
  const raw = readFileSync(INDEX_PATH, "utf-8");
  return JSON.parse(raw) as AnalysisRecord[];
}

export function writeIndex(records: AnalysisRecord[]): void {
  const tmp = INDEX_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(records, null, 2), "utf-8");
  renameSync(tmp, INDEX_PATH);
}

export function getAnalysisDir(id: string): string {
  const dir = path.join(ANALYSES_DIR, id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getReportPath(id: string): string {
  return path.join(ANALYSES_DIR, id, "report.md");
}

export function getRawDataPath(id: string): string {
  return path.join(ANALYSES_DIR, id, "raw_data.json");
}

export function collectData(ticker: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(SCRIPTS_DIR, "collect_stock_data.py");
    execFile(getPythonBin(), [script, ticker], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

export function buildPegAnalysisPrompt(ticker: string, name: string): string {
  return `你是一个专业的 A 股 PEG 估值分析助手。请基于以下数据，为 ${name}(${ticker}) 生成一份以 PEG 为核心的估值参考报告（仅供学习研究，不构成投资建议）。

## 分析框架（严格按此结构输出 Markdown）

### 1. 基本面快照
- 当前价格、PE(TTM)、PB、总市值
- 最近财务数据概要

### 2. PEG 核心分析（最重要的部分）
- **当前 PE(TTM)** 与行业平均对比
- **一致预期 EPS**（如有数据）→ 计算前瞻 PE
- **盈利增速 CAGR**（近3年净利润复合增速，或一致预期增速）
- **PEG = 前瞻PE / (CAGR×100)**
- **PEG 评级**：
  - PEG < 0.5 → 极度低估（估值显著低于增速）
  - 0.5 ≤ PEG < 1.0 → 低估（估值低于增速）
  - 1.0 ≤ PEG < 1.5 → 合理区间
  - 1.5 ≤ PEG < 2.0 → 偏贵（谨慎）
  - PEG ≥ 2.0 → 高估（估值显著高于增速）

### 3. PE 消化时间
- 当前前瞻 PE 消化到 30x 合理估值需要几年
- 公式：n = ln(当前PE/30) / ln(1+CAGR)
- 消化时间 < 2年 = 成长性强，2-4年 = 正常，> 4年 = 需谨慎

### 4. 盈利质量验证
- 近4个季度的营收和利润增速趋势
- 增速在加速还是减速（决定 PEG 是否可信）
- ROE 水平和趋势

### 5. 同行 PEG 对比
- 列出同行业 2-3 家可比公司的 PE 和 PEG（如数据可得）
- 该股 PEG 在行业中的排位

### 6. 风险提示
- PEG 分析的局限性（周期股不适用、亏损股不适用等）
- 该股的主要风险因素

### 7. 综合结论
- PEG 评级（一个词）
- 估值判断（低估/合理/高估）
- 一句话核心观点

## 输出要求
1. 报告格式为 Markdown
2. 开头第一行: # ${name}(${ticker}) PEG 估值分析
3. 数据要用表格呈现，直观清晰
4. 结论部分要明确给出 PEG 数值和评级
5. **严禁估算或编造数据**：所有数值必须直接引用下方原始数据中的真实字段，不得使用"≈"或"估算"。growth_history 包含各报告期的真实财报数据（净利润、营收、EPS、ROE等），consensus_eps 包含机构一致预期，financial 包含基础财务指标——请直接引用这些字段的值
6. 当前日期是 ${new Date().toISOString().slice(0, 10)}，已披露的财报数据（如2024年报、2025年报）是真实数据，不是预测
7. 最后必须附上免责声明："本报告由 AI 自动生成，仅供学习研究与技术演示，不构成任何投资建议。投资者应独立判断并咨询持牌专业机构。"`;
}

export async function runApiAnalysis(
  id: string,
  ticker: string,
  name: string,
  rawDataPath: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("请在 .env 文件中配置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY");
  }

  let rawData = readFileSync(rawDataPath, "utf-8");
  if (rawData.length > MAX_RAW_DATA_CHARS) {
    rawData = rawData.slice(0, MAX_RAW_DATA_CHARS) + "\n...(数据已截断)";
  }
  const prompt = buildPegAnalysisPrompt(ticker, name);
  const userMessage = `${prompt}\n\n## 原始数据\n\`\`\`json\n${rawData}\n\`\`\``;

  let report: string;

  if (process.env.ANTHROPIC_API_KEY) {
    report = await callAnthropicApi(userMessage);
  } else {
    report = await callOpenAiApi(userMessage);
  }

  const reportPath = getReportPath(id);
  writeFileSync(reportPath, report, "utf-8");

  const pegMatch = report.match(/PEG\s*[=：:]\s*([\d.]+)/);
  const conclusionSection = report.match(/综合结论[\s\S]*$/)?.[0] ?? "";
  const ratingMatch =
    conclusionSection.match(/PEG\s*评级[：:]\s*\**\s*(极度低估|低估|合理|偏贵|高估)/) ??
    conclusionSection.match(/(极度低估|低估|合理|偏贵|高估)/);
  const conclusionMatch = report.match(/一句话核心观点[：:]\s*(.+)/);

  const records = readIndex();
  writeIndex(
    records.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "completed" as const,
            pegRating: ratingMatch?.[1] || (pegMatch ? `PEG ${pegMatch[1]}` : undefined),
            conclusion: conclusionMatch?.[1]?.slice(0, 60) || ratingMatch?.[1] || "分析完成",
          }
        : r,
    ),
  );
}

async function callAnthropicApi(userMessage: string): Promise<string> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const textBlock = data?.content?.find((b: { type: string }) => b.type === "text");
  const text = textBlock?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic API returned unexpected format");
  }
  return text;
}

async function callOpenAiApi(userMessage: string): Promise<string> {
  // Base URL + model are overridable so any OpenAI-compatible provider works
  // (DeepSeek, Qwen, GLM, Kimi, OpenRouter, local Ollama, etc.), mirroring the
  // Anthropic path's ANTHROPIC_BASE_URL/ANTHROPIC_MODEL overrides (#5).
  // e.g. DeepSeek: OPENAI_BASE_URL=https://api.deepseek.com  OPENAI_MODEL=deepseek-chat
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: "你是一个 A 股 PEG 估值计算工具。你的输出仅供学习研究参考，不构成投资建议。" },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI-compatible API error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI API returned unexpected format");
  }
  return text;
}
