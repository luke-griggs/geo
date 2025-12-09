"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChartDataPoint {
  date: string;
  visibility: number;
}

interface VisibilityChartProps {
  data: ChartDataPoint[];
  currentScore: number;
}

export function VisibilityChart({ data, currentScore }: VisibilityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Normalize data to show exactly the last 7 days
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: ChartDataPoint[] = [];

    // Create a map of existing data by date for O(1) lookup
    // Handle both YYYY-MM-DD strings and ISO strings
    const dataMap = new Map(
      data.map((d) => [new Date(d.date).toISOString().split("T")[0], d])
    );

    // Generate past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const existing = dataMap.get(dateStr);

      // Determine visibility value
      let visibility: number;

      if (existing !== undefined) {
        // Data point exists - use its value (even if it's legitimately 0)
        visibility = existing.visibility;
      } else if (i === 0 && currentScore > 0) {
        // Today with no data point - use currentScore as fallback
        visibility = currentScore;
      } else {
        // No data point exists - default to 0
        visibility = 0;
      }

      days.push({
        date: dateStr,
        visibility: visibility,
      });
    }

    return days;
  }, [data, currentScore]);

  const chartDimensions = useMemo(() => {
    const width = 500;
    const height = 200; // Increased height slightly
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    return { width, height, padding, chartWidth, chartHeight };
  }, []);

  const { points, pathD, areaD, yAxisLabels, xAxisLabels } = useMemo(() => {
    const { chartWidth, chartHeight, padding } = chartDimensions;
    const maxY = 100; // Visibility is always 0-100%
    const minY = 0;

    // Calculate points
    const pts = chartData.map((d, i) => ({
      x: padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth,
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
      // Use cubic bezier curves for smooth lines
      path = pts.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const prev = pts[i - 1];
        const cpx1 = prev.x + (point.x - prev.x) / 3;
        const cpx2 = prev.x + (2 * (point.x - prev.x)) / 3;
        return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
      }, "");

      area = `${path} L ${pts[pts.length - 1].x} ${
        padding.top + chartHeight
      } L ${pts[0].x} ${padding.top + chartHeight} Z`;
    }

    // Y-axis labels
    const yLabels = [0, 25, 50, 75, 100].map((v) => ({
      value: v,
      y: padding.top + chartHeight - (v / 100) * chartHeight,
    }));

    // X-axis labels (show all 7 days)
    const xLabels = chartData.map((d, i) => {
      return {
        label: formatDate(d.date),
        x: padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth,
      };
    });

    return {
      points: pts,
      pathD: path,
      areaD: area,
      yAxisLabels: yLabels,
      xAxisLabels: xLabels,
    };
  }, [chartData, chartDimensions]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-gray-900">
              AI Visibility Score
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Your overall visibility score showing how often your brand
                    appears in AI responses. Higher scores mean better AI
                    presence.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            How often your brand appears in AI responses
          </p>
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 mb-6">
        {currentScore.toFixed(1)}%
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="visibilityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

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
            <path d={areaD} fill="url(#visibilityGradient)" opacity="0.3" />
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

          {/* Hover effects */}
          {hoveredIndex !== null && (
            <>
              {/* Vertical line */}
              <line
                x1={points[hoveredIndex].x}
                y1={chartDimensions.padding.top}
                x2={points[hoveredIndex].x}
                y2={chartDimensions.padding.top + chartDimensions.chartHeight}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              {/* Data point */}
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r="4"
                fill="#6366f1"
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}

          {/* Invisible hover areas */}
          {points.map((_, i) => {
            const hoverWidth =
              chartDimensions.chartWidth / Math.max(points.length - 1, 1);
            return (
              <rect
                key={i}
                x={points[i].x - hoverWidth / 2}
                y={chartDimensions.padding.top}
                width={hoverWidth}
                height={chartDimensions.chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "crosshair" }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 pointer-events-none z-10"
            style={{
              left: `${
                (points[hoveredIndex].x / chartDimensions.width) * 100
              }%`,
              top: "0",
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="text-xs text-gray-500 mb-1">
              {new Date(chartData[hoveredIndex].date).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                }
              )}
            </div>
            <div className="font-bold text-indigo-600 text-sm">
              {chartData[hoveredIndex].visibility.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
