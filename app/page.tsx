"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar, type NavSection } from "@/components/sidebar";
import { PromptsSection } from "@/components/sections/prompts-section";
import { MentionsSection } from "@/components/sections/mentions-section";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { SourcesSection } from "@/components/sections/sources-section";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const activeSection: NavSection =
    sectionParam &&
    ["prompts", "mentions", "analytics", "sources"].includes(sectionParam)
      ? (sectionParam as NavSection)
      : "prompts";

  const handleSectionChange = (section: NavSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* Main content */}
      <main className="flex-1 ml-64 transition-[margin] duration-200">
        <div className="p-8 h-screen overflow-auto">
          {activeSection === "prompts" && <PromptsSection />}
          {activeSection === "mentions" && <MentionsSection />}
          {activeSection === "analytics" && <AnalyticsSection />}
          {activeSection === "sources" && <SourcesSection />}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
