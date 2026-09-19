import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureItemProps {
  icon?: LucideIcon;
  text: string;
  compact?: boolean;
}

export const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, text, compact = false }) => {
  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3.5"} text-[#111315]`}>
      {Icon ? (
        <div className={`flex ${compact ? "h-3.5 w-3.5" : "h-5 w-5"} items-center justify-center text-[#111315] flex-shrink-0`}>
          <Icon className={`${compact ? "h-3 w-3 stroke-[1.5]" : "h-4 w-4 stroke-[1.8]"}`} aria-hidden="true" />
        </div>
      ) : (
        <svg
          width={compact ? "13" : "20"}
          height={compact ? "13" : "20"}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#111315] flex-shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
        </svg>
      )}
      <span className={`${compact ? "text-[10px] xs:text-[10.5px]" : "text-[15px] sm:text-[16px]"} font-medium text-[#111315] tracking-tight whitespace-nowrap`}>
        {text}
      </span>
    </div>
  );
};

