import React, { useState } from "react";
import { User } from "../../types";
import {
  BrainCircuit,
  Zap,
  Target,
  BookOpen,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface McqTestConfiguratorProps {
  user: User;
  onStartTest: (config: {
    count: number;
    difficulty: "Easy" | "Medium" | "Hard" | "Adaptive";
    testType: "role" | "skill" | "skill_gap" | "roadmap";
    targetSubject?: string;
  }) => void;
  isGenerating: boolean;
}

export const McqTestConfigurator: React.FC<McqTestConfiguratorProps> = ({
  user,
  onStartTest,
  isGenerating,
}) => {
  const selectedRole = user.selectedRole || user.targetRoles?.[0] || "Frontend Developer";
  const userSkills = user.skills || ["JavaScript", "HTML", "CSS", "React"];

  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Adaptive">("Adaptive");
  const [testType, setTestType] = useState<"role" | "skill" | "skill_gap" | "roadmap">("role");
  const [selectedSkill, setSelectedSkill] = useState<string>(userSkills[0] || "JavaScript");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartTest({
      count: questionCount,
      difficulty,
      testType,
      targetSubject: testType === "skill" ? selectedSkill : selectedRole,
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#111315] via-[#1E232A] to-[#252A30] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-blue-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#FF5A36]" />
            <span>AI-Powered Adaptive Assessment</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Test Your Knowledge. Identify Gaps.
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
            Test your knowledge. Identify your weak areas. Improve your placement readiness.
            Our adaptive AI evaluates your answers in real time, updates your skill gaps, and tunes your personalized learning roadmap.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Target className="h-3.5 w-3.5 text-[#FF5A36]" />
              Role: <strong className="text-white">{selectedRole}</strong>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Award className="h-3.5 w-3.5 text-blue-400" />
              Program: <strong className="text-white">{user.course || "B.Tech"} ({user.branch || "CSE"})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Test Type Selection */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-[#2F54EB]" />
            <h3 className="text-base font-bold text-slate-900">
              1. Select Assessment Focus
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Role-Based Test */}
            <div
              onClick={() => setTestType("role")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                testType === "role"
                  ? "border-[#2F54EB] bg-blue-50/40 shadow-sm"
                  : "border-slate-200/80 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${testType === "role" ? "bg-[#2F54EB] text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Role-Based Assessment
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Tailored for {selectedRole}
                    </div>
                  </div>
                </div>
                {testType === "role" && <CheckCircle2 className="h-5 w-5 text-[#2F54EB] shrink-0" />}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-3 leading-snug">
                Tests full-spectrum technical competencies and industry standards required for {selectedRole}.
              </p>
            </div>

            {/* Skill-Based Test */}
            <div
              onClick={() => setTestType("skill")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                testType === "skill"
                  ? "border-[#2F54EB] bg-blue-50/40 shadow-sm"
                  : "border-slate-200/80 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${testType === "skill" ? "bg-[#2F54EB] text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Skill-Based Assessment
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Focus on a specific technology
                    </div>
                  </div>
                </div>
                {testType === "skill" && <CheckCircle2 className="h-5 w-5 text-[#2F54EB] shrink-0" />}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-3 leading-snug">
                Deep dive into a single language, framework, or skill from your profile.
              </p>
            </div>

            {/* Skill Gap Diagnostic Test */}
            <div
              onClick={() => setTestType("skill_gap")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                testType === "skill_gap"
                  ? "border-[#2F54EB] bg-blue-50/40 shadow-sm"
                  : "border-slate-200/80 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${testType === "skill_gap" ? "bg-[#2F54EB] text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Skill Gap Diagnostic
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Target identified weak areas
                    </div>
                  </div>
                </div>
                {testType === "skill_gap" && <CheckCircle2 className="h-5 w-5 text-[#2F54EB] shrink-0" />}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-3 leading-snug">
                Generates questions focused specifically on your missing and developing technical skills.
              </p>
            </div>

            {/* Roadmap Assessment */}
            <div
              onClick={() => setTestType("roadmap")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                testType === "roadmap"
                  ? "border-[#2F54EB] bg-blue-50/40 shadow-sm"
                  : "border-slate-200/80 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${testType === "roadmap" ? "bg-[#2F54EB] text-white" : "bg-slate-100 text-slate-600"}`}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Roadmap Topic Test
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Verify learning progress
                    </div>
                  </div>
                </div>
                {testType === "roadmap" && <CheckCircle2 className="h-5 w-5 text-[#2F54EB] shrink-0" />}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-3 leading-snug">
                Tests key topics and milestones from your active learning roadmap.
              </p>
            </div>
          </div>

          {/* Skill Selector if Skill-Based selected */}
          {testType === "skill" && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Choose Skill to Assess:
              </label>
              <div className="flex flex-wrap gap-2">
                {userSkills.map((sk) => (
                  <button
                    type="button"
                    key={sk}
                    onClick={() => setSelectedSkill(sk)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedSkill === sk
                        ? "bg-[#2F54EB] text-white font-bold ring-2 ring-[#2F54EB]/20 shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {sk}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Number of Questions & Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Question Count */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#FF5A36]" />
              <h3 className="text-base font-bold text-slate-900">
                2. Number of Questions
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { count: 10, label: "10 Questions", time: "10 Mins", tag: "Quick" },
                { count: 20, label: "20 Questions", time: "20 Mins", tag: "Standard" },
                { count: 30, label: "30 Questions", time: "30 Mins", tag: "In-Depth" },
                { count: 50, label: "50 Questions", time: "50 Mins", tag: "Full Mock" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.count}
                  onClick={() => setQuestionCount(item.count)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    questionCount === item.count
                      ? "border-[#FF5A36] bg-orange-50/50 text-[#FF5A36] font-bold shadow-2xs"
                      : "border-slate-200/80 text-slate-700 hover:border-slate-300 bg-white font-semibold"
                  }`}
                >
                  <div className="text-base font-black">{item.count}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">{item.time}</div>
                  <span className="inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                    {item.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#2F54EB]" />
              <h3 className="text-base font-bold text-slate-900">
                3. Difficulty Level
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "Adaptive" as const, name: "Adaptive", desc: "AI adjusts difficulty based on performance" },
                { id: "Easy" as const, name: "Easy", desc: "Foundational concepts & basic syntax" },
                { id: "Medium" as const, name: "Medium", desc: "Standard campus recruitment level" },
                { id: "Hard" as const, name: "Hard", desc: "Advanced scenarios & edge cases" },
              ].map((diff) => (
                <button
                  type="button"
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    difficulty === diff.id
                      ? "border-[#2F54EB] bg-blue-50/50 text-slate-900 font-bold shadow-2xs"
                      : "border-slate-200/80 text-slate-700 hover:border-slate-300 bg-white font-semibold"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">{diff.name}</span>
                    {diff.id === "Adaptive" && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-1 leading-tight line-clamp-2">
                    {diff.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Assessment Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FF5A36] hover:bg-[#e04825] text-white text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span>Generating AI Assessment Questions...</span>
              </>
            ) : (
              <>
                <span>Start Assessment ({questionCount} Questions)</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
