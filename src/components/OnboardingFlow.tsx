import React, { useState, useEffect, useMemo } from "react";
import { User, ReadinessScore, SkillWithLevel } from "../types";
import { getBranchSkillSuggestions } from "../data/branchSkills";
import { getAuthHeaders } from "../services/auth";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  FileText,
  Plus,
  Trash2,
  GraduationCap,
  Code2,
  AlertCircle,
  Loader2,
  X,
  Search,
} from "lucide-react";

interface OnboardingFlowProps {
  user: User;
  onComplete: (updatedUser: User, score: ReadinessScore) => void;
  onCancel?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onComplete, onCancel }) => {
  const storageKey = `placement_os_onboarding_draft_${user.id}`;

  // 1. Get Course and Branch tailored skill suggestions (reusing branchSkills.ts)
  const suggestedSkillsList = useMemo(() => {
    return getBranchSkillSuggestions(user.course, user.branch);
  }, [user.course, user.branch]);

  // Current Step:
  // Step 1: Your Skills
  // Step 2: Skill Level
  // Step 3: Resume (Optional)
  // Step 4: Completion & Readiness Score Summary
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgressText, setSubmissionProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Selected skills with levels
  // CRITICAL RULE: Do NOT automatically add default skills or assign automatic "Intermediate" levels!
  // Every selected skill must have an explicitly confirmed level: "Beginner", "Intermediate", or "Advanced".
  const initialSkills: SkillWithLevel[] = useMemo(() => {
    if (user.skillsWithLevels && user.skillsWithLevels.length > 0) {
      return user.skillsWithLevels.map((s) => ({
        name: s.name,
        level: (s.level === "Beginner" || s.level === "Intermediate" || s.level === "Advanced") ? s.level : ("" as any),
      }));
    }
    if (user.skills && user.skills.length > 0) {
      // Do NOT assign automatic "Intermediate" level; student must confirm level explicitly.
      return user.skills.map((s) => ({ name: s, level: "" as any }));
    }
    // Start strictly empty so no unselected skills are assumed
    return [];
  }, [user.skillsWithLevels, user.skills]);

  const [skillsWithLevels, setSkillsWithLevels] = useState<SkillWithLevel[]>(initialSkills);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  // Step 3: Resume (Optional)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string>(user.resumeFileName || "");

  // Step 4: Completion result
  const [completedResult, setCompletedResult] = useState<{
    user: User;
    readinessScore: ReadinessScore;
  } | null>(null);

  // Restore draft from localStorage on mount (prevent accidental loss of entered data)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 3) {
          setCurrentStep(parsed.currentStep);
        }
        if (Array.isArray(parsed.skillsWithLevels) && parsed.skillsWithLevels.length > 0) {
          setSkillsWithLevels(parsed.skillsWithLevels);
        }
      }
    } catch (e) {
      console.error("Failed to restore onboarding draft:", e);
    }
  }, [storageKey]);

  // Persist draft on changes
  useEffect(() => {
    if (currentStep <= 3) {
      try {
        const draft = {
          currentStep,
          skillsWithLevels,
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (e) {
        // storage quota fallback
      }
    }
  }, [storageKey, currentStep, skillsWithLevels]);

  // Filter suggested skills based on search query
  const filteredSuggestedSkills = useMemo(() => {
    const q = skillSearchQuery.trim().toLowerCase();
    if (!q) return suggestedSkillsList;
    return suggestedSkillsList.filter((s) => s.toLowerCase().includes(q));
  }, [suggestedSkillsList, skillSearchQuery]);

  // Toggle skill selection
  const toggleSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    const existingIndex = skillsWithLevels.findIndex(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existingIndex >= 0) {
      setSkillsWithLevels(skillsWithLevels.filter((_, idx) => idx !== existingIndex));
    } else {
      // Require explicit level selection in Step 2 — do NOT assign automatic "Intermediate"
      setSkillsWithLevels([
        ...skillsWithLevels,
        { name: trimmed, level: "" as any },
      ]);
    }
    setErrorMsg("");
  };

  // Add custom skill
  const handleAddCustomSkill = () => {
    const trimmed = skillSearchQuery.trim();
    if (!trimmed) return;
    const exists = skillsWithLevels.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      // Require explicit level selection in Step 2 — do NOT assign automatic "Intermediate"
      setSkillsWithLevels([...skillsWithLevels, { name: trimmed, level: "" as any }]);
    }
    setSkillSearchQuery("");
    setErrorMsg("");
  };

  // Update proficiency level for a skill
  const updateSkillLevel = (index: number, level: "Beginner" | "Intermediate" | "Advanced") => {
    const next = [...skillsWithLevels];
    next[index] = { ...next[index], level };
    setSkillsWithLevels(next);
  };

  // Remove skill
  const removeSkill = (index: number) => {
    setSkillsWithLevels(skillsWithLevels.filter((_, i) => i !== index));
  };

  // Resume File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const name = file.name.toLowerCase();
    const isAllowed = name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
    if (!isAllowed) {
      setErrorMsg("Unsupported file format. Please upload your resume in PDF or DOCX format.");
      return;
    }

    // Validate size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds 10MB. Please upload a smaller resume document.");
      return;
    }

    setResumeFile(file);
    setResumeFileName(file.name);
    setErrorMsg("");
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeFileName("");
    setErrorMsg("");
  };

  // Final Submission Handler (Used by both "Complete Profile" and "Skip for now")
  const handleCompleteOnboarding = async (skipResume: boolean = false) => {
    if (skillsWithLevels.length === 0) {
      setErrorMsg("Please select at least one skill to continue.");
      setCurrentStep(1);
      return;
    }

    // Explicit Level Requirement: All selected skills must have a confirmed level
    const unconfirmedSkills = skillsWithLevels.filter(
      (s) => !s.level || (s.level !== "Beginner" && s.level !== "Intermediate" && s.level !== "Advanced")
    );
    if (unconfirmedSkills.length > 0) {
      setErrorMsg(
        `Please explicitly select a proficiency level (Beginner, Intermediate, or Advanced) for: ${unconfirmedSkills.map((u) => u.name).join(", ")}`
      );
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const progressStages = [
      "Securing student skills and proficiency metadata...",
      "Analyzing course and branch alignment...",
      "Synthesizing baseline readiness scorecard...",
    ];

    let stageIdx = 0;
    setSubmissionProgressText(progressStages[0]);
    const interval = setInterval(() => {
      stageIdx++;
      if (stageIdx < progressStages.length) {
        setSubmissionProgressText(progressStages[stageIdx]);
      }
    }, 900);

    try {
      const headers = getAuthHeaders();

      let bodyPayload: BodyInit;
      // If a binary resume file is provided, send multipart FormData
      if (!skipResume && resumeFile) {
        const formData = new FormData();
        formData.append("skillsWithLevels", JSON.stringify(skillsWithLevels));
        formData.append("resume", resumeFile);
        // Ensure manual Content-Type does not override browser multipart boundary
        delete headers["Content-Type"];
        delete headers["content-type"];
        bodyPayload = formData;
      } else {
        // Send fast, reliable JSON payload when no binary file is attached
        headers["Content-Type"] = "application/json";
        bodyPayload = JSON.stringify({
          skillsWithLevels,
          resumeFileName: !skipResume ? resumeFileName : undefined,
        });
      }

      const executeFetch = async () => {
        return await fetch("/api/onboarding/complete", {
          method: "POST",
          headers,
          credentials: "include",
          body: bodyPayload,
        });
      };

      let res: Response;
      try {
        res = await executeFetch();
      } catch (networkErr: any) {
        // Auto-retry once on transient connection failure
        console.warn("Initial onboarding submission failed, retrying once...", networkErr);
        await new Promise((r) => setTimeout(r, 600));
        res = await executeFetch();
      }

      clearInterval(interval);

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        console.warn("Non-JSON response from /api/onboarding/complete:", res.status, text.slice(0, 300));
        if (res.status === 413) {
          throw new Error("Resume file exceeds the 10MB limit. Please upload a smaller file.");
        }
        if (res.status === 504 || res.status === 502) {
          throw new Error("Server processing timed out. Please click 'Complete Profile' once more to finish.");
        }
        throw new Error("Unable to save student skills profile. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete onboarding.");
      }

      // Clear draft on success
      localStorage.removeItem(storageKey);

      setCompletedResult({
        user: data.user,
        readinessScore: data.readinessScore,
      });
      setCurrentStep(4);
    } catch (err: any) {
      clearInterval(interval);
      console.error("Onboarding submission failed:", err);
      const isNetworkError = err?.message?.includes("Failed to fetch") || err?.name === "TypeError";
      setErrorMsg(
        isNetworkError
          ? "Network connection issue. Please check your connection and click 'Complete Profile' again."
          : (err.message || "An unexpected error occurred while completing onboarding.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-xs">
              OS
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
                Placement OS
              </span>
              <span className="ml-2 text-xs font-medium text-slate-500 hidden sm:inline">
                Student Profile Setup
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-slate-800">{user.fullName}</span>
              <span className="text-slate-400">•</span>
              <span className="font-medium text-slate-600">
                {user.course ? `${user.course} in ` : ""}{user.branch}
              </span>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Step Progress Indicator (Steps 1 to 3) */}
        {currentStep <= 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span className="text-indigo-600 uppercase tracking-wider">
                Step {currentStep} of 3:{" "}
                {currentStep === 1 && "Your Skills"}
                {currentStep === 2 && "Skill Level"}
                {currentStep === 3 && "Resume"}
              </span>
              <span className="text-slate-400 font-medium">
                {Math.round((currentStep / 3) * 100)}% Completed
              </span>
            </div>
            {/* Progress bar line */}
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Notice: </strong>
              {errorMsg}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SKILLS SELECTION                                                  */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Step 1 of 3
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Tell us about your skills
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Based on your course and branch, we&apos;ve suggested some relevant skills. Select the skills you know.
              </p>
            </div>

            {/* Course & Branch Badge */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                <span className="text-slate-500">Verified Program:</span>
                <span className="font-bold text-slate-900">
                  {user.course ? `${user.course} • ` : ""}{user.branch}
                </span>
              </div>
              <span className="text-slate-500 font-medium hidden sm:inline">
                {user.college}
              </span>
            </div>

            {/* Search or Add Skill Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Search or Add Skills
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    id="input-skill-search"
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    placeholder="Search suggested skills or type any custom skill (e.g. Python, SQL, React)..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  id="btn-add-custom-skill"
                  onClick={handleAddCustomSkill}
                  disabled={!skillSearchQuery.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Suggested Skills Grid / Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Suggested for {user.branch}
                </span>
                <span className="text-[11px] text-slate-400">Click to select/unselect</span>
              </div>

              {filteredSuggestedSkills.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No suggested skills match &quot;{skillSearchQuery}&quot;. Click &quot;Add&quot; above to add it as a custom skill.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {filteredSuggestedSkills.map((sName) => {
                    const isSelected = skillsWithLevels.some(
                      (s) => s.name.toLowerCase() === sName.toLowerCase()
                    );
                    return (
                      <button
                        key={sName}
                        type="button"
                        onClick={() => toggleSkill(sName)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all flex items-center gap-2 border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span>{sName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Currently Selected Skills Summary Chips */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Your Selected Skills ({skillsWithLevels.length})
                </span>
                {skillsWithLevels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSkillsWithLevels([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {skillsWithLevels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  No skills selected yet. Select the skills you know from the suggestions above, or search and add them.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsWithLevels.map((skill, idx) => (
                    <div
                      key={skill.name + idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-900"
                    >
                      <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{skill.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(idx)}
                        className="text-indigo-400 hover:text-rose-600 ml-1"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Continue to Step 2 Button */}
            <div className="pt-4 flex justify-end border-t border-slate-100">
              <button
                type="button"
                id="btn-next-step-1"
                onClick={() => {
                  if (skillsWithLevels.length === 0) {
                    setErrorMsg("Please select at least 1 skill you know before continuing.");
                    return;
                  }
                  setErrorMsg("");
                  setCurrentStep(2);
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
              >
                <span>Continue to Skill Levels</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SKILL LEVELS                                                      */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Step 2 of 3
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Set your skill levels
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Provide a level for each selected skill: <strong>Beginner</strong>, <strong>Intermediate</strong>, or <strong>Advanced</strong>.
              </p>
            </div>

            {/* Selected Skills List with Level Segmented Selectors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Skills Requiring Proficiency Level ({skillsWithLevels.length})
                </span>
                <span className="text-[11px] text-slate-400">Required for each skill</span>
              </div>

              {skillsWithLevels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  No skills selected. Please go back to Step 1 and select your skills.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {skillsWithLevels.map((skill, idx) => {
                    const hasLevel = skill.level === "Beginner" || skill.level === "Intermediate" || skill.level === "Advanced";
                    return (
                      <div
                        key={skill.name + idx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs transition-colors ${
                          hasLevel
                            ? "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                            : "border-amber-300 bg-amber-50/40 ring-1 ring-amber-300"
                        }`}
                      >
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="text-sm font-bold text-slate-900">{skill.name}</span>
                          {!hasLevel && (
                            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                              Level Required
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* 3 Strict Levels: Beginner, Intermediate, Advanced */}
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                            {(["Beginner", "Intermediate", "Advanced"] as const).map((lvl) => {
                              const isSelected = skill.level === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateSkillLevel(idx, lvl)}
                                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                    isSelected
                                      ? lvl === "Advanced"
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : lvl === "Intermediate"
                                        ? "bg-indigo-600 text-white shadow-2xs"
                                        : "bg-slate-800 text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                  }`}
                                >
                                  {lvl}
                                </button>
                              );
                            })}
                          </div>

                          {/* Remove Skill Button */}
                          <button
                            type="button"
                            onClick={() => removeSkill(idx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Remove skill"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                id="btn-back-step-2"
                onClick={() => {
                  setErrorMsg("");
                  setCurrentStep(1);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Skills</span>
              </button>

              <button
                type="button"
                id="btn-next-step-2"
                onClick={() => {
                  if (skillsWithLevels.length === 0) {
                    setErrorMsg("Please select at least 1 skill before proceeding.");
                    setCurrentStep(1);
                    return;
                  }
                  const unconfirmed = skillsWithLevels.filter(
                    (s) => !s.level || (s.level !== "Beginner" && s.level !== "Intermediate" && s.level !== "Advanced")
                  );
                  if (unconfirmed.length > 0) {
                    setErrorMsg(
                      `Please select a proficiency level (Beginner, Intermediate, or Advanced) for: ${unconfirmed.map((u) => u.name).join(", ")}`
                    );
                    return;
                  }
                  setErrorMsg("");
                  setCurrentStep(3);
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-md"
              >
                <span>Continue to Resume</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: OPTIONAL RESUME UPLOAD                                            */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Step 3 of 3 (Optional)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Upload your Resume
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Your resume helps Placement OS understand your skills, projects and experience more accurately.
              </p>
            </div>

            {/* Resume Dropzone & File Status */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 p-6 sm:p-8 text-center transition-all">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Upload className="h-7 w-7" />
              </div>

              {resumeFile || resumeFileName ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span>{resumeFile ? resumeFile.name : resumeFileName}</span>
                    {resumeFile && (
                      <span className="text-slate-400 font-normal">
                        ({(resumeFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      className="ml-2 text-slate-400 hover:text-rose-600 p-0.5"
                      title="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline">
                      Choose a different file
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload your resume in PDF or DOCX
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Supports .pdf, .docx up to 10MB
                  </p>
                  <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer shadow-sm transition-all">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-3 text-[11px] text-slate-400">
                    Resume upload is completely optional. You can skip and upload it later.
                  </p>
                </div>
              )}
            </div>

            {/* Profile Overview Card before submission */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700 block text-[11px]">
                Profile Summary for Placement OS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Academic Profile</span>
                  <span className="font-semibold text-slate-900">
                    {user.course ? `${user.course} in ` : ""}{user.branch} (CGPA: {user.cgpa})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Skills Declared</span>
                  <span className="font-semibold text-indigo-600">
                    {skillsWithLevels.length} skill(s) with verified proficiency levels
                  </span>
                </div>
              </div>
            </div>

            {/* Two Clear Actions: [ Skip for now ] and [ Upload Resume / Complete Profile ] */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-back-step-3"
                  onClick={() => {
                    setErrorMsg("");
                    setCurrentStep(2);
                  }}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  id="btn-skip-resume"
                  onClick={() => handleCompleteOnboarding(true)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 w-full sm:w-auto text-center"
                >
                  Skip for now
                </button>
              </div>

              <button
                type="button"
                id="btn-complete-onboarding"
                onClick={() => handleCompleteOnboarding(false)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-75 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>{resumeFile ? "Upload & Complete" : "Complete Profile"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Submission Progress text */}
            {isSubmitting && (
              <div className="rounded-xl bg-slate-900 text-white p-4 text-xs flex items-center gap-3 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>{submissionProgressText}</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: CELEBRATION & READINESS SCORE PREVIEW                             */}
        {/* ========================================================================= */}
        {currentStep === 4 && completedResult && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg mx-auto">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Profile Setup Complete!
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Your skills and placement profile have been registered for <strong>{user.fullName}</strong>.
              </p>
            </div>

            {/* Score Showcase Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-300">
                    Placement OS Benchmark
                  </span>
                  <h3 className="text-lg font-bold text-white">Placement Readiness Score</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-black text-white">
                    {completedResult.readinessScore.overallScore}
                  </span>
                  <span className="text-indigo-300 text-lg font-bold">/100</span>
                </div>
              </div>

              {/* Estimated Job Readiness */}
              <div className="mt-4 pt-2">
                <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-300">AI Estimated Job-Readiness:</span>
                  <span className="text-emerald-300 font-extrabold text-sm">
                    {completedResult.readinessScore.jobReadinessPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    style={{ width: `${completedResult.readinessScore.jobReadinessPercentage}%` }}
                  />
                </div>
              </div>

              {/* 6-Pillar Quick Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Academics</span>
                  <span className="font-bold text-white">{completedResult.readinessScore.academicsScore}/100</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Technical Skills</span>
                  <span className="font-bold text-white">{completedResult.readinessScore.technicalSkillsScore}/100</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Projects</span>
                  <span className="font-bold text-white">{completedResult.readinessScore.projectsScore}/100</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Resume</span>
                  <span className="font-bold text-white">
                    {completedResult.readinessScore.resumeAssessed ? `${completedResult.readinessScore.resumeScore}/100` : "Not Uploaded"}
                  </span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Communication</span>
                  <span className="font-bold text-white">
                    {completedResult.readinessScore.communicationAssessed ? `${completedResult.readinessScore.communicationScore}/100` : "Not Assessed"}
                  </span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-slate-400 text-[10px] block">Interview Prep</span>
                  <span className="font-bold text-white">
                    {completedResult.readinessScore.interviewAssessed ? `${completedResult.readinessScore.interviewReadinessScore}/100` : "Not Assessed"}
                  </span>
                </div>
              </div>
            </div>

            {/* Launch Dashboard Button */}
            <div className="pt-4 text-center">
              <button
                type="button"
                id="btn-launch-dashboard"
                onClick={() => onComplete(completedResult.user, completedResult.readinessScore)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-extrabold text-white hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
              >
                <span>Enter Placement OS Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-2 text-xs text-slate-400">
                You can update your skills and resume anytime from your dashboard.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Placement OS • Career Readiness Platform • Continuous Evaluation
      </footer>
    </div>
  );
};
