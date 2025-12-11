"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SerpResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

interface ContentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  domainId: string;
  keyword: string;
  onBack: () => void;
  onContinue: (config: {
    keyword: string;
    title: string;
    serpResults: SerpResult[];
    selectedPages: string[];
  }) => void;
}

export function ContentConfigModal({
  open,
  onOpenChange,
  organizationId,
  domainId,
  keyword,
  onBack,
  onContinue,
}: ContentConfigModalProps) {
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isLoadingSerp, setIsLoadingSerp] = useState(false);
  const [title, setTitle] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Fetch SERP results when modal opens with a keyword
  useEffect(() => {
    if (open && keyword) {
      fetchSerpResults();
      generateTitleSuggestions();
    }
  }, [open, keyword]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSerpResults([]);
      setSelectedPages([]);
      setTitle("");
      setTitleSuggestions([]);
    }
  }, [open]);

  const fetchSerpResults = async () => {
    setIsLoadingSerp(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/keywords/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword }),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch search results");
      const data = await response.json();
      setSerpResults(data.results || []);
      // Auto-select top 5 by default
      setSelectedPages(
        (data.results || []).slice(0, 5).map((r: SerpResult) => r.url)
      );
    } catch (error) {
      console.error("Error fetching SERP results:", error);
      setSerpResults([]);
    } finally {
      setIsLoadingSerp(false);
    }
  };

  const generateTitleSuggestions = async () => {
    setIsGeneratingTitles(true);
    try {
      // Generate title suggestions using Groq
      const response = await fetch("/api/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });

      if (response.ok) {
        const data = await response.json();
        setTitleSuggestions(data.titles || []);
      } else {
        // Fallback to simple suggestions
        setTitleSuggestions([
          `${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }: A Complete Guide`,
          `Top 10 ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          } You Need to Know`,
          `The Ultimate Guide to ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }`,
        ]);
      }
    } catch (error) {
      console.error("Error generating titles:", error);
      // Fallback suggestions
      setTitleSuggestions([
        `${
          keyword.charAt(0).toUpperCase() + keyword.slice(1)
        }: A Complete Guide`,
        `Top 10 ${
          keyword.charAt(0).toUpperCase() + keyword.slice(1)
        } You Need to Know`,
      ]);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const togglePageSelection = (url: string) => {
    setSelectedPages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleContinue = () => {
    if (!title.trim()) return;
    onContinue({
      keyword,
      title: title.trim(),
      serpResults,
      selectedPages,
    });
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const canContinue = title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Content Configuration
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Configure your content based on top-ranking pages for your keyword.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Keyword display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Keyword
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{keyword}</p>
            </div>
          </div>

          {/* Top-Ranking Pages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Top-Ranking Pages{" "}
                <span className="text-gray-400 font-normal">
                  ({selectedPages.length} selected)
                </span>
              </label>
              <button
                onClick={fetchSerpResults}
                disabled={isLoadingSerp}
                className="text-xs text-[#6366f1] hover:text-[#4f46e5] flex items-center gap-1"
              >
                <RefreshCw
                  className={cn("h-3 w-3", isLoadingSerp && "animate-spin")}
                />
                Refresh
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select pages to use as research for your content. We'll analyze
              their structure and key points.
            </p>

            {isLoadingSerp ? (
              <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Fetching top results...
                </span>
              </div>
            ) : serpResults.length === 0 ? (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">
                  No results found for this keyword.
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
                {serpResults.map((result) => (
                  <label
                    key={result.url}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(result.url)}
                      onChange={() => togglePageSelection(result.url)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${extractDomain(
                            result.url
                          )}&sz=16`}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {extractDomain(result.url)}
                      </p>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Title <span className="text-[#6366f1]">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your article title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
            />

            {/* Title Suggestions */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-[#6366f1]" />
                <span className="text-xs font-medium text-gray-600">
                  Title Suggestions
                </span>
                {isGeneratingTitles && (
                  <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                )}
              </div>
              <div className="space-y-2">
                {titleSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setTitle(suggestion)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors",
                      title === suggestion
                        ? "border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-lg transition-colors",
                canContinue
                  ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Select Template
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

