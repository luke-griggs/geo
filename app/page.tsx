import Link from "next/link";
import { ArrowRight, Check, BarChart3, Target, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      {/* Left Panel - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="GEO Analytics" className="w-6 h-6" />
          <span className="font-semibold text-gray-900">GEO Analytics</span>
        </div>

        {/* Main Content */}
        <div className="max-w-md">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Track your AI visibility
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Monitor how AI search engines mention and recommend your brand. Get
            actionable insights to improve your visibility.
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Multi-platform monitoring
                </p>
                <p className="text-gray-600 text-sm">
                  Track mentions across ChatGPT, Claude, Perplexity, Gemini, and
                  more
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  AI-powered analysis
                </p>
                <p className="text-gray-600 text-sm">
                  Automated sentiment scoring and competitive positioning
                  insights
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c9644a] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Custom prompts</p>
                <p className="text-gray-600 text-sm">
                  Generate targeted queries based on your brand and industry
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
            {/* Grid lines */}
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

            {/* Rising curve */}
            <path
              d="M 0 180 Q 100 160 150 140 T 250 100 T 350 40 L 400 20"
              stroke="#c9644a"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* Score badge */}
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

      {/* Right Panel - CTA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2 mb-12">
          <img src="/logo.svg" alt="GEO Analytics" className="w-6 h-6" />
          <span className="font-semibold text-gray-900">GEO Analytics</span>
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center lg:text-left">
            Get started today
          </h2>
          <p className="text-gray-600 mb-8 text-center lg:text-left">
            Start monitoring your AI visibility in minutes. No credit card
            required.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="text-center p-4 rounded-xl bg-[#faf9f7]">
              <BarChart3 className="w-6 h-6 text-[#c9644a] mx-auto mb-2" />
              <p className="text-xs text-gray-600">Real-time analytics</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#faf9f7]">
              <Target className="w-6 h-6 text-[#c9644a] mx-auto mb-2" />
              <p className="text-xs text-gray-600">Competitor tracking</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#faf9f7]">
              <Zap className="w-6 h-6 text-[#c9644a] mx-auto mb-2" />
              <p className="text-xs text-gray-600">AI optimization</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-4">
            <Link
              href="/sign-up"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#c9644a] hover:bg-[#b55840] text-white font-medium rounded-xl transition-colors"
            >
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/sign-in"
              className="w-full flex items-center justify-center px-6 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-colors"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-gray-700">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-gray-700">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
