import { getLeadRiskLevel, toxicityGradeFromLead, toxicityGradeFromMetals } from "./lead-risk";

/**
 * Safety score 0–100 where higher = safer (not toxicity).
 * Safe samples with low metals typically score 92–99.
 */
export function computeSafetyScore(
  trace_pb: number,
  trace_cd = 0,
  trace_hg = 0,
  trace_as = 0,
  toxicityGrade?: string
): number {
  const grade = toxicityGrade ?? toxicityGradeFromMetals(trace_pb, trace_cd, trace_hg, trace_as);
  const metalLoad =
    trace_pb * 100 + trace_cd * 60 + trace_hg * 500 + trace_as * 40;

  if (grade === "Safe") {
    return Math.round(Math.max(92, Math.min(99, 99 - metalLoad)));
  }
  if (grade === "Caution") {
    return Math.round(Math.max(62, Math.min(84, 80 - metalLoad * 0.4)));
  }
  return Math.round(Math.max(10, Math.min(42, 38 - metalLoad * 0.15)));
}

/** @deprecated Use computeSafetyScore — kept for field name compatibility in API payloads. */
export function computeToxicityScore(
  trace_pb: number,
  trace_cd = 0,
  trace_hg = 0,
  trace_as = 0,
  toxicityGrade?: string
): number {
  return computeSafetyScore(trace_pb, trace_cd, trace_hg, trace_as, toxicityGrade);
}
