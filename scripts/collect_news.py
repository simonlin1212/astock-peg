#!/usr/bin/env python3
"""
collect_news.py — 采集新闻公告数据
用法: python3 collect_news.py [ticker1,ticker2,...]
输出: JSON 到 stdout
"""

import sys
import json
import math
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")


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
        import akshare as ak
        df = ak.stock_news_em(symbol=ticker)
        if df is not None and not df.empty:
            rows = df.head(15).to_dict(orient="records")
            for r in rows:
                r["category"] = "stock"
                r["ticker"] = ticker
            return rows
    except Exception as e:
        return [{"error": str(e), "ticker": ticker}]
    return []


def fetch_market_news() -> list:
    try:
        import akshare as ak
        df = ak.stock_info_global_cls()
        if df is not None and not df.empty:
            rows = df.head(30).to_dict(orient="records")
            for r in rows:
                r["category"] = "market"
            return rows
    except Exception as e:
        return [{"error": str(e)}]
    return []


def fetch_announcements(ticker: str) -> list:
    try:
        import akshare as ak
        market = "深交所" if ticker.startswith("0") or ticker.startswith("3") else "上交所"
        df = ak.stock_zh_a_disclosure_report_cninfo(
            symbol=ticker,
            market=market,
        )
        if df is not None and not df.empty:
            rows = df.head(10).to_dict(orient="records")
            for r in rows:
                r["category"] = "announcement"
                r["ticker"] = ticker
            return rows
    except Exception:
        pass
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
