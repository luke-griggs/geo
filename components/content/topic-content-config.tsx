"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  promptCount: number;
  prompts: {
    id: string;
    promptText: string;
    category: string;
    isActive: boolean;
  }[];
}

interface Citation {
  url: string;
  title: string;
  snippet?: string;
  count: number;
  isEarned: boolean;
}

interface TopicContentConfigProps {
  organizationId: string;
  domainId: string;
  template: string;
  onBack: () => void;
  onGenerate: (config: {
    topicId: string;
    promptId: string;
    platforms: string[];
    citations: string[];
    title: string;
    template: string;
  }) => void;
}

const PLATFORMS = [
  { id: "chatgpt", name: "ChatGPT", domain: "chatgpt.com" },
  { id: "perplexity", name: "Perplexity", domain: "perplexity.ai" },
  { id: "gemini", name: "Gemini", domain: "gemini.google.com" },
];

const ITEMS_PER_PAGE = 5;
const MAX_CITATIONS = 20;

export function TopicContentConfig({
  organizationId,
  domainId,
  template,
  onBack,
  onGenerate,
}: TopicContentConfigProps) {
  // State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "chatgpt",
    "perplexity",
    "gemini",
  ]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoadingCitations, setIsLoadingCitations] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<string[]>([]);
  const [citationPage, setCitationPage] = useState(1);
  const [title, setTitle] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Dropdowns open state
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [citationDropdownOpen, setCitationDropdownOpen] = useState(false);

  // Fetch topics on mount
  useEffect(() => {
    fetchTopics();
  }, [organizationId, domainId]);

  // Fetch citations when prompt changes
  useEffect(() => {
    if (selectedPromptId) {
      fetchCitations(selectedPromptId);
    } else {
      setCitations([]);
      setSelectedCitations([]);
    }
  }, [selectedPromptId]);

  // Generate title suggestions when prompt is selected
  useEffect(() => {
    if (selectedPromptId && selectedTopicId) {
      generateTitleSuggestions();
    }
  }, [selectedPromptId, selectedTopicId]);

  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/topics`
      );
      if (!response.ok) throw new Error("Failed to fetch topics");
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const fetchCitations = async (promptId: string) => {
    setIsLoadingCitations(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/prompts/${promptId}/citations`
      );
      if (!response.ok) throw new Error("Failed to fetch citations");
      const data = await response.json();
      setCitations(data.citations || []);
      // Auto-select first 10 citations
      setSelectedCitations(
        (data.citations || []).slice(0, 10).map((c: Citation) => c.url)
      );
      setCitationPage(1);
    } catch (error) {
      console.error("Error fetching citations:", error);
      setCitations([]);
    } finally {
      setIsLoadingCitations(false);
    }
  };

  const generateTitleSuggestions = async () => {
    const selectedTopic = topics.find((t) => t.id === selectedTopicId);
    const selectedPrompt = selectedTopic?.prompts.find(
      (p) => p.id === selectedPromptId
    );

    if (!selectedPrompt) return;

    setIsGeneratingTitles(true);
    try {
      const response = await fetch("/api/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: selectedPrompt.promptText,
          topic: selectedTopic?.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTitleSuggestions(data.titles || []);
      }
    } catch (error) {
      console.error("Error generating titles:", error);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedPromptId(null); // Reset prompt when topic changes
    setTopicDropdownOpen(false);
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    setPromptDropdownOpen(false);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const toggleCitation = (url: string) => {
    setSelectedCitations((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      }
      if (prev.length >= MAX_CITATIONS) {
        return prev; // Don't allow more than max
      }
      return [...prev, url];
    });
  };

  const resetCitationSelection = () => {
    setSelectedCitations([]);
  };

  // Get selected topic and prompt
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const selectedPrompt = selectedTopic?.prompts.find(
    (p) => p.id === selectedPromptId
  );

  // Pagination
  const totalPages = Math.ceil(citations.length / ITEMS_PER_PAGE);
  const paginatedCitations = citations.slice(
    (citationPage - 1) * ITEMS_PER_PAGE,
    citationPage * ITEMS_PER_PAGE
  );

  // Enable states
  const isPromptsEnabled = !!selectedTopicId;
  const isPlatformsEnabled = !!selectedPromptId;
  const isCitationsEnabled = !!selectedPromptId;

  // Can generate
  const canGenerate = selectedTopicId && selectedPromptId && title.trim();

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    onGenerate({
      topicId: selectedTopicId!,
      promptId: selectedPromptId!,
      platforms: selectedPlatforms,
      citations: selectedCitations,
      title: title.trim(),
      template,
    });
  };

  return (
    <div className="w-[380px] border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Content Configuration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Write long-form AEO content based on an analysis of the current
          top-cited pages.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Topics Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topics
          </label>
          <div className="relative">
            <button
              onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
              disabled={isLoadingTopics}
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
            >
              {isLoadingTopics ? (
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading topics...
                </span>
              ) : selectedTopic ? (
                <span className="text-gray-900">{selectedTopic.name}</span>
              ) : (
                <span className="text-gray-400">Search topics</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {topicDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setTopicDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {topics.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No topics found
                    </div>
                  ) : (
                    topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center justify-between",
                          selectedTopicId === topic.id && "bg-gray-50"
                        )}
                      >
                        <span className="text-gray-900">{topic.name}</span>
                        <span className="text-xs text-gray-400">
                          {topic.promptCount} prompts
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Prompts Dropdown */}
        <div
          className={cn(!isPromptsEnabled && "opacity-50 pointer-events-none")}
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompts{" "}
            {selectedPrompt && (
              <span className="text-gray-400 font-normal">(1)</span>
            )}
          </label>
          <div className="relative">
            <button
              onClick={() =>
                isPromptsEnabled && setPromptDropdownOpen(!promptDropdownOpen)
              }
              disabled={!isPromptsEnabled}
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
            >
              {selectedPrompt ? (
                <span className="text-gray-900 truncate pr-2">
                  Selected {selectedPrompt.promptText.slice(0, 40)}...
                </span>
              ) : (
                <span className="text-gray-400">Search prompts</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {promptDropdownOpen && selectedTopic && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPromptDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {selectedTopic.prompts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No prompts in this topic
                    </div>
                  ) : (
                    selectedTopic.prompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handlePromptSelect(prompt.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm hover:bg-gray-50",
                          selectedPromptId === prompt.id && "bg-gray-50"
                        )}
                      >
                        <span className="text-gray-900 line-clamp-2">
                          {prompt.promptText}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Platforms Selector */}
        <div
          className={cn(
            !isPlatformsEnabled && "opacity-50 pointer-events-none"
          )}
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms (optional){" "}
            <span className="text-gray-400 font-normal">
              ({selectedPlatforms.length})
            </span>
          </label>
          <div className="relative">
            <button
              onClick={() =>
                isPlatformsEnabled &&
                setPlatformDropdownOpen(!platformDropdownOpen)
              }
              disabled={!isPlatformsEnabled}
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                {PLATFORMS.filter((p) => selectedPlatforms.includes(p.id)).map(
                  (platform) => (
                    <div
                      key={platform.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden"
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${platform.domain}&sz=32`}
                        alt={platform.name}
                        className="w-5 h-5"
                      />
                    </div>
                  )
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {platformDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPlatformDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${platform.domain}&sz=32`}
                            alt={platform.name}
                            className="w-5 h-5"
                          />
                        </div>
                        <span className="text-gray-900">{platform.name}</span>
                      </div>
                      {selectedPlatforms.includes(platform.id) && (
                        <Check className="w-4 h-4 text-[#6366f1]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top-Cited Pages */}
        <div
          className={cn(
            !isCitationsEnabled && "opacity-50 pointer-events-none"
          )}
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Top-Cited Pages (optional){" "}
            <span className="text-gray-400 font-normal">
              Max. {MAX_CITATIONS}
            </span>
          </label>
          <div className="relative">
            <button
              onClick={() =>
                isCitationsEnabled &&
                setCitationDropdownOpen(!citationDropdownOpen)
              }
              disabled={!isCitationsEnabled}
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              {isLoadingCitations ? (
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading citations...
                </span>
              ) : selectedCitations.length > 0 ? (
                <div className="flex items-center gap-1">
                  {selectedCitations.slice(0, 10).map((url, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${extractDomain(
                          url
                        )}&sz=16`}
                        alt=""
                        className="w-4 h-4"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                  {selectedCitations.length > 10 && (
                    <span className="text-xs text-gray-500 ml-1">
                      +{selectedCitations.length - 10}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">Search citations</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {citationDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setCitationDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {/* Citations header */}
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Citations
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      Count
                    </span>
                  </div>

                  {/* Citations list */}
                  <div className="max-h-60 overflow-y-auto">
                    {paginatedCitations.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No citations found
                      </div>
                    ) : (
                      paginatedCitations.map((citation) => (
                        <label
                          key={citation.url}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCitations.includes(citation.url)}
                            onChange={() => toggleCitation(citation.url)}
                            disabled={
                              !selectedCitations.includes(citation.url) &&
                              selectedCitations.length >= MAX_CITATIONS
                            }
                            className="h-4 w-4 rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${extractDomain(
                                citation.url
                              )}&sz=16`}
                              alt=""
                              className="w-4 h-4 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-900 truncate">
                              {extractDomain(citation.url)}
                              {citation.title &&
                                citation.title !== citation.url && (
                                  <span className="text-gray-500">
                                    /{citation.title.slice(0, 20)}...
                                  </span>
                                )}
                            </span>
                            {citation.isEarned && (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                Earned
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {citation.count}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  {/* Pagination footer */}
                  <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={resetCitationSelection}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Reset selection
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Page {citationPage} of {totalPages || 1}
                      </span>
                      <button
                        onClick={() =>
                          setCitationPage((p) => Math.max(1, p - 1))
                        }
                        disabled={citationPage === 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() =>
                          setCitationPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={citationPage >= totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Brand Kit (disabled) */}
        <div className="opacity-50 pointer-events-none">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Kit (optional)
          </label>
          <div className="relative">
            <button
              disabled
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg text-left"
            >
              <span className="text-gray-400">Select brand kit</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Audience Segment (disabled) */}
        <div className="opacity-50 pointer-events-none">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audience segment (optional)
          </label>
          <div className="relative">
            <button
              disabled
              className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg text-left"
            >
              <span className="text-gray-400">Select audience segment</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Additional instructions link */}
        <button className="text-sm text-[#6366f1] hover:text-[#4f46e5] font-medium">
          Add additional instructions
        </button>

        {/* Article Title Section */}
        {selectedPromptId && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Article Title
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Select a title recommendation, inspired by the top-cited pages for
              your prompts, or create your own.
            </p>

            {/* Title input */}
            <input
              type="text"
              placeholder="Write a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] mb-4"
            />

            {/* Title Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Title Recommendations
                </span>
                <button
                  onClick={generateTitleSuggestions}
                  disabled={isGeneratingTitles}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 text-gray-400",
                      isGeneratingTitles && "animate-spin"
                    )}
                  />
                </button>
              </div>

              {isGeneratingTitles ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Generating suggestions...
                  </span>
                </div>
              ) : titleSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {titleSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setTitle(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm rounded-lg border transition-colors",
                        title === suggestion
                          ? "border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No suggestions available yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
            canGenerate
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Generate Content Brief
        </button>
      </div>
    </div>
  );
}
