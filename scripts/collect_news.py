#!/usr/bin/env python3
"""
collect_news.py — 采集新闻公告数据（直连 HTTP，零 akshare 依赖）
用法: python collect_news.py [ticker1,ticker2,...]
输出: JSON 到 stdout

数据源（见 datafeeds.py）：
  个股新闻 → 东财 search-api-web
  市场快讯 → 东财全球资讯 np-weblist（替代已下线的财联社）
  公告     → 巨潮 cninfo
"""

import os
import sys
import json
import math
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datafeeds as feeds  # noqa: E402


def sanitize(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


def fetch_stock_news(ticker: str) -> list:
    try:
        rows = feeds.eastmoney_stock_news(ticker, page_size=15)
        for r in rows:
            r["category"] = "stock"
            r["ticker"] = ticker
        return rows
    except Exception as e:
        return [{"error": str(e), "ticker": ticker, "category": "stock"}]


def fetch_market_news() -> list:
    try:
        rows = feeds.eastmoney_global_news(page_size=30)
        for r in rows:
            r["category"] = "market"
        return rows
    except Exception as e:
        return [{"error": str(e), "category": "market"}]


def fetch_announcements(ticker: str) -> list:
    try:
        rows = feeds.cninfo_announcements(ticker, page_size=10)
        for r in rows:
            r["category"] = "announcement"
            r["ticker"] = ticker
        return rows
    except Exception:
        return []


def main():
    tickers = []
    if len(sys.argv) > 1 and sys.argv[1].strip():
        tickers = [t.strip() for t in sys.argv[1].split(",") if t.strip()]

    result = {"collected_at": datetime.now().isoformat()}

    stock_news = []
    for t in tickers:
        stock_news.extend(fetch_stock_news(t))
    result["stock_news"] = stock_news

    result["market_news"] = fetch_market_news()

    announcements = []
    for t in tickers:
        announcements.extend(fetch_announcements(t))
    result["announcements"] = announcements

    print(json.dumps(sanitize(result), ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
