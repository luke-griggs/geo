"use client";

import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useOnboarding } from "../context";
import { slideVariants } from "../shared";

export function EmailStep() {
  const {
    direction,
    email,
    setEmail,
    isLoading,
    setIsLoading,
    error,
    setError,
    goToStep,
  } = useOnboarding();

  const isEmailValid = email.includes("@") && email.includes(".");

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

      // Email doesn't exist - continue to company info
      goToStep("company", "right");
    } catch {
      setError("Failed to continue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      <p className="text-gray-500 mb-8">Create your account or sign in.</p>

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
  );
}
