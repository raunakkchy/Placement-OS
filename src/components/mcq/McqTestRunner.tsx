import React, { useState, useEffect, useRef } from "react";
import { MCQTestResult, MCQQuestion } from "../../types";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  HelpCircle,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";

interface McqTestRunnerProps {
  test: {
    id: string;
    role: string;
    testTypeLabel: string;
    targetSubject?: string;
    difficulty: string;
    totalQuestions: number;
    timeLimitMinutes: number;
    questions: MCQQuestion[];
    startedAt: string;
  };
  onSubmitTest: (
    testId: string,
    userAnswers: Record<string, string>,
    markedForReview: string[],
    timeTakenSeconds: number
  ) => void;
  isSubmitting: boolean;
}

export const McqTestRunner: React.FC<McqTestRunnerProps> = ({
  test,
  onSubmitTest,
  isSubmitting,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isPaletteMobileOpen, setIsPaletteMobileOpen] = useState<boolean>(false);

  // Timer calculation
  const totalSeconds = (test.timeLimitMinutes || test.totalQuestions || 10) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const timeTakenSeconds = Math.max(0, totalSeconds - secondsRemaining);

  const handleAutoSubmit = () => {
    onSubmitTest(test.id, userAnswers, Array.from(markedForReview), timeTakenSeconds);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleClearAnswer = (questionId: string) => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handleToggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const currentQuestion = test.questions[currentIndex] || test.questions[0];
  const totalQuestions = test.questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const markedCount = markedForReview.size;

  const minutesStr = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
  const secondsStr = String(secondsRemaining % 60).padStart(2, "0");
  const isTimeWarning = secondsRemaining <= 120; // 2 mins remaining warning

  return (
    <div className="space-y-6 select-none">
      {/* Test Top Bar with Timer */}
      <div className="rounded-3xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-[#2F54EB]">
              {test.testTypeLabel || "Assessment"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              {test.difficulty}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {test.targetSubject || test.role} Assessment
          </h2>
        </div>

        {/* Timer Box */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all ${
              isTimeWarning
                ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <Clock className={`h-4 w-4 ${isTimeWarning ? "text-rose-600" : "text-[#FF5A36]"}`} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Time Remaining
              </div>
              <div className="text-base font-black tabular-nums tracking-tight">
                {minutesStr}:{secondsStr}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-[#FF5A36] hover:bg-[#e04825] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
          <span>Progress: {answeredCount} of {totalQuestions} Answered</span>
          <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2F54EB] rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Runner Area: Split Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Panel (8 Columns on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                {markedForReview.has(currentQuestion.id) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                    <Bookmark className="h-3 w-3 fill-purple-600" />
                    Marked for Review
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {currentQuestion.topic || currentQuestion.skill}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = userAnswers[currentQuestion.id] === opt;
                const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                      isSelected
                        ? "border-[#2F54EB] bg-blue-50/70 text-slate-900 shadow-2xs font-bold"
                        : "border-slate-200/80 hover:border-slate-300 bg-white text-slate-800 font-semibold"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#2F54EB] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {optionLabel}
                    </div>
                    <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation & Question Control Toolbar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleMarkForReview(currentQuestion.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    markedForReview.has(currentQuestion.id)
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${markedForReview.has(currentQuestion.id) ? "fill-purple-700" : ""}`} />
                  <span>{markedForReview.has(currentQuestion.id) ? "Unmark" : "Mark for Review"}</span>
                </button>

                {userAnswers[currentQuestion.id] && (
                  <button
                    type="button"
                    onClick={() => handleClearAnswer(currentQuestion.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear Selection</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === totalQuestions - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-[#2F54EB] hover:bg-[#2040c5] text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar (4 Columns on Desktop) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Question Palette
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-emerald-500 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-100 border border-slate-300 shrink-0" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-purple-500 shrink-0" />
                <span>Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border-2 border-[#2F54EB] bg-blue-50 shrink-0" />
                <span>Current</span>
              </div>
            </div>

            {/* Question Grid Numbers */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {test.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(userAnswers[q.id]);
                const isMarked = markedForReview.has(q.id);

                let btnClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
                if (isMarked) {
                  btnClass = "bg-purple-600 text-white font-bold border-purple-700";
                } else if (isAnswered) {
                  btnClass = "bg-emerald-600 text-white font-bold border-emerald-700";
                }

                if (isCurrent) {
                  btnClass += " ring-2 ring-offset-1 ring-[#2F54EB] font-black";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-full rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-[#FF5A36] hover:bg-[#e04825] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Final Submit Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-[#FF5A36]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Submit Your Assessment?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to finalize and submit your test answers for evaluation?
              </p>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <div>
                <div className="text-base font-extrabold text-emerald-600">{answeredCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Answered</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-500">{unansweredCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Unanswered</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-purple-600">{markedCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Marked</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAutoSubmit}
                className="flex-1 py-3 rounded-2xl bg-[#FF5A36] hover:bg-[#e04825] text-white text-xs font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <span>Yes, Submit Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
