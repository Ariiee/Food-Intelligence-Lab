/** Realistic spectrometry presets for demo / local simulator mode. */

import {
  getWorstContaminant,
  RISK_TABLE,
  toxicityGradeFromMetals,
} from "./lead-risk";
import { computeSafetyScore } from "./safety-score";

export type FoodCategory =
  | "Grain"
  | "Fruit"
  | "Vegetable"
  | "Meat"
  | "Seafood"
  | "Dairy"
  | "Legume"
  | "Beverage";

export interface FoodElementalProfile {
  c_pct: number;
  h_pct: number;
  o_pct: number;
  n_pct: number;
  p_pct: number;
  ca_pct: number;
  mg_pct: number;
  k_pct: number;
  na_pct: number;
  trace_pb: number;
  trace_cd: number;
  trace_hg: number;
  trace_as: number;
}

export interface FoodPreset extends FoodElementalProfile {
  category: FoodCategory;
  protein_pred: number;
  fat_pred: number;
  carbs_pred: number;
  minerals_pred: number;
  vitamins_pred: number;
  quality_grade: string;
  quality_score: number;
  toxicity_grade: string;
  toxicity_score: number;
}

const PRESETS: { match: RegExp; preset: FoodPreset }[] = [
  {
    match: /\b(tuna|salmon|cod|fish|seafood|shrimp|prawn)\b/i,
    preset: {
      category: "Seafood",
      c_pct: 54.2, h_pct: 8.1, o_pct: 28.5, n_pct: 4.6, p_pct: 0.22, ca_pct: 0.02, mg_pct: 0.04, k_pct: 0.31, na_pct: 0.12,
      trace_pb: 0.01, trace_cd: 0.001, trace_hg: 0.08, trace_as: 0.002,
      protein_pred: 29, fat_pred: 5, carbs_pred: 0, minerals_pred: 2.4, vitamins_pred: 1.8,
      quality_grade: "Premium Quality", quality_score: 92.1, toxicity_grade: "Safe", toxicity_score: 6.2,
    },
  },
  {
    match: /\b(chicken|poultry|turkey|breast)\b/i,
    preset: {
      category: "Meat",
      c_pct: 55.8, h_pct: 8.9, o_pct: 27.2, n_pct: 5.0, p_pct: 0.19, ca_pct: 0.01, mg_pct: 0.03, k_pct: 0.28, na_pct: 0.09,
      trace_pb: 0.006, trace_cd: 0.001, trace_hg: 0.0003, trace_as: 0.004,
      protein_pred: 31, fat_pred: 3.6, carbs_pred: 0, minerals_pred: 1.9, vitamins_pred: 1.2,
      quality_grade: "Premium Quality", quality_score: 94.5, toxicity_grade: "Safe", toxicity_score: 4.8,
    },
  },
  {
    match: /\b(avocado|aguacate|hass)\b/i,
    preset: {
      category: "Fruit",
      c_pct: 52.8, h_pct: 7.4, o_pct: 32.5, n_pct: 0.55, p_pct: 0.12, ca_pct: 0.06, mg_pct: 0.08, k_pct: 0.42, na_pct: 0.008,
      trace_pb: 0.004, trace_cd: 0.001, trace_hg: 0.0002, trace_as: 0.002,
      protein_pred: 2.0, fat_pred: 15.0, carbs_pred: 8.5, minerals_pred: 2.8, vitamins_pred: 4.2,
      quality_grade: "Premium Quality", quality_score: 88.5, toxicity_grade: "Safe", toxicity_score: 97,
    },
  },
  {
    match: /\b(wine|red wine|beverage|beer|juice)\b/i,
    preset: {
      category: "Beverage",
      c_pct: 38.8, h_pct: 9.2, o_pct: 51.5, n_pct: 0.12, p_pct: 0.06, ca_pct: 0.03, mg_pct: 0.02, k_pct: 0.18, na_pct: 0.004,
      trace_pb: 0.012, trace_cd: 0.002, trace_hg: 0.0005, trace_as: 0.003,
      protein_pred: 0.1, fat_pred: 0, carbs_pred: 2.6, minerals_pred: 0.8, vitamins_pred: 2.1,
      quality_grade: "Premium Quality", quality_score: 86.4, toxicity_grade: "Safe", toxicity_score: 8.5,
    },
  },
  {
    match: /\b(spinach|lettuce|kale|broccoli|celery|carrot|cabbage)\b/i,
    preset: {
      category: "Vegetable",
      c_pct: 37.5, h_pct: 5.8, o_pct: 52.1, n_pct: 0.72, p_pct: 0.16, ca_pct: 0.12, mg_pct: 0.11, k_pct: 0.42, na_pct: 0.03,
      trace_pb: 0.005, trace_cd: 0.001, trace_hg: 0.0002, trace_as: 0.003,
      protein_pred: 2.9, fat_pred: 0.4, carbs_pred: 3.6, minerals_pred: 4.2, vitamins_pred: 5.8,
      quality_grade: "Standard Quality", quality_score: 78.2, toxicity_grade: "Safe", toxicity_score: 5.1,
    },
  },
  {
    match: /\b(mercury[\s-]?(contaminat|taint|spike)|rice.*mercury|mercury.*rice|high[\s-]?mercury|methylmercury|hg[\s-]?contaminat)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.006, trace_cd: 0.002, trace_hg: 0.048, trace_as: 0.008,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Poor Quality", quality_score: 34.0, toxicity_grade: "Contaminated", toxicity_score: 18.0,
    },
  },
  {
    match: /\b(arsenic[\s-]?(contaminat|taint|spike)|rice.*arsenic|arsenic.*rice|high[\s-]?arsenic)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.006, trace_cd: 0.003, trace_hg: 0.0004, trace_as: 0.42,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Poor Quality", quality_score: 36.5, toxicity_grade: "Contaminated", toxicity_score: 24.0,
    },
  },
  {
    match: /\b(lead[\s-]?(contaminat|taint|spike)|rice.*lead|lead.*rice|high[\s-]?lead|pb[\s-]?contaminat)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.35, trace_cd: 0.003, trace_hg: 0.0004, trace_as: 0.008,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Poor Quality", quality_score: 35.0, toxicity_grade: "Contaminated", toxicity_score: 22.0,
    },
  },
  {
    match: /\b(cadmium[\s-]?(contaminat|taint|spike)|rice.*cadmium|cadmium.*rice|high[\s-]?cadmium|cd[\s-]?contaminat)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.006, trace_cd: 0.12, trace_hg: 0.0004, trace_as: 0.008,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Poor Quality", quality_score: 36.0, toxicity_grade: "Contaminated", toxicity_score: 20.0,
    },
  },
  {
    match: /\b(rice|basmati|jasmine|brown rice|white rice|paddy)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.006, trace_cd: 0.002, trace_hg: 0.0003, trace_as: 0.008,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Standard Quality", quality_score: 72.0, toxicity_grade: "Safe", toxicity_score: 96.0,
    },
  },
  {
    match: /\b(grain|wheat|oat|batch)\b/i,
    preset: {
      category: "Grain",
      c_pct: 44.1, h_pct: 6.2, o_pct: 42.4, n_pct: 1.45, p_pct: 0.29, ca_pct: 0.03, mg_pct: 0.11, k_pct: 0.31, na_pct: 0.011,
      trace_pb: 0.008, trace_cd: 0.003, trace_hg: 0.0005, trace_as: 0.006,
      protein_pred: 8.5, fat_pred: 1.2, carbs_pred: 72.8, minerals_pred: 2.1, vitamins_pred: 1.1,
      quality_grade: "Standard Quality", quality_score: 70.0, toxicity_grade: "Safe", toxicity_score: 95.0,
    },
  },
  {
    match: /\b(apple|berry|orange|banana|mango|pear|grape)\b/i,
    preset: {
      category: "Fruit",
      c_pct: 40.2, h_pct: 6.9, o_pct: 50.8, n_pct: 0.28, p_pct: 0.09, ca_pct: 0.05, mg_pct: 0.03, k_pct: 0.32, na_pct: 0.003,
      trace_pb: 0.008, trace_cd: 0.001, trace_hg: 0.0003, trace_as: 0.002,
      protein_pred: 0.8, fat_pred: 0.2, carbs_pred: 14.2, minerals_pred: 1.5, vitamins_pred: 4.6,
      quality_grade: "Standard Quality", quality_score: 81.0, toxicity_grade: "Safe", toxicity_score: 7.0,
    },
  },
  {
    match: /\b(milk|cheese|dairy|yogurt)\b/i,
    preset: {
      category: "Dairy",
      c_pct: 48.5, h_pct: 7.8, o_pct: 39.2, n_pct: 2.2, p_pct: 0.14, ca_pct: 0.28, mg_pct: 0.03, k_pct: 0.16, na_pct: 0.07,
      trace_pb: 0.004, trace_cd: 0.001, trace_hg: 0.0002, trace_as: 0.002,
      protein_pred: 12.5, fat_pred: 18.2, carbs_pred: 4.8, minerals_pred: 3.8, vitamins_pred: 2.4,
      quality_grade: "Standard Quality", quality_score: 76.5, toxicity_grade: "Safe", toxicity_score: 5.5,
    },
  },
];

