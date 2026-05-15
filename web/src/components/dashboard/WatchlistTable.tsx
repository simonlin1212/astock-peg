"use client";

import { useState } from "react";
import type { WatchlistStock } from "@/data/constants";
import { SECTOR_LABELS } from "@/data/constants";
import { Th, Td } from "@/components/ui/Table";

interface WatchlistTableProps {
  stocks: WatchlistStock[];
  onAdd?: (ticker: string) => Promise<void>;
  onDelete?: (ticker: string) => Promise<void>;
  onAnalyze?: (ticker: string) => Promise<void>;
}

function pegColor(peg: number): string {
  if (peg < 1) return "var(--color-positive)";
  if (peg < 1.5) return "var(--color-warning)";
  return "var(--color-negative)";
}

function pegLabel(peg: number): string {
  if (peg < 0.5) return "极度低估";
  if (peg < 1) return "低估";
  if (peg < 1.5) return "合理";
  if (peg < 2) return "偏贵";
  return "高估";
}

function changePctColor(v: number): string {
  if (v > 0) return "var(--color-positive)";
  if (v < 0) return "var(--color-negative)";
  return "var(--color-text-mute)";
}

export function WatchlistTable({ stocks, onAdd, onDelete, onAnalyze }: WatchlistTableProps) {
  const [ticker, setTicker] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    if (!ticker || !onAdd) return;
    setAdding(true);
    setAddError(null);
    try {
      await onAdd(ticker.trim());
      setTicker("");
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(t: string) {
    if (!onDelete) return;
    setDeleting(t);
    try {
      await onDelete(t);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="t-h4">自选股 PEG 监控</h3>
          <div className="gradient-rule mt-2 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="代码或名称，如 600519 / 贵州茅台"
            className="px-3 py-1.5 text-sm bg-[var(--color-surface-2)] border border-[var(--color-rule-2)] text-[var(--color-text)] placeholder:text-[var(--color-text-3)] focus:border-[var(--color-accent)] focus:outline-none w-56"
          />
          <button
            onClick={handleAdd}
            disabled={adding || ticker.trim().length === 0}
            className="btn text-xs px-3 py-1.5"
          >
            {adding ? "添加中..." : "添加"}
          </button>
          {addError && (
            <span className="t-meta text-[var(--color-negative)]">{addError}</span>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-[1.5px] border-[var(--color-rule)]">
              <Th>名称</Th>
              <Th>代码</Th>
              <Th align="right">现价</Th>
              <Th align="right">涨跌</Th>
              <Th align="right">PE(TTM)</Th>
              <Th align="right">PB</Th>
              <Th align="center">操作</Th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => {
              const sector = SECTOR_LABELS[s.sectorKey] ?? SECTOR_LABELS.other;
              return (
                <tr
                  key={s.ticker}
                  className="border-b border-[var(--color-rule-3)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 shrink-0"
                        style={{ backgroundColor: sector.color }}
                      />
                      <span>{s.name}</span>
                    </div>
                  </Td>
                  <Td mono>{s.ticker}</Td>
                  <Td mono align="right">
                    {s.price != null ? s.price.toFixed(2) : "--"}
                  </Td>
                  <Td mono align="right">
                    {s.changePct != null ? (
                      <span style={{ color: changePctColor(s.changePct) }}>
                        {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                      </span>
                    ) : "--"}
                  </Td>
                  <Td mono align="right">
                    {s.peTtm != null ? s.peTtm.toFixed(1) : "--"}
                  </Td>
                  <Td mono align="right">
                    {s.pb != null ? s.pb.toFixed(2) : "--"}
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-2">
                      {onAnalyze && (
                        <button
                          onClick={async () => {
                            setAnalyzing(s.ticker);
                            try {
                              await onAnalyze(s.ticker);
                            } finally {
                              setAnalyzing(null);
                            }
                          }}
                          disabled={analyzing === s.ticker}
                          className="text-[var(--color-accent)] hover:text-[var(--color-text)] transition-colors text-xs px-1"
                          title="AI 分析"
                        >
                          {analyzing === s.ticker ? "提交中..." : "分析"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.ticker)}
                        disabled={deleting === s.ticker}
                        className="text-[var(--color-text-3)] hover:text-[var(--color-negative)] transition-colors text-xs px-1"
                        title="删除"
                      >
                        {deleting === s.ticker ? "..." : "✕"}
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center t-meta text-[var(--color-text-3)]">
                  暂无自选股票 — 输入代码或股票名称添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

