import { NextResponse } from "next/server";
import { readPortfolio, writePortfolio } from "@/lib/portfolio";

interface RouteContext {
  params: Promise<{ ticker: string }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { ticker } = await context.params;
    const portfolio = readPortfolio();

    if (!portfolio.stocks[ticker]) {
      return NextResponse.json(
        { error: `Ticker ${ticker} not found.` },
        { status: 404 },
      );
    }

    const { [ticker]: _removed, ...remainingStocks } = portfolio.stocks;

    writePortfolio({
      stocks: remainingStocks,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { ticker } = await context.params;
    const body = await request.json();
    const portfolio = readPortfolio();

    if (!portfolio.stocks[ticker]) {
      return NextResponse.json(
        { error: `Ticker ${ticker} not found.` },
        { status: 404 },
      );
    }

    const updatedStock = {
      ...portfolio.stocks[ticker],
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.market === "string" && { market: body.market }),
      ...(typeof body.sectorKey === "string" && { sectorKey: body.sectorKey }),
      ...(typeof body.consensusEps26 === "number" && { consensusEps26: body.consensusEps26 }),
      ...(typeof body.cagr === "number" && { cagr: body.cagr }),
      ...(typeof body.status === "string" && { status: body.status }),
      ...(typeof body.statusLabel === "string" && { statusLabel: body.statusLabel }),
    };

    const updatedStocks = { ...portfolio.stocks, [ticker]: updatedStock };

    writePortfolio({
      stocks: updatedStocks,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