const CATEGORY_DEFAULTS: Record<FoodCategory, Omit<FoodPreset, keyof FoodElementalProfile> & FoodElementalProfile> = {
  Meat: {
    category: "Meat",
    c_pct: 55, h_pct: 8.5, o_pct: 28, n_pct: 4.8, p_pct: 0.2, ca_pct: 0.01, mg_pct: 0.04, k_pct: 0.3, na_pct: 0.08,
    trace_pb: 0.008, trace_cd: 0.001, trace_hg: 0.0004, trace_as: 0.004,
    protein_pred: 26, fat_pred: 12, carbs_pred: 0, minerals_pred: 2.0, vitamins_pred: 1.0,
    quality_grade: "Standard Quality", quality_score: 72, toxicity_grade: "Safe", toxicity_score: 6,
  },
  Seafood: {
    category: "Seafood",
    c_pct: 54, h_pct: 8, o_pct: 29, n_pct: 4.5, p_pct: 0.22, ca_pct: 0.02, mg_pct: 0.04, k_pct: 0.31, na_pct: 0.1,
    trace_pb: 0.01, trace_cd: 0.001, trace_hg: 0.05, trace_as: 0.002,
    protein_pred: 28, fat_pred: 6, carbs_pred: 0, minerals_pred: 2.2, vitamins_pred: 1.5,
    quality_grade: "Premium Quality", quality_score: 88, toxicity_grade: "Safe", toxicity_score: 7,
  },
  Vegetable: {
    category: "Vegetable",
    c_pct: 37, h_pct: 6, o_pct: 52, n_pct: 0.8, p_pct: 0.15, ca_pct: 0.1, mg_pct: 0.1, k_pct: 0.4, na_pct: 0.03,
    trace_pb: 0.006, trace_cd: 0.001, trace_hg: 0.0002, trace_as: 0.003,
    protein_pred: 3, fat_pred: 0.5, carbs_pred: 4, minerals_pred: 4, vitamins_pred: 5,
    quality_grade: "Standard Quality", quality_score: 75, toxicity_grade: "Safe", toxicity_score: 5,
  },
  Fruit: {
    category: "Fruit",
    c_pct: 42, h_pct: 7, o_pct: 48, n_pct: 0.35, p_pct: 0.08, ca_pct: 0.05, mg_pct: 0.04, k_pct: 0.32, na_pct: 0.004,
    trace_pb: 0.006, trace_cd: 0.001, trace_hg: 0.0003, trace_as: 0.002,
    protein_pred: 1.2, fat_pred: 0.5, carbs_pred: 12, minerals_pred: 1.6, vitamins_pred: 3.5,
    quality_grade: "Standard Quality", quality_score: 80, toxicity_grade: "Safe", toxicity_score: 96,
  },
  Grain: {
    category: "Grain",
    c_pct: 44, h_pct: 6.2, o_pct: 42, n_pct: 1.4, p_pct: 0.28, ca_pct: 0.03, mg_pct: 0.1, k_pct: 0.3, na_pct: 0.01,
    trace_pb: 0.02, trace_cd: 0.003, trace_hg: 0.001, trace_as: 0.005,
    protein_pred: 9, fat_pred: 1.5, carbs_pred: 70, minerals_pred: 2, vitamins_pred: 1,
    quality_grade: "Standard Quality", quality_score: 68, toxicity_grade: "Safe", toxicity_score: 8,
  },
  Dairy: {
    category: "Dairy",
    c_pct: 48, h_pct: 7.5, o_pct: 39, n_pct: 2.1, p_pct: 0.14, ca_pct: 0.25, mg_pct: 0.03, k_pct: 0.15, na_pct: 0.06,
    trace_pb: 0.005, trace_cd: 0.001, trace_hg: 0.0002, trace_as: 0.002,
    protein_pred: 11, fat_pred: 16, carbs_pred: 5, minerals_pred: 3.5, vitamins_pred: 2.2,
    quality_grade: "Standard Quality", quality_score: 74, toxicity_grade: "Safe", toxicity_score: 5.5,
  },
  Legume: {
    category: "Legume",
    c_pct: 45, h_pct: 6.5, o_pct: 40, n_pct: 3.2, p_pct: 0.35, ca_pct: 0.1, mg_pct: 0.15, k_pct: 0.45, na_pct: 0.02,
    trace_pb: 0.007, trace_cd: 0.001, trace_hg: 0.0003, trace_as: 0.003,
    protein_pred: 18, fat_pred: 2, carbs_pred: 42, minerals_pred: 3.2, vitamins_pred: 2.8,
    quality_grade: "Standard Quality", quality_score: 77, toxicity_grade: "Safe", toxicity_score: 6,
  },
  Beverage: {
    category: "Beverage",
    c_pct: 39, h_pct: 9, o_pct: 51, n_pct: 0.12, p_pct: 0.06, ca_pct: 0.03, mg_pct: 0.02, k_pct: 0.18, na_pct: 0.004,
    trace_pb: 0.01, trace_cd: 0.002, trace_hg: 0.0005, trace_as: 0.003,
    protein_pred: 0.1, fat_pred: 0, carbs_pred: 2.6, minerals_pred: 0.8, vitamins_pred: 2,
    quality_grade: "Premium Quality", quality_score: 84, toxicity_grade: "Safe", toxicity_score: 8,
  },
};

