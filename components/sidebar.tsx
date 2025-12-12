"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft,
  PanelRight,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  Search,
  LayoutGrid,
  BarChart3,
  Hash,
  Pencil,
  ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { AccountSettingsModal } from "@/components/account-settings-modal";
import { AddDomainModal } from "@/components/add-domain-modal";

type NavSection =
  | "overview"
  | "prompts"
  | "visibility"
  | "mentions"
  | "content";

interface Domain {
  id: string;
  domain: string;
  name: string | null;
}

// Analytics section items
const analyticsItems = [
  { id: "overview" as const, label: "Overview", icon: LayoutGrid },
  { id: "visibility" as const, label: "Visibility", icon: BarChart3 },
  { id: "mentions" as const, label: "Mentions", icon: Hash },
];

// Action section items
const actionItems = [
  { id: "content" as const, label: "Content", icon: Pencil },
  { id: "prompts" as const, label: "Prompts", icon: ClipboardList },
];

// All items combined for collapsed view
const allNavItems = [...analyticsItems, ...actionItems];

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Domain logo component with fallback
function DomainLogo({
  domain,
  name,
  className,
}: {
  domain: string;
  name?: string | null;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const displayName = name || domain;

  if (imgError) {
    return (
      <span
        className={cn(
          "w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0",
          className
        )}
      >
        {displayName.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className={cn("w-6 h-6 rounded flex-shrink-0", className)}
      onError={() => setImgError(true)}
    />
  );
}

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  organizationId?: string;
  domains?: Domain[];
  selectedDomainId?: string;
  onDomainChange?: (domainId: string) => void;
  onDomainAdded?: (domain: Domain) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  activeSection,
  onSectionChange,
  organizationId,
  domains = [],
  selectedDomainId,
  onDomainChange,
  onDomainAdded,
  onCollapsedChange,
}: SidebarProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    onCollapsedChange?.(!open);
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [domainSearch, setDomainSearch] = useState("");
  const { data: session } = useSession();

  const user = session?.user ?? {
    name: "User",
    email: "",
    image: null,
  };

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);
  const filteredDomains = domains.filter(
    (d) =>
      d.domain.toLowerCase().includes(domainSearch.toLowerCase()) ||
      (d.name && d.name.toLowerCase().includes(domainSearch.toLowerCase()))
  );

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-[#f9f9f9] border-r border-gray-200 transition-[width] duration-200 ease-out overflow-hidden",
          sidebarOpen ? "w-64" : "w-[52px]"
        )}
      >
        {/* Collapsed "tiny bar" - absolutely positioned, fades in when collapsed */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col transition-opacity duration-200",
            sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          {/* Collapsed header */}
          <div className="flex items-center justify-center h-14 border-b border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSidebarToggle(true)}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-default group"
                >
                  {selectedDomain ? (
                    <>
                      <DomainLogo
                        domain={selectedDomain.domain}
                        name={selectedDomain.name}
                        className="w-6 h-6 group-hover:hidden"
                      />
                      <PanelRight className="h-6 w-6 text-gray-600 hidden group-hover:block" />
                    </>
                  ) : (
                    <>
                      <img
                        src="/logo.svg"
                        alt="Logo"
                        className="w-6 h-6 object-contain group-hover:hidden"
                      />
                      <PanelRight className="h-6 w-6 text-gray-600 hidden group-hover:block" />
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs px-2 py-1">
                Open sidebar
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Collapsed navigation */}
          <nav className="flex-1 py-3 px-1.5 space-y-0.5">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "relative w-full flex items-center justify-center p-2.5 rounded-md transition-colors cursor-pointer",
                        isActive
                          ? "text-gray-900"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="collapsed-nav-indicator"
                          className="absolute inset-0 bg-gray-100 rounded-md"
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 40,
                          }}
                        />
                      )}
                      <Icon className="relative z-10 h-[18px] w-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs px-2 py-1">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Collapsed profile */}
          <div className="border-t border-gray-200 p-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <Avatar className="h-7 w-7 border border-gray-200">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                className="w-48 mb-2 p-1.5 shadow-lg rounded-xl border border-gray-200 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
              >
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                >
                  <Settings className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Manage account</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expanded content - always rendered, clips when sidebar shrinks */}
        <div
          className={cn(
            "h-full w-64 flex flex-col transition-opacity duration-200",
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Expanded header with domain selector */}
          <div className="flex items-center justify-between h-14 px-2.5 border-b border-gray-200">
            {/* Domain selector dropdown */}
            <DropdownMenu onOpenChange={(open) => !open && setDomainSearch("")}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-1 min-w-0">
                  {selectedDomain ? (
                    <DomainLogo
                      domain={selectedDomain.domain}
                      name={selectedDomain.name}
                      className="w-6 h-6"
                    />
                  ) : (
                    <img
                      src="/logo.svg"
                      alt="Logo"
                      className="w-6 h-6 object-contain flex-shrink-0"
                    />
                  )}
                  <span className="font-semibold text-gray-900 text-sm truncate">
                    {selectedDomain?.name ||
                      selectedDomain?.domain ||
                      "GEO Analytics"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="w-56 mt-1"
              >
                {/* Search */}
                {domains.length > 3 && (
                  <>
                    <div className="px-2 py-1.5">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={domainSearch}
                          onChange={(e) => setDomainSearch(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                        />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Domain list */}
                <div className="py-1">
                  <p className="px-2 py-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Your Domains
                  </p>
                  {filteredDomains.map((domain) => (
                    <DropdownMenuItem
                      key={domain.id}
                      onClick={() => onDomainChange?.(domain.id)}
                      className="cursor-pointer flex items-center gap-2.5 px-2 py-2"
                    >
                      <DomainLogo
                        domain={domain.domain}
                        name={domain.name}
                        className="w-5 h-5"
                      />
                      <span className="flex-1 truncate text-sm">
                        {domain.name || domain.domain}
                      </span>
                      {domain.id === selectedDomainId && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {filteredDomains.length === 0 && (
                    <p className="px-2 py-2 text-sm text-gray-500 text-center">
                      No domains found
                    </p>
                  )}
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setAddDomainOpen(true)}
                  className="cursor-pointer flex items-center gap-2.5 px-2 py-2"
                >
                  <Plus className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">Add new domain</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSidebarToggle(false)}
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors cursor-default group flex-shrink-0"
                >
                  <PanelLeft className="h-[18px] w-[18px] text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs px-2 py-1">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Expanded navigation */}
          <nav className="flex-1 py-3 px-2.5">
            {/* Analytics Section */}
            <div className="mb-1">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-400">
                Analytics
              </p>
              <div className="space-y-0.5">
                {analyticsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "relative w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "text-gray-900"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="expanded-nav-indicator"
                          className="absolute inset-0 bg-gray-100 rounded-md"
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 40,
                          }}
                        />
                      )}
                      <Icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" />
                      <span className="relative z-10 truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-4">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-400">
                Action
              </p>
              <div className="space-y-0.5">
                {actionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "relative w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "text-gray-900"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="expanded-nav-indicator"
                          className="absolute inset-0 bg-gray-100 rounded-md"
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 40,
                          }}
                        />
                      )}
                      <Icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" />
                      <span className="relative z-10 truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Expanded profile */}
          <div className="border-t border-gray-200 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors cursor-pointer">
                  <Avatar className="h-7 w-7 border border-gray-200 flex-shrink-0">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {user.name}
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-48 mb-2 p-1.5 shadow-lg rounded-xl border border-gray-200 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
              >
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                >
                  <Settings className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Manage account</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Add Domain Modal */}
      {organizationId && (
        <AddDomainModal
          open={addDomainOpen}
          onOpenChange={setAddDomainOpen}
          organizationId={organizationId}
          onDomainAdded={onDomainAdded}
        />
      )}
    </TooltipProvider>
  );
}

export type { NavSection, Domain };
