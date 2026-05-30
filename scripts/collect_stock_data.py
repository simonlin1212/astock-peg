#!/usr/bin/env python3
"""
collect_stock_data.py — 一键采集单只股票的全量分析数据
用法: python3 collect_stock_data.py 688017
输出: JSON 到 stdout
"""

import os
import sys
import json
import math
import re
import urllib.request
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datafeeds as feeds  # noqa: E402


def detect_market(ticker: str) -> str:
    return "sh" if ticker.startswith("6") else "sz"


def safe_float(fields, idx):
    try:
        return float(fields[idx])
    except (IndexError, ValueError):
        return None


def safe_val(row, key):
    try:
        v = row.get(key, None)
        if v is None:
            return None
        import numpy as np
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            return float(v)
        return v
    except Exception:
        return None


def fetch_tencent_quote(ticker: str) -> dict:
    market = detect_market(ticker)
    url = f"http://qt.gtimg.cn/q={market}{ticker}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode("gbk", errors="replace")

    match = re.search(r'v_\w+="(.+)"', raw)
    if not match:
        return {"error": f"No data for {ticker}"}

    f = match.group(1).split("~")
    return {
        "name": f[1] if len(f) > 1 else "",
        "market": market,
        "price": safe_float(f, 3),
        "prevClose": safe_float(f, 4),
        "open": safe_float(f, 5),
        "high": safe_float(f, 33),
        "low": safe_float(f, 34),
        "volume": safe_float(f, 36),
        "turnover_pct": safe_float(f, 38),
        "pe_ttm": safe_float(f, 39),
        "market_cap_yi": safe_float(f, 44),
        "float_cap_yi": safe_float(f, 45),
        "pb": safe_float(f, 46),
        "pe_static": safe_float(f, 52),
    }


def fetch_consensus_eps(ticker: str) -> list:
    try:
        return feeds.ths_eps_forecast(ticker, limit=20)
    except Exception as e:
        return [{"error": str(e)}]


def fetch_research_reports(ticker: str) -> list:
    try:
        return feeds.eastmoney_reports(ticker, limit=15)
    except Exception as e:
        return [{"error": str(e)}]


def fetch_news(ticker: str) -> list:
    try:
        return feeds.eastmoney_stock_news(ticker, page_size=10)
    except Exception as e:
        return [{"error": str(e)}]


def fetch_financial_snapshot(ticker: str) -> dict:
    try:
        from mootdx.quotes import Quotes
        client = Quotes.factory(market="std")
        df = client.finance(symbol=ticker)
        if df is not None and not df.empty:
            row = df.iloc[0]
            return {k: safe_val(row, k) for k in row.index}
    except Exception as e:
        return {"error": str(e)}
    return {}


def fetch_f10_overview(ticker: str) -> dict:
    try:
        from mootdx.quotes import Quotes
        client = Quotes.factory(market="std")
        overview = client.F10(symbol=ticker, name="最新提示")
        if overview:
            text = overview if isinstance(overview, str) else str(overview)
            return {"overview": text[:3000]}
    except Exception as e:
        return {"error": str(e)}
    return {}


def fetch_growth_history(ticker: str) -> list:
    try:
        return feeds.sina_income_statement(ticker, limit=8)
    except Exception:
        return []


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 collect_stock_data.py <ticker>"}))
        sys.exit(1)

    ticker = sys.argv[1].strip()
    if len(ticker) != 6 or not ticker.isdigit():
        print(json.dumps({"error": f"Invalid ticker: {ticker}"}))
        sys.exit(1)

    result = {
        "ticker": ticker,
        "collected_at": datetime.now().isoformat(),
    }

    result["quote"] = fetch_tencent_quote(ticker)
    result["consensus_eps"] = fetch_consensus_eps(ticker)
    result["research_reports"] = fetch_research_reports(ticker)
    result["news"] = fetch_news(ticker)
    result["financial"] = fetch_financial_snapshot(ticker)
    result["f10"] = fetch_f10_overview(ticker)
    result["growth_history"] = fetch_growth_history(ticker)

    def sanitize(obj):
        """Recursively replace NaN/Inf with None for valid JSON."""
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        return obj

    print(json.dumps(sanitize(result), ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
