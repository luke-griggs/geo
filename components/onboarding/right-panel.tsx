"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2, Check } from "lucide-react";
import { useOnboarding } from "./context";
import { DomainLogo, AI_MODEL_DOMAINS, RightPanelBackground } from "./shared";
import { cn } from "@/lib/utils";

export function OnboardingRightPanel() {
  const { currentStep, analysisResult, isAnalyzing } = useOnboarding();

  return (
    <RightPanelBackground>
      {/* Show Industry Ranking Card when analysis results are available */}
      {currentStep === "analysis" && analysisResult && !isAnalyzing && (
        <IndustryRankingCard />
      )}

      {/* Daily Prompts Step - Prompt card with connected chart */}
      {currentStep === "daily-prompts" && analysisResult && (
        <DailyPromptsDecoration />
      )}

      {/* Topics Step - Show Topic Selection Tips */}
      {currentStep === "topics" && <TopicSelectionTips />}
    </RightPanelBackground>
  );
}

function IndustryRankingCard() {
  const { analysisResult } = useOnboarding();
  if (!analysisResult) return null;

  type RankingItem = {
    rank: number;
    name: string;
    domain: string | null;
    isOurBrand: boolean;
  };

  const userRank = analysisResult.rank;
  const userBrandEntry: RankingItem = {
    rank: userRank ?? 999,
    name: analysisResult.brandName,
    domain: analysisResult.domain,
    isOurBrand: true,
  };

  // If user is in top 4, show positions 1-5 with user inserted
  // If user is ranked 5+, show positions 1-4 then user at their rank
  const displayItems: RankingItem[] = [];

  if (userRank !== null && userRank <= 5) {
    // User is in top 5, fill in around them
    let competitorIdx = 0;
    for (let position = 1; position <= 5; position++) {
      if (position === userRank) {
        displayItems.push(userBrandEntry);
      } else if (competitorIdx < analysisResult.competitors.length) {
        displayItems.push({
          rank: position,
          name: analysisResult.competitors[competitorIdx].name,
          domain: analysisResult.competitors[competitorIdx].domain,
          isOurBrand: false,
        });
        competitorIdx++;
      }
    }
  } else {
    // User is ranked 6+ (or unranked), show top 5 competitors then user
    for (
      let i = 0;
      i < Math.min(5, analysisResult.competitors.length);
      i++
    ) {
      displayItems.push({
        rank: i + 1,
        name: analysisResult.competitors[i].name,
        domain: analysisResult.competitors[i].domain,
        isOurBrand: false,
      });
    }
    displayItems.push(userBrandEntry);
  }

  return (
    <div className="absolute bottom-20 right-8 left-8 bg-white rounded-2xl shadow-lg p-6 max-w-md ml-auto">
      <h3 className="text-center font-semibold text-gray-900 mb-4">
        {analysisResult.industry}
      </h3>
      <div className="space-y-2">
        {displayItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              item.isOurBrand
                ? "bg-gray-100 border border-gray-200"
                : "hover:bg-gray-50"
            )}
          >
            <span className="text-sm font-medium text-gray-500 w-6">
              #{item.rank}
            </span>
            {item.domain && (
              <DomainLogo domain={item.domain} className="w-5 h-5" />
            )}
            <span
              className={cn(
                "text-sm",
                item.isOurBrand
                  ? "font-semibold text-gray-900"
                  : "text-gray-700"
              )}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyPromptsDecoration() {
  const { analysisResult } = useOnboarding();
  if (!analysisResult) return null;

  return (
    <div className="absolute inset-4 flex flex-col items-center justify-center">
      {/* Main prompt card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="bg-white rounded-2xl shadow-xl p-5 mx-4 border border-gray-100 max-w-sm w-full"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-600"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-gray-700 text-sm leading-relaxed">
              what are the best electric guitar brands for beginners?
            </p>
          </div>
        </div>

        {/* AI Models processing indicator */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {AI_MODEL_DOMAINS.map((domain, idx) => (
              <motion.div
                key={domain}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-5 h-5"
                />
              </motion.div>
            ))}
          </div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Running Prompts...
          </motion.div>
        </div>
      </motion.div>

      {/* Connecting vertical line */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 40 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="w-px bg-gray-300"
      />

      {/* Brand Visibility chart card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 max-w-md w-full"
      >
        {/* Header with big percentage */}
        <div className="mb-1">
          <h4 className="text-sm font-medium text-gray-500 mb-1">
            Brand Visibility
          </h4>
          <div className="flex items-baseline gap-2">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-3xl font-semibold text-gray-900"
            >
              65%
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8 }}
              className="text-sm font-medium text-[#00BF33]"
            >
              +5%
            </motion.span>
          </div>
        </div>

        {/* Line chart with y-axis */}
        <div className="mt-6">
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-xs text-gray-400 pr-3 h-36">
              <span>70%</span>
              <span>55%</span>
              <span>40%</span>
              <span>25%</span>
            </div>

            {/* Chart area */}
            <div className="flex-1 h-36 relative">
              <svg
                className="w-full h-full"
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
              >
                {/* Dotted grid lines */}
                <line
                  x1="0"
                  y1="0"
                  x2="200"
                  y2="0"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1="33.3"
                  x2="200"
                  y2="33.3"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1="66.6"
                  x2="200"
                  y2="66.6"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1="100"
                  x2="200"
                  y2="100"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Gradient fill under line */}
                <defs>
                  <linearGradient
                    id="visibilityGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor="#6366f1"
                      stopOpacity="0.15"
                    />
                    <stop
                      offset="100%"
                      stopColor="#6366f1"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6, duration: 0.5 }}
                  d="M0,75 L40,70 L80,55 L120,35 L160,20 L200,10 L200,100 L0,100 Z"
                  fill="url(#visibilityGradient)"
                />

                {/* Main trend line - smooth upward trend */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    delay: 1.4,
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  d="M0,75 L40,70 L80,55 L120,35 L160,20 L200,10"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* X-axis date labels */}
          <div className="flex justify-between mt-4 text-xs text-gray-400 pl-10">
            <span>Dec 9</span>
            <span>Dec 10</span>
            <span>Dec 11</span>
            <span>Dec 12</span>
            <span>Dec 13</span>
            <span>Dec 14</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TopicSelectionTips() {
  return (
    <div className="absolute bottom-20 right-8 left-8 bg-white rounded-2xl shadow-lg p-6 max-w-md ml-auto">
      <h3 className="text-center font-semibold text-gray-900 mb-6">
        Topic Selection Tips
      </h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Each topic generates 5 prompts to track
            </p>
            <p className="text-gray-500 text-sm">
              We&apos;ll start you off with 5 topics and 25 prompts total — you
              can always add more later.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Try using keywords from traditional search tools
            </p>
            <p className="text-gray-500 text-sm">
              Pick common words or phrases that represent key parts of your
              brand, or that you use for your SEO.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Avoid long phrases
            </p>
            <p className="text-gray-500 text-sm">
              Remember these are topics not prompts! Keep them short.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
