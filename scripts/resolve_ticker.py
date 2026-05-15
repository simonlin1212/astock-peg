#!/usr/bin/env python3
"""
resolve_ticker.py — 中文股票名 → 6位代码解析
用法: python3 resolve_ticker.py "贵州茅台"
输出: JSON {"code": "600519", "name": "贵州茅台"} 或 {"error": "..."}
"""

from __future__ import annotations

import json
import re
import sys
from typing import Optional

_name_to_code: Optional[dict] = None
_code_to_name: Optional[dict] = None


def _build_maps() -> None:
    global _name_to_code, _code_to_name
    if _name_to_code is not None:
        return

    from mootdx.quotes import Quotes

    client = Quotes.factory(market="std")
    n2c: dict[str, str] = {}
    c2n: dict[str, str] = {}

    for market in (0, 1):
        stocks = client.stocks(market=market)
        for _, row in stocks.iterrows():
            code = str(row["code"]).strip()
            name = str(row["name"]).strip()
            if not re.match(r"^[036]\d{5}$", code):
                continue
            clean = name.replace(" ", "").replace("　", "")
            n2c[clean] = code
            c2n[code] = clean

    _name_to_code = n2c
    _code_to_name = c2n


def resolve(query: str) -> dict:
    query = query.strip().replace(" ", "").replace("　", "")

    if re.match(r"^\d{6}$", query):
        return {"code": query, "name": query}

    _build_maps()
    assert _name_to_code is not None

    if query in _name_to_code:
        return {"code": _name_to_code[query], "name": query}

    matches = [(n, c) for n, c in _name_to_code.items() if query in n]
    if len(matches) == 1:
        return {"code": matches[0][1], "name": matches[0][0]}
    if len(matches) > 1:
        hints = ", ".join(f"{n}({c})" for n, c in matches[:5])
        return {"error": f"'{query}' 匹配到多只股票: {hints}，请输入更精确的名称"}

    return {"error": f"找不到股票 '{query}'，请检查名称是否正确"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: resolve_ticker.py <name_or_code>"}))
        sys.exit(1)
    result = resolve(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
