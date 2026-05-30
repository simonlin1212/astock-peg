#!/usr/bin/env python3
"""
datafeeds.py — 直连 HTTP 数据源（替代 akshare，零第三方数据封装依赖）

替代的 akshare 接口：
  stock_news_em                  → eastmoney_stock_news   (东财 search-api-web)
  stock_info_global_cls          → eastmoney_global_news  (东财 np-weblist；财联社已下线)
  stock_zh_a_disclosure_*_cninfo → cninfo_announcements    (巨潮 cninfo)
  stock_profit_forecast_ths      → ths_eps_forecast        (同花顺 10jqka)
  stock_research_report_em       → eastmoney_reports       (东财 reportapi)
  stock_financial_abstract_ths   → sina_income_statement   (新浪财报·利润表，多期成长)

东财(eastmoney.com)系接口有访问频率风控，统一经 em_get() 串行限流防封。
实现移植自姊妹项目 a-stock-data（已实测）。
"""

from __future__ import annotations

import json
import re
import time
import random
import uuid
from datetime import datetime

import requests

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# ── 东财防封：全局节流 + 会话复用（所有 eastmoney.com 请求走 em_get）──────────
# 东财风控：每秒 >5 次 / 并发 ≥10 / 1 分钟 ≥200 次 → 临时封 IP。
EM_SESSION = requests.Session()
EM_SESSION.headers.update({"User-Agent": UA})
EM_MIN_INTERVAL = 1.0
_em_last_call = [0.0]


def em_get(url: str, params: dict | None = None, headers: dict | None = None,
           timeout: int = 15, **kwargs):
    """东财统一请求入口：串行限流（最小间隔 + 随机抖动）+ 复用 session + 默认 UA。"""
    wait = EM_MIN_INTERVAL - (time.time() - _em_last_call[0])
    if wait > 0:
        time.sleep(wait + random.uniform(0.1, 0.5))
    try:
        return EM_SESSION.get(url, params=params, headers=headers, timeout=timeout, **kwargs)
    finally:
        _em_last_call[0] = time.time()


# ── 东财个股新闻（search-api-web JSONP）─────────────────────────────────────
def eastmoney_stock_news(code: str, page_size: int = 15) -> list[dict]:
    """返回 [{title, content, time, source, url}]（字段名兼容前端防御式查找）。"""
    url = "https://search-api-web.eastmoney.com/search/jsonp"
    inner = json.dumps({
        "uid": "", "keyword": code, "type": ["cmsArticleWebOld"],
        "client": "web", "clientType": "web", "clientVersion": "curr",
        "param": {"cmsArticleWebOld": {"searchScope": "default", "sort": "default",
                  "pageIndex": 1, "pageSize": page_size, "preTag": "", "postTag": ""}},
    }, separators=(",", ":"))
    headers = {"User-Agent": UA, "Referer": "https://so.eastmoney.com/"}
    r = em_get(url, params={"cb": "jQuery_news", "param": inner}, headers=headers, timeout=15)
    text = r.text
    d = json.loads(text[text.index("(") + 1: text.rindex(")")])
    rows = []
    # result.cmsArticleWebOld 直接是文章列表（非 {list:[...]} 嵌套）
    for a in d.get("result", {}).get("cmsArticleWebOld", []) or []:
        rows.append({
            "title": re.sub(r"<[^>]+>", "", a.get("title", "")),
            "content": re.sub(r"<[^>]+>", "", a.get("content", ""))[:200],
            "time": a.get("date", ""),
            "source": a.get("mediaName", ""),
            "url": a.get("url", ""),
        })
    return rows


# ── 东财全球资讯（np-weblist 7x24，替代已下线的财联社 stock_info_global_cls）──
def eastmoney_global_news(page_size: int = 30) -> list[dict]:
    """返回 [{title, content, time, source}]。"""
    url = "https://np-weblist.eastmoney.com/comm/web/getFastNewsList"
    params = {
        "client": "web", "biz": "web_724", "fastColumn": "102", "sortEnd": "",
        "pageSize": str(page_size), "req_trace": str(uuid.uuid4()),
    }
    headers = {"User-Agent": UA, "Referer": "https://kuaixun.eastmoney.com/"}
    r = em_get(url, params=params, headers=headers, timeout=10)
    d = r.json()
    rows = []
    for item in d.get("data", {}).get("fastNewsList", []):
        rows.append({
            "title": item.get("title", ""),
            "content": (item.get("summary", "") or "")[:200],
            "time": item.get("showTime", ""),
            "source": "东财·全球资讯",
        })
    return rows


