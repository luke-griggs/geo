"use client";

import { useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  FileText,
  Zap,
  MessageSquare,
  ChevronRight,
  Info,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { NavSection } from "@/components/sidebar";
import { useState } from "react";

interface OverviewSectionProps {
  organizationId: string;
  domainId: string;
  domainName: string;
  onNavigate?: (section: NavSection) => void;
}

interface PlatformVisibility {
  platform: string;
  visibility: number;
  icon: string;
}

interface TopicPerformance {
  topic: string;
  promptCount: number;
  visibilityRank: number | null;
  visibilityScore: number;
  citationShare: number;
}

interface OverviewData {
  visibilityScore: number;
  totalPrompts: number;
  totalMentions: number;
  platformBreakdown: PlatformVisibility[];
  topicPerformance: TopicPerformance[];
}

interface ModelPerformanceItem {
  provider: string;
  visibilityRate: number;
}

interface RunStatus {
  status: "pending" | "running" | "completed";
  progress: number;
  total: number;
}

// Fetch functions
async function fetchRunStatus(
  organizationId: string,
  domainId: string
): Promise<RunStatus> {
  const res = await fetch(
    `/api/organizations/${organizationId}/domains/${domainId}/run-status`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch run status");
  }
  return res.json();
}

interface TopicWithPrompts {
  id: string;
  name: string;
  description: string | null;
  promptCount: number;
  prompts: Array<{
    id: string;
    promptText: string;
    category: string | null;
    isActive: boolean;
  }>;
}

interface TopicVisibilityData {
  topicId: string;
  visibilityScore: number;
  citationShare: number;
  totalRuns: number;
  mentionedRuns: number;
}

async function fetchOverviewData(
  organizationId: string,
  domainId: string,
  startDate: string,
  endDate: string
): Promise<OverviewData> {
  const params = new URLSearchParams({ startDate, endDate });

  // Fetch visibility data, platform breakdown, and topics in parallel
  const [visibilityRes, modelRes, topicsRes] = await Promise.all([
    fetch(
      `/api/organizations/${organizationId}/domains/${domainId}/visibility?${params}`
    ),
    fetch(
      `/api/organizations/${organizationId}/domains/${domainId}/model-performance?${params}`
    ),
    fetch(`/api/organizations/${organizationId}/domains/${domainId}/topics`),
  ]);

  if (!visibilityRes.ok) {
    throw new Error("Failed to fetch visibility data");
  }

  const visibilityData = await visibilityRes.json();

  let platformBreakdown: PlatformVisibility[] = [];
  if (modelRes.ok) {
    const modelData = await modelRes.json();
    platformBreakdown = (modelData.models || []).map(
      (m: ModelPerformanceItem) => ({
        platform: m.provider,
        visibility: m.visibilityRate,
        icon: m.provider,
      })
    );
  }

  // Fetch topic performance data
  let topicPerformance: TopicPerformance[] = [];
  if (topicsRes.ok) {
    const topicsData = await topicsRes.json();
    const topics: TopicWithPrompts[] = topicsData.topics || [];

    if (topics.length > 0) {
      // Fetch topic-level visibility data
      const topicVisibilityRes = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/topic-visibility?${params}`
      );

      let topicVisibilityMap: Record<string, TopicVisibilityData> = {};
      if (topicVisibilityRes.ok) {
        const topicVisibilityData = await topicVisibilityRes.json();
        topicVisibilityMap = (topicVisibilityData.topics || []).reduce(
          (
            acc: Record<string, TopicVisibilityData>,
            t: TopicVisibilityData
          ) => {
            acc[t.topicId] = t;
            return acc;
          },
          {}
        );
      }

      // Build topic performance with visibility data
      topicPerformance = topics
        .filter((t) => t.promptCount > 0) // Only show topics with prompts
        .map((topic, index) => {
          const visData = topicVisibilityMap[topic.id];
          return {
            topic: topic.name,
            promptCount: topic.promptCount,
            visibilityRank: index + 1,
            visibilityScore: visData?.visibilityScore || 0,
            citationShare: visData?.citationShare || 0,
          };
        })
        .sort((a, b) => b.visibilityScore - a.visibilityScore) // Sort by visibility
        .map((topic, index) => ({
          ...topic,
          visibilityRank: index + 1, // Re-assign rank after sorting
        }));
    }
  }

  return {
    visibilityScore: visibilityData.visibilityScore || 0,
    totalPrompts: visibilityData.totalPrompts || 0,
    totalMentions: visibilityData.totalMentions || 0,
    platformBreakdown,
    topicPerformance,
  };
}

// Dotted background pattern component
function DottedBackground() {
  return (
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `radial-gradient(circle, #9ca3af 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
      }}
    />
  );
}

// Loading state for prompt runs
function PromptRunLoadingState({
  progress,
  total,
}: {
  progress: number;
  total: number;
}) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center">
      <DottedBackground />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Running your prompts in AI answer engines
          </h3>
          <p className="text-sm text-gray-500">
            {progress}/{total} answers received...
          </p>
        </div>
      </div>
    </div>
  );
}

// Platform icon component
function PlatformIcon({ platform }: { platform: string }) {
  const iconMap: Record<string, string> = {
    chatgpt: "https://www.google.com/s2/favicons?domain=openai.com&sz=32",
    claude: "https://www.google.com/s2/favicons?domain=anthropic.com&sz=32",
    gemini: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32",
    perplexity: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32",
    grok: "https://www.google.com/s2/favicons?domain=x.ai&sz=32",
    deepseek: "https://www.google.com/s2/favicons?domain=deepseek.com&sz=32",
  };

  return (
    <img
      src={iconMap[platform] || iconMap.chatgpt}
      alt={platform}
      className="w-5 h-5"
    />
  );
}

