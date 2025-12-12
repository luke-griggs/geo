"use client";

import { motion } from "motion/react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signUp, emailOtp } from "@/lib/auth-client";
import { useOnboarding } from "../context";
import { slideVariants } from "../shared";

export function AccountStep() {
  const {
    direction,
    email,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    termsAccepted,
    setTermsAccepted,
    isLoading,
    setIsLoading,
    error,
    setError,
    goToStep,
    setResendTimer,
    setCanResend,
  } = useOnboarding();

  const isAccountValid =
    firstName.trim() &&
    lastName.trim() &&
    password.length >= 8 &&
    termsAccepted;

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

  return (
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
              autoComplete="given-name"
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
              autoComplete="family-name"
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
              autoComplete="new-password"
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
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
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
  );
}
