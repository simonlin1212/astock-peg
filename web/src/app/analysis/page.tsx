"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Th, Td } from "@/components/ui/Table";
import type { AnalysisRecord } from "@/lib/types";

function statusLabel(s: AnalysisRecord["status"]): { text: string; color: string } {
  switch (s) {
    case "collecting":
      return { text: "数据采集中...", color: "var(--color-warning)" };
    case "analyzing":
      return { text: "AI 分析中...", color: "var(--color-accent)" };
    case "completed":
      return { text: "完成", color: "var(--color-positive)" };
    case "failed":
      return { text: "失败", color: "var(--color-negative)" };
  }
}

function pegRatingBadge(rating?: string): { text: string; color: string } | null {
  if (!rating) return null;
  if (rating.includes("极度低估")) return { text: "极度低估", color: "var(--color-score-excellent)" };
  if (rating.includes("低估")) return { text: "低估", color: "var(--color-positive)" };
  if (rating.includes("合理")) return { text: "合理", color: "var(--color-warning)" };
  if (rating.includes("偏贵")) return { text: "偏贵", color: "var(--color-score-weak)" };
  if (rating.includes("高估")) return { text: "高估", color: "var(--color-negative)" };
  return { text: rating, color: "var(--color-text-2)" };
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<AnalysisRecord | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";

  const loadHistory = useCallback(async () => {
    try {
      const resp = await fetch("/api/analysis");
      if (resp.ok) {
        const data: AnalysisRecord[] = await resp.json();
        setHistory(data.sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch (e) {
      console.error("Failed to load analysis history:", e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const resp = await fetch(`/api/analysis/${id}`);
        if (!resp.ok) return;
        const data: AnalysisRecord = await resp.json();
        setCurrentReport(data);

        if (data.status === "completed" || data.status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          loadHistory();
          if (data.status === "completed" && fromDashboard) {
            window.location.href = "/";
          }
        }
      } catch (e) {
        console.error("Failed to poll analysis status:", e);
      }
    },
    [loadHistory, fromDashboard],
  );

  useEffect(() => {
    if (!currentId) return;
    pollStatus(currentId);
    pollingRef.current = setInterval(() => pollStatus(currentId), 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentId, pollStatus]);

  async function handleSubmit() {
    if (!ticker || ticker.length !== 6) return;
    setSubmitting(true);
    setError(null);
    setCurrentReport(null);

    try {
      const resp = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "提交失败");
      setCurrentId(data.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleViewHistory(record: AnalysisRecord) {
    setCurrentId(record.id);
    setCurrentReport(null);
  }

  async function handleExportPdf() {
    if (!reportRef.current || !currentReport) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.classList.remove("analysis-report");
      clone.classList.add("analysis-report", "analysis-report-pdf");
      const disclaimerDiv = document.createElement('div');
      disclaimerDiv.style.cssText = 'padding: 8px 12px; margin-bottom: 16px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; font-size: 12px; color: #92400e;';
      disclaimerDiv.textContent = '⚠️ 免责声明：本报告由 AI 自动生成，仅供学习研究与技术演示，不构成任何投资建议。投资有风险，决策请咨询持牌专业机构。';
      clone.insertBefore(disclaimerDiv, clone.firstChild);
      const filename = `PEG_${currentReport.name || currentReport.ticker}_${currentReport.date}.pdf`;
      await html2pdf()
        .set({
          margin: [10, 12, 10, 12],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        } as Record<string, unknown>)
        .from(clone)
        .save();
    } finally {
      setExporting(false);
    }
  }

  const st = currentReport ? statusLabel(currentReport.status) : null;

  return (
    <div className="mx-auto max-w-[1440px] px-16 py-8 flex flex-col gap-6">
      <section className="module">
        <h2 className="t-h3">PEG 个股分析</h2>
        <div className="gradient-rule mt-2 w-16" />

        <div className="mt-6 flex items-center gap-3">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="输入6位股票代码"
            maxLength={6}
            className="px-4 py-2 text-sm font-mono bg-[var(--color-surface-2)] border border-[var(--color-rule-2)] text-[var(--color-text)] placeholder:text-[var(--color-text-3)] focus:border-[var(--color-accent)] focus:outline-none w-48"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || ticker.length !== 6}
            className="btn px-5 py-2"
          >
            {submitting ? "提交中..." : "开始 PEG 分析"}
          </button>
          {error && (
            <span className="t-meta text-[var(--color-negative)]">{error}</span>
          )}
        </div>

        <p className="t-body-sm text-[var(--color-text-3)] mt-2">
          输入代码后系统将采集行情+研报+财务数据，AI 生成 PEG 估值分析报告
        </p>
      </section>

      {currentReport && (
        <section className="module">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="t-h4">
              {currentReport.name || currentReport.ticker}
              <span className="t-meta font-mono ml-2">{currentReport.ticker}</span>
            </h3>
            <span
              className="px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: st!.color, border: `1px solid ${st!.color}` }}
            >
              {st!.text}
            </span>
            {currentReport.pegRating && (() => {
              const badge = pegRatingBadge(currentReport.pegRating);
              if (!badge) return null;
              return (
                <span
                  className="px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: badge.color, border: `1px solid ${badge.color}` }}
                >
                  PEG: {badge.text}
                </span>
              );
            })()}
          </div>

          {currentReport.status === "analyzing" && (
            <div className="flex items-center gap-3 py-8">
              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <span className="t-body text-[var(--color-text-2)]">
                AI 正在生成 PEG 分析报告...
              </span>
            </div>
          )}

          {currentReport.status === "collecting" && (
            <div className="flex items-center gap-3 py-8">
              <div className="w-4 h-4 border-2 border-[var(--color-warning)] border-t-transparent rounded-full animate-spin" />
              <span className="t-body text-[var(--color-text-2)]">
                正在采集股票数据...
              </span>
            </div>
          )}

          {currentReport.status === "failed" && (
            <div className="py-4 px-4 bg-[var(--color-surface-2)] border border-[var(--color-negative)]">
              <span className="t-body text-[var(--color-negative)]">
                分析失败: {currentReport.error || "未知错误"}
              </span>
            </div>
          )}

          {currentReport.report && (
            <>
              <div className="flex justify-between items-center mb-3">
                {fromDashboard ? (
                  <button
                    onClick={() => { window.location.href = "/"; }}
                    className="px-4 py-1.5 text-xs font-medium border border-[var(--color-positive)] text-[var(--color-positive)] hover:bg-[var(--color-positive)] hover:text-[var(--color-bg)] transition-colors"
                  >
                    ← 返回看板
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="px-4 py-1.5 text-xs font-medium border border-[var(--color-rule-2)] text-[var(--color-text-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
                >
                  {exporting ? "导出中..." : "导出 PDF"}
                </button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-800 dark:text-amber-200">
                ⚠️ 以下内容由 AI 自动生成，仅供学习研究与技术演示，不构成任何投资建议。投资有风险，决策请咨询持牌专业机构。
              </div>
              <article ref={reportRef} className="max-w-none analysis-report">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {currentReport.report}
                </Markdown>
              </article>
            </>
          )}
        </section>
      )}

      <section className="module">
        <h3 className="t-h4">历史分析</h3>
        <div className="gradient-rule mt-2 w-16" />

        {history.length === 0 ? (
          <p className="t-meta text-[var(--color-text-3)] mt-6">暂无历史分析记录</p>
        ) : (
          <div className="mt-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-[1.5px] border-[var(--color-rule)]">
                  <Th>日期</Th>
                  <Th>代码</Th>
                  <Th>名称</Th>
                  <Th>PEG评级</Th>
                  <Th>状态</Th>
                  <Th>结论</Th>
                  <Th align="center">操作</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const s = statusLabel(r.status);
                  const badge = pegRatingBadge(r.pegRating);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--color-rule-3)] hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      <Td mono>{r.date}</Td>
                      <Td mono>{r.ticker}</Td>
                      <Td>{r.name || "--"}</Td>
                      <Td>
                        {badge ? (
                          <span className="t-meta" style={{ color: badge.color }}>
                            {badge.text}
                          </span>
                        ) : (
                          <span className="t-meta text-[var(--color-text-3)]">--</span>
                        )}
                      </Td>
                      <Td>
                        <span style={{ color: s.color }}>{s.text}</span>
                      </Td>
                      <Td>
                        <span className="t-body-sm text-[var(--color-text-2)] line-clamp-1">
                          {r.conclusion || "--"}
                        </span>
                      </Td>
                      <Td align="center">
                        {r.status === "completed" && (
                          <button
                            onClick={() => handleViewHistory(r)}
                            className="text-[var(--color-accent)] hover:underline text-sm px-3 py-1 cursor-pointer rounded hover:bg-[var(--color-accent)]/10 transition-colors"
                          >
                            查看
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

