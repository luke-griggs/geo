"use client";

import { motion } from "motion/react";
import { useOnboarding } from "../context";
import { slideVariants, DomainLogo } from "../shared";

export function DailyPromptsStep() {
  const { direction, analysisResult, goToStep } = useOnboarding();

  if (!analysisResult) return null;

  return (
    <motion.div
      key="daily-prompts"
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

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          We run your prompts daily to analyze your brand&apos;s performance
        </h1>
        <p className="text-gray-500 mb-8">
          We look for your brand in answers, citations, and mentions to
          understand how you&apos;re showing up in ChatGPT, Google AI Overviews,
          Perplexity, Microsoft Copilot, and more.
        </p>

        <button
          onClick={() => goToStep("topics", "right")}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
