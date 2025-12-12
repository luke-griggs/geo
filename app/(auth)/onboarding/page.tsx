"use client";

import { Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  OnboardingProvider,
  useOnboarding,
  Logo,
  EmailStep,
  SigninStep,
  CompanyStep,
  AccountStep,
  VerifyStep,
  BrandStep,
  AnalysisStep,
  DailyPromptsStep,
  TopicsStep,
  PromptsStep,
  OnboardingRightPanel,
} from "@/components/onboarding";
import { useSession } from "@/lib/auth-client";

function OnboardingContent() {
  const { currentStep, goBack } = useOnboarding();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [isCheckingOrgs, setIsCheckingOrgs] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check if user has already completed onboarding (only if authenticated)
  useEffect(() => {
    // Skip if session is still loading or user is not authenticated
    if (isSessionLoading || !session?.user) {
      return;
    }

    async function checkOnboardingStatus() {
      setIsCheckingOrgs(true);
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          // If user has an organization with domains, they've completed onboarding
          if (
            data.organizations &&
            data.organizations.length > 0 &&
            data.organizations[0].domains?.length > 0
          ) {
            setHasCompletedOnboarding(true);
            // Redirect to dashboard
            window.location.href = "/dashboard";
            return;
          }
        }
      } catch {
        // Error fetching - continue with onboarding
      } finally {
        setIsCheckingOrgs(false);
      }
    }
    checkOnboardingStatus();
  }, [session, isSessionLoading]);

  // Determine if we're still in a loading state
  const isCheckingAuth = isSessionLoading || (session?.user && isCheckingOrgs);

  // Show loading while checking auth
  if (isCheckingAuth || hasCompletedOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Prompts step has its own full-page layout
  if (currentStep === "prompts") {
    return <PromptsStep />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col pt-12 lg:pt-16 px-8 lg:px-16 xl:px-24 max-w-xl mx-auto w-full">
          {/* Logo */}
          <Logo />

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === "email" && <EmailStep />}
            {currentStep === "signin" && <SigninStep />}
            {currentStep === "company" && <CompanyStep />}
            {currentStep === "account" && <AccountStep />}
            {currentStep === "verify" && <VerifyStep />}
            {currentStep === "brand" && <BrandStep />}
            {currentStep === "analysis" && <AnalysisStep />}
            {currentStep === "daily-prompts" && <DailyPromptsStep />}
            {currentStep === "topics" && <TopicsStep />}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <FooterNav currentStep={currentStep} goBack={goBack} />
      </div>

      {/* Right Panel - Decorative */}
      <OnboardingRightPanel />
    </div>
  );
}

function FooterNav({
  currentStep,
  goBack,
}: {
  currentStep: string;
  goBack: () => void;
}) {
  // Steps that show progress dots
  const showProgressSteps = ["company", "account", "verify"];
  const stepOrder = ["email", "company", "account", "verify", "brand"];

  // Only show back button and dots for certain steps
  if (showProgressSteps.includes(currentStep)) {
    const currentIndex = stepOrder.indexOf(currentStep);

    return (
      <div className="px-8 lg:px-16 xl:px-24 py-6 max-w-xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {stepOrder.map((step, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = step === currentStep;
            return (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "w-4 bg-gray-900"
                    : isActive
                    ? "w-1.5 bg-gray-900"
                    : "w-1.5 bg-gray-300"
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Just show back button for signin
  if (currentStep === "signin") {
    return (
      <div className="px-8 lg:px-16 xl:px-24 py-6 max-w-xl mx-auto w-full">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  // No footer for other steps
  return null;
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <OnboardingProvider>
        <OnboardingContent />
      </OnboardingProvider>
    </Suspense>
  );
}
