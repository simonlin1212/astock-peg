import { NextResponse } from "next/server";
import { writeFileSync } from "fs";
import {
  readIndex,
  writeIndex,
  getAnalysisDir,
  getRawDataPath,
  collectData,
  runApiAnalysis,
} from "@/lib/analysis";

export async function GET() {
  const records = readIndex();
  return NextResponse.json(records);
}

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

    const today = new Date().toISOString().slice(0, 10);
    const id = `${ticker}_${today}`;

    const records = readIndex();
    const existing = records.find((r) => r.id === id);
    if (existing && existing.status === "analyzing") {
      return NextResponse.json(
        { error: "该股票今日已在分析中", id },
        { status: 409 },
      );
    }

    getAnalysisDir(id);

    const record = {
      id,
      ticker,
      name: "",
      date: today,
      status: "collecting" as const,
    };

    const updated = existing
      ? records.map((r) => (r.id === id ? { ...r, status: "collecting" as const, error: undefined } : r))
      : [...records, record];
    writeIndex(updated);

    let rawData: string;
    try {
      rawData = await collectData(ticker);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "数据采集失败";
      writeIndex(
        updated.map((r) =>
          r.id === id ? { ...r, status: "failed" as const, error: msg } : r,
        ),
      );
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const parsed = JSON.parse(rawData);
    const name = parsed.quote?.name || ticker;
    const rawDataPath = getRawDataPath(id);

    writeFileSync(rawDataPath, rawData, "utf-8");

    writeIndex(
      updated.map((r) =>
        r.id === id ? { ...r, name, status: "analyzing" as const } : r,
      ),
    );

    runApiAnalysis(id, ticker, name, rawDataPath).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "AI 分析失败";
      const current = readIndex();
      writeIndex(
        current.map((r) =>
          r.id === id ? { ...r, status: "failed" as const, error: msg } : r,
        ),
      );
    });

    return NextResponse.json({ id, name, status: "analyzing" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
