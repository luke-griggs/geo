"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Copy, Download, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentProject {
  id: string;
  domainId: string;
  keyword: string;
  title: string | null;
  template: "smart_suggestion" | "blog_post" | "listicle" | null;
  status: "draft" | "generating" | "completed" | "failed";
  serpResults: unknown[] | null;
  selectedPages: string[] | null;
  generatedContent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DraftViewProps {
  project: ContentProject | null;
  isGenerating: boolean;
  title: string;
  onBack: () => void;
  organizationId: string;
  domainId: string;
}

// Skeleton loading component matching the design
function LoadingSkeleton() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Skeleton lines - matching the image layout */}
      <div className="space-y-6">
        {/* First group */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-80 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-64 animate-pulse" />
        </div>

        {/* Second group */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-72 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-56 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-64 animate-pulse" />
        </div>

        {/* Third group */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-80 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-60 animate-pulse" />
        </div>

        {/* Fourth group */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-68 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-52 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-72 animate-pulse" />
        </div>

        {/* Fifth group */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-76 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({
  status,
}: {
  status: "draft" | "generating" | "completed" | "failed";
}) {
  const statusConfig = {
    draft: { label: "Draft", color: "bg-amber-500" },
    generating: { label: "Generating", color: "bg-amber-500" },
    completed: { label: "Draft", color: "bg-amber-500" },
    failed: { label: "Failed", color: "bg-red-500" },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", config.color)} />
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  );
}

// Rotating phrases for loading state
const LOADING_PHRASES = [
  "Crafting your content",
  "Teaching AI to type faster",
  "Channeling our inner Shakespeare",
  "Making sure it passes the vibe check",
  "Polishing every paragraph",
  "Convincing sentences to cooperate",
  "Herding keywords into formation",
  "Giving your content a pep talk",
  "Dotting i's and crossing t's",
];

export function DraftView({
  project,
  isGenerating,
  title,
  onBack,
}: DraftViewProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Rotate through loading phrases
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleCopy = async (format: "markdown" | "html" | "text") => {
    if (!project?.generatedContent) return;

    let content = project.generatedContent;

    if (format === "html") {
      // Simple markdown to HTML conversion
      content = project.generatedContent
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^\* (.*$)/gim, "<li>$1</li>")
        .replace(/^- (.*$)/gim, "<li>$1</li>")
        .replace(/\n\n/g, "</p><p>");
      content = `<article><p>${content}</p></article>`;
    } else if (format === "text") {
      content = project.generatedContent
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^[\*\-]\s+/gm, "- ");
    }

    await navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (format: "markdown" | "html" | "text") => {
    if (!project?.generatedContent) return;

    let content = project.generatedContent;
    let filename = `${title || "draft"}`;
    let mimeType = "text/plain";

    if (format === "markdown") {
      filename += ".md";
      mimeType = "text/markdown";
    } else if (format === "html") {
      content = project.generatedContent
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      filename += ".html";
      mimeType = "text/html";
    } else {
      content = project.generatedContent
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1");
      filename += ".txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showContent = project?.generatedContent && !isGenerating;
  const currentStatus = isGenerating
    ? "generating"
    : project?.status || "draft";

  return (
    <div
      className={cn(
        "flex flex-col h-full -m-8 bg-white transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Header */}
      <div className="h-14 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-sm text-gray-900 font-medium truncate max-w-md">
            {title || "Untitled Draft"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge status={currentStatus} />

          {showContent && (
            <>
              {/* Copy dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy className="w-4 h-4" />
                    Copy
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCopy("markdown")}>
                    {copiedFormat === "markdown" ? (
                      <Check className="w-4 h-4 mr-2 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCopy("html")}>
                    {copiedFormat === "html" ? (
                      <Check className="w-4 h-4 mr-2 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy as HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCopy("text")}>
                    {copiedFormat === "text" ? (
                      <Check className="w-4 h-4 mr-2 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy as Plain Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload("markdown")}>
                    Download as .md
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("html")}>
                    Download as .html
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("text")}>
                    Download as .txt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {isGenerating ? (
            // Loading state
            <div className="animate-in fade-in duration-300">
              <div className="h-12 mb-4 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={currentPhraseIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="text-3xl font-semibold text-gray-900 absolute"
                  >
                    {LOADING_PHRASES[currentPhraseIndex]}
                  </motion.h1>
                </AnimatePresence>
              </div>
              <p className="text-base text-gray-500 mb-10">
                We&apos;re generating your content, this won&apos;t take long.
              </p>
              <LoadingSkeleton />
            </div>
          ) : showContent ? (
            // Rendered content
            <article
              className={cn(
                "prose prose-gray max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500",
                // Heading styles
                "prose-headings:font-semibold prose-headings:text-gray-900",
                "prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0",
                "prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4",
                "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3",
                // Paragraph styles
                "prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4",
                // List styles
                "prose-ul:my-4 prose-ol:my-4",
                "prose-li:text-gray-700 prose-li:mb-2",
                // Link styles
                "prose-a:text-[#6366f1] prose-a:no-underline hover:prose-a:underline",
                // Strong/bold styles
                "prose-strong:text-gray-900 prose-strong:font-semibold",
                // Table styles
                "prose-table:border-collapse prose-table:w-full",
                "prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-medium",
                "prose-td:border prose-td:border-gray-200 prose-td:px-4 prose-td:py-2"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.generatedContent}
              </ReactMarkdown>
            </article>
          ) : project?.status === "failed" ? (
            // Failed state
            <div className="text-center py-20 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">!</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Generation Failed
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                We couldn&apos;t generate your content. Please try again or
                contact support if the issue persists.
              </p>
            </div>
          ) : (
            // No content yet
            <div className="text-center py-20 animate-in fade-in duration-300">
              <p className="text-gray-500">No content generated yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
