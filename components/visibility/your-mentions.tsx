"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TimePeriod, Platform } from "./filter-bar";

interface YourMentionsProps {
  organizationId: string;
  domainId: string;
  timePeriod: TimePeriod;
  platforms: Platform[];
}

interface MentionQuery {
  id: string;
  promptId: string;
  query: string;
  date: string;
  source: string;
  position: number | null;
  mentioned: boolean;
}

const platformColors: Record<string, string> = {
  chatgpt: "bg-[#10a37f]",
  openai: "bg-[#10a37f]",
  claude: "bg-[#cc785c]",
  perplexity: "bg-[#1a1a2e]",
  gemini: "bg-[#4285f4]",
  grok: "bg-gray-900",
  deepseek: "bg-blue-600",
};

function SourceIcon({ source }: { source: string }) {
  const bgColor = platformColors[source.toLowerCase()] || "bg-gray-200";

  if (source.toLowerCase() === "chatgpt" || source.toLowerCase() === "openai") {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
        <img
          src="https://www.google.com/s2/favicons?domain=https://chatgpt.com&sz=32"
          alt="ChatGPT"
          className="w-6 h-6"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center`}
    >
      <span className="text-[10px] font-bold text-white">
        {source.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function YourMentions({
  organizationId,
  domainId,
  timePeriod,
  platforms,
}: YourMentionsProps) {
  const [mentions, setMentions] = useState<MentionQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMentions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range
      const endDate = new Date();
      let startDate: Date;

      switch (timePeriod) {
        case "7d":
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        mentionsOnly: "true",
        limit: "10",
      });

      if (platforms.length > 0) {
        params.set("platforms", platforms.join(","));
      }

      const res = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/queries?${params}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch mentions");
      }

      const data = await res.json();

      // Transform queries to mention format
      const mentionData: MentionQuery[] = (data.queries || []).map(
        (q: {
          id: string;
          promptId: string;
          query: string;
          date: string;
          source: string;
          avgPosition: number | null;
          mentioned: { count: number };
        }) => ({
          id: q.id,
          promptId: q.promptId,
          query: q.query,
          date: q.date,
          source: q.source,
          position: q.avgPosition,
          mentioned: q.mentioned.count > 0,
        })
      );

      setMentions(mentionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, domainId, timePeriod, platforms]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-gray-900">Your Mentions</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  AI mentions of your brand across models and prompts.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <a
          href="#"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        AI mentions of your brand across models and prompts.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : mentions.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-400">No mentions found</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 pr-4">
                  <div className="flex items-center gap-1">
                    Prompt
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">The prompt that was run</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Model
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">AI model that responded</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="pb-3 pl-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    # Rank
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Your position in the response
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mentions.map((mention) => (
                <tr
                  key={mention.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-900 line-clamp-2">
                      {mention.query}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <SourceIcon source={mention.source} />
                      <span className="text-sm text-gray-600 capitalize">
                        {mention.source}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-center">
                    {mention.position !== null ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium bg-blue-50 text-blue-600 rounded">
                        #{mention.position}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
