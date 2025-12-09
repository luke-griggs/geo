"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Building2,
  Globe,
  Users,
  Zap,
  CircleArrowUp,
  Plus,
  UserPlus,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSession,
  changePassword,
  changeEmail,
  updateUser,
} from "@/lib/auth-client";

type SettingsTab =
  | "profile"
  | "organization"
  | "domains"
  | "team"
  | "integrations";

const settingsTabs = [
  { id: "profile" as const, label: "Profile", icon: User, section: "USER" },
  {
    id: "organization" as const,
    label: "Organization",
    icon: Building2,
    section: "WORKSPACE",
  },
  {
    id: "domains" as const,
    label: "Domains",
    icon: Globe,
    section: "WORKSPACE",
  },
  { id: "team" as const, label: "Team", icon: Users, section: "WORKSPACE" },
  {
    id: "integrations" as const,
    label: "Integrations",
    icon: Zap,
    section: "WORKSPACE",
  },
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

// Activity tracker component (placeholder for now)
function ActivityTracker() {
  // Generate placeholder activity data
  const months = [
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = ["Mon", "", "Wed", "", "Fri"];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 text-xs text-gray-500">
          {months.map((month, i) => (
            <span key={i} className="w-8">
              {month}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 text-xs text-gray-500 mr-2">
          {days.map((day, i) => (
            <div key={i} className="h-3 flex items-center">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-[repeat(53,1fr)] gap-0.5">
            {Array.from({ length: 53 * 5 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm bg-gray-100" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 px-4 py-3 rounded-lg text-center">
              <p className="text-sm text-gray-600 flex items-center gap-1">
                Create content, fix issues, or implement quick wins
                <span className="text-gray-400 cursor-help">ⓘ</span>
              </p>
              <button className="mt-2 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                Take Action
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          Learn how we track activities
          <span className="text-gray-400 cursor-help">ⓘ</span>
        </span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-100" />
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-200" />
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-300" />
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// Change Email Modal
function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string | null;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!newEmail || !confirmEmail || !currentPassword) {
      setError("All fields are required");
      return;
    }

    if (newEmail !== confirmEmail) {
      setError("Email addresses do not match");
      return;
    }

    if (newEmail === currentEmail) {
      setError("New email must be different from current email");
      return;
    }

    setIsLoading(true);
    try {
      const result = await changeEmail({
        newEmail,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(result.error.message || "Failed to change email");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
          setNewEmail("");
          setConfirmEmail("");
          setCurrentPassword("");
          setSuccess(false);
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setNewEmail("");
    setConfirmEmail("");
    setCurrentPassword("");
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Change Email
            </DialogTitle>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Email updated successfully!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Confirm New Email
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Confirm new email address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  We need your password to confirm this change
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#8B7355] rounded-lg hover:bg-[#7A6349] transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Changing..." : "Change Email"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Change Password Modal
function ChangePasswordModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!oldPassword || !newPassword || !repeatPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        revokeOtherSessions: logoutOtherDevices,
      });

      if (result.error) {
        setError(result.error.message || "Failed to change password");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
          setOldPassword("");
          setNewPassword("");
          setRepeatPassword("");
          setSuccess(false);
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setOldPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Change Password
            </DialogTitle>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Password changed successfully!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Old Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Repeat New Password
                </label>
                <div className="relative">
                  <input
                    type={showRepeatPassword ? "text" : "password"}
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showRepeatPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setLogoutOtherDevices(!logoutOtherDevices)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    logoutOtherDevices
                      ? "bg-[#A0522D] border-[#A0522D]"
                      : "border-gray-300 bg-white"
                  )}
                >
                  {logoutOtherDevices && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
                <label className="text-sm text-gray-700">
                  Log out of all other devices
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#8B7355] rounded-lg hover:bg-[#7A6349] transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Profile Tab Content
function ProfileTab({
  user,
  onRefresh,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  onRefresh?: () => void;
}) {
  const nameParts = user.name?.split(" ") || ["", ""];
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = async () => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) return;

    setIsSaving(true);
    try {
      await updateUser({ name: fullName });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onRefresh?.();
    } catch {
      // Handle error silently for now
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div>
        <label className="text-sm text-gray-500 block mb-2">Avatar</label>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-gray-200">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-pink-300 to-purple-300 text-white text-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Upload image
          </button>
        </div>
      </div>

      {/* Name Section */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-500 block mb-2">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-2">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Account Security */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Account Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-gray-500 block">Email</label>
              <p className="text-sm text-gray-900">{user.email}</p>
            </div>
            <button
              onClick={() => setChangeEmailOpen(true)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Change email
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-gray-500 block">Password</label>
              <p className="text-sm text-gray-900">••••••••</p>
            </div>
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Change password
            </button>
          </div>
        </div>
      </div>

      {/* Activity Tracker */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Activity Tracker</h3>
        <ActivityTracker />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveProfile}
        disabled={isSaving}
        className="px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {isSaving ? (
          "Saving..."
        ) : saveSuccess ? (
          <>
            <Check className="h-4 w-4" />
            Saved!
          </>
        ) : (
          "Save changes"
        )}
      </button>

      {/* Change Email Modal */}
      <ChangeEmailModal
        open={changeEmailOpen}
        onOpenChange={setChangeEmailOpen}
        currentEmail={user.email}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}

// Organization Tab Content
function OrganizationTab() {
  return (
    <div className="space-y-8">
      {/* Icon Section */}
      <div>
        <label className="text-sm text-gray-500 block mb-2">Icon</label>
        <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center text-2xl font-semibold text-gray-700 bg-gray-50">
          B
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Upload an image to represent your workspace. JPG, PNG, GIF, or WebP up
          to 5MB.
        </p>
      </div>

      {/* Name Section */}
      <div>
        <label className="text-sm text-gray-500 block mb-2">Name</label>
        <input
          type="text"
          defaultValue="Badgespot"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <p className="text-xs text-gray-500 mt-2">
          You can use your organization or company name. Keep it simple.
        </p>
      </div>

      {/* Switch Organization */}
      <div>
        <label className="text-sm text-gray-500 block mb-2">
          Switch Organization
        </label>
        <Select defaultValue="badgespot">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="badgespot">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                  B
                </span>
                Badgespot
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Organization Stats */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Organization Stats</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500">Your role</p>
            <p className="font-medium text-gray-900">Owner</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Plan</p>
            <p className="font-medium text-gray-900">Pro</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Projects</p>
            <p className="font-medium text-gray-900">2 / Unlimited</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Members</p>
            <p className="font-medium text-gray-900">1 / Unlimited</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Domains Tab Content
function DomainsTab() {
  const domains = [
    {
      name: "cal.com",
      domain: "cal.com",
      organization: "Badgespot",
      isCurrent: true,
    },
    {
      name: "Badgespot",
      domain: "badgespot.com",
      organization: "Badgespot",
      isCurrent: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">All Domains</h3>
        <p className="text-sm text-gray-500">
          View and manage all domains across your workspaces. Click on a domain
          to edit its settings.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Domain
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Organization
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {domains.map((domain, i) => (
              <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain.domain}&sz=32`}
                        alt=""
                        className="w-5 h-5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {domain.name}
                      </p>
                      <p className="text-xs text-gray-500">{domain.domain}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {domain.organization}
                </td>
                <td className="px-4 py-3">
                  {domain.isCurrent ? (
                    <span className="inline-flex px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                      Current
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td colSpan={3} className="px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Plus className="w-4 h-4" />
                  Add new domain
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Team Tab Content
function TeamTab({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  return (
    <div className="space-y-6">
      {/* Organization Select */}
      <div>
        <label className="text-sm text-gray-500 block mb-2">Organization</label>
        <Select defaultValue="badgespot">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="badgespot">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                  B
                </span>
                Badgespot
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">Team members</h3>
            <p className="text-sm text-gray-500">
              Manage team access to your domains. Assign members to specific
              domains or give them organization-wide access.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <UserPlus className="w-4 h-4" />
            Invite people
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Domains
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-gray-200">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-300 to-purple-300 text-white text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <span className="inline-flex px-1.5 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">
                          You
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                    All domains
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                    Owner
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">
          Pending invitations
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Track invites you&apos;ve sent and resend or revoke them if needed.
        </p>
        <div className="text-center py-8 text-sm text-gray-500">
          No pending invitations
        </div>
      </div>
    </div>
  );
}

// Integrations Tab Content (placeholder)
function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Integrations</h3>
        <p className="text-sm text-gray-500">
          Connect your favorite tools and services.
        </p>
      </div>
      <div className="text-center py-12 text-sm text-gray-500">
        No integrations available yet.
      </div>
    </div>
  );
}

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsModal({
  open,
  onOpenChange,
}: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { data: session } = useSession();

  const user = session?.user ?? {
    name: "User",
    email: "",
    image: null,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab user={user} />;
      case "organization":
        return <OrganizationTab />;
      case "domains":
        return <DomainsTab />;
      case "team":
        return <TeamTab user={user} />;
      case "integrations":
        return <IntegrationsTab />;
      default:
        return null;
    }
  };

  // Group tabs by section
  const userTabs = settingsTabs.filter((t) => t.section === "USER");
  const workspaceTabs = settingsTabs.filter((t) => t.section === "WORKSPACE");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-h-[80vh] overflow-hidden max-w-5xl">
        <DialogTitle className="sr-only">Account Settings</DialogTitle>
        <div className="flex h-[85vh]">
          {/* Sidebar */}
          <div className="w-56 bg-[#faf9f7] border-r border-gray-200 p-4 flex flex-col">
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900">Account</h2>
              <p className="text-sm text-gray-500">Manage your account info.</p>
            </div>

            {/* User section */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                User
              </p>
              <nav className="space-y-1">
                {userTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-[#f0efed] text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-[#f0efed] hover:text-gray-900"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Workspace section */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                Workspace
              </p>
              <nav className="space-y-1">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-[#f0efed] text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-[#f0efed] hover:text-gray-900"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Upgrade button */}
            <div className="mt-auto">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-orange-600 text-sm font-medium hover:bg-orange-50 rounded-lg transition-colors">
                <CircleArrowUp className="w-4 h-4" />
                Upgrade plan
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Tab title */}
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {settingsTabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <div className="border-b border-gray-200 mb-6" />

              {/* Tab content */}
              {renderTabContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
