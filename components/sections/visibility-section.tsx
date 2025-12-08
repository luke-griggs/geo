"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  FilterBar,
  TimePeriod,
  Platform,
  CompetitorType,
} from "@/components/visibility/filter-bar";
import { VisibilityChart } from "@/components/visibility/visibility-chart";
import { IndustryRanking } from "@/components/visibility/industry-ranking";
import { SourceDomainsSection } from "@/components/visibility/source-domains";
import { YourMentions } from "@/components/visibility/your-mentions";
import { AIModelPerformance } from "@/components/visibility/ai-model-performance";

interface VisibilitySectionProps {
  workspaceId: string;
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
  mentionCount: number;
}

interface VisibilityData {
  visibilityScore: number;
  chartData: ChartDataPoint[];
  industryRanking: RankingItem[];
  totalPrompts: number;
  totalMentions: number;
}

export function VisibilitySection({
  workspaceId,
  domainId,
  domainName,
}: VisibilitySectionProps) {
  // Filter state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [competitorType, setCompetitorType] = useState<CompetitorType>("serp");

  // Data state
  const [visibilityData, setVisibilityData] = useState<VisibilityData | null>(
    null
  );
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
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

  // Fetch available brands
  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/domains/${domainId}/brands`
        );
        if (!res.ok) throw new Error("Failed to fetch brands");
        const data = await res.json();
        setAvailableBrands(data.brands || []);
      } catch (err) {
        console.error("Error fetching brands:", err);
      }
    }

    fetchBrands();
  }, [workspaceId, domainId]);

  // Fetch visibility data
  const fetchVisibilityData = useCallback(async () => {
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

      if (selectedBrands.length > 0) {
        params.set("brands", selectedBrands.join(","));
      }

      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/visibility?${params}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch visibility data");
      }

      const data = await res.json();
      setVisibilityData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, domainId, dateRange, platforms, selectedBrands]);

  useEffect(() => {
    fetchVisibilityData();
  }, [fetchVisibilityData]);

  if (isLoading && !visibilityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading visibility data...</p>
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
            onClick={fetchVisibilityData}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
          competitorType={competitorType}
          onCompetitorTypeChange={setCompetitorType}
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
            workspaceId={workspaceId}
            domainId={domainId}
            timePeriod={timePeriod}
            platforms={platforms}
          />
          <AIModelPerformance
            workspaceId={workspaceId}
            domainId={domainId}
            timePeriod={timePeriod}
            platforms={platforms}
          />
        </div>

        {/* Source Domains */}
        <SourceDomainsSection
          workspaceId={workspaceId}
          domainId={domainId}
          timePeriod={timePeriod}
          platforms={platforms}
        />
      </div>

      {/* Loading overlay for filter changes */}
      {isLoading && visibilityData && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
