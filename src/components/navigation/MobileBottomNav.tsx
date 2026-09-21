import React from "react";
import { User } from "../../types";
import {
  Home,
  Briefcase,
  Compass,
  Video,
  User as UserIcon,
} from "lucide-react";

interface MobileBottomNavProps {
  user: User | null;
  activeTab: "score" | "jobs" | "roadmap" | "interview";
  setActiveTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
  onOpenProfile: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenProfile,
}) => {
  if (!user) return null;

  const navItems = [
    {
      id: "score" as const,
      label: "Dashboard",
      icon: Home,
      action: () => setActiveTab("score"),
      isActive: activeTab === "score",
    },
    {
      id: "jobs" as const,
      label: "Job Roles",
      icon: Briefcase,
      action: () => setActiveTab("jobs"),
      isActive: activeTab === "jobs",
    },
    {
      id: "roadmap" as const,
      label: "Roadmap",
      icon: Compass,
      action: () => setActiveTab("roadmap"),
      isActive: activeTab === "roadmap",
    },
    {
      id: "interview" as const,
      label: "Interview",
      icon: Video,
      action: () => setActiveTab("interview"),
      isActive: activeTab === "interview",
    },
    {
      id: "profile" as const,
      label: "Profile",
      icon: UserIcon,
      action: onOpenProfile,
      isActive: false,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg lg:hidden px-3 py-2 pb-safe"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={item.action}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all ${
                item.isActive
                  ? "text-[#2F54EB] font-bold"
                  : "text-slate-400 hover:text-slate-700 font-medium"
              }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 rounded-lg transition-transform ${
                  item.isActive ? "scale-105" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    item.isActive ? "text-[#2F54EB]" : "text-slate-400"
                  }`}
                />
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  item.isActive ? "text-[#2F54EB] font-bold" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
