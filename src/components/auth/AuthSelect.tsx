import React, { useId } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AuthSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hideLabelVisually?: boolean;
}

export const AuthSelect = React.forwardRef<HTMLSelectElement, AuthSelectProps>(
  (
    {
      label,
      options,
      placeholder,
      error,
      hideLabelVisually = false,
      id: customId,
      className = "",
      value,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = customId || generatedId;

    return (
      <div className="w-full space-y-1.5">
        <label
          htmlFor={selectId}
          className={`block text-xs font-bold uppercase tracking-wider text-[#737373] ${
            hideLabelVisually ? "sr-only" : ""
          }`}
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={`w-full h-[58px] pl-4 pr-11 rounded-[9px] bg-white border text-[15px] sm:text-[16px] appearance-none transition-all duration-200 outline-none cursor-pointer ${
              !value ? "text-[#9CA3AF] font-normal" : "text-[#111315] font-bold"
            } ${
              error
                ? "border-[#FF5A36] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36]"
                : "border-[#E5E3DE] focus:border-[#111315] focus:ring-1 focus:ring-[#111315]"
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-[#9CA3AF] font-normal">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={
                  opt.disabled
                    ? "text-[#9CA3AF] bg-stone-50 font-normal"
                    : "font-bold text-[#111315]"
                }
              >
                {opt.label}{opt.disabled ? " (Selected elsewhere)" : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#737373]">
            <ChevronDown className="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        {error && (
          <p
            id={`${selectId}-error`}
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

AuthSelect.displayName = "AuthSelect";
