import React, { useState } from "react";
import { AuthInput } from "./AuthInput";
import { PasswordInput } from "./PasswordInput";
import { GoogleButton } from "./GoogleButton";
import { loginStudent, AuthResponse } from "../../services/auth";
import { Loader2, CheckCircle2 } from "lucide-react";

interface LoginFormProps {
  onSuccess: (authData: AuthResponse) => void;
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
  notification?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  notification,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  // Field-level error messages
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIdentifierError(null);
    setPasswordError(null);
    setGoogleNotice(null);

    const cleanIdentifier = identifier.trim();
    let hasError = false;

    if (!cleanIdentifier) {
      setIdentifierError("Please enter your email or roll number.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else if (password.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const data = await loginStudent({
        email: cleanIdentifier,
        password: password,
      });
      onSuccess(data);
    } catch (err: any) {
      setFormError(err.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setGoogleNotice(
      "Google Single Sign-On is configured for verified campus domains. For this environment, please sign in with your student credentials or register a new profile below."
    );
    setTimeout(() => {
      setGoogleNotice(null);
    }, 6000);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mobile-login-header mb-7 sm:mb-8">
        <h2 className="mobile-login-title text-[30px] sm:text-[34px] font-bold text-[#111315] tracking-tight leading-tight">
          Welcome Back
        </h2>
        <p className="mobile-login-subtitle mt-1.5 text-[14.5px] sm:text-[15px] text-[#737373] font-normal">
          Sign in to continue your journey
        </p>
      </div>

      {/* Account Deleted or Status Notification Banner */}
      {notification && (
        <div
          role="status"
          className="mb-5 rounded-[8px] bg-emerald-50 border border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-800 transition-all flex items-center gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Global Form Error Banner */}
      {formError && (
        <div
          role="alert"
          className="mb-5 rounded-[8px] bg-[#FFF5F3] border border-[#E04422]/30 px-4 py-3 text-sm font-medium text-[#D93815] transition-all"
        >
          {formError}
        </div>
      )}

      {/* Google Notice Banner */}
      {googleNotice && (
        <div
          role="status"
          className="mb-5 rounded-[8px] bg-stone-100 border border-stone-200 px-4 py-3 text-xs sm:text-sm text-[#555] transition-all leading-relaxed"
        >
          {googleNotice}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="mobile-form-spacing space-y-3.5">
        {/* Email or Roll Number Input */}
        <div>
          <AuthInput
            id="input-login-identifier"
            label="Email or Roll Number"
            hideLabelVisually
            type="text"
            autoComplete="username"
            placeholder="Email or Roll Number"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (identifierError) setIdentifierError(null);
              if (formError) setFormError(null);
            }}
            error={identifierError || undefined}
            disabled={loading}
          />
        </div>

        {/* Password Input */}
        <div>
          <PasswordInput
            id="input-login-password"
            label="Password"
            hideLabelVisually
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
              if (formError) setFormError(null);
            }}
            error={passwordError || undefined}
            disabled={loading}
          />
        </div>

        {/* Primary Sign In Button */}
        <div className="pt-1">
          <button
            id="btn-sign-in"
            type="submit"
            disabled={loading}
            className="mobile-primary-btn w-full h-[50px] sm:h-[52px] flex items-center justify-center gap-2 rounded-[8px] bg-[#111315] text-white text-[15px] font-medium tracking-wide hover:bg-[#222529] active:scale-[0.99] transition-all duration-200 outline-none focus:ring-1 focus:ring-[#111315] disabled:opacity-60 disabled:pointer-events-none cursor-pointer select-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </div>

        {/* Forgot Password (aligned right below Sign In button) */}
        <div className="flex justify-end pt-0.5">
          <button
            id="btn-forgot-password"
            type="button"
            onClick={onNavigateToForgotPassword}
            className="text-[13.5px] font-normal text-[#737373] hover:text-[#111315] transition-colors outline-none cursor-pointer select-none"
          >
            Forgot password?
          </button>
        </div>

        {/* Thin Divider */}
        <div className="mobile-divider py-2.5 flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[#E5E3DE]" />
          <span className="text-[13px] text-[#737373] select-none font-normal">
            or
          </span>
          <div className="flex-1 h-[1px] bg-[#E5E3DE]" />
        </div>

        {/* Google Sign-in */}
        <div>
          <GoogleButton onClick={handleGoogleClick} loading={loading} />
        </div>

        {/* Sign Up Navigation */}
        <div className="mobile-signup-row pt-5 text-center text-[14px] text-[#737373]">
          Don't have an account?{" "}
          <button
            id="btn-switch-signup"
            type="button"
            onClick={onNavigateToRegister}
            className="font-medium text-[#111315] hover:underline transition-colors outline-none cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
};
