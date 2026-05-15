import { NextResponse } from "next/server";
import {
  readPortfolio,
  writePortfolio,
  fetchStockInfo,
} from "@/lib/portfolio";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticker = body?.ticker as string | undefined;

    if (!ticker || !/^\d{6}$/.test(ticker)) {
      return NextResponse.json(
        { error: "Invalid ticker. Must be a 6-digit code." },
        { status: 400 },
      );
    }

    const portfolio = readPortfolio();

    if (portfolio.stocks[ticker]) {
      return NextResponse.json(
        { error: `Ticker ${ticker} already exists.` },
        { status: 409 },
      );
    }

    const info = await fetchStockInfo(ticker);

    portfolio.stocks[ticker] = {
      name: info.name,
      market: info.market,
      sectorKey: "other",
      consensusEps26: 0,
      cagr: 0,
      status: "watch",
      statusLabel: "新加入",
    };

    writePortfolio(portfolio);

    return NextResponse.json({ stocks: portfolio.stocks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
