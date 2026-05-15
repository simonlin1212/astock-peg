"use client";

import { useState, useCallback } from "react";

export interface LiveStock {
  ticker: string;
  name: string;
  price: number;
  prevClose: number;
  changePct: number;
  peTtm: number;
  pb: number;
  marketCap: number;
  turnover: number;
  pe26e: number;
  cagr: number;
  peg: number;
  digestYears: number;
  sectorKey: string;
  status: "watch" | "analyzed";
  statusLabel: string;
}

export interface QuotesData {
  timestamp: string;
  watchlist: LiveStock[];
}

export function useQuotes() {
  const [data, setData] = useState<QuotesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/quotes");
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const json: QuotesData = await resp.json();
      setData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}
