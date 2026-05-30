import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import {
  readPortfolio,
  writePortfolio,
  fetchStockInfo,
} from "@/lib/portfolio";
import { getPythonBin } from "@/lib/python";

const SCRIPTS_DIR = path.join(process.cwd(), "..", "scripts");

function resolveTicker(query: string): Promise<{ code: string; name: string }> {
  return new Promise((resolve, reject) => {
    const script = path.join(SCRIPTS_DIR, "resolve_ticker.py");
    execFile(getPythonBin(), [script, query], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch {
        reject(new Error("解析返回格式异常"));
      }
    });
  });
}

const IS_PURE_DIGIT = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let ticker = (body?.ticker as string | undefined)?.trim();

    if (!ticker) {
      return NextResponse.json(
        { error: "请输入股票代码或名称" },
        { status: 400 },
      );
    }

    if (!IS_PURE_DIGIT.test(ticker)) {
      try {
        const resolved = await resolveTicker(ticker);
        ticker = resolved.code;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "股票名称解析失败";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const portfolio = readPortfolio();

    if (portfolio.stocks[ticker]) {
      return NextResponse.json(
        { error: `${ticker} 已在自选股中` },
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
