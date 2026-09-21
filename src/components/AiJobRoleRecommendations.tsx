import React, { useState, useEffect } from "react";
import { User, AiRecommendedJobRole, StudentAiRecommendations } from "../types";
import { getAuthHeaders } from "../services/auth";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Check,
  Code2,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
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
  const [activeFilter, setActiveFilter] = useState<"Recommended" | "Explore All" | "Saved">("Recommended");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

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

      const authHeaders = getAuthHeaders();
      const res = await fetch(`/api/ai/job-recommendations${forceRefresh ? "?forceRefresh=true" : ""}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          "x-user-id": user.id,
          "x-user-email": user.email,
        },
        credentials: "include",
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

      const authHeaders = getAuthHeaders();
      const res = await fetch("/api/ai/select-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          "x-user-id": user.id,
          "x-user-email": user.email,
        },
        credentials: "include",
        body: JSON.stringify({ role: roleName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save selected role (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        onUserUpdate({
          ...user,
          selectedRole: roleName,
          aiJobRecommendations: recommendations || undefined,
        });
        setSelectionSuccess(`Role "${roleName}" is now your active target career milestone.`);
        setTimeout(() => setSelectionSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error("Error selecting role:", err);
      setError(err.message || "Failed to select role. Please try again.");
    } finally {
      setSelectingRole(null);
    }
  };

  const selectedRole = user.selectedRole;
  const rolesList: AiRecommendedJobRole[] = recommendations?.recommendedRoles || [
    {
      role: "Frontend Developer",
      whyMatch: "Strong alignment with web technologies and coursework projects.",
      requiredSkills: ["React", "JavaScript", "HTML", "CSS", "Tailwind"],
      matchingSkills: ["React", "JavaScript", "HTML", "CSS"],
      missingSkills: ["Next.js", "TypeScript Testing"],
      eligibility: "Eligible for standard campus placements",
      matchIndicator: 82,
    },
    {
      role: "Full Stack Developer",
      whyMatch: "Foundational knowledge in frontend and client-server architecture.",
      requiredSkills: ["Node.js", "React", "SQL", "Express", "REST APIs"],
      matchingSkills: ["React", "SQL", "REST APIs"],
      missingSkills: ["Node.js", "System Design"],
      eligibility: "Eligible with backend project addition",
      matchIndicator: 76,
    },
    {
      role: "Web Developer",
      whyMatch: "Core proficiency in foundational markup and modern scripts.",
      requiredSkills: ["HTML", "CSS", "JavaScript", "Responsive Design"],
      matchingSkills: ["HTML", "CSS", "JavaScript"],
      missingSkills: ["Performance Optimization"],
      eligibility: "Fully eligible",
      matchIndicator: 72,
    },
    {
      role: "UI Developer",
      whyMatch: "Demonstrated interest in component architecture and CSS frameworks.",
      requiredSkills: ["CSS3", "Figma", "Tailwind CSS", "React Components"],
      matchingSkills: ["CSS3", "Tailwind CSS"],
      missingSkills: ["Figma to Code", "Accessibility Standards"],
      eligibility: "Fully eligible",
      matchIndicator: 66,
    },
  ];

  // Top featured role (the currently selected role, or the #1 match)
  const featuredRole =
    rolesList.find((r) => r.role.toLowerCase() === selectedRole?.toLowerCase()) || rolesList[0];
  const otherRoles = rolesList.filter((r) => r.role !== featuredRole?.role);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ========================================================== */}
      {/* HEADER & FILTER PILLS (Matching Reference 2)               */}
      {/* ========================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>AI Job Role Recommendations</span>
            <Sparkles className="h-5 w-5 text-[#FF5A36]" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Based on your profile, skills and academic details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing || loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#2F54EB]" : "text-slate-500"}`} />
          <span>{refreshing ? "Evaluating..." : "Re-evaluate Profile"}</span>
        </button>
      </div>

      {/* Filter Tabs matching Reference 2 */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveFilter("Recommended")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Recommended"
              ? "bg-[#2F54EB] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Recommended
        </button>
        <button
          onClick={() => setActiveFilter("Explore All")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Explore All"
              ? "bg-[#2F54EB] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Explore All
        </button>
        <button
          onClick={() => setActiveFilter("Saved")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Saved"
              ? "bg-[#2F54EB] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Saved
        </button>
      </div>

      {/* Alert Notices */}
      {selectionSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{selectionSuccess}</span>
          </div>
          {onNavigateToRoadmap && (
            <button
              onClick={onNavigateToRoadmap}
              className="text-xs font-bold text-emerald-700 underline shrink-0"
            >
              Go to Roadmap &rarr;
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchRecommendations(true)}
            className="text-rose-900 underline font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* FEATURED TOP ROLE CARD (Matching Reference 2)              */}
      {/* ========================================================== */}
      {featuredRole && (
        <div className="rounded-3xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          {/* Top Row: Icon + Title + Match Badge + Chevron */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F54EB] text-white shadow-xs shrink-0">
                <Code2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                    {featuredRole.role}
                  </h2>
                  {selectedRole === featuredRole.role && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Active Target
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5">
                  {featuredRole.matchIndicator}% Profile Match
                </div>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
          </div>

          {/* Skill Pills */}
          <div className="flex flex-wrap gap-2">
            {featuredRole.requiredSkills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* 3 Value Bullets matching Reference 2 */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>
                {featuredRole.matchingSkills.length} Matching Strengths (
                {featuredRole.matchingSkills.slice(0, 3).join(", ")})
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-50 text-[#FF5A36] shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <span>
                {featuredRole.missingSkills.length} Skill Gaps to Bridge (
                {featuredRole.missingSkills.slice(0, 2).join(", ")})
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[#2F54EB] shrink-0">
                <Info className="h-3.5 w-3.5" />
              </span>
              <span>{featuredRole.eligibility || "Standard Campus Placement Eligible"}</span>
            </div>
          </div>

          {/* Action Button: Royal Blue Full Width Button matching Reference 2 */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {selectedRole === featuredRole.role ? (
              <>
                <div className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Currently Anchored as Your Placement Target</span>
                </div>
                {onNavigateToRoadmap && (
                  <button
                    onClick={onNavigateToRoadmap}
                    className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#2F54EB] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>View Roadmap &rarr;</span>
                  </button>
                )}
              </>
            ) : (
              <button
                disabled={selectingRole === featuredRole.role}
                onClick={() => handleSelectRole(featuredRole.role)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#2F54EB] hover:bg-blue-700 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>
                  {selectingRole === featuredRole.role
                    ? "Setting Target..."
                    : "Select as Placement Target Goal &rarr;"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* "OTHER RECOMMENDED ROLES" LIST (Matching Reference 2)      */}
      {/* ========================================================== */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Other Recommended Roles
        </h3>

        <div className="space-y-3">
          {otherRoles.map((role, idx) => {
            const isSelected = selectedRole === role.role;
            const isSubmitting = selectingRole === role.role;

            return (
              <div
                key={idx}
                className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#2F54EB] shrink-0">
                      <Code2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        {role.role}
                      </h4>
                      <div className="text-xs font-bold text-emerald-600">
                        {role.matchIndicator}% Match
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting || isSelected}
                    onClick={() => handleSelectRole(role.role)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 hover:bg-[#2F54EB] hover:text-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {isSelected ? "Selected" : isSubmitting ? "Selecting..." : "Select Role"}
                  </button>
                </div>

                {/* Skill Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {role.requiredSkills.slice(0, 4).map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 text-[10px] font-semibold text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
