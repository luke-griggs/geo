"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, TableIcon, BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { TimePeriod, Platform } from "./filter-bar";
import { QUERY_STALE_TIMES } from "@/components/providers";

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

// Fetch function
async function fetchModelPerformance(
  organizationId: string,
  domainId: string,
  startDate: string,
  endDate: string,
  platforms: string[]
): Promise<ModelStats[]> {
  const params = new URLSearchParams({ startDate, endDate });

  if (platforms.length > 0) {
    params.set("platforms", platforms.join(","));
  }

  const res = await fetch(
    `/api/organizations/${organizationId}/domains/${domainId}/model-performance?${params}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data = await res.json();

  // Transform the API response to match the component's expected format
  return (data.models || []).map(
    (model: {
      provider: string;
      visibilityRate: number;
      totalRuns: number;
      mentionedRuns: number;
    }) => ({
      model: model.provider,
      avgPosition: null,
      visibility: model.visibilityRate,
      sentiment: null,
      totalRuns: model.totalRuns,
      mentions: model.mentionedRuns,
    })
  );
}

export function AIModelPerformance({
  organizationId,
  domainId,
  timePeriod,
  platforms,
}: AIModelPerformanceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Calculate date range
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

  // Fetch model stats with React Query
  const {
    data: modelStats = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "model-performance",
      organizationId,
      domainId,
      dateRange.startDate,
      dateRange.endDate,
      platforms.join(","),
    ],
    queryFn: () =>
      fetchModelPerformance(
        organizationId,
        domainId,
        dateRange.startDate,
        dateRange.endDate,
        platforms
      ),
    staleTime: QUERY_STALE_TIMES.dynamic,
  });

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
        <div className="space-y-0">
          {/* Table header skeleton */}
          <div className="flex items-center border-b border-gray-100 pb-3 mb-3">
            <Skeleton className="h-3 w-10 mr-4" />
            <Skeleton className="h-3 w-20 mr-auto" />
            <Skeleton className="h-3 w-16 mx-4" />
            <Skeleton className="h-3 w-16 mx-4" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Table rows skeleton */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center py-3 border-b border-gray-50"
            >
              <Skeleton className="h-4 w-6 mr-4" />
              <div className="flex items-center gap-2 mr-auto">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-8 mx-4" />
              <Skeleton className="h-4 w-10 mx-4" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
        </div>
      ) : modelStats.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-400">No data available</p>
        </div>
      ) : viewMode === "table" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-auto"
        >
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
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-4"
        >
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
        </motion.div>
      )}
    </div>
  );
}
