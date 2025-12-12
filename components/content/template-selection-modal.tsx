"use client";

import { useState } from "react";
import {
  FileText,
  List,
  Sparkles,
  BookOpen,
  HelpCircle,
  BarChart2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplateType = "smart_suggestion" | "blog_post" | "listicle";
type TemplateCategory = "all" | "informational" | "comparative";

interface Template {
  id: TemplateType;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: React.ReactNode;
  available: boolean;
  isNew?: boolean;
  isRecommended?: boolean;
}

const templates: Template[] = [
  {
    id: "smart_suggestion",
    name: "Smart Suggestion",
    description:
      "AI will select the content type based on the top-cited pages.",
    category: "all",
    icon: <Sparkles className="h-6 w-6" />,
    available: true,
    isRecommended: true,
  },
  {
    id: "blog_post",
    name: "Blog Post",
    description:
      "Engage and convert your audience with informative blog content.",
    category: "informational",
    icon: <FileText className="h-6 w-6" />,
    available: true,
    isNew: true,
  },
  {
    id: "listicle",
    name: "Listicle",
    description: "Create eye-catching, shareable lists on any relevant topic.",
    category: "comparative",
    icon: <List className="h-6 w-6" />,
    available: true,
    isNew: true,
  },
];

const comingSoonTemplates: Omit<Template, "id"> & { id: string }[] = [
  {
    id: "ultimate_guide",
    name: "Ultimate Guide",
    description:
      "Build a detailed guide that showcases your brand's expertise.",
    category: "informational",
    icon: <BookOpen className="h-6 w-6" />,
    available: false,
  },
  {
    id: "how_to",
    name: "How-To Article",
    description: "Explain a process step-by-step in a clear format.",
    category: "informational",
    icon: <HelpCircle className="h-6 w-6" />,
    available: false,
  },
  {
    id: "comparison",
    name: "Comparison Post",
    description: "Compare tools, brands, or strategies side by side.",
    category: "comparative",
    icon: <BarChart2 className="h-6 w-6" />,
    available: false,
  },
];

interface TemplateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
  onSelect: (template: TemplateType) => void;
}

export function TemplateSelectionModal({
  open,
  onOpenChange,
  onSelect,
}: TemplateSelectionModalProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory>("all");

  const categories: { id: TemplateCategory; label: string }[] = [
    { id: "all", label: "Show all" },
    { id: "informational", label: "Informational" },
    { id: "comparative", label: "Comparative" },
  ];

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter(
          (t) => t.category === selectedCategory || t.category === "all"
        );

  const filteredComingSoon =
    selectedCategory === "all"
      ? comingSoonTemplates
      : comingSoonTemplates.filter((t) => t.category === selectedCategory);

  const handleTemplateClick = (templateId: TemplateType) => {
    onSelect(templateId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-8 pb-6 flex-shrink-0 border-b border-gray-100">
          <DialogTitle className="text-xl font-semibold">
            Generate content using templates
          </DialogTitle>
        </DialogHeader>

        {/* Main content - no sidebar */}
        <div className="flex-1">
          {/* Categories */}
          <div className="px-8 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg transition-colors",
                    selectedCategory === cat.id
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <div className="p-8">
            <div className="grid grid-cols-3 gap-6">
              {/* Available templates */}
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  className={cn(
                    "relative flex flex-col items-center p-8 rounded-xl border-2 transition-all text-center cursor-pointer",
                    "border-gray-200 hover:border-[#6366f1] hover:bg-[#6366f1]/5 hover:shadow-sm"
                  )}
                >
                  {/* Badge */}
                  {template.isRecommended && (
                    <span className="absolute top-4 left-4 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                  {template.isNew && (
                    <span className="absolute top-4 left-4 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      New
                    </span>
                  )}

                  {/* Icon */}
                  <div className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 mb-5">
                    <div className="text-gray-400">{template.icon}</div>
                    <div className="space-y-1.5">
                      <div className="w-10 h-1 bg-gray-300 rounded" />
                      <div className="w-7 h-1 bg-gray-200 rounded" />
                      <div className="w-8 h-1 bg-gray-200 rounded" />
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900 mb-2 text-base">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </button>
              ))}

              {/* Coming soon templates */}
              {filteredComingSoon.map((template) => (
                <div
                  key={template.id}
                  className="relative flex flex-col items-center p-8 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-center opacity-60"
                >
                  {/* Category badge */}
                  <span className="absolute top-4 left-4 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded capitalize">
                    {template.category}
                  </span>

                  {/* Icon */}
                  <div className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-100 flex flex-col items-center justify-center gap-2 mb-5">
                    <div className="text-gray-300">{template.icon}</div>
                    <div className="space-y-1.5">
                      <div className="w-10 h-1 bg-gray-200 rounded" />
                      <div className="w-7 h-1 bg-gray-200 rounded" />
                      <div className="w-8 h-1 bg-gray-200 rounded" />
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-500 mb-2 text-base">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="mt-5 flex items-center gap-1.5 text-sm text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    Coming soon
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
