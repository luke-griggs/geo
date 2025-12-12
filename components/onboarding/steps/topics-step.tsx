"use client";

import { motion } from "motion/react";
import { Check, Plus, X } from "lucide-react";
import { useOnboarding, type GeneratedPrompt } from "../context";
import { slideVariants, DomainLogo } from "../shared";
import { cn } from "@/lib/utils";

export function TopicsStep() {
  const {
    direction,
    analysisResult,
    selectedTopics,
    setSelectedTopics,
    customTopics,
    setCustomTopics,
    isAddingCustomTopic,
    setIsAddingCustomTopic,
    customTopicInput,
    setCustomTopicInput,
    error,
    setError,
    goToStep,
    setIsGeneratingPrompts,
    setTopicsWithPrompts,
  } = useOnboarding();

  if (!analysisResult) return null;

  // Generate prompts for all selected topics
  const handleGeneratePrompts = async () => {
    if (!analysisResult || selectedTopics.size === 0) return;

    setIsGeneratingPrompts(true);
    goToStep("prompts", "right");

    try {
      // Get all topics (both from analysis and custom)
      const allTopics = [...analysisResult.topics, ...customTopics];
      const selectedTopicsList = allTopics.filter((t) =>
        selectedTopics.has(t.name)
      );

      // Generate prompts for each topic in parallel
      const results = await Promise.all(
        selectedTopicsList.map(async (topic) => {
          try {
            const response = await fetch("/api/generate-prompts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic: topic.name,
                domain: analysisResult.domain,
                workspaceName: analysisResult.brandName,
                count: 5,
              }),
            });

            if (!response.ok) {
              console.error(`Failed to generate prompts for ${topic.name}`);
              return {
                name: topic.name,
                description: topic.description,
                prompts: [],
                isExpanded: false,
              };
            }

            const data = await response.json();
            const prompts: GeneratedPrompt[] = (data.prompts || []).map(
              (p: { text: string }, idx: number) => ({
                id: `${topic.name}-${idx}-${Date.now()}`,
                text: p.text,
              })
            );

            return {
              name: topic.name,
              description: topic.description,
              prompts,
              isExpanded: false,
            };
          } catch (err) {
            console.error(`Error generating prompts for ${topic.name}:`, err);
            return {
              name: topic.name,
              description: topic.description,
              prompts: [],
              isExpanded: false,
            };
          }
        })
      );

      // Expand the first topic by default
      if (results.length > 0) {
        results[0].isExpanded = true;
      }

      setTopicsWithPrompts(results);
    } catch (err) {
      console.error("Error generating prompts:", err);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  return (
    <motion.div
      key="topics"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-full"
    >
      <div className="flex-1">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <DomainLogo domain={analysisResult.domain} className="w-6 h-6" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {analysisResult.brandName}
            </span>
            <span className="text-gray-400">{analysisResult.domain}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Which topics do you want to create prompts for?
        </h1>
        <p className="text-gray-500 mb-6">Select up to 5 topics</p>

        {/* Topics list */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[...analysisResult.topics, ...customTopics].map((topic) => {
            const isSelected = selectedTopics.has(topic.name);
            const canSelect = isSelected || selectedTopics.size < 5;

            return (
              <button
                key={topic.name}
                onClick={() => {
                  if (!canSelect) return;
                  const newSelected = new Set(selectedTopics);
                  if (isSelected) {
                    newSelected.delete(topic.name);
                  } else {
                    newSelected.add(topic.name);
                  }
                  setSelectedTopics(newSelected);
                }}
                disabled={!canSelect}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
                  canSelect
                    ? "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                    : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border",
                    isSelected
                      ? "bg-[#6366f1] border-[#6366f1]"
                      : "bg-white border-gray-300"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {topic.name}
              </button>
            );
          })}

          {/* Add custom topic button/input */}
          {isAddingCustomTopic ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customTopicInput.trim()) {
                    if (selectedTopics.size >= 5) {
                      setError("You can only select up to 5 topics");
                      return;
                    }
                    const newTopic = {
                      name: customTopicInput.trim(),
                      description: "Custom topic",
                    };
                    setCustomTopics([...customTopics, newTopic]);
                    setSelectedTopics(
                      new Set([...selectedTopics, customTopicInput.trim()])
                    );
                    setCustomTopicInput("");
                    setIsAddingCustomTopic(false);
                    setError(null);
                  } else if (e.key === "Escape") {
                    setCustomTopicInput("");
                    setIsAddingCustomTopic(false);
                  }
                }}
                autoFocus
                placeholder="Enter topic..."
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] w-40"
              />
              <button
                onClick={() => {
                  if (customTopicInput.trim()) {
                    if (selectedTopics.size >= 5) {
                      setError("You can only select up to 5 topics");
                      return;
                    }
                    const newTopic = {
                      name: customTopicInput.trim(),
                      description: "Custom topic",
                    };
                    setCustomTopics([...customTopics, newTopic]);
                    setSelectedTopics(
                      new Set([...selectedTopics, customTopicInput.trim()])
                    );
                    setCustomTopicInput("");
                    setIsAddingCustomTopic(false);
                    setError(null);
                  }
                }}
                className="p-2 rounded-lg bg-[#6366f1] text-white hover:bg-[#4f46e5]"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCustomTopicInput("");
                  setIsAddingCustomTopic(false);
                }}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCustomTopic(true)}
              disabled={selectedTopics.size >= 5}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all",
                selectedTopics.size < 5
                  ? "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  : "border-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <Plus className="w-4 h-4" />
              Add custom
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleGeneratePrompts}
          disabled={selectedTopics.size === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Looks good
        </button>
      </div>
    </motion.div>
  );
}
