import { NextResponse } from "next/server";
import { readPortfolio } from "@/lib/portfolio";
import { TF, fetchTencentQuotes } from "@/lib/tencent-api";

function computeDerived(price: number, cfg: { consensusEps26: number; cagr: number }) {
  const pe26e = cfg.consensusEps26 > 0 ? price / cfg.consensusEps26 : 0;
  const cagrPct = cfg.cagr * 100;
  const peg = cagrPct > 0 ? pe26e / cagrPct : 0;
  const digestYears =
    pe26e > 30 && cfg.cagr > 0
      ? Math.log(pe26e / 30) / Math.log(1 + cfg.cagr)
      : 0;
  return {
    pe26e: Math.round(pe26e),
    cagr: Math.round(cagrPct),
    peg: Math.round(peg * 100) / 100,
    digestYears: Math.round(digestYears * 10) / 10,
  };
}

export async function GET() {
  const portfolio = readPortfolio();
  const STOCKS = portfolio.stocks;

  const tickers = Object.keys(STOCKS);
  if (tickers.length === 0) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      watchlist: [],
    });
  }

  const codes = tickers.map((t) => `${STOCKS[t].market}${t}`);
  const rawQuotes = await fetchTencentQuotes(codes);

  const watchlist = rawQuotes
    .map((q) => {
      const cfg = STOCKS[q.code];
      if (!cfg) return null;

      const price = parseFloat(q.fields[TF.PRICE]);
      const derived = computeDerived(price, cfg);

      return {
        ticker: q.code,
        name: cfg.name,
        price,
        prevClose: parseFloat(q.fields[TF.PREV_CLOSE]),
        changePct: parseFloat(q.fields[TF.CHANGE_PCT]),
        peTtm: parseFloat(q.fields[TF.PE_TTM]),
        pb: parseFloat(q.fields[TF.PB]),
        marketCap: parseFloat(q.fields[TF.MARKET_CAP]),
        turnover: parseFloat(q.fields[TF.TURNOVER]),
        ...derived,
        sectorKey: cfg.sectorKey,
        status: cfg.status,
        statusLabel: cfg.statusLabel,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    watchlist,
  });
}
