"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeywordSelectionModal } from "@/components/content/keyword-selection-modal";
import { ContentConfigModal } from "@/components/content/content-config-modal";
import { TemplateSelectionModal } from "@/components/content/template-selection-modal";
import { ContentProjectView } from "@/components/content/content-project-view";

interface SerpResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

interface ContentProject {
  id: string;
  domainId: string;
  keyword: string;
  title: string | null;
  template: "smart_suggestion" | "blog_post" | "listicle" | null;
  status: "draft" | "generating" | "completed" | "failed";
  serpResults: SerpResult[] | null;
  selectedPages: string[] | null;
  generatedContent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentSectionProps {
  organizationId: string;
  domainId: string;
  domainName: string;
}

type ModalStep =
  | "keyword"
  | "config"
  | "template"
  | "generating"
  | "view"
  | "topics-template";

function StatusBadge({ status }: { status: ContentProject["status"] }) {
  const statusStyles = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    generating: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  const statusLabels = {
    completed: "Completed",
    generating: "Generating",
    draft: "Draft",
    failed: "Failed",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusStyles[status]}`}
    >
      {status === "generating" && (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      )}
      {statusLabels[status]}
    </span>
  );
}

function TemplateBadge({ template }: { template: ContentProject["template"] }) {
  const templateLabels = {
    smart_suggestion: "Smart Suggestion",
    blog_post: "Blog Post",
    listicle: "Listicle",
  };

  return (
    <span className="text-sm text-gray-600">
      {template ? templateLabels[template] : "-"}
    </span>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function ContentSection({
  organizationId,
  domainId,
  domainName,
}: ContentSectionProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<ModalStep | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [configData, setConfigData] = useState<{
    keyword: string;
    title: string;
    serpResults: SerpResult[];
    selectedPages: string[];
  } | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [viewingProject, setViewingProject] = useState<ContentProject | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [organizationId, domainId]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/content`
      );
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordSelected = (keyword: string) => {
    setSelectedKeyword(keyword);
    setCurrentStep("config");
  };

  const handleConfigContinue = (config: {
    keyword: string;
    title: string;
    serpResults: SerpResult[];
    selectedPages: string[];
  }) => {
    setConfigData(config);
    setCurrentStep("template");
  };

  const handleTemplateSelected = async (
    template: "smart_suggestion" | "blog_post" | "listicle"
  ) => {
    if (!configData) return;

    setCurrentStep("generating");
    setIsGenerating(true);

    try {
      // Create the project
      const createResponse = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/content`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: configData.keyword,
            title: configData.title,
            template,
            serpResults: configData.serpResults,
            selectedPages: configData.selectedPages,
          }),
        }
      );

      if (!createResponse.ok) throw new Error("Failed to create project");
      const { project } = await createResponse.json();
      setCurrentProjectId(project.id);

      // Generate content
      const generateResponse = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/content/${project.id}/generate`,
        { method: "POST" }
      );

      if (!generateResponse.ok) {
        throw new Error("Failed to generate content");
      }

      const { project: updatedProject } = await generateResponse.json();

      // Show the result
      setViewingProject(updatedProject);
      setCurrentStep("view");

      // Refresh project list
      fetchProjects();
    } catch (error) {
      console.error("Error generating content:", error);
      // Could show error state here
      setCurrentStep(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewProject = (project: ContentProject) => {
    setViewingProject(project);
    setCurrentStep("view");
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/content/${projectId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete project");
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleTopicsTemplateSelected = (
    template: "smart_suggestion" | "blog_post" | "listicle"
  ) => {
    // Navigate to the topics configuration page with the selected template
    router.push(
      `/organizations/${organizationId}/domains/${domainId}/content/topics?template=${template}`
    );
    closeModals();
  };

  const closeModals = () => {
    setCurrentStep(null);
    setSelectedKeyword("");
    setConfigData(null);
    setCurrentProjectId(null);
    setViewingProject(null);
  };

  const totalItems = projects.length;

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

        {/* Cards Container */}
        <div className="flex gap-4">
          {/* Create with Keywords Card */}
          <div className="flex-1 max-w-md">
            <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white h-full">
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
                    Create SEO-optimized content based on keywords AI models
                    search for in your industry.
                  </p>
                  <button
                    onClick={() => setCurrentStep("keyword")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create with Keywords
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create with Topics Card */}
          <div className="flex-1 max-w-md">
            <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white h-full">
              <div className="flex items-start gap-4">
                {/* Icon placeholder */}
                <div className="w-16 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
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
                    Create AEO content based on topics and prompts with
                    top-cited pages as references.
                  </p>
                  <button
                    onClick={() => setCurrentStep("topics-template")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Create with Topics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="space-y-4">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Content</h2>
          <button
            onClick={fetchProjects}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Pagination info */}
        {projects.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-900">
                1 – {totalItems}
              </span>{" "}
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
        )}

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
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-3 w-[100px]">
                  {/* Actions column */}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Loading projects...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
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
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleViewProject(project)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                            {project.title || "Untitled"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {project.keyword}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-4">
                      <TemplateBadge template={project.template} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(project.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProject(project);
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <KeywordSelectionModal
        open={currentStep === "keyword"}
        onOpenChange={(open) => !open && closeModals()}
        organizationId={organizationId}
        domainId={domainId}
        onKeywordSelected={handleKeywordSelected}
      />

      <ContentConfigModal
        open={currentStep === "config"}
        onOpenChange={(open) => !open && closeModals()}
        organizationId={organizationId}
        domainId={domainId}
        keyword={selectedKeyword}
        onBack={() => setCurrentStep("keyword")}
        onContinue={handleConfigContinue}
      />

      <TemplateSelectionModal
        open={currentStep === "template"}
        onOpenChange={(open) => !open && closeModals()}
        onBack={() => setCurrentStep("config")}
        onSelect={handleTemplateSelected}
      />

      {/* Topics Template Selection Modal */}
      <TemplateSelectionModal
        open={currentStep === "topics-template"}
        onOpenChange={(open) => !open && closeModals()}
        onBack={closeModals}
        onSelect={handleTopicsTemplateSelected}
      />

      {/* Generating overlay */}
      {currentStep === "generating" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#6366f1] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Generating your content
            </h3>
            <p className="text-sm text-gray-500">
              We're analyzing top-ranking pages and writing your article. This
              may take a minute...
            </p>
          </div>
        </div>
      )}

      {/* Content view modal */}
      {viewingProject && (
        <ContentProjectView
          open={currentStep === "view"}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setViewingProject(null);
              setCurrentStep(null);
            }
          }}
          project={viewingProject}
        />
      )}
    </div>
  );
}
