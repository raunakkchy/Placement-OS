import React, { useState, useEffect } from "react";
import { User, MCQTestResult, MCQTestSummary } from "../../types";
import { getAuthHeaders } from "../../services/auth";
import { McqTestConfigurator } from "./McqTestConfigurator";
import { McqTestRunner } from "./McqTestRunner";
import { McqTestResultView } from "./McqTestResultView";
import { McqTestHistory } from "./McqTestHistory";
import {
  BrainCircuit,
  History,
  Sparkles,
  PlusCircle,
  AlertCircle,
} from "lucide-react";

interface McqDashboardProps {
  user: User;
  onNavigateTab: (tab: "score" | "jobs" | "roadmap" | "interview" | "mcq") => void;
  onRefreshDashboard?: () => void;
}

export const McqDashboard: React.FC<McqDashboardProps> = ({
  user,
  onNavigateTab,
  onRefreshDashboard,
}) => {
  const [viewMode, setViewMode] = useState<"config" | "runner" | "result" | "history">("config");

  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [activeResult, setActiveResult] = useState<MCQTestResult | null>(null);
  const [historyTests, setHistoryTests] = useState<MCQTestSummary[]>([]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch test history on mount
  useEffect(() => {
    fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/mcq/tests", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryTests(data.tests || []);
      }
    } catch (e) {
      console.warn("Failed to fetch MCQ test history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartTest = async (config: {
    count: number;
    difficulty: "Easy" | "Medium" | "Hard" | "Adaptive";
    testType: "role" | "skill" | "skill_gap" | "roadmap";
    targetSubject?: string;
  }) => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/mcq/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.test) {
          setActiveTest(data.test);
          setViewMode("runner");
        } else {
          setErrorMessage("We couldn't generate this assessment right now. Please try again.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || "We couldn't generate this assessment right now. Please try again.");
      }
    } catch (e: any) {
      setErrorMessage("Network error generating assessment test. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitTest = async (
    testId: string,
    userAnswers: Record<string, string>,
    markedForReview: string[],
    timeTakenSeconds: number
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/mcq/tests/${testId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          userAnswers,
          markedForReview,
          timeTakenSeconds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setActiveResult(data.result);
          setViewMode("result");
          fetchTestHistory();
          if (onRefreshDashboard) onRefreshDashboard();
        }
      } else {
        setErrorMessage("Failed to evaluate test submission. Please try again.");
      }
    } catch (e: any) {
      setErrorMessage("Network error submitting test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectHistoryTest = async (testId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/mcq/tests/${testId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.test) {
          setActiveResult(data.test);
          setViewMode("result");
        }
      }
    } catch (e) {
      console.warn("Error fetching test details:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Header (Only visible when not running live test) */}
      {viewMode !== "runner" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2F54EB]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                AI MCQ Skill Assessments
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                Placement readiness knowledge diagnostics & adaptive testing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => {
                setErrorMessage(null);
                setViewMode("config");
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === "config"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5 text-[#FF5A36]" />
              <span>Start New Test</span>
            </button>

            <button
              onClick={() => {
                setErrorMessage(null);
                setViewMode("history");
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === "history"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="h-3.5 w-3.5 text-[#2F54EB]" />
              <span>History ({historyTests.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View Switcher */}
      {viewMode === "config" && (
        <McqTestConfigurator
          user={user}
          onStartTest={handleStartTest}
          isGenerating={isGenerating}
        />
      )}

      {viewMode === "runner" && activeTest && (
        <McqTestRunner
          test={activeTest}
          onSubmitTest={handleSubmitTest}
          isSubmitting={isSubmitting}
        />
      )}

      {viewMode === "result" && activeResult && (
        <McqTestResultView
          result={activeResult}
          onRetake={() => {
            setViewMode("config");
          }}
          onNavigateToRoadmap={() => {
            onNavigateTab("roadmap");
          }}
          onBackToConfig={() => {
            setViewMode("config");
          }}
        />
      )}

      {viewMode === "history" && (
        <McqTestHistory
          tests={historyTests}
          onSelectTest={handleSelectHistoryTest}
          onStartNewTest={() => setViewMode("config")}
          loading={loadingHistory}
        />
      )}
    </div>
  );
};
