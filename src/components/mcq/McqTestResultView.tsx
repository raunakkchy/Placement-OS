import React, { useState } from "react";
import { MCQTestResult } from "../../types";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Brain,
  ListChecks,
} from "lucide-react";

interface McqTestResultViewProps {
  result: MCQTestResult;
  onRetake: () => void;
  onNavigateToRoadmap: () => void;
  onBackToConfig: () => void;
}

export const McqTestResultView: React.FC<McqTestResultViewProps> = ({
  result,
  onRetake,
  onNavigateToRoadmap,
  onBackToConfig,
}) => {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const questions = result.questions || [];
  const userAnswers = result.userAnswers || {};

  const filteredQuestions = questions.filter((q) => {
    const ans = userAnswers[q.id] || "";
    const isAnswered = ans.length > 0;
    const isCorrect = isAnswered && ans === q.correctAnswer;

    if (filter === "correct") return isCorrect;
    if (filter === "incorrect") return isAnswered && !isCorrect;
    if (filter === "unanswered") return !isAnswered;
    return true;
  });

  const minutesTaken = Math.floor((result.timeTakenSeconds || 0) / 60);
  const secondsTaken = (result.timeTakenSeconds || 0) % 60;

  return (
    <div className="space-y-8 select-none">
      {/* Result Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#111315] via-[#1E232A] to-[#2B303A] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#2F54EB]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-[#FF5A36]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-blue-200">
              <Award className="h-3.5 w-3.5 text-[#FF5A36]" />
              <span>Assessment Completed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {result.targetSubject || result.role} Assessment Result
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {result.testTypeLabel || "Assessment"} • {result.difficulty} Difficulty
            </p>
          </div>

          {/* Big Score Box */}
          <div className="flex items-center gap-4 bg-white/10 border border-white/15 p-4 rounded-2xl backdrop-blur-md self-stretch md:self-auto justify-around sm:justify-start">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-[#FF5A36] tabular-nums">
                {result.score} <span className="text-xl text-slate-400 font-bold">/ {result.totalQuestions}</span>
              </div>
              <div className="text-[11px] uppercase font-bold text-slate-300 tracking-wider mt-0.5">
                Score
              </div>
            </div>

            <div className="h-10 w-px bg-white/20" />

            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums">
                {result.percentage}%
              </div>
              <div className="text-[11px] uppercase font-bold text-slate-300 tracking-wider mt-0.5">
                Percentage
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Stats Strip */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium relative z-10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-extrabold text-white text-sm">{result.correctCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Correct</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-extrabold text-white text-sm">{result.incorrectCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Incorrect</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-slate-400 shrink-0" />
            <div>
              <div className="font-extrabold text-white text-sm">{result.unansweredCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Unanswered</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-400 shrink-0" />
            <div>
              <div className="font-extrabold text-white text-sm">{minutesTaken}m {secondsTaken}s</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Time Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Performance Analysis Card */}
      {result.aiAnalysis && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#FF5A36]" />
            <h3 className="text-base font-bold text-slate-900">
              AI Personalized Analysis
            </h3>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {result.aiAnalysis.overallFeedback}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What You Know */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>What You Know</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-semibold pl-5 list-disc">
                {result.aiAnalysis.whatYouKnow.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* What You Need To Improve */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>What Needs Improvement</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-semibold pl-5 list-disc">
                {result.aiAnalysis.whatYouNeedToImprove.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Next Step */}
          {result.aiAnalysis.recommendedNextStep && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex items-start gap-3">
              <Brain className="h-5 w-5 text-[#2F54EB] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Recommended Next Action
                </div>
                <p className="text-xs font-semibold text-slate-800 mt-1 leading-relaxed">
                  {result.aiAnalysis.recommendedNextStep}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Integration Banner (Skill Gap & Roadmap Updates) */}
      {((result.detectedSkillGaps && result.detectedSkillGaps.length > 0) || (result.updatedRoadmapTopics && result.updatedRoadmapTopics.length > 0)) && (
        <div className="rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#2F54EB] uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Placement OS System Adaptation</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-relaxed max-w-2xl">
              Your test score has automatically updated your <strong>Skill Gap Analysis</strong> and bumped priority on <strong>{result.updatedRoadmapTopics?.length || 1} roadmap topics</strong>.
            </p>
          </div>

          <button
            onClick={onNavigateToRoadmap}
            className="px-5 py-2.5 rounded-2xl bg-[#2F54EB] hover:bg-[#2040c5] text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Updated Roadmap</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Skill & Topic Breakdown Cards */}
      {Array.isArray(result.skillAnalysis) && result.skillAnalysis.length > 0 && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#2F54EB]" />
            <h3 className="text-base font-bold text-slate-900">
              Skill-Wise Performance Breakdown
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {result.skillAnalysis.map((item, idx) => {
              const isStrong = item.percentage >= 80;
              const isWeak = item.percentage < 60;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isStrong
                          ? "bg-emerald-100 text-emerald-800"
                          : isWeak
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">{item.correct} / {item.total} Correct</span>
                    <span className="text-slate-900">{item.percentage}%</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isStrong ? "bg-emerald-500" : isWeak ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review Questions Section */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Detailed Question Review
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Review correct answers, explanations, and your selections.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({questions.length})
            </button>
            <button
              onClick={() => setFilter("correct")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filter === "correct" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Correct ({result.correctCount})
            </button>
            <button
              onClick={() => setFilter("incorrect")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filter === "incorrect" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-600 hover:text-rose-700"
              }`}
            >
              Incorrect ({result.incorrectCount})
            </button>
            <button
              onClick={() => setFilter("unanswered")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filter === "unanswered" ? "bg-slate-700 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unanswered ({result.unansweredCount})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const userAns = userAnswers[q.id] || "";
            const isAnswered = userAns.length > 0;
            const isCorrect = isAnswered && userAns === q.correctAnswer;
            const isExpanded = expandedQuestion === q.id || filter !== "all";

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                  isCorrect
                    ? "border-emerald-200/80 bg-emerald-50/20"
                    : isAnswered
                    ? "border-rose-200/80 bg-rose-50/20"
                    : "border-slate-200/80 bg-slate-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-500">
                        Q{questions.indexOf(q) + 1}.
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {q.topic || q.skill}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {q.difficulty}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed pt-1">
                      {q.question}
                    </h4>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Correct
                      </span>
                    ) : isAnswered ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        Incorrect
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold">
                        Unanswered
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-500 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Options Review Details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-3 text-xs font-semibold">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isUserSel = userAns === opt;
                        const isCorrectOpt = q.correctAnswer === opt;

                        let optClass = "bg-white border-slate-200/80 text-slate-700";
                        if (isCorrectOpt) {
                          optClass = "bg-emerald-100/80 border-emerald-300 text-emerald-950 font-bold";
                        } else if (isUserSel && !isCorrect) {
                          optClass = "bg-rose-100/80 border-rose-300 text-rose-950 font-bold";
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${optClass}`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-extrabold opacity-60">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>

                            {isCorrectOpt && (
                              <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0">
                                Correct Answer
                              </span>
                            )}
                            {isUserSel && !isCorrectOpt && (
                              <span className="text-[10px] uppercase font-bold text-rose-700 shrink-0">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs font-medium space-y-1">
                        <div className="font-bold text-[#2F54EB] text-[11px] uppercase tracking-wider">
                          AI Explanation
                        </div>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          onClick={onBackToConfig}
          className="px-6 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          Back to Assessment Hub
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onRetake}
            className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retake Test</span>
          </button>

          <button
            onClick={onNavigateToRoadmap}
            className="px-6 py-3 rounded-2xl bg-[#2F54EB] hover:bg-[#2040c5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>Continue Roadmap</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
