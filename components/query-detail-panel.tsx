"use client";

import {
  X,
  ChevronLeft,
  Download,
  Check,
  Calendar,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

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
  brandMentions?: BrandMention[];
  citations?: Citation[];
}

interface QueryDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  latestRun: PromptRun | null;
  isMentioned?: boolean;
  domainName?: string;
}

function getPlatformIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case "chatgpt":
    case "openai":
      return (
        <div className="w-5 h-5 rounded flex items-center justify-center overflow-hidden">
          <img
            src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=32"
            alt="ChatGPT"
            className="w-5 h-5"
          />
        </div>
      );
    case "perplexity":
      return (
        <div className="w-5 h-5 rounded bg-[#1a1a2e] flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">P</span>
        </div>
      );
    case "claude":
      return (
        <div className="w-5 h-5 rounded bg-[#cc785c] flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">C</span>
        </div>
      );
    case "gemini":
      return (
        <div className="w-5 h-5 rounded bg-[#4285f4] flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">G</span>
        </div>
      );
    case "google_aio":
      return (
        <div className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center">
          <span className="text-[10px] text-gray-600 font-bold">AI</span>
        </div>
      );
  }
}

function getPlatformName(provider: string) {
  switch (provider.toLowerCase()) {
    case "chatgpt":
    case "openai":
      return "ChatGPT";
    case "perplexity":
      return "Perplexity";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "google_aio":
      return "Google AI Overviews";
    default:
      return provider;
  }
}

// Helper to extract domain from URL
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    return match ? match[1] : url;
  }
}

export function QueryDetailPanel({
  isOpen,
  onClose,
  promptText,
  latestRun,
  isMentioned,
  domainName,
}: QueryDetailPanelProps) {
  const [citationsExpanded, setCitationsExpanded] = useState(true);

  if (!isOpen) return null;

  const mentionedBrands =
    latestRun?.brandMentions?.filter((b) => b.mentioned) || [];
  const formattedDate = latestRun
    ? new Date(latestRun.executedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const citations = latestRun?.citations || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[800px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Prompt Section */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                PROMPT
              </p>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                {promptText}
              </h2>
            </div>

            {/* Properties Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Properties</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                  {latestRun && getPlatformIcon(latestRun.llmProvider)}
                  <span className="text-gray-700">
                    {latestRun ? getPlatformName(latestRun.llmProvider) : "—"}
                  </span>
                </div>
              </div>
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formattedDate}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Visibility</span>
              {isMentioned ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <Check className="h-4 w-4" />
                  {domainName || "Your brand"} is mentioned & cited
                </span>
              ) : (
                <span className="text-sm text-gray-400">Not mentioned</span>
              )}
            </div>

            {/* Mentions */}
            {mentionedBrands.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Mentions</span>
                <div className="flex flex-wrap items-center gap-2">
                  {mentionedBrands.map((brand) => {
                    const domain =
                      brand.brandDomain ||
                      `${brand.brandName
                        .toLowerCase()
                        .replace(/\s+/g, "")}.com`;
                    return (
                      <div
                        key={brand.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-sm"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                          alt={brand.brandName}
                          className="w-4 h-4 rounded-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span className="text-gray-700">{brand.brandName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Response Section */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Response</p>
              {latestRun?.responseText ? (
                <div className="prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-gray-900 mt-3 mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-gray-700">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto text-xs mb-3">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-600 my-3">
                          {children}
                        </blockquote>
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
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full text-sm border border-gray-200 rounded">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2 bg-gray-50 text-left font-medium text-gray-700 border-b border-gray-200">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 text-gray-700 border-b border-gray-100">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {latestRun.responseText}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No response available
                </p>
              )}
            </div>

            {/* Citations Section */}
            {citations.length > 0 && (
              <div>
                <button
                  onClick={() => setCitationsExpanded(!citationsExpanded)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors mb-4"
                >
                  Citations
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      citationsExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>

                {citationsExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {citations.map((citation, index) => {
                      const domain = getDomainFromUrl(citation.url);
                      return (
                        <a
                          key={index}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all hover:shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                              alt=""
                              className="w-4 h-4 rounded-sm flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <span className="text-xs text-gray-500 truncate">
                              {domain}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                            {citation.title || domain}
                          </h4>
                          {citation.snippet && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {citation.snippet}
                            </p>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
