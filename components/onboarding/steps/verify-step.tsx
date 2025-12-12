"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Loader2, ArrowUpRight } from "lucide-react";
import { emailOtp, signIn } from "@/lib/auth-client";
import { useOnboarding } from "../context";
import { slideVariants } from "../shared";

export function VerifyStep() {
  const {
    direction,
    email,
    password,
    otp,
    setOtp,
    resendTimer,
    setResendTimer,
    canResend,
    setCanResend,
    isLoading,
    setIsLoading,
    error,
    setError,
    goToStep,
    currentStep,
  } = useOnboarding();

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isOtpComplete = otp.every((digit) => digit !== "");

  // Resend countdown timer
  useEffect(() => {
    if (currentStep === "verify" && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [currentStep, resendTimer, setResendTimer, setCanResend]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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

    // Auto-verify when last digit is entered
    if (value && index === 5 && newOtp.every((digit) => digit !== "")) {
      handleVerify(newOtp.join(""));
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

  const handleVerify = useCallback(
    async (pastedOtp?: string) => {
      const otpString = pastedOtp || otp.join("");
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
    },
    [otp, email, password, setIsLoading, setError, goToStep]
  );

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

    // Auto-verify if full code was pasted
    if (pastedData.length === 6) {
      // Pass the pasted OTP directly to avoid state timing issues
      handleVerify(pastedData);
    }
  };

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

  return (
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
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                autoFocus={index === 0}
                className="w-full h-20 text-center text-3xl font-semibold rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-colors"
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
          onClick={() => handleVerify()}
          disabled={!isOtpComplete || isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
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
  );
}
