"use client";

import { useState } from "react";
import { Search, ChevronDown, Calendar, Info, MapPin, Sparkles, Tag } from "lucide-react";

// Mock data for the mentions page
const mockQueries = [
  {
    id: "1",
    date: "Dec 5",
    query: "badgespot vs credly for employee training programs",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "teal" }, { color: "blue" }],
  },
  {
    id: "2",
    date: "Dec 5",
    query: "best digital credential platforms for universities 2025",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "teal" }, { color: "orange" }, { color: "purple" }],
    extraCitations: 1,
  },
  {
    id: "3",
    date: "Dec 5",
    query: "how to issue verifiable badges to employees",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "blue" }, { color: "green" }, { color: "orange" }],
  },
  {
    id: "4",
    date: "Dec 5",
    query: "top credential management systems for corporate training",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "red" }, { color: "yellow" }],
    extraCitations: 1,
  },
  {
    id: "5",
    date: "Dec 5",
    query: "badgespot pricing and features for learning organizations",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 1, total: 1 },
    avgPosition: null,
    sentiment: 0.7,
    citations: [{ color: "teal" }, { color: "black" }, { color: "blue" }],
    extraCitations: 2,
  },
  {
    id: "6",
    date: "Dec 5",
    query: "open badges 3.0 compliant platforms for skill verification",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "purple" }, { color: "green" }],
    extraCitations: 2,
  },
  {
    id: "7",
    date: "Dec 5",
    query: "alternatives to accredible for digital badge issuance",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [{ color: "gray" }, { color: "blue" }],
    extraCitations: 1,
  },
  {
    id: "8",
    date: "Dec 5",
    query: "what are digital credentials and why do organizations use them",
    source: "openai",
    location: { city: "Chicago, United States", flag: "🇺🇸" },
    mentioned: { count: 0, total: 1 },
    avgPosition: null,
    sentiment: null,
    citations: [],
  },
];

const platformData = [
  { name: "OpenAI", icon: "openai", mentions: 2, percentage: 20 },
];

// Mini area chart data points (normalized 0-1)
const chartData = [0, 0, 0, 0, 0.3, 0.9, 0.7, 0.4];

function FilterButton({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      {children}
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  );
}

function MiniAreaChart() {
  const height = 120;
  const width = 360;
  const padding = 8;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  
  const points = chartData.map((value, i) => ({
    x: padding + (i / (chartData.length - 1)) * chartWidth,
    y: height - padding - value * chartHeight,
  }));

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (2 * (point.x - prev.x)) / 3;
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Y-axis labels */}
      {[4, 3, 2, 1, 0].map((val, i) => (
        <text
          key={val}
          x={4}
          y={padding + (i / 4) * chartHeight + 4}
          className="text-[10px] fill-gray-400"
        >
          {val}
        </text>
      ))}
      
      {/* X-axis labels */}
      {["Nov 29", "Nov 30", "Dec 1", "Dec 2", "Dec 3", "Dec 4", "Dec 5"].map((label, i) => (
        <text
          key={label}
          x={padding + 20 + (i / 6) * (chartWidth - 20)}
          y={height - 2}
          className="text-[9px] fill-gray-400"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
      
      {/* Baseline */}
      <line
        x1={padding + 16}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="rgb(229, 231, 235)"
        strokeWidth={1}
      />
      
      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGradient)" transform="translate(16, 0)" />
      
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgb(249, 115, 22)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(16, 0)"
      />
    </svg>
  );
}

function SourceIcon({ source }: { source: string }) {
  if (source === "openai") {
    return (
      <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4043-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997z" />
        </svg>
      </div>
    );
  }
  return <div className="w-8 h-8 rounded-full bg-gray-200" />;
}

function CitationDot({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
    yellow: "bg-yellow-400",
    gray: "bg-gray-500",
    black: "bg-gray-900",
  };
  return (
    <div className={`w-5 h-5 rounded-full ${colorMap[color] || "bg-gray-400"} ring-2 ring-white`} />
  );
}

export function MentionsSection() {
  const [showMentionsOnly, setShowMentionsOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"mentions" | "citations" | "position">("mentions");

  const mentionsCount = mockQueries.reduce((acc, q) => acc + q.mentioned.count, 0);
  const totalPlatformMentions = platformData.reduce((acc, p) => acc + p.mentions, 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <FilterButton icon={Calendar}>Last 7 days</FilterButton>
        <FilterButton icon={Sparkles}>All Platforms</FilterButton>
        <FilterButton icon={Tag}>All Topics</FilterButton>
        <FilterButton icon={MapPin}>Locations</FilterButton>
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Mentions & Citations card */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">Mentions & Citations</h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-4">Daily brand mentions and branded citations across AI answers</p>
          
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-gray-900">0</span>
            <span className="text-sm font-medium text-red-500">-2 vs yesterday</span>
          </div>

          <MiniAreaChart />
        </div>

        {/* Performance by Platform card */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">Performance by Platform</h3>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-4">Mentions and branded citations per AI engine</p>
          
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-3xl font-bold text-gray-900">20.0%</span>
            <span className="text-sm text-gray-500">+0.00</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
            {(["mentions", "citations", "position"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "position" ? "Position" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Platform list */}
          <div className="space-y-3">
            {platformData.map((platform) => (
              <div key={platform.name} className="flex items-center gap-4">
                <SourceIcon source={platform.icon} />
                <span className="text-sm font-medium text-gray-900 w-20">{platform.name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${platform.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-8 text-right">{platform.mentions}</span>
                <span className="text-sm text-gray-500 w-14 text-right">{platform.percentage}.0%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Queries section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-gray-900">All Queries</h3>
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-4">All queries and responses from AI platforms</p>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          {/* Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${
                showMentionsOnly ? "bg-gray-900" : "bg-gray-200"
              }`}
              onClick={() => setShowMentionsOnly(!showMentionsOnly)}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  showMentionsOnly ? "translate-x-4" : ""
                }`}
              />
            </div>
            <span className="text-sm text-gray-600">Show mentions only</span>
          </label>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{mockQueries.length} queries</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search queries..."
                className="w-56 pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-20">Date</th>
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3 w-24 text-center">Sources</th>
                <th className="px-4 py-3 w-36">Locations</th>
                <th className="px-4 py-3 w-24 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Mentioned
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 w-24 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Avg Position
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 w-28 text-center">
                  <div className="flex items-center justify-center gap-1">
                    Sentiment
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 w-28 text-center">Citations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mockQueries
                .filter((q) => !showMentionsOnly || q.mentioned.count > 0)
                .map((query) => (
                  <tr key={query.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{query.date}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{query.query}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <SourceIcon source={query.source} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{query.location.city.split(",")[0]},</span>
                        <span className="text-sm text-gray-500">{query.location.city.split(",")[1]}</span>
                        <span className="text-base">{query.location.flag}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium rounded ${
                          query.mentioned.count > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {query.mentioned.count}/{query.mentioned.total}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium bg-rose-50 text-rose-600 rounded">
                        N/A
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {query.sentiment !== null ? (
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-400 rounded-full"
                              style={{ width: `${query.sentiment * 100}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-2 bg-gray-100 rounded-full" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {query.citations.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {query.citations.slice(0, 3).map((c, i) => (
                              <CitationDot key={i} color={c.color} />
                            ))}
                            {query.extraCitations && query.extraCitations > 0 && (
                              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                +{query.extraCitations}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </div>
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



