import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { readPortfolio } from "@/lib/portfolio";
import { getPythonBin } from "@/lib/python";

export const maxDuration = 60;

const SCRIPTS_DIR = path.join(process.cwd(), "..", "scripts");

function collectNews(tickers: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(SCRIPTS_DIR, "collect_news.py");
    const args = tickers.length > 0 ? [script, tickers.join(",")] : [script];
    execFile(getPythonBin(), args, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

export async function GET() {
  try {
    const portfolio = readPortfolio();
    const tickers = Object.keys(portfolio.stocks);
    const raw = await collectNews(tickers);
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "新闻采集失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
