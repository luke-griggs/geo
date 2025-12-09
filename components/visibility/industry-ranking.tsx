"use client";

import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RankingItem {
  rank: number;
  brand: string;
  mentions: number;
  position: number | null;
  change: number;
  visibility: number;
  isUserDomain?: boolean;
}

interface IndustryRankingProps {
  data: RankingItem[];
  userVisibility: number;
}

export function IndustryRanking({
  data,
  userVisibility,
}: IndustryRankingProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-gray-900">
              Industry Ranking
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Brands ranked by how often they appear in AI responses. Your
                    position shows how you compare to competitors across AI
                    platforms.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Brands with highest visibility
          </p>
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 mb-4">
        {userVisibility.toFixed(1)}%
      </div>

      {data.length === 0 ? (
        <div className="h-[150px] flex items-center justify-center text-gray-400 text-sm">
          No brand data available
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[32%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-1 text-xs font-medium text-gray-500">
                  #
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">
                  BRAND
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    MENTIONS
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Total number of times this brand was mentioned in AI
                            responses.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    POSITION
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Average position when mentioned in AI responses.
                            Lower is better.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    CHANGE
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Change in visibility compared to the previous time
                            period.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    VISIBILITY
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Percentage of AI responses that mention this brand.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.rank}
                  className={cn(
                    "border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    item.isUserDomain && "bg-orange-50/50"
                  )}
                >
                  <td className="py-3 px-1 text-gray-400">{item.rank}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                        {item.brand.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={cn(
                          "font-medium truncate",
                          item.isUserDomain ? "text-[#6366f1]" : "text-gray-900"
                        )}
                      >
                        {item.brand}
                      </span>
                      {item.isUserDomain && (
                        <span className="text-[10px] bg-[#6366f1]/10 text-[#6366f1] px-1.5 py-0.5 rounded font-medium shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {item.mentions}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {item.position !== null ? item.position.toFixed(1) : "-"}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span
                      className={cn(
                        item.change > 0 && "text-green-600",
                        item.change < 0 && "text-red-600",
                        item.change === 0 && "text-gray-400"
                      )}
                    >
                      {item.change > 0 && "+"}
                      {item.change.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {item.visibility.toFixed(1)}%
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
