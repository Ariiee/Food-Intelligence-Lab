"use client";

import { getLeadRisk, type LeadRiskInfo } from "../lib/lead-risk";

interface LeadRiskBadgeProps {
  ppm: number;
  showEmoji?: boolean;
  className?: string;
}

export default function LeadRiskBadge({ ppm, showEmoji = true, className = "" }: LeadRiskBadgeProps) {
  const risk = getLeadRisk(ppm);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border font-mono ${risk.badgeClass} ${className}`}
    >
      {showEmoji && <span aria-hidden>{risk.emoji}</span>}
      {risk.label}
    </span>
  );
}

export function LeadRiskBadgeFromInfo({ risk, showEmoji = true, className = "" }: { risk: LeadRiskInfo; showEmoji?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border font-mono ${risk.badgeClass} ${className}`}
    >
      {showEmoji && <span aria-hidden>{risk.emoji}</span>}
      {risk.label}
    </span>
  );
}
