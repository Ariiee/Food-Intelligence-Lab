"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  minHeight?: number;
};

export default function ChartWrapper({ children, placeholder, minHeight = 40 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [sizeOk, setSizeOk] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const check = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSizeOk(w > 0 && h >= minHeight);
    };

    check();
    const ro = new ResizeObserver(() => check());
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight]);

  return (
    <div ref={ref} className="w-full h-full">
      {sizeOk ? (
        children
      ) : (
        placeholder ?? (
          <div className="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">
            <div className="text-center">
              <div className="font-mono text-xs mb-1">Chart unavailable</div>
              <div className="text-[11px]">Container size too small to render chart</div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
