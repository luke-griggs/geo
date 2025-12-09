import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-white"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-lg">GEO</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="px-4 py-2 text-sm font-medium text-white bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-600">
            <span className="w-1.5 h-1.5 bg-[#6366f1] rounded-full"></span>
            AI visibility analytics
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-center text-gray-900 leading-tight tracking-tight mb-6">
          Track how AI sees
          <br />
          your brand
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-gray-500 text-center max-w-2xl mx-auto mb-10">
          Monitor your visibility across ChatGPT, Claude, Perplexity, and other
          AI search engines. Get insights to improve how AI recommends you.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg transition-colors"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            View demo
          </Link>
        </div>

        {/* Visual Element - Dashboard Preview */}
        <div className="mt-20 relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/5 via-[#6366f1]/10 to-transparent rounded-2xl blur-3xl transform scale-110"></div>

          {/* Dashboard mockup */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-white rounded-md text-xs text-gray-400 border border-gray-100">
                  app.geoanalytics.io
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Stat cards */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Visibility Score</p>
                  <p className="text-2xl font-bold text-gray-900">78%</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-emerald-600">+12%</span>
                    <span className="text-xs text-gray-400">vs last week</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">AI Mentions</p>
                  <p className="text-2xl font-bold text-gray-900">2,847</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-emerald-600">+340</span>
                    <span className="text-xs text-gray-400">this month</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Sentiment</p>
                  <p className="text-2xl font-bold text-gray-900">Positive</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-gray-400">92% favorable</span>
                  </div>
                </div>
              </div>

              {/* Chart placeholder */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    Visibility Over Time
                  </p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      7D
                    </span>
                    <span className="px-2 py-1 text-xs bg-[#6366f1] text-white rounded">
                      30D
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      90D
                    </span>
                  </div>
                </div>
                <svg viewBox="0 0 400 100" className="w-full h-24">
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 80 Q 50 70 100 60 T 200 40 T 300 30 T 400 15 L 400 100 L 0 100 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M 0 80 Q 50 70 100 60 T 200 40 T 300 30 T 400 15"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="400" cy="15" r="4" fill="#6366f1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400 mb-6">
            Monitoring visibility across
          </p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2 text-gray-600">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
              </svg>
              <span className="text-sm font-medium">ChatGPT</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span className="text-sm font-medium">Perplexity</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6a1 1 0 0 0-1 1v5a1 1 0 0 0 .29.71l3 3a1 1 0 0 0 1.42-1.42L13 11.59V7a1 1 0 0 0-1-1z" />
              </svg>
              <span className="text-sm font-medium">Claude</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-sm font-medium">Gemini</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} GEO Analytics. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
