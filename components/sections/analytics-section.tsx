"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Download,
} from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

// Placeholder analytics data
const stats: StatItem[] = [
  {
    label: "Total Mentions",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
  },
  {
    label: "Avg. Position",
    value: "1.4",
    change: "-0.2",
    trend: "up",
  },
  {
    label: "Visibility Score",
    value: "68.3%",
    change: "+5.2%",
    trend: "up",
  },
  {
    label: "Sentiment Score",
    value: "87",
    change: "0",
    trend: "neutral",
  },
];

const topPrompts = [
  { prompt: "Best scheduling software 2025", mentions: 124, position: 1 },
  { prompt: "Cal.com vs Calendly", mentions: 98, position: 1 },
  { prompt: "Open source appointment booking", mentions: 87, position: 2 },
  { prompt: "Team scheduling tools comparison", mentions: 76, position: 1 },
  { prompt: "Free scheduling app for business", mentions: 65, position: 3 },
];

const modelBreakdown = [
  { model: "ChatGPT", mentions: 892, percentage: 31 },
  { model: "Claude", mentions: 756, percentage: 27 },
  { model: "Gemini", mentions: 612, percentage: 22 },
  { model: "Perplexity", mentions: 587, percentage: 20 },
];

export function AnalyticsSection() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your generative engine optimization performance
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center justify-end py-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {["1d", "7d", "14d", "1m", "3m"].map((period) => (
            <button
              key={period}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === "7d"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 pb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-5 bg-white border border-gray-200 rounded-xl"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === "up"
                    ? "text-green-600"
                    : stat.trend === "down"
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : stat.trend === "down" ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Mentions over time chart placeholder */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Mentions Over Time
            </h3>
            <button className="text-xs text-gray-500 hover:text-gray-700">
              View details <ArrowUpRight className="h-3 w-3 inline" />
            </button>
          </div>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Chart placeholder</p>
          </div>
        </div>

        {/* Model breakdown */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Mentions by Model
            </h3>
            <button className="text-xs text-gray-500 hover:text-gray-700">
              View details <ArrowUpRight className="h-3 w-3 inline" />
            </button>
          </div>
          <div className="space-y-3">
            {modelBreakdown.map((item) => (
              <div key={item.model} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-gray-700">
                  {item.model}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-gray-500">
                  {item.mentions}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top performing prompts */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Top Performing Prompts
            </h3>
            <button className="text-xs text-gray-500 hover:text-gray-700">
              View all <ArrowUpRight className="h-3 w-3 inline" />
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-3">Prompt</th>
                <th className="pb-3 text-center">Position</th>
                <th className="pb-3 text-right">Mentions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topPrompts.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3">
                    <span className="text-sm text-gray-900">{item.prompt}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {item.position}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {item.mentions}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