export function matchFoodPreset(sampleName: string): FoodPreset | null {
  const name = sampleName.trim();
  if (!name) return null;
  for (const { match, preset } of PRESETS) {
    if (match.test(name)) return { ...preset };
  }
  return null;
}

export function resolveFoodPreset(sampleName: string, category: string): FoodPreset {
  const matched = matchFoodPreset(sampleName);
  if (matched) return matched;
  const cat = (category in CATEGORY_DEFAULTS ? category : "Vegetable") as FoodCategory;
  return { ...CATEGORY_DEFAULTS[cat] };
}

export function buildQualityExplanation(category: string, preset: FoodPreset): string {
  return `This ${category} sample (${preset.protein_pred}% protein, ${preset.fat_pred}% fat, ${preset.carbs_pred}% carbs) was analyzed using calibrated spectrometry signatures for ${category.toLowerCase()} macronutrient profiles.`;
}

export function buildToxicityReport(traces: FoodElementalProfile): string {
  const worst = getWorstContaminant(
    traces.trace_pb,
    traces.trace_cd,
    traces.trace_hg,
    traces.trace_as
  );
  const grade = toxicityGradeFromMetals(
    traces.trace_pb,
    traces.trace_cd,
    traces.trace_hg,
    traces.trace_as
  );
  const marker = RISK_TABLE[worst.level].pdfMarker;
  const metals = `Pb ${traces.trace_pb.toFixed(4)}ppm, Cd ${traces.trace_cd.toFixed(4)}ppm, Hg ${traces.trace_hg.toFixed(5)}ppm, As ${traces.trace_as.toFixed(4)}ppm`;

  let report = `${marker} ${worst.name} (${worst.symbol}) risk: ${grade} — ${worst.ppm.toFixed(4)} ppm (limit ${worst.limit} ppm). Full scan: ${metals}.`;

  if (grade === "Contaminated") {
    report += ` Exceeds food-grade limits for ${worst.name} — batch quarantine recommended.`;
  } else if (grade === "Caution") {
    report += ` Monitor and re-test ${worst.name} before release.`;
  } else {
    report += " All checked metals within standard tolerances.";
  }
  return report;
}

