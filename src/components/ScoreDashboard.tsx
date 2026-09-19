import React, { useState, useEffect } from "react";
import { User, ReadinessScore, DashboardData } from "../types";
import { getAuthHeaders } from "../services/auth";
import {
  Compass,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Video,
  Map,
  BookOpen,
  FileText,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
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
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      const res = await fetch("/api/dashboard", {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (Status ${res.status})`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialDashboardData) {
      fetchDashboard();
    }
  }, [user.id, user.selectedRole]);

  const handleManualRefresh = () => {
    fetchDashboard();
    if (onRefreshDashboard) onRefreshDashboard();
    if (onRecalculate) onRecalculate();
  };

  // Skeleton Loading State (Step 27)
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200 rounded-2xl md:col-span-2"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Error State (Step 28)
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Dashboard Unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  const targetRole = data?.targetRole;
  const overallProgress = data?.overallProgress;
  const skills = data?.skills;
  const roadmap = data?.roadmap;
  const latestInterview = data?.latestInterview;
  const latestRoadmapUpdate = data?.latestRoadmapUpdate;
  const academic = data?.academic;
  const resume = data?.resume;
  const nextAction = data?.nextAction;

  return (
    <div className="space-y-6 pb-12">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER & STUDENT COMMAND STATUS */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Career Readiness Dashboard
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              Placement Command Center
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Candidate: <span className="font-bold text-slate-800">{user.fullName}</span> •{" "}
            {academic?.course || user.course} in {academic?.branch || user.branch} •{" "}
            {academic?.college || user.college} (Class of {academic?.graduationYear || user.graduationYear})
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="btn-refresh-dashboard"
            onClick={handleManualRefresh}
            disabled={loading || isRecalculating}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh dashboard data from stored records"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading || isRecalculating ? "animate-spin" : ""}`} />
            <span>{loading || isRecalculating ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            onClick={() => onNavigateTab("interview")}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Video className="h-3.5 w-3.5 text-rose-400" />
            <span>Launch Mock Interview</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. CAREER PROGRESS & TARGET ROLE (Step 4 & Step 5) */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Job Role
                </span>
                {targetRole?.selected ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Active Target
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    Selection Required
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {targetRole?.role || "No role selected yet"}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {targetRole?.selected
                  ? "Based on your verified student profile and AI career recommendation analysis."
                  : "Select an AI-recommended career role to activate your personalized skill gap analysis and roadmap."}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              id="btn-dashboard-target-role"
              onClick={() => onNavigateTab("jobs")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs"
            >
              <span>{targetRole?.selected ? "Change Target Role" : "Explore Recommended Roles"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. NEXT ACTION ENGINE (Step 10 & Step 4) */}
      {/* ---------------------------------------------------- */}
      {nextAction && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                  Recommended Next Action
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900">
                {nextAction.title}
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                <span className="font-semibold text-slate-700">Why:</span> {nextAction.reason}
              </p>
            </div>

            <button
              onClick={() => onNavigateTab(nextAction.targetTab)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-xs shrink-0"
            >
              <span>{nextAction.actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. OVERALL PROGRESS & ROADMAP OVERVIEW (Step 6 & 9) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OVERALL PROGRESS (Step 6 & Step 17) */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Overall Progress
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Deterministic
              </span>
            </div>

            <div className="mt-4">
              {overallProgress?.hasSufficientData ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900">
                      {overallProgress.roadmapCompletionPercent}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Roadmap Completion
                    </span>
                  </div>

                  {/* Measurable Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(overallProgress.roadmapCompletionPercent, 100)}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {overallProgress.statusSummary}
                  </p>
                </div>
              ) : (
                <div className="py-3">
                  <div className="text-sm font-semibold text-slate-700">
                    Progress Tracking Inactive
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Progress tracking will appear as you complete your roadmap tasks and interview assessments.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Interview Evaluated:</span>
            <span className="font-bold text-slate-800">
              {latestInterview?.scoreAssessed ? `${latestInterview.score} / 100` : "Not Assessed"}
            </span>
          </div>
        </div>

        {/* ROADMAP PROGRESS (Step 9) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Personalized Learning Roadmap
              </span>
              {roadmap?.hasRoadmap && (
                <button
                  onClick={() => onNavigateTab("roadmap")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Open Full Roadmap</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {roadmap?.hasRoadmap ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {roadmap.completedTasks} / {roadmap.totalTasks}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      tasks completed ({roadmap.progressPercentage}%)
                    </span>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                    {roadmap.totalTasks - roadmap.completedTasks} tasks remaining
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(roadmap.progressPercentage, 100)}%` }}
                  ></div>
                </div>

                {/* Next Priority (Step 10) */}
                {roadmap.nextPriority ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500">
                        Next Roadmap Priority
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                          roadmap.nextPriority.priority === "High"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {roadmap.nextPriority.priority || "High"} Priority
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {roadmap.nextPriority.title}
                    </div>
                    {roadmap.nextPriority.reason && (
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {roadmap.nextPriority.reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 font-semibold">
                    ✓ All assigned roadmap tasks for this milestone are completed!
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 py-4 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No Active Roadmap Found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Your personalized roadmap will appear after selecting a target role and analyzing skill gaps.
                </p>
                <button
                  onClick={() => onNavigateTab("jobs")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <span>Select Target Role</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Source of Truth: Personalized Roadmap Engine</span>
            <span>Deterministic count</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. YOUR SKILLS BREAKDOWN (Step 8) */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Skills Assessment Overview
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Skill Gap Source of Truth
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Categorized from your declared skills, skill levels, and role benchmark requirements.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("roadmap")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>View Full Gap Matrix</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {skills?.assessed ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Strong */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Strong
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  {skills.strong.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.strong.length > 0 ? (
                  skills.strong.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-white border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No strong skills confirmed yet</span>
                )}
              </div>
            </div>

            {/* Developing */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  Developing
                </span>
                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                  {skills.developing.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.developing.length > 0 ? (
                  skills.developing.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-white border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-800 shadow-2xs"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">None currently in developing</span>
                )}
              </div>
            </div>

            {/* Needs Improvement */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Needs Improvement
                </span>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                  {skills.needsImprovement.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.needsImprovement.length > 0 ? (
                  skills.needsImprovement.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-white border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">None requiring immediate fix</span>
                )}
              </div>
            </div>

            {/* Missing */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                  Missing
                </span>
                <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                  {skills.missing.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.missing.length > 0 ? (
                  skills.missing.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No missing baseline skills</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-800">
              Skill Gap Assessment Not Assessed
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select your AI-recommended job role to evaluate your profile competencies against actual role requirements.
            </p>
            <button
              onClick={() => onNavigateTab("jobs")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <span>Explore AI Job Roles</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 6. LATEST MOCK INTERVIEW EVALUATION (Step 11 & Step 12) */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Latest Mock Interview
              </span>
              {latestInterview?.scoreAssessed ? (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                  Evaluated
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                  Not Assessed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time conversational bar-raiser interview grounded in recorded transcript.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("interview")}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Video className="h-3.5 w-3.5 text-rose-400" />
            <span>{latestInterview?.conducted ? "Take New Mock" : "Start First Mock"}</span>
          </button>
        </div>

        {latestInterview?.scoreAssessed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Overall Score */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Bar-Raiser Score
                </span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-3xl font-black text-slate-900">
                    {latestInterview.score}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/100</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700">
                  {latestInterview.targetRole || "Target Role"}
                </span>
              </div>

              {/* Sub-Scores */}
              {latestInterview.subScores && (
                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Technical
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {latestInterview.subScores.technicalKnowledge}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/20 pts</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Problem Solving
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {latestInterview.subScores.problemSolving}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/20 pts</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Communication
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {latestInterview.subScores.communicationClarity}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/20 pts</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Role Alignment
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {latestInterview.subScores.roleAlignment}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/20 pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Key Strengths
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {latestInterview.coreStrengths.length > 0 ? (
                    latestInterview.coreStrengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No specific strengths documented</li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  Needs Improvement / Weaknesses
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {latestInterview.coreWeaknesses.length > 0 ? (
                    latestInterview.coreWeaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No critical weaknesses recorded</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-800">
              Mock Interview: Not Assessed
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Complete your first AI mock interview to evaluate your current interview performance under realistic campus hiring conditions.
            </p>
            <button
              onClick={() => onNavigateTab("interview")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-rose-400" />
              <span>Launch First Mock Interview</span>
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. LATEST ROADMAP UPDATE (Step 13) */}
      {/* ---------------------------------------------------- */}
      {latestRoadmapUpdate?.hasUpdate && latestRoadmapUpdate.changes?.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
                Roadmap Updated Based on Your Latest Interview
              </span>
            </div>
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              <span>View Updated Tasks in Roadmap</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <p className="text-xs text-indigo-800 mb-3">
            The following roadmap adjustments were automatically injected to target weaknesses detected during your interview evaluation:
          </p>

          <div className="space-y-2">
            {latestRoadmapUpdate.changes.map((chg, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-indigo-200 bg-white p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-extrabold uppercase ${
                        chg.type === "added"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {chg.type === "added" ? "+ New Task" : "↑ Priority Increased"}
                    </span>
                    <span className="font-bold text-slate-900">{chg.taskTitle}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{chg.reason}</p>
                </div>

                <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 text-[10px] font-extrabold shrink-0">
                  {chg.newPriority || "High"} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. ACADEMIC PROFILE & RESUME (Step 14 & Step 15) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Academic Profile
            </span>
            <button
              onClick={onOpenProfile}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Course</span>
              <span className="font-bold text-slate-800">{academic?.course || user.course}</span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch</span>
              <span className="font-bold text-slate-800">{academic?.branch || user.branch}</span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Semester</span>
              <span className="font-bold text-slate-800">Semester {academic?.semester || user.semester}</span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CGPA / Marks</span>
              <span className="font-bold text-slate-800">
                {academic?.cgpa !== null && academic?.cgpa !== undefined ? academic.cgpa : "Not Provided"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>College: {academic?.college || user.college}</span>
            <span>Backlogs: {academic?.backlogs ?? user.backlogs}</span>
          </div>
        </div>

        {/* Resume Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Resume Status
              </span>
              <button
                onClick={onOpenProfile}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {resume?.isUploaded ? "Replace Resume" : "Upload Document"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {resume?.isUploaded ? (resume.fileName || "Uploaded Resume Document") : "No Resume Uploaded"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        resume?.isUploaded
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {resume?.isUploaded ? "Uploaded" : "Not Assessed"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {resume?.note || "Upload PDF or DOCX to enrich job role matching and interview grounding."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Note: Resume parsing informs profile context. No arbitrary resume scoring is applied.
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 9. PROFILE COMPLETENESS CHECKLIST (Step 16) */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Profile Readiness Checklist
          </span>
          <span className="text-xs text-slate-400">
            Status Indicator (Not a weighted score)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700">Academics</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700">Skills & Levels</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            {targetRole?.selected ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-slate-700">Target Role</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            {skills?.assessed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-slate-700">Skill Gap</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            {roadmap?.hasRoadmap ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-slate-700">Roadmap</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5">
            {latestInterview?.scoreAssessed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-slate-700">Mock Interview</span>
          </div>
        </div>
      </div>
    </div>
  );
};
