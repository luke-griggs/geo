"use client";

import { useState } from "react";
import { Sidebar, type NavSection } from "@/components/sidebar";
import { PromptsSection } from "@/components/sections/prompts-section";
import { MentionsSection } from "@/components/sections/mentions-section";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { SourcesSection } from "@/components/sections/sources-section";

export default function Home() {
  const [activeSection, setActiveSection] = useState<NavSection>("prompts");

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
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
