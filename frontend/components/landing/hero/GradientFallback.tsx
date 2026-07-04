"use client";

export function GradientFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-0 bg-gradient-to-b from-primary/10 via-background to-background animate-pulse"
    />
  );
}
