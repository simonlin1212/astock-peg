"use client";

import { useEffect, useCallback } from "react";
import { useQuotes } from "@/hooks/useQuotes";
import type { LiveStock } from "@/hooks/useQuotes";
import { WatchlistTable } from "./WatchlistTable";
import type { WatchlistStock, SectorKey } from "@/data/constants";

function toLiveWatchlist(data: ReturnType<typeof useQuotes>["data"]): WatchlistStock[] {
  if (!data) return [];
  return data.watchlist.map((s: LiveStock) => ({
    ticker: s.ticker,
    name: s.name,
    sectorKey: (s.sectorKey || "other") as SectorKey,
    pe26e: `${s.pe26e}x`,
    cagr: `${s.cagr}%`,
    peg: s.peg,
    digest: s.digestYears > 0 ? `${s.digestYears}年` : "已消化",
    status: "watch" as const,
    statusLabel: "",
    price: s.price,
    changePct: s.changePct,
    peTtm: s.peTtm,
    pb: s.pb,
    marketCap: s.marketCap,
  }));
}

export function LiveDashboard() {
  const { data, loading, error, refresh } = useQuotes();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const liveWatchlist = toLiveWatchlist(data);

  const handleAddStock = useCallback(async (ticker: string) => {
    const resp = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    if (!resp.ok) {
      const body = await resp.json();
      throw new Error(body.error || "添加失败");
    }
    await refresh();
  }, [refresh]);

  const handleDeleteStock = useCallback(async (ticker: string) => {
    const resp = await fetch(`/api/stocks/${ticker}`, { method: "DELETE" });
    if (!resp.ok) {
      const body = await resp.json();
      throw new Error(body.error || "删除失败");
    }
    await refresh();
  }, [refresh]);

  const handleAnalyze = useCallback(async (ticker: string) => {
    const resp = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    const body = await resp.json();
    if (!resp.ok && resp.status !== 409) {
      throw new Error(body.error || "分析提交失败");
    }
    window.location.href = `/analysis?from=dashboard`;
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="btn text-xs px-3 py-1.5"
          >
            {loading ? "刷新中..." : "刷新行情"}
          </button>
          {data && (
            <span className="t-meta text-[var(--color-text-3)]">
              {new Date(data.timestamp).toLocaleTimeString("zh-CN")}
            </span>
          )}
          {error && (
            <span className="t-meta text-[var(--color-negative)]">{error}</span>
          )}
        </div>
      </div>

      <section className="module">
        <WatchlistTable
          stocks={liveWatchlist}
          onAdd={handleAddStock}
          onDelete={handleDeleteStock}
          onAnalyze={handleAnalyze}
        />
      </section>
    </>
  );
}
