"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ============================================
// Types
// ============================================

export type OnboardingStep =
  | "email"
  | "signin"
  | "company"
  | "account"
  | "verify"
  | "brand"
  | "analysis"
  | "daily-prompts"
  | "topics"
  | "prompts";

export interface TopicSuggestion {
  name: string;
  description: string;
}

export interface GeneratedPrompt {
  id: string;
  text: string;
}

export interface TopicWithPrompts {
  name: string;
  description: string;
  prompts: GeneratedPrompt[];
  isExpanded: boolean;
}

export interface AnalysisResult {
  brandName: string;
  domain: string;
  industry: string;
  visibilityScore: number;
  rank: number | null;
  competitors: { name: string; domain: string | null; mentionCount: number }[];
  totalMentions: number;
  totalPrompts: number;
  topics: TopicSuggestion[];
  warning?: string; // Partial failure warning
}

export const COMPANY_SIZES = [
  "1-10 employees",
  "11-100 employees",
  "101-500 employees",
  "501-1000 employees",
  "1001+ employees",
] as const;

export const ANALYSIS_MESSAGES = [
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

// Step order for navigation and persistence
const STEP_ORDER: OnboardingStep[] = [
  "email",
  "signin",
  "company",
  "account",
  "verify",
  "brand",
  "analysis",
  "daily-prompts",
  "topics",
  "prompts",
];

// Steps that can be restored from localStorage (post-auth)
const RESTORABLE_STEPS: OnboardingStep[] = [
  "brand",
  "analysis",
  "daily-prompts",
  "topics",
  "prompts",
];

// ============================================
// Context Interface
// ============================================

interface OnboardingContextType {
  // Current step
  currentStep: OnboardingStep;
  direction: "left" | "right";
  goToStep: (step: OnboardingStep, dir: "left" | "right") => void;
  goBack: () => void;

  // Loading & Error
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Form data - Email/Auth
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;

  // Form data - Account
  firstName: string;
  setFirstName: (name: string) => void;
  lastName: string;
  setLastName: (name: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;

  // Form data - Company
  companySize: string | null;
  setCompanySize: (size: string | null) => void;
  isAgency: boolean;
  setIsAgency: (isAgency: boolean) => void;

  // OTP
  otp: string[];
  setOtp: (otp: string[]) => void;
  resendTimer: number;
  setResendTimer: (timer: number) => void;
  canResend: boolean;
  setCanResend: (canResend: boolean) => void;

  // Brand
  website: string;
  setWebsite: (website: string) => void;
  brandDescription: string;
  setBrandDescription: (desc: string) => void;
  websiteError: string | null;
  setWebsiteError: (error: string | null) => void;
  isValidatingDomain: boolean;
  setIsValidatingDomain: (validating: boolean) => void;
  cleanedWebsite: string;

  // Analysis
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  analysisError: string | null;
  setAnalysisError: (error: string | null) => void;
  analysisMessageIndex: number;
  setAnalysisMessageIndex: Dispatch<SetStateAction<number>>;

  // Topics
  selectedTopics: Set<string>;
  setSelectedTopics: (topics: Set<string>) => void;
  customTopics: TopicSuggestion[];
  setCustomTopics: (topics: TopicSuggestion[]) => void;
  isAddingCustomTopic: boolean;
  setIsAddingCustomTopic: (adding: boolean) => void;
  customTopicInput: string;
  setCustomTopicInput: (input: string) => void;

  // Prompts
  topicsWithPrompts: TopicWithPrompts[];
  setTopicsWithPrompts: (topics: TopicWithPrompts[]) => void;
  isGeneratingPrompts: boolean;
  setIsGeneratingPrompts: (generating: boolean) => void;
  isSubmittingPrompts: boolean;
  setIsSubmittingPrompts: (submitting: boolean) => void;
  submitError: string | null;
  setSubmitError: (error: string | null) => void;
  showSubmitModal: boolean;
  setShowSubmitModal: (show: boolean) => void;

  // Prompt editing state
  editingPromptId: string | null;
  setEditingPromptId: (id: string | null) => void;
  editingPromptText: string;
  setEditingPromptText: (text: string) => void;
  addingPromptToTopic: string | null;
  setAddingPromptToTopic: (topic: string | null) => void;
  newPromptText: string;
  setNewPromptText: (text: string) => void;
  showAddPromptDropdown: boolean;
  setShowAddPromptDropdown: (show: boolean) => void;
  isAddingNewTopic: boolean;
  setIsAddingNewTopic: (adding: boolean) => void;
  newTopicName: string;
  setNewTopicName: (name: string) => void;
  editingTopicName: string | null;
  setEditingTopicName: (name: string | null) => void;
  editingTopicNameText: string;
  setEditingTopicNameText: (text: string) => void;
  openTopicMenu: string | null;
  setOpenTopicMenu: (topic: string | null) => void;

  // Computed values
  totalPromptCount: number;

  // Helpers
  resetForm: () => void;
  generatePromptId: () => string;

  // Router
  router: ReturnType<typeof useRouter>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

// ============================================
// Provider
// ============================================

const STORAGE_KEY = "onboarding_progress";

interface StoredProgress {
  step: OnboardingStep;
  website?: string;
  brandDescription?: string;
  analysisResult?: AnalysisResult;
  selectedTopics?: string[];
  customTopics?: TopicSuggestion[];
  topicsWithPrompts?: TopicWithPrompts[];
}

// Compute initial state from URL params and localStorage (runs once on mount)
function getInitialState(searchParams: URLSearchParams) {
  const stepParam = searchParams.get("step") as OnboardingStep | null;

  // Default initial state
  const defaults = {
    currentStep: "email" as OnboardingStep,
    website: "",
    brandDescription: "",
    analysisResult: null as AnalysisResult | null,
    selectedTopics: new Set<string>(),
    customTopics: [] as TopicSuggestion[],
    topicsWithPrompts: [] as TopicWithPrompts[],
  };

  // Only run on client
  if (typeof window === "undefined") return defaults;

  // Check URL param first
  if (stepParam && STEP_ORDER.includes(stepParam)) {
    if (RESTORABLE_STEPS.includes(stepParam)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const progress: StoredProgress = JSON.parse(stored);
          return {
            currentStep: stepParam,
            website: progress.website ?? "",
            brandDescription: progress.brandDescription ?? "",
            analysisResult: progress.analysisResult ?? null,
            selectedTopics: new Set(progress.selectedTopics ?? []),
            customTopics: progress.customTopics ?? [],
            topicsWithPrompts: progress.topicsWithPrompts ?? [],
          };
        } catch {
          // Invalid stored data, use defaults
        }
      }
    } else {
      return { ...defaults, currentStep: stepParam };
    }
  }

  // Check localStorage for last step
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const progress: StoredProgress = JSON.parse(stored);
      if (RESTORABLE_STEPS.includes(progress.step)) {
        // Update URL without triggering navigation
        window.history.replaceState(
          null,
          "",
          `/onboarding?step=${progress.step}`
        );
        return {
          currentStep: progress.step,
          website: progress.website ?? "",
          brandDescription: progress.brandDescription ?? "",
          analysisResult: progress.analysisResult ?? null,
          selectedTopics: new Set(progress.selectedTopics ?? []),
          customTopics: progress.customTopics ?? [],
          topicsWithPrompts: progress.topicsWithPrompts ?? [],
        };
      }
    } catch {
      // Invalid stored data, use defaults
    }
  }

  return defaults;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Compute initial state once using lazy initialization
  const [initialState] = useState(() => getInitialState(searchParams));

  // Step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    initialState.currentStep
  );
  const [direction, setDirection] = useState<"left" | "right">("right");

  // Loading/Error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email/Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Company
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [isAgency, setIsAgency] = useState(false);

  // OTP
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Brand
  const [website, setWebsite] = useState(initialState.website);
  const [brandDescription, setBrandDescription] = useState(
    initialState.brandDescription
  );
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isValidatingDomain, setIsValidatingDomain] = useState(false);

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    initialState.analysisResult
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMessageIndex, setAnalysisMessageIndex] = useState(0);

  // Topics
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    initialState.selectedTopics
  );
  const [customTopics, setCustomTopics] = useState<TopicSuggestion[]>(
    initialState.customTopics
  );
  const [isAddingCustomTopic, setIsAddingCustomTopic] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState("");

  // Prompts
  const [topicsWithPrompts, setTopicsWithPrompts] = useState<
    TopicWithPrompts[]
  >(initialState.topicsWithPrompts);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isSubmittingPrompts, setIsSubmittingPrompts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Prompt editing
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState("");
  const [addingPromptToTopic, setAddingPromptToTopic] = useState<string | null>(
    null
  );
  const [newPromptText, setNewPromptText] = useState("");
  const [showAddPromptDropdown, setShowAddPromptDropdown] = useState(false);
  const [isAddingNewTopic, setIsAddingNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [editingTopicName, setEditingTopicName] = useState<string | null>(null);
  const [editingTopicNameText, setEditingTopicNameText] = useState("");
  const [openTopicMenu, setOpenTopicMenu] = useState<string | null>(null);

  // Computed values
  const cleanedWebsite = website
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  const totalPromptCount = topicsWithPrompts.reduce(
    (acc, topic) => acc + topic.prompts.length,
    0
  );

  // Save progress to localStorage when on restorable steps
  useEffect(() => {
    if (RESTORABLE_STEPS.includes(currentStep)) {
      const progress: StoredProgress = {
        step: currentStep,
        website,
        brandDescription,
        analysisResult: analysisResult ?? undefined,
        selectedTopics: Array.from(selectedTopics),
        customTopics,
        topicsWithPrompts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [
    currentStep,
    website,
    brandDescription,
    analysisResult,
    selectedTopics,
    customTopics,
    topicsWithPrompts,
  ]);

  // Wrapper for setAnalysisResult that also pre-selects first 5 topics
  const handleSetAnalysisResult = useCallback(
    (result: AnalysisResult | null) => {
      setAnalysisResult(result);
      if (result?.topics && result.topics.length > 0) {
        const initialTopics = new Set(
          result.topics.slice(0, 5).map((t) => t.name)
        );
        setSelectedTopics(initialTopics);
      }
    },
    []
  );

  // Step navigation with history
  const goToStep = useCallback(
    (newStep: OnboardingStep, dir: "left" | "right") => {
      setDirection(dir);
      setCurrentStep(newStep);
      setError(null);
      setWebsiteError(null);

      // Update URL with history entry
      window.history.pushState(null, "", `/onboarding?step=${newStep}`);
    },
    []
  );

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step") as OnboardingStep | null;
      if (stepParam && STEP_ORDER.includes(stepParam)) {
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        const newIndex = STEP_ORDER.indexOf(stepParam);
        setDirection(newIndex < currentIndex ? "left" : "right");
        setCurrentStep(stepParam);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentStep]);

  const goBack = useCallback(() => {
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
    }
    // Cannot go back from brand step - user can use "Wrong account?" instead
  }, [currentStep, goToStep]);

  const resetForm = useCallback(() => {
    // Clear stored progress
    localStorage.removeItem(STORAGE_KEY);
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
    setAnalysisResult(null);
    setSelectedTopics(new Set());
    setCustomTopics([]);
    setTopicsWithPrompts([]);

    goToStep("email", "left");
  }, [goToStep]);

  const generatePromptId = useCallback(() => {
    return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const value: OnboardingContextType = {
    // Step
    currentStep,
    direction,
    goToStep,
    goBack,

    // Loading/Error
    isLoading,
    setIsLoading,
    error,
    setError,

    // Email/Auth
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,

    // Account
    firstName,
    setFirstName,
    lastName,
    setLastName,
    termsAccepted,
    setTermsAccepted,

    // Company
    companySize,
    setCompanySize,
    isAgency,
    setIsAgency,

    // OTP
    otp,
    setOtp,
    resendTimer,
    setResendTimer,
    canResend,
    setCanResend,

    // Brand
    website,
    setWebsite,
    brandDescription,
    setBrandDescription,
    websiteError,
    setWebsiteError,
    isValidatingDomain,
    setIsValidatingDomain,
    cleanedWebsite,

    // Analysis
    isAnalyzing,
    setIsAnalyzing,
    analysisResult,
    setAnalysisResult: handleSetAnalysisResult,
    analysisError,
    setAnalysisError,
    analysisMessageIndex,
    setAnalysisMessageIndex,

    // Topics
    selectedTopics,
    setSelectedTopics,
    customTopics,
    setCustomTopics,
    isAddingCustomTopic,
    setIsAddingCustomTopic,
    customTopicInput,
    setCustomTopicInput,

    // Prompts
    topicsWithPrompts,
    setTopicsWithPrompts,
    isGeneratingPrompts,
    setIsGeneratingPrompts,
    isSubmittingPrompts,
    setIsSubmittingPrompts,
    submitError,
    setSubmitError,
    showSubmitModal,
    setShowSubmitModal,

    // Prompt editing
    editingPromptId,
    setEditingPromptId,
    editingPromptText,
    setEditingPromptText,
    addingPromptToTopic,
    setAddingPromptToTopic,
    newPromptText,
    setNewPromptText,
    showAddPromptDropdown,
    setShowAddPromptDropdown,
    isAddingNewTopic,
    setIsAddingNewTopic,
    newTopicName,
    setNewTopicName,
    editingTopicName,
    setEditingTopicName,
    editingTopicNameText,
    setEditingTopicNameText,
    openTopicMenu,
    setOpenTopicMenu,

    // Computed
    totalPromptCount,

    // Helpers
    resetForm,
    generatePromptId,

    // Router
    router,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
