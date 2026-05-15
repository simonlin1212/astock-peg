"use client";

import { useState } from "react";
import { Th, Td } from "@/components/ui/Table";
import type { SectorStock } from "@/lib/types";

interface SectorData {
  timestamp: string;
  stocks: SectorStock[];
  stats: {
    count: number;
    avgPe: number;
    medianPe: number;
    totalMarketCap: number;
  };
}

function pegColor(peTtm: number): string {
  if (peTtm < 20) return "var(--color-positive)";
  if (peTtm < 50) return "var(--color-warning)";
  return "var(--color-negative)";
}

function changePctColor(v: number): string {
  if (v > 0) return "var(--color-positive)";
  if (v < 0) return "var(--color-negative)";
  return "var(--color-text-mute)";
}

export default function SectorPage() {
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTickers, setCustomTickers] = useState("");
  const [currentSector, setCurrentSector] = useState("");

  async function fetchSector(label: string, tickers: string) {
    setLoading(true);
    setError(null);
    setCurrentSector(label);
    try {
      const resp = await fetch(`/api/sector?tickers=${tickers}`);
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const json: SectorData = await resp.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomSearch() {
    const cleaned = customTickers.replace(/\s+/g, ",").replace(/，/g, ",");
    if (!cleaned) return;

    const codes = cleaned.split(",").filter((t) => /^\d{6}$/.test(t));
    if (codes.length === 1) {
      setLoading(true);
      setError(null);
      setCurrentSector("检测行业中...");
      try {
        const resp = await fetch(`/api/sector/detect?ticker=${codes[0]}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "行业检测失败");
        await fetchSector(data.industry, data.tickers.join(","));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "行业检测失败");
        setLoading(false);
      }
      return;
    }

    fetchSector("自定义板块", cleaned);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-16 py-8 flex flex-col gap-6">
      <section className="module">
        <h2 className="t-h3">板块 PEG 对比</h2>
        <p className="t-body-sm text-[var(--color-text-2)] mt-1">
          输入股票代码，自动查找所属行业，查看板块市值前20名的 PE 分布
        </p>
        <div className="gradient-rule mt-3 w-16" />

        <div className="mt-6 flex items-center gap-2">
          <input
            type="text"
            value={customTickers}
            onChange={(e) => setCustomTickers(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
            placeholder="输入股票代码（自动查行业），或多个代码逗号分隔"
            className="px-3 py-1.5 text-sm font-mono bg-[var(--color-surface-2)] border border-[var(--color-rule-2)] text-[var(--color-text)] placeholder:text-[var(--color-text-3)] focus:border-[var(--color-accent)] focus:outline-none flex-1"
          />
          <button
            onClick={handleCustomSearch}
            disabled={loading || !customTickers.trim()}
            className="btn text-xs px-4 py-1.5"
          >
            查询
          </button>
        </div>

        {error && (
          <p className="t-meta text-[var(--color-negative)] mt-2">{error}</p>
        )}
      </section>

      {data && (
        <>
          <section className="module">
            <div className="flex items-center justify-between mb-4">
              <h3 className="t-h4">{currentSector} — 市值前 {data.stats.count} 名</h3>
              <span className="t-meta text-[var(--color-text-3)]">
                {new Date(data.timestamp).toLocaleTimeString("zh-CN")}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard label="板块平均 PE" value={`${data.stats.avgPe}x`} />
              <StatCard label="板块中位 PE" value={`${data.stats.medianPe}x`} />
              <StatCard label="覆盖股票数" value={`${data.stats.count}`} />
              <StatCard label="总市值" value={`${data.stats.totalMarketCap.toFixed(0)} 亿`} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-[1.5px] border-[var(--color-rule)]">
                    <Th>#</Th>
                    <Th>名称</Th>
                    <Th>代码</Th>
                    <Th align="right">现价</Th>
                    <Th align="right">涨跌</Th>
                    <Th align="right">PE(TTM)</Th>
                    <Th align="right">PB</Th>
                    <Th align="right">总市值(亿)</Th>
                    <Th align="right">vs 板块均PE</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.stocks.map((s, i) => {
                    const vsSector = data.stats.avgPe > 0
                      ? ((s.peTtm - data.stats.avgPe) / data.stats.avgPe) * 100
                      : 0;
                    return (
                      <tr
                        key={s.ticker}
                        className="border-b border-[var(--color-rule-3)] hover:bg-[var(--color-surface-2)] transition-colors"
                      >
                        <Td mono>{i + 1}</Td>
                        <Td>{s.name}</Td>
                        <Td mono>{s.ticker}</Td>
                        <Td mono align="right">{s.price.toFixed(2)}</Td>
                        <Td mono align="right">
                          <span style={{ color: changePctColor(s.changePct) }}>
                            {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                          </span>
                        </Td>
                        <Td mono align="right">
                          <span style={{ color: pegColor(s.peTtm) }}>
                            {s.peTtm.toFixed(1)}
                          </span>
                        </Td>
                        <Td mono align="right">{s.pb.toFixed(2)}</Td>
                        <Td mono align="right">{s.marketCap.toFixed(0)}</Td>
                        <Td mono align="right">
                          <span style={{ color: vsSector > 0 ? "var(--color-negative)" : "var(--color-positive)" }}>
                            {vsSector >= 0 ? "+" : ""}{vsSector.toFixed(0)}%
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!data && !loading && (
        <section className="module">
          <div className="py-12 text-center">
            <p className="t-h3 text-[var(--color-text-3)]">输入代码开始分析</p>
            <p className="t-body-sm text-[var(--color-text-mute)] mt-2">
              输入任意6位股票代码，自动查找所属行业并展示板块 PE 对比
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-rule-3)] p-4">
      <div className="t-meta text-[var(--color-text-3)]">{label}</div>
      <div className="t-num-lg text-[var(--color-text)] mt-1">{value}</div>
    </div>
  );
}

