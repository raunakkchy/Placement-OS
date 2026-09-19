import React, { useId } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hideLabelVisually?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`mobile-input-field w-full h-[50px] sm:h-[52px] px-4 rounded-[8px] bg-white border text-[15px] text-[#111315] placeholder-[#8E8E93] transition-all duration-200 outline-none ${
              error
                ? "border-[#E04422] focus:border-[#E04422] focus:ring-1 focus:ring-[#E04422]"
                : "border-[#E5E3DE] focus:border-[#111315] focus:ring-1 focus:ring-[#111315]"
            } ${className}`}
            {...props}
          />
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

AuthInput.displayName = "AuthInput";
