"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Calendar,
  Cpu,
  MapPin,
  Users,
  Search,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Brand logo component with fallback
function BrandLogo({
  name,
  domain,
  className,
}: {
  name: string;
  domain: string | null;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!domain || imgError) {
    return (
      <span
        className={cn(
          "w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0",
          className
        )}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className={cn("w-4 h-4 rounded flex-shrink-0", className)}
      onError={() => setImgError(true)}
    />
  );
}

export type TimePeriod = "7d" | "30d" | "90d" | "custom";
export type Platform =
  | "chatgpt"
  | "claude"
  | "perplexity"
  | "gemini"
  | "grok"
  | "deepseek";
export type CompetitorType = "serp" | "direct";

interface Brand {
  name: string;
  domain: string | null;
  mentionCount: number;
}

interface FilterBarProps {
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  platforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  availableBrands: Brand[];
}

const timePeriodOptions: { value: TimePeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const platformOptions: { value: Platform; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "perplexity", label: "Perplexity" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "deepseek", label: "DeepSeek" },
];

export function FilterBar({
  timePeriod,
  onTimePeriodChange,
  platforms,
  onPlatformsChange,
  selectedBrands,
  onBrandsChange,
  availableBrands,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState("");

  const filteredBrands = availableBrands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const handlePlatformToggle = (platform: Platform) => {
    if (platforms.includes(platform)) {
      onPlatformsChange(platforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...platforms, platform]);
    }
  };

  const handleBrandToggle = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onBrandsChange(selectedBrands.filter((b) => b !== brandName));
    } else {
      onBrandsChange([...selectedBrands, brandName]);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time Period Dropdown */}
      <Dropdown
        trigger={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              {timePeriodOptions.find((o) => o.value === timePeriod)?.label}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        }
        isOpen={openDropdown === "time"}
        onOpenChange={(open) => setOpenDropdown(open ? "time" : null)}
      >
        <div className="py-1">
          {timePeriodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onTimePeriodChange(option.value);
                setOpenDropdown(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                timePeriod === option.value && "bg-gray-50 text-[#6366f1]"
              )}
            >
              {timePeriod === option.value && <Check className="w-4 h-4" />}
              {timePeriod !== option.value && <div className="w-4" />}
              {option.label}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Platforms Dropdown */}
      <Dropdown
        trigger={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Cpu className="w-4 h-4 text-gray-500" />
            <span>
              {platforms.length === 0
                ? "All Platforms"
                : platforms.length === platformOptions.length
                ? "All Platforms"
                : `${platforms.length} Platform${
                    platforms.length > 1 ? "s" : ""
                  }`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        }
        isOpen={openDropdown === "platforms"}
        onOpenChange={(open) => setOpenDropdown(open ? "platforms" : null)}
      >
        <div className="py-1">
          <button
            onClick={() => onPlatformsChange([])}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
              platforms.length === 0 && "bg-gray-50 text-[#6366f1]"
            )}
          >
            {platforms.length === 0 && <Check className="w-4 h-4" />}
            {platforms.length !== 0 && <div className="w-4" />}
            All Platforms
          </button>
          <div className="border-t border-gray-100 my-1" />
          {platformOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePlatformToggle(option.value)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                platforms.includes(option.value) && "bg-gray-50"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  platforms.includes(option.value)
                    ? "bg-[#6366f1] border-[#6366f1]"
                    : "border-gray-300"
                )}
              >
                {platforms.includes(option.value) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              {option.label}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Locations Dropdown (placeholder) */}
      <Dropdown
        trigger={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>Locations</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        }
        isOpen={openDropdown === "locations"}
        onOpenChange={(open) => setOpenDropdown(open ? "locations" : null)}
      >
        <div className="p-3 text-sm text-gray-500">
          Location filtering coming soon
        </div>
      </Dropdown>

      {/* Filter by Brand Dropdown */}
      <Dropdown
        trigger={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-4 h-4 text-gray-500" />
            <span>
              {selectedBrands.length === 0
                ? "Filter by Brand"
                : `${selectedBrands.length} Selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        }
        isOpen={openDropdown === "competitors"}
        onOpenChange={(open) => {
          setOpenDropdown(open ? "competitors" : null);
          if (!open) setBrandSearch("");
        }}
        width="w-96"
      >
        <div className="p-3">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
            />
          </div>

          {/* Brand Grid */}
          <div className="max-h-64 overflow-y-auto">
            {filteredBrands.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                No brands found
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand.name}
                    onClick={() => handleBrandToggle(brand.name)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      selectedBrands.includes(brand.name)
                        ? "bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1]"
                        : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <BrandLogo name={brand.name} domain={brand.domain} />
                    <span className="whitespace-nowrap">{brand.name}</span>
                    {selectedBrands.includes(brand.name) && (
                      <Check className="w-3 h-3 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBrands.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-3" />
              <button
                onClick={() => onBrandsChange([])}
                className="w-full text-center text-xs text-[#6366f1] hover:text-[#4f46e5] py-1"
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      </Dropdown>
    </div>
  );
}

// Simple dropdown component
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  width?: string;
}

function Dropdown({
  trigger,
  children,
  isOpen,
  onOpenChange,
  width = "w-48",
}: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => onOpenChange(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50",
            width
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
