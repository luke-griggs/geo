"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  MapPin,
  Sparkles,
  Tag,
  Loader2,
} from "lucide-react";
import { QueryDetailPanel } from "@/components/query-detail-panel";

interface MentionsSectionProps {
  workspaceId: string;
  domainId: string;
  domainName: string;
}

interface BrandMention {
  id: string;
  brandName: string;
  brandDomain: string | null;
  position: number | null;
  mentioned: boolean;
}

interface Citation {
  brandName: string;
  url: string | null;
  domain: string | null;
  title?: string;
  snippet?: string;
}

interface Query {
  id: string;
  promptId: string;
  query: string;
  date: string;
  source: string;
  location: { city: string; flag: string } | null;
  mentioned: { count: number; total: number };
  avgPosition: number | null;
  sentiment: number | null;
  citations: Citation[];
  response: string | null;
  brandMentions: BrandMention[];
  contextSnippet: string | null;
  error: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type TimePeriod = "7d" | "30d" | "90d";

const platformColors: Record<string, string> = {
  chatgpt: "bg-[#10a37f]",
  openai: "bg-[#10a37f]",
  claude: "bg-[#cc785c]",
  perplexity: "bg-[#1a1a2e]",
  gemini: "bg-[#4285f4]",
  grok: "bg-gray-900",
  deepseek: "bg-blue-600",
};

function FilterButton({
  children,
  icon: Icon,
  onClick,
  active,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "text-gray-700 bg-white border-gray-200 hover:bg-gray-50"
      }`}
    >
      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      {children}
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  );
}

function MiniAreaChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  const height = 120;
  const width = 360;
  const padding = 8;
  const chartHeight = height - padding * 2 - 20; // Leave room for labels
  const chartWidth = width - padding * 2;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: height - padding - 20 - (d.count / maxCount) * chartHeight,
  }));

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (2 * (point.x - prev.x)) / 3;
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${pathD} L ${points[points.length - 1].x} ${
    height - padding - 20
  } L ${points[0].x} ${height - padding - 20} Z`;

  // Get labels (show first, middle, last dates)
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (i, idx, arr) => arr.indexOf(i) === idx
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Baseline */}
      <line
        x1={padding}
        y1={height - padding - 20}
        x2={width - padding}
        y2={height - padding - 20}
        stroke="rgb(229, 231, 235)"
        strokeWidth={1}
      />

      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGradient)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgb(249, 115, 22)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X-axis labels */}
      {labelIndices.map((i) => {
        const d = data[i];
        const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
        const dateLabel = new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <text
            key={i}
            x={x}
            y={height - 4}
            className="text-[9px] fill-gray-400"
            textAnchor="middle"
          >
            {dateLabel}
          </text>
        );
      })}
    </svg>
  );
}

