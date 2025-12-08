"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronDown, X, Loader2, Play } from "lucide-react";
import { QueryDetailPanel } from "@/components/query-detail-panel";

interface BrandMention {
  id: string;
  brandName: string;
  brandDomain: string | null;
  position: number | null;
  mentioned: boolean;
}

interface PromptRun {
  id: string;
  llmProvider: string;
  responseText: string | null;
  executedAt: string;
  error: string | null;
  mentionAnalyses?: Array<{
    mentioned: boolean;
    position: number | null;
  }>;
  brandMentions?: BrandMention[];
}

interface Prompt {
  id: string;
  promptText: string;
  category: string;
  isActive: boolean;
  location: string | null;
  createdAt: string;
  runs: PromptRun[];
}

interface PromptsSectionProps {
  workspaceId: string;
  domainId: string;
  domainName: string;
}

function ScoreCircle({ score }: { score: number }) {
  const hasScore = score > 0;
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
        hasScore
          ? "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 ring-2 ring-emerald-400/50"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      {score}
    </div>
  );
}

function StatusDot({ status }: { status: "active" | "warning" | "inactive" }) {
  const colors = {
    active: "bg-emerald-500",
    warning: "bg-amber-500",
    inactive: "bg-gray-300",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

function RunningDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
    </span>
  );
}

