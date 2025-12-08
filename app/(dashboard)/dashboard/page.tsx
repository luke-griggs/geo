"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar, type NavSection } from "@/components/sidebar";
import { PromptsSection } from "@/components/sections/prompts-section";
import { VisibilitySection } from "@/components/sections/visibility-section";
import { MentionsSection } from "@/components/sections/mentions-section";
import { SourcesSection } from "@/components/sections/sources-section";
import { Loader2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  domains: Array<{
    id: string;
    domain: string;
    name: string | null;
  }>;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSection: NavSection =
    sectionParam &&
    ["prompts", "visibility", "mentions", "sources"].includes(sectionParam)
      ? (sectionParam as NavSection)
      : "prompts";

  const handleSectionChange = (section: NavSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.push(`/dashboard?${params.toString()}`);
  };

  // Fetch user's workspace and domain on mount
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        const data = await res.json();

        // Use the first workspace (most recent)
        if (data.workspaces && data.workspaces.length > 0) {
          setWorkspace(data.workspaces[0]);
        } else {
          // No workspace found, redirect to onboarding
          router.push("/onboarding");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspace();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!workspace || workspace.domains.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No domain configured yet.</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="text-sm text-orange-600 hover:text-orange-700 underline"
          >
            Complete onboarding
          </button>
        </div>
      </div>
    );
  }

  // Use the first domain of the workspace
  const domain = workspace.domains[0];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* Main content */}
      <main className="flex-1 ml-64 transition-[margin] duration-200">
        <div className="p-8 h-screen overflow-auto">
          {activeSection === "prompts" && (
            <PromptsSection
              workspaceId={workspace.id}
              domainId={domain.id}
              domainName={domain.domain}
            />
          )}
          {activeSection === "visibility" && (
            <VisibilitySection
              workspaceId={workspace.id}
              domainId={domain.id}
              domainName={domain.domain}
            />
          )}
          {activeSection === "mentions" && (
            <MentionsSection
              workspaceId={workspace.id}
              domainId={domain.id}
              domainName={domain.domain}
            />
          )}
          {activeSection === "sources" && <SourcesSection />}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
