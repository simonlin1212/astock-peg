export interface SectorStock {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  peTtm: number;
  pb: number;
  marketCap: number;
  peg: number | null;
}

export interface AnalysisRecord {
  id: string;
  ticker: string;
  name: string;
  date: string;
  status: "collecting" | "analyzing" | "completed" | "failed";
  conclusion?: string;
  pegRating?: string;
  error?: string;
  report?: string | null;
}