export interface ScanPayload extends FoodElementalProfile {
  name: string;
  category: string;
}

export function buildLocalScanResult(payload: ScanPayload): Record<string, unknown> {
  const preset = resolveFoodPreset(payload.name, payload.category);
  const category =
    (payload.category as FoodCategory) in CATEGORY_DEFAULTS
      ? (payload.category as FoodCategory)
      : preset.category;

  const traces: FoodElementalProfile = {
    c_pct: payload.c_pct,
    h_pct: payload.h_pct,
    o_pct: payload.o_pct,
    n_pct: payload.n_pct,
    p_pct: payload.p_pct,
    ca_pct: payload.ca_pct,
    mg_pct: payload.mg_pct,
    k_pct: payload.k_pct,
    na_pct: payload.na_pct,
    trace_pb: payload.trace_pb,
    trace_cd: payload.trace_cd,
    trace_hg: payload.trace_hg,
    trace_as: payload.trace_as,
  };

  const toxicity = toxicityGradeFromMetals(
    traces.trace_pb,
    traces.trace_cd,
    traces.trace_hg,
    traces.trace_as
  );

  let score = preset.quality_score;
  if (toxicity === "Contaminated") score = Math.min(score, 45);
  else if (toxicity === "Caution") score = Math.min(score, 65);

  let grade = preset.quality_grade;
  if (toxicity === "Contaminated" || score < 40) grade = "Poor Quality";
  else if (score > 78 && toxicity === "Safe") grade = "Premium Quality";
  else if (score >= 55) grade = "Standard Quality";

  return {
    id: Math.floor(Math.random() * 100000),
    ...payload,
    category,
    protein_pred: preset.protein_pred,
    fat_pred: preset.fat_pred,
    carbs_pred: preset.carbs_pred,
    minerals_pred: preset.minerals_pred,
    vitamins_pred: preset.vitamins_pred,
    quality_grade: grade,
    quality_score: score,
    quality_explanation: buildQualityExplanation(category, preset),
    toxicity_grade: toxicity,
    toxicity_score: computeSafetyScore(
      traces.trace_pb,
      traces.trace_cd,
      traces.trace_hg,
      traces.trace_as,
      toxicity
    ),
    toxicity_report: buildToxicityReport(traces),
    confidence: 0.94,
    created_at: new Date().toISOString(),
  };
}

