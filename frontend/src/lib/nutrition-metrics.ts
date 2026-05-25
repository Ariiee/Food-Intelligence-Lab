/** Display scales for micronutrient index bars (0–10 index, not percent). */
export const VITAMIN_INDEX_MAX = 10;
export const MINERAL_INDEX_MAX = 10;

export function indexBarPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function formatIndexValue(value: number, max: number): string {
  return `${value.toFixed(2)} / ${max.toFixed(1)}`;
}
