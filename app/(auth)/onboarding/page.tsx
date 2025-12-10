"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { emailOtp, signIn, signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Domain logo component with fallback
function DomainLogo({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [prevDomain, setPrevDomain] = useState(domain);

  // Reset state when domain changes - React's recommended pattern for adjusting state based on props
  if (prevDomain !== domain) {
    setPrevDomain(domain);
    setImgError(false);
    setImgLoaded(false);
  }

  if (imgError || !domain) {
    return null;
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className={cn(
        "rounded flex-shrink-0 transition-opacity duration-200",
        imgLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={() => setImgLoaded(true)}
      onError={() => setImgError(true)}
    />
  );
}

type OnboardingStep =
  | "email"
  | "signin"
  | "company"
  | "account"
  | "verify"
  | "brand"
  | "analysis"
  | "daily-prompts"
  | "topics";

// Topic suggestion from the API
interface TopicSuggestion {
  name: string;
  description: string;
}

// Analysis result type matching the API response
interface AnalysisResult {
  brandName: string;
  domain: string;
  industry: string;
  visibilityScore: number;
  rank: number | null;
  competitors: { name: string; domain: string | null; mentionCount: number }[];
  totalMentions: number;
  totalPrompts: number;
  topics: TopicSuggestion[];
}

// AI Model icons component
function AIModelIcons() {
  return (
    <div className="flex items-center gap-1">
      {/* ChatGPT */}
      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
            fill="white"
          />
        </svg>
      </div>
      {/* Claude/Anthropic */}
      <div className="w-8 h-8 rounded-full bg-[#D97757] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M17.304 3.866l-6.836 16.268h3.478l6.836-16.268h-3.478zm-7.132 0L3.336 20.134h3.478l6.836-16.268h-3.478z" />
        </svg>
      </div>
      {/* Google/Gemini */}
      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </div>
      {/* Meta/Llama */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0081FB] via-[#A259FF] to-[#F77737] flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      </div>
    </div>
  );
}

const COMPANY_SIZES = [
  "1-10 employees",
  "11-100 employees",
  "101-500 employees",
  "501-1000 employees",
  "1001+ employees",
] as const;

// Analysis loading messages - starts descriptive, gets progressively more humorous
const ANALYSIS_MESSAGES = [
  "Visiting your website...",
  "Reading about your brand...",
  "Identifying your industry...",
  "Crafting some test prompts...",
  "Asking ChatGPT about you...",
  "Counting your mentions...",
  "Comparing you to competitors...",
  "Negotiating with the AI overlords...",
  "Training the neural networks...",
  "Almost there, we promise...",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("email");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [isAgency, setIsAgency] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Brand step data
  const [website, setWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isValidatingDomain, setIsValidatingDomain] = useState(false);

  // Analysis step data
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMessageIndex, setAnalysisMessageIndex] = useState(0);

  // Topics step data
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [customTopics, setCustomTopics] = useState<TopicSuggestion[]>([]);
  const [isAddingCustomTopic, setIsAddingCustomTopic] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState("");

  // Clean website input to get favicon
  const cleanedWebsite = website
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  // Check if domain looks valid (has at least 2 characters after the last dot)
  const lastDotIndex = cleanedWebsite.lastIndexOf(".");
  const hasValidTLD =
    lastDotIndex > 0 && cleanedWebsite.length - lastDotIndex > 2;
  const showFavicon = hasValidTLD;

  // Refs for OTP inputs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    if (currentStep === "verify" && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [currentStep, resendTimer]);

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
  }, [isAnalyzing]);

  // Pre-select first 5 topics when analysis completes
  useEffect(() => {
    if (analysisResult?.topics && analysisResult.topics.length > 0) {
      const initialTopics = new Set(
        analysisResult.topics.slice(0, 5).map((t) => t.name)
      );
      setSelectedTopics(initialTopics);
    }
  }, [analysisResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const goToStep = (newStep: OnboardingStep, dir: "left" | "right") => {
    setDirection(dir);
    setCurrentStep(newStep);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      // First, check if the email already exists
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!checkRes.ok) {
        throw new Error("Failed to check email");
      }

      const { exists } = await checkRes.json();

      if (exists) {
        // Email exists - show sign in form (slide from left)
        goToStep("signin", "left");
        setIsLoading(false);
        return;
      }

      // Email doesn't exist - continue to company info (don't send OTP yet)
      goToStep("company", "right");
    } catch {
      setError("Failed to continue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!password) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard after successful sign in
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = () => {
    if (!companySize) return;

    // Store company data for later use
    localStorage.setItem("onboarding_company_size", companySize);
    localStorage.setItem("onboarding_is_agency", isAgency.toString());

    // Move to account creation step
    goToStep("account", "right");
  };

  const handleAccountSubmit = async () => {
    if (!firstName || !lastName || !password || !termsAccepted) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, create the account with signUp.email
      console.log("[Onboarding] Creating account for:", email);
      const signUpResult = await signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`,
      });

      console.log("[Onboarding] Sign up result:", signUpResult);

      if (signUpResult.error) {
        console.error("[Onboarding] Sign up error:", signUpResult.error);
        setError(signUpResult.error.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Store first/last name separately for profile update later if needed
      localStorage.setItem("onboarding_first_name", firstName);
      localStorage.setItem("onboarding_last_name", lastName);

      // Now send the verification OTP
      console.log("[Onboarding] Sending verification OTP to:", email);
      const result = await emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      console.log("[Onboarding] OTP send result:", result);

      if (result.error) {
        console.error("[Onboarding] OTP send error:", result.error);
        setError(result.error.message || "Failed to send verification code");
        setIsLoading(false);
        return;
      }

      // Move to verification step
      goToStep("verify", "right");
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      console.error("[Onboarding] Account creation exception:", err);
      setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    // Focus the last filled input or the next empty one
    const lastIndex = Math.min(pastedData.length, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  const handleVerify = useCallback(async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verify the email with OTP
      console.log("[Onboarding] Verifying email with OTP");
      const verifyResult = await emailOtp.verifyEmail({
        email,
        otp: otpString,
      });

      if (verifyResult.error) {
        console.error(
          "[Onboarding] Email verification error:",
          verifyResult.error
        );
        setError(verifyResult.error.message || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      console.log("[Onboarding] Email verified, signing in");

      // Email verified - now sign in with email/password
      const signInResult = await signIn.email({
        email,
        password,
      });

      if (signInResult.error) {
        console.error(
          "[Onboarding] Sign in after verify error:",
          signInResult.error
        );
        // Even if sign-in fails, the account is verified - try redirecting
        // The user might already have a session from signUp
      }

      // Success - move to brand setup step
      goToStep("brand", "right");
      setIsLoading(false);
    } catch {
      setError("Failed to verify email");
      setIsLoading(false);
    }
  }, [otp, email, password]);

  const handleResend = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (result.error) {
        setError(result.error.message || "Failed to resend code");
        setIsLoading(false);
        return;
      }

      setResendTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
    } catch {
      setError("Failed to resend code");
    } finally {
      setIsLoading(false);
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

  const handleWrongAccount = async () => {
    // Clear all onboarding data and go back to email step
    localStorage.removeItem("onboarding_company_size");
    localStorage.removeItem("onboarding_is_agency");
    localStorage.removeItem("onboarding_first_name");
    localStorage.removeItem("onboarding_last_name");
    localStorage.removeItem("onboarding_website");
    localStorage.removeItem("onboarding_brand_description");

    // Reset all form state
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setCompanySize(null);
    setIsAgency(false);
    setOtp(["", "", "", "", "", ""]);
    setWebsite("");
    setBrandDescription("");
    setWebsiteError(null);
    setError(null);
    setTermsAccepted(false);

    goToStep("email", "left");
  };

  const goBack = () => {
    setError(null);
    setWebsiteError(null);
    if (currentStep === "signin") {
      goToStep("email", "right");
      setPassword("");
    } else if (currentStep === "company") {
      goToStep("email", "left");
    } else if (currentStep === "account") {
      goToStep("company", "left");
    } else if (currentStep === "verify") {
      goToStep("account", "left");
    } else if (currentStep === "brand") {
      // Cannot go back from brand step (user is already verified)
      // This is intentional - they can use "Wrong account?" instead
    }
  };

  const isEmailValid = email.includes("@") && email.includes(".");
  const isOtpComplete = otp.every((digit) => digit !== "");
  const isAccountValid =
    firstName.trim() &&
    lastName.trim() &&
    password.length >= 8 &&
    termsAccepted;

  // Animation variants
  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col pt-12 lg:pt-16 px-8 lg:px-16 xl:px-24 max-w-xl mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#171717"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#171717"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#171717"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold text-gray-900">GEO Analytics</span>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait" custom={direction}>
            {currentStep === "email" && (
              <motion.div
                key="email"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  What&apos;s your email?
                </h1>
                <p className="text-gray-500 mb-8">
                  Create your account or sign in.
                </p>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Work email
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isEmailValid && !isLoading) {
                          handleEmailSubmit();
                        }
                      }}
                      autoFocus
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                    />
                    <button
                      onClick={handleEmailSubmit}
                      disabled={!isEmailValid || isLoading}
                      className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === "signin" && (
              <motion.div
                key="signin"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome back!
                </h1>
                <p className="text-gray-500 mb-8">
                  Please enter your account password to continue.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Work email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-sm text-gray-500 hover:text-gray-900 underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && password && !isLoading) {
                            handleSignIn();
                          }
                        }}
                        autoFocus
                        className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSignIn}
                    disabled={!password || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "company" && (
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
                      {COMPANY_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setCompanySize(size)}
                          className={`px-4 py-3 text-sm font-medium rounded-lg border transition-colors ${
                            companySize === size
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
                          } ${
                            size === "1001+ employees"
                              ? "col-span-2 sm:col-span-1"
                              : ""
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Are you an agency?
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
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
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "account" && (
              <motion.div
                key="account"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Create your account
                </h1>
                <p className="text-gray-500 mb-8">
                  Sign up to start tracking your brand&apos;s visibility.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Work email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        First name
                      </label>
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoFocus
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Last name
                      </label>
                      <input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5">
                      Password must be at least 8 characters
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
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
                      I agree to the{" "}
                      <a
                        href="/terms"
                        className="text-gray-900 underline hover:text-gray-700"
                      >
                        terms and conditions
                      </a>
                      .
                    </span>
                  </label>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleAccountSubmit}
                    disabled={!isAccountValid || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "verify" && (
              <motion.div
                key="verify"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verify your email
                </h1>
                <p className="text-gray-500 mb-8">We sent it to {email}.</p>

                <div className="space-y-6">
                  {/* OTP Input */}
                  <div>
                    <div className="grid grid-cols-6 gap-3">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) =>
                            handleOtpChange(index, e.target.value)
                          }
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={index === 0 ? handleOtpPaste : undefined}
                          autoFocus={index === 0}
                          className="w-full h-20 text-center text-3xl font-semibold rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
                        />
                      ))}
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}
                  </div>

                  {/* Open Email & Resend */}
                  <div className="flex items-center justify-between">
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Open Email
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                    <div className="flex items-center gap-2 text-sm">
                      {!canResend && (
                        <span className="text-gray-400">
                          Resend in {formatTime(resendTimer)}
                        </span>
                      )}
                      <button
                        onClick={handleResend}
                        disabled={!canResend || isLoading}
                        className={`font-medium transition-colors ${
                          canResend
                            ? "text-gray-900 hover:text-gray-700"
                            : "text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        Resend
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={!isOtpComplete || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "brand" && (
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
                    This will be the first brand you&apos;ll track on GEO
                    Analytics — you can add more later.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Website
                      </label>
                      <div className="relative">
                        {showFavicon && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <DomainLogo
                              domain={cleanedWebsite}
                              className="w-5 h-5"
                            />
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
                        <p className="text-red-500 text-sm mt-2">
                          {websiteError}
                        </p>
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
                        The more specific you are, the better the results
                        we&apos;ll be able to provide.
                      </p>
                      <ul className="text-gray-500 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>What products or services do you offer?</li>
                        <li>Do you serve any specific regions?</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleBrandSubmit}
                      disabled={!website.trim() || isValidatingDomain}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors"
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
                    onClick={handleWrongAccount}
                    className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
                  >
                    Wrong account?
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "analysis" && (
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
                      <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
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
                      <DomainLogo
                        domain={analysisResult.domain}
                        className="w-8 h-8"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">
                          {analysisResult.brandName}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {analysisResult.domain}
                        </span>
                      </div>
                    </div>

                    {/* AI Model Icons */}
                    <div className="mb-6">
                      <AIModelIcons />
                    </div>

                    {/* Dynamic headline based on performance */}
                    {analysisResult.rank !== null &&
                    analysisResult.rank <= 3 ? (
                      // Good visibility
                      <>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                          {analysisResult.brandName} is ranked #
                          {analysisResult.rank} in AI visibility
                        </h1>
                        <p className="text-gray-500 mb-8">
                          We&apos;ve identified 3+ strategies to move your brand
                          up from rank #{analysisResult.rank} and gain more
                          visibility.
                        </p>
                      </>
                    ) : analysisResult.rank !== null &&
                      analysisResult.rank <= 7 ? (
                      // Moderate visibility
                      <>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                          {analysisResult.brandName} has moderate AI visibility
                        </h1>
                        <p className="text-gray-500 mb-8">
                          You&apos;re currently ranked #{analysisResult.rank} —
                          we&apos;ve found opportunities to improve your
                          visibility.
                        </p>
                      </>
                    ) : (
                      // Poor visibility
                      <>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                          {analysisResult.brandName}&apos;s AI visibility is
                          below industry benchmarks
                        </h1>
                        <p className="text-gray-500 mb-8">
                          Let&apos;s fix that — we&apos;ve already found 5+
                          opportunities to improve {analysisResult.brandName}
                          &apos;s visibility.
                        </p>
                      </>
                    )}

                    <button
                      onClick={handleAnalysisContinue}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                ) : null}
              </motion.div>
            )}

            {currentStep === "daily-prompts" && analysisResult && (
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
                    <DomainLogo
                      domain={analysisResult.domain}
                      className="w-6 h-6"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {analysisResult.brandName}
                      </span>
                      <span className="text-gray-400">
                        {analysisResult.domain}
                      </span>
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    We run your prompts daily to analyze your brand&apos;s
                    performance
                  </h1>
                  <p className="text-gray-500 mb-8">
                    We look for your brand in answers, citations, and mentions
                    to understand how you&apos;re showing up in ChatGPT, Google
                    AI Overviews, Perplexity, Microsoft Copilot, and more.
                  </p>

                  <button
                    onClick={() => goToStep("topics", "right")}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === "topics" && analysisResult && (
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
                    <DomainLogo
                      domain={analysisResult.domain}
                      className="w-6 h-6"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {analysisResult.brandName}
                      </span>
                      <span className="text-gray-400">
                        {analysisResult.domain}
                      </span>
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Which topics do you want to create prompts for?
                  </h1>
                  <p className="text-gray-500 mb-6">Select up to 10 topics</p>

                  {/* Topics list */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[...analysisResult.topics, ...customTopics].map(
                      (topic) => {
                        const isSelected = selectedTopics.has(topic.name);
                        const canSelect =
                          isSelected || selectedTopics.size < 10;

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
                              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                              isSelected
                                ? "bg-gray-900 border-gray-900 text-white"
                                : canSelect
                                ? "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                                : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                            {topic.name}
                          </button>
                        );
                      }
                    )}

                    {/* Add custom topic button/input */}
                    {isAddingCustomTopic ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={customTopicInput}
                          onChange={(e) => setCustomTopicInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customTopicInput.trim()) {
                              const newTopic = {
                                name: customTopicInput.trim(),
                                description: "Custom topic",
                              };
                              setCustomTopics([...customTopics, newTopic]);
                              setSelectedTopics(
                                new Set([
                                  ...selectedTopics,
                                  customTopicInput.trim(),
                                ])
                              );
                              setCustomTopicInput("");
                              setIsAddingCustomTopic(false);
                            } else if (e.key === "Escape") {
                              setCustomTopicInput("");
                              setIsAddingCustomTopic(false);
                            }
                          }}
                          autoFocus
                          placeholder="Enter topic..."
                          className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 w-40"
                        />
                        <button
                          onClick={() => {
                            if (customTopicInput.trim()) {
                              const newTopic = {
                                name: customTopicInput.trim(),
                                description: "Custom topic",
                              };
                              setCustomTopics([...customTopics, newTopic]);
                              setSelectedTopics(
                                new Set([
                                  ...selectedTopics,
                                  customTopicInput.trim(),
                                ])
                              );
                              setCustomTopicInput("");
                              setIsAddingCustomTopic(false);
                            }
                          }}
                          className="p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
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
                        disabled={selectedTopics.size >= 10}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all",
                          selectedTopics.size < 10
                            ? "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"
                            : "border-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        <Plus className="w-4 h-4" />
                        Add custom
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      // TODO: Save selected topics and redirect to dashboard
                      router.push("/dashboard");
                    }}
                    disabled={selectedTopics.size === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Looks good
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {currentStep !== "email" &&
          currentStep !== "signin" &&
          currentStep !== "brand" &&
          currentStep !== "analysis" &&
          currentStep !== "daily-prompts" &&
          currentStep !== "topics" && (
            <div className="px-8 lg:px-16 xl:px-24 py-6 max-w-xl mx-auto w-full flex items-center justify-between">
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {["email", "company", "account", "verify", "brand"].map(
                  (step, index) => {
                    const stepOrder = [
                      "email",
                      "company",
                      "account",
                      "verify",
                      "brand",
                    ];
                    const currentIndex = stepOrder.indexOf(currentStep);
                    const isActive = index <= currentIndex;
                    const isCurrent = step === currentStep;
                    return (
                      <div
                        key={step}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? "w-6 bg-gray-900"
                            : isActive
                            ? "w-2 bg-gray-900"
                            : "w-2 bg-gray-300"
                        }`}
                      />
                    );
                  }
                )}
              </div>
            </div>
          )}
        {currentStep === "signin" && (
          <div className="px-8 lg:px-16 xl:px-24 py-6 max-w-xl mx-auto w-full">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:block lg:w-[45%] bg-[#f5f5f5] relative overflow-hidden">
        {/* Decorative dot pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1" fill="#9ca3af" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Show Industry Ranking Card when analysis results are available */}
        {currentStep === "analysis" && analysisResult && !isAnalyzing && (
          <div className="absolute bottom-20 right-8 left-8 bg-white rounded-2xl shadow-lg p-6 max-w-md ml-auto">
            <h3 className="text-center font-semibold text-gray-900 mb-4">
              {analysisResult.industry}
            </h3>
            <div className="space-y-2">
              {/* Show competitors with our brand - always show 5 items total */}
              {(() => {
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

                if (userRank !== null && userRank <= 4) {
                  // User is in top 4, fill in around them
                  let competitorIdx = 0;
                  for (let position = 1; position <= 5; position++) {
                    if (position === userRank) {
                      displayItems.push(userBrandEntry);
                    } else if (
                      competitorIdx < analysisResult.competitors.length
                    ) {
                      displayItems.push({
                        rank: position,
                        name: analysisResult.competitors[competitorIdx].name,
                        domain:
                          analysisResult.competitors[competitorIdx].domain,
                        isOurBrand: false,
                      });
                      competitorIdx++;
                    }
                  }
                } else {
                  // User is ranked 5+ (or unranked), show top 4 competitors then user
                  for (
                    let i = 0;
                    i < Math.min(4, analysisResult.competitors.length);
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

                return displayItems.map((item, idx) => (
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
                ));
              })()}
            </div>
          </div>
        )}

        {/* Daily Prompts Step - Show prompt preview and AI icons */}
        {currentStep === "daily-prompts" && analysisResult && (
          <div className="absolute inset-8 flex flex-col justify-center items-center">
            {/* Prompt bubble */}
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-600"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-gray-900 text-sm">
                  Who is the leading company in{" "}
                  {analysisResult.industry.toLowerCase()}?
                </p>
              </div>
            </div>

            {/* AI Model Icons with + more */}
            <div className="flex items-center gap-2 mb-6">
              <AIModelIcons />
              <span className="text-sm text-gray-500">+ more</span>
            </div>

            {/* Running prompts indicator */}
            <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              <span className="text-gray-700 font-medium">
                Running prompts...
              </span>
            </div>
          </div>
        )}

        {/* Topics Step - Show Topic Selection Tips */}
        {currentStep === "topics" && (
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
                    We&apos;ll start you off with 5 topics and 25 prompts total
                    — you can always add more later.
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
                    Pick common words or phrases that represent key parts of
                    your brand, or that you use for your SEO.
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
        )}

        {/* Testimonial Card - show when not in analysis results or new steps */}
        {!(currentStep === "analysis" && analysisResult && !isAnalyzing) &&
          currentStep !== "daily-prompts" &&
          currentStep !== "topics" && (
            <div className="absolute bottom-20 right-8 left-8 bg-white rounded-2xl shadow-lg p-6 max-w-md ml-auto">
              <p className="text-gray-900 mb-4">
                &quot;After trying out a few AI SEO platforms, I hounded the
                team at GEO Analytics for a license until they finally took the
                call. Since then, our visibility has 4x&apos;d and it&apos;s a
                common occurrence for a customer to tell me they found us via
                ChatGPT or Perplexity.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    Customer Name
                  </p>
                  <p className="text-gray-500 text-sm">CEO and Co-Founder</p>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
