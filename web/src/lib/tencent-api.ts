import iconv from "iconv-lite";

export const TF = {
  NAME: 1,
  PRICE: 3,
  PREV_CLOSE: 4,
  CHANGE_PCT: 32,
  HIGH: 33,
  LOW: 34,
  TURNOVER: 38,
  PE_TTM: 39,
  MARKET_CAP: 44,
  FLOAT_CAP: 45,
  PB: 46,
} as const;

export interface TencentQuote {
  code: string;
  fields: string[];
}

export function detectMarket(ticker: string): "sh" | "sz" {
  return ticker.startsWith("6") ? "sh" : "sz";
}

export async function fetchTencentQuotes(codes: string[]): Promise<TencentQuote[]> {
  const url = `http://qt.gtimg.cn/q=${codes.join(",")}`;
  const resp = await fetch(url, { cache: "no-store" });
  const buffer = Buffer.from(await resp.arrayBuffer());
  const raw = iconv.decode(buffer, "gbk");

  const results: TencentQuote[] = [];
  const lines = raw.split(";").filter((l) => l.includes("="));

  for (const line of lines) {
    const match = line.match(/v_(\w+)="(.+)"/);
    if (!match) continue;
    results.push({
      code: match[1].replace(/^(sh|sz)/, ""),
      fields: match[2].split("~"),
    });
  }

  return results;
}
