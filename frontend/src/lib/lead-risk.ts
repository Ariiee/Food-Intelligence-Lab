/** FDA-style lead (Pb) risk tiers for spectrometry reports. */

export const PB_SAFE_MAX = 0.01;
export const PB_CAUTION_MAX = 0.1;

// Additional metal thresholds (FDA-style limits used as caution maxima).
export const CD_CAUTION_MAX = 0.05;
export const HG_CAUTION_MAX = 0.01;
export const AS_CAUTION_MAX = 0.1;

// Safe maxima set to roughly 10% of the caution FDA limit (tunable).
export const CD_SAFE_MAX = 0.005;
export const HG_SAFE_MAX = 0.001;
export const AS_SAFE_MAX = 0.01;

export type LeadRiskLevel = "safe" | "caution" | "contaminated";

export interface LeadRiskInfo {
  level: LeadRiskLevel;
  label: string;
  emoji: string;
  /** ASCII marker for PDF / plain-text reports (no Unicode symbols). */
  pdfMarker: string;
  description: string;
  badgeClass: string;
  barClass: string;
  borderClass: string;
  textClass: string;
  pdfRgb: [number, number, number];
}

export const RISK_TABLE: Record<LeadRiskLevel, LeadRiskInfo> = {
  safe: {
    level: "safe",
    label: "Safe",
    emoji: "🟢",
    pdfMarker: "[SAFE]",
    description: "<0.01 ppm Pb",
    badgeClass: "bg-accent-green/20 text-accent-green border-accent-green/30",
    barClass: "bg-accent-green",
    borderClass: "border-accent-green/30",
    textClass: "text-accent-green",
    pdfRgb: [34, 160, 60],
  },
  caution: {
    level: "caution",
    label: "Caution",
    emoji: "🟡",
    pdfMarker: "[CAUTION]",
    description: "0.01-0.1 ppm Pb",
    badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/35",
    barClass: "bg-yellow-400",
    borderClass: "border-yellow-500/35",
    textClass: "text-yellow-400",
    pdfRgb: [200, 160, 0],
  },
  contaminated: {
    level: "contaminated",
    label: "Contaminated",
    emoji: "🔴",
    pdfMarker: "[CONTAMINATED]",
    description: ">0.1 ppm Pb",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/35",
    barClass: "bg-red-500",
    borderClass: "border-red-500/35",
    textClass: "text-red-400",
    pdfRgb: [200, 50, 50],
  },
};

export const LEAD_RISK_LEGEND = [
  RISK_TABLE.safe,
  RISK_TABLE.caution,
  RISK_TABLE.contaminated,
] as const;

export function getLeadRiskLevel(ppm: number): LeadRiskLevel {
  if (ppm < PB_SAFE_MAX) return "safe";
  if (ppm <= PB_CAUTION_MAX) return "caution";
  return "contaminated";
}

export function getLeadRisk(ppm: number): LeadRiskInfo {
  return RISK_TABLE[getLeadRiskLevel(ppm)];
}

/** Map Pb ppm to display toxicity grade (Safe / Caution / Contaminated). */
export function toxicityGradeFromLead(ppm: number): string {
  return getLeadRisk(ppm).label;
}

/**
 * Determine a toxicity grade from any of the four tracked metals.
 * Returns the worst-case label among Pb, Cd, Hg, As (Contaminated > Caution > Safe).
 */
export function toxicityGradeFromMetals(
  trace_pb = 0,
  trace_cd = 0,
  trace_hg = 0,
  trace_as = 0
): string {
  const levels: Array<"safe" | "caution" | "contaminated"> = [];

  // Pb follows existing thresholds
  levels.push(getLeadRiskLevel(trace_pb));

  // Cd
  if (trace_cd < CD_SAFE_MAX) levels.push("safe");
  else if (trace_cd <= CD_CAUTION_MAX) levels.push("caution");
  else levels.push("contaminated");

  // Hg
  if (trace_hg < HG_SAFE_MAX) levels.push("safe");
  else if (trace_hg <= HG_CAUTION_MAX) levels.push("caution");
  else levels.push("contaminated");

  // As
  if (trace_as < AS_SAFE_MAX) levels.push("safe");
  else if (trace_as <= AS_CAUTION_MAX) levels.push("caution");
  else levels.push("contaminated");

  if (levels.includes("contaminated")) return RISK_TABLE.contaminated.label;
  if (levels.includes("caution")) return RISK_TABLE.caution.label;
  return RISK_TABLE.safe.label;
}

export function leadBarPercent(ppm: number): number {
  return metalBarPercent(ppm, PB_CAUTION_MAX);
}

/** Generic risk tier for any heavy metal using safe/caution ppm limits. */
export function getMetalRiskLevel(
  ppm: number,
  safeMax: number,
  cautionMax: number
): LeadRiskLevel {
  if (ppm < safeMax) return "safe";
  if (ppm <= cautionMax) return "caution";
  return "contaminated";
}

