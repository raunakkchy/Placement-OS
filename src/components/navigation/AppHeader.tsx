import React, { useState } from "react";
import { User, ReadinessScore } from "../../types";
import {
  Search,
  Bell,
  ChevronDown,
  LogIn,
  UserPlus,
} from "lucide-react";

interface AppHeaderProps {
  user: User | null;
  readinessScore: ReadinessScore | null;
  activeTab: "score" | "jobs" | "roadmap" | "interview";
  onToggleSidebar?: () => void;
  onOpenProfile: () => void;
  onOpenAuth: (mode?: "login" | "register") => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onOpenProfile,
  onOpenAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 h-16 sm:h-20 bg-[#F4F6FB]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between transition-colors">
      {/* Mobile Top Branding matching Mobile Reference 2 */}
      <div className="flex items-center gap-2.5 lg:hidden min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A36] text-white font-black text-xl shadow-xs shrink-0">
          P
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight truncate">
            Placement OS
          </h1>
          <p className="text-[10px] font-medium text-slate-500 tracking-tight truncate">
            Your Career, Systemized.
          </p>
        </div>
      </div>

      {/* Desktop Search Bar matching Desktop Reference 1 */}
      <div className="hidden lg:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="desktop-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F54EB]/20 focus:border-[#2F54EB] shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Right Side Controls matching both Desktop Reference 1 & Mobile Reference 2 */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {user ? (
          <>
            {/* Mobile Search Button */}
            <button
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200/80 text-slate-600 shadow-2xs"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notification Bell with Dot */}
            <button
              id="btn-header-notifications"
              className="relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Notifications"
            >
              <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FF5A36] ring-2 ring-white"></span>
            </button>

            {/* User Profile Trigger matching Desktop & Mobile Reference */}
            <button
              id="btn-header-profile"
              onClick={onOpenProfile}
              className="flex items-center gap-2 rounded-full hover:bg-white/80 p-1 sm:pr-2.5 transition-all group"
              title="Open Profile"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase overflow-hidden ring-2 ring-white shadow-2xs shrink-0">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  user.fullName.charAt(0)
                )}
              </div>
              <span className="hidden sm:inline font-bold text-xs text-slate-800 group-hover:text-slate-900 truncate max-w-[130px]">
                {user.fullName}
              </span>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-500 group-hover:text-slate-800" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth("register")}
              className="flex items-center gap-1.5 rounded-full bg-[#FF5A36] hover:bg-[#e04825] text-white px-4 py-2 text-xs font-bold transition-colors shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register</span>
            </button>
            <button
              onClick={() => onOpenAuth("login")}
              className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors shadow-2xs"
            >
              <LogIn className="h-3.5 w-3.5 text-slate-600" />
              <span>Login</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
