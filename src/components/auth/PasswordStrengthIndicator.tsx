import React from "react";
import { Check } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export interface PasswordChecks {
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  score: number;
  isValid: boolean;
}

export function evaluatePassword(password: string): PasswordChecks {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const passedCount = [
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  return {
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    score: passedCount,
    isValid: passedCount === 5,
  };
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const checks = evaluatePassword(password);

  const getStrengthLabel = () => {
    if (!password) return "";
    if (checks.score <= 2) return "Weak";
    if (checks.score <= 4) return "Fair";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (!password) return "bg-[#E5E3DE]";
    if (checks.score <= 2) return "bg-[#FF5A36]";
    if (checks.score <= 4) return "bg-amber-500";
    return "bg-emerald-600";
  };

  const getStrengthTextColor = () => {
    if (!password) return "text-[#737373]";
    if (checks.score <= 2) return "text-[#FF5A36]";
    if (checks.score <= 4) return "text-amber-600";
    return "text-emerald-700";
  };

  const requirements = [
    { label: "8+ characters", met: checks.hasLength },
    { label: "1 uppercase (A-Z)", met: checks.hasUpper },
    { label: "1 lowercase (a-z)", met: checks.hasLower },
    { label: "1 number (0-9)", met: checks.hasNumber },
    { label: "1 special character (!@#$)", met: checks.hasSpecial },
  ];

  return (
    <div className="mt-2 space-y-2 pt-1" aria-live="polite">
      {/* Strength Bar */}
      {password && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#737373] font-medium">Password Strength</span>
            <span className={`font-semibold ${getStrengthTextColor()}`}>
              {getStrengthLabel()}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`h-full rounded-full transition-all duration-300 ${
                  index <= checks.score ? getStrengthColor() : "bg-[#E5E3DE]"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Requirement Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 pt-1">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              req.met ? "text-[#111315] font-medium" : "text-[#737373]"
            }`}
          >
            <div
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${
                req.met
                  ? "bg-emerald-600 text-white"
                  : "border border-[#D0CECB] bg-white text-transparent"
              }`}
            >
              <Check className="h-2.5 w-2.5 stroke-[2.5]" />
            </div>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
