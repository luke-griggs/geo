"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, HelpCircle } from "lucide-react";

interface SourceDomainsProps {
  workspaceId: string;
  domainId: string;
  timePeriod: string;
  platforms: string[];
}

interface SourceDomain {
  domain: string;
  count: number;
  frequency: number;
}

interface SourceDomainsData {
  sourceDomains: SourceDomain[];
  totalSources: number;
  totalCitations: number;
}

// Colors for the donut chart segments
const CHART_COLORS = [
  "#c9644a", // primary brown/terracotta
  "#e8a87c", // light peach
  "#6b7280", // gray
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
];

export function SourceDomainsSection({
  workspaceId,
  domainId,
  timePeriod,
  platforms,
}: SourceDomainsProps) {
  const [data, setData] = useState<SourceDomainsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range from time period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    let startDate: Date;

    switch (timePeriod) {
      case "7d":
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }, [timePeriod]);

  const fetchSourceDomains = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (platforms.length > 0) {
        params.set("platforms", platforms.join(","));
      }

      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/source-domains?${params}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch source domains");
      }

      const responseData = await res.json();
      setData(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, domainId, dateRange, platforms]);

  useEffect(() => {
    fetchSourceDomains();
  }, [fetchSourceDomains]);

  // Calculate donut chart segments
  const chartSegments = useMemo(() => {
    if (!data?.sourceDomains.length) return [];

    const topDomains = data.sourceDomains.slice(0, 10);
    const otherDomains = data.sourceDomains.slice(10);

    let segments = topDomains.map((d, i) => ({
      domain: d.domain,
      frequency: d.frequency,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    // Add "Other" segment if there are more domains
    if (otherDomains.length > 0) {
      const otherFrequency = otherDomains.reduce(
        (sum, d) => sum + d.frequency,
        0
      );
      segments.push({
        domain: "Other",
        frequency: otherFrequency,
        color: "#d1d5db", // light gray for "Other"
      });
    }

    return segments;
  }, [data]);

  // Generate SVG path for donut segment
  const getDonutPath = (
    startAngle: number,
    endAngle: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    const start = polarToCartesian(100, 100, outerRadius, endAngle);
    const end = polarToCartesian(100, 100, outerRadius, startAngle);
    const innerStart = polarToCartesian(100, 100, innerRadius, endAngle);
    const innerEnd = polarToCartesian(100, 100, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading source domains...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchSourceDomains}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate cumulative angles for donut chart
  let currentAngle = 0;
  const segmentsWithAngles = chartSegments.map((segment) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (segment.frequency / 100) * 360;
    currentAngle = endAngle;
    return { ...segment, startAngle, endAngle };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Source Domains</h3>
        <div
          className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help"
          title="Top citation domains referenced across all queries. Quickly see which sources are most influential."
        >
          <HelpCircle className="h-3 w-3 text-gray-400" />
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Top citation domains referenced across all queries. Quickly see which
        sources are most influential and how they tend to link to your brand.
      </p>

      {!data?.sourceDomains.length ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No source domains found for the selected period
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Donut Chart */}
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {segmentsWithAngles.map((segment, i) => (
                  <path
                    key={i}
                    d={getDonutPath(
                      segment.startAngle,
                      segment.endAngle,
                      80,
                      50
                    )}
                    fill={segment.color}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">
                  {data.totalSources}
                </span>
                <span className="text-xs text-gray-500">Total Sources</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {segmentsWithAngles.slice(0, 6).map((segment, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {segment.domain.length > 15
                      ? segment.domain.slice(0, 15) + "..."
                      : segment.domain}{" "}
                    <span className="text-gray-400">
                      {segment.frequency.toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Domain List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.sourceDomains.slice(0, 10).map((source, i) => (
              <div
                key={source.domain}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Favicon */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
                  alt=""
                  className="w-8 h-8 rounded-lg"
                  onError={(e) => {
                    // Fallback to a placeholder
                    (
                      e.target as HTMLImageElement
                    ).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect fill="${encodeURIComponent(
                      CHART_COLORS[i % CHART_COLORS.length]
                    )}" width="32" height="32" rx="4"/><text x="16" y="20" font-size="14" fill="white" text-anchor="middle" font-family="system-ui">${source.domain
                      .charAt(0)
                      .toUpperCase()}</text></svg>`;
                  }}
                />
                {/* Domain info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {source.domain}
                  </p>
                  <p className="text-xs text-gray-500">
                    {source.frequency.toFixed(1)}% of citations
                  </p>
                </div>
                {/* Frequency badge */}
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {source.frequency.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay for filter changes */}
      {isLoading && data && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
