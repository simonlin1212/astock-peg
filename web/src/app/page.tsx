import { LiveDashboard } from "@/components/dashboard/LiveDashboard";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-16 py-8 flex flex-col gap-6">
      <section className="module">
        <div>
          <h1 className="t-h2">自选股行情</h1>
          <p className="t-body-sm text-[var(--color-text-2)] mt-1">
            添加股票代码监控实时行情，点击"分析"进入 AI PEG 估值分析
          </p>
        </div>
        <div className="gradient-rule mt-3" />
      </section>

      <LiveDashboard />
    </div>
  );
}
