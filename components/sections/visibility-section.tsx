"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  FilterBar,
  TimePeriod,
  Platform,
} from "@/components/visibility/filter-bar";
import { VisibilityChart } from "@/components/visibility/visibility-chart";
import { IndustryRanking } from "@/components/visibility/industry-ranking";
import { SourceDomainsSection } from "@/components/visibility/source-domains";
import { YourMentions } from "@/components/visibility/your-mentions";
import { AIModelPerformance } from "@/components/visibility/ai-model-performance";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_STALE_TIMES } from "@/components/providers";

interface VisibilitySectionProps {
  organizationId: string;
  domainId: string;
  domainName: string;
}

interface ChartDataPoint {
  date: string;
  visibility: number;
}

interface RankingItem {
  rank: number;
  brand: string;
  mentions: number;
  position: number | null;
  change: number;
  visibility: number;
  isUserDomain?: boolean;
}

interface Brand {
  name: string;
  domain: string | null;
  mentionCount: number;
}

interface VisibilityData {
  visibilityScore: number;
  chartData: ChartDataPoint[];
  industryRanking: RankingItem[];
  totalPrompts: number;
  totalMentions: number;
}

// Fetch functions
async function fetchVisibilityData(
  organizationId: string,
  domainId: string,
  startDate: string,
  endDate: string,
  platforms: string[],
  selectedBrands: string[]
): Promise<VisibilityData> {
  const params = new URLSearchParams({ startDate, endDate });

  if (platforms.length > 0) {
    params.set("platforms", platforms.join(","));
  }

  if (selectedBrands.length > 0) {
    params.set("brands", selectedBrands.join(","));
  }

  const res = await fetch(
    `/api/organizations/${organizationId}/domains/${domainId}/visibility?${params}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch visibility data");
  }

  return res.json();
}

async function fetchBrands(
  organizationId: string,
  domainId: string
): Promise<{ brands: Brand[] }> {
  const res = await fetch(
    `/api/organizations/${organizationId}/domains/${domainId}/brands`
  );
  if (!res.ok) throw new Error("Failed to fetch brands");
  return res.json();
}

export function VisibilitySection({
  organizationId,
  domainId,
  domainName,
}: VisibilitySectionProps) {
  // Filter state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

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

  // Fetch available brands with React Query (cached for 5 minutes)
  const { data: brandsData } = useQuery({
    queryKey: ["brands", organizationId, domainId],
    queryFn: () => fetchBrands(organizationId, domainId),
    staleTime: QUERY_STALE_TIMES.stable,
  });

  const availableBrands = brandsData?.brands || [];

  // Fetch visibility data with React Query
  const {
    data: visibilityData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "visibility",
      organizationId,
      domainId,
      dateRange.startDate,
      dateRange.endDate,
      platforms.join(","),
      selectedBrands.join(","),
    ],
    queryFn: () =>
      fetchVisibilityData(
        organizationId,
        domainId,
        dateRange.startDate,
        dateRange.endDate,
        platforms,
        selectedBrands
      ),
    staleTime: QUERY_STALE_TIMES.dynamic,
    // Keep previous data while fetching new data (for filter changes)
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Visibility</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track how often your brand appears in AI responses compared to
            competitors
          </p>
        </div>

        <div className="space-y-6">
          {/* Filter bar skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>

          {/* Main charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visibility Chart skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64 mb-4" />
              <Skeleton className="h-9 w-20 mb-6" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>

            {/* Industry Ranking skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 mb-4" />
              <Skeleton className="h-9 w-20 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-6" />
                    <div className="flex items-center gap-2 flex-1">
                      <Skeleton className="w-6 h-6 rounded-md" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            onClick={() => refetch()}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visibility</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track how often your brand appears in AI responses compared to
          competitors
        </p>
      </div>

      <div className="space-y-6">
        {/* Filter Bar */}
        <FilterBar
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          platforms={platforms}
          onPlatformsChange={setPlatforms}
          selectedBrands={selectedBrands}
          onBrandsChange={setSelectedBrands}
          availableBrands={availableBrands}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visibility Chart */}
          <VisibilityChart
            data={visibilityData?.chartData || []}
            currentScore={visibilityData?.visibilityScore || 0}
          />

          {/* Industry Ranking */}
          <IndustryRanking
            data={visibilityData?.industryRanking || []}
            userVisibility={visibilityData?.visibilityScore || 0}
          />
        </div>

        {/* Your Mentions & AI Model Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <YourMentions
            organizationId={organizationId}
            domainId={domainId}
            timePeriod={timePeriod}
            platforms={platforms}
          />
          <AIModelPerformance
            organizationId={organizationId}
            domainId={domainId}
            timePeriod={timePeriod}
            platforms={platforms}
          />
        </div>

        {/* Source Domains */}
        <SourceDomainsSection
          organizationId={organizationId}
          domainId={domainId}
          timePeriod={timePeriod}
          platforms={platforms}
        />
      </div>

      {/* Loading overlay for filter changes */}
      {isFetching && visibilityData && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
