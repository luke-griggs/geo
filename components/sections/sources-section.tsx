"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Copy,
  Download,
  Globe,
  Link2,
  MessageSquare,
  ExternalLink,
  Clock,
  ChevronLeft,
  Calendar,
  HelpCircle,
} from "lucide-react";

// Types
type ViewType = "domain" | "url" | "prompt";
type TimePeriod = "1d" | "7d" | "14d" | "1m" | "3m";

// Mock data for Domain View
const domainData = [
  { id: "1", domain: "cal.com", favicon: "Ca", pages: 5, mentions: 5, prompts: 5, color: "#3B82F6" },
  { id: "2", domain: "calendso", favicon: "CA", pages: 1, mentions: 1, prompts: 1, color: "#6B7280" },
  { id: "3", domain: "nextcloud.com", favicon: "NC", pages: 1, mentions: 1, prompts: 1, color: "#3B82F6" },
  { id: "4", domain: "genesysgrowth.com", favicon: "GG", pages: 1, mentions: 1, prompts: 1, color: "#EF4444" },
  { id: "5", domain: "hubstaff", favicon: "HU", pages: 1, mentions: 1, prompts: 1, color: "#6B7280" },
  { id: "6", domain: "nerdisa.com", favicon: "N", pages: 1, mentions: 1, prompts: 1, color: "#8B5CF6" },
  { id: "7", domain: "easyappointments.org", favicon: "EA", pages: 1, mentions: 1, prompts: 1, color: "#10B981" },
  { id: "8", domain: "novastreets.com", favicon: "NS", pages: 1, mentions: 1, prompts: 1, color: "#F59E0B" },
  { id: "9", domain: "radicale.org", favicon: "R", pages: 1, mentions: 1, prompts: 1, color: "#EF4444" },
  { id: "10", domain: "calcom.framer.website", favicon: "CF", pages: 1, mentions: 1, prompts: 1, color: "#6366F1" },
];

// Mock data for URL View
const urlData = [
  { id: "1", page: "Reviews - Products - G2.com", url: "g2.com/products/cal-com/reviews?qs=pros-and-cons#:~:text=Use...", favicon: "G2", prompts: 2, mentions: 3, color: "#EF4444" },
  { id: "2", page: "Meeting Scheduling Software Features To Look For - Blog - Cal.com", url: "cal.com/blog/meeting-scheduling-software-features-to-look-fo...", favicon: "Ca", prompts: 1, mentions: 2, color: "#3B82F6" },
  { id: "3", page: "Openproject.org", url: "openproject.org", favicon: "OP", prompts: 2, mentions: 2, color: "#10B981" },
  { id: "4", page: "Calcom - Business Productivity AI - Goodcall.com", url: "goodcall.com/business-productivity-ai/calcom#:~:text=Cal.com...", favicon: "GC", prompts: 2, mentions: 2, color: "#3B82F6" },
  { id: "5", page: "The Top Features In Scheduling Software - Blog - Cal.com", url: "cal.com/blog/the-top-features-in-scheduling-software#:~:text...", favicon: "Ca", prompts: 1, mentions: 2, color: "#3B82F6" },
  { id: "6", page: "Meeting Scheduling Software Features To Look For - Blog - Calcom.framer.wet", url: "calcom.framer.website/blog/meeting-scheduling-software-featu...", favicon: "CF", prompts: 1, mentions: 1, color: "#6366F1" },
  { id: "7", page: "Improving Accuracy The Benefits Of Digital Tools In Scheduling Workflow - Blo", url: "cal.com/blog/improving-accuracy-the-benefits-of-digital-tool...", favicon: "Ca", prompts: 1, mentions: 1, color: "#3B82F6" },
  { id: "8", page: "Scheduling Software 101 Choosing The Right Solution For Your Business - Blog", url: "cal.com/blog/scheduling-software-101-choosing-the-right-solu...", favicon: "Ca", prompts: 1, mentions: 1, color: "#3B82F6" },
  { id: "9", page: "Easyappointments.org", url: "easyappointments.org", favicon: "EA", prompts: 1, mentions: 1, color: "#10B981" },
  { id: "10", page: "Calendso", url: "Calendso", favicon: "CA", prompts: 1, mentions: 1, color: "#6B7280" },
];

