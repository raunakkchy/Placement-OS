import React from "react";
import { User, ReadinessScore } from "../types";
import {
  GraduationCap,
  Briefcase,
  Map,
  Video,
  BarChart3,
  User as UserIcon,
  LogOut,
  FileText,
  Sparkles,
  UserPlus,
  LogIn,
  Settings,
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  readinessScore: ReadinessScore | null;
  activeTab: "score" | "jobs" | "roadmap" | "interview";
  setActiveTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onOpenAuth: (initialMode?: "login" | "register") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  readinessScore,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Placement<span className="text-indigo-600">OS</span>
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                AI Placement Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Continuous Student Evaluation & Campus Recruitment Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs (when logged in) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              id="nav-tab-score"
              onClick={() => setActiveTab("score")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "score"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-jobs"
              onClick={() => setActiveTab("jobs")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "jobs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              <span>Job Roles</span>
              {user.selectedRole && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                  Selected
                </span>
              )}
            </button>

            <button
              id="nav-tab-roadmap"
              onClick={() => setActiveTab("roadmap")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "roadmap"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Map className="h-3.5 w-3.5 text-emerald-600" />
              <span>Roadmap</span>
            </button>

            <button
              id="nav-tab-interview"
              onClick={() => setActiveTab("interview")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "interview"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Video className="h-3.5 w-3.5 text-rose-600" />
              <span>Mock Interview</span>
            </button>
          </nav>
        )}

        {/* User profile controls / Login button */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                id="btn-open-profile"
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs transition-colors hover:border-slate-300 hover:bg-slate-100"
                title="View & Edit Student Academic Profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white uppercase overflow-hidden">
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
                <div className="hidden sm:block">
                  <div className="font-semibold text-slate-900 leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {user.course} • CGPA {user.cgpa}
                  </div>
                </div>
              </button>

              <button
                id="btn-logout"
                onClick={onLogout}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* 1st Option: Register Student Account */}
              <button
                id="btn-nav-register"
                onClick={() => onOpenAuth("register")}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register Student Account</span>
              </button>

              {/* 2nd Option: Login */}
              <button
                id="btn-nav-login"
                onClick={() => onOpenAuth("login")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5 text-slate-600" />
                <span>Login</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sub-bar for tabs */}
      {user && (
        <div className="flex md:hidden border-t border-slate-200 bg-slate-50 px-2 py-1.5 overflow-x-auto">
          <div className="flex w-full justify-around gap-1">
            <button
              onClick={() => setActiveTab("score")}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium ${
                activeTab === "score" ? "text-indigo-600 font-bold" : "text-slate-600"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium ${
                activeTab === "jobs" ? "text-blue-600 font-bold" : "text-slate-600"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Job Roles</span>
            </button>
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium ${
                activeTab === "roadmap" ? "text-emerald-600 font-bold" : "text-slate-600"
              }`}
            >
              <Map className="h-4 w-4" />
              <span>Roadmap</span>
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium ${
                activeTab === "interview" ? "text-rose-600 font-bold" : "text-slate-600"
              }`}
            >
              <Video className="h-4 w-4" />
              <span>Mock Interview</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
