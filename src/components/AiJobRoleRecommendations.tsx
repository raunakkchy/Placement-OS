import React, { useState, useEffect } from "react";
import { User, AiRecommendedJobRole, StudentAiRecommendations } from "../types";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Check,
  Briefcase,
  Compass,
  GraduationCap,
} from "lucide-react";

interface AiJobRoleRecommendationsProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  onNavigateToRoadmap?: () => void;
}

export const AiJobRoleRecommendations: React.FC<AiJobRoleRecommendationsProps> = ({
  user,
  onUserUpdate,
  onNavigateToRoadmap,
}) => {
  const [recommendations, setRecommendations] = useState<StudentAiRecommendations | null>(
    user.aiJobRecommendations || null
  );
  const [loading, setLoading] = useState<boolean>(!user.aiJobRecommendations);
  const [error, setError] = useState<string | null>(null);
  const [selectingRole, setSelectingRole] = useState<string | null>(null);
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch or generate recommendations on mount if missing
  useEffect(() => {
    if (!recommendations) {
      fetchRecommendations(false);
    }
  }, []);

  const fetchRecommendations = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch(`/api/ai/job-recommendations${forceRefresh ? "?forceRefresh=true" : ""}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load job role recommendations (Status ${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
        if (data.selectedRole && (!user.selectedRole || user.selectedRole !== data.selectedRole)) {
          onUserUpdate({ ...user, selectedRole: data.selectedRole, aiJobRecommendations: data.recommendations });
        } else {
          onUserUpdate({ ...user, aiJobRecommendations: data.recommendations });
        }
      } else {
        throw new Error(data.error || "Unable to parse recommendations");
      }
    } catch (err: any) {
      console.error("Error fetching AI job recommendations:", err);
      setError(err.message || "Failed to generate AI recommendations. Please retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectRole = async (roleName: string) => {
    try {
      setSelectingRole(roleName);
      setSelectionSuccess(null);
      setError(null);

      const res = await fetch("/api/ai/select-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: roleName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save selected role (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.user) {
        onUserUpdate(data.user);
        setSelectionSuccess(`Selected "${roleName}" as your target job role!`);
        setTimeout(() => setSelectionSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error("Select role failed:", err);
      setError(err.message || "Failed to save selected role.");
    } finally {
      setSelectingRole(null);
    }
  };

  const selectedRole = user.selectedRole;
  const rolesList: AiRecommendedJobRole[] = recommendations?.recommendedRoles || [];

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Compass className="h-5 w-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                AI Recommended Job Roles
              </h1>
              {recommendations?.isAiGenerated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  Gemini Evaluated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  <ShieldCheck className="h-3 w-3" />
                  Academic Qualification Verified
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Based on your academic profile ({user.course} in {user.branch}, CGPA {user.cgpa}), your declared skills ({user.skills.length} competencies), and verified background.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-refresh-recommendations"
              onClick={() => fetchRecommendations(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all border border-slate-200 disabled:opacity-50"
              title="Request a fresh Gemini profile evaluation"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>{refreshing ? "Evaluating Profile..." : "Re-evaluate Profile"}</span>
            </button>
          </div>
        </div>

        {/* Selected Role Status Banner */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          {selectedRole ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-emerald-50/80 border border-emerald-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-900 block uppercase tracking-wider">
                    Selected Target Career Role
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {selectedRole}
                  </span>
                </div>
              </div>

              {onNavigateToRoadmap && (
                <button
                  type="button"
                  id="btn-go-to-roadmap"
                  onClick={onNavigateToRoadmap}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm"
                >
                  <span>View Skill Gap & Roadmap</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0" />
              <div className="text-xs text-amber-900">
                <strong className="font-bold">Selection Required:</strong> Select one of the recommended roles below to anchor your target preparation path.
              </div>
            </div>
          )}
        </div>

        {selectionSuccess && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{selectionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchRecommendations(true)}
              className="text-red-900 underline font-bold text-[11px]"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4 animate-pulse"
            >
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Recommended Role Cards (3-5 Roles) */}
      {!loading && rolesList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rolesList.map((item, idx) => {
            const isSelected = selectedRole?.toLowerCase() === item.role.toLowerCase();
            const isSubmitting = selectingRole === item.role;

            return (
              <div
                key={item.role || idx}
                id={`card-role-${idx}`}
                className={`flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm border transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-slate-200 hover:border-slate-300 hover:shadow"
                }`}
              >
                <div>
                  {/* Card Header: Role Title & Selection Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">
                        Role Recommendation {idx + 1}
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                        {item.role}
                      </h3>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 shrink-0">
                        <Check className="h-3 w-3 stroke-[3]" />
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Profile Match Score Indicator */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-600">Profile Match</span>
                      <span className="font-extrabold text-slate-900">{item.matchIndicator}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.matchIndicator >= 75
                            ? "bg-emerald-600"
                            : item.matchIndicator >= 60
                            ? "bg-blue-600"
                            : "bg-amber-600"
                        }`}
                        style={{ width: `${item.matchIndicator}%` }}
                      />
                    </div>
                  </div>

                  {/* Why this matches you */}
                  <div className="mt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Why this matches you
                    </h4>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {item.whyMatch}
                    </p>
                  </div>

                  {/* Your matching skills */}
                  <div className="mt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Your matching skills ({item.matchingSkills?.length || 0})
                    </h4>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.matchingSkills && item.matchingSkills.length > 0 ? (
                        item.matchingSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-200/80"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Foundational alignment based on course syllabus
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills to develop */}
                  <div className="mt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Skills to develop ({item.missingSkills?.length || 0})
                    </h4>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.missingSkills && item.missingSkills.length > 0 ? (
                        item.missingSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          All core prerequisites verified!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className="mt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Eligibility
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 flex items-start gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item.eligibility}</span>
                    </p>
                  </div>
                </div>

                {/* Selection Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {isSelected ? (
                    <button
                      type="button"
                      id={`btn-role-selected-${idx}`}
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white cursor-default shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Selected Target Role</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`btn-select-role-${idx}`}
                      onClick={() => handleSelectRole(item.role)}
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-extrabold text-white transition-all shadow-sm hover:shadow disabled:opacity-60"
                    >
                      <span>{isSubmitting ? "Saving Selection..." : "Select This Role"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && rolesList.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-slate-900">
            No recommendations generated yet
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Click below to analyze your academic profile and selected skills with Gemini to generate your 3 to 5 recommended roles.
          </p>
          <button
            type="button"
            id="btn-generate-recommendations"
            onClick={() => fetchRecommendations(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Role Recommendations</span>
          </button>
        </div>
      )}

      {/* Advisory Note */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          Placement OS AI Job Role Engine • Evaluates declared skills and academic qualification against industry hiring baselines. Recommendations do not guarantee placement, but guide your personalized roadmap.
        </p>
      </div>
    </div>
  );
};
