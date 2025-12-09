"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Play,
  Archive,
  RotateCcw,
} from "lucide-react";
import { QueryDetailPanel } from "@/components/query-detail-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BrandMention {
  id: string;
  brandName: string;
  brandDomain: string | null;
  position: number | null;
  mentioned: boolean;
}

interface Citation {
  url: string;
  title?: string;
  snippet?: string;
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
  citations?: Citation[];
}

interface Prompt {
  id: string;
  promptText: string;
  category: string;
  isActive: boolean;
  isArchived: boolean;
  location: string | null;
  createdAt: string;
  runs: PromptRun[];
}

interface PromptsSectionProps {
  workspaceId: string;
  domainId: string;
  domainName: string;
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
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366f1] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6366f1]"></span>
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

// Provider icons for mention rate tooltip
const providerIcons: Record<string, React.ReactNode> = {
  chatgpt: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  ),
  gemini: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3.6l4.2 7.2H7.8L12 3.6zm-4.8 9h9.6L12 20.4l-4.8-7.8z" />
    </svg>
  ),
  perplexity: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const providerNames: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

interface MentionRateTooltipProps {
  runs: PromptRun[];
  domainName: string;
}

function MentionRateTooltip({ runs, domainName }: MentionRateTooltipProps) {
  // Calculate mention stats from runs
  const mentionsByProvider: Record<
    string,
    { mentioned: number; total: number }
  > = {};

  runs.forEach((run) => {
    const provider = run.llmProvider.toLowerCase();
    if (!mentionsByProvider[provider]) {
      mentionsByProvider[provider] = { mentioned: 0, total: 0 };
    }
    mentionsByProvider[provider].total += 1;

    // Check if the domain was mentioned in this run
    const wasMentioned = run.mentionAnalyses?.some((m) => m.mentioned) || false;
    if (wasMentioned) {
      mentionsByProvider[provider].mentioned += 1;
    }
  });

  const totalRuns = runs.length;
  const totalMentioned = Object.values(mentionsByProvider).reduce(
    (acc, { mentioned }) => acc + mentioned,
    0
  );
  const mentionRate =
    totalRuns > 0 ? Math.round((totalMentioned / totalRuns) * 100) : 0;

  if (totalRuns === 0) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  // Color based on mention rate
  const getStrokeColor = (rate: number) => {
    if (rate >= 70) return "#10b981";
    if (rate >= 40) return "#f59e0b";
    return "#9ca3af";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative w-10 h-10 flex items-center justify-center cursor-help`}
          >
            {/* Circular progress ring */}
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={getStrokeColor(mentionRate)}
                strokeWidth="3"
                strokeDasharray={`${(mentionRate / 100) * 87.96} 87.96`}
                strokeLinecap="round"
              />
            </svg>
            {/* Center text */}
            <span
              className="absolute text-[10px] font-semibold"
              style={{ color: getStrokeColor(mentionRate) }}
            >
              {mentionRate}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-0 w-56">
          <div className="p-3">
            {/* Header */}
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-gray-900">
                {mentionRate}% Mention Rate
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                {totalMentioned} of {totalRuns} AI answers mentioned{" "}
                <span className="font-medium text-gray-700">{domainName}</span>{" "}
                for this prompt.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-2" />

            {/* Platform breakdown */}
            <div>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                By Platform
              </p>
              <div className="space-y-1.5">
                {Object.entries(mentionsByProvider).map(([provider, stats]) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600 [&>svg]:w-3.5 [&>svg]:h-3.5">
                        {providerIcons[provider] || (
                          <span className="w-3.5 h-3.5 rounded bg-gray-200" />
                        )}
                      </span>
                      <span className="text-xs text-gray-700">
                        {providerNames[provider] || provider}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">
                      {stats.mentioned}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] focus:bg-white transition-all placeholder:text-gray-400 resize-none"
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
  // Cache both active and archived prompts for instant switching
  const [activePrompts, setActivePrompts] = useState<Prompt[]>([]);
  const [archivedPrompts, setArchivedPrompts] = useState<Prompt[]>([]);
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
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(
    new Set()
  );
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get current prompts based on view mode
  const prompts = viewMode === "active" ? activePrompts : archivedPrompts;

  // Selection handler for individual prompts
  const togglePromptSelection = (promptId: string) => {
    setSelectedPromptIds((prev) => {
      const next = new Set(prev);
      if (next.has(promptId)) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });
  };

  // Fetch both active and archived prompts in parallel for instant switching
  const fetchAllPrompts = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch(
          `/api/workspaces/${workspaceId}/domains/${domainId}/prompts?archived=false`
        ),
        fetch(
          `/api/workspaces/${workspaceId}/domains/${domainId}/prompts?archived=true`
        ),
      ]);

      if (!activeRes.ok || !archivedRes.ok) {
        throw new Error("Failed to fetch prompts");
      }

      const [activeData, archivedData] = await Promise.all([
        activeRes.json(),
        archivedRes.json(),
      ]);

      setActivePrompts(activeData.prompts || []);
      setArchivedPrompts(archivedData.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, domainId]);

  useEffect(() => {
    fetchAllPrompts();
  }, [fetchAllPrompts]);

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
      await fetchAllPrompts();
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
      await fetchAllPrompts();
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

  // Archive/unarchive a single prompt
  const handleArchivePrompt = async (promptId: string, archive: boolean) => {
    setIsArchiving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/domains/${domainId}/prompts/${promptId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: archive }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error || `Failed to ${archive ? "archive" : "restore"} prompt`
        );
      }

      // Refresh prompts list
      await fetchAllPrompts();
      // Clear selection
      setSelectedPromptIds(new Set());
      // Close panel if open
      if (isPanelOpen) {
        setIsPanelOpen(false);
        setSelectedPrompt(null);
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Failed to ${archive ? "archive" : "restore"} prompt`
      );
    } finally {
      setIsArchiving(false);
    }
  };

  // Archive/unarchive selected prompts
  const handleArchiveSelected = async (archive: boolean) => {
    setIsArchiving(true);
    try {
      const promises = Array.from(selectedPromptIds).map((promptId) =>
        fetch(
          `/api/workspaces/${workspaceId}/domains/${domainId}/prompts/${promptId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isArchived: archive }),
          }
        )
      );

      await Promise.all(promises);

      // Refresh prompts list
      await fetchAllPrompts();
      // Clear selection
      setSelectedPromptIds(new Set());
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Failed to ${archive ? "archive" : "restore"} prompts`
      );
    } finally {
      setIsArchiving(false);
    }
  };

  // Get average position from latest run's mention analysis
  const getAveragePosition = (prompt: Prompt): number | null => {
    if (prompt.runs.length === 0) return null;
    const latestRun = prompt.runs[0];
    if (!latestRun.mentionAnalyses || latestRun.mentionAnalyses.length === 0)
      return null;

    // Check if mentioned in the latest run
    const mentionedAnalysis = latestRun.mentionAnalyses.find(
      (m) => m.mentioned
    );
    if (!mentionedAnalysis || !mentionedAnalysis.position) return null;

    return mentionedAnalysis.position;
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

  // Selection state helpers (must be after filteredPrompts)
  const toggleSelectAll = () => {
    if (selectedPromptIds.size === filteredPrompts.length) {
      setSelectedPromptIds(new Set());
    } else {
      setSelectedPromptIds(new Set(filteredPrompts.map((p) => p.id)));
    }
  };

  const isAllSelected =
    filteredPrompts.length > 0 &&
    selectedPromptIds.size === filteredPrompts.length;
  const isSomeSelected = selectedPromptIds.size > 0;

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
              fetchAllPrompts();
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and manage prompts to track how your brand appears in AI
          responses
        </p>
      </div>

      {/* Main container with border */}
      <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col flex-1">
        {/* Gray toolbar bar */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
          {/* Left side - Search and filter */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 transition-all placeholder:text-gray-400"
              />
            </div>
            {/* Active/Archived dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {viewMode === "active" ? "Active" : "Archived"}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        setViewMode("active");
                        setIsDropdownOpen(false);
                        setSelectedPromptIds(new Set());
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        viewMode === "active"
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("archived");
                        setIsDropdownOpen(false);
                        setSelectedPromptIds(new Set());
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        viewMode === "archived"
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Archive/Restore button - shows when items are selected */}
            {isSomeSelected && (
              <button
                onClick={() => handleArchiveSelected(viewMode === "active")}
                disabled={isArchiving}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : viewMode === "active" ? (
                  <Archive className="h-4 w-4" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {viewMode === "active" ? "Archive" : "Restore"}
              </button>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* New Article button - shows when items are selected */}
            {isSomeSelected && (
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                <Plus className="h-4 w-4" />
                New Article
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create prompts
            </button>
          </div>
        </div>

        {/* Table header info */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* Checkbox container - same w-6 as row checkboxes */}
          <div className="w-6 flex items-center justify-center">
            <button
              onClick={toggleSelectAll}
              className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center transition-all duration-150"
              style={{
                backgroundColor: isAllSelected ? "#6366f1" : "transparent",
                border: isAllSelected ? "none" : "1.5px solid #d1d5db",
              }}
            >
              {isAllSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          </div>
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
          <div className="ml-auto flex items-center gap-4">
            <div className="w-14 text-xs font-medium text-gray-500 text-center">
              Mentions
            </div>
            <div className="w-20 text-xs font-medium text-gray-500 text-center">
              Avg Position
            </div>
            <div className="w-32 text-xs font-medium text-gray-500 text-center">
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
        <div className="flex-1 overflow-auto px-4">
          {filteredPrompts.length === 0 ? (
            viewMode === "archived" ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Archive className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No archived prompts
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Prompts you archive will appear here. You can restore them at
                  any time.
                </p>
              </div>
            ) : (
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create your first prompt
                </button>
              </div>
            )
          ) : (
            filteredPrompts.map((prompt, index) => {
              const isRunning = runningPromptIds.has(prompt.id);
              const status = getPromptStatus(prompt);
              const lastRun = prompt.runs[0];
              const brandMentions = lastRun?.brandMentions || [];
              const avgPosition = getAveragePosition(prompt);
              const isSelected = selectedPromptIds.has(prompt.id);

              const handleRowClick = () => {
                setSelectedPrompt(prompt);
                setIsPanelOpen(true);
              };

              const handleCheckboxClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                togglePromptSelection(prompt.id);
              };

              return (
                <div
                  key={prompt.id}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Row number / Checkbox */}
                  <div
                    onClick={handleCheckboxClick}
                    className="w-6 h-6 flex items-center justify-center cursor-pointer relative"
                  >
                    {/* Row number - hidden on hover or when selected */}
                    <span
                      className={`text-sm text-gray-400 text-center absolute transition-opacity duration-150 ${
                        isSelected ? "opacity-0" : "group-hover:opacity-0"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {/* Checkbox - shown on hover or when selected */}
                    <div
                      className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center transition-all duration-150 absolute ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "#6366f1" : "transparent",
                        border: isSelected ? "none" : "1.5px solid #d1d5db",
                      }}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Clickable area for navigation - prompt text only */}
                  <div
                    onClick={handleRowClick}
                    className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                  >
                    <span className="text-sm text-gray-900 truncate hover:underline">
                      {prompt.promptText}
                    </span>
                    {isRunning ? <RunningDot /> : <StatusDot status={status} />}
                  </div>

                  {/* Right side columns - matching header layout */}
                  <div className="flex items-center gap-4">
                    {/* Mention Rate */}
                    <div className="w-14 flex items-center justify-center">
                      <MentionRateTooltip
                        runs={prompt.runs}
                        domainName={domainName}
                      />
                    </div>

                    {/* Avg Position */}
                    <div className="w-20 flex items-center justify-center">
                      {avgPosition ? (
                        <span className="text-xs text-gray-700 font-medium">
                          {avgPosition}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* Top Brands */}
                    <div className="w-32 flex items-center justify-center">
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

                    {/* Actions */}
                    <div className="w-16 flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunPrompt(prompt.id);
                        }}
                        disabled={isRunning}
                        className="p-1.5 text-gray-400 hover:text-[#6366f1] hover:bg-[#6366f1]/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              );
            })
          )}
        </div>
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
                citations: selectedPrompt.runs[0].citations,
              }
            : null
        }
        isMentioned={
          selectedPrompt?.runs[0]?.mentionAnalyses?.some((m) => m.mentioned) ||
          false
        }
        domainName={domainName}
        onArchive={
          selectedPrompt
            ? () =>
                handleArchivePrompt(selectedPrompt.id, viewMode === "active")
            : undefined
        }
        isArchived={viewMode === "archived"}
        isArchiving={isArchiving}
      />
    </div>
  );
}
