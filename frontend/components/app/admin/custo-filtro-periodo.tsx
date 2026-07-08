"use client";

import { useState } from "react";

interface CustoFiltroPeriodoProps {
  value: string;
  onChange: (periodo: string, de?: string, ate?: string) => void;
}

export default function CustoFiltroPeriodo({ value, onChange }: CustoFiltroPeriodoProps) {
  const [modo, setModo] = useState<"preset" | "custom">(
    value === "7d" || value === "30d" || value === "90d" ? "preset" : "custom"
  );
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const presets = [
    { label: "7 dias", value: "7d" },
    { label: "30 dias", value: "30d" },
    { label: "90 dias", value: "90d" },
  ];

  const handlePreset = (p: string) => {
    setModo("preset");
    onChange(p);
  };

  const handleCustom = () => {
    if (de && ate) {
      setModo("custom");
      onChange("custom", de, ate);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              modo === "preset" && value === preset.value
                ? "bg-teal-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">De</label>
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Até</label>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleCustom}
          disabled={!de || !ate}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            modo === "custom"
              ? "bg-teal-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          }`}
        >
          Customizado
        </button>
      </div>
    </div>
  );
}