export function getMetalRisk(
  ppm: number,
  safeMax: number,
  cautionMax: number
): LeadRiskInfo {
  return RISK_TABLE[getMetalRiskLevel(ppm, safeMax, cautionMax)];
}

export function metalBarPercent(ppm: number, cautionMax: number): number {
  return Math.min(100, (ppm / cautionMax) * 100);
}

export const METAL_LIMITS = {
  Pb: { safeMax: PB_SAFE_MAX, cautionMax: PB_CAUTION_MAX, label: "Lead (Pb)" },
  Cd: { safeMax: CD_SAFE_MAX, cautionMax: CD_CAUTION_MAX, label: "Cadmium (Cd)" },
  Hg: { safeMax: HG_SAFE_MAX, cautionMax: HG_CAUTION_MAX, label: "Mercury (Hg)" },
  As: { safeMax: AS_SAFE_MAX, cautionMax: AS_CAUTION_MAX, label: "Arsenic (As)" },
} as const;

export type MetalSymbol = keyof typeof METAL_LIMITS;

export function getMetalRiskBySymbol(symbol: MetalSymbol, ppm: number): LeadRiskInfo {
  const limits = METAL_LIMITS[symbol];
  return getMetalRisk(ppm, limits.safeMax, limits.cautionMax);
}

export function metalBarPercentBySymbol(symbol: MetalSymbol, ppm: number): number {
  return metalBarPercent(ppm, METAL_LIMITS[symbol].cautionMax);
}

export function buildLeadToxicityReport(ppm: number): string {
  const risk = getLeadRisk(ppm);
  return `${risk.pdfMarker} Lead (Pb) risk: ${risk.label} - ${ppm.toFixed(4)} ppm (${risk.description}).`;
}

/** Strip emoji / non-Latin symbols so jsPDF Helvetica renders cleanly. */
export function pdfSafeText(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ContaminantInfo {
  name: string;
  symbol: string;
  ppm: number;
  limit: number;
  level: LeadRiskLevel;
  emoji: string;
  description: string;
}

export function getWorstContaminant(
  trace_pb = 0,
  trace_cd = 0,
  trace_hg = 0,
  trace_as = 0
): ContaminantInfo {
  const list = [
    { name: "Lead", symbol: "Pb", ppm: trace_pb, safeMax: PB_SAFE_MAX, cautionMax: PB_CAUTION_MAX },
    { name: "Cadmium", symbol: "Cd", ppm: trace_cd, safeMax: CD_SAFE_MAX, cautionMax: CD_CAUTION_MAX },
    { name: "Mercury", symbol: "Hg", ppm: trace_hg, safeMax: HG_SAFE_MAX, cautionMax: HG_CAUTION_MAX },
    { name: "Arsenic", symbol: "As", ppm: trace_as, safeMax: AS_SAFE_MAX, cautionMax: AS_CAUTION_MAX },
  ];

  let worstItem = list[0];
  let worstLevelValue = 0; // 0 = safe, 1 = caution, 2 = contaminated

  const getLevelVal = (ppm: number, safeMax: number, cautionMax: number) => {
    if (ppm >= cautionMax) return 2;
    if (ppm >= safeMax) return 1;
    return 0;
  };

  const getRatio = (ppm: number, cautionMax: number) => ppm / cautionMax;

  for (const item of list) {
    const levelVal = getLevelVal(item.ppm, item.safeMax, item.cautionMax);
    if (levelVal > worstLevelValue) {
      worstLevelValue = levelVal;
      worstItem = item;
    } else if (levelVal === worstLevelValue) {
      const itemRatio = getRatio(item.ppm, item.cautionMax);
      const worstRatio = getRatio(worstItem.ppm, worstItem.cautionMax);
      if (itemRatio > worstRatio) {
        worstItem = item;
      }
    }
  }

  const level: LeadRiskLevel =
    worstLevelValue === 2 ? "contaminated" : worstLevelValue === 1 ? "caution" : "safe";
  
  const info = RISK_TABLE[level];

  return {
    name: worstItem.name,
    symbol: worstItem.symbol,
    ppm: worstItem.ppm,
    limit: worstItem.cautionMax,
    level,
    emoji: info.emoji,
    description: `${worstItem.ppm.toFixed(4)} ppm vs limit of ${worstItem.cautionMax} ppm`,
  };
}

/** Resolve worst-case safety grade based on all 4 heavy metals. */
export function resolveSafetyGrade(scan: {
  trace_pb?: number;
  trace_cd?: number;
  trace_hg?: number;
  trace_as?: number;
  toxicity_grade?: string;
}): LeadRiskInfo {
  // Use aggregated worst-case heavy metal toxicity
  const aggregatedLabel = toxicityGradeFromMetals(
    scan.trace_pb ?? 0,
    scan.trace_cd ?? 0,
    scan.trace_hg ?? 0,
    scan.trace_as ?? 0
  );
  const grade = (scan.toxicity_grade ?? aggregatedLabel).toLowerCase();
  if (grade === "safe") return RISK_TABLE.safe;
  if (grade === "caution") return RISK_TABLE.caution;
  return RISK_TABLE.contaminated;
}
