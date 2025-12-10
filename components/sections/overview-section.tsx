"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  FileText,
  Zap,
  Lightbulb,
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

interface OverviewSectionProps {
  workspaceId: string;
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
  workspaceId,
  domainId,
  domainName,
  onNavigate,
}: OverviewSectionProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"bar" | "line">("bar");

  // Prompt run status
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate date range (last 7 days)
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }, []);

  // Check prompt run status
  const checkRunStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/run-status`
      );
      if (res.ok) {
        const status: RunStatus = await res.json();
        setRunStatus(status);
        return status;
      }
    } catch (err) {
      console.error("Error checking run status:", err);
    }
    return null;
  }, [workspaceId, domainId]);

  // Fetch overview data
  const fetchOverviewData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // Fetch visibility data
      const visibilityRes = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/visibility?${params}`
      );

      if (!visibilityRes.ok) {
        throw new Error("Failed to fetch visibility data");
      }

      const visibilityData = await visibilityRes.json();

      // Fetch platform breakdown (model performance)
      const modelRes = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/model-performance?${params}`
      );

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

      // For now, topic performance is placeholder until we add topics
      // In the future, this would come from a topics API
      const topicPerformance: TopicPerformance[] = [];

      setData({
        visibilityScore: visibilityData.visibilityScore || 0,
        totalPrompts: visibilityData.totalPrompts || 0,
        totalMentions: visibilityData.totalMentions || 0,
        platformBreakdown,
        topicPerformance,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, domainId, dateRange]);

  // Initial load: check status first, then decide what to show
  useEffect(() => {
    const init = async () => {
      setIsCheckingStatus(true);
      const status = await checkRunStatus();

      if (
        status &&
        (status.status === "pending" || status.status === "running")
      ) {
        // Start polling for status updates
        pollingIntervalRef.current = setInterval(async () => {
          const newStatus = await checkRunStatus();
          if (newStatus?.status === "completed") {
            // Stop polling and load overview data
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            fetchOverviewData();
          }
        }, 2000);
      } else {
        // Status is completed or null, just load overview data
        fetchOverviewData();
      }

      setIsCheckingStatus(false);
    };

    init();

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [checkRunStatus, fetchOverviewData]);

  // Show initial loading while checking status
  if (isCheckingStatus) {
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
  if (
    runStatus &&
    (runStatus.status === "pending" || runStatus.status === "running")
  ) {
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

  if (isLoading) {
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
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchOverviewData}
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
    },
    {
      icon: Zap,
      label: "Optimize Content",
      description: "Improve existing pages",
    },
    {
      icon: Lightbulb,
      label: "View Opportunities",
      description: "Find ranking gaps",
    },
    {
      icon: MessageSquare,
      label: "Manage Prompts",
      description: `${data?.totalPrompts || 0}/100 used`,
      onClick: () => onNavigate?.("prompts"),
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
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
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
