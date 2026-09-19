import React, { useState } from "react";
import { Roadmap, User, SkillGapAnalysis } from "../types";
import {
  Map,
  CheckCircle2,
  Circle,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Code2,
  BookOpen,
  Video,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Target,
  ShieldCheck,
  Check,
  ArrowRight,
  FileText,
  Layers,
  Flame,
  Zap,
  AlertTriangle,
  TrendingUp,
  XCircle,
  HelpCircle,
  BookMarked,
  Hammer,
} from "lucide-react";
import confetti from "canvas-confetti";

interface RoadmapViewProps {
  roadmap: Roadmap | null;
  selectedRole?: string;
  onSelectRole: (role: string) => void;
  onToggleItem: (roadmapId: string, itemId: string, completed: boolean) => void;
  onRegenerate: () => void;
  loading: boolean;
  user: User;
  onNavigateToRoles?: () => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  roadmap,
  selectedRole: propSelectedRole,
  onSelectRole,
  onToggleItem,
  onRegenerate,
  loading,
  user,
  onNavigateToRoles,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
  });

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseNumber]: !prev[phaseNumber],
    }));
  };

  const handleCheckboxClick = (itemId: string, currentStatus: boolean) => {
    if (!roadmap) return;
    const nextStatus = !currentStatus;
    onToggleItem(roadmap.id, itemId, nextStatus);

    if (nextStatus) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {
        // Safe ignore
      }
    }
  };

  // Build options for target role selector
  const selectedRole = user.selectedRole || roadmap?.selectedRole || roadmap?.jobTitle;
  const recommendedRoles = user.aiJobRecommendations?.recommendedRoles || [];

  // Categorize task badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "topic":
      case "learn":
        return { label: "Learn", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "project":
        return { label: "Project", icon: Hammer, color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "coding":
      case "practice":
        return { label: "Practice", icon: Code2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "course":
        return { label: "Course", icon: BookMarked, color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "interview":
        return { label: "Interview", icon: Award, color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "assessment":
        return { label: "Assessment", icon: Target, color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      default:
        return { label: "Task", icon: Layers, color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Low":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  // Profile Evidence Counts
  const declaredSkillsCount = user.skills?.length || 0;
  const rawSkillsWithLevels = user.skillsWithLevels || [];
  const skillsArray = Array.isArray(rawSkillsWithLevels)
    ? rawSkillsWithLevels
    : Object.entries(rawSkillsWithLevels).map(([name, level]) => ({ name, level: level as any }));
  const advancedSkills = skillsArray.filter((s) => s.level === "Advanced").map((s) => s.name);
  const intermediateSkills = skillsArray.filter((s) => s.level === "Intermediate").map((s) => s.name);
  const beginnerSkills = skillsArray.filter((s) => s.level === "Beginner").map((s) => s.name);

  const hasResume = Boolean(user.resumeUploadedAt || user.resumeText);
  const projectsCount = user.projects?.length || 0;

  // Skill Gap Data
  const skillGap: SkillGapAnalysis | undefined = roadmap?.skillGap;

  // Task calculation
  const totalTasks = roadmap
    ? roadmap.totalTasks || roadmap.phases.reduce((sum, p) => sum + p.items.length, 0)
    : 0;
  const completedTasks = roadmap
    ? roadmap.completedTasks !== undefined
      ? roadmap.completedTasks
      : roadmap.phases.reduce((sum, p) => sum + p.items.filter((i) => i.completed).length, 0)
    : 0;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Role Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Personalized Placement Roadmap
            </h1>
            {roadmap?.isAiGenerated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <Sparkles className="h-3 w-3" />
                Gemini Personalized
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                <ShieldCheck className="h-3 w-3" />
                Role Gap Plan
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Engineered from your verified skills, academic profile, and gap analysis for{" "}
            <strong className="text-slate-900">{selectedRole || "Target Job Role"}</strong>.
          </p>
        </div>

        {/* Role Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              id="select-roadmap-target-role"
              value={propSelectedRole || selectedRole || ""}
              onChange={(e) => onSelectRole(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-indigo-600 focus:outline-none"
            >
              {user.selectedRole && (
                <option value={user.selectedRole}>
                  ★ Selected Role: {user.selectedRole}
                </option>
              )}
              {recommendedRoles.map((r) => {
                if (r.role === user.selectedRole) return null;
                return (
                  <option key={r.role} value={r.role}>
                    AI Role: {r.role} ({r.matchIndicator}% Match)
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            id="btn-regenerate-roadmap"
            onClick={onRegenerate}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
            title="Re-run Gemini skill gap and roadmap generator"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>{loading ? "Generating..." : "Regenerate with AI"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-sm animate-pulse space-y-4">
          <RefreshCw className="mx-auto h-8 w-8 text-indigo-600 animate-spin" />
          <h3 className="text-base font-bold text-slate-800">
            Synthesizing AI Skill Gap Analysis & Roadmap...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Comparing your declared skill proficiencies, academic information, and projects against industry criteria for{" "}
            <strong>{selectedRole || "your target role"}</strong>.
          </p>
        </div>
      ) : roadmap ? (
        <div className="space-y-6">
          {/* ========================================================== */}
          {/* FEATURE 2: AI SKILL GAP ANALYSIS SECTION                  */}
          {/* ========================================================== */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      AI Skill Gap Analysis
                    </h2>
                    <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                      Target Role: {roadmap.selectedRole || roadmap.jobTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Comparing your actual declared skills and levels against industry hiring benchmarks.
                  </p>
                </div>
              </div>

              {/* Verified Profile Evidence Transparency */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  <Check className="h-3 w-3 text-emerald-600" />
                  {declaredSkillsCount} Skills Declared
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  <FileText className="h-3 w-3 text-indigo-600" />
                  {hasResume ? "Resume: Analyzed" : "Resume: Not Assessed"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  <FolderGit2 className="h-3 w-3 text-purple-600" />
                  {projectsCount} Project{projectsCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* The 4 Skill Gap Categories */}
            {skillGap && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Strong Skills */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Strong Skills
                        </h3>
                      </div>
                      <span className="rounded-full bg-emerald-200/70 text-emerald-900 text-[11px] font-extrabold px-2 py-0.2">
                        {skillGap.strong.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug mb-3">
                      Skills where your knowledge meets or exceeds expectations for this role.
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skillGap.strong.length > 0 ? (
                        skillGap.strong.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-300/80 px-2 py-1 text-xs font-bold text-emerald-900 shadow-2xs"
                          >
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-700/80 italic">
                          No skills at advanced role level yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Developing Skills */}
                <div className="rounded-xl bg-sky-50/70 border border-sky-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-sky-600" />
                        <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                          Developing Skills
                        </h3>
                      </div>
                      <span className="rounded-full bg-sky-200/70 text-sky-900 text-[11px] font-extrabold px-2 py-0.2">
                        {skillGap.developing.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-800 leading-snug mb-3">
                      Skills you have learned; ready for deeper hands-on project implementation.
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skillGap.developing.length > 0 ? (
                        skillGap.developing.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-sky-300/80 px-2 py-1 text-xs font-bold text-sky-900 shadow-2xs"
                          >
                            <TrendingUp className="h-3 w-3 text-sky-600" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-sky-700/80 italic">
                          No intermediate skills currently in this tier.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Needs Improvement */}
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Needs Improvement
                        </h3>
                      </div>
                      <span className="rounded-full bg-amber-200/70 text-amber-900 text-[11px] font-extrabold px-2 py-0.2">
                        {skillGap.needsImprovement.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug mb-3">
                      Declared at beginner level; must be leveled up to pass technical screening.
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skillGap.needsImprovement.length > 0 ? (
                        skillGap.needsImprovement.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-300/80 px-2 py-1 text-xs font-bold text-amber-900 shadow-2xs"
                          >
                            <Clock className="h-3 w-3 text-amber-600" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-700/80 italic">
                          No declared skills currently at beginner deficit.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Missing Skills */}
                <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                          Missing Skills
                        </h3>
                      </div>
                      <span className="rounded-full bg-rose-200/70 text-rose-900 text-[11px] font-extrabold px-2 py-0.2">
                        {skillGap.missing.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-snug mb-3">
                      Essential industry requirements not yet found in your profile.
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skillGap.missing.length > 0 ? (
                        skillGap.missing.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-300/80 px-2 py-1 text-xs font-bold text-rose-900 shadow-2xs"
                          >
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-rose-700/80 italic">
                          All essential core requirements found in profile!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Priority Focus Areas Breakdown */}
            {skillGap && skillGap.prioritySkills && skillGap.prioritySkills.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Priority Learning Focus Areas
                  </h3>
                  <span className="text-xs text-slate-400">
                    (Targeted by the personalized roadmap below)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {skillGap.prioritySkills.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          {item.skill}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                            {item.currentLevel} → {item.requiredLevel}
                          </span>
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${getPriorityBadge(
                              item.priority
                            )}`}
                          >
                            {item.priority} Priority
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* PERSONALIZED LEARNING ROADMAP OVERVIEW CARD                */}
          {/* ========================================================== */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-300">
                  Target Role Preparation
                </span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  {roadmap.jobTitle} {roadmap.companyName && roadmap.companyName !== "Campus Placement" ? `at ${roadmap.companyName}` : "Placement Path"}
                </h2>
                <div className="mt-1 text-xs text-slate-300">
                  Student: {user.fullName} ({user.course} {user.branch}, Sem {user.semester})
                </div>
              </div>

              {/* Progress metric */}
              <div className="flex items-center gap-4 shrink-0 bg-white/10 p-3.5 rounded-xl border border-white/10">
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{progressPercent}%</div>
                  <div className="text-[11px] font-medium text-indigo-200">
                    {completedTasks} of {totalTasks} Tasks Done
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full border-4 border-emerald-400/40 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-300">
                  {completedTasks === totalTasks && totalTasks > 0 ? "★" : "✓"}
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-indigo-200 mb-1.5">
                <span>Placement Readiness Milestones</span>
                <span>{completedTasks} of {totalTasks} tasks completed</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Gaps identified callout tags */}
            {roadmap.customGapsIdentified && roadmap.customGapsIdentified.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                  Targeted Deficits & Competencies in this Plan:
                </div>
                <div className="flex flex-wrap gap-2">
                  {roadmap.customGapsIdentified.map((gap, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 text-xs text-amber-200"
                    >
                      🎯 {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* SEQUENTIAL ROADMAP PHASES LIST                            */}
          {/* ========================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Sequential Learning Modules
              </h2>
              <span className="text-xs text-slate-500">
                Check off items as you complete them to update placement readiness.
              </span>
            </div>

            {roadmap.phases.map((phase) => {
              const isExpanded = expandedPhases[phase.phaseNumber] ?? true;
              const phaseItems = phase.items;
              const totalItems = phaseItems.length;
              const completedCount = phaseItems.filter((i) => i.completed).length;
              const phasePercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

              return (
                <div
                  key={phase.phaseNumber}
                  id={`roadmap-phase-${phase.phaseNumber}`}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Phase Header Accordion */}
                  <button
                    type="button"
                    onClick={() => togglePhase(phase.phaseNumber)}
                    className="w-full flex items-center justify-between p-5 text-left bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                        {phase.phaseNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{phase.title}</h3>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {phase.durationWeeks}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {completedCount} of {totalItems} tasks completed ({phasePercent}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${phasePercent}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Phase Tasks Checklist */}
                  {isExpanded && (
                    <div className="p-5 divide-y divide-slate-100">
                      {phase.items.map((item) => {
                        const badge = getCategoryBadge(item.type || item.category);
                        const BadgeIcon = badge.icon;
                        const priorityClass = getPriorityBadge(item.priority);

                        return (
                          <div
                            key={item.id}
                            id={`task-item-${item.id}`}
                            className={`py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 transition-colors ${
                              item.completed ? "opacity-75" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCheckboxClick(item.id, item.completed)}
                              className="mt-0.5 shrink-0 rounded text-indigo-600 focus:outline-none"
                              aria-label={item.completed ? "Mark as incomplete" : "Mark as completed"}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-300 hover:text-indigo-600 transition-colors" />
                              )}
                            </button>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span
                                  className={`text-sm font-bold ${
                                    item.completed
                                      ? "text-slate-500 line-through"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {item.title}
                                </span>

                                {/* Type Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.2 text-[10px] font-semibold ${badge.color}`}
                                >
                                  <BadgeIcon className="h-2.5 w-2.5" />
                                  {badge.label}
                                </span>

                                {/* Skill Tag */}
                                {item.skill && (
                                  <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                                    {item.skill}
                                  </span>
                                )}

                                {/* Source Badge (e.g. Mock Interview adaptation) */}
                                {item.source === "mock_interview" && (
                                  <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5 text-rose-600" />
                                    Adapted from Mock Interview
                                  </span>
                                )}

                                {/* Priority Badge */}
                                {item.priority && (
                                  <span
                                    className={`rounded border px-1.5 py-0.2 text-[10px] font-bold ${priorityClass}`}
                                  >
                                    {item.priority}
                                  </span>
                                )}

                                {/* Estimated Time */}
                                {(item.estimatedTime || item.estimatedHours) && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {item.estimatedTime || `${item.estimatedHours}h`}
                                  </span>
                                )}

                                {item.difficulty && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    • {item.difficulty}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                {item.description}
                              </p>

                              {item.reason && (
                                <p className="mt-1 text-[11px] text-indigo-700 font-medium">
                                  💡 <strong>Rationale:</strong> {item.reason}
                                </p>
                              )}

                              {(item.linkText || item.resourceUrl) && (
                                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Resource: {item.linkText || item.resourceUrl}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ========================================================== */}
          {/* RECOMMENDED PORTFOLIO PROJECTS                            */}
          {/* ========================================================== */}
          {roadmap.recommendedProjects && roadmap.recommendedProjects.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Recommended High-Impact Portfolio Projects
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Recruiters look for end-to-end applications demonstrating solid architectural patterns. Build one of these to showcase in campus interviews for {selectedRole}.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.recommendedProjects.map((project, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{project.title}</div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {project.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {project.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-purple-800 font-medium">
                      💡 <strong>Portfolio Impact:</strong> {project.portfolioImpact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* CURATED CODING PRACTICE PLAN                              */}
          {/* ========================================================== */}
          {roadmap.codingPracticePlan && roadmap.codingPracticePlan.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Curated Practice & Assessment Sheet
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Core recurring algorithmic problem patterns and technical questions asked in screening assessments for {selectedRole}.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {roadmap.codingPracticePlan.map((problem, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900">{problem.problemTitle}</span>
                        <span className="text-slate-400 ml-2">({problem.topic})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          problem.difficulty === "Easy"
                            ? "bg-emerald-50 text-emerald-700"
                            : problem.difficulty === "Medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {problem.platform}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State: No role or roadmap yet */
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Target className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No Target Job Role Selected Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            To generate your genuinely personalized AI Skill Gap Analysis and 4-phase learning roadmap, select one of your AI Recommended Job Roles.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            {onNavigateToRoles && (
              <button
                type="button"
                id="btn-navigate-to-roles"
                onClick={onNavigateToRoles}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
              >
                <span>View AI Job Role Recommendations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              id="btn-generate-initial-roadmap"
              onClick={onRegenerate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Generate Roadmap for Campus Role</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
