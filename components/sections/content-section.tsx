"use client";

import { useState } from "react";
import {
  Plus,
  Sparkles,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentItem {
  id: string;
  title: string;
  status: "Completed" | "In Progress" | "Draft";
  template: string;
  updatedAt: string;
  published: boolean;
  platforms?: string[];
}

interface ContentSectionProps {
  workspaceId: string;
  domainId: string;
  domainName: string;
}

// Mock data for demonstration
const mockContentItems: ContentItem[] = [
  {
    id: "1",
    title: "7 Top Fender, Marshall, Vox, and Mesa Boogie Amp Technologies 2025",
    status: "Completed",
    template: "Listicle",
    updatedAt: "18 hours ago",
    published: true,
    platforms: ["wordpress", "medium", "google"],
  },
];

function StatusBadge({ status }: { status: ContentItem["status"] }) {
  const statusStyles = {
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function PublishDropdown({ published }: { published: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
          <span
            className={`w-2 h-2 rounded-full ${
              published ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          <span>{published ? "Published" : "Unpublished"}</span>
          <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          Published
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
          Unpublished
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContentSection({
  workspaceId,
  domainId,
  domainName,
}: ContentSectionProps) {
  const [contentItems] = useState<ContentItem[]>(mockContentItems);
  const [currentPage] = useState(1);
  const totalItems = contentItems.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Content</h1>
      </div>

      {/* Start a New Project Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Start a New Project
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Create with Topics Card */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white">
            <div className="flex items-start gap-4">
              {/* Icon placeholder */}
              <div className="w-16 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 flex-shrink-0">
                <Plus className="w-4 h-4 text-gray-400" />
                <div className="space-y-1">
                  <div className="w-8 h-1 bg-gray-300 rounded" />
                  <div className="w-6 h-1 bg-gray-200 rounded" />
                  <div className="w-7 h-1 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">
                  Create with Topics
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Generate content around specific topics for your brand.
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  <Plus className="w-4 h-4" />
                  Create with Topics
                </button>
              </div>
            </div>
          </div>

          {/* Create with Keywords Card */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white">
            <div className="flex items-start gap-4">
              {/* Icon placeholder */}
              <div className="w-16 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-gray-400" />
                <div className="space-y-1">
                  <div className="w-8 h-1 bg-gray-300 rounded" />
                  <div className="w-6 h-1 bg-gray-200 rounded" />
                  <div className="w-7 h-1 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">
                  Create with Keywords
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create content using suggested keywords.
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Create with Keywords
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="space-y-4">
        {/* Pagination info */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-900">1 – {totalItems}</span>{" "}
            of {totalItems} items
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled
              className="p-1.5 rounded-md border border-gray-200 text-gray-300 cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled
              className="p-1.5 rounded-md border border-gray-200 text-gray-300 cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                  Title
                </th>
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                  Status
                </th>
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                  Template
                </th>
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                  Updated
                </th>
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3 w-[180px]">
                  {/* Actions column */}
                </th>
              </tr>
            </thead>
            <tbody>
              {contentItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                          {item.title}
                        </p>
                        {item.platforms && item.platforms.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {item.platforms.map((platform, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center"
                              >
                                <span className="text-[8px] text-gray-500 font-medium">
                                  {platform.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">
                      {item.template}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-500">
                      {item.updatedAt}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <PublishDropdown published={item.published} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}

              {contentItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        No content created yet
                      </p>
                      <p className="text-xs text-gray-400">
                        Start a new project to create content
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
