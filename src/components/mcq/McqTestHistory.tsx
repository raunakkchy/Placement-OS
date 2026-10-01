import React from "react";
import { MCQTestSummary } from "../../types";
import {
  Award,
  Clock,
  Calendar,
  ChevronRight,
  CheckCircle2,
  FileQuestion,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface McqTestHistoryProps {
  tests: MCQTestSummary[];
  onSelectTest: (testId: string) => void;
  onStartNewTest: () => void;
  loading: boolean;
}

export const McqTestHistory: React.FC<McqTestHistoryProps> = ({
  tests,
  onSelectTest,
  onStartNewTest,
  loading,
}) => {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-12 border border-slate-200/80 text-center space-y-3">
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-3 border-[#2F54EB] border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">
          Loading assessment history...
        </p>
      </div>
    );
  }

  if (!tests || tests.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-12 border border-slate-200/80 shadow-2xs text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-blue-50 text-[#2F54EB] flex items-center justify-center">
          <FileQuestion className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900">
            No Assessments Completed Yet
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            Test your knowledge, identify your weak technical areas, and tune your learning roadmap with AI assessments.
          </p>
        </div>

        <button
          onClick={onStartNewTest}
          className="px-6 py-3 rounded-2xl bg-[#FF5A36] hover:bg-[#e04825] text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Take Your First Test</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-900">
          Completed Assessment History ({tests.length})
        </h3>
        <button
          onClick={onStartNewTest}
          className="text-xs font-bold text-[#2F54EB] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Start New Test</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {tests.map((t) => {
          const formattedDate = new Date(t.submittedAt || t.startedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const minutesTaken = Math.floor((t.timeTakenSeconds || 0) / 60);

          return (
            <div
              key={t.id}
              onClick={() => onSelectTest(t.id)}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2F54EB] text-[10px] font-bold">
                    {t.testTypeLabel || "Assessment"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#2F54EB] transition-colors truncate">
                  {t.targetSubject || t.role} Assessment
                </h4>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                  <span>{t.totalQuestions} Questions</span>
                  <span>•</span>
                  <span>{t.accuracy || 0}% Accuracy</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {minutesTaken} mins
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {t.percentage}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {t.score}/{t.totalQuestions} Marks
                  </div>
                </div>

                <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-[#2F54EB] group-hover:text-white text-slate-500 flex items-center justify-center transition-all">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
