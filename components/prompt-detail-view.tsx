"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Sidebar, type NavSection } from "@/components/sidebar";
import {
  ChevronLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  MoreHorizontal,
  BarChart3,
  Trophy,
  History,
  Bot,
  Search,
  ArrowUpDown,
  LayoutList,
  Archive,
  ArchiveRestore,
  MapPin,
  X,
  Check,
} from "lucide-react";

interface BrandMention {
  brand: string;
  position: number | null;
  mentioned: boolean;
}

interface PromptRun {
  id: string;
  executedAt: Date;
  durationMs: number | null;
  status: "success" | "error";
  model: string;
  response: string | null;
  mentions: number;
  sentiment: number | null;
  brandMentions: BrandMention[];
}

interface PromptDetail {
  id: string;
  text: string;
  createdAt: Date;
  status: "active" | "inactive";
  isArchived: boolean;
  selectedProviders: string[];
  runs: PromptRun[];
  stats: {
    totalRuns: number;
    avgSentiment: number;
    lastRunAt: Date | null;
  };
}

interface PromptDetailViewProps {
  prompt: PromptDetail;
  workspaceId: string;
  domainId: string;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
}

function getModelIcon(model: string) {
  if (model.toLowerCase() === "chatgpt" || model.toLowerCase() === "openai") {
    return (
      <img
        src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=32"
        alt="ChatGPT"
        className="h-5 w-5"
      />
    );
  }
  return <Bot className="h-5 w-5 text-gray-600" />;
}

