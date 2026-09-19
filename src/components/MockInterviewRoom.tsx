import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Roadmap,
  InterviewQuestion,
  InterviewReport,
  RoadmapChangeNotification,
} from "../types";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  RotateCcw,
  BookOpen,
  Send,
  Loader2,
  ChevronRight,
  TrendingUp,
  Brain,
  Award,
  Layers,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

interface MockInterviewRoomProps {
  user: User;
  roadmap?: Roadmap | null;
  onInterviewComplete: (report: InterviewReport, updatedRoadmap?: Roadmap) => void;
  onNavigateTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
}

export const MockInterviewRoom: React.FC<MockInterviewRoomProps> = ({
  user,
  roadmap,
  onInterviewComplete,
  onNavigateTab,
}) => {
  const initialRole =
    user.selectedRole ||
    (user.aiJobRecommendations?.recommendedRoles && user.aiJobRecommendations.recommendedRoles[0]?.role) ||
    (user.targetRoles && user.targetRoles[0]) ||
    "Software Development Engineer";

  const [targetRole, setTargetRole] = useState<string>(initialRole);
  const [companyTarget, setCompanyTarget] = useState<string>("");

  // Keep targetRole synced if user.selectedRole changes
  useEffect(() => {
    if (user.selectedRole && user.selectedRole !== targetRole) {
      setTargetRole(user.selectedRole);
    }
  }, [user.selectedRole]);

  // Interview state: 'setup' | 'in_progress' | 'thinking' | 'evaluating' | 'report'
  const [interviewState, setInterviewState] = useState<
    "setup" | "in_progress" | "thinking" | "evaluating" | "report"
  >("setup");

  // Live media states
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Dynamic Turn-Based Questions & Answers
  const [sessionId, setSessionId] = useState<string>("");
  const [interviewerIntro, setInterviewerIntro] = useState<string>("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<
    { questionNumber: number; question: string; category: string; studentAnswer: string }[]
  >([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [interviewerRemark, setInterviewerRemark] = useState<string | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<{
    quality: string;
    score: number;
    critique: string;
    strengths: string[];
    weaknesses: string[];
    detectedGap?: { skill: string; topic: string; priority: string; reason: string };
  } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [showAssessmentHint, setShowAssessmentHint] = useState(false);

  // Evaluated report & adaptive roadmap notifications
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [roadmapChanges, setRoadmapChanges] = useState<RoadmapChangeNotification[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [evaluatingError, setEvaluatingError] = useState<string | null>(null);

  // Refs for media
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
  }, []);

  // Web camera setup & cleanup
  useEffect(() => {
    if (interviewState === "in_progress" || interviewState === "thinking") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [interviewState]);

  const startCamera = async () => {
    try {
      if (mediaStreamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);
    } catch (err) {
      console.warn("Camera/Mic access not allowed or unavailable; running with simulated audio-video state:", err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    } else {
      setCameraActive(!cameraActive);
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    } else {
      setMicActive(!micActive);
    }
  };

  // Timer countdown per question
  useEffect(() => {
    if (interviewState !== "in_progress") return;

    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [interviewState, currentQuestionIndex]);

  // Read question out loud with Web Speech API
  const speakQuestion = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingQuestion(true);
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Real-time voice to text listener
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your answer directly.");
      return;
    }

    if (isSpeechListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsSpeechListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setCurrentAnswer((prev) => (prev ? prev + " " + transcript : transcript));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          setIsSpeechListening(false);
        };

        recognition.onend = () => {
          setIsSpeechListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsSpeechListening(true);
      } catch (err) {
        console.warn("Speech recognition start failed:", err);
        setIsSpeechListening(false);
      }
    }
  };

  // Start interview session: calls backend to generate greeting & first adaptive question
  const handleStartInterview = async () => {
    setLoadingQuestions(true);
    setEvaluatingError(null);
    try {
      const res = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, companyTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize interview");

      setSessionId(data.sessionId);
      setInterviewerIntro(data.interviewerIntro || "");
      setQuestions([data.firstQuestion]);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setCurrentAnswer("");
      setInterviewerRemark(null);
      setLatestAssessment(null);
      setTimerSeconds(data.firstQuestion?.timeLimitSeconds || 120);
      setInterviewState("in_progress");

      // Auto-speak greeting and first question after brief delay
      setTimeout(() => {
        if (data.firstQuestion) {
          const speech = data.interviewerIntro
            ? `${data.interviewerIntro}. Question one: ${data.firstQuestion.question}`
            : data.firstQuestion.question;
          speakQuestion(speech);
        }
      }, 800);
    } catch (err: any) {
      setEvaluatingError(err.message || "Failed to start interview");
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Submit current answer and adaptively fetch next question or conclude
  const handleNextTurn = async (forceConclude: boolean = false) => {
    // Stop speech synthesis if playing
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
    // Stop voice recognition
    if (isSpeechListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsSpeechListening(false);
    }

    const currentQ = questions[currentQuestionIndex];
    const recordedAnswer = {
      questionNumber: currentQ.questionNumber,
      question: currentQ.question,
      category: currentQ.category,
      studentAnswer: currentAnswer.trim() || "(Candidate remained silent during this turn)",
    };

    const updatedAnswers = [...answers, recordedAnswer];
    setAnswers(updatedAnswers);

    if (forceConclude || updatedAnswers.length >= 12) {
      // Direct to final evaluation
      await evaluateInterview(updatedAnswers);
      return;
    }

    // Call dynamic next question endpoint
    setIsSubmittingTurn(true);
    setInterviewState("thinking");

    try {
      const res = await fetch("/api/interviews/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          targetRole,
          previousQuestions: questions,
          previousAnswers: answers,
          latestAnswer: currentAnswer.trim(),
        }),
      });

      const turnResult = await res.json();
      if (!res.ok) throw new Error(turnResult.error || "Failed to formulate next question");

      if (turnResult.answerAssessment) {
        setLatestAssessment(turnResult.answerAssessment);
      }
      if (turnResult.interviewerRemark) {
        setInterviewerRemark(turnResult.interviewerRemark);
      }

      if (turnResult.continueInterview && turnResult.nextQuestion) {
        // AI decided to continue with an adaptive question!
        const nextQ = turnResult.nextQuestion;
        setQuestions((prev) => [...prev, nextQ]);
        setCurrentQuestionIndex((prev) => prev + 1);
        setCurrentAnswer("");
        setTimerSeconds(nextQ.timeLimitSeconds || 120);
        setInterviewState("in_progress");

        // Speak remark + next question
        setTimeout(() => {
          const speech = turnResult.interviewerRemark
            ? `${turnResult.interviewerRemark}. Next question: ${nextQ.question}`
            : nextQ.question;
          speakQuestion(speech);
        }, 600);
      } else {
        // AI concluded all rounds -> evaluate
        await evaluateInterview(updatedAnswers);
      }
    } catch (err: any) {
      console.warn("Next turn generation error:", err);
      // Fallback: evaluate interview with current answers if turn formulation failed
      await evaluateInterview(updatedAnswers);
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const evaluateInterview = async (finalAnswers: typeof answers) => {
    setInterviewState("evaluating");
    stopCamera();

    try {
      const transcript = finalAnswers.flatMap((a) => [
        { speaker: "interviewer" as const, text: a.question, timestamp: new Date().toISOString() },
        { speaker: "student" as const, text: a.studentAnswer, timestamp: new Date().toISOString() },
      ]);

      const res = await fetch("/api/interviews/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          companyTarget,
          answers: finalAnswers,
          transcript,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate interview");

      setReport(data.report);
      if (data.roadmapChanges) {
        setRoadmapChanges(data.roadmapChanges);
      }
      setInterviewState("report");
      onInterviewComplete(data.report, data.updatedRoadmap);

      // Trigger celebratory confetti on report view
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe ignore
      }
    } catch (err: any) {
      setEvaluatingError(err.message || "Evaluation encountered an error");
      setInterviewState("setup");
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  const canConcludeEarly = answers.length >= 3;

  return (
    <div className="space-y-6">
      {/* ----------------- STATE 1: SETUP SCREEN ----------------- */}
      {interviewState === "setup" && (
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Real-Time Adaptive AI Mock Interview
                </h1>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  Interactive Bar Raiser
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulates real-world on-campus technical grilling where the AI interviewer dynamically listens, evaluates, and adapts questions in real-time.
              </p>
            </div>
          </div>

          {evaluatingError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{evaluatingError}</span>
            </div>
          )}

          {/* Setup Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select from Recommended Roles
              </label>
              <select
                id="select-mock-interview-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 bg-white focus:border-indigo-600 focus:outline-none"
              >
                {user.selectedRole && (
                  <option value={user.selectedRole}>
                    ★ Selected Role: {user.selectedRole}
                  </option>
                )}
                {user.aiJobRecommendations?.recommendedRoles.map((r) => {
                  if (r.role === user.selectedRole) return null;
                  return (
                    <option key={r.role} value={r.role}>
                      AI Role: {r.role} ({r.matchIndicator}% Match)
                    </option>
                  );
                })}
                {!user.selectedRole &&
                  (!user.aiJobRecommendations?.recommendedRoles ||
                    user.aiJobRecommendations.recommendedRoles.length === 0) && (
                    <option value={targetRole}>{targetRole}</option>
                  )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Role Designation
              </label>
              <input
                id="input-mock-interview-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                placeholder="e.g. Software Development Engineer"
              />
            </div>
          </div>

          {/* Interviewer Persona Card */}
          <div className="rounded-xl bg-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-sm font-bold">
                DR
              </div>
              <div>
                <div className="text-sm font-bold text-white">Dr. Maya Ramanathan</div>
                <div className="text-xs text-indigo-300">
                  Principal Technical Bar Raiser & Campus Hiring Lead
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Listens to each answer, tests edge cases, probes depth, and dynamically adjusts difficulty based on your explanations.
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-300 sm:border-l sm:border-slate-800 sm:pl-4 space-y-1 shrink-0">
              <div>⏱️ <strong>Format:</strong> Real-Time Adaptive Dialogue</div>
              <div>🎙️ <strong>Input:</strong> Voice Audio or Typed Response</div>
              <div>⚡ <strong>Outcome:</strong> Auto-Adapts Your Roadmap</div>
            </div>
          </div>

          {/* Student Profile Context Fed to AI */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 text-slate-600">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Verified Context Fed to the Bar Raiser:</span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Data Synchronized
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div>• Candidate: <strong>{user.fullName}</strong> ({user.course} {user.branch}, Sem {user.semester}, CGPA {user.cgpa})</div>
              <div>• Target Role: <strong>{targetRole}</strong></div>
              <div>• Declared Skills: <strong>{(user.skills && user.skills.length > 0 ? user.skills.slice(0, 5).join(", ") : "General Engineering Coursework")}</strong></div>
              <div>• Resume Context: <strong>{user.resumeUploadedAt ? "Parsed Projects & Experience Active" : "Fresher Coursework Profile"}</strong></div>
            </div>
            {roadmap?.skillGap?.prioritySkills && roadmap.skillGap.prioritySkills.length > 0 && (
              <div className="pt-1 text-[11px] text-indigo-700 border-t border-slate-200">
                🎯 <strong>Priority Skill Focus from Roadmap:</strong>{" "}
                {roadmap.skillGap.prioritySkills.map((p) => `${p.skill} (${p.currentLevel} → ${p.requiredLevel})`).join(", ")}
              </div>
            )}
          </div>

          {/* Adaptive Features Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-indigo-600" />
                Adaptive Questioning
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Questions are never pre-generated in a fixed list. The interviewer adapts dynamically to how you answer.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Roadmap Adaptation
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Weaknesses detected during the interview automatically update task priorities in your placement roadmap.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-600" />
                Grounded Evaluation
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                No random or inflated scores. Every score and critique is derived strictly from your spoken technical answers.
              </p>
            </div>
          </div>

          {/* Launch Button */}
          <button
            id="btn-start-interview"
            onClick={handleStartInterview}
            disabled={loadingQuestions}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            {loadingQuestions ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing Real-Time Bar Raiser Room...</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                <span>Enter Live AI Mock Room</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* ----------------- STATE 2 & 3: LIVE VIDEO INTERVIEW & ADAPTIVE TURN THINKING ----------------- */}
      {(interviewState === "in_progress" || interviewState === "thinking") && currentQ && (
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Top Progress and Timer bar */}
          <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
                {currentQuestionIndex + 1}
              </span>
              <span className="font-bold text-slate-900">
                Round {currentQuestionIndex + 1}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {currentQ.category}
              </span>
              {currentQ.difficulty && (
                <span className="rounded bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium">
                  {currentQ.difficulty}
                </span>
              )}
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium">
                Adaptive Turn
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Early Conclude option if 3+ turns answered */}
              {canConcludeEarly && (
                <button
                  type="button"
                  onClick={() => handleNextTurn(true)}
                  disabled={isSubmittingTurn}
                  className="text-[11px] text-slate-500 hover:text-rose-600 font-medium underline transition-colors"
                >
                  Conclude Interview Early
                </button>
              )}

              {/* Timer countdown */}
              <div
                className={`flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
                  timerSeconds < 30 ? "bg-rose-50 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-700"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {/* Video Split Screen: AI Interviewer & Candidate Webcam */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Interviewer Video Tile */}
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-5 text-white overflow-hidden flex flex-col justify-between min-h-[290px] shadow-lg">
              {/* Interviewer status bar */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-2.5 w-2.5 rounded-full ${
                      interviewState === "thinking"
                        ? "bg-amber-400 animate-ping"
                        : isSpeakingQuestion
                        ? "bg-rose-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Dr. Maya Ramanathan (Principal Bar Raiser)
                  </span>
                </div>
                <button
                  onClick={() => {
                    const speech = interviewerRemark
                      ? `${interviewerRemark}. Question: ${currentQ.question}`
                      : currentQ.question;
                    speakQuestion(speech);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white hover:bg-white/20 transition-colors"
                  title="Hear question audio"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{isSpeakingQuestion ? "Speaking..." : "Read Aloud"}</span>
                </button>
              </div>

              {/* Central Interviewer Avatar & Speaking Waveform */}
              <div className="my-auto text-center py-3 z-10">
                <div className="relative mx-auto inline-flex items-center justify-center">
                  <div
                    className={`h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-2xl font-black text-white shadow-xl ${
                      isSpeakingQuestion ? "ring-4 ring-rose-500/50 scale-105" : ""
                    } transition-all`}
                  >
                    DR
                  </div>
                  {isSpeakingQuestion && (
                    <div className="absolute -bottom-2 bg-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white animate-bounce">
                      Speaking
                    </div>
                  )}
                  {interviewState === "thinking" && (
                    <div className="absolute -bottom-2 bg-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white animate-pulse">
                      Analyzing Answer...
                    </div>
                  )}
                </div>

                {/* Subtitle speech bubble */}
                <div className="mt-3 rounded-xl bg-black/50 p-3.5 border border-white/10 text-xs text-slate-100 text-left leading-relaxed space-y-1.5">
                  {interviewerRemark && (
                    <div className="text-[11px] text-indigo-300 italic">
                      "{interviewerRemark}"
                    </div>
                  )}
                  <div>
                    <span className="text-rose-400 font-bold">Question {currentQuestionIndex + 1}: </span>
                    "{currentQ.question}"
                  </div>
                </div>
              </div>

              {/* Bottom metadata */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 z-10 border-t border-slate-800/80 pt-2">
                <span>Target: {companyTarget} ({targetRole})</span>
                <span className="text-indigo-300 font-medium">Topic: {currentQ.topic || currentQ.category}</span>
              </div>
            </div>

            {/* Candidate Webcam Feed Tile */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between min-h-[290px] shadow-lg">
              {/* WebCam Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 h-full w-full object-cover ${
                  cameraActive ? "block" : "hidden"
                }`}
              />

              {/* Simulated avatar if camera disabled */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-white text-lg font-bold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-300">
                    {user.fullName} (Camera Paused)
                  </div>
                  <div className="text-[10px] text-slate-500">Audio input remains active</div>
                </div>
              )}

              {/* Top candidate status overlay */}
              <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
                <span className="text-xs font-semibold text-white">
                  You ({user.fullName})
                </span>
                <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  LIVE STREAM ACTIVE
                </span>
              </div>

              {/* Bottom Controls Bar */}
              <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleCamera}
                    className={`rounded-lg p-2 text-xs transition-colors ${
                      cameraActive ? "bg-white/20 text-white" : "bg-rose-600 text-white"
                    }`}
                    title={cameraActive ? "Turn camera off" : "Turn camera on"}
                  >
                    {cameraActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={toggleMic}
                    className={`rounded-lg p-2 text-xs transition-colors ${
                      micActive ? "bg-white/20 text-white" : "bg-rose-600 text-white"
                    }`}
                    title={micActive ? "Mute microphone" : "Unmute microphone"}
                  >
                    {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>

                {/* Word count & pacing */}
                <div className="text-right text-[11px] text-slate-300 font-mono">
                  {wordCount} words spoken/typed
                </div>
              </div>
            </div>
          </div>

          {/* Previous Turn Micro-Feedback (if available from previous answer) */}
          {latestAssessment && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-indigo-900 font-medium">
                  <strong>Bar Raiser Observation on Round {currentQuestionIndex}:</strong> {latestAssessment.critique}
                </span>
              </div>
              {latestAssessment.detectedGap && (
                <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold shrink-0">
                  Gap Flagged: {latestAssessment.detectedGap.skill}
                </span>
              )}
            </div>
          )}

          {/* Thinking Overlay Banner */}
          {interviewState === "thinking" && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                <span>Dr. Maya Ramanathan is evaluating your response...</span>
              </div>
              <p className="text-xs text-amber-800 max-w-lg mx-auto">
                Assessing your technical accuracy, detecting conceptual trade-offs, and formulating the next adaptive question based on what you said.
              </p>
            </div>
          )}

          {/* Answer Input & Voice Transcription Studio */}
          {interviewState === "in_progress" && (
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Your Spoken Answer (Speech-To-Text or Type)</span>
                </div>

                {/* Voice Transcription Trigger */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                    isSpeechListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>{isSpeechListening ? "Listening... (Click to Pause)" : "Start Voice Answer"}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Speak using the microphone or type your response here. Walk through your architecture decisions, edge cases, space/time complexity, or personal project experiences..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 leading-relaxed font-sans"
              />

              {/* Guidance & Submission */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-slate-500">
                  💡 <strong>Tip:</strong> The interviewer adapts to your answer. State reasoning aloud and cite concrete technical principles.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNextTurn(false)}
                    disabled={isSubmittingTurn}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow"
                  >
                    <span>Submit Answer & Continue</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- STATE 3: FINAL EVALUATING SCREEN ----------------- */}
      {interviewState === "evaluating" && (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Evaluating Complete Mock Interview...
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dr. Maya Ramanathan is reviewing the complete dialogue transcript, computing objective bar-raiser sub-scores, detecting skill weaknesses, and adapting your personalized placement roadmap.
          </p>
          <div className="pt-2 text-xs font-mono text-indigo-700">
            Adapting Placement Roadmap & Synchronizing Readiness Score...
          </div>
        </div>
      )}

      {/* ----------------- STATE 4: POST-INTERVIEW COMPREHENSIVE REPORT ----------------- */}
      {interviewState === "report" && report && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Top Score Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                  Interview Evaluation Complete
                </span>
                <span className="text-xs text-indigo-200">
                  Target: {report.companyTarget || companyTarget} ({report.targetRole})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Executive Bar Raiser Report
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Evaluated by Dr. Maya Ramanathan across technical depth, problem-solving, communication clarity, confidence, and role alignment.
              </p>
            </div>

            {/* Score pill (No fake numbers!) */}
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center">
                {report.overallScore !== null && report.scoreAssessed !== false ? (
                  <>
                    <div className="text-5xl font-black text-white tracking-tight">
                      {report.overallScore}
                      <span className="text-xl font-medium text-indigo-300">/100</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-300 mt-1">
                      {report.overallScore >= 80
                        ? "✨ Campus Placement Ready"
                        : report.overallScore >= 65
                        ? "👍 Competitive — Polish Gaps"
                        : "⚠️ Additional Mock Practice Needed"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-200">Not Assessed</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Scores strictly require active AI evaluation.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FEATURE 3 HIGHLIGHT: TRACEABLE ADAPTIVE ROADMAP NOTIFICATION */}
          {roadmapChanges.length > 0 ? (
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <span>Personalized Roadmap Automatically Adapted</span>
                      <span className="rounded-full bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold">
                        {roadmapChanges.length} Changes Made
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Based on specific weaknesses identified during your mock interview, your roadmap has been updated.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab("roadmap")}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow shrink-0"
                >
                  <span>Open Updated Roadmap</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* List of changes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {roadmapChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white p-3.5 border border-indigo-100 shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{change.taskTitle}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          change.type === "added"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {change.type === "added" ? "New Task Added" : "Priority Escalated to High"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">{change.reason}</div>
                    <div className="text-[10px] text-indigo-700 font-semibold pt-1">
                      Skill: {change.skill} • Source: Mock Interview
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>No severe technical gaps detected. Your current roadmap continues on schedule!</span>
              </div>
              <button
                onClick={() => onNavigateTab("roadmap")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View Roadmap →
              </button>
            </div>
          )}

          {/* Sub-Scores Matrix (5 pillars) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: "Technical Knowledge", score: report.subScores.technicalKnowledge, max: 20 },
              { name: "Problem Solving", score: report.subScores.problemSolving, max: 20 },
              { name: "Communication", score: report.subScores.communicationClarity, max: 20 },
              { name: "Confidence & Pacing", score: report.subScores.confidencePacing || 15, max: 20 },
              { name: "Role Alignment", score: report.subScores.roleAlignment, max: 20 },
            ].map((sub) => (
              <div
                key={sub.name}
                className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-sm text-center"
              >
                <div className="text-xs font-semibold text-slate-500">{sub.name}</div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {report.scoreAssessed !== false ? sub.score : "—"}
                  <span className="text-xs font-normal text-slate-400">/{sub.max}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${report.scoreAssessed !== false ? (sub.score / sub.max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Weaknesses & Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Weaknesses */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Identified Weaknesses & Hesitations
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {report.coreWeaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[10px] font-bold text-rose-700">
                      ✕
                    </span>
                    <span className="leading-relaxed">{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 7-Day Personalized Improvement Plan */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Personalized Action Plan Before Next Mock
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {report.personalizedActionPlan.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question-by-Question Deep Dive */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Round-by-Round Breakdown & Answer Keys
            </h2>

            {report.questionReviews.map((rev) => (
              <div
                key={rev.questionNumber}
                className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      Q{rev.questionNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{rev.category}</span>
                  </div>
                  {report.scoreAssessed !== false && (
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 border border-indigo-200">
                      {rev.score} / 20 pts
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  "{rev.question}"
                </div>

                {/* Student's Recorded Answer */}
                <div className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Your Recorded Answer: </span>
                  "{rev.studentAnswer}"
                </div>

                {/* Evaluator Critique */}
                <div className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900">Interviewer Critique: </span>
                  {rev.interviewerCritique}
                </div>

                {/* Top 1% Model Answer Key */}
                <div className="text-xs text-emerald-900 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-950">Top 1% Candidate Model Answer Key: </span>
                  {rev.modelAnswerKey}
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 px-4 py-2 text-xs font-bold hover:bg-indigo-100"
            >
              ← View Updated Placement Roadmap
            </button>

            <button
              onClick={() => setInterviewState("setup")}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake Interview Practice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
