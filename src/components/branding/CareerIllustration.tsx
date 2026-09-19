import React from "react";

interface CareerIllustrationProps {
  className?: string;
  width?: number | string;
}

export const CareerIllustration: React.FC<CareerIllustrationProps> = ({
  className = "",
  width = "100%",
}) => {
  return (
    <div
      className={`w-full flex items-center justify-center select-none ${className}`}
      style={{ width }}
      aria-hidden="true"
    >
      <img
        src="/career-illustration.png"
        alt="Career Readiness Illustration"
        className="w-full h-full max-h-full object-contain select-none pointer-events-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