export function PromptDetailView({
  prompt,
  workspaceId,
  domainId,
}: PromptDetailViewProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<NavSection>("prompts");
  const [historySort, setHistorySort] = useState<"date" | "sentiment">("date");
  const [isArchived, setIsArchived] = useState(prompt.isArchived);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(
    prompt.selectedProviders || ["chatgpt"]
  );
  const [savingModels, setSavingModels] = useState(false);

  const availableProviders = [
    { id: "chatgpt", name: "ChatGPT", icon: null, useImage: true },
    { id: "perplexity", name: "Perplexity", icon: Search, useImage: false },
    { id: "claude", name: "Claude", icon: Bot, useImage: false },
    { id: "gemini", name: "Gemini", icon: Bot, useImage: false },
  ];

  const handleSectionChange = (section: NavSection) => {
    setActiveSection(section);
    router.push(`/?section=${section}`);
  };

  const handleBack = () => {
    router.back();
  };

  const toggleProvider = (id: string) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSaveModels = async () => {
    setSavingModels(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts/${prompt.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedProviders }),
        }
      );

      if (response.ok) {
        setIsModelModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update models", error);
    } finally {
      setSavingModels(false);
    }
  };

  const toggleArchive = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts/${prompt.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: !isArchived }),
        }
      );

      if (response.ok) {
        setIsArchived(!isArchived);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update archive status", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculations
  const performanceByPlatform = useMemo(() => {
    const platforms: Record<
      string,
      {
        runs: number;
        mentions: number;
        totalPosition: number;
        mentionCountForPosition: number;
      }
    > = {};

    prompt.runs.forEach((run) => {
      if (!platforms[run.model]) {
        platforms[run.model] = {
          runs: 0,
          mentions: 0,
          totalPosition: 0,
          mentionCountForPosition: 0,
        };
      }
      platforms[run.model].runs += 1;
      if (run.mentions > 0) {
        platforms[run.model].mentions += 1;
      }
      // Try to find position of "my" brand (assumed to be the one with mentions > 0 in run logic)
      // In `page.tsx`, `mentions` is count of monitored domain mentions.
      // We don't have explicit position passed for the monitored domain in the top-level `run` object
      // except via `brandMentions` if we identify which one is "ours", OR if we update `page.tsx` to pass avg position.
      // For now, we'll skip position in Platform Performance or approximate it if we had it.
      // Let's assume `brandMentions` contains us if we were found?
      // Actually, `page.tsx` passes `mentions` count.
    });

    return Object.entries(platforms).map(([model, stats]) => ({
      model,
      runs: stats.runs,
      mentionRate: (stats.mentions / stats.runs) * 100,
      // avgPosition: ... (need more data for this)
    }));
  }, [prompt.runs]);

  const brandRankings = useMemo(() => {
    const brands: Record<
      string,
      { mentions: number; totalPosition: number; count: number }
    > = {};

    const totalRuns = prompt.runs.length;
    if (totalRuns === 0) return [];

    prompt.runs.forEach((run) => {
      run.brandMentions.forEach((bm) => {
        if (!brands[bm.brand]) {
          brands[bm.brand] = { mentions: 0, totalPosition: 0, count: 0 };
        }
        if (bm.mentioned) {
          brands[bm.brand].mentions += 1;
          if (bm.position) {
            brands[bm.brand].totalPosition += bm.position;
            brands[bm.brand].count += 1;
          }
        }
      });
    });

    return Object.entries(brands)
      .map(([brand, stats]) => ({
        brand,
        mentions: stats.mentions,
        visibility: (stats.mentions / totalRuns) * 100,
        avgPosition: stats.count > 0 ? stats.totalPosition / stats.count : null,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5); // Top 5
  }, [prompt.runs]);

  const sortedRuns = useMemo(() => {
    return [...prompt.runs].sort((a, b) => {
      if (historySort === "date") {
        return (
          new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
        );
      }
      return (b.sentiment || 0) - (a.sentiment || 0);
    });
  }, [prompt.runs, historySort]);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      <main className="flex-1 ml-64 transition-[margin] duration-200 bg-white">
        <div className="p-8 h-screen overflow-auto">
          {/* Header Navigation */}
          <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Prompts
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 truncate max-w-md font-medium">
              {prompt.text}
            </span>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Title & Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prompt
                  </span>
                  {isArchived && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium border border-gray-200 uppercase tracking-wide">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors">
                    <Bot className="h-3.5 w-3.5" />
                    Edit with AI
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors">
                    <LayoutList className="h-3.5 w-3.5" />
                    Create article
                  </button>
                  <button
                    onClick={toggleArchive}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 mb-6 leading-tight">
                {prompt.text}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                  Select topic
                  <ChevronLeft className="h-3 w-3 -rotate-90 text-gray-400 ml-0.5" />
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  Add location
                </button>
                <div className="flex -space-x-2 mr-1">
                  {/* Placeholder model icons */}
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 z-30">
                    AI
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 z-20">
                    AI
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 z-10">
                    AI
                  </div>
                </div>
                <button
                  onClick={() => setIsModelModalOpen(true)}
                  className="text-xs text-gray-500 font-medium hover:text-gray-900 transition-colors"
                >
                  {selectedProviders.length} models
                </button>
              </div>
            </div>

            {/* Model Selection Modal */}
            {isModelModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Track with AI models
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Select which AI models you&apos;d like us to track this
                        prompt with.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsModelModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {availableProviders.map((provider) => {
                      const isSelected = selectedProviders.includes(
                        provider.id
                      );
                      return (
                        <button
                          key={provider.id}
                          onClick={() => toggleProvider(provider.id)}
                          className={`
                            relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all
                            ${
                              isSelected
                                ? "border-emerald-100 bg-emerald-50/50"
                                : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                            }
                          `}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-emerald-500 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-lg mb-3 ${
                              isSelected ? "bg-white shadow-sm" : "bg-gray-100"
                            }`}
                          >
                            {provider.useImage ? (
                              <img
                                src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=64"
                                alt={provider.name}
                                className="h-6 w-6"
                              />
                            ) : provider.icon ? (
                              <provider.icon
                                className={`h-6 w-6 ${
                                  isSelected
                                    ? "text-emerald-600"
                                    : "text-gray-500"
                                }`}
                              />
                            ) : null}
                          </div>
                          <span
                            className={`font-medium ${
                              isSelected ? "text-emerald-900" : "text-gray-700"
                            }`}
                          >
                            {provider.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setIsModelModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveModels}
                      disabled={savingModels}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {savingModels ? "Saving..." : "Save models"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Total Runs
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {prompt.stats.totalRuns}
                </div>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Avg Sentiment
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {prompt.stats.avgSentiment
                    ? (prompt.stats.avgSentiment * 100).toFixed(0) + "%"
                    : "-"}
                </div>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Top Ranking Brand
                </div>
                <div className="text-3xl font-bold text-gray-900 truncate">
                  {brandRankings[0]?.brand || "-"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Performance by Platform */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">
                      Performance by Platform
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  {performanceByPlatform.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No data available
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {performanceByPlatform.map((p) => (
                        <div key={p.model}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {p.model}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({p.runs} runs)
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {p.mentionRate.toFixed(1)}% Mentioned
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${p.mentionRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Brand Rankings */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">
                      Brand Rankings
                    </h3>
                  </div>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 font-medium">#</th>
                        <th className="px-6 py-3 font-medium">Brand</th>
                        <th className="px-6 py-3 font-medium text-center">
                          Mentions
                        </th>
                        <th className="px-6 py-3 font-medium text-right">
                          Visibility
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {brandRankings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            No brands detected
                          </td>
                        </tr>
                      ) : (
                        brandRankings.map((brand, index) => (
                          <tr
                            key={brand.brand}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {brand.brand}
                            </td>
                            <td className="px-6 py-4 text-center text-gray-600">
                              {brand.mentions}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                              {brand.visibility.toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Response History */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">
                    Response History
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort/Filter Placeholder */}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-medium w-48">Date</th>
                      <th className="px-6 py-3 font-medium w-32">Platform</th>
                      <th className="px-6 py-3 font-medium">Response</th>
                      <th className="px-6 py-3 font-medium w-24 text-center">
                        Mentions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedRuns.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          <LayoutList className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          No responses recorded yet.
                        </td>
                      </tr>
                    ) : (
                      sortedRuns.map((run) => (
                        <tr
                          key={run.id}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4 align-top">
                            <div className="font-medium text-gray-900">
                              {formatDate(new Date(run.executedAt))}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatTime(new Date(run.executedAt))}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 text-xs font-medium">
                                {run.model}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="text-gray-600 line-clamp-3 group-hover:line-clamp-none transition-all duration-200 text-sm leading-relaxed bg-gray-50 p-3 rounded border border-gray-100 prose prose-sm prose-gray max-w-none">
                              {run.response ? (
                                <ReactMarkdown
                                  components={{
                                    h1: ({ children }) => (
                                      <h1 className="text-base font-semibold text-gray-900 mt-2 mb-1">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-sm font-semibold text-gray-900 mt-2 mb-1">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-xs font-semibold text-gray-900 mt-2 mb-1">
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="text-xs text-gray-700 mb-2 leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside space-y-0.5 mb-2 text-xs text-gray-700">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside space-y-0.5 mb-2 text-xs text-gray-700">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-xs text-gray-700">
                                        {children}
                                      </li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-gray-900">
                                        {children}
                                      </strong>
                                    ),
                                    code: ({ children }) => (
                                      <code className="px-1 py-0.5 bg-gray-200 text-gray-800 rounded text-[10px] font-mono">
                                        {children}
                                      </code>
                                    ),
                                    a: ({ href, children }) => (
                                      <a
                                        href={href}
                                        className="text-orange-600 hover:text-orange-700 underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >
                                  {run.response}
                                </ReactMarkdown>
                              ) : (
                                <span className="italic text-gray-400">
                                  No response content
                                </span>
                              )}
                            </div>
                            {/* Extracted Brands Mini-list */}
                            {run.brandMentions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {run.brandMentions.map((bm) => (
                                  <span
                                    key={bm.brand}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                      bm.mentioned
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        : "bg-gray-50 border-gray-200 text-gray-500"
                                    }`}
                                  >
                                    {bm.brand}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top text-center">
                            {run.mentions > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                {run.mentions}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
