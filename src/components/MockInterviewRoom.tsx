import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Roadmap,
  InterviewQuestion,
  InterviewReport,
  RoadmapChangeNotification,
} from "../types";
import { getAuthHeaders } from "../services/auth";
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
  PhoneOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldCheck,
  X,
  FileText,
} from "lucide-react";
import confetti from "canvas-confetti";

interface MockInterviewRoomProps {
  user: User;
  roadmap?: Roadmap | null;
  onInterviewComplete: (report: InterviewReport, updatedRoadmap?: Roadmap) => void;
  onNavigateTab: (tab: "score" | "jobs" | "roadmap" | "interview") => void;
  onActiveStateChange?: (isActive: boolean) => void;
  onOpenProfile?: () => void;
}

export const MockInterviewRoom: React.FC<MockInterviewRoomProps> = ({
  user,
  roadmap,
  onInterviewComplete,
  onNavigateTab,
  onActiveStateChange,
  onOpenProfile,
}) => {
  const initialRole =
    user.selectedRole ||
    (user.aiJobRecommendations?.recommendedRoles &&
      user.aiJobRecommendations.recommendedRoles[0]?.role) ||
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

  // Inform parent when active interview state changes
  useEffect(() => {
    const isActive = interviewState === "in_progress" || interviewState === "thinking";
    onActiveStateChange?.(isActive);
  }, [interviewState, onActiveStateChange]);

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

  // Evaluated report & adaptive roadmap notifications
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [roadmapChanges, setRoadmapChanges] = useState<RoadmapChangeNotification[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [evaluatingError, setEvaluatingError] = useState<string | null>(null);

  // Camera & Media stream management
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);

  // UI modal / panel states
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [showTypedInput, setShowTypedInput] = useState(true);
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState(false);

  // Refs for media
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
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

  // Web camera setup on interview state change
  useEffect(() => {
    if (interviewState === "in_progress" || interviewState === "thinking") {
      startCamera();
    }
  }, [interviewState]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Sync video elements with mediaStream
  useEffect(() => {
    const attachStream = (el: HTMLVideoElement | null) => {
      if (!el) return;
      el.defaultMuted = true;
      el.muted = true;
      el.playsInline = true;
      if (mediaStream && cameraActive) {
        if (el.srcObject !== mediaStream) {
          el.srcObject = mediaStream;
        }
        el.onloadedmetadata = () => {
          el.play().catch((e) => console.warn("Video metadata play:", e));
        };
        el.play().catch((e) => console.warn("Video immediate play:", e));
      } else {
        el.srcObject = null;
      }
    };

    attachStream(videoRef.current);
    attachStream(previewVideoRef.current);
  }, [mediaStream, cameraActive, interviewState]);

  const startCamera = async (): Promise<MediaStream | null> => {
    setIsRequestingCamera(true);
    setCameraError(null);

    // Reuse existing active stream if available
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      const vTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = true;
        setCameraActive(true);
        setMediaStream(mediaStreamRef.current);
        setIsRequestingCamera(false);
        return mediaStreamRef.current;
      }
    }

    try {
      let stream: MediaStream | null = null;

      // Strategy 1: Ideal HD video with audio
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      } catch (e1) {
        console.warn("Could not get ideal HD video+audio, trying basic video+audio...", e1);
        try {
          // Strategy 2: Basic video + audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (e2) {
          console.warn("Could not get audio+video, trying video only...", e2);
          // Strategy 3: Video only (avoids mic permission blocking camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        setMediaStream(stream);
        setCameraActive(true);
        setMicActive(stream.getAudioTracks().length > 0);

        if (videoRef.current) {
          videoRef.current.defaultMuted = true;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.warn("Video autoplay error:", err));
        }

        if (previewVideoRef.current) {
          previewVideoRef.current.defaultMuted = true;
          previewVideoRef.current.muted = true;
          previewVideoRef.current.playsInline = true;
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play().catch((err) => console.warn("Preview autoplay error:", err));
        }

        setIsRequestingCamera(false);
        return stream;
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      let errorMsg = "Camera unavailable";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera access denied. Please click the camera icon in your browser address bar to allow permissions.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No webcam device detected on your system.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Camera is currently being used by another application or tab.";
      }
      setCameraError(errorMsg);
      setCameraActive(false);
    } finally {
      setIsRequestingCamera(false);
    }
    return null;
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setMediaStream(null);
      setCameraActive(false);
    }
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      // Turn camera ON
      if (
        mediaStreamRef.current &&
        mediaStreamRef.current.active &&
        mediaStreamRef.current.getVideoTracks().length > 0
      ) {
        const track = mediaStreamRef.current.getVideoTracks()[0];
        track.enabled = true;
        setCameraActive(true);
        setMediaStream(mediaStreamRef.current);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStreamRef.current;
          videoRef.current.play().catch(() => {});
        }
      } else {
        // Re-request camera stream
        await startCamera();
      }
    } else {
      // Turn camera OFF
      if (mediaStreamRef.current) {
        const track = mediaStreamRef.current.getVideoTracks()[0];
        if (track) {
          track.enabled = false;
        }
      }
      setCameraActive(false);
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      } else {
        setMicActive(!micActive);
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
    if (!mediaStreamRef.current) {
      startCamera().catch(console.warn);
    }
    setLoadingQuestions(true);
    setEvaluatingError(null);
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch("/api/interviews/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          "x-user-id": user.id,
          "x-user-email": user.email,
        },
        credentials: "include",
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
      const authHeaders = getAuthHeaders();
      const res = await fetch("/api/interviews/next-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          "x-user-id": user.id,
          "x-user-email": user.email,
        },
        credentials: "include",
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
        await evaluateInterview(updatedAnswers);
      }
    } catch (err: any) {
      console.warn("Next turn generation error:", err);
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

      const authHeaders = getAuthHeaders();
      const res = await fetch("/api/interviews/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          "x-user-id": user.id,
          "x-user-email": user.email,
        },
        credentials: "include",
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

  const handleExitInterview = (concludeWithAnswers: boolean) => {
    setIsConfirmEndOpen(false);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
    if (isSpeechListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsSpeechListening(false);
    }

    if (concludeWithAnswers && answers.length >= 1) {
      evaluateInterview(answers);
    } else {
      stopCamera();
      setInterviewState("setup");
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  const canConcludeEarly = answers.length >= 3;

  // Real AI State String for Requirement 9
  const getAiStateLabel = () => {
    if (interviewState === "thinking") return "Analyzing response";
    if (isSubmittingTurn) return "Preparing next question";
    if (isSpeechListening) return "Listening";
    if (isSpeakingQuestion) return "Interviewer speaking";
    if (interviewState === "in_progress") return "Waiting for answer";
    if (interviewState === "report") return "Interview completed";
    return "Ready";
  };

  return (
    <div className="w-full">
      {/* ------------------------------------------------------------- */}
      {/* STATE 1: PRE-INTERVIEW READINESS SCREEN                     */}
      {/* ------------------------------------------------------------- */}
      {interviewState === "setup" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Header Card */}
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A36] text-white font-black text-xl shadow-xs shrink-0">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Placement OS • AI Mock Interview
                    </h1>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Live Video Room
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time technical interview workspace with adaptive AI interviewer Dr. Maya Ramanathan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-800">{user.fullName}</div>
                  <div className="text-[11px] text-slate-500">{user.course} {user.branch}</div>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-xs">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.fullName}
                      className="h-full w-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                </div>
              </div>
            </div>

            {evaluatingError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-medium">{evaluatingError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEvaluatingError(null);
                    handleStartInterview();
                  }}
                  className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Target Role & Company Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selected Job Role
                </label>
                <select
                  id="select-mock-interview-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 bg-white focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none shadow-2xs"
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
                        AI Recommended: {r.role} ({r.matchIndicator}% Match)
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Company (Optional)
                </label>
                <input
                  id="input-mock-interview-company"
                  type="text"
                  value={companyTarget}
                  onChange={(e) => setCompanyTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none shadow-2xs"
                  placeholder="e.g. Google, Amazon, Microsoft, or General Campus"
                />
              </div>
            </div>

            {/* Hardware & Camera Preview Test */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#FF5A36]" />
                  <span className="text-xs font-bold text-slate-800">
                    Camera & Audio Device Check
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {cameraActive && mediaStream ? "Video Active" : "Camera Idle"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Live Preview Box */}
                <div className="relative rounded-xl bg-[#111318] aspect-video overflow-hidden border border-slate-700/60 shadow-inner flex items-center justify-center">
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: "scaleX(-1)" }}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      cameraActive && mediaStream ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  />

                  {(!cameraActive || !mediaStream) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-base font-bold shadow-xs">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="text-xs font-semibold text-slate-300">
                        {cameraError ? cameraError : "Camera is currently paused"}
                      </div>
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={isRequestingCamera}
                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5A36] text-white font-bold rounded-lg text-xs hover:bg-[#e04825] transition-colors shadow-xs"
                      >
                        {isRequestingCamera ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Accessing Camera...</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-3 w-3" />
                            <span>Test Live Camera</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {cameraActive && mediaStream && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-md text-[10px] text-emerald-400 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Preview
                    </div>
                  )}
                </div>

                {/* Device Status List */}
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-slate-500" />
                      <span>Webcam Video Stream</span>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        cameraActive && mediaStream ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {cameraActive && mediaStream ? "Connected" : "Standby"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-slate-500" />
                      <span>Microphone Audio</span>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        micActive ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {micActive ? "Connected" : "Muted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-500" />
                      <span>Speech Recognition Engine</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {speechSupported ? "Web Speech Active" : "Typed Input Fallback"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-slate-500" />
                      <span>AI Bar Raiser</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">
                      Dr. Maya Ramanathan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Context Active */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600">
              <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Verified Candidate Context:</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Grounded from Database
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600">
                <div>• Candidate: <strong>{user.fullName}</strong></div>
                <div>• Program: <strong>{user.course} {user.branch} (Sem {user.semester}, CGPA {user.cgpa})</strong></div>
                <div>• Declared Skills: <strong>{user.skills && user.skills.length > 0 ? user.skills.slice(0, 5).join(", ") : "Engineering Core"}</strong></div>
                <div>• Resume Experience: <strong>{user.resumeUploadedAt ? "Active Projects Parsed" : "Coursework Context"}</strong></div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              id="btn-start-interview"
              onClick={handleStartInterview}
              disabled={loadingQuestions}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A36] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#e04825] transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparing interview...</span>
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  <span>Enter Live Video Interview Room</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE 2 & 3: REAL-TIME VIDEO INTERVIEW ROOM (ACTIVE STATE)   */}
      {/* ------------------------------------------------------------- */}
      {(interviewState === "in_progress" || interviewState === "thinking") && (
        <div className="fixed inset-0 z-50 bg-[#F4F6FB] flex flex-col min-h-screen overflow-y-auto antialiased">
          {/* 4. TOP HEADER (DESKTOP & MOBILE HEADER) */}
          <header className="sticky top-0 z-40 h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs">
            {/* Left: Placement OS Branding & AI Mock Interview */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#FF5A36] text-white font-black text-xl shadow-xs shrink-0">
                P
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 leading-tight">
                    Placement OS
                  </span>
                  <span className="hidden sm:inline-block text-slate-300">|</span>
                  <span className="font-bold text-xs sm:text-sm text-slate-700 hidden sm:inline-block">
                    AI Mock Interview
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">
                  Role: <span className="text-slate-800">{targetRole}</span>
                  {companyTarget && <span> • {companyTarget}</span>}
                </div>
              </div>
            </div>

            {/* Center: Real Interview Status & Real Timer */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Real State Badge */}
              <div className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    interviewState === "thinking"
                      ? "bg-amber-500 animate-ping"
                      : isSpeechListening
                      ? "bg-emerald-500 animate-pulse"
                      : isSpeakingQuestion
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-400"
                  }`}
                />
                <span className="hidden xs:inline">{getAiStateLabel()}</span>
              </div>

              {/* Real Timer */}
              <div
                className={`flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                  timerSeconds < 30
                    ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
                    : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {Math.floor(timerSeconds / 60)}:
                  {(timerSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Right: Authenticated User Profile & End Interview */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors"
                title="Profile"
              >
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-xs overflow-hidden">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {user.fullName}
                </span>
              </button>

              <button
                type="button"
                id="btn-end-interview-header"
                onClick={() => setIsConfirmEndOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
                title="End Interview"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">End Interview</span>
              </button>
            </div>
          </header>

          {/* MAIN INTERVIEW WORKSPACE: DESKTOP (1200px+) & RESPONSIVE */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ------------------------------------------------------- */}
              {/* 5. MAIN VIDEO AREA (COL 1 to 7/8 on Desktop)             */}
              {/* ------------------------------------------------------- */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* 16:9 Video Viewport Container */}
                <div className="relative w-full aspect-video rounded-2xl bg-[#111318] border border-slate-800 shadow-xl overflow-hidden flex items-center justify-center group">
                  {/* WebCam Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: "scaleX(-1)" }}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      cameraActive && mediaStream ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  />

                  {/* Clean Camera-Unavailable State (Requirement 5 & 12: No fake video/stock photos!) */}
                  {(!cameraActive || !mediaStream) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#111318] text-slate-300">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.fullName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {cameraError ? cameraError : "Camera is currently paused"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={isRequestingCamera}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A36] text-white px-4 py-2 text-xs font-bold hover:bg-[#e04825] shadow-md transition-all cursor-pointer"
                      >
                        {isRequestingCamera ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Connecting Camera...</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-3.5 w-3.5" />
                            <span>{cameraError ? "Retry Camera Access" : "Turn On Camera"}</span>
                          </>
                        )}
                      </button>

                      {cameraError && (
                        <p className="text-[11px] text-amber-300 max-w-sm leading-relaxed">
                          {cameraError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 6. AI INTERVIEWER PRESENCE INDICATOR (Picture-In-Picture Minimal Badge) */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 p-2 sm:p-2.5 text-white shadow-lg max-w-[280px]">
                    <div
                      className={`h-9 w-9 rounded-lg bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0 transition-all ${
                        isSpeakingQuestion
                          ? "ring-2 ring-emerald-400 shadow-emerald-500/20"
                          : ""
                      }`}
                    >
                      DR
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          Dr. Maya Ramanathan
                        </span>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            interviewState === "thinking"
                              ? "bg-amber-400 animate-ping"
                              : isSpeakingQuestion
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {isSpeakingQuestion
                          ? "Speaking question..."
                          : interviewState === "thinking"
                          ? "Analyzing response..."
                          : "AI Technical Bar Raiser"}
                      </div>
                    </div>
                  </div>

                  {/* Top-Right: Video Status Badges */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    {cameraActive && mediaStream && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-mono font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        HD 720p
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (currentQ) {
                          const speech = interviewerRemark
                            ? `${interviewerRemark}. Question: ${currentQ.question}`
                            : currentQ.question;
                          speakQuestion(speech);
                        }
                      }}
                      className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-black/80 transition-colors"
                      title="Hear question read aloud"
                    >
                      <Volume2 className="h-3 w-3 text-white" />
                      <span>{isSpeakingQuestion ? "Speaking..." : "Listen"}</span>
                    </button>
                  </div>

                  {/* Bottom-Left inside video: Candidate Label */}
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-white">
                    <span className="font-semibold">{user.fullName} (You)</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {micActive ? "🎙️ Mic On" : "🔇 Muted"}
                    </span>
                  </div>
                </div>

                {/* 8. CURRENT QUESTION DISPLAY */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#FF5A36]">
                        CURRENT QUESTION
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        Round {currentQuestionIndex + 1}
                      </span>
                      {currentQ?.category && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {currentQ.category}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      {timerSeconds}s remaining
                    </div>
                  </div>

                  <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                    {currentQ ? currentQ.question : "Preparing your next question..."}
                  </div>

                  {currentQ?.reasonForAsking && (
                    <div className="text-[11px] text-slate-600 pt-1 flex items-start gap-1.5 border-t border-slate-100">
                      <span className="font-bold text-slate-700">Context:</span>
                      <span className="text-slate-500">{currentQ.reasonForAsking}</span>
                    </div>
                  )}
                </div>

                {/* 7. INTERVIEW CONTROLS BAR (AT BOTTOM OF VIDEO AREA) */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2 flex-wrap">
                  {/* Left Controls: Mic & Camera */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                        micActive
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                      title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                    >
                      {micActive ? (
                        <>
                          <Mic className="h-4 w-4 text-emerald-600" />
                          <span>Mic: On</span>
                        </>
                      ) : (
                        <>
                          <MicOff className="h-4 w-4 text-rose-600" />
                          <span>Muted</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleCamera}
                      disabled={isRequestingCamera}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                        cameraActive && mediaStream
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                      title={cameraActive && mediaStream ? "Turn Off Camera" : "Turn On Camera"}
                    >
                      {cameraActive && mediaStream ? (
                        <>
                          <Video className="h-4 w-4 text-emerald-600" />
                          <span>Camera: On</span>
                        </>
                      ) : (
                        <>
                          <VideoOff className="h-4 w-4 text-rose-600" />
                          <span>Camera: Off</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Center Controls: Voice Dictate & Read Aloud */}
                  <div className="flex items-center gap-2">
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                          isSpeechListening
                            ? "bg-emerald-600 text-white animate-pulse"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        }`}
                        title="Dictate response via microphone"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{isSpeechListening ? "Listening..." : "Dictate Answer"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (currentQ) {
                          const speech = interviewerRemark
                            ? `${interviewerRemark}. Question: ${currentQ.question}`
                            : currentQ.question;
                          speakQuestion(speech);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                      title="Read question"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Speaker</span>
                    </button>
                  </div>

                  {/* Right Control: End Call */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmEndOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <PhoneOff className="h-4 w-4" />
                      <span>End Interview</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* 10. RIGHT-SIDE INTERVIEW PANEL (COL 8-12 on Desktop)     */}
              {/* ------------------------------------------------------- */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Panel 1: Live Status & Real State */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>INTERVIEW PROGRESS</span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      Adaptive AI
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Round</div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        Round {currentQuestionIndex + 1}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Completed</div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {answers.length} answered
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Current State</div>
                    <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          interviewState === "thinking"
                            ? "bg-amber-500 animate-ping"
                            : isSpeechListening
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-slate-400"
                        }`}
                      />
                      <span>{getAiStateLabel()}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: AI Analysis & Real Insights (Derived strictly from real state) */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>AI ANALYSIS</span>
                    <span className="text-[10px] text-slate-400">
                      {latestAssessment ? `Round ${currentQuestionIndex}` : "Turn 1"}
                    </span>
                  </div>

                  {latestAssessment ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">Observation: </span>
                        {latestAssessment.critique}
                      </div>

                      {latestAssessment.detectedGap ? (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                          <div className="font-bold text-[11px] text-rose-900">
                            Flagged Gap: {latestAssessment.detectedGap.skill}
                          </div>
                          <div className="text-[10px] text-rose-700 mt-0.5">
                            {latestAssessment.detectedGap.reason}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">
                          Interview Insights: <span className="font-medium text-emerald-700">Solid explanation</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 text-center bg-slate-50 rounded-xl">
                      Waiting for response...
                    </div>
                  )}
                </div>

                {/* Panel 3: Candidate Response Input (Speech or Typed) */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      CANDIDATE RESPONSE
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {wordCount} words
                    </span>
                  </div>

                  <textarea
                    rows={5}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Speak using microphone or type your response here. Outline your architectural decisions, trade-offs, space/time complexity, or personal project experiences..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none leading-relaxed font-sans"
                  />

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleNextTurn(false)}
                      disabled={isSubmittingTurn || interviewState === "thinking"}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A36] hover:bg-[#e04825] py-2.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingTurn || interviewState === "thinking" ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Analyzing response...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Answer & Continue</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>

                    {canConcludeEarly && (
                      <button
                        type="button"
                        onClick={() => handleNextTurn(true)}
                        disabled={isSubmittingTurn}
                        className="text-[11px] text-slate-500 hover:text-slate-800 text-center font-medium underline py-1 transition-colors cursor-pointer"
                      >
                        Conclude Interview Early & Generate Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* End Interview Confirmation Modal */}
          {isConfirmEndOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="rounded-2xl bg-white p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">End Interview Session?</h3>
                    <p className="text-xs text-slate-500">
                      {answers.length >= 1
                        ? `You have answered ${answers.length} questions so far.`
                        : "No answers have been recorded yet."}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {answers.length >= 1
                    ? "Would you like to evaluate the answers you have given and generate your Executive Bar Raiser Report, or exit back to the setup screen?"
                    : "Exiting now will end your session without generating an evaluation report."}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmEndOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Continue Interview
                  </button>

                  {answers.length >= 1 && (
                    <button
                      type="button"
                      onClick={() => handleExitInterview(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      Evaluate & Generate Report
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExitInterview(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
                  >
                    Exit Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE 4: EVALUATING SCREEN                                   */}
      {/* ------------------------------------------------------------- */}
      {interviewState === "evaluating" && (
        <div className="max-w-lg mx-auto py-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5A36]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Generating Executive Bar Raiser Report...
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Dr. Maya Ramanathan is reviewing your dialogue transcript across 6 core technical dimensions and adapting your personalized placement roadmap.
          </p>
          <div className="pt-2 text-xs font-mono text-[#FF5A36]">
            Synchronizing Readiness Score & Adapting Tasks...
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE 5: POST-INTERVIEW REPORT (REPORT STATE)                */}
      {/* ------------------------------------------------------------- */}
      {interviewState === "report" && report && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Top Score Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                  Interview Evaluation Complete
                </span>
                <span className="text-xs text-slate-300">
                  Target: {report.companyTarget || companyTarget || "Campus Placement"} ({report.targetRole})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
                Executive Bar Raiser Report
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Evaluated by Dr. Maya Ramanathan across technical depth, problem solving, communication, accuracy, depth of understanding, and role relevance.
              </p>
            </div>

            {/* Score Pill (Grounded in Real Assessment) */}
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center">
                {report.overallScore !== null && report.scoreAssessed !== false ? (
                  <>
                    <div className="text-5xl font-black text-white tracking-tight">
                      {report.overallScore}
                      <span className="text-xl font-medium text-slate-300">/100</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-300 mt-1">
                      {report.overallScore >= 80
                        ? "✨ Campus Placement Ready"
                        : report.overallScore >= 65
                        ? "👍 Competitive — Polish Gaps"
                        : "⚠️ Additional Practice Needed"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-200">Not Assessed</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Insufficient technical evidence provided.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ROADMAP ADAPTATION NOTICE (Requirement 19) */}
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
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow shrink-0 cursor-pointer"
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
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                View Roadmap →
              </button>
            </div>
          )}

          {/* Sub-Scores Matrix (6 Core Competency Pillars) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: "Technical Knowledge", score: report.subScores.technicalKnowledge },
              { name: "Problem Solving", score: report.subScores.problemSolving },
              { name: "Communication", score: report.subScores.communication ?? report.subScores.communicationClarity },
              { name: "Accuracy", score: report.subScores.accuracy },
              { name: "Depth of Understanding", score: report.subScores.depthOfUnderstanding ?? report.subScores.confidencePacing },
              { name: "Role Relevance", score: report.subScores.roleRelevance ?? report.subScores.roleAlignment },
            ].map((sub) => {
              const isAssessed = typeof sub.score === "number" && sub.score !== null;
              return (
                <div
                  key={sub.name}
                  className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-sm text-center flex flex-col justify-between"
                >
                  <div className="text-xs font-semibold text-slate-500 leading-tight">{sub.name}</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-2">
                    {isAssessed ? (
                      <>
                        {sub.score}
                        <span className="text-xs font-normal text-slate-400">/20</span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Not Assessed</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${isAssessed ? "bg-[#FF5A36]" : "bg-slate-200"}`}
                      style={{ width: isAssessed ? `${(sub.score! / 20) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Weaknesses & Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Weaknesses */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Identified Weaknesses & Hesitations
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {report.coreWeaknesses && report.coreWeaknesses.length > 0 ? (
                  report.coreWeaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[10px] font-bold text-rose-700">
                        ✕
                      </span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No critical technical weaknesses detected.</li>
                )}
              </ul>
            </div>

            {/* 7-Day Action Plan */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Personalized Action Plan Before Next Mock
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {report.personalizedActionPlan && report.personalizedActionPlan.length > 0 ? (
                  report.personalizedActionPlan.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed font-medium">{action}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">Review roadmap tasks before next session.</li>
                )}
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
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-[#FF5A36] border border-orange-200">
                      {rev.score} / 20 pts
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  "{rev.question}"
                </div>

                {/* Candidate Recorded Answer */}
                <div className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Your Recorded Answer: </span>
                  "{rev.studentAnswer}"
                </div>

                {/* Evaluator Critique */}
                <div className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900">Interviewer Critique: </span>
                  {rev.interviewerCritique}
                </div>

                {/* Model Answer Key */}
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
              className="rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 px-4 py-2 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
            >
              ← View Updated Placement Roadmap
            </button>

            <button
              onClick={() => setInterviewState("setup")}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow cursor-pointer"
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
