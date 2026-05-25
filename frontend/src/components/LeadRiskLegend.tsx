"use client";

import { LEAD_RISK_LEGEND, METAL_LIMITS } from "../lib/lead-risk";

export default function LeadRiskLegend() {
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/8 space-y-4">
      <div>
        <div className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider font-bold mb-3">
          Heavy Metal Risk Scale (FDA / Codex reference limits)
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
          {LEAD_RISK_LEGEND.map((tier) => (
            <div key={tier.level} className="flex items-center gap-2 font-mono text-xs">
              <span aria-hidden>{tier.emoji}</span>
              <span className={`font-bold ${tier.textClass}`}>{tier.label}</span>
              <span className="text-on-surface-variant/80">(relative to limit)</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[9px] text-on-surface-variant/90 border-t border-white/5 pt-3">
        {(Object.entries(METAL_LIMITS) as [keyof typeof METAL_LIMITS, (typeof METAL_LIMITS)["Pb"]][]).map(
          ([symbol, limits]) => (
            <div key={symbol}>
              <span className="text-white/90 font-bold">{limits.label}</span>
              <br />
              Safe &lt; {limits.safeMax} ppm · Limit {limits.cautionMax} ppm
            </div>
          )
        )}
      </div>
    </div>
  );
}
