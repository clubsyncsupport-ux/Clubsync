"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Starting now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function CountdownTimer({ targetDate, className }: { targetDate: string; className?: string }) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const tick = () => setDiff(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className={className}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">Next event in</p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">{diff === null ? "—" : formatCountdown(diff)}</p>
    </div>
  );
}
