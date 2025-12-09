"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { emailOtp, signIn } from "@/lib/auth-client";

type OnboardingStep = "email" | "signin" | "company" | "account" | "verify";

const COMPANY_SIZES = [
  "1-10 employees",
  "11-100 employees",
  "101-500 employees",
  "501-1000 employees",
  "1001+ employees",
] as const;

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
      // Now send the verification OTP
      console.log("[Onboarding] Sending verification OTP to:", email);
      const result = await emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
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
      console.error("[Onboarding] OTP send exception:", err);
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
      // Sign in with OTP - this verifies the OTP and auto-creates user if needed
      const result = await signIn.emailOtp({
        email,
        otp: otpString,
      });

      if (result.error) {
        setError(result.error.message || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch {
      setError("Failed to verify email");
      setIsLoading(false);
    }
  }, [otp, email, router]);

  const handleResend = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
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

  const goBack = () => {
    setError(null);
    if (currentStep === "signin") {
      goToStep("email", "right");
      setPassword("");
    } else if (currentStep === "company") {
      goToStep("email", "left");
    } else if (currentStep === "account") {
      goToStep("company", "left");
    } else if (currentStep === "verify") {
      goToStep("account", "left");
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
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {currentStep !== "email" && currentStep !== "signin" && (
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
              {["email", "company", "account", "verify"].map((step, index) => {
                const stepOrder = ["email", "company", "account", "verify"];
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
              })}
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

        {/* Testimonial Card Placeholder */}
        <div className="absolute bottom-20 right-8 left-8 bg-white rounded-2xl shadow-lg p-6 max-w-md ml-auto">
          <p className="text-gray-900 mb-4">
            &quot;After trying out a few AI SEO platforms, I hounded the team at
            GEO Analytics for a license until they finally took the call. Since
            then, our visibility has 4x&apos;d and it&apos;s a common occurrence
            for a customer to tell me they found us via ChatGPT or
            Perplexity.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Customer Name</p>
              <p className="text-gray-500 text-sm">CEO and Co-Founder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