/** Apply preset elemental values to the scanner form. */
export function presetToFormValues(preset: FoodPreset) {
  return {
    category: preset.category,
    cPct: preset.c_pct,
    hPct: preset.h_pct,
    oPct: preset.o_pct,
    nPct: preset.n_pct,
    pPct: preset.p_pct,
    caPct: preset.ca_pct,
    mgPct: preset.mg_pct,
    kPct: preset.k_pct,
    naPct: preset.na_pct,
    tracePb: preset.trace_pb,
    traceCd: preset.trace_cd,
    traceHg: preset.trace_hg,
    traceAs: preset.trace_as,
  };
}

export function createMockArchiveScans(): Record<string, unknown>[] {
  const now = Date.now();
  const samples = [
    "Atlantic Tuna Fillet",
    "Organic Chicken Breast",
    "Premium Red Wine",
    "Fresh Spinach",
    "Hass Avocado",
    "Arsenic-Contaminated Basmati Rice",
  ];
  return samples.map((name, i) => {
    const preset = resolveFoodPreset(name, "Vegetable");
    const payload: ScanPayload = {
      name,
      category: preset.category,
      c_pct: preset.c_pct,
      h_pct: preset.h_pct,
      o_pct: preset.o_pct,
      n_pct: preset.n_pct,
      p_pct: preset.p_pct,
      ca_pct: preset.ca_pct,
      mg_pct: preset.mg_pct,
      k_pct: preset.k_pct,
      na_pct: preset.na_pct,
      trace_pb: preset.trace_pb,
      trace_cd: preset.trace_cd,
      trace_hg: preset.trace_hg,
      trace_as: preset.trace_as,
    };
    const scan = buildLocalScanResult(payload);
    scan.id = 100 + i;
    scan.created_at = new Date(now - 3600000 * (i + 1) * 2).toISOString();
    return scan;
  });
}
