"use client";

import { useState } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";

// Placeholder prompt data
const mockPrompts = [
  {
    id: "1",
    prompt: "open badges 3.0 compliant platforms for skill verification",
    score: 0,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["green", "orange", "red"],
  },
  {
    id: "2",
    prompt: "alternatives to accredible for digital badge issuance",
    score: 0,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["gray", "yellow", "red"],
  },
  {
    id: "3",
    prompt: "is badgespot good for global employee recognition programs",
    score: 100,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["teal", "purple"],
  },
  {
    id: "4",
    prompt: "badgespot vs credly for employee training programs",
    score: 0,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["teal", "orange"],
  },
  {
    id: "5",
    prompt: "how to issue verifiable badges to employees",
    score: 0,
    status: "warning" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["pink", "yellow", "red"],
  },
  {
    id: "6",
    prompt: "badgespot pricing and features for learning organizations",
    score: 100,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["teal", "black", "blue"],
  },
  {
    id: "7",
    prompt: "what are digital credentials and why do organizations use them",
    score: 0,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: [],
  },
  {
    id: "8",
    prompt: "best LMS integrations for credential management 2025",
    score: 0,
    status: "active" as const,
    location: { flag: "🇺🇸", city: "Chicago, U..." },
    topBrands: ["orange", "red", "blue"],
  },
];

function ScoreCircle({ score }: { score: number }) {
  const hasScore = score > 0;
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
        hasScore
          ? "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 ring-2 ring-emerald-400/50"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      {score}
    </div>
  );
}

function StatusDot({ status }: { status: "active" | "warning" | "inactive" }) {
  const colors = {
    active: "bg-emerald-500",
    warning: "bg-amber-500",
    inactive: "bg-gray-300",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

function BrandIcon({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    gray: "bg-gray-600",
    yellow: "bg-yellow-400",
    teal: "bg-teal-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    blue: "bg-blue-500",
    black: "bg-gray-900",
  };
  return (
    <div
      className={`w-6 h-6 rounded-full ${colorMap[color] || "bg-gray-400"} ring-2 ring-white`}
    />
  );
}

export function PromptsSection() {
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 pb-6">
        {/* Left side - Search and filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              className="w-64 pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Active
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <Plus className="h-4 w-4" />
            New Article
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            Create prompts
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
        </div>
      </div>

      {/* Table header info */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
        />
        <span className="text-sm text-gray-500">
          Prompts ({mockPrompts.length})
        </span>
        <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ↑↓
        </button>
        <button className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
          All tracked
          <ChevronDown className="h-3 w-3" />
        </button>

        {/* Right side headers */}
        <div className="ml-auto flex items-center">
          <div className="w-28 text-xs font-medium text-gray-500 text-center">Locations</div>
          <div className="w-28 text-xs font-medium text-gray-500 text-center">Top Brands</div>
        </div>
      </div>

      {/* Table rows */}
      <div className="flex-1 overflow-auto">
        {mockPrompts.map((prompt, index) => (
          <div
            key={prompt.id}
            className="flex items-center gap-3 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
          >
            {/* Row number */}
            <span className="w-6 text-sm text-gray-400 text-center">
              {index + 1}
            </span>

            {/* Score */}
            <ScoreCircle score={prompt.score} />

            {/* Prompt text */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-900 truncate">
                {prompt.prompt}
              </span>
              <StatusDot status={prompt.status} />
            </div>

            {/* Location */}
            <div className="w-28 flex items-center justify-center gap-1.5">
              <span className="text-base">{prompt.location.flag}</span>
              <span className="text-xs text-gray-500 truncate">
                {prompt.location.city}
              </span>
            </div>

            {/* Top Brands */}
            <div className="w-28 flex items-center justify-center">
              {prompt.topBrands.length > 0 ? (
                <div className="flex items-center -space-x-1.5">
                  {prompt.topBrands.slice(0, 3).map((color, i) => (
                    <BrandIcon key={i} color={color} />
                  ))}
                  {prompt.topBrands.length > 3 && (
                    <span className="ml-2 text-xs text-gray-400">
                      +{prompt.topBrands.length - 3}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
