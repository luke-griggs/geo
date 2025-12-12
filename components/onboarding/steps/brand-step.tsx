"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useOnboarding, type AnalysisResult } from "../context";
import { slideVariants, DomainLogo } from "../shared";
import { cn } from "@/lib/utils";

export function BrandStep() {
  const {
    direction,
    website,
    setWebsite,
    brandDescription,
    setBrandDescription,
    websiteError,
    setWebsiteError,
    isValidatingDomain,
    setIsValidatingDomain,
    cleanedWebsite,
    goToStep,
    resetForm,
    setIsAnalyzing,
    setAnalysisError,
    setAnalysisResult,
  } = useOnboarding();

  // Check if domain looks valid (has at least 2 characters after the last dot)
  const lastDotIndex = cleanedWebsite.lastIndexOf(".");
  const hasValidTLD =
    lastDotIndex > 0 && cleanedWebsite.length - lastDotIndex > 2;
  const showFavicon = hasValidTLD;

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

  const handleBrandSubmit = async () => {
    if (!website.trim()) return;

    setIsValidatingDomain(true);
    setWebsiteError(null);

    try {
      const response = await fetch("/api/validate-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: website }),
      });

      const result = await response.json();

      if (!result.valid) {
        setWebsiteError(result.error || "Invalid domain");
        setIsValidatingDomain(false);
        return;
      }

      // Store brand data for later use (when creating organization/domain)
      const validatedDomain = result.domain || website;
      localStorage.setItem("onboarding_website", validatedDomain);
      localStorage.setItem("onboarding_brand_description", brandDescription);

      // Move to analysis step and start analyzing
      setIsValidatingDomain(false);
      goToStep("analysis", "right");
      runBrandAnalysis(validatedDomain);
    } catch {
      setWebsiteError("Failed to validate domain. Please try again.");
      setIsValidatingDomain(false);
    }
  };

  return (
    <motion.div
      key="brand"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-full"
    >
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Start tracking your brand
        </h1>
        <p className="text-gray-500 mb-8">
          This will be the first brand you&apos;ll track on GEO Analytics — you
          can add more later.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Website
            </label>
            <div className="relative">
              {showFavicon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <DomainLogo domain={cleanedWebsite} className="w-5 h-5" />
                </div>
              )}
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-all",
                  showFavicon ? "left-10" : "left-4"
                )}
              >
                https://
              </span>
              <input
                type="text"
                placeholder="www.example.com"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  setWebsiteError(null);
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    website.trim() &&
                    !isValidatingDomain
                  ) {
                    handleBrandSubmit();
                  }
                }}
                autoFocus
                className={cn(
                  "w-full pr-4 py-3 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all",
                  showFavicon ? "pl-[106px]" : "pl-16",
                  websiteError
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                )}
              />
            </div>
            {websiteError && (
              <p className="text-red-500 text-sm mt-2">{websiteError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tell us about your brand (optional)
            </label>
            <textarea
              placeholder="About your brand..."
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors resize-none"
            />
            <p className="text-gray-500 text-sm mt-3">
              The more specific you are, the better the results we&apos;ll be
              able to provide.
            </p>
            <ul className="text-gray-500 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>What products or services do you offer?</li>
              <li>Do you serve any specific regions?</li>
            </ul>
          </div>

          <button
            onClick={handleBrandSubmit}
            disabled={!website.trim() || isValidatingDomain}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isValidatingDomain ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>

      {/* Wrong account link */}
      <div className="mt-auto pt-12">
        <button
          onClick={resetForm}
          className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
        >
          Wrong account?
        </button>
      </div>
    </motion.div>
  );
}
