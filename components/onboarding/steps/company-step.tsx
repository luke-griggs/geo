"use client";

import { motion } from "motion/react";
import { useOnboarding, COMPANY_SIZES } from "../context";
import { slideVariants } from "../shared";
import { cn } from "@/lib/utils";

export function CompanyStep() {
  const {
    direction,
    companySize,
    setCompanySize,
    isAgency,
    setIsAgency,
    error,
    goToStep,
  } = useOnboarding();

  const handleCompanySubmit = () => {
    if (!companySize) return;

    // Store company data for later use
    localStorage.setItem("onboarding_company_size", companySize);
    localStorage.setItem("onboarding_is_agency", isAgency.toString());

    // Move to account creation step
    goToStep("account", "right");
  };

  return (
    <motion.div
      key="company"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Tell us about your company
      </h1>
      <p className="text-gray-500 mb-8">
        This will help us personalize your experience.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            What&apos;s your company size?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {COMPANY_SIZES.map((size) => {
              const isSelected = companySize === size;
              return (
                <button
                  key={size}
                  onClick={() => setCompanySize(size)}
                  className={cn(
                    "px-4 py-3 rounded-lg border text-sm font-medium text-center",
                    isSelected
                      ? "bg-[#6366f1] border-[#6366f1] text-white"
                      : "bg-white border-gray-200 text-gray-900 hover:border-gray-300",
                    size === "1001+ employees" ? "col-span-2 sm:col-span-1" : ""
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Are you an agency?
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={isAgency}
                onChange={(e) => setIsAgency(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white transition-all duration-200 peer-checked:bg-[#6366f1] peer-checked:border-[#6366f1] group-hover:border-gray-400 peer-checked:group-hover:border-[#4f46e5] peer-focus:ring-2 peer-focus:ring-[#6366f1]/20" />
              <svg
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-700">
              Yes, I&apos;m an agency
            </span>
          </label>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCompanySubmit}
          disabled={!companySize}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
