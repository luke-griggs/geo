"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar, type NavSection, type Domain } from "@/components/sidebar";
import { OverviewSection } from "@/components/sections/overview-section";
import { PromptsSection } from "@/components/sections/prompts-section";
import { VisibilitySection } from "@/components/sections/visibility-section";
import { MentionsSection } from "@/components/sections/mentions-section";
import { ContentSection } from "@/components/sections/content-section";
import { Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  domains: Domain[];
}

// Alias for backward compatibility
type Workspace = Organization;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const domainParam = searchParams.get("domain");

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSection: NavSection =
    sectionParam &&
    ["overview", "prompts", "visibility", "mentions", "content"].includes(
      sectionParam
    )
      ? (sectionParam as NavSection)
      : "overview";

  const handleSectionChange = (section: NavSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("domain", domainId);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleDomainAdded = (newDomain: Domain) => {
    if (workspace) {
      // Add new domain to the list
      setWorkspace({
        ...workspace,
        domains: [newDomain, ...workspace.domains],
      });
      // Select the newly added domain
      handleDomainChange(newDomain.id);
    }
  };

  // Fetch user's workspace and domain on mount
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await fetch("/api/workspaces");

        // Handle unauthorized - sign out and redirect to onboarding
        if (res.status === 401) {
          await signOut();
          router.push("/onboarding");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        const data = await res.json();

        // Use the first workspace (most recent)
        if (data.workspaces && data.workspaces.length > 0) {
          const ws = data.workspaces[0];
          setWorkspace(ws);

          // Set selected domain from URL param or default to first domain
          if (ws.domains.length > 0) {
            const domainFromUrl = ws.domains.find(
              (d: Domain) => d.id === domainParam
            );
            setSelectedDomainId(
              domainFromUrl ? domainFromUrl.id : ws.domains[0].id
            );
          }
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
  }, [router, domainParam]);

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

  // Get the selected domain or fall back to first
  const domain =
    workspace.domains.find((d) => d.id === selectedDomainId) ||
    workspace.domains[0];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        workspaceId={workspace.id}
        domains={workspace.domains}
        selectedDomainId={domain.id}
        onDomainChange={handleDomainChange}
        onDomainAdded={handleDomainAdded}
      />

      {/* Main content */}
      <main className="flex-1 ml-64 transition-[margin] duration-200">
        <div className="p-8 pb-16 h-screen overflow-auto">
          {activeSection === "overview" && (
            <OverviewSection
              workspaceId={workspace.id}
              domainId={domain.id}
              domainName={domain.domain}
              onNavigate={handleSectionChange}
            />
          )}
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
          {activeSection === "content" && (
            <ContentSection
              workspaceId={workspace.id}
              domainId={domain.id}
              domainName={domain.domain}
            />
          )}
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
