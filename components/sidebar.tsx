"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft,
  PanelRight,
  FileText,
  BarChart3,
  Database,
  User,
  LogOut,
  ChevronUp,
  AtSign,
  Eye,
} from "lucide-react";
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

type NavSection =
  | "prompts"
  | "visibility"
  | "mentions"
  | "analytics"
  | "sources";

const navItems = [
  { id: "prompts" as const, label: "Prompts", icon: FileText },
  { id: "visibility" as const, label: "Visibility", icon: Eye },
  { id: "mentions" as const, label: "Mentions", icon: AtSign },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  { id: "sources" as const, label: "Sources", icon: Database },
];

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = useSession();

  const user = session?.user ?? {
    name: "User",
    email: "",
    image: null,
  };

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
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-default group"
                >
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="w-5 h-5 object-contain group-hover:hidden"
                  />
                  <PanelRight className="h-5 w-5 text-gray-600 hidden group-hover:block" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs px-2 py-1">
                Open sidebar
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Collapsed navigation */}
          <nav className="flex-1 py-4 px-1.5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center justify-center p-2.5 rounded-lg transition-colors cursor-pointer",
                        isActive
                          ? "bg-[#ececec] text-gray-900"
                          : "text-gray-600 hover:bg-[#ececec] hover:text-gray-900"
                      )}
                    >
                      <Icon className="h-5 w-5" />
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
                className="w-56 mb-2"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
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
          {/* Expanded header */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-gray-200">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <span className="font-semibold text-gray-900 text-sm">
                GEO Analytics
              </span>
            </div>

            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors cursor-default group"
                >
                  <PanelLeft className="h-5 w-5 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs px-2 py-1">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Expanded navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-[#ececec] text-gray-900"
                      : "text-gray-600 hover:bg-[#ececec] hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Expanded profile */}
          <div className="border-t border-gray-200 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors cursor-pointer">
                  <Avatar className="h-7 w-7 border border-gray-200 flex-shrink-0">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 mb-2"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export type { NavSection };
