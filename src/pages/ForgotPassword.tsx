import React, { useState, useEffect, useRef, useMemo } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { PasswordInput } from "../components/auth/PasswordInput";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} from "../services/auth";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Mail,
  KeyRound,
  ShieldCheck,
  Check,
  RotateCcw,
} from "lucide-react";

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

type ForgotStep = "email" | "otp" | "new_password" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
}) => {
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend cooldown timer in seconds
  const [cooldown, setCooldown] = useState<number>(0);

  // Refs for 6-digit OTP input boxes
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Decrement countdown timer every second
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      const timer = setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Password validation policy checks
  const passwordPolicy = useMemo(() => {
    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const isValid = hasMinLen && hasUpper && hasNumber && hasSpecial;
    const matches = confirmPassword.length > 0 && newPassword === confirmPassword;

    return {
      hasMinLen,
      hasUpper,
      hasNumber,
      hasSpecial,
      isValid,
      matches,
    };
  }, [newPassword, confirmPassword]);

  // ----------------------------------------------------
  // STEP 1: REQUEST OTP
  // ----------------------------------------------------
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(cleanEmail);
      // Generic message to prevent email enumeration
      setInfoMessage(
        res.message || "If an account exists with this email, an OTP has been sent."
      );
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err: any) {
      // Even if network errors occur, show helpful guidance
      setError(
        err.message || "Unable to send verification OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // STEP 2: VERIFY OTP
  // ----------------------------------------------------
  const handleOtpDigitChange = (index: number, value: string) => {
    if (error) setError(null);

    // Keep only numeric characters
    const numericChar = value.replace(/\D/g, "");

    // If empty (e.g. cleared)
    if (!numericChar) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // Single digit input
    const char = numericChar.slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    // Advance focus to next input
    if (index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        // Move to previous box and clear it
        otpRefs.current[index - 1]?.focus();
        const updated = [...otpDigits];
        updated[index - 1] = "";
        setOtpDigits(updated);
      } else {
        const updated = [...otpDigits];
        updated[index] = "";
        setOtpDigits(updated);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (error) setError(null);

    const pastedData = e.clipboardData.getData("text");
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (digitsOnly.length > 0) {
      const updated = [...otpDigits];
      for (let i = 0; i < OTP_LENGTH; i++) {
        updated[i] = digitsOnly[i] || "";
      }
      setOtpDigits(updated);

      // Focus the next empty box or the last box
      const nextEmptyIndex = updated.findIndex((d) => !d);
      if (nextEmptyIndex !== -1) {
        otpRefs.current[nextEmptyIndex]?.focus();
      } else {
        otpRefs.current[OTP_LENGTH - 1]?.focus();
      }
    }
  };

  const fullOtpCode = otpDigits.join("");
  const isOtpComplete = fullOtpCode.length === OTP_LENGTH;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpComplete) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await verifyPasswordResetOtp(email.trim(), fullOtpCode);
      setResetToken(res.resetToken);
      setNewPassword("");
      setConfirmPassword("");
      setStep("new_password");
    } catch (err: any) {
      setError(
        err.message || "Invalid or expired OTP. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(email.trim());
      setInfoMessage(
        res.message || "If an account exists with this email, an OTP has been sent."
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // STEP 3: RESET PASSWORD
  // ----------------------------------------------------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (!passwordPolicy.isValid) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithOtp({
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <AuthLayout showHero={false}>
      <div className="w-full">
        {/* ==================================================== */}
        {/* STEP 1: ENTER REGISTERED EMAIL */}
        {/* ==================================================== */}
        {step === "email" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-[30px] sm:text-[34px] font-bold text-[#111315] tracking-tight leading-tight">
                Forgot Password?
              </h2>
              <p className="mt-2 text-[15px] text-[#737373] font-normal">
                Enter your registered email address.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} noValidate className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-[9px] bg-[#FFF5F3] border border-[#FF5A36]/30 px-4 py-3 text-sm font-medium text-[#D93815] flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <AuthInput
                id="input-forgot-email"
                label="Email Address"
                placeholder="Email Address"
                hideLabelVisually
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
              />

              <div className="pt-2">
                <button
                  id="btn-send-otp"
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-[52px] sm:h-[54px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Send OTP</span>
                  )}
                </button>
              </div>

              <div className="pt-4 text-center">
                <button
                  id="btn-back-login"
                  type="button"
                  onClick={onNavigateToLogin}
                  disabled={loading}
                  className="text-[14px] font-medium text-[#737373] hover:text-[#111315] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: VERIFY 6-DIGIT OTP */}
        {/* ==================================================== */}
        {step === "otp" && (
          <div>
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Email Verification</span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111315] tracking-tight leading-tight">
                Verify OTP
              </h2>
              <p className="mt-1.5 text-[14px] text-[#737373]">
                Enter the 6-digit OTP sent to your email.
              </p>
            </div>

            {/* Generic confirmation message that OTP was dispatched */}
            {infoMessage && (
              <div
                role="status"
                className="mb-4 rounded-[9px] bg-slate-50 border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5"
              >
                <Mail className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <span className="leading-snug">{infoMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-[9px] bg-[#FFF5F3] border border-[#FF5A36]/30 px-4 py-3 text-sm font-medium text-[#D93815] flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
              {/* 6 Segmented OTP Boxes */}
              <div className="flex justify-between items-center gap-2 sm:gap-2.5 pt-1">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    id={`otp-digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    disabled={loading}
                    aria-label={`Digit ${index + 1} of 6`}
                    className={`w-11 h-13 sm:w-13 sm:h-14 text-center font-bold text-xl sm:text-2xl rounded-[9px] border bg-white text-[#111315] transition-all duration-150 outline-none select-all ${
                      digit
                        ? "border-[#111315] bg-[#FAF8F5]"
                        : "border-[#E5E3DE] hover:border-slate-400"
                    } focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/10`}
                  />
                ))}
              </div>

              {/* Verify OTP Button */}
              <div className="pt-2">
                <button
                  id="btn-verify-otp"
                  type="submit"
                  disabled={loading || !isOtpComplete}
                  className="w-full h-[52px] sm:h-[54px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <span>Verify OTP</span>
                  )}
                </button>
              </div>

              {/* Resend Cooldown Counter & Controls */}
              <div className="flex flex-col items-center gap-3 pt-1 text-center">
                {cooldown > 0 ? (
                  <p className="text-[13.5px] font-medium text-[#737373]">
                    Resend OTP in{" "}
                    <span className="font-semibold text-[#111315] tabular-nums">
                      {formatCooldown(cooldown)}
                    </span>
                  </p>
                ) : (
                  <button
                    id="btn-resend-otp"
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#111315] hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Resend OTP</span>
                  </button>
                )}

                <button
                  id="btn-change-email"
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfoMessage(null);
                    setStep("email");
                  }}
                  disabled={loading}
                  className="text-[13.5px] font-medium text-[#737373] hover:text-[#111315] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Use a different email address</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: CREATE NEW PASSWORD */}
        {/* ==================================================== */}
        {step === "new_password" && (
          <div>
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>OTP Verified</span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111315] tracking-tight leading-tight">
                Create New Password
              </h2>
              <p className="mt-1.5 text-[14px] text-[#737373]">
                Enter a new password meeting campus security requirements.
              </p>
            </div>

            <form onSubmit={handleResetPassword} noValidate className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-[9px] bg-[#FFF5F3] border border-[#FF5A36]/30 px-4 py-3 text-sm font-medium text-[#D93815] flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <PasswordInput
                  id="input-new-password"
                  label="New Password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <PasswordInput
                  id="input-confirm-password"
                  label="Confirm Password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  error={
                    confirmPassword && !passwordPolicy.matches
                      ? "Passwords do not match."
                      : undefined
                  }
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-[9px] bg-slate-50 border border-slate-200/90 p-3.5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Password Requirements
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordPolicy.hasMinLen
                        ? "text-emerald-700 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        passwordPolicy.hasMinLen
                          ? "text-emerald-600 stroke-[2.5]"
                          : "text-slate-300"
                      }`}
                    />
                    <span>At least 8 characters</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordPolicy.hasUpper
                        ? "text-emerald-700 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        passwordPolicy.hasUpper
                          ? "text-emerald-600 stroke-[2.5]"
                          : "text-slate-300"
                      }`}
                    />
                    <span>One uppercase letter</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordPolicy.hasNumber
                        ? "text-emerald-700 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        passwordPolicy.hasNumber
                          ? "text-emerald-600 stroke-[2.5]"
                          : "text-slate-300"
                      }`}
                    />
                    <span>One number</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordPolicy.hasSpecial
                        ? "text-emerald-700 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        passwordPolicy.hasSpecial
                          ? "text-emerald-600 stroke-[2.5]"
                          : "text-slate-300"
                      }`}
                    />
                    <span>One special character</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-reset-password"
                  type="submit"
                  disabled={
                    loading ||
                    !passwordPolicy.isValid ||
                    !passwordPolicy.matches
                  }
                  className="w-full h-[52px] sm:h-[54px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  disabled={loading}
                  className="text-[14px] font-medium text-[#737373] hover:text-[#111315] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: PASSWORD RESET SUCCESS */}
        {/* ==================================================== */}
        {step === "success" && (
          <div className="rounded-[12px] bg-white border border-[#E5E3DE] p-6 sm:p-8 text-center space-y-5 shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#111315]">
                Password Reset Successful
              </h3>
              <p className="mt-2 text-sm text-[#737373] leading-relaxed max-w-sm mx-auto">
                Your password has been updated securely. All previous active sessions have been terminated. You can now log in using your new credentials.
              </p>
            </div>
            <button
              id="btn-return-login-success"
              type="button"
              onClick={onNavigateToLogin}
              className="w-full h-[52px] sm:h-[54px] rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold hover:bg-[#202327] transition-all cursor-pointer shadow-xs"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};
