import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import {
  readIndex,
  writeIndex,
  getReportPath,
  getRawDataPath,
} from "@/lib/analysis";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const records = readIndex();
  let record = records.find((r) => r.id === id);

  if (!record) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const reportPath = getReportPath(id);
  const hasReport = existsSync(reportPath);

  let report: string | null = null;

  if (hasReport) {
    report = readFileSync(reportPath, "utf-8");

    if (record.status === "analyzing") {
      const conclusion = extractConclusion(report);
      const pegRating = extractPegRating(report);
      const updated = records.map((r) =>
        r.id === id
          ? { ...r, status: "completed" as const, conclusion, pegRating }
          : r,
      );
      writeIndex(updated);
      record = updated.find((r) => r.id === id)!;
    }
  }

  const rawPath = getRawDataPath(id);
  const hasRawData = existsSync(rawPath);

  return NextResponse.json({
    ...record,
    report,
    hasRawData,
  });
}

function extractConclusion(report: string): string {
  const conclusionIdx = report.indexOf("## 综合结论");
  if (conclusionIdx !== -1) {
    const afterHeading = report.slice(conclusionIdx + 20, conclusionIdx + 300);
    const firstLine = afterHeading.split("\n").find((l) => l.trim().length > 5);
    return firstLine?.trim().slice(0, 200) || "分析已完成";
  }
  return "分析已完成";
}

function extractPegRating(report: string): string {
  const match = report.match(/(极度低估|低估|合理|偏贵|高估)/);
  return match ? match[1] : "";
}
