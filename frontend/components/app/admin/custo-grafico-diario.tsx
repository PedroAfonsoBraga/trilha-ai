"use client";

import { useMemo, useState } from "react";
import { CustoPorDia } from "@/types/admin";

interface CustoGraficoDiarioProps {
  serie: CustoPorDia[];
  height?: number;
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export default function CustoGraficoDiario({
  serie,
  height = 280,
}: CustoGraficoDiarioProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dados = useMemo(() => {
    // Garante ordenação crescente por data
    return [...serie].sort((a, b) => a.data.localeCompare(b.data));
  }, [serie]);

  const { pontos, labelsY } = useMemo(() => {
    const valores = dados.map((d) => d.custo);
    const maxRaw = Math.max(...valores, 0.001);
    // Arredonda max para cima para deixar respiro
    const maxValue = Math.ceil(maxRaw * 1.1 * 100) / 100 || 0.01;

    const paddingX = 48;
    const paddingY = 24;
    const width = 800;
    const graphHeight = height - paddingY * 2;
    const graphWidth = width - paddingX;

    const stepX = dados.length > 1 ? graphWidth / (dados.length - 1) : graphWidth;

    const pontosCalculados = dados.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingY + graphHeight - (d.custo / maxValue) * graphHeight;
      return { x, y, ...d };
    });

    const labelsY = [0, maxValue / 2, maxValue].map((v) => ({
      value: v,
      y: paddingY + graphHeight - (v / maxValue) * graphHeight,
    }));

    return { pontos: pontosCalculados, labelsY };
  }, [dados, height]);

  const polylinePoints = pontos.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Custo diário
      </h2>

      <div className="relative mt-4 overflow-hidden">
        <svg
          viewBox={`0 0 800 ${height}`}
          className="w-full"
          style={{ height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Grid horizontal */}
          {labelsY.map((l, i) => (
            <g key={i}>
              <line
                x1={48}
                y1={l.y}
                x2={800}
                y2={l.y}
                stroke="#334155"
                strokeDasharray="4 4"
              />
              <text
                x={40}
                y={l.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
              >
                {formatUsd(l.value)}
              </text>
            </g>
          ))}

          {/* Linha */}
          {pontos.length > 1 && (
            <polyline
              fill="none"
              stroke="#0d9488"
              strokeWidth={2}
              points={polylinePoints}
            />
          )}

          {/* Pontos e área de hover */}
          {pontos.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === i ? 5 : 3}
                fill={hoverIndex === i ? "#2dd4bf" : "#0d9488"}
                className="transition-all"
              />
              <rect
                x={p.x - (800 / pontos.length / 2)}
                y={0}
                width={800 / pontos.length}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            </g>
          ))}

          {/* Tooltip */}
          {hoverIndex !== null && pontos[hoverIndex] && (
            <g>
              <rect
                x={Math.min(pontos[hoverIndex].x + 12, 700)}
                y={pontos[hoverIndex].y - 44}
                width={140}
                height={40}
                rx={6}
                fill="#1e293b"
                stroke="#334155"
              />
              <text
                x={Math.min(pontos[hoverIndex].x + 20, 708)}
                y={pontos[hoverIndex].y - 26}
                className="fill-slate-200 text-[11px]"
              >
                {new Date(pontos[hoverIndex].data).toLocaleDateString("pt-BR")}
              </text>
              <text
                x={Math.min(pontos[hoverIndex].x + 20, 708)}
                y={pontos[hoverIndex].y - 12}
                className="fill-teal-400 text-[12px] font-semibold"
              >
                {formatUsd(pontos[hoverIndex].custo)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
