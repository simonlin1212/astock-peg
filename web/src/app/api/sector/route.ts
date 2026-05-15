import { NextResponse } from "next/server";
import { TF, detectMarket, fetchTencentQuotes } from "@/lib/tencent-api";
import type { SectorStock } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");

  if (!tickersParam) {
    return NextResponse.json({ error: "Missing tickers parameter" }, { status: 400 });
  }

  const tickers = tickersParam.split(",").filter((t) => /^\d{6}$/.test(t));
  if (tickers.length === 0) {
    return NextResponse.json({ error: "No valid tickers" }, { status: 400 });
  }

  const codes = tickers.map((t) => `${detectMarket(t)}${t}`);
  const rawQuotes = await fetchTencentQuotes(codes);

  const stocks: SectorStock[] = [];
  for (const q of rawQuotes) {
    const peTtm = parseFloat(q.fields[TF.PE_TTM]);
    const marketCap = parseFloat(q.fields[TF.MARKET_CAP]);

    if (!peTtm || peTtm <= 0 || !marketCap) continue;

    stocks.push({
      ticker: q.code,
      name: q.fields[TF.NAME],
      price: parseFloat(q.fields[TF.PRICE]),
      changePct: parseFloat(q.fields[TF.CHANGE_PCT]),
      peTtm,
      pb: parseFloat(q.fields[TF.PB]),
      marketCap,
      peg: null,
    });
  }

  stocks.sort((a, b) => b.marketCap - a.marketCap);
  const top20 = stocks.slice(0, 20);

  const validPes = top20.filter((s) => s.peTtm > 0 && s.peTtm < 500);
  const avgPe = validPes.length > 0
    ? validPes.reduce((sum, s) => sum + s.peTtm, 0) / validPes.length
    : 0;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stocks: top20,
    stats: {
      count: top20.length,
      avgPe: Math.round(avgPe * 10) / 10,
      medianPe: calcMedian(validPes.map((s) => s.peTtm)),
      totalMarketCap: Math.round(top20.reduce((s, x) => s + x.marketCap, 0) * 100) / 100,
    },
  });
}

function calcMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? Math.round(sorted[mid] * 10) / 10
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}
