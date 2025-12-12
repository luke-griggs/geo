"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  MessageSquare,
  Plus,
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
import { TopicContentConfig } from "@/components/content/topic-content-config";

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
  | "topics-template"
  | "topics-config";

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
  const [topicsTemplate, setTopicsTemplate] = useState<
    "smart_suggestion" | "blog_post" | "listicle"
  >("smart_suggestion");

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
    setTopicsTemplate(template);
    setCurrentStep("topics-config");
  };

  const handleTopicsGenerate = async (config: {
    topicId: string;
    promptId: string;
    platforms: string[];
    citations: string[];
    title: string;
    template: string;
  }) => {
    setIsGenerating(true);

    try {
      // Create content project
      const createResponse = await fetch(
        `/api/organizations/${organizationId}/domains/${domainId}/content`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: config.title,
            title: config.title,
            template: config.template,
            selectedPages: config.citations,
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create content project");
      }

      const { project } = await createResponse.json();

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
      alert("Failed to generate content. Please try again.");
      setCurrentStep(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const closeModals = () => {
    setCurrentStep(null);
    setSelectedKeyword("");
    setConfigData(null);
    setCurrentProjectId(null);
    setViewingProject(null);
  };

  const totalItems = projects.length;

  // If we're in topics-config mode, show the inline configuration view
  if (currentStep === "topics-config") {
    return (
      <div className="flex flex-col h-full -m-8">
        {/* Back button header */}
        <div className="h-14 px-6 border-b border-gray-200 bg-white flex items-center">
          <button
            onClick={() => setCurrentStep(null)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar - Configuration */}
          <TopicContentConfig
            organizationId={organizationId}
            domainId={domainId}
            template={topicsTemplate}
            onBack={() => setCurrentStep(null)}
            onGenerate={handleTopicsGenerate}
          />

          {/* Right side - Preview/Placeholder */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
            {isGenerating ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#6366f1] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Generating your content
                </h3>
                <p className="text-sm text-gray-500">
                  We're analyzing top-cited pages and writing your article. This
                  may take a minute...
                </p>
              </div>
            ) : (
              <div className="text-center max-w-md">
                {/* Placeholder illustration */}
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-40 bg-white rounded-lg border border-gray-200 shadow-sm mx-auto relative">
                    {/* Document lines */}
                    <div className="absolute top-6 left-4 right-4 space-y-2">
                      <div className="h-2 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-full" />
                      <div className="h-2 bg-gray-100 rounded w-5/6" />
                      <div className="h-2 bg-gray-100 rounded w-full" />
                      <div className="h-2 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                  {/* Plus badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Begin by setting up your content configuration
                </h3>
                <p className="text-sm text-gray-500">
                  Enter key details in the left sidebar to optimize your content
                  for AEO.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          {/* Create with Topics Card */}
          <div className="flex-1 max-w-lg">
            <button
              onClick={() => setCurrentStep("topics-template")}
              className="relative w-full text-left border border-gray-200 rounded-xl p-8 hover:border-gray-300 hover:shadow-sm transition-all bg-white h-full cursor-pointer"
            >
              <span className="absolute top-4 right-4 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Recommended
              </span>
              <div className="flex items-start gap-5">
                {/* Icon placeholder */}
                <div className="w-24 h-28 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2.5 flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-gray-400" />
                  <div className="space-y-1.5">
                    <div className="w-12 h-1.5 bg-gray-300 rounded" />
                    <div className="w-9 h-1.5 bg-gray-200 rounded" />
                    <div className="w-10 h-1.5 bg-gray-200 rounded" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-2 text-base">
                    Create with Topics
                  </h3>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                    Create AEO content based on topics and prompts with
                    top-cited pages as references.
                  </p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg">
                    <MessageSquare className="w-4 h-4" />
                    Create with Topics
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Create with Keywords Card */}
          <div className="flex-1 max-w-lg">
            <button
              onClick={() => setCurrentStep("keyword")}
              className="w-full text-left border border-gray-200 rounded-xl p-8 hover:border-gray-300 hover:shadow-sm transition-all bg-white h-full cursor-pointer"
            >
              <div className="flex items-start gap-5">
                {/* Icon placeholder */}
                <div className="w-24 h-28 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2.5 flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-gray-400" />
                  <div className="space-y-1.5">
                    <div className="w-12 h-1.5 bg-gray-300 rounded" />
                    <div className="w-9 h-1.5 bg-gray-200 rounded" />
                    <div className="w-10 h-1.5 bg-gray-200 rounded" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-2 text-base">
                    Create with Keywords
                  </h3>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                    Create SEO-optimized content based on keywords AI models
                    search for in your industry.
                  </p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    Create with Keywords
                  </span>
                </div>
              </div>
            </button>
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
