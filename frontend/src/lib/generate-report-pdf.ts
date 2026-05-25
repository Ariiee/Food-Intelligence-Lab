import { jsPDF } from "jspdf";
import { formatScanDate, formatScanTime } from "./format-date";
import {
  LEAD_RISK_LEGEND,
  METAL_LIMITS,
  pdfSafeText,
  resolveSafetyGrade,
  getWorstContaminant,
} from "./lead-risk";
import { computeSafetyScore } from "./safety-score";

export interface ScanReportData {
  name: string;
  category: string;
  created_at?: string;
  confidence?: number;
  protein_pred: number;
  fat_pred: number;
  carbs_pred: number;
  minerals_pred: number;
  vitamins_pred: number;
  quality_grade?: string;
  quality_score?: number;
  quality_explanation?: string;
  toxicity_grade?: string;
  toxicity_score?: number;
  toxicity_report?: string;
  id?: number;
  c_pct?: number;
  h_pct?: number;
  o_pct?: number;
  n_pct?: number;
  trace_pb?: number;
  trace_cd?: number;
  trace_hg?: number;
  trace_as?: number;
}

const MARGIN = 14;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(57, 255, 20);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 2, MARGIN + 50, y + 2);
  return y + 10;
}

function addKeyValue(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(value, MARGIN + 55, y);
  return y + 6;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

export function downloadScanReportPdf(scan: ScanReportData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, PAGE_WIDTH, 32, "F");
  doc.setTextColor(57, 255, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SpectroFood Analytics", MARGIN, 14);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Industrial Spectrometry Nutritional & Safety Analysis Report", MARGIN, 22);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  const generated = new Date();
  doc.text(`Generated: ${generated.toLocaleString("en-US")}`, MARGIN, 28);

  y = 42;
  doc.setTextColor(0, 0, 0);
  y = addSectionTitle(doc, y, "Sample Overview");
  const sampleId = `SF-${String(scan.id ?? "DRAFT").padStart(6, "0")}`;
  y = addKeyValue(doc, y, "Sample ID:", sampleId);
  y = addKeyValue(doc, y, "Sample Name:", scan.name);
  y = addKeyValue(doc, y, "Category:", scan.category);
  if (scan.created_at) {
    y = addKeyValue(
      doc,
      y,
      "Scan Time:",
      `${formatScanTime(scan.created_at)} — ${formatScanDate(scan.created_at)}`
    );
  }
  if (scan.confidence != null) {
    y = addKeyValue(doc, y, "Model Confidence:", `${(scan.confidence * 100).toFixed(1)}%`);
  }
  if (scan.quality_grade) {
    y = addKeyValue(
      doc,
      y,
      "Quality Grade:",
      `${scan.quality_grade}${scan.quality_score != null ? ` (${scan.quality_score.toFixed(1)}%)` : ""}`
    );
  }

  y += 4;
  y = addSectionTitle(doc, y, "Macronutrient Fingerprint");
  y = addKeyValue(doc, y, "Protein:", `${scan.protein_pred.toFixed(1)}%`);
  y = addKeyValue(doc, y, "Fat / Lipids:", `${scan.fat_pred.toFixed(1)}%`);
  y = addKeyValue(doc, y, "Carbohydrates:", `${scan.carbs_pred.toFixed(1)}%`);
  y = addKeyValue(doc, y, "Mineral Index:", `${scan.minerals_pred.toFixed(2)} / 10`);
  y = addKeyValue(doc, y, "Vitamin Index:", `${scan.vitamins_pred.toFixed(2)} / 10`);

  if (scan.quality_explanation) {
    y += 4;
    y = addSectionTitle(doc, y, "Quality Assessment");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = wrapText(doc, scan.quality_explanation, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  }

  y += 2;
  y = addSectionTitle(doc, y, "Safety & Heavy Metals");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text("Heavy metal risk scale (relative to regulatory limits):", MARGIN, y);
  y += 5;
  for (const tier of LEAD_RISK_LEGEND) {
    doc.setTextColor(...tier.pdfRgb);
    doc.text(`${tier.pdfMarker} ${tier.label} (${tier.description})`, MARGIN + 2, y);
    y += 5;
  }
  y += 2;

  const safetyRisk = resolveSafetyGrade(scan);
  const worstMetal = getWorstContaminant(
    scan.trace_pb ?? 0,
    scan.trace_cd ?? 0,
    scan.trace_hg ?? 0,
    scan.trace_as ?? 0
  );
  const safetyScore =
    scan.trace_pb != null
      ? computeSafetyScore(
          scan.trace_pb,
          scan.trace_cd ?? 0,
          scan.trace_hg ?? 0,
          scan.trace_as ?? 0,
          scan.toxicity_grade ?? safetyRisk.label
        )
      : scan.toxicity_score ?? null;

  doc.setTextColor(...safetyRisk.pdfRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    pdfSafeText(
      `${safetyRisk.pdfMarker} Heavy Metal Toxicity Risk: ${safetyRisk.label}`
    ),
    MARGIN,
    y
  );
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    pdfSafeText(
      `Primary contaminant factor: ${worstMetal.name} (${worstMetal.symbol}) at ${worstMetal.ppm.toFixed(4)} ppm (limit: ${worstMetal.limit} ppm)`
    ),
    MARGIN,
    y
  );
  y += 8;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y = addKeyValue(doc, y, "Overall Safety Status:", scan.toxicity_grade ?? safetyRisk.label);
  if (safetyScore != null) {
    y = addKeyValue(
      doc,
      y,
      "Safety Score:",
      `${safetyScore.toFixed(1)} / 100 (higher = safer)`
    );
  }
  if (scan.trace_pb != null) {
    const primary = worstMetal.symbol;
    y = addKeyValue(
      doc,
      y,
      `${METAL_LIMITS.Pb.label}:`,
      `${scan.trace_pb.toFixed(4)} ppm (limit: ${METAL_LIMITS.Pb.cautionMax} ppm)${primary === "Pb" ? " [PRIMARY]" : ""}`
    );
    y = addKeyValue(
      doc,
      y,
      `${METAL_LIMITS.Cd.label}:`,
      `${scan.trace_cd?.toFixed(4) ?? "—"} ppm (limit: ${METAL_LIMITS.Cd.cautionMax} ppm)${primary === "Cd" ? " [PRIMARY]" : ""}`
    );
    y = addKeyValue(
      doc,
      y,
      `${METAL_LIMITS.Hg.label}:`,
      `${scan.trace_hg?.toFixed(5) ?? "—"} ppm (limit: ${METAL_LIMITS.Hg.cautionMax} ppm)${primary === "Hg" ? " [PRIMARY]" : ""}`
    );
    y = addKeyValue(
      doc,
      y,
      `${METAL_LIMITS.As.label}:`,
      `${scan.trace_as?.toFixed(4) ?? "—"} ppm (limit: ${METAL_LIMITS.As.cautionMax} ppm)${primary === "As" ? " [PRIMARY]" : ""}`
    );
  }
  if (scan.toxicity_report) {
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const toxLines = wrapText(doc, pdfSafeText(scan.toxicity_report), CONTENT_WIDTH);
    doc.text(toxLines, MARGIN, y);
    y += toxLines.length * 5;
  }

  if (scan.c_pct != null) {
    y += 6;
    if (y > 250) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, y, "Elemental Composition (%)");
    y = addKeyValue(doc, y, "Carbon (C):", `${scan.c_pct.toFixed(2)}%`);
    y = addKeyValue(doc, y, "Hydrogen (H):", `${scan.h_pct?.toFixed(2) ?? "—"}%`);
    y = addKeyValue(doc, y, "Oxygen (O):", `${scan.o_pct?.toFixed(2) ?? "—"}%`);
    y = addKeyValue(doc, y, "Nitrogen (N):", `${scan.n_pct?.toFixed(2) ?? "—"}%`);
  }

  const footerY = 287;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "SpectroFood Analytics — ICP-MS spectrometry workflow. For laboratory QA and demonstration.",
    MARGIN,
    footerY
  );

  const safeName = scan.name.replace(/[^\w\-]+/g, "_").slice(0, 40);
  doc.save(`FIL_Report_${safeName}_${generated.toISOString().slice(0, 10)}.pdf`);
}
