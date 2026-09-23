/**
 * Executive AI Interviewer Voice Engine
 * High-quality, natural human-like voice delivery for Dr. Maya Ramanathan.
 * 
 * Features:
 * - Natural conversational voice selection (prioritizes high-definition neural/natural voices)
 * - Context-aware delivery (opening, technical, follow-up, encouraging, etc.)
 * - Natural pacing with conversational inter-segment pauses
 * - Text normalization (strips markdown, expands technical acronyms, removes robotic prefixes)
 * - Safe barge-in & interruption handling (stops speech when candidate speaks or types)
 * - Chrome SpeechSynthesis garbage-collection and keep-alive watchdog
 */

export type SpeakingContext =
  | "opening"
  | "technical"
  | "follow_up"
  | "weak_answer"
  | "strong_answer"
  | "ending"
  | "neutral";

export interface VoiceDeliveryOptions {
  context?: SpeakingContext;
  intro?: string;
  remark?: string;
  question: string;
  onStart?: () => void;
  onEnd?: () => void;
  onInterrupted?: () => void;
  onSegmentChange?: (segment: "intro" | "remark" | "question" | "idle", text: string) => void;
}

export interface InterviewerVoiceStatus {
  isSupported: boolean;
  isSpeaking: boolean;
  voiceName: string;
  isVoiceLoaded: boolean;
}

class InterviewerVoiceEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pauseTimer: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private activeUtterancesSet: Set<SpeechSynthesisUtterance> = new Set();
  private isInterrupted: boolean = false;
  private isSpeakingInternal: boolean = false;
  private cachedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.cancelSpeech();
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Initializes and scores available voices to select the most natural, human-like voice.
   */
  private initVoices(): void {
    if (!this.isSupported()) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      this.voicesLoaded = true;
      this.cachedVoice = this.pickBestInterviewerVoice(voices);
    }
  }

  /**
   * Selects the most natural, professional executive English voice available on the client platform.
   */
  private pickBestInterviewerVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;

    // Filter to English voices
    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("en"));
    const candidateVoices = englishVoices.length > 0 ? englishVoices : voices;

    const scoreVoice = (v: SpeechSynthesisVoice): number => {
      let score = 0;
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();

      // Negative score for robotic / mechanical synthesizers
      if (
        name.includes("espeak") ||
        name.includes("klatt") ||
        name.includes("compact") ||
        name.includes("sampler") ||
        name.includes("whisper")
      ) {
        score -= 50;
      }

      // Premium & Natural Neural Voices
      if (name.includes("natural") || name.includes("online") || name.includes("neural")) {
        score += 40;
      }

      // Preferred high-quality interviewer voices by name
      if (name.includes("aria") || name.includes("jenny") || name.includes("ava")) {
        score += 35;
      }
      if (name.includes("samantha") || name.includes("serena") || name.includes("karen") || name.includes("moira")) {
        score += 30;
      }
      if (name.includes("guy") || name.includes("christopher") || name.includes("ryan") || name.includes("daniel")) {
        score += 25;
      }
      if (name.includes("google us english") || name.includes("google uk english female") || name.includes("google uk english male")) {
        score += 28;
      }

      // Locale preferences: en-US, en-GB, en-AU, en-IN
      if (lang === "en-us") score += 10;
      else if (lang === "en-gb") score += 9;
      else if (lang === "en-au" || lang === "en-ca" || lang === "en-in") score += 7;

      return score;
    };

    const sorted = [...candidateVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return sorted[0] || null;
  }

  /**
   * Cleans raw AI text into human spoken cadence:
   * - Strips markdown, emojis, asterisks, brackets, JSON fragments
   * - Removes robotic prefixes like "Next question:", "Question 1:"
   * - Expands technical acronyms for clear pronunciation
   */
  public cleanSpokenText(text: string): string {
    if (!text) return "";

    let cleaned = text
      // Remove JSON or code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Remove brackets and system tags e.g. [Turn 1], [Technical]
      .replace(/\[[^\]]*\]/g, "")
      // Remove markdown bold, italic, headers
      .replace(/[*_#~]/g, "")
      // Remove robotic prefixes
      .replace(/^(?:next question|question \d+|question [a-z]+|here is (?:the|your) (?:next )?question)\s*[:.-]\s*/i, "")
      .replace(/\b(?:next question|question \d+)\s*[:.-]\s*/gi, "")
      // Remove bullets and symbols
      .replace(/^[•\-\*]\s+/gm, "")
      // Expand common tech acronyms into spoken phonetics
      .replace(/\bAPI\b/g, "A P I")
      .replace(/\bAPIs\b/g, "A P Is")
      .replace(/\bSQL\b/g, "S Q L")
      .replace(/\bNoSQL\b/g, "No S Q L")
      .replace(/\bUI\b/g, "U I")
      .replace(/\bUX\b/g, "U X")
      .replace(/\bCSS\b/g, "C S S")
      .replace(/\bHTML\b/g, "H T M L")
      .replace(/\bHTTP\b/g, "H T T P")
      .replace(/\bHTTPS\b/g, "H T T P S")
      .replace(/\bCI\/CD\b/gi, "C I C D")
      .replace(/\bAWS\b/g, "A W S")
      .replace(/\bGCP\b/g, "G C P")
      .replace(/\bPR\b/g, "pull request")
      .replace(/\bPRs\b/g, "pull requests")
      .replace(/\bDB\b/g, "database")
      .replace(/\bDBs\b/g, "databases")
      .replace(/\brepo\b/g, "repository")
      .replace(/\brepos\b/g, "repositories")
      .replace(/\be\.g\.,?\b/gi, "for example,")
      .replace(/\bi\.e\.,?\b/gi, "that is,")
      .replace(/\bvs\.?\b/gi, "versus")
      .replace(/\bw\//gi, "with ")
      .replace(/\bw\/o\b/gi, "without ")
      .replace(/\bO\(1\)/g, "O of 1")
      .replace(/\bO\(n\)/g, "O of n")
      .replace(/\bO\(n\^2\)/g, "O of n squared")
      .replace(/\bO\(log\s*n\)/g, "O of log n")
      // Clean slashes between words into commas or 'or'
      .replace(/(\w+)\s*\/\s*(\w+)/g, "$1 or $2")
      // Remove emojis and non-standard symbols
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    return cleaned;
  }

  /**
   * Retrieves context-dependent voice acoustics (pitch, speaking rate).
   */
  private getContextSettings(context: SpeakingContext): { rate: number; pitch: number } {
    switch (context) {
      case "opening":
        // Warm, welcoming, professional
        return { rate: 0.95, pitch: 1.02 };
      case "technical":
        // Clear, focused, measured
        return { rate: 0.94, pitch: 0.98 };
      case "follow_up":
        // Curious, conversational, attentive
        return { rate: 0.96, pitch: 1.01 };
      case "weak_answer":
        // Patient, neutral, supportive
        return { rate: 0.92, pitch: 0.97 };
      case "strong_answer":
        // Engaged, challenging, appreciative
        return { rate: 0.97, pitch: 1.02 };
      case "ending":
        // Professional, encouraging, warm closure
        return { rate: 0.94, pitch: 1.00 };
      case "neutral":
      default:
        return { rate: 0.95, pitch: 1.00 };
    }
  }

  /**
   * Speaks a single segment returning a promise that resolves when speech ends.
   */
  private speakSingleSegment(
    text: string,
    rate: number,
    pitch: number
  ): Promise<"completed" | "interrupted" | "error"> {
    return new Promise((resolve) => {
      if (!this.isSupported() || !text.trim() || this.muted) {
        resolve("completed");
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.cachedVoice) {
          utterance.voice = this.cachedVoice;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1.0;

        this.currentUtterance = utterance;
        this.activeUtterancesSet.add(utterance);

        utterance.onend = () => {
          this.activeUtterancesSet.delete(utterance);
          if (this.currentUtterance === utterance) {
            this.currentUtterance = null;
          }
          resolve(this.isInterrupted ? "interrupted" : "completed");
        };

        utterance.onerror = (e) => {
          this.activeUtterancesSet.delete(utterance);
          if (this.currentUtterance === utterance) {
            this.currentUtterance = null;
          }
          // 'canceled' or 'interrupted' errors are expected during barge-in
          if (e.error === "canceled" || e.error === "interrupted") {
            resolve("interrupted");
          } else {
            console.warn("Interviewer voice warning:", e.error);
            resolve("error");
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis invoke error:", err);
        resolve("error");
      }
    });
  }

  /**
   * Starts a keep-alive pulse to prevent Chrome's 15-second speech synthesis timeout bug.
   */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.isSpeakingInternal && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 9000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * High-level conversational dialogue deliverer:
   * Speaks the acknowledgement/intro first, introduces a natural pause (350-500ms),
   * then speaks the question with focused technical cadence.
   */
  public async speakDialogueSequence(options: VoiceDeliveryOptions): Promise<void> {
    if (!this.isSupported() || this.muted) {
      options.onEnd?.();
      return;
    }

    // Cancel any active speech cleanly before starting fresh sequence
    this.cancelSpeech();
    this.isInterrupted = false;
    this.isSpeakingInternal = true;
    options.onStart?.();
    this.startKeepAlive();

    const context = options.context || "technical";
    const contextSettings = this.getContextSettings(context);

    try {
      // 1. First segment: Intro or Conversational Remark / Acknowledgement
      const firstSegmentRaw = options.intro || options.remark;
      if (firstSegmentRaw && firstSegmentRaw.trim()) {
        const cleanedRemark = this.cleanSpokenText(firstSegmentRaw);
        if (cleanedRemark) {
          options.onSegmentChange?.(
            options.intro ? "intro" : "remark",
            cleanedRemark
          );
          
          // Acknowledgements are spoken with a warm, conversational cadence
          const remarkResult = await this.speakSingleSegment(
            cleanedRemark,
            Math.min(1.0, contextSettings.rate + 0.02),
            contextSettings.pitch
          );

          if (remarkResult === "interrupted" || this.isInterrupted) {
            options.onInterrupted?.();
            this.finishSpeaking(options.onEnd);
            return;
          }

          // 2. Natural Conversational Pause between remark and question (400ms)
          const pauseResult = await new Promise<"resumed" | "interrupted">((resolve) => {
            this.pauseTimer = setTimeout(() => {
              this.pauseTimer = null;
              resolve("resumed");
            }, 420);
          });

          if (pauseResult === "interrupted" || this.isInterrupted) {
            options.onInterrupted?.();
            this.finishSpeaking(options.onEnd);
            return;
          }
        }
      }

      // 3. Second segment: The Core Interview Question
      const cleanedQuestion = this.cleanSpokenText(options.question);
      if (cleanedQuestion) {
        options.onSegmentChange?.("question", cleanedQuestion);

        const questionResult = await this.speakSingleSegment(
          cleanedQuestion,
          contextSettings.rate,
          Math.max(0.95, contextSettings.pitch - 0.02)
        );

        if (questionResult === "interrupted" || this.isInterrupted) {
          options.onInterrupted?.();
        }
      }
    } finally {
      this.finishSpeaking(options.onEnd);
    }
  }

  private finishSpeaking(callback?: () => void): void {
    this.isSpeakingInternal = false;
    this.stopKeepAlive();
    this.currentUtterance = null;
    callback?.();
  }

  /**
   * Barge-in / Interrupt: Instantly cuts off speech synthesis cleanly
   * when candidate speaks, types, or presses Barge-in.
   */
  public cancelSpeech(): void {
    this.isInterrupted = true;
    this.isSpeakingInternal = false;

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    this.stopKeepAlive();

    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        // safe
      }
    }

    this.activeUtterancesSet.clear();
    this.currentUtterance = null;
  }

  /**
   * Returns current voice status for UI telemetry.
   */
  public getStatus(): InterviewerVoiceStatus {
    return {
      isSupported: this.isSupported(),
      isSpeaking: this.isSpeakingInternal,
      voiceName: this.cachedVoice ? this.cachedVoice.name : "System Default English",
      isVoiceLoaded: this.voicesLoaded,
    };
  }
}

// Global Singleton Instance
export const interviewerVoice = new InterviewerVoiceEngine();
