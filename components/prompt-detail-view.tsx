"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type NavSection } from "@/components/sidebar";
import {
  ChevronLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  MoreHorizontal,
} from "lucide-react";

interface PromptRun {
  id: string;
  executedAt: Date;
  durationMs: number | null;
  status: "success" | "error"; // Derived
  model: string;
  response: string | null;
  mentions: number;
  sentiment: number | null;
}

interface PromptDetail {
  id: string;
  text: string;
  createdAt: Date;
  status: "active" | "inactive";
  runs: PromptRun[];
  stats: {
    totalRuns: number;
    avgSentiment: number;
    lastRunAt: Date | null;
  };
}

interface PromptDetailViewProps {
  prompt: PromptDetail;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

export function PromptDetailView({ prompt }: PromptDetailViewProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<NavSection>("prompts");

  const handleSectionChange = (section: NavSection) => {
    setActiveSection(section);
    router.push(`/?section=${section}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      <main className="flex-1 ml-64 transition-[margin] duration-200 bg-white">
        <div className="p-8 h-screen overflow-auto">
          {/* Header Navigation */}
          <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Prompts
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 truncate max-w-md">
              {prompt.text}
            </span>
          </div>

          {/* Main Content */}
          <div className="max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {prompt.text}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Created {formatDate(prompt.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        prompt.status === "active"
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="capitalize">{prompt.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="text-sm text-gray-500 mb-1">Total Runs</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {prompt.stats.totalRuns}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="text-sm text-gray-500 mb-1">Avg Sentiment</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {prompt.stats.avgSentiment
                    ? (prompt.stats.avgSentiment * 100).toFixed(0) + "%"
                    : "-"}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="text-sm text-gray-500 mb-1">Last Run</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {prompt.stats.lastRunAt
                    ? formatDate(prompt.stats.lastRunAt)
                    : "-"}
                </div>
              </div>
            </div>

            {/* Recent Runs Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Runs</h3>
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Run Now
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {prompt.runs.map((run) => (
                  <div
                    key={run.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {run.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium text-gray-900 text-sm">
                          {formatTime(run.executedAt)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {run.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {run.durationMs}ms
                        </div>
                      </div>
                    </div>

                    <div className="pl-7">
                      <p className="text-sm text-gray-600 line-clamp-2 font-mono bg-gray-50 p-2 rounded border border-gray-100">
                        {run.response}
                      </p>

                      {run.mentions > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            {run.mentions} Mentions
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {prompt.runs.length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <div className="mb-2">
                      <Clock className="h-8 w-8 mx-auto text-gray-300" />
                    </div>
                    No runs yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
