"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Domain logo component with fallback
export function DomainLogo({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [prevDomain, setPrevDomain] = useState(domain);

  // Reset state when domain changes
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

// AI Model icons component - uses Google Favicon API
export const AI_MODEL_DOMAINS = [
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "perplexity.ai",
] as const;

export function AIModelIcons() {
  return (
    <div className="flex items-center gap-1">
      {AI_MODEL_DOMAINS.map((domain) => (
        <div
          key={domain}
          className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt={domain}
            className="w-5 h-5"
          />
        </div>
      ))}
    </div>
  );
}

// Animation variants for step transitions
export const slideVariants = {
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

// Logo component
export function Logo() {
  return (
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
  );
}

// Decorative right panel with dot pattern
export function RightPanelBackground({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
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
      {children}
    </div>
  );
}
