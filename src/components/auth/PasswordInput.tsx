import React, { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hideLabelVisually?: boolean;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(
  (
    {
      label,
      error,
      hideLabelVisually = false,
      id: customId,
      className = "",
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const inputId = customId || generatedId;

    return (
      <div className="w-full space-y-1.5">
        <label
          htmlFor={inputId}
          className={`block text-xs font-bold uppercase tracking-wider text-[#737373] ${
            hideLabelVisually ? "sr-only" : ""
          }`}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`mobile-input-field w-full h-[50px] sm:h-[52px] pl-4 pr-12 rounded-[8px] bg-white border text-[15px] text-[#111315] placeholder-[#8E8E93] transition-all duration-200 outline-none ${
              error
                ? "border-[#E04422] focus:border-[#E04422] focus:ring-1 focus:ring-[#E04422]"
                : "border-[#E5E3DE] focus:border-[#111315] focus:ring-1 focus:ring-[#111315]"
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#737373] hover:text-[#111315] transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-[#111315]"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 stroke-[1.8]" />
            ) : (
              <Eye className="h-5 w-5 stroke-[1.8]" />
            )}
          </button>
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs font-medium text-[#FF5A36] mt-1 pl-0.5"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
