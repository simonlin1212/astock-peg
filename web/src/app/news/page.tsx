"use client";

import { useState, useEffect, useCallback } from "react";

interface NewsItem {
  category: "stock" | "market" | "announcement";
  ticker?: string;
  [key: string]: unknown;
}

interface NewsData {
  collected_at: string;
  stock_news: NewsItem[];
  market_news: NewsItem[];
  announcements: NewsItem[];
  error?: string;
}

function getTitle(item: NewsItem): string {
  const candidates = ["新闻标题", "title", "标题", "巨潮资讯网公告"];
  for (const k of candidates) {
    if (typeof item[k] === "string" && (item[k] as string).length > 0) {
      return item[k] as string;
    }
  }
  for (const [, v] of Object.entries(item)) {
    if (typeof v === "string" && v.length > 10 && v.length < 200) {
      return v;
    }
  }
  return "无标题";
}

function getTime(item: NewsItem): string {
  const candidates = ["发布时间", "time", "datetime", "公告日期", "date"];
  for (const k of candidates) {
    const v = item[k];
    if (typeof v === "string" && v.length > 0) {
      if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(v)) {
        return v.slice(0, 19);
      }
    }
  }
  return "";
}

function getSource(item: NewsItem): string {
  const candidates = ["文章来源", "source", "来源"];
  for (const k of candidates) {
    if (typeof item[k] === "string" && (item[k] as string).length > 0) {
      return item[k] as string;
    }
  }
  if (item.category === "market") return "财联社";
  if (item.category === "announcement") return "巨潮资讯";
  return "";
}

function getUrl(item: NewsItem): string | null {
  const candidates = ["新闻链接", "url", "link", "公告链接"];
  for (const k of candidates) {
    if (typeof item[k] === "string" && (item[k] as string).startsWith("http")) {
      return item[k] as string;
    }
  }
  return null;
}

function sortByTime(items: NewsItem[]): NewsItem[] {
  return [...items]
    .filter((item) => !item.error)
    .sort((a, b) => getTime(b).localeCompare(getTime(a)));
}

function StockName({ ticker }: { ticker: string }) {
  return (
    <span className="text-[11px] font-medium text-[var(--color-accent)]">
      {ticker}
    </span>
  );
}

function NewsRow({ item, showTicker }: { item: NewsItem; showTicker: boolean }) {
  const title = getTitle(item);
  const time = getTime(item);
  const source = getSource(item);
  const url = getUrl(item);

  return (
    <div className="px-5 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
      <div className="flex items-baseline gap-2">
        {showTicker && item.ticker && <StockName ticker={item.ticker} />}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="t-body font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors line-clamp-2 flex-1"
          >
            {title}
          </a>
        ) : (
          <span className="t-body font-medium text-[var(--color-text)] line-clamp-2 flex-1">
            {title}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {source && <span className="t-meta">{source}</span>}
        {time && <span className="t-meta">{time}</span>}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/news");
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const json: NewsData = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const stockNews = data ? sortByTime(data.stock_news) : [];
  const marketNews = data ? sortByTime(data.market_news) : [];

  return (
    <div className="mx-auto max-w-[1440px] px-16 py-8 flex flex-col gap-6">
      <section className="module">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-h3">新闻公告</h2>
            <div className="gradient-rule mt-2 w-16" />
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="t-meta">
                更新于 {new Date(data.collected_at).toLocaleTimeString("zh-CN")}
              </span>
            )}
            <button
              onClick={fetchNews}
              disabled={loading}
              className="btn px-4 py-1.5 text-xs"
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section className="module border-[var(--color-negative)]">
          <p className="t-body text-[var(--color-negative)]">{error}</p>
        </section>
      )}

      {loading && !data && (
        <section className="module">
          <div className="flex items-center gap-3 py-12 justify-center">
            <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="t-body text-[var(--color-text-2)]">
              正在采集新闻数据，可能需要 10-30 秒...
            </span>
          </div>
        </section>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-6">
          <section className="module p-0">
            <div className="px-5 py-3 border-b border-[var(--color-rule-2)]">
              <h3 className="t-h4">
                个股新闻
                <span className="ml-2 text-[var(--color-text-3)] font-normal">
                  {stockNews.length}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-[var(--color-rule-3)] max-h-[calc(100vh-240px)] overflow-y-auto">
              {stockNews.length === 0 ? (
                <p className="t-meta text-[var(--color-text-3)] py-8 text-center">
                  暂无个股新闻
                </p>
              ) : (
                stockNews.map((item, idx) => (
                  <NewsRow
                    key={`stock-${idx}`}
                    item={item}
                    showTicker={true}
                  />
                ))
              )}
            </div>
          </section>

          <section className="module p-0">
            <div className="px-5 py-3 border-b border-[var(--color-rule-2)]">
              <h3 className="t-h4">
                市场快讯
                <span className="ml-2 text-[var(--color-text-3)] font-normal">
                  {marketNews.length}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-[var(--color-rule-3)] max-h-[calc(100vh-240px)] overflow-y-auto">
              {marketNews.length === 0 ? (
                <p className="t-meta text-[var(--color-text-3)] py-8 text-center">
                  暂无市场快讯
                </p>
              ) : (
                marketNews.map((item, idx) => (
                  <NewsRow
                    key={`market-${idx}`}
                    item={item}
                    showTicker={false}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
