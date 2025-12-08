"use client";

import { cn } from "@/lib/utils";

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
            <h3 className="text-sm font-medium text-gray-600">
              Industry Ranking
            </h3>
            <div
              className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 cursor-help"
              title="Brands with highest visibility in AI responses"
            >
              ?
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Brands with highest visibility
          </p>
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 mb-6">
        {userVisibility.toFixed(1)}%
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
          No brand data available
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-8">
                  #
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">
                  BRAND
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    MENTIONS
                    <span className="text-gray-400 text-[10px]">?</span>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    POSITION
                    <span className="text-gray-400 text-[10px]">?</span>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    CHANGE
                    <span className="text-gray-400 text-[10px]">?</span>
                  </div>
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">
                  <div className="flex items-center justify-end gap-1">
                    VISIBILITY
                    <span className="text-gray-400 text-[10px]">?</span>
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
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {item.brand.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={cn(
                          "font-medium",
                          item.isUserDomain ? "text-[#c9644a]" : "text-gray-900"
                        )}
                      >
                        {item.brand}
                      </span>
                      {item.isUserDomain && (
                        <span className="text-[10px] bg-[#c9644a]/10 text-[#c9644a] px-1.5 py-0.5 rounded font-medium">
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


