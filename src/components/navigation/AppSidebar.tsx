import React from "react";
import { User, ReadinessScore } from "../../types";
import {
  Home,
  Briefcase,
  Compass,
  Video,
  User as UserIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";

interface AppSidebarProps {
  user: User | null;
  readinessScore: ReadinessScore | null;
  activeTab: "score" | "jobs" | "roadmap" | "interview";
  setActiveTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onCloseMobileDrawer?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  readinessScore,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onLogout,
  onCloseMobileDrawer,
}) => {
  const handleNavClick = (tab: "score" | "jobs" | "roadmap" | "interview") => {
    setActiveTab(tab);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const handleProfileClick = () => {
    onOpenProfile();
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const navItems = [
    {
      id: "score" as const,
      label: "Dashboard",
      icon: Home,
    },
    {
      id: "jobs" as const,
      label: "Job Roles",
      icon: Briefcase,
    },
    {
      id: "roadmap" as const,
      label: "Roadmap",
      icon: Compass,
    },
    {
      id: "interview" as const,
      label: "Mock Interview",
      icon: Video,
    },
  ];

  return (
    <aside className="relative w-64 bg-gradient-to-b from-[#2E5BFF] via-[#2F54EB] to-[#1C3ED8] text-white flex flex-col justify-between h-full select-none overflow-hidden shadow-xl">
      {/* Organic background decorative elements matching reference */}
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 -right-16 w-56 h-56 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 left-0 w-44 h-44 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

      {/* Top Header & Brand */}
      <div className="relative z-10">
        <div className="p-6 pb-6">
          <div className="flex items-center gap-3">
            {/* Orange square logo with white P */}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF5A36] text-white font-black text-2xl shadow-md shrink-0">
              P
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
                Placement OS
              </h1>
              <p className="text-[11px] font-medium text-blue-100/90 tracking-tight mt-0.5">
                Your Career, Systemized.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation items matching Reference 1 */}
        <nav className="px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all group ${
                  isActive
                    ? "bg-white/20 text-white font-bold backdrop-blur-md shadow-sm border border-white/15"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`h-5 w-5 transition-transform group-hover:scale-105 ${
                      isActive ? "text-white" : "text-white/80 group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          {/* Profile Tab in Navigation */}
          <button
            id="sidebar-nav-profile"
            onClick={handleProfileClick}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <UserIcon className="h-5 w-5 text-white/80 group-hover:text-white group-hover:scale-105 transition-transform" />
              <span>Profile</span>
            </div>
          </button>
        </nav>
      </div>

      {/* User Card at Footer matching Reference 1 */}
      <div className="relative z-10 p-4 m-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3 text-left min-w-0 flex-1 group"
              title="View Profile Details"
            >
              <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ring-2 ring-white/30">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  user.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate group-hover:text-blue-100 transition-colors">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-blue-200/90 truncate">
                  {user.course || "Diploma"} • {user.branch || "CSE"}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
            </button>

            <button
              id="sidebar-btn-logout"
              onClick={onLogout}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all shrink-0"
              title="Sign out of Placement OS"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-white/80 text-center py-1">Guest Student</div>
        )}
      </div>
    </aside>
  );
};
