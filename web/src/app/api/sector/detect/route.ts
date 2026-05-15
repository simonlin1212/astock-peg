import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

interface DetectResult {
  industry: string;
  tickers: string[];
  error?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker || !/^\d{6}$/.test(ticker)) {
    return NextResponse.json(
      { error: "请输入有效的6位股票代码" },
      { status: 400 },
    );
  }

  const script = path.join(process.cwd(), "..", "scripts", "detect_sector.py");

  try {
    const result = await new Promise<DetectResult>((resolve, reject) => {
      execFile(
        "python3",
        [script, ticker],
        { timeout: 20000, env: { ...process.env, NO_PROXY: "*" } },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(new Error("解析行业数据失败"));
          }
        },
      );
    });

    if (!result.tickers || result.tickers.length === 0) {
      return NextResponse.json(
        { error: "未找到该股票的行业信息" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "行业检测失败" },
      { status: 500 },
    );
  }
}
