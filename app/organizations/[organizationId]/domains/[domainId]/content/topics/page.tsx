"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Loader2 } from "lucide-react";
import { TopicContentConfig } from "@/components/content/topic-content-config";

export default function TopicsContentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const organizationId = params.organizationId as string;
  const domainId = params.domainId as string;
  const template = searchParams.get("template") || "smart_suggestion";

  const [isGenerating, setIsGenerating] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleGenerate = async (config: {
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
            // Using the prompt text as keyword for now, could be enhanced
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

      // Navigate back to content section
      router.push(
        `/dashboard?org=${organizationId}&domain=${domainId}&section=content`
      );
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Left sidebar - Configuration */}
        <TopicContentConfig
          organizationId={organizationId}
          domainId={domainId}
          template={template}
          onBack={handleBack}
          onGenerate={handleGenerate}
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
