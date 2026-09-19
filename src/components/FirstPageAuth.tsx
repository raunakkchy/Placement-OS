import React, { useState } from "react";
import { User, ReadinessScore, SuggestedJobRole } from "../types";
import { AlertCircle, CheckCircle2, LogIn, UserPlus } from "lucide-react";

interface FirstPageAuthProps {
  initialMode?: "login" | "register";
  onSuccess: (user: User, score?: ReadinessScore, suggestedJobs?: SuggestedJobRole[]) => void;
}

export const FirstPageAuth: React.FC<FirstPageAuthProps> = ({
  initialMode = "login",
  onSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("B.Tech");
  const [branch, setBranch] = useState("Computer Science and Engineering");
  const [semester, setSemester] = useState<number | "">("");
  const [cgpa, setCgpa] = useState<number | "">("");
  const [tenthMarks, setTenthMarks] = useState<number | "">("");
  const [twelfthMarks, setTwelfthMarks] = useState<number | "">("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailOrRoll = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!emailOrRoll || !password) {
      setError("Please enter your email or roll number and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailOrRoll,
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Check your credentials.");
      }

      onSuccess(data.user, data.readinessScore, data.suggestedJobs);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("Google Sign-In is configured with campus Single Sign-On (SSO). Please enter your student account credentials below or register a new account.");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !registerEmail.trim() || !rollNumber.trim() || !registerPassword.trim() || !college.trim()) {
      setError("Please fill in all required fields (Full Name, Email, Roll Number, College, and Password).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: registerEmail.trim(),
          rollNumber: rollNumber.trim(),
          password: registerPassword,
          college: college.trim(),
          course,
          branch: branch.trim(),
          semester: semester ? Number(semester) : 1,
          cgpa: cgpa ? Number(cgpa) : 0,
          tenthMarks: tenthMarks ? Number(tenthMarks) : undefined,
          twelfthMarks: twelfthMarks ? Number(twelfthMarks) : undefined,
          graduationYear,
          backlogs: 0,
          skills: selectedSkills,
          targetRoles: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      onSuccess(data.user, data.readinessScore, data.suggestedJobs);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-5xl bg-[#FBF9F5] rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Brand, Value Proposition & Line Art Illustration */}
        <div className="lg:col-span-6 bg-[#FAF7F2] p-8 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-200/80">
          <div>
            {/* Top Logo */}
            <div className="flex items-center gap-2.5">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-black fill-none stroke-current"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="12" cy="12" r="1.5" className="fill-current" />
              </svg>
              <span className="text-sm font-black tracking-wider text-black uppercase">
                PLACEMENT OS
              </span>
            </div>

            {/* Headline */}
            <h1 className="mt-8 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
              Your Operating System <br />
              for Career Readiness.
            </h1>

            {/* Bullets with Circular Target Icons */}
            <div className="mt-7 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 bg-white/70 text-slate-800">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-slate-800 fill-none stroke-current"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-800">
                  Track your progress
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 bg-white/70 text-slate-800">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-slate-800 fill-none stroke-current"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-800">
                  Get AI-powered guidance
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 bg-white/70 text-slate-800">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-slate-800 fill-none stroke-current"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-800">
                  Build your dream career
                </span>
              </div>
            </div>
          </div>

          {/* Minimalist Line-Art Illustration matching the screenshot */}
          <div className="my-6 flex justify-center items-center">
            <svg
              viewBox="0 0 340 210"
              className="w-full max-w-[290px] h-auto drop-shadow-xs"
              fill="none"
              stroke="#1C1C1E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Left Potted Plant */}
              <g id="left-plant">
                {/* Pot */}
                <path d="M42 162 L47 195 L65 195 L70 162 Z" fill="#FFFFFF" />
                <line x1="40" y1="162" x2="72" y2="162" />
                {/* Leaves */}
                <path d="M56 162 Q52 135 40 120 Q56 130 56 162" fill="#FFFFFF" />
                <path d="M56 162 Q56 120 56 100 Q62 125 56 162" fill="#FFFFFF" />
                <path d="M56 162 Q64 130 74 125 Q64 140 56 162" fill="#FFFFFF" />
              </g>

              {/* Desk / Table */}
              <g id="desk">
                {/* Table top 3D surface */}
                <path
                  d="M102 188 L238 188 L265 168 L129 168 Z"
                  fill="#FFFFFF"
                />
                {/* Desk front lip */}
                <path d="M102 188 L102 196 L238 196 L238 188" fill="#FFFFFF" />
                {/* Desk Legs */}
                <line x1="112" y1="196" x2="112" y2="204" />
                <line x1="228" y1="196" x2="228" y2="204" />
              </g>

              {/* Student Person */}
              <g id="student">
                {/* Hair */}
                <path
                  d="M102 85 C98 62 118 52 132 55 C142 57 146 68 144 80 C140 76 136 78 132 78 C124 78 116 82 102 85 Z"
                  fill="#1C1C1E"
                />
                {/* Face & Neck */}
                <path d="M112 82 Q112 104 125 106 Q134 105 137 92" fill="#FFFFFF" />
                {/* Smile & Eyes */}
                <path d="M125 90 Q127 94 132 91" strokeWidth="1.8" />
                <circle cx="127" cy="80" r="1.3" fill="#1C1C1E" />
                <path d="M124 75 Q128 73 132 75" strokeWidth="1.2" />
                {/* Ear */}
                <path d="M112 85 Q108 88 112 92" />
                {/* Neck */}
                <line x1="120" y1="106" x2="120" y2="116" />
                <line x1="128" y1="105" x2="128" y2="116" />
                {/* Torso & Sweater */}
                <path
                  d="M100 135 L88 178 L142 178 L142 135 Q125 125 100 135 Z"
                  fill="#FFFFFF"
                />
                {/* Collar */}
                <path d="M118 116 Q124 122 130 116" />
                {/* Left Arm extended to laptop */}
                <path d="M100 135 Q115 152 142 165" />
                {/* Right Arm extended to keyboard */}
                <path d="M130 130 L160 162" />
                {/* Hands on keyboard */}
                <path d="M142 165 L164 165" strokeWidth="2.5" />
              </g>

              {/* Laptop */}
              <g id="laptop">
                {/* Screen */}
                <polygon points="166,134 196,130 190,165 160,165" fill="#1C1C1E" />
                {/* Base / Keyboard */}
                <polygon points="160,165 190,165 180,172 148,172" fill="#FFFFFF" />
              </g>

              {/* Right Potted Plant */}
              <g id="right-plant">
                {/* Pot on table */}
                <path d="M246 160 L249 180 L263 180 L266 160 Z" fill="#FFFFFF" />
                <line x1="244" y1="160" x2="268" y2="160" />
                {/* Stem & Leaves */}
                <path d="M256 160 Q252 140 242 132" />
                <path d="M242 132 Q235 125 240 120 Q248 122 242 132" fill="#FFFFFF" />
                <path d="M256 160 Q262 135 272 128" />
                <path d="M272 128 Q278 120 274 116 Q266 118 272 128" fill="#FFFFFF" />
                <path d="M256 150 Q258 135 258 122" />
                <path d="M258 122 Q262 114 256 112 Q252 116 258 122" fill="#FFFFFF" />
              </g>
            </svg>
          </div>

          {/* Bottom Footer Tagline */}
          <div className="pt-2 text-stone-500 font-medium text-[11px] tracking-wide flex items-center justify-between sm:justify-start sm:gap-2">
            <span>Better Skills</span>
            <span className="text-stone-400">→</span>
            <span>Better Opportunities</span>
            <span className="text-stone-400">→</span>
            <span>A Brighter Future</span>
          </div>
        </div>

        {/* Right Side: Auth Form (Sign In / Register Student Account) */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          {/* Screen pe 2 Options: 1st Option: Login, 2nd Option: New Student Register */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5 border border-stone-200">
            <button
              id="opt-1-login"
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                mode === "login"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>1. Login</span>
            </button>
            <button
              id="opt-2-new-student-register"
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                mode === "register"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>2. New Student Register</span>
            </button>
          </div>

          {/* Alert / Feedback message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "login" ? (
            /* Mode 2: Welcome Back (Matches Screenshot Pixel-for-Pixel) */
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-stone-500">
                  Sign in to continue your journey
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <input
                    id="input-email-or-roll"
                    type="text"
                    placeholder="Email or Roll Number"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <input
                    id="input-login-password"
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
                  />
                </div>

                <button
                  id="btn-sign-in-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#141416] py-3.5 text-sm font-semibold text-white hover:bg-black transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setError(
                        "To reset your password, please use the Reset Password tab or answer your registered security questions."
                      )
                    }
                    className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* 'or' divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-stone-400 font-medium">or</span>
                  </div>
                </div>

                {/* Continue with Google button */}
                <button
                  id="btn-continue-google"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-stone-50 transition-all shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <p className="pt-2 text-center text-xs text-stone-500">
                  New student?{" "}
                  <button
                    id="btn-switch-to-signup"
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError(null);
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    2. New Student Register
                  </button>
                </p>
              </form>
            </div>
          ) : (
            /* Mode 1: Register New Student Account */
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  New Student Registration
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Set up your academic profile to unlock AI placement readiness score
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Raunak Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Student Roll / Reg. Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 22CS104 / 2026BTECH089"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@college.edu"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Create Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    College / Institute Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netaji Subhas Institute of Technology (NSIT Bihta)"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Course
                    </label>
                    <select
                      value={course}
                      onChange={(e) => {
                        const newCourse = e.target.value;
                        setCourse(newCourse);
                        const maxSem = newCourse === "Diploma" || newCourse === "BCA" ? 6 : 8;
                        if (typeof semester === "number" && semester > maxSem) {
                          setSemester("");
                        }
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="B.Tech">B.Tech</option>
                      <option value="B.E.">B.E.</option>
                      <option value="Diploma">Diploma</option>
                      <option value="BCA">BCA</option>
                      <option value="MCA">MCA</option>
                      <option value="M.Tech">M.Tech</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Current Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="">Select Semester</option>
                      {Array.from({ length: course === "Diploma" || course === "BCA" ? 6 : 8 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      CGPA / 10 *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      required
                      placeholder="8.4"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Passing Year
                    </label>
                    <select
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                    </select>
                  </div>
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-[#141416] py-3 text-xs sm:text-sm font-semibold text-white hover:bg-black transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Creating Profile & Readiness Score..." : "Register New Student"}
                </button>

                <p className="text-center text-xs text-stone-500 pt-1">
                  Already have an account?{" "}
                  <button
                    id="btn-switch-to-login"
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    1. Login
                  </button>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
