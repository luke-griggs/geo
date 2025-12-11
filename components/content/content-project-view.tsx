"use client";

import { useState } from "react";
import {
  Copy,
  Download,
  FileText,
  Code,
  Check,
  ExternalLink,
  AlertCircle,
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

interface ContentProject {
  id: string;
  domainId: string;
  keyword: string;
  title: string | null;
  template: "smart_suggestion" | "blog_post" | "listicle" | null;
  status: "draft" | "generating" | "completed" | "failed";
  serpResults: SerpResult[] | null;
  selectedPages: string[] | null;
  generatedContent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentProjectViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ContentProject;
}

type ExportFormat = "markdown" | "html" | "text";

export function ContentProjectView({
  open,
  onOpenChange,
  project,
}: ContentProjectViewProps) {
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "sources">("preview");

  const convertToHtml = (markdown: string): string => {
    // Simple markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\* (.*$)/gim, "<li>$1</li>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
      // Paragraphs
      .replace(/\n\n/g, "</p><p>")
      // Line breaks
      .replace(/\n/g, "<br>");

    return `<article><p>${html}</p></article>`;
  };

  const convertToPlainText = (markdown: string): string => {
    return markdown
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[\*\-]\s+/gm, "• ")
      .replace(/^\d+\.\s+/gm, (match, offset, str) => {
        const lines = str.substring(0, offset).split("\n");
        const lineNum =
          lines.filter((l: string) => /^\d+\.\s+/.test(l)).length + 1;
        return `${lineNum}. `;
      });
  };

  const handleCopy = async (format: ExportFormat) => {
    if (!project.generatedContent) return;

    let content = project.generatedContent;
    if (format === "html") {
      content = convertToHtml(project.generatedContent);
    } else if (format === "text") {
      content = convertToPlainText(project.generatedContent);
    }

    await navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (format: ExportFormat) => {
    if (!project.generatedContent) return;

    let content = project.generatedContent;
    let filename = `${project.title || "content"}`;
    let mimeType = "text/plain";

    if (format === "markdown") {
      filename += ".md";
      mimeType = "text/markdown";
    } else if (format === "html") {
      content = convertToHtml(project.generatedContent);
      filename += ".html";
      mimeType = "text/html";
    } else {
      content = convertToPlainText(project.generatedContent);
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

  const templateLabels = {
    smart_suggestion: "Smart Suggestion",
    blog_post: "Blog Post",
    listicle: "Listicle",
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {project.title || "Untitled Content"}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-500">
                  Keyword:{" "}
                  <span className="font-medium">{project.keyword}</span>
                </span>
                {project.template && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {templateLabels[project.template]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Export buttons */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-500 mr-2">Export:</span>
          <button
            onClick={() => handleCopy("markdown")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copiedFormat === "markdown" ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
            Copy Markdown
          </button>
          <button
            onClick={() => handleCopy("html")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copiedFormat === "html" ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Code className="w-4 h-4 text-gray-400" />
            )}
            Copy HTML
          </button>
          <button
            onClick={() => handleDownload("markdown")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" />
            Download .md
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "preview"
                  ? "border-[#6366f1] text-[#6366f1]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab("sources")}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "sources"
                  ? "border-[#6366f1] text-[#6366f1]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Sources ({project.selectedPages?.length || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "preview" ? (
            project.status === "failed" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Generation Failed
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  We couldn't generate content for this project. Please try
                  again or contact support if the issue persists.
                </p>
              </div>
            ) : project.status === "generating" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 border-4 border-[#6366f1]/20 border-t-[#6366f1] rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Generating Content...
                </h3>
                <p className="text-sm text-gray-500">This may take a minute.</p>
              </div>
            ) : !project.generatedContent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Content Yet
                </h3>
                <p className="text-sm text-gray-500">
                  This project hasn't been generated yet.
                </p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {/* Render markdown as formatted content */}
                <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-[500px] overflow-y-auto">
                  {project.generatedContent}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {project.selectedPages && project.selectedPages.length > 0 ? (
                project.selectedPages.map((url, index) => {
                  const serpResult = project.serpResults?.find(
                    (r) => r.url === url
                  );
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${extractDomain(
                          url
                        )}&sz=32`}
                        alt=""
                        className="w-6 h-6 rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {serpResult?.title || url}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {extractDomain(url)}
                        </p>
                        {serpResult?.snippet && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {serpResult.snippet}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </a>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No source pages were used for this content.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

