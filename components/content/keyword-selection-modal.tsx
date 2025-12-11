"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, TrendingUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Keyword {
  text: string;
  frequency: number;
  topicName?: string;
}

interface KeywordSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  domainId: string;
  onKeywordSelected: (keyword: string) => void;
}

export function KeywordSelectionModal({
  open,
  onOpenChange,
  organizationId,
  domainId,
  onKeywordSelected,
}: KeywordSelectionModalProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customKeyword, setCustomKeyword] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Fetch keywords when modal opens
  useEffect(() => {
    if (open) {
      fetchKeywords();
    } else {
      // Reset state when closed
      setSelectedKeyword(null);
      setCustomKeyword("");
      setShowCustomInput(false);
      setSearchQuery("");
    }
  }, [open, organizationId, domainId]);

  const fetchKeywords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/keywords`
      );
      if (!response.ok) throw new Error("Failed to fetch keywords");
      const data = await response.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      setKeywords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter keywords based on search
  const filteredKeywords = keywords.filter((k) =>
    k.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContinue = () => {
    const keywordToUse = showCustomInput ? customKeyword : selectedKeyword;
    if (keywordToUse) {
      onKeywordSelected(keywordToUse);
    }
  };

  const canContinue = showCustomInput
    ? customKeyword.trim().length > 0
    : selectedKeyword !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Select a keyword
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Choose a keyword to create content around. These are based on
            searches AI models make when answering questions in your industry.
          </p>
        </DialogHeader>

        <div className="px-6 pb-4 flex-shrink-0">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
            />
          </div>
        </div>

        {/* Keywords list */}
        <div className="flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading keywords...
              </span>
            </div>
          ) : filteredKeywords.length === 0 && !showCustomInput ? (
            <div className="text-center py-12">
              <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {keywords.length === 0
                  ? "No keywords found. Run some prompts first to generate keyword suggestions."
                  : "No keywords match your search."}
              </p>
              <button
                onClick={() => setShowCustomInput(true)}
                className="mt-4 text-sm text-[#6366f1] hover:text-[#4f46e5] font-medium"
              >
                Enter a custom keyword instead
              </button>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {/* Custom keyword option */}
              {!showCustomInput && (
                <button
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedKeyword(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 hover:border-[#6366f1] hover:bg-[#6366f1]/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Use a custom keyword
                    </p>
                    <p className="text-xs text-gray-500">
                      Enter your own keyword to target
                    </p>
                  </div>
                </button>
              )}

              {/* Custom keyword input */}
              {showCustomInput && (
                <div className="p-4 rounded-lg border-2 border-[#6366f1] bg-[#6366f1]/5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom keyword
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your keyword..."
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                  />
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomKeyword("");
                    }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel and choose from suggestions
                  </button>
                </div>
              )}

              {/* Keyword suggestions */}
              {!showCustomInput &&
                filteredKeywords.map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedKeyword(keyword.text)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                      selectedKeyword === keyword.text
                        ? "border-[#6366f1] bg-[#6366f1]/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {keyword.text}
                      </p>
                      {keyword.topicName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Topic: {keyword.topicName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {keyword.frequency}x
                      </span>
                      {selectedKeyword === keyword.text && (
                        <div className="w-5 h-5 rounded-full bg-[#6366f1] flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex-shrink-0">
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
            Continue
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

