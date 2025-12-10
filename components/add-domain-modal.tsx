"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onDomainAdded?: (domain: {
    id: string;
    domain: string;
    name: string | null;
  }) => void;
}

type Step = "domain" | "location";

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

  // Reset state when domain changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [domain]);

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

// Location suggestion interface
interface LocationSuggestion {
  name: string;
  region: string;
  country: string;
  displayName: string;
}

// Nominatim API response item
interface NominatimResult {
  name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
    country?: string;
  };
}

export function AddDomainModal({
  open,
  onOpenChange,
  organizationId,
  onDomainAdded,
}: AddDomainModalProps) {
  const [step, setStep] = useState<Step>("domain");
  const [domainInput, setDomainInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Clean domain input to get favicon
  const cleanedDomain = domainInput
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  // Check if domain looks valid (has at least 2 characters after the last dot)
  const lastDotIndex = cleanedDomain.lastIndexOf(".");
  const hasValidTLD =
    lastDotIndex > 0 && cleanedDomain.length - lastDotIndex > 2;
  const isValidDomain = hasValidTLD;

  // Auto-populate display name when domain becomes valid (without TLD)
  useEffect(() => {
    if (isValidDomain && cleanedDomain && !displayName) {
      // Extract domain name without TLD (e.g., "google.com" -> "google")
      const domainName = cleanedDomain.substring(
        0,
        cleanedDomain.lastIndexOf(".")
      );
      setDisplayName(domainName);
    }
  }, [isValidDomain]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep("domain");
      setDomainInput("");
      setDisplayName("");
      setDescription("");
      setLocation("");
      setLocationSuggestions([]);
    }
  }, [open]);

  // Fetch location suggestions
  useEffect(() => {
    const fetchLocations = async () => {
      if (location.length < 2) {
        setLocationSuggestions([]);
        return;
      }

      setIsLoadingLocations(true);
      try {
        // Using a simple geocoding approach - in production you'd use a proper API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            location
          )}&limit=5&addressdetails=1`
        );
        const data = await response.json();

        const suggestions: LocationSuggestion[] = data.map(
          (item: NominatimResult) => ({
            name:
              item.address?.city ||
              item.address?.town ||
              item.address?.village ||
              item.name,
            region: item.address?.state || item.address?.county || "",
            country: item.address?.country || "",
            displayName: [
              item.address?.city ||
                item.address?.town ||
                item.address?.village ||
                item.name,
              item.address?.state || item.address?.county,
              item.address?.country,
            ]
              .filter(Boolean)
              .join(", "),
          })
        );

        setLocationSuggestions(suggestions);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    const debounce = setTimeout(fetchLocations, 300);
    return () => clearTimeout(debounce);
  }, [location]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNext = () => {
    if (step === "domain" && isValidDomain) {
      setStep("location");
    }
  };

  const handleBack = () => {
    if (step === "location") {
      setStep("domain");
    }
  };

  const handleSubmit = async () => {
    if (!isValidDomain || !location.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/domains`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: cleanedDomain,
            name: displayName || cleanedDomain,
            description: description || undefined,
            location: location || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create domain");
      }

      const data = await response.json();
      onDomainAdded?.(data.domain);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating domain:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectLocation = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.displayName);
    setShowSuggestions(false);
  };

  const canProceedFromDomain = isValidDomain && displayName.trim();
  const canSubmit = location.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {step === "domain" ? "Add new domain" : "Location"}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {step === "domain"
              ? "Connect a website domain you want to track in Searchable."
              : "Tell us where your business is located."}
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === "domain" ? (
            <div className="space-y-5">
              {/* Website domain */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Website domain <span className="text-[#6366f1]">*</span>
                </label>
                <div className="relative">
                  {isValidDomain && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <DomainLogo domain={cleanedDomain} className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="example.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className={cn(
                      "w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all",
                      isValidDomain && "pl-10"
                    )}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Enter the domain you want to track (e.g. example.com/uk)
                </p>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  placeholder="My Website"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of this domain..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tell us about your business location to help us provide more
                relevant insights.
              </p>

              {/* Location input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Location <span className="text-[#6366f1]">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    placeholder="Enter your city or region"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                  />

                  {/* Location suggestions dropdown */}
                  {showSuggestions &&
                    (locationSuggestions.length > 0 || isLoadingLocations) && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                      >
                        {isLoadingLocations ? (
                          <div className="px-3 py-4 flex items-center justify-center text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm">Searching...</span>
                          </div>
                        ) : (
                          locationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => selectLocation(suggestion)}
                              className="w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <p className="font-medium text-sm text-gray-900">
                                {suggestion.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {[suggestion.region, suggestion.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Where is your business primarily located?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
          {step === "location" ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            {step === "domain" ? (
              <button
                onClick={handleNext}
                disabled={!canProceedFromDomain}
                className={cn(
                  "px-5 py-2 text-sm font-medium rounded-lg transition-colors",
                  canProceedFromDomain
                    ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className={cn(
                  "px-5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                  canSubmit && !isSubmitting
                    ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Domain
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
