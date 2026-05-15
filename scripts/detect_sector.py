#!/usr/bin/env python3
"""Detect a stock's industry sector and return all peer stock codes."""

import json
import re
import sys

from mootdx.quotes import Quotes


def detect_sector(ticker: str) -> dict:
    client = Quotes.factory(market="std")
    data = client.F10(symbol=ticker, name="category")

    overview = data.get("公司概况", "")
    industry_line = ""
    for line in overview.split("\n"):
        if "行业类别" in line:
            industry_line = line
            break
    industry_match = re.search(r"行业类别\s*｜\s*(.+?)(?:\s*｜|$)", industry_line)
    industry_short = industry_match.group(1).strip() if industry_match else ""

    related = data.get("关联个股", "")
    parts = related.split("【2.同行业个股】")
    section = parts[2] if len(parts) > 2 else (parts[1] if len(parts) > 1 else "")
    end = re.search(r"【3\.股本相近个股】", section)
    if end:
        section = section[: end.start()]

    board_match = re.search(r"【([^】]+)】（共(\d+)家）", section)
    board_name = board_match.group(1).replace("--", "-") if board_match else industry_short

    codes = re.findall(r"\d+\s+(\d{6})\s+(\S+)", section)

    return {
        "industry": board_name,
        "tickers": [c[0] for c in codes],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_sector.py <ticker>"}))
        sys.exit(1)
    result = detect_sector(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
