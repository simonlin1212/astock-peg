#!/usr/bin/env python3
"""Detect a stock's industry sector and return all peer stock codes."""

import json
import re
import sys

from mootdx.quotes import Quotes


# 分隔符在不同 mootdx 版本 / 数据里可能是全角｜、半角|、竖线│ 或冒号
_SEP = r"[｜|│:：]"


def detect_sector(ticker: str) -> dict:
    try:
        client = Quotes.factory(market="std")
        data = client.F10(symbol=ticker, name="category")
    except Exception as exc:  # 网络 / TCP / mootdx 内部错误
        return {"error": f"F10 query failed: {exc}", "industry": "", "tickers": []}

    # 无效代码 / 指数时 F10 会返回结构完全不同的 dict（无「公司概况」「关联个股」），
    # 非 dict（None / str）也可能出现在某些 mootdx 版本——统一安全降级，不抛栈 (#4)
    if not isinstance(data, dict):
        return {"error": "unexpected F10 format (not a dict)", "industry": "", "tickers": []}

    overview = data.get("公司概况", "") or ""
    industry_match = re.search(
        rf"行业类别\s*{_SEP}\s*(.+?)(?:\s*{_SEP}|[\r\n]|$)", overview
    )
    industry_short = industry_match.group(1).strip() if industry_match else ""

    related = data.get("关联个股", "") or ""
    # 容忍编号格式微变（2. / 2． / 2、 / 2 ）与首尾空白
    parts = re.split(r"【\s*2[.．、]?\s*同行业个股\s*】", related)
    section = parts[-1] if len(parts) > 1 else related
    end = re.search(r"【\s*3[.．、]?\s*股本相近个股\s*】", section)
    if end:
        section = section[: end.start()]

    board_match = re.search(r"【([^】]+)】（共\d+家）", section)
    board_name = board_match.group(1).replace("--", "-") if board_match else industry_short

    codes = re.findall(r"\d+\s+(\d{6})\s+\S+", section)

    return {
        "industry": board_name,
        "tickers": codes,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_sector.py <ticker>"}))
        sys.exit(1)
    result = detect_sector(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
