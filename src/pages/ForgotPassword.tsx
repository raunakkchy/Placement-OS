import React, { useState, useMemo } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { PasswordInput } from "../components/auth/PasswordInput";
import {
  PasswordStrengthIndicator,
  evaluatePassword,
} from "../components/auth/PasswordStrengthIndicator";
import {
  identifyStudentAccount,
  verifySecurityAnswers,
  resetPasswordWithSecurity,
} from "../services/auth";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

type ForgotStep = "identify" | "security_questions" | "new_password" | "success";

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
}) => {
  const [step, setStep] = useState<ForgotStep>("identify");
  const [identifier, setIdentifier] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [question1, setQuestion1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live password validation
  const passwordEvaluation = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;

  // Step 1: Identify Account
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your academic email or roll number.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await identifyStudentAccount(cleanId);
      setAccountEmail(res.identifier);
      setQuestion1(res.question1);
      setQuestion2(res.question2);
      setAnswer1("");
      setAnswer2("");
      setStep("security_questions");
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to find an account matching these details or security questions are not configured."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Security Answers
  const handleVerifyAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAns1 = answer1.trim();
    const cleanAns2 = answer2.trim();

    if (!cleanAns1 || !cleanAns2) {
      setError("Both security answers are required.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await verifySecurityAnswers({
        identifier: accountEmail || identifier.trim(),
        securityAnswer1: cleanAns1,
        securityAnswer2: cleanAns2,
      });

      setResetToken(res.resetToken);
      setNewPassword("");
      setConfirmPassword("");
      setStep("new_password");
    } catch (err: any) {
      // Show generic error without exposing which answer was incorrect
      setError(
        err.message || "The security answers are incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (!passwordEvaluation.isValid) {
      setError(
        "Password must contain at least 8 characters, uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithSecurity({
        resetToken,
        identifier: accountEmail || identifier.trim(),
        securityAnswer1: answer1.trim(),
        securityAnswer2: answer2.trim(),
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

  return (
    <AuthLayout showHero={false}>
      <div className="w-full">
        {/* STEP 1: IDENTIFY ACCOUNT */}
        {step === "identify" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-[30px] sm:text-[34px] font-bold text-[#111315] tracking-tight leading-tight">
                Forgot Password
              </h2>
              <p className="mt-2 text-[15px] text-[#737373] font-normal">
                Enter your registered campus email or roll number to locate your student profile and recover your account.
              </p>
            </div>

            <form onSubmit={handleIdentify} noValidate className="space-y-4">
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
                id="input-forgot-identifier"
                label="Email or Roll Number"
                placeholder="Student Email or Roll / Reg. Number"
                hideLabelVisually
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
              />

              <div className="pt-2">
                <button
                  id="btn-find-account"
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] sm:h-[58px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Checking Student Records...</span>
                    </>
                  ) : (
                    <span>Continue to Security Verification</span>
                  )}
                </button>
              </div>

              <div className="pt-4 text-center">
                <button
                  id="btn-back-login"
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-[14px] font-medium text-[#737373] hover:text-[#111315] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: VERIFY SECURITY QUESTIONS */}
        {step === "security_questions" && (
          <div>
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Account Recovery</span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111315] tracking-tight leading-tight">
                Security Questions
              </h2>
              <p className="mt-1.5 text-[14px] text-[#737373]">
                Answer both recovery questions configured during registration to confirm your identity.
              </p>
            </div>

            <form onSubmit={handleVerifyAnswers} noValidate className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-[9px] bg-[#FFF5F3] border border-[#FF5A36]/30 px-4 py-3 text-sm font-medium text-[#D93815] flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Security Question 1 */}
              <div className="rounded-[10px] bg-slate-50 border border-slate-200/90 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Security Question 1</span>
                </div>
                <p className="text-[14px] font-semibold text-[#111315] leading-snug">
                  {question1}
                </p>
                <div className="pt-1">
                  <AuthInput
                    id="input-security-answer-1"
                    label="Answer 1"
                    placeholder="Enter your answer"
                    hideLabelVisually
                    type="text"
                    value={answer1}
                    onChange={(e) => {
                      setAnswer1(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Security Question 2 */}
              <div className="rounded-[10px] bg-slate-50 border border-slate-200/90 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Security Question 2</span>
                </div>
                <p className="text-[14px] font-semibold text-[#111315] leading-snug">
                  {question2}
                </p>
                <div className="pt-1">
                  <AuthInput
                    id="input-security-answer-2"
                    label="Answer 2"
                    placeholder="Enter your answer"
                    hideLabelVisually
                    type="text"
                    value={answer2}
                    onChange={(e) => {
                      setAnswer2(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  id="btn-verify-security-answers"
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] sm:h-[58px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Verifying Answers...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("identify");
                  }}
                  disabled={loading}
                  className="w-full py-2.5 text-[14px] font-medium text-[#737373] hover:text-[#111315] transition-colors cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Change Identifier</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === "new_password" && (
          <div>
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Identity Verified</span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111315] tracking-tight leading-tight">
                Create New Password
              </h2>
              <p className="mt-1.5 text-[14px] text-[#737373]">
                Enter a strong new password meeting campus security requirements.
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
                  id="input-reset-new-password"
                  label="New Password"
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  autoFocus
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div>
                <PasswordInput
                  id="input-reset-confirm-password"
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  error={!passwordsMatch ? "Passwords do not match." : undefined}
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-save-new-password"
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] sm:h-[58px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <span>Set New Password</span>
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
                  <span>Cancel and Return to Sign In</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
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
                Your password has been updated securely. All previous active sessions have been signed out. You can now log in using your new password.
              </p>
            </div>
            <button
              id="btn-return-login-success"
              type="button"
              onClick={onNavigateToLogin}
              className="w-full h-[52px] sm:h-[56px] rounded-[9px] bg-[#111315] text-white text-[15px] font-semibold hover:bg-[#202327] transition-all cursor-pointer shadow-xs"
            >
              Sign In to Placement OS
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};