function SourceIcon({ source }: { source: string }) {
  const bgColor = platformColors[source.toLowerCase()] || "bg-gray-200";

  if (source.toLowerCase() === "chatgpt" || source.toLowerCase() === "openai") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
        <img
          src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=64"
          alt="ChatGPT"
          className="w-8 h-8"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}
    >
      <span className="text-xs font-bold text-white">
        {source.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function CitationIcon({ domain }: { domain: string | null }) {
  if (!domain) {
    return (
      <div
        className="w-5 h-5 rounded-full bg-gray-200 ring-2 ring-white"
        title="Unknown"
      />
    );
  }

  return (
    <div
      className="w-5 h-5 rounded-full ring-2 ring-white overflow-hidden bg-gray-100 flex items-center justify-center"
      title={domain}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={domain}
        className="w-5 h-5"
        onError={(e) => {
          // Fallback to first letter if favicon fails
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span class="text-[8px] font-bold text-gray-500">${domain
              .charAt(0)
              .toUpperCase()}</span>`;
          }
        }}
      />
    </div>
  );
}

interface AggregateStats {
  totalMentions: number;
  totalQueries: number;
  chartData: { date: string; count: number }[];
  platformData: { name: string; mentions: number; percentage: number }[];
}

export function MentionsSection({
  workspaceId,
  domainId,
  domainName,
}: MentionsSectionProps) {
  const [queries, setQueries] = useState<Query[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [aggregateStats, setAggregateStats] = useState<AggregateStats>({
    totalMentions: 0,
    totalQueries: 0,
    chartData: [],
    platformData: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showMentionsOnly, setShowMentionsOnly] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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

  // Fetch queries
  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (showMentionsOnly) {
        params.set("mentionsOnly", "true");
      }

      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/queries?${params}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch queries");
      }

      const data = await res.json();
      setQueries(data.queries || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.stats) {
        setAggregateStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workspaceId,
    domainId,
    dateRange,
    showMentionsOnly,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  // Filter queries by search
  const filteredQueries = useMemo(() => {
    if (!searchQuery) return queries;
    return queries.filter((q) =>
      q.query.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [queries, searchQuery]);

  // Use aggregate stats from API (calculated from ALL data, not just current page)
  const stats = useMemo(() => {
    // Calculate change vs previous period (simplified placeholder)
    const previousMentions = Math.max(0, aggregateStats.totalMentions - 2);
    const change = aggregateStats.totalMentions - previousMentions;

    return {
      totalMentions: aggregateStats.totalMentions,
      totalQueries: aggregateStats.totalQueries,
      chartData: aggregateStats.chartData,
      change,
      platformData: aggregateStats.platformData,
    };
  }, [aggregateStats]);

  // Time period options
  const timePeriodLabel =
    timePeriod === "7d"
      ? "Last 7 days"
      : timePeriod === "30d"
      ? "Last 30 days"
      : "Last 90 days";

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchQueries}
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
        <h1 className="text-2xl font-bold text-gray-900">Mentions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all queries and responses mentioning{" "}
          <span className="font-medium">{domainName}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                const next =
                  timePeriod === "7d"
                    ? "30d"
                    : timePeriod === "30d"
                    ? "90d"
                    : "7d";
                setTimePeriod(next);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-gray-500" />
              {timePeriodLabel}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <FilterButton icon={Sparkles}>All Platforms</FilterButton>
          <FilterButton icon={Tag}>All Topics</FilterButton>
          <FilterButton icon={MapPin}>Locations</FilterButton>
        </div>

        {/* Stats cards row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Mentions & Citations card */}
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Mentions & Citations
              </h3>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Daily brand mentions and branded citations across AI answers
            </p>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {stats.totalMentions}
              </span>
              <span
                className={`text-sm font-medium ${
                  stats.change >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {stats.change >= 0 ? "+" : ""}
                {stats.change} vs previous period
              </span>
            </div>

            <MiniAreaChart data={stats.chartData} />
          </div>

          {/* Performance by Platform card */}
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Performance by Platform
              </h3>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Mentions and branded citations per AI engine
            </p>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-bold text-gray-900">
                {stats.totalQueries > 0
                  ? ((stats.totalMentions / stats.totalQueries) * 100).toFixed(
                      1
                    )
                  : "0"}
                %
              </span>
              <span className="text-sm text-gray-500">
                overall mention rate
              </span>
            </div>

            {/* Platform list */}
            <div className="space-y-3">
              {stats.platformData.length === 0 ? (
                <p className="text-sm text-gray-400">No platform data yet</p>
              ) : (
                stats.platformData.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-4">
                    <SourceIcon source={platform.name} />
                    <span className="text-sm font-medium text-gray-900 w-20 capitalize">
                      {platform.name}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${platform.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {platform.mentions}
                    </span>
                    <span className="text-sm text-gray-500 w-14 text-right">
                      {platform.percentage}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* All Queries section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900">
              All Queries
            </h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            All queries and responses from AI platforms
          </p>

          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            {/* Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  showMentionsOnly ? "bg-gray-900" : "bg-gray-200"
                }`}
                onClick={() => setShowMentionsOnly(!showMentionsOnly)}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    showMentionsOnly ? "translate-x-4" : ""
                  }`}
                />
              </div>
              <span className="text-sm text-gray-600">Show mentions only</span>
            </label>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {filteredQueries.length} queries
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-500">Loading queries...</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-20">Date</th>
                    <th className="px-4 py-3">Query</th>
                    <th className="px-4 py-3 w-24 text-center">Sources</th>
                    <th className="px-4 py-3 w-36">Locations</th>
                    <th className="px-4 py-3 w-24 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Mentioned
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 w-24 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Avg Position
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 w-28 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Sentiment
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 w-28 text-center">Citations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredQueries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        {queries.length === 0
                          ? "No queries found. Run some prompts to see data here."
                          : "No queries match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredQueries.map((query) => {
                      const dateObj = new Date(query.date);
                      const dateStr = dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <tr
                          key={query.id}
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedQuery(query);
                            setIsPanelOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 hover:underline">
                              {query.query}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <SourceIcon source={query.source} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {query.location ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">
                                  {query.location.city}
                                </span>
                                <span className="text-base">
                                  {query.location.flag}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium rounded ${
                                query.mentioned.count > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {query.mentioned.count}/{query.mentioned.total}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {query.avgPosition !== null ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium bg-blue-50 text-blue-600 rounded">
                                #{query.avgPosition}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium bg-rose-50 text-rose-600 rounded">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              {query.sentiment !== null ? (
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      query.sentiment >= 0
                                        ? "bg-emerald-400"
                                        : "bg-red-400"
                                    }`}
                                    style={{
                                      width: `${
                                        Math.abs(query.sentiment) * 50 + 50
                                      }%`,
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-2 bg-gray-100 rounded-full" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {query.citations.length > 0 ? (
                                <div className="flex items-center -space-x-1.5">
                                  {query.citations.slice(0, 3).map((c, i) => (
                                    <CitationIcon key={i} domain={c.domain} />
                                  ))}
                                  {query.citations.length > 3 && (
                                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                      +{query.citations.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-300">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2 mt-4 px-2">
              {/* First page */}
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: 1,
                  }))
                }
                disabled={pagination.page <= 1}
                className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                «
              </button>
              {/* Previous page */}
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.max(1, p.page - 1),
                  }))
                }
                disabled={pagination.page <= 1}
                className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Page indicator */}
              <span className="text-sm text-gray-600 px-2">
                {pagination.page} of {pagination.totalPages}
              </span>
              {/* Next page */}
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Last page */}
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: p.totalPages,
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Query Detail Panel */}
      <QueryDetailPanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedQuery(null);
        }}
        promptText={selectedQuery?.query || ""}
        latestRun={
          selectedQuery
            ? {
                id: selectedQuery.id,
                llmProvider: selectedQuery.source,
                responseText: selectedQuery.response,
                executedAt: selectedQuery.date,
                error: selectedQuery.error,
                brandMentions: selectedQuery.brandMentions,
                citations: selectedQuery.citations
                  .filter((c) => c.url)
                  .map((c) => ({
                    url: c.url!,
                    title: c.title || c.brandName,
                    snippet: c.snippet,
                  })),
              }
            : null
        }
        isMentioned={selectedQuery ? selectedQuery.mentioned.count > 0 : false}
        domainName={domainName}
      />
    </div>
  );
}