// Mock data for Prompt View
const promptData = [
  { 
    id: "1", 
    chat: "Affordable team scheduling solutions for small businesses", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 74.3, 
    avgPosition: 5.0, 
    mentionsCount: 9,
    mentions: ["#3B82F6", "#F59E0B", "#10B981"],
    moreCount: 6,
    created: "4h ago"
  },
  { 
    id: "2", 
    chat: "How can automated scheduling improve team collaboration?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 84.6, 
    avgPosition: 4.0, 
    mentionsCount: 7,
    mentions: ["#EF4444", "#3B82F6", "#EC4899"],
    moreCount: 4,
    created: "4h ago"
  },
  { 
    id: "3", 
    chat: "What open source scheduling options provide the best user experience?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 86.0, 
    avgPosition: 3.0, 
    mentionsCount: 5,
    mentions: ["#3B82F6", "#10B981", "#6366F1"],
    moreCount: 2,
    created: "4h ago"
  },
  { 
    id: "4", 
    chat: "What is the best way to handle scheduling conflicts within a team?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 76.1, 
    avgPosition: 5.0, 
    mentionsCount: 9,
    mentions: ["#EF4444", "#F59E0B", "#10B981"],
    moreCount: 6,
    created: "4h ago"
  },
  { 
    id: "5", 
    chat: "Can AI assist in HIPAA compliant appointment scheduling?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 72.0, 
    avgPosition: 3.0, 
    mentionsCount: 5,
    mentions: ["#6B7280", "#1F2937", "#6366F1"],
    moreCount: 2,
    created: "4h ago"
  },
  { 
    id: "6", 
    chat: "Can you compare different team scheduling tools, including Cal.com?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 77.6, 
    avgPosition: 3.0, 
    mentionsCount: 5,
    mentions: ["#3B82F6", "#10B981", "#6366F1"],
    moreCount: 2,
    created: "4h ago"
  },
  { 
    id: "7", 
    chat: "How can Cal.com, Inc. help streamline my team's scheduling process?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 75.8, 
    avgPosition: 3.5, 
    mentionsCount: 6,
    mentions: ["#3B82F6", "#10B981", "#F59E0B"],
    moreCount: 3,
    created: "4h ago"
  },
  { 
    id: "8", 
    chat: "What features do users appreciate the most in Cal.com, Inc.'s scheduling softwar...", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 85.0, 
    avgPosition: 1.0, 
    mentionsCount: 1,
    mentions: ["#3B82F6"],
    moreCount: 0,
    created: "4h ago"
  },
  { 
    id: "9", 
    chat: "What tools can assist in integrating HIPAA compliance into my scheduling proces...", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 76.3, 
    avgPosition: 4.5, 
    mentionsCount: 8,
    mentions: ["#3B82F6", "#EF4444", "#6366F1"],
    moreCount: 5,
    created: "4h ago"
  },
  { 
    id: "10", 
    chat: "Can you recommend a scheduling solution for remote teams?", 
    platform: "ChatGPT",
    time: "4h ago",
    avgSentiment: 77.4, 
    avgPosition: 4.0, 
    mentionsCount: 7,
    mentions: ["#EF4444", "#10B981", "#22C55E"],
    moreCount: 4,
    created: "4h ago"
  },
];

// Badge component for prompts
function PromptBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white text-sm font-medium rounded-full">
      {count}
      <Clock className="h-3.5 w-3.5" />
    </span>
  );
}

// Mentions badge for domain view
function MentionsBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
      {count}
    </span>
  );
}

// Favicon component
function Favicon({ text, color }: { text: string; color: string }) {
  return (
    <div 
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: color }}
    >
      {text.substring(0, 2).toUpperCase()}
    </div>
  );
}