function TopBrands({ brands }: { brands: BrandMention[] }) {
  // Sort by position (lower is better), filter only mentioned brands
  const sortedBrands = brands
    .filter((b) => b.mentioned)
    .sort((a, b) => (a.position || 999) - (b.position || 999))
    .slice(0, 3);

  const remainingCount = Math.max(
    0,
    brands.filter((b) => b.mentioned).length - 3
  );

  if (sortedBrands.length === 0) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <div className="flex items-center -space-x-1.5">
      {sortedBrands.map((brand, index) => {
        const domain =
          brand.brandDomain ||
          `${brand.brandName.toLowerCase().replace(/\s+/g, "")}.com`;
        return (
          <div
            key={brand.id}
            className="w-6 h-6 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"
            style={{ zIndex: 3 - index }}
            title={brand.brandName}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
              alt={brand.brandName}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                // Fallback to first letter if favicon fails
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.classList.add(
                  "bg-gray-100",
                  "text-xs",
                  "font-medium",
                  "text-gray-500"
                );
                e.currentTarget.parentElement!.textContent =
                  brand.brandName[0].toUpperCase();
              }}
            />
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div
          className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-medium text-gray-500"
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (promptText: string) => Promise<void>;
  isSubmitting: boolean;
}

function CreatePromptModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: CreatePromptModalProps) {
  const [promptText, setPromptText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    await onSubmit(promptText.trim());
    setPromptText("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Prompt
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="promptText"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Prompt Text
              </label>
              <textarea
                id="promptText"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., What are the best tools for digital badge issuance?"
                rows={4}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all placeholder:text-gray-400 resize-none"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter a search query or question that your target audience might
                ask AI assistants. Results will be generated on the next
                scheduled run.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!promptText.trim() || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Prompt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PromptsSection({
  workspaceId,
  domainId,
  domainName,
}: PromptsSectionProps) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningPromptIds, setRunningPromptIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch prompts
  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch prompts");
      }
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, domainId]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Create a new prompt
  const handleCreatePrompt = async (promptText: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptText,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create prompt");
      }

      // Refresh prompts list
      await fetchPrompts();
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run a single prompt
  const handleRunPrompt = async (promptId: string) => {
    setRunningPromptIds((prev) => new Set(prev).add(promptId));
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts/${promptId}/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "chatgpt" }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to run prompt");
      }

      // Refresh prompts to show new run
      await fetchPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run prompt");
    } finally {
      setRunningPromptIds((prev) => {
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
    }
  };

  // Calculate score based on latest run's mention analysis
  const getPromptScore = (prompt: Prompt): number => {
    if (prompt.runs.length === 0) return 0;
    const latestRun = prompt.runs[0];
    if (!latestRun.mentionAnalyses || latestRun.mentionAnalyses.length === 0)
      return 0;

    // Check if mentioned in the latest run
    const mentioned = latestRun.mentionAnalyses.some((m) => m.mentioned);
    if (!mentioned) return 0;

    // Get the position (lower is better)
    const position = latestRun.mentionAnalyses.find(
      (m) => m.mentioned
    )?.position;
    if (!position) return 50;

    // Score based on position: 1st = 100, 2nd = 90, etc.
    return Math.max(0, 110 - position * 10);
  };

  // Get status based on latest run
  const getPromptStatus = (
    prompt: Prompt
  ): "active" | "warning" | "inactive" => {
    if (!prompt.isActive) return "inactive";
    if (prompt.runs.length === 0) return "warning";
    const latestRun = prompt.runs[0];
    if (latestRun.error) return "warning";
    return "active";
  };

  // Filter prompts by search query
  const filteredPrompts = prompts.filter((p) =>
    p.promptText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading prompts...</p>
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
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchPrompts();
            }}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pt-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Left side - Search and filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Active
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <Plus className="h-4 w-4" />
            New Article
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create prompts
          </button>
        </div>
      </div>

      {/* Domain indicator */}
      <div className="flex items-center gap-2 pb-3 text-sm text-gray-500">
        <span>Tracking:</span>
        <span className="font-medium text-gray-900">{domainName}</span>
      </div>

      {/* Table header info */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
        />
        <span className="text-sm text-gray-500">
          Prompts ({filteredPrompts.length})
        </span>
        <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ↑↓
        </button>
        <button className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </button>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
          All tracked
          <ChevronDown className="h-3 w-3" />
        </button>

        {/* Right side headers */}
        <div className="ml-auto flex items-center">
          <div className="w-28 text-xs font-medium text-gray-500 text-center">
            Top Brands
          </div>
          <div className="w-24 text-xs font-medium text-gray-500 text-center">
            Last Run
          </div>
          <div className="w-16 text-xs font-medium text-gray-500 text-center">
            Actions
          </div>
        </div>
      </div>

      {/* Table rows */}
      <div className="flex-1 overflow-auto">
        {filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No prompts yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Create your first prompt to start tracking how AI assistants
              mention your brand.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create your first prompt
            </button>
          </div>
        ) : (
          filteredPrompts.map((prompt, index) => {
            const isRunning = runningPromptIds.has(prompt.id);
            const score = getPromptScore(prompt);
            const status = getPromptStatus(prompt);
            const lastRun = prompt.runs[0];
            const brandMentions = lastRun?.brandMentions || [];

            const handleRowClick = () => {
              setSelectedPrompt(prompt);
              setIsPanelOpen(true);
            };

            return (
              <div
                key={prompt.id}
                className="flex items-center gap-3 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
              >
                {/* Clickable area for navigation */}
                <div
                  onClick={handleRowClick}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  {/* Row number */}
                  <span className="w-6 text-sm text-gray-400 text-center">
                    {index + 1}
                  </span>

                  {/* Score */}
                  <ScoreCircle score={score} />

                  {/* Prompt text */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-900 truncate hover:underline">
                      {prompt.promptText}
                    </span>
                    {isRunning ? <RunningDot /> : <StatusDot status={status} />}
                  </div>

                  {/* Top Brands */}
                  <div className="w-28 flex items-center justify-center">
                    <TopBrands brands={brandMentions} />
                  </div>

                  {/* Last Run */}
                  <div className="w-24 flex items-center justify-center">
                    {lastRun ? (
                      <span className="text-xs text-gray-500">
                        {new Date(lastRun.executedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">Never</span>
                    )}
                  </div>
                </div>

                {/* Actions - separate from clickable area */}
                <div className="w-16 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunPrompt(prompt.id);
                    }}
                    disabled={isRunning}
                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Run prompt"
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Prompt Modal */}
      <CreatePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePrompt}
        isSubmitting={isSubmitting}
      />

      {/* Query Detail Panel */}
      <QueryDetailPanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedPrompt(null);
        }}
        promptText={selectedPrompt?.promptText || ""}
        latestRun={
          selectedPrompt?.runs[0]
            ? {
                id: selectedPrompt.runs[0].id,
                llmProvider: selectedPrompt.runs[0].llmProvider,
                responseText: selectedPrompt.runs[0].responseText,
                executedAt: selectedPrompt.runs[0].executedAt,
                error: selectedPrompt.runs[0].error,
                brandMentions: selectedPrompt.runs[0].brandMentions,
              }
            : null
        }
        isMentioned={
          selectedPrompt?.runs[0]?.mentionAnalyses?.some((m) => m.mentioned) ||
          false
        }
        domainName={domainName}
      />
    </div>
  );
}