# ── 东财研报（reportapi）────────────────────────────────────────────────────
def eastmoney_reports(code: str, max_pages: int = 2, limit: int = 15) -> list[dict]:
    """返回研报记录（含 title/orgSName/publishDate/infoCode 等原始字段）。"""
    REPORT_API = "https://reportapi.eastmoney.com/report/list"
    records: list[dict] = []
    for page in range(1, max_pages + 1):
        params = {
            "industryCode": "*", "pageSize": "50", "industry": "*",
            "rating": "*", "ratingChange": "*",
            "beginTime": "2000-01-01", "endTime": "2030-01-01",
            "pageNo": str(page), "fields": "", "qType": "0",
            "orgCode": "", "code": code, "rcode": "",
            "p": str(page), "pageNum": str(page), "pageNumber": str(page),
        }
        r = em_get(REPORT_API, params=params,
                   headers={"Referer": "https://data.eastmoney.com/"}, timeout=30)
        rows = r.json().get("data") or []
        if not rows:
            break
        records.extend(rows)
        if len(records) >= limit:
            break
    return records[:limit]


# ── 巨潮公告（cninfo）───────────────────────────────────────────────────────
def _cninfo_ts_to_date(ts) -> str:
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
    return str(ts)[:10] if ts else ""


def cninfo_announcements(code: str, page_size: int = 10) -> list[dict]:
    """返回 [{title, type, date, url}]。"""
    url = "https://www.cninfo.com.cn/new/hisAnnouncement/query"
    if code.startswith("6"):
        org_id = f"gssh0{code}"
    elif code.startswith("8") or code.startswith("4"):
        org_id = f"gsbj0{code}"
    else:
        org_id = f"gssz0{code}"
    payload = {
        "stock": f"{code},{org_id}", "tabName": "fulltext",
        "pageSize": str(page_size), "pageNum": "1", "column": "", "category": "",
        "plate": "", "seDate": "", "searchkey": "", "secid": "",
        "sortName": "", "sortType": "", "isHLtitle": "true",
    }
    headers = {
        "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.cninfo.com.cn/new/disclosure",
        "Origin": "https://www.cninfo.com.cn",
    }
    r = requests.post(url, data=payload, headers=headers, timeout=15)
    rows = []
    for item in r.json().get("announcements", []) or []:
        rows.append({
            "title": item.get("announcementTitle", ""),
            "type": item.get("announcementTypeName", ""),
            "date": _cninfo_ts_to_date(item.get("announcementTime")),
            "url": f"https://www.cninfo.com.cn/new/disclosure/detail?annoId={item.get('announcementId', '')}",
        })
    return rows


# ── 同花顺一致预期 EPS（10jqka HTML 表格）───────────────────────────────────
def ths_eps_forecast(code: str, limit: int = 20) -> list[dict]:
    """返回机构一致预期 EPS 记录（年度/预测机构数/最小值/均值/最大值）。"""
    import pandas as pd
    from io import StringIO

    url = f"https://basic.10jqka.com.cn/new/{code}/worth.html"
    headers = {"User-Agent": UA, "Referer": "https://basic.10jqka.com.cn/"}
    r = requests.get(url, headers=headers, timeout=15)
    r.encoding = "gbk"
    # match= 只解析含"每股收益"的目标表，避免解析整页 30+ 表格
    try:
        dfs = pd.read_html(StringIO(r.text), match="每股收益")
    except ValueError:
        dfs = pd.read_html(StringIO(r.text))
    target = dfs[0] if dfs else pd.DataFrame()
    return target.head(limit).to_dict(orient="records")


# ── 新浪财报·利润表（多期成长：营收/净利润/EPS）────────────────────────────
_GROWTH_ITEMS = {
    "营业总收入", "营业收入", "净利润", "归属于母公司所有者的净利润",
    "基本每股收益", "扣除非经常性损益后的净利润",
}
_GROWTH_YOY = {"营业总收入", "营业收入", "净利润", "归属于母公司所有者的净利润"}


def sina_income_statement(code: str, limit: int = 8) -> list[dict]:
    """返回最近 N 期利润表关键项（营收/净利润/EPS + 同比），替代成长历史。

    新浪结构：result.data.report_list 是按报告期(如 '20260331')的 dict，
    每期 data 为行项列表 [{item_title, item_value, item_tongbi}]。
    """
    prefix = "sh" if code.startswith("6") else "sz"
    url = "https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022"
    params = {"paperCode": f"{prefix}{code}", "source": "lrb",
              "type": "0", "page": "1", "num": str(limit)}
    r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=15)
    report_list = r.json().get("result", {}).get("data", {}).get("report_list", {}) or {}
    rows = []
    for period in sorted(report_list.keys(), reverse=True)[:limit]:
        obj = report_list[period]
        rec = {"报告期": f"{period[:4]}-{period[4:6]}-{period[6:8]}"}
        for it in obj.get("data", []) or []:
            title = it.get("item_title", "")
            if title in _GROWTH_ITEMS:
                rec[title] = it.get("item_value")
                if title in _GROWTH_YOY and it.get("item_tongbi") is not None:
                    rec[title + "_同比"] = it.get("item_tongbi")
        rows.append(rec)
    return rows
