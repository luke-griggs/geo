"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Globe,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OnboardingStep = "workspace" | "domain" | "complete";

const STEPS: OnboardingStep[] = ["workspace", "domain", "complete"];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("workspace");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    workspaceName: "",
    domain: "",
  });

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create workspace and domain via API
      const workspaceRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.workspaceName,
          domain: formData.domain,
        }),
      });

      if (!workspaceRes.ok) {
        const data = await workspaceRes.json();
        throw new Error(data.error || "Failed to create workspace");
      }

      // Redirect to the dashboard
      router.push(`/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }, [formData, router]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "workspace":
        return formData.workspaceName.trim().length > 0;
      case "domain":
        return formData.domain.trim().length > 0;
      case "complete":
        return true;
      default:
        return false;
    }
  }, [currentStep, formData.workspaceName, formData.domain]);

  // Handle Enter key to advance to next step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && canProceed()) {
        e.preventDefault();
        if (currentStep === "complete") {
          handleComplete();
        } else {
          goNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, canProceed, goNext, handleComplete]);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#faf9f7] flex-col justify-between p-12 relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="GEO Analytics" className="w-6 h-6" />
          <span className="font-semibold text-gray-900">GEO Analytics</span>
        </div>

        {/* Main Content */}
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
            Get up to 14 days free
          </h1>
          <p className="text-gray-600 mb-10">
            Start optimizing your content for AI search engines today.
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Full feature access
                </p>
                <p className="text-gray-600 text-sm">
                  All tools and analytics included
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  AI-powered optimization
                </p>
                <p className="text-gray-600 text-sm">
                  Content effort scoring and insights
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Try our starter plan
                </p>
                <p className="text-gray-600 text-sm">
                  14 days of unlimited access
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Graph */}
        <div className="relative">
          <svg
            viewBox="0 0 400 200"
            className="w-full max-w-md opacity-60"
            fill="none"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#e5e5e5"
                  strokeWidth="1"
                  strokeDasharray="2,4"
                />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#grid)" />
            <path
              d="M 0 180 Q 100 160 150 140 T 250 100 T 350 40 L 400 20"
              stroke="#c9644a"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <g transform="translate(240, 70)">
              <rect
                x="-50"
                y="-20"
                width="100"
                height="40"
                rx="8"
                fill="#c9644a"
              />
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="600"
              >
                Visibility 28%
              </text>
            </g>
          </svg>
          <p className="text-xs text-gray-400 mt-4">
            Join thousands optimizing for AI search
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2 p-6 border-b border-gray-100">
          <img src="/logo.svg" alt="GEO Analytics" className="w-6 h-6" />
          <span className="font-semibold text-gray-900">GEO Analytics</span>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-lg">
            {/* Step Content */}
            {currentStep === "workspace" && (
              <div className="animate-in fade-in-0 slide-in-from-right-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#faf9f7] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#c9644a]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Name your workspace
                  </h2>
                </div>
                <p className="text-gray-600 mb-8 ml-13">
                  This is usually your company or brand name
                </p>

                <input
                  type="text"
                  placeholder="e.g. Acme Inc"
                  value={formData.workspaceName}
                  onChange={(e) =>
                    setFormData({ ...formData, workspaceName: e.target.value })
                  }
                  autoFocus
                  className="w-full px-4 py-4 text-lg rounded-lg border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-[#c9644a] transition-colors"
                />
              </div>
            )}

            {currentStep === "domain" && (
              <div className="animate-in fade-in-0 slide-in-from-right-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#faf9f7] flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#c9644a]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Which website do you want to track?
                  </h2>
                </div>
                <p className="text-gray-600 mb-8">
                  We&apos;ll use this to track your brand visibility, create
                  content, and analyze your site
                </p>

                <input
                  type="text"
                  placeholder="e.g. example.com or example.com/en"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                  autoFocus
                  className="w-full px-4 py-4 text-lg rounded-lg border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-[#c9644a] transition-colors"
                />
                <p className="text-sm text-gray-400 mt-2">
                  You can enter with or without https://
                </p>
              </div>
            )}

            {currentStep === "complete" && (
              <div className="animate-in fade-in-0 slide-in-from-right-2 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You&apos;re all set!
                </h2>
                <p className="text-gray-600 mb-8">
                  Your workspace <strong>{formData.workspaceName}</strong> is
                  ready. We&apos;ll start tracking{" "}
                  <strong>{formData.domain}</strong> right away.
                </p>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#c9644a] hover:bg-[#b55840] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-100 p-6">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-[#c9644a] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={currentStepIndex === 0}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                currentStepIndex === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep !== "complete" && (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
                  canProceed()
                    ? "bg-[#c9644a] hover:bg-[#b55840] text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
