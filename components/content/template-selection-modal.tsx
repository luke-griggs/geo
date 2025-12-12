"use client";

import { FileText, List, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplateType = "smart_suggestion" | "blog_post" | "listicle";

interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  isNew?: boolean;
  isRecommended?: boolean;
}

const templates: Template[] = [
  {
    id: "smart_suggestion",
    name: "Smart Suggestion",
    description:
      "AI will select the content type based on the top-cited pages.",
    icon: <Sparkles className="h-6 w-6" />,
    isRecommended: true,
  },
  {
    id: "blog_post",
    name: "Blog Post",
    description:
      "Engage and convert your audience with informative blog content.",
    icon: <FileText className="h-6 w-6" />,
    isNew: true,
  },
  {
    id: "listicle",
    name: "Listicle",
    description: "Create eye-catching, shareable lists on any relevant topic.",
    icon: <List className="h-6 w-6" />,
    isNew: true,
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
  const handleTemplateClick = (templateId: TemplateType) => {
    onSelect(templateId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-8 pb-6 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Generate content using templates
          </DialogTitle>
        </DialogHeader>

        {/* Template grid */}
        <div className="p-8 pt-0">
          <div className="grid grid-cols-3 gap-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template.id)}
                className={cn(
                  "relative flex flex-col items-center px-10 py-12 rounded-xl border-2 transition-all text-center cursor-pointer",
                  "border-gray-200 hover:border-[#6366f1] hover:bg-[#6366f1]/5 hover:shadow-sm"
                )}
              >
                {/* Badge */}
                {template.isRecommended && (
                  <span className="absolute top-4 right-4 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                )}
                {template.isNew && (
                  <span className="absolute top-4 right-4 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    New
                  </span>
                )}

                {/* Icon */}
                <div className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 mb-8">
                  <div className="text-gray-400">{template.icon}</div>
                  <div className="space-y-1.5">
                    <div className="w-10 h-1 bg-gray-300 rounded" />
                    <div className="w-7 h-1 bg-gray-200 rounded" />
                    <div className="w-8 h-1 bg-gray-200 rounded" />
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 mb-3 text-base">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
