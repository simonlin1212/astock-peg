import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";
import path from "path";
import { TF, detectMarket as detectMkt, fetchTencentQuotes } from "./tencent-api";

/* -- Interfaces ----------------------------------------- */

export interface StockConfig {
  ticker: string;
  name: string;
  market: "sh" | "sz";
  sectorKey: string;
  consensusEps26: number;
  cagr: number;
  status: "watch" | "analyzed";
  statusLabel: string;
}

export interface PortfolioData {
  stocks: Record<string, Omit<StockConfig, "ticker">>;
}

/* -- File path ------------------------------------------ */

const PORTFOLIO_PATH = path.join(process.cwd(), "portfolio.json");

/* -- Read / Write --------------------------------------- */

const DEFAULT_PORTFOLIO: PortfolioData = { stocks: {} };

export function readPortfolio(): PortfolioData {
  if (!existsSync(PORTFOLIO_PATH)) {
    writePortfolio(DEFAULT_PORTFOLIO);
    return DEFAULT_PORTFOLIO;
  }
  const raw = readFileSync(PORTFOLIO_PATH, "utf-8");
  return JSON.parse(raw) as PortfolioData;
}

export function writePortfolio(data: PortfolioData): void {
  const tmp = PORTFOLIO_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmp, PORTFOLIO_PATH);
}

/* -- Market detection ----------------------------------- */

export function detectMarket(ticker: string): "sh" | "sz" {
  return detectMkt(ticker);
}

/* -- Tencent API single-stock fetch --------------------- */

export interface StockInfo {
  name: string;
  market: "sh" | "sz";
  price: number;
  peTtm: number;
  pb: number;
  marketCap: number;
}

export async function fetchStockInfo(ticker: string): Promise<StockInfo> {
  const market = detectMarket(ticker);
  const quotes = await fetchTencentQuotes([`${market}${ticker}`]);

  if (quotes.length === 0) {
    throw new Error(`No data returned for ticker ${ticker}`);
  }

  const f = quotes[0].fields;
  return {
    name: f[TF.NAME],
    market,
    price: parseFloat(f[TF.PRICE]),
    peTtm: parseFloat(f[TF.PE_TTM]),
    pb: parseFloat(f[TF.PB]),
    marketCap: parseFloat(f[TF.MARKET_CAP]),
  };
}
