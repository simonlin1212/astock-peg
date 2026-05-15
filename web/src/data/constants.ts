export type SectorKey = "robot" | "ai" | "chip" | "biotech" | "energy" | "consumer" | "finance" | "other";

export interface WatchlistStock {
  ticker: string;
  name: string;
  sectorKey: SectorKey;
  pe26e: string;
  cagr: string;
  peg: number;
  digest: string;
  status: "watch" | "analyzed";
  statusLabel: string;
  price?: number;
  changePct?: number;
  peTtm?: number;
  pb?: number;
  marketCap?: number;
}

export const SECTOR_LABELS: Record<SectorKey, { zh: string; color: string }> = {
  robot: { zh: "机器人", color: "var(--color-sector-robot)" },
  ai: { zh: "AI算力", color: "var(--color-sector-ai)" },
  chip: { zh: "芯片", color: "var(--color-sector-optics)" },
  biotech: { zh: "生物医药", color: "var(--color-sector-drug)" },
  energy: { zh: "新能源", color: "var(--color-sector-grid)" },
  consumer: { zh: "消费", color: "var(--color-warning)" },
  finance: { zh: "金融", color: "var(--color-info)" },
  other: { zh: "其他", color: "var(--color-text-3)" },
};
