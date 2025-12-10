"use client";

import { useState, useEffect, useCallback } from "react";
import { Info, Loader2, TableIcon, BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TimePeriod, Platform } from "./filter-bar";

interface AIModelPerformanceProps {
  organizationId: string;
  domainId: string;
  timePeriod: TimePeriod;
  platforms: Platform[];
}

interface ModelStats {
  model: string;
  avgPosition: number | null;
  visibility: number;
  sentiment: number | null;
  totalRuns: number;
  mentions: number;
}

const platformColors: Record<string, string> = {
  chatgpt: "bg-[#10a37f]",
  openai: "bg-[#10a37f]",
  claude: "bg-[#cc785c]",
  perplexity: "bg-[#1a1a2e]",
  gemini: "bg-[#4285f4]",
  grok: "bg-gray-900",
  deepseek: "bg-blue-600",
};

function SourceIcon({ source }: { source: string }) {
  const bgColor = platformColors[source.toLowerCase()] || "bg-gray-200";

  if (source.toLowerCase() === "chatgpt" || source.toLowerCase() === "openai") {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
        <img
          src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=32"
          alt="ChatGPT"
          className="w-6 h-6"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center`}
    >
      <span className="text-[10px] font-bold text-white">
        {source.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

type ViewMode = "table" | "chart";

export function AIModelPerformance({
  organizationId,
  domainId,
  timePeriod,
  platforms,
}: AIModelPerformanceProps) {
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const fetchModelStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range
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

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        limit: "1000", // Get all queries to aggregate
      });

      if (platforms.length > 0) {
        params.set("platforms", platforms.join(","));
      }

      const res = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/queries?${params}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await res.json();

      // Aggregate by model
      const modelMap: Record<
        string,
        {
          totalRuns: number;
          mentions: number;
          positions: number[];
          sentiments: number[];
        }
      > = {};

      for (const query of data.queries || []) {
        const model = query.source;
        if (!modelMap[model]) {
          modelMap[model] = {
            totalRuns: 0,
            mentions: 0,
            positions: [],
            sentiments: [],
          };
        }
        modelMap[model].totalRuns++;

        if (query.mentioned?.count > 0) {
          modelMap[model].mentions++;
          if (query.avgPosition !== null) {
            modelMap[model].positions.push(query.avgPosition);
          }
          if (query.sentiment !== null) {
            modelMap[model].sentiments.push(query.sentiment);
          }
        }
      }

      // Calculate stats
      const stats: ModelStats[] = Object.entries(modelMap)
        .map(([model, data]) => {
          const avgPosition =
            data.positions.length > 0
              ? Math.round(
                  (data.positions.reduce((a, b) => a + b, 0) /
                    data.positions.length) *
                    10
                ) / 10
              : null;

          const visibility =
            data.totalRuns > 0
              ? Math.round((data.mentions / data.totalRuns) * 1000) / 10
              : 0;

          const sentiment =
            data.sentiments.length > 0
              ? Math.round(
                  (data.sentiments.reduce((a, b) => a + b, 0) /
                    data.sentiments.length) *
                    100
                )
              : null;

          return {
            model,
            avgPosition,
            visibility,
            sentiment,
            totalRuns: data.totalRuns,
            mentions: data.mentions,
          };
        })
        .sort((a, b) => b.visibility - a.visibility);

      setModelStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, domainId, timePeriod, platforms]);

  useEffect(() => {
    fetchModelStats();
  }, [fetchModelStats]);

  // Find max visibility for bar scaling
  const maxVisibility = Math.max(...modelStats.map((s) => s.visibility), 1);

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-gray-900">
            AI Model Performance
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Performance scores for your brand across different AI models.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "table"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("chart")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "chart"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Performance Scores for your Brand across different AI models.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : modelStats.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-400">No data available</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    Rank
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Ranking by visibility</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 px-4">
                  <div className="flex items-center gap-1">
                    AI Model
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">The AI model provider</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Avg Position
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Average mention position</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Visibility
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">% of runs with mentions</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 pl-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Sentiment
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Average sentiment score (0-100)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modelStats.map((stat, index) => (
                <tr
                  key={stat.model}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <SourceIcon source={stat.model} />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {stat.model}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {stat.avgPosition !== null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {stat.avgPosition}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {stat.visibility}%
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-center">
                    {stat.sentiment !== null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {stat.sentiment}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {modelStats.map((stat, index) => (
            <div key={stat.model} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-500 w-6">
                #{index + 1}
              </span>
              <SourceIcon source={stat.model} />
              <span className="text-sm font-medium text-gray-900 w-20 capitalize">
                {stat.model}
              </span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${(stat.visibility / maxVisibility) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 w-14 text-right">
                {stat.visibility}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
