"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Small triangle component that rotates smoothly
function DropdownTriangle({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={cn(
        "w-2 h-2 text-gray-400 transition-transform duration-200 ease-out flex-shrink-0",
        isOpen && "rotate-180"
      )}
      viewBox="0 0 8 6"
      fill="currentColor"
    >
      <path d="M4 6L0 0h8L4 6z" />
    </svg>
  );
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  promptCount: number;
  visibilityScore?: number;
  prompts: {
    id: string;
    promptText: string;
    category: string;
    isActive: boolean;
    visibilityScore?: number;
  }[];
}

const TOPICS_PER_PAGE = 5;
const PROMPTS_PER_PAGE = 5;

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

  // Topic pagination
  const [topicPage, setTopicPage] = useState(1);
  const [promptPage, setPromptPage] = useState(1);

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
      setSelectedCitations([]);
      setCitationPage(1);
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
    setPromptPage(1); // Reset prompt pagination
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
    <div className="w-[440px] border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Content Configuration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Write long-form AEO content based on an analysis of the current
          top-cited pages.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Topics Card */}
        <div className="relative">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header with label and dropdown trigger */}
            <button
              onClick={() =>
                !isLoadingTopics && setTopicDropdownOpen(!topicDropdownOpen)
              }
              disabled={isLoadingTopics}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-all text-left"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Topics
              </div>
              <div className="flex items-center justify-between">
                {selectedTopic ? (
                  <span className="text-sm text-gray-900">
                    {selectedTopic.name}
                  </span>
                ) : isLoadingTopics ? (
                  <span className="text-sm text-gray-400">
                    Loading topics...
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Search topics</span>
                )}
                {isLoadingTopics ? (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
                ) : (
                  <DropdownTriangle isOpen={topicDropdownOpen} />
                )}
              </div>
            </button>
          </div>

          {/* Expanded table - positioned as overlay */}
          {topicDropdownOpen && !isLoadingTopics && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setTopicDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {/* Table Header */}
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Topics
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Visibility Score
                  </span>
                </div>

                {/* Topics list */}
                <div>
                  {topics.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No topics found
                    </div>
                  ) : (
                    topics
                      .slice(
                        (topicPage - 1) * TOPICS_PER_PAGE,
                        topicPage * TOPICS_PER_PAGE
                      )
                      .map((topic) => {
                        const isSelected = selectedTopicId === topic.id;
                        return (
                          <div key={topic.id} className="px-2 py-1">
                            <div
                              className={cn(
                                "group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors",
                                isSelected && "bg-gray-100"
                              )}
                              onClick={() => handleTopicSelect(topic.id)}
                            >
                              <span className="text-sm text-gray-900">
                                {topic.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                {(topic.visibilityScore ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTopicId(null);
                      setSelectedPromptId(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Reset selection
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Page{" "}
                      <span className="font-medium text-gray-900">
                        {topicPage}
                      </span>{" "}
                      of {Math.ceil(topics.length / TOPICS_PER_PAGE) || 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopicPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={topicPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopicPage((p) =>
                          Math.min(
                            Math.ceil(topics.length / TOPICS_PER_PAGE),
                            p + 1
                          )
                        );
                      }}
                      disabled={
                        topicPage >= Math.ceil(topics.length / TOPICS_PER_PAGE)
                      }
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Prompts Card */}
        <div
          className={cn(
            "relative",
            !isPromptsEnabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header with label and dropdown trigger */}
            <button
              onClick={() =>
                isPromptsEnabled && setPromptDropdownOpen(!promptDropdownOpen)
              }
              disabled={!isPromptsEnabled}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-all text-left"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Prompts{" "}
                {selectedPrompt && (
                  <span className="text-gray-400 font-normal">(1)</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                {selectedPrompt ? (
                  <span className="text-sm text-gray-900 truncate pr-2">
                    {selectedPrompt.promptText.slice(0, 50)}...
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Search prompts</span>
                )}
                <DropdownTriangle isOpen={promptDropdownOpen} />
              </div>
            </button>
          </div>

          {/* Expanded table - positioned as overlay */}
          {promptDropdownOpen && selectedTopic && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setPromptDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {/* Table Header */}
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Prompts
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Visibility Score
                  </span>
                </div>

                {/* Prompts list */}
                <div>
                  {selectedTopic.prompts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No prompts in this topic
                    </div>
                  ) : (
                    selectedTopic.prompts
                      .slice(
                        (promptPage - 1) * PROMPTS_PER_PAGE,
                        promptPage * PROMPTS_PER_PAGE
                      )
                      .map((prompt) => {
                        const isSelected = selectedPromptId === prompt.id;
                        return (
                          <div key={prompt.id} className="px-2 py-1">
                            <div
                              className={cn(
                                "group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors",
                                isSelected && "bg-gray-100"
                              )}
                              onClick={() => handlePromptSelect(prompt.id)}
                            >
                              <span className="flex-1 text-sm text-gray-900 leading-snug pr-3">
                                {prompt.promptText}
                              </span>
                              <span className="text-sm text-gray-500 flex-shrink-0">
                                {(prompt.visibilityScore ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Page{" "}
                      <span className="font-medium text-gray-900">
                        {promptPage}
                      </span>{" "}
                      of{" "}
                      {Math.ceil(
                        selectedTopic.prompts.length / PROMPTS_PER_PAGE
                      ) || 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPromptPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={promptPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPromptPage((p) =>
                          Math.min(
                            Math.ceil(
                              selectedTopic.prompts.length / PROMPTS_PER_PAGE
                            ),
                            p + 1
                          )
                        );
                      }}
                      disabled={
                        promptPage >=
                        Math.ceil(
                          selectedTopic.prompts.length / PROMPTS_PER_PAGE
                        )
                      }
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Platforms Selector */}
        <div
          className={cn(
            "relative",
            !isPlatformsEnabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                isPlatformsEnabled &&
                setPlatformDropdownOpen(!platformDropdownOpen)
              }
              disabled={!isPlatformsEnabled}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-all text-left"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Platforms (optional){" "}
                <span className="text-gray-400 font-normal">
                  ({selectedPlatforms.length})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {PLATFORMS.filter((p) =>
                    selectedPlatforms.includes(p.id)
                  ).map((platform) => (
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
                  ))}
                </div>
                <DropdownTriangle isOpen={platformDropdownOpen} />
              </div>
            </button>
          </div>

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

        {/* Top-Cited Pages */}
        <div
          className={cn(
            "relative",
            !isCitationsEnabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                isCitationsEnabled &&
                !isLoadingCitations &&
                setCitationDropdownOpen(!citationDropdownOpen)
              }
              disabled={!isCitationsEnabled || isLoadingCitations}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-all text-left"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                Top-Cited Pages (optional){" "}
                <span className="text-gray-400 font-normal">
                  Max. {MAX_CITATIONS}
                </span>
              </div>
              <div className="flex items-center justify-between">
                {selectedCitations.length > 0 ? (
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
                ) : isLoadingCitations ? (
                  <span className="text-sm text-gray-400">
                    Loading citations...
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">
                    Search citations
                  </span>
                )}
                {isLoadingCitations ? (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
                ) : (
                  <DropdownTriangle isOpen={citationDropdownOpen} />
                )}
              </div>
            </button>
          </div>

          {citationDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setCitationDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {/* Citations header */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Citations
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Count
                  </span>
                </div>

                {/* Citations list */}
                <div>
                  {paginatedCitations.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No citations found
                    </div>
                  ) : (
                    paginatedCitations.map((citation) => {
                      const isChecked = selectedCitations.includes(
                        citation.url
                      );
                      const isDisabled =
                        !isChecked && selectedCitations.length >= MAX_CITATIONS;
                      return (
                        <div key={citation.url} className="px-2 py-1">
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                              isDisabled
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-100"
                            )}
                            onClick={() =>
                              !isDisabled && toggleCitation(citation.url)
                            }
                          >
                            <div
                              className={cn(
                                "w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                isChecked
                                  ? "bg-[#6366f1] border-[#6366f1]"
                                  : "border-gray-300 bg-white"
                              )}
                            >
                              {isChecked && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
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
                            </div>
                            <span className="text-sm text-gray-500">
                              {citation.count}
                            </span>
                          </div>
                        </div>
                      );
                    })
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
                      onClick={() => setCitationPage((p) => Math.max(1, p - 1))}
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

        {/* Brand Kit (disabled) */}
        <div className="relative opacity-50">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="w-full px-4 py-3 bg-white text-left">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Brand Kit (optional)
              </div>
              <span className="text-sm text-gray-400">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Audience Segment (disabled) */}
        <div className="relative opacity-50">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="w-full px-4 py-3 bg-white text-left">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Audience segment (optional)
              </div>
              <span className="text-sm text-gray-400">Coming Soon</span>
            </div>
          </div>
        </div>

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
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    Title Recommendations
                  </span>
                  <button
                    onClick={generateTitleSuggestions}
                    disabled={isGeneratingTitles}
                    className="p-0.5 rounded hover:bg-gray-100"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5 text-gray-400",
                        isGeneratingTitles && "animate-spin"
                      )}
                    />
                  </button>
                </div>

                {isGeneratingTitles ? (
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                ) : titleSuggestions.length > 0 ? (
                  <div className="space-y-0.5">
                    {titleSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setTitle(suggestion)}
                        className="w-full text-left px-2 py-2 text-sm text-gray-900 rounded-lg transition-colors hover:bg-gray-100"
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

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-4",
                canGenerate
                  ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Generate Draft
            </button>
          </div>
        )}

        {/* Fallback Generate Button when no prompt selected */}
        {!selectedPromptId && (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Generate Draft
          </button>
        )}
      </div>
    </div>
  );
}