export function OverviewSection({
  organizationId,
  domainId,
  domainName,
  onNavigate,
}: OverviewSectionProps) {
  const [chartMode, setChartMode] = useState<"bar" | "line">("bar");
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);

  // Calculate date range (last 7 days)
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }, []);

  // Query for run status with smart polling
  // Polls every 2 seconds while status is pending/running, stops when completed
  const { data: runStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ["runStatus", organizationId, domainId],
    queryFn: () => fetchRunStatus(organizationId, domainId),
    // Poll every 2 seconds, but only if status is not completed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once completed
      if (status === "completed") {
        return false;
      }
      // Keep polling while pending or running
      return 2000;
    },
    // Refetch on mount to get fresh status
    refetchOnMount: true,
  });

  const isRunning =
    runStatus?.status === "pending" || runStatus?.status === "running";

  // Invalidate and refetch overview data when run status changes to "completed"
  useEffect(() => {
    const currentStatus = runStatus?.status;
    const previousStatus = previousStatusRef.current;

    // If status just changed from running/pending to completed, invalidate queries
    if (
      currentStatus === "completed" &&
      (previousStatus === "running" || previousStatus === "pending")
    ) {
      // Invalidate overview queries to force a fresh fetch
      queryClient.invalidateQueries({
        queryKey: ["overview", organizationId, domainId],
      });
    }

    // Update the ref for next comparison
    previousStatusRef.current = currentStatus ?? null;
  }, [runStatus?.status, organizationId, domainId, queryClient]);

  // Query for overview data - only fetch when prompts are complete
  const {
    data,
    isLoading: isDataLoading,
    error,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: [
      "overview",
      organizationId,
      domainId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () =>
      fetchOverviewData(
        organizationId,
        domainId,
        dateRange.startDate,
        dateRange.endDate
      ),
    // Only fetch when status is completed or when we have no status info
    enabled: !isRunning,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
    // Always refetch when the component mounts or when enabled changes
    refetchOnMount: "always",
    // Use a short stale time to ensure fresh data after prompt runs complete
    staleTime: 0,
  });

  // Show initial loading while checking status
  if (isStatusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show prompt run loading state if prompts are still running
  if (isRunning && runStatus) {
    return (
      <TooltipProvider>
        <div className="flex flex-col pb-12">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          </div>

          <PromptRunLoadingState
            progress={runStatus.progress}
            total={runStatus.total}
          />
        </div>
      </TooltipProvider>
    );
  }

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
          <button
            onClick={() => refetchOverview()}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Calculate max visibility for chart scaling
  const maxVisibility = Math.max(
    ...((data?.platformBreakdown || []).map((p) => p.visibility) || [0]),
    1
  );

  const actionCards = [
    {
      icon: FileText,
      label: "Create Content",
      description: "Generate optimized content",
      onClick: () => onNavigate?.("content"),
    },
    {
      icon: MessageSquare,
      label: "Manage Prompts",
      description: `${data?.totalPrompts || 0}/100 used`,
      onClick: () => onNavigate?.("prompts"),
    },
    {
      icon: Zap,
      label: "Optimize Content",
      description: "Improve existing pages",
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visibility Score Card */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Visibility Score
                </span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartMode("bar")}
                  className={`p-1.5 rounded ${
                    chartMode === "bar"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setChartMode("line")}
                  className={`p-1.5 rounded ${
                    chartMode === "line"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold text-gray-900">
                {data?.visibilityScore?.toFixed(1) || "0"}%
              </span>
              <span className="text-gray-400">–</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Percentage of AI responses that mention your brand
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Platform Bar Chart */}
            <div className="flex items-end justify-around h-48 gap-8">
              {(data?.platformBreakdown || []).length > 0 ? (
                data?.platformBreakdown.map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex flex-col items-center justify-end h-36">
                      <span className="text-xs text-gray-500 mb-1">
                        {platform.visibility.toFixed(1)}%
                      </span>
                      <div
                        className="w-16 rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(
                            (platform.visibility / (maxVisibility || 1)) * 100,
                            4
                          )}%`,
                          backgroundColor:
                            platform.platform === "chatgpt"
                              ? "#10B981"
                              : platform.platform === "claude"
                              ? "#1f2937"
                              : "#9CA3AF",
                        }}
                      />
                    </div>
                    <PlatformIcon platform={platform.platform} />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                  No platform data available yet
                </div>
              )}
            </div>
          </div>

          {/* Improve Visibility Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Improve Visibility
            </h3>
            <div className="space-y-2">
              {actionCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <button
                    key={index}
                    onClick={card.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {card.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.description && (
                        <span className="text-xs text-gray-500">
                          {card.description}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Topic Performance Breakdown */}
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Topic Performance Breakdown
            </h2>
            <p className="text-sm text-gray-500">
              Top brands and citation sources by topic
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {(data?.topicPerformance || []).length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Visibility
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              How often you appear for this topic
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Citation Share
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Percentage of citations linking to your domain
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.topicPerformance.map((topic, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {topic.topic}
                          </p>
                          <p className="text-xs text-gray-500">
                            {topic.promptCount} prompts
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {topic.visibilityRank
                              ? `#${topic.visibilityRank}`
                              : "#0"}
                          </span>
                          <span className="text-sm font-medium">
                            {topic.visibilityScore.toFixed(0)}%
                          </span>
                          <span className="text-gray-400">–</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {topic.citationShare.toFixed(1)}%
                          </span>
                          <span className="text-gray-400">–</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-sm">
                  No topic data available yet. Topics will appear here once you
                  organize your prompts into topics.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
