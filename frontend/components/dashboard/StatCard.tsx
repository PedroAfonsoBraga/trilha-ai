"use client";

import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color?: string;
  iconBg?: string;
  format?: "number" | "percent";
  suffix?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  color = "#0D9488",
  iconBg = "#F0FDFA",
  format = "number",
  suffix = "",
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animated counter
    const duration = 1400;
    const start = performance.now();
    const initialValue = 0;
    const targetValue = value;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(initialValue + (targetValue - initialValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formattedValue = format === "percent"
    ? `${displayValue}%`
    : `${displayValue}${suffix}`;

  return (
    <div
      ref={cardRef}
      className="stat-card flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
    >
      <div className="flex-1">
        <p className="label mb-1">{label}</p>
        <p className="font-mono text-[40px] font-extrabold leading-none tracking-tight text-[#1E293B]">
          {formattedValue}
        </p>
        <p className="mt-1 text-[13px] font-normal text-[#64748B] font-satoshi">
          {sub}
        </p>
      </div>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: iconBg, color }}
      >
        {icon}
      </div>
    </div>
  );
}
