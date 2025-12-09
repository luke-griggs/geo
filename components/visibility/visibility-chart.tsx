"use client";

import { useMemo } from "react";

interface ChartDataPoint {
  date: string;
  visibility: number;
}

interface VisibilityChartProps {
  data: ChartDataPoint[];
  currentScore: number;
}

export function VisibilityChart({ data, currentScore }: VisibilityChartProps) {
  const chartDimensions = useMemo(() => {
    const width = 500;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    return { width, height, padding, chartWidth, chartHeight };
  }, []);

  const { points, pathD, areaD, yAxisLabels, xAxisLabels } = useMemo(() => {
    if (data.length === 0) {
      return {
        points: [],
        pathD: "",
        areaD: "",
        yAxisLabels: [],
        xAxisLabels: [],
      };
    }

    const { chartWidth, chartHeight, padding } = chartDimensions;
    const maxY = 100; // Visibility is always 0-100%
    const minY = 0;

    // Calculate points
    const pts = data.map((d, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
      y:
        padding.top +
        chartHeight -
        ((d.visibility - minY) / (maxY - minY)) * chartHeight,
      ...d,
    }));

    // Create SVG path
    let path = "";
    let area = "";
    if (pts.length > 0) {
      path = pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      area = `${path} L ${pts[pts.length - 1].x} ${
        padding.top + chartHeight
      } L ${pts[0].x} ${padding.top + chartHeight} Z`;
    }

    // Y-axis labels
    const yLabels = [0, 25, 50, 75, 100].map((v) => ({
      value: v,
      y: padding.top + chartHeight - (v / 100) * chartHeight,
    }));

    // X-axis labels (show every few dates)
    const step = Math.max(1, Math.floor(data.length / 5));
    const xLabels = data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d, i) => {
        const originalIndex = data.findIndex((item) => item.date === d.date);
        return {
          label: formatDate(d.date),
          x:
            padding.left +
            (originalIndex / Math.max(data.length - 1, 1)) * chartWidth,
        };
      });

    return {
      points: pts,
      pathD: path,
      areaD: area,
      yAxisLabels: yLabels,
      xAxisLabels: xLabels,
    };
  }, [data, chartDimensions]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-600">
              AI Visibility Score
            </h3>
            <div
              className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 cursor-help"
              title="How often your brand appears in AI responses"
            >
              ?
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            How often your brand appears in AI responses
          </p>
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 mb-6">
        {currentScore.toFixed(1)}%
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
          No data available for the selected period
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            {yAxisLabels.map((label) => (
              <line
                key={label.value}
                x1={chartDimensions.padding.left}
                y1={label.y}
                x2={chartDimensions.width - chartDimensions.padding.right}
                y2={label.y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis labels */}
            {yAxisLabels.map((label) => (
              <text
                key={label.value}
                x={chartDimensions.padding.left - 8}
                y={label.y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-[10px] fill-gray-400"
              >
                {label.value}%
              </text>
            ))}

            {/* X-axis labels */}
            {xAxisLabels.map((label, i) => (
              <text
                key={i}
                x={label.x}
                y={chartDimensions.height - 8}
                textAnchor="middle"
                className="text-[10px] fill-gray-400"
              >
                {label.label}
              </text>
            ))}

            {/* Area under the line */}
            {areaD && (
              <path d={areaD} fill="url(#areaGradient)" opacity="0.3" />
            )}

            {/* Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {points.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#6366f1"
                stroke="white"
                strokeWidth="1.5"
              />
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