// Mentions dots component for prompt view
function MentionDots({ mentions, moreCount }: { mentions: string[]; moreCount: number }) {
  return (
    <div className="flex items-center gap-1">
      {mentions.map((color, i) => (
        <div 
          key={i}
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
      {moreCount > 0 && (
        <span className="ml-1 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
          +{moreCount}
        </span>
      )}
    </div>
  );
}

export function SourcesSection() {
  const [activeView, setActiveView] = useState<ViewType>("domain");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const timePeriods: TimePeriod[] = ["1d", "7d", "14d", "1m", "3m"];

  // Totals based on view
  const getTotals = () => {
    switch (activeView) {
      case "domain": return { count: 21, label: "domains" };
      case "url": return { count: 25, label: "URLs" };
      case "prompt": return { count: 19, label: "prompts" };
    }
  };

  const totals = getTotals();

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb and header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">Sources</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <HelpCircle className="h-4 w-4" />
            Sources Tour
          </button>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>19:30:35</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sources Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track and analyze AI citation sources across your organization
        </p>
      </div>

      {/* Filters row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* All Competitors dropdown */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm">
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            All Competitors
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {/* ChatGPT dropdown */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm">
            <div className="w-5 h-5 rounded-full bg-[#10A37F] flex items-center justify-center">
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z"/>
              </svg>
            </div>
            ChatGPT
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {/* All Topics dropdown */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm">
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            All Topics
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Time period selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {timePeriods.map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timePeriod === period
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {period}
            </button>
          ))}
          <button className="px-2 py-1.5 text-gray-600 hover:text-gray-900">
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* View tabs and actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView("domain")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === "domain"
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Domain View
          </button>
          <button
            onClick={() => setActiveView("url")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === "url"
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            URL View
          </button>
          <button
            onClick={() => setActiveView("prompt")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === "prompt"
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Prompt View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Copy className="h-4 w-4" />
            Copy Table
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {activeView === "domain" && <Globe className="h-5 w-5 text-gray-500" />}
          {activeView === "url" && <Link2 className="h-5 w-5 text-gray-500" />}
          {activeView === "prompt" && <MessageSquare className="h-5 w-5 text-gray-500" />}
          <h2 className="text-lg font-semibold text-gray-900">
            {activeView === "domain" && "Domain Analysis"}
            {activeView === "url" && "URL Analysis"}
            {activeView === "prompt" && "Prompt Analysis"}
          </h2>
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {activeView === "prompt" && (
            <>
              <span>Show data for:</span>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                All Entities (Average)
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </>
          )}
          <span>{totals.count} {totals.label}</span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 mb-4">
        {activeView === "domain" && "Detailed breakdown by domain"}
        {activeView === "url" && "Individual page performance"}
        {activeView === "prompt" && (
          <span>
            Showing average sentiment and position across all entities | <span className="text-blue-600">10 prompts</span>
          </span>
        )}
      </p>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white">
        {/* Domain View Table */}
        {activeView === "domain" && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Domain</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Mentions
                  <ChevronDown className="h-3 w-3 inline-block ml-1" />
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Prompts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {domainData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleRow(row.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedRows.has(row.id) ? 'rotate-90' : ''}`} />
                      </button>
                      <Favicon text={row.favicon} color={row.color} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{row.domain}</p>
                        <p className="text-xs text-gray-500">{row.pages} pages</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <MentionsBadge count={row.mentions} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <PromptBadge count={row.prompts} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* URL View Table */}
        {activeView === "url" && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Page</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Prompts</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Mentions
                  <ChevronDown className="h-3 w-3 inline-block ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {urlData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Favicon text={row.favicon} color={row.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{row.page}</p>
                          <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <Copy className="h-4 w-4" />
                          </button>
                          <a href="#" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <p className="text-xs text-blue-600 truncate">{row.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <PromptBadge count={row.prompts} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-gray-900">{row.mentions}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Prompt View Table */}
        {activeView === "prompt" && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Chat</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Avg Sentiment</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Avg Position</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Mentions</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Created
                  <ChevronDown className="h-3 w-3 inline-block ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promptData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleRow(row.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedRows.has(row.id) ? 'rotate-90' : ''}`} />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{row.chat}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#10A37F]"></span>
                          <span className="text-xs text-gray-500">{row.platform}</span>
                          <span className="text-xs text-gray-400">{row.time}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-blue-600">{row.avgSentiment.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[48px] h-7 px-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      # {row.avgPosition.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{row.mentionsCount}</span>
                      <MentionDots mentions={row.mentions} moreCount={row.moreCount} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {row.created}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
            10
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-sm font-medium bg-blue-500 text-white rounded-lg">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            2
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            3
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Showing 1-10 of {totals.count} {totals.label}
        </div>
      </div>
    </div>
  );
}
