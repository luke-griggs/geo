"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import {
  useOnboarding,
  ANALYSIS_MESSAGES,
  type AnalysisResult,
} from "../context";
import { slideVariants, DomainLogo, AIModelIcons } from "../shared";

export function AnalysisStep() {
  const {
    direction,
    cleanedWebsite,
    isAnalyzing,
    setIsAnalyzing,
    analysisResult,
    setAnalysisResult,
    analysisError,
    setAnalysisError,
    analysisMessageIndex,
    setAnalysisMessageIndex,
    goToStep,
  } = useOnboarding();

  // Cycle through analysis messages
  useEffect(() => {
    if (isAnalyzing) {
      setAnalysisMessageIndex(0);
      const interval = setInterval(() => {
        setAnalysisMessageIndex((prev) =>
          prev < ANALYSIS_MESSAGES.length - 1 ? prev + 1 : prev
        );
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, setAnalysisMessageIndex]);

  const runBrandAnalysis = async (domain: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/onboarding/analyze-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const error = await response.json();
        setAnalysisError(error.error || "Failed to analyze brand");
        setIsAnalyzing(false);
        return;
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
    } catch {
      setAnalysisError("Failed to analyze brand. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisContinue = () => {
    // Move to daily prompts explanation step
    goToStep("daily-prompts", "right");
  };

  return (
    <motion.div
      key="analysis"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-full"
    >
      {isAnalyzing ? (
        // Loading state
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#6366f1] animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Analyzing your brand&apos;s AI visibility
          </h2>
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={analysisMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-gray-500 text-center"
              >
                {ANALYSIS_MESSAGES[analysisMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      ) : analysisError ? (
        // Error state
        <div className="flex-1">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
            {analysisError}
          </div>
          <button
            onClick={() => runBrandAnalysis(cleanedWebsite)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => goToStep("brand", "left")}
            className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      ) : analysisResult ? (
        // Results state
        <div className="flex-1">
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-6">
            <DomainLogo domain={analysisResult.domain} className="w-8 h-8" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {analysisResult.brandName}
              </span>
              <span className="w-px h-4 bg-gray-300" />
              <span className="text-gray-500">{analysisResult.domain}</span>
            </div>
          </div>

          {/* AI Model Icons */}
          <div className="mb-6">
            <AIModelIcons />
          </div>

          {/* Dynamic headline based on performance */}
          {analysisResult.rank !== null && analysisResult.rank <= 3 ? (
            // Good visibility
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {analysisResult.brandName} is ranked #{analysisResult.rank} in
                AI visibility
              </h1>
              <p className="text-gray-500 mb-8">
                We&apos;ve identified 3+ strategies to move your brand up from
                rank #{analysisResult.rank} and gain more visibility.
              </p>
            </>
          ) : analysisResult.rank !== null && analysisResult.rank <= 7 ? (
            // Moderate visibility
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {analysisResult.brandName} has moderate AI visibility
              </h1>
              <p className="text-gray-500 mb-8">
                You&apos;re currently ranked #{analysisResult.rank} — we&apos;ve
                found opportunities to improve your visibility.
              </p>
            </>
          ) : (
            // Poor visibility
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {analysisResult.brandName}&apos;s AI visibility is below
                industry benchmarks
              </h1>
              <p className="text-gray-500 mb-8">
                Let&apos;s fix that — we&apos;ve already found 5+ opportunities
                to improve {analysisResult.brandName}&apos;s visibility.
              </p>
            </>
          )}

          {/* Warning banner for partial failures */}
          {analysisResult.warning && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 mb-6">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{analysisResult.warning}</p>
            </div>
          )}

          <button
            onClick={handleAnalysisContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}
