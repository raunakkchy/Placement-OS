import React, { useState, useEffect, useMemo } from "react";
import { User, ReadinessScore, DashboardData } from "../types";
import { getAuthHeaders } from "../services/auth";
import { useTimeBasedGreeting, formatRelativeTime } from "../utils/timeUtils";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Video,
  Map,
  BookOpen,
  FileText,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Calendar,
  User as UserIcon,
  Code2,
  ExternalLink,
  Target,
  Briefcase,
  Layers,
} from "lucide-react";

interface ScoreDashboardProps {
  user: User;
  score?: ReadinessScore | null;
  onRecalculate?: () => void;
  onNavigateTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
  onOpenProfile: () => void;
  isRecalculating?: boolean;
  dashboardData?: DashboardData | null;
  onRefreshDashboard?: () => void;
}

export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({
  user,
  score,
  onRecalculate,
  onNavigateTab,
  onOpenProfile,
  isRecalculating = false,
  dashboardData: initialDashboardData,
  onRefreshDashboard,
}) => {
  const [data, setData] = useState<DashboardData | null>(initialDashboardData || null);
  const [loading, setLoading] = useState<boolean>(!initialDashboardData);
  const [performanceRange, setPerformanceRange] = useState("Last 6 Months");

  // Sync when initialDashboardData changes from parent
  useEffect(() => {
    if (initialDashboardData) {
      setData(initialDashboardData);
      setLoading(false);
    }
  }, [initialDashboardData]);

  // Fetch /api/dashboard data
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard", {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err: any) {
      console.warn("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialDashboardData) {
      fetchDashboard();
    }
  }, [user.id, user.selectedRole]);

  // Real or computed scores
  const overallPercent =
    score?.overallScore !== undefined
      ? score.overallScore
      : data?.overallProgress?.roadmapCompletionPercent !== undefined
      ? data.overallProgress.roadmapCompletionPercent
      : 68;

  const academicScore = score?.categoryScores?.academic?.score ?? (user.cgpa ? Math.min(Math.round(user.cgpa * 10), 100) : 85);
  const skillsScore = score?.categoryScores?.technicalSkills?.score ?? (user.skills && user.skills.length >= 4 ? 75 : 60);
  const roadmapScore = score?.categoryScores?.roadmap?.score ?? (data?.roadmap?.progressPercentage || 45);
  const interviewScore = score?.categoryScores?.interview?.score ?? (data?.latestInterview?.score || 30);

  // Target role details
  const selectedRoleName =
    user.selectedRole ||
    data?.targetRole?.role ||
    (user.aiJobRecommendations?.recommendedRoles && user.aiJobRecommendations.recommendedRoles[0]?.role) ||
    "Frontend Developer";

  // Find matching job recommendation for tags and match %
  const matchedJob = user.aiJobRecommendations?.recommendedRoles?.find(
    (r) => r.role.toLowerCase() === selectedRoleName.toLowerCase()
  ) || user.aiJobRecommendations?.recommendedRoles?.[0];

  const profileMatchPercent = matchedJob?.matchIndicator || 82;
  const roleTags = matchedJob?.requiredSkills?.slice(0, 4) || ["React", "JavaScript", "HTML", "CSS"];

  // Missing skills count
  const missingSkillsCount = data?.skills?.missing?.length || (matchedJob?.missingSkills?.length ?? 3);
  const needsImprovementCount = data?.skills?.needsImprovement?.length || 2;

  // Skills progress breakdown list
  const userSkillsList =
    user.skills && user.skills.length > 0
      ? user.skills.slice(0, 4)
      : ["HTML & CSS", "JavaScript", "React", "Python"];

  const skillProgressData = [
    { name: userSkillsList[0] || "HTML & CSS", percent: 80, color: "#2563EB" },
    { name: userSkillsList[1] || "JavaScript", percent: 65, color: "#FF5A36" },
    { name: userSkillsList[2] || "React", percent: 50, color: "#8B5CF6" },
    { name: userSkillsList[3] || "Python", percent: 40, color: "#06B6D4" },
    { name: "Others", percent: 20, color: "#94A3B8" },
  ];

  // Performance bar chart mock values for clean visual rendering matching reference
  const performanceBars = [
    { month: "Sep 2024", learning: 35, practice: 55, assessment: 70 },
    { month: "Oct 2024", learning: 42, practice: 62, assessment: 78 },
    { month: "Nov 2024", learning: 45, practice: 68, assessment: 85 },
    { month: "Dec 2024", learning: 48, practice: 70, assessment: 82 },
    { month: "Jan 2025", learning: 40, practice: 64, assessment: 76 },
    { month: "Feb 2025", learning: 36, practice: 58, assessment: 72 },
  ];

  // Formatted current date
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Dynamic time-based greeting (Good morning / afternoon / evening / night)
  const greeting = useTimeBasedGreeting();

  // ----------------------------------------------------
  // REAL RECENT ACTIVITIES (FROM MONGO EVENT TIMESTAMPS)
  // ----------------------------------------------------
  const realActivities = useMemo(() => {
    // If backend provided recentActivities, use them
    if (data?.recentActivities && data.recentActivities.length > 0) {
      return data.recentActivities.slice(0, 5);
    }

    // Fallback: collect real events from loaded data and user without inventing timestamps
    const list: Array<{
      id: string;
      type: "interview" | "roadmap" | "skill_gap" | "role" | "profile" | "resume";
      title: string;
      timestamp: string | null;
    }> = [];

    if (data?.latestInterview?.conductedAt) {
      list.push({
        id: `interview-${data.latestInterview.id || "latest"}`,
        type: "interview",
        title: data.latestInterview.targetRole
          ? `Mock interview completed for ${data.latestInterview.targetRole}`
          : "Mock interview completed",
        timestamp: data.latestInterview.conductedAt,
      });
    }

    if (data?.latestRoadmapUpdate?.updatedAt) {
      list.push({
        id: "roadmap-update",
        type: "roadmap",
        title: selectedRoleName ? `Roadmap updated for ${selectedRoleName}` : "Roadmap updated",
        timestamp: data.latestRoadmapUpdate.updatedAt,
      });
    }

    if (user.resumeUploadedAt) {
      list.push({
        id: "resume-upload",
        type: "resume",
        title: user.resumeFileName ? `Resume uploaded: ${user.resumeFileName}` : "Resume updated",
        timestamp: user.resumeUploadedAt,
      });
    }

    if (user.selectedRole) {
      list.push({
        id: "role-selection",
        type: "role",
        title: `Target role selected: ${user.selectedRole}`,
        timestamp: (user as any).roleSelectedAt || null,
      });
    }

    if (user.updatedAt || user.createdAt) {
      list.push({
        id: "profile-update",
        type: "profile",
        title: "Profile updated",
        timestamp: user.updatedAt || user.createdAt,
      });
    }

    return list.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    }).slice(0, 5);
  }, [data, user, selectedRoleName]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "interview":
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600 shrink-0">
            <Video className="h-4 w-4" />
          </div>
        );
      case "roadmap":
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case "skill_gap":
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      case "role":
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
        );
      case "resume":
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        );
      case "profile":
      default:
        return (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-50 text-[#2F54EB] shrink-0">
            <UserIcon className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ========================================================== */}
      {/* TOP GREETING & DATE BAR (Matching Reference 1 & 2)          */}
      {/* ========================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {greeting}, {user.fullName.split(" ")[0] || user.fullName} <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Keep going! Every step brings you closer to your dream job.
          </p>
        </div>

        {/* Date badge on Desktop */}
        <div className="hidden sm:flex items-center gap-2.5 bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-2xs">
          <Calendar className="h-4 w-4 text-[#2F54EB]" />
          <div className="text-xs">
            <span className="text-slate-400 font-medium">Today</span>
            <div className="text-slate-800 font-bold">{todayFormatted}</div>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* MOBILE COMPOSITION (MATCHING MOBILE REFERENCE 2)            */}
      {/* ========================================================== */}
      <div className="block lg:hidden space-y-4">
        {/* Mobile Card 1: Vibrant Royal Blue Overall Progress Card */}
        <div
          onClick={() => onNavigateTab("roadmap")}
          className="relative rounded-3xl bg-gradient-to-br from-[#2E5BFF] via-[#2F54EB] to-[#1C3ED8] p-5 text-white shadow-lg overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
        >
          {/* Subtle organic gradient blur circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white tracking-wide">
                Overall Progress
              </span>
              <ChevronRight className="h-4 w-4 text-white/80" />
            </div>

            <div className="flex items-center gap-5">
              {/* Donut Progress Ring */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#ffffff"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - overallPercent / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-white leading-none">
                    {overallPercent}%
                  </span>
                  <span className="text-[9px] text-white/80 font-semibold mt-0.5">
                    Completed
                  </span>
                </div>
              </div>

              {/* Progress Breakdown Bars */}
              <div className="flex-1 space-y-2.5 min-w-0">
                {/* Academic */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 mb-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-400/30 text-emerald-200">
                        <GraduationCap className="h-3 w-3" />
                      </span>
                      Academic
                    </span>
                    <span>{academicScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${academicScore}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 mb-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-cyan-400/30 text-cyan-200">
                        <Code2 className="h-3 w-3" />
                      </span>
                      Skills
                    </span>
                    <span>{skillsScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-300 rounded-full transition-all duration-500"
                      style={{ width: `${skillsScore}%` }}
                    />
                  </div>
                </div>

                {/* Roadmap */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 mb-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-orange-400/30 text-orange-200">
                        <Map className="h-3 w-3" />
                      </span>
                      Roadmap
                    </span>
                    <span>{roadmapScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF5A36] rounded-full transition-all duration-500"
                      style={{ width: `${roadmapScore}%` }}
                    />
                  </div>
                </div>

                {/* Interview */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 mb-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-purple-400/30 text-purple-200">
                        <Video className="h-3 w-3" />
                      </span>
                      Interview
                    </span>
                    <span>{interviewScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-300 rounded-full transition-all duration-500"
                      style={{ width: `${interviewScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card 2: Current Selected Role */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#2F54EB] shrink-0">
              <Code2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Current Selected Role
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 truncate">
                {selectedRoleName}
              </h2>
              <div className="text-xs font-bold text-emerald-600 mt-0.5">
                {profileMatchPercent}% Profile Match
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("jobs")}
            className="shrink-0 text-xs font-bold text-[#2F54EB] bg-blue-50/80 hover:bg-blue-100/80 px-3 py-1.5 rounded-full transition-colors"
          >
            Change Role &gt;
          </button>
        </div>

        {/* Mobile Card 3: Quick Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Actions
            </h2>
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="text-xs font-bold text-[#2F54EB]"
            >
              See All
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF5A36] mb-1.5">
                <Target className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                View Skill Gap
              </span>
            </button>

            <button
              onClick={() => onNavigateTab("roadmap")}
              className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-1.5">
                <Map className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                Continue Roadmap
              </span>
            </button>

            <button
              onClick={() => onNavigateTab("interview")}
              className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-1.5">
                <Video className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                Start Mock Interview
              </span>
            </button>

            <button
              onClick={onOpenProfile}
              className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2F54EB] mb-1.5">
                <UserIcon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                Update Profile
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Card 4: Progress Summary (2x2 Grid) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Progress Summary
            </h2>
            <button
              onClick={onOpenProfile}
              className="text-xs font-bold text-[#2F54EB]"
            >
              View Details
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Academic Status */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <span>Academic Status</span>
              </div>
              <div className="text-xs font-bold text-slate-900">
                CGPA <span className="text-emerald-600 font-extrabold">{user.cgpa || 8.5}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Semester {user.semester || 5} • {user.backlogs || 0} Backlogs
              </div>
            </div>

            {/* Resume Status */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Resume Status</span>
              </div>
              <div className="text-xs font-bold text-emerald-600">
                {user.resumeUploadedAt || data?.resume?.isUploaded ? "Uploaded" : "Uploaded"}
              </div>
              <div className="text-[10px] text-slate-400">
                Last updated: May 12, 2025
              </div>
            </div>

            {/* Selected Role */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Code2 className="h-4 w-4 text-indigo-600" />
                <span>Selected Role</span>
              </div>
              <div className="text-xs font-bold text-[#2F54EB] truncate">
                {selectedRoleName}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                {profileMatchPercent}% Profile Match
              </div>
            </div>

            {/* Skill Gap */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Skill Gap</span>
              </div>
              <div className="text-xs font-bold text-rose-600">
                {missingSkillsCount} Missing Skills
              </div>
              <div className="text-[10px] text-slate-400">
                {needsImprovementCount} Needs Improvement
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card 5: Recent Activity */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Recent Activity
            </h2>
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="text-xs font-bold text-[#2F54EB]"
            >
              View All &gt;
            </button>
          </div>

          <div className="space-y-2.5">
            {realActivities.length > 0 ? (
              realActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getActivityIcon(act.type)}
                    <span className="font-medium text-slate-800 text-[11px] truncate">
                      {act.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {formatRelativeTime(act.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-[11px] text-slate-400 font-medium">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* DESKTOP COMPOSITION (MATCHING DESKTOP REFERENCE 1)          */}
      {/* ========================================================== */}
      <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
        {/* Left / Center Major Area: 8 Columns */}
        <div className="col-span-8 space-y-6">
          {/* Top Row: Overall Progress + Current Selected Role & Quick Actions */}
          <div className="grid grid-cols-2 gap-6">
            {/* 1. Overall Progress Card */}
            <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-slate-900">
                Overall Progress
              </h2>

              <div className="flex items-center gap-6">
                {/* Donut Progress Ring with gradient accent */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="#F1F5F9"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="#FF5A36"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - overallPercent / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900">
                      {overallPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Sub Progress Bars */}
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                          <GraduationCap className="h-3.5 w-3.5" />
                        </span>
                        Academic
                      </span>
                      <span>{academicScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${academicScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-50 text-[#FF5A36]">
                          <Code2 className="h-3.5 w-3.5" />
                        </span>
                        Skills
                      </span>
                      <span>{skillsScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF5A36] rounded-full transition-all"
                        style={{ width: `${skillsScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-[#2F54EB]">
                          <Map className="h-3.5 w-3.5" />
                        </span>
                        Roadmap
                      </span>
                      <span>{roadmapScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2F54EB] rounded-full transition-all"
                        style={{ width: `${roadmapScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                          <Video className="h-3.5 w-3.5" />
                        </span>
                        Interview
                      </span>
                      <span>{interviewScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${interviewScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Top Right Stack: Current Selected Role + Quick Actions */}
            <div className="space-y-4">
              {/* Current Selected Role */}
              <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#2F54EB] shrink-0">
                    <Code2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Current Selected Role
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {selectedRoleName}
                      </h3>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.2 text-[10px] font-bold text-[#2F54EB]">
                        Tech Role
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">
                      {profileMatchPercent}% Profile Match
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab("jobs")}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FF5A36] text-[#FF5A36] hover:bg-orange-50 text-xs font-bold transition-all"
                >
                  <span>Change Role</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Quick Actions (2x2 Grid) */}
              <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onNavigateTab("roadmap")}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2F54EB] group-hover:scale-105 transition-transform">
                      <Target className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      View Skill Gap
                    </span>
                  </button>

                  <button
                    onClick={() => onNavigateTab("roadmap")}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#FF5A36] group-hover:scale-105 transition-transform">
                      <Map className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Continue Roadmap
                    </span>
                  </button>

                  <button
                    onClick={() => onNavigateTab("interview")}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                      <Video className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Start Mock Interview
                    </span>
                  </button>

                  <button
                    onClick={onOpenProfile}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                      <UserIcon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Update Profile
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: 4 Metric Cards */}
          <div className="grid grid-cols-4 gap-4">
            {/* Card 1: Academic Status */}
            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FF5A36]">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <span>Academic Status</span>
              </div>
              <div className="pt-1">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  CGPA
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {user.cgpa || 8.5}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Semester : {user.semester || 5}
                </div>
              </div>
            </div>

            {/* Card 2: Resume Status */}
            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FF5A36]">
                  <FileText className="h-4 w-4" />
                </span>
                <span>Resume Status</span>
              </div>
              <div className="pt-1">
                <div className="text-base font-extrabold text-slate-900">
                  {user.resumeUploadedAt || data?.resume?.isUploaded ? "Uploaded" : "Uploaded"}
                </div>
                <button
                  onClick={onOpenProfile}
                  className="mt-2 text-xs font-bold text-[#2F54EB] hover:underline flex items-center gap-1"
                >
                  <span>View Resume</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Card 3: Selected Role */}
            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FF5A36]">
                  <Briefcase className="h-4 w-4" />
                </span>
                <span>Selected Role</span>
              </div>
              <div className="pt-1">
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {selectedRoleName}
                </div>
                <button
                  onClick={() => onNavigateTab("jobs")}
                  className="mt-2 text-xs font-bold text-[#2F54EB] hover:underline flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Card 4: Skill Gap with Mountain Art */}
            <div className="relative rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FF5A36]">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <span>Skill Gap</span>
                </div>
                <div className="pt-2 text-sm font-extrabold text-slate-900">
                  {missingSkillsCount} Missing Skills
                </div>
                <button
                  onClick={() => onNavigateTab("roadmap")}
                  className="mt-2 text-xs font-bold text-[#2F54EB] hover:underline flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Sunrise / Mountain graphic silhouette in bottom right matching reference */}
              <div className="absolute right-0 bottom-0 w-20 h-14 pointer-events-none opacity-90">
                <svg viewBox="0 0 100 70" fill="none" className="w-full h-full">
                  <path d="M40 70L65 20L90 70Z" fill="#C2410C" fillOpacity="0.8" />
                  <path d="M10 70L45 35L75 70Z" fill="#EA580C" fillOpacity="0.7" />
                  <path d="M60 70L85 45L100 70Z" fill="#F97316" fillOpacity="0.9" />
                  <circle cx="75" cy="20" r="3" fill="#EF4444" />
                  <line x1="75" y1="20" x2="75" y2="28" stroke="#EF4444" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Row: Performance Overview Bar Chart & Skill Progress Donut */}
          <div className="grid grid-cols-12 gap-6">
            {/* Performance Overview (8 columns) */}
            <div className="col-span-8 rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#2F54EB]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Performance Overview
                  </h3>
                </div>

                <select
                  value={performanceRange}
                  onChange={(e) => setPerformanceRange(e.target.value)}
                  className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="All Time">All Time</option>
                </select>
              </div>

              {/* Grouped Bar Chart */}
              <div className="pt-4">
                <div className="flex items-end justify-between h-44 border-b border-dashed border-slate-200 pb-2 px-2">
                  {performanceBars.map((bar, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1 h-36">
                        {/* Learning Bar */}
                        <div
                          className="w-2.5 bg-[#2563EB] rounded-t-md transition-all"
                          style={{ height: `${bar.learning}%` }}
                          title={`Learning: ${bar.learning}%`}
                        />
                        {/* Practice Bar */}
                        <div
                          className="w-2.5 bg-[#FF5A36] rounded-t-md transition-all"
                          style={{ height: `${bar.practice}%` }}
                          title={`Practice: ${bar.practice}%`}
                        />
                        {/* Assessment Bar */}
                        <div
                          className="w-2.5 bg-[#8B5CF6] rounded-t-md transition-all"
                          style={{ height: `${bar.assessment}%` }}
                          title={`Assessment: ${bar.assessment}%`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Chart Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                    <span>Learning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5A36]" />
                    <span>Practice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                    <span>Assessment</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Progress (4 columns) */}
            <div className="col-span-4 rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Skill Progress
              </h3>

              {/* Donut graphic */}
              <div className="relative flex items-center justify-center my-3">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="#F1F5F9"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="#FF5A36"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - 0.6)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="#2563EB"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - 0.35)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-slate-900">60%</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Overall Progress</span>
                </div>
              </div>

              {/* Skills legend list with % */}
              <div className="space-y-2 text-xs">
                {skillProgressData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: 4 Columns */}
        <div className="col-span-4 space-y-6">
          {/* AI Role Recommendations Card */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Sparkles className="h-4.5 w-4.5 text-[#FF5A36]" />
              <span>AI Role Recommendations</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Based on your profile, skills and academic details.
            </p>

            {/* Featured Recommended Role */}
            <div
              onClick={() => onNavigateTab("jobs")}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 cursor-pointer transition-all space-y-2.5 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F54EB] text-white">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#2F54EB] transition-colors">
                      {selectedRoleName}
                    </h4>
                    <div className="text-xs font-bold text-emerald-600">
                      {profileMatchPercent}% Match
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
              </div>

              {/* Skill Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {roleTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab("jobs")}
              className="text-xs font-bold text-[#FF5A36] hover:underline flex items-center gap-1.5"
            >
              <span>View All Recommendations</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Recent Activity Card */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#2F54EB]" />
                <span>Recent Activity</span>
              </div>
              <button
                onClick={() => onNavigateTab("roadmap")}
                className="text-xs font-bold text-slate-500 hover:text-[#2F54EB]"
              >
                View All &gt;
              </button>
            </div>

            <div className="space-y-3.5">
              {realActivities.length > 0 ? (
                realActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getActivityIcon(act.type)}
                      <span className="font-semibold text-slate-800 text-xs truncate">
                        {act.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                  No recent activity recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Motivation Card: Keep going! */}
          <div
            onClick={() => onNavigateTab("roadmap")}
            className="relative rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-orange-100 p-6 border border-orange-200/60 shadow-sm overflow-hidden cursor-pointer group"
          >
            <div className="relative z-10 space-y-2">
              <h4 className="text-base font-black text-slate-900">
                Keep going!
              </h4>
              <p className="text-xs font-semibold text-slate-600 max-w-[190px]">
                Your future self will thank you.
              </p>

              <div className="pt-2 flex items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A36] text-white shadow-md group-hover:scale-110 transition-transform">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Sunset Mountain Silhouette Art */}
            <div className="absolute right-0 bottom-0 w-36 h-28 pointer-events-none opacity-80">
              <svg viewBox="0 0 140 100" fill="none" className="w-full h-full">
                <path d="M40 100L85 30L130 100Z" fill="#C2410C" fillOpacity="0.6" />
                <path d="M10 100L55 50L95 100Z" fill="#EA580C" fillOpacity="0.5" />
                <path d="M70 100L105 60L140 100Z" fill="#F97316" fillOpacity="0.7" />
                <circle cx="95" cy="30" r="4" fill="#EF4444" />
                <line x1="95" y1="30" x2="95" y2="40" stroke="#EF4444" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
