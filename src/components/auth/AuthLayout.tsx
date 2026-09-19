import React from "react";
import { PlacementLogo } from "../branding/PlacementLogo";
import { CareerIllustration } from "../branding/CareerIllustration";
import { FeatureItem } from "./FeatureItem";

interface AuthLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
  showHero?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  wide = false,
  showHero = true,
}) => {
  if (!showHero) {
    return (
      <div className="w-full min-h-screen min-h-[100dvh] bg-[#FAF9F5] text-[#111315] flex flex-col font-sans selection:bg-[#111315] selection:text-white antialiased overflow-y-auto overscroll-y-auto">
        <main className="flex-1 w-full flex flex-col justify-start items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14 min-h-max">
          <div className={`w-full ${wide ? "max-w-[620px]" : "max-w-[420px]"}`}>
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-auth-wrapper min-h-screen w-full bg-[#FAF9F5] text-[#111315] flex flex-col font-sans selection:bg-[#111315] selection:text-white antialiased">
      <main className="mobile-auth-main desktop-auth-main flex-1 w-full grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* ========================================================================= */}
        {/* TOP SECTION (MOBILE 30vh) / LEFT SECTION (DESKTOP/TABLET 50%)              */}
        {/* ========================================================================= */}
        <section
          aria-label="Branding and Overview"
          className="mobile-top-section desktop-left-col flex flex-col justify-between px-7 py-8 sm:px-12 sm:py-10 lg:px-12 lg:py-8 xl:px-16 xl:py-10 2xl:px-20 2xl:py-12 border-b lg:border-b-0 lg:border-r border-[#E5E3DE] bg-[#FAF9F5] lg:h-screen lg:max-h-screen"
        >
          {/* MOBILE ONLY VIEW (max-width: 760px, exactly 30vh) */}
          <div className="mobile-top-content flex flex-col justify-between h-full w-full">
            {/* Top: Placement OS Brand */}
            <div className="flex items-center">
              <PlacementLogo size="xs" />
            </div>

            {/* Middle: 2-column compact content */}
            <div className="flex items-center justify-between gap-3 my-auto overflow-hidden">
              {/* Left: Heading & 3 Feature points */}
              <div className="flex-1 min-w-0 pr-1">
                <h1 className="text-[12px] font-bold text-[#111315] leading-[1.2] tracking-tight">
                  Your Operating System <br />
                  for Career Readiness.
                </h1>
                <div className="mt-1.5 space-y-1">
                  <FeatureItem text="Track your progress" compact />
                  <FeatureItem text="Get AI-powered guidance" compact />
                  <FeatureItem text="Build your dream career" compact />
                </div>
              </div>

              {/* Right: Career Illustration */}
              <div className="w-[145px] xs:w-[165px] sm:w-[190px] flex-shrink-0 flex items-center justify-center">
                <CareerIllustration className="max-w-[170px] max-h-[110px] w-full h-full" />
              </div>
            </div>

            {/* Bottom: Tagline */}
            <footer className="text-[9px] font-normal text-[#737373] tracking-wide flex items-center gap-1.5 flex-wrap select-none">
              <span>Better Skills</span>
              <span className="text-[#999]">→</span>
              <span>Better Opportunities</span>
              <span className="text-[#999]">→</span>
              <span>A Brighter Future</span>
            </footer>
          </div>

          {/* TABLET / DESKTOP VIEW (> 760px) */}
          <div className="desktop-tablet-content flex flex-col justify-between h-full">
            {/* Top: Placement OS Brand + Heading + 3 Features */}
            <div>
              <PlacementLogo size="md" />

              {/* Main Headline */}
              <div className="mt-5 sm:mt-6 lg:mt-5 xl:mt-7 max-w-[460px]">
                <h1 className="text-[28px] sm:text-[34px] lg:text-[32px] xl:text-[38px] font-bold text-[#111315] leading-[1.16] tracking-tight">
                  Your Operating System <br />
                  for Career Readiness.
                </h1>
              </div>

              {/* Feature List (3 Concise Benefits with minimal black outline icons) */}
              <div className="mt-3.5 sm:mt-4 lg:mt-3 xl:mt-5 space-y-2 xl:space-y-3 max-w-[400px]">
                <FeatureItem text="Track your progress" />
                <FeatureItem text="Get AI-powered guidance" />
                <FeatureItem text="Build your dream career" />
              </div>
            </div>

            {/* Lower-Middle: Line Illustration matching the reference */}
            <div className="my-2 lg:my-2 xl:my-3 flex-1 flex justify-center items-center w-full min-h-[220px] max-h-[50vh]">
              <CareerIllustration className="max-w-[540px] sm:max-w-[600px] lg:max-w-[660px] xl:max-w-[740px] 2xl:max-w-[820px] max-h-[48vh] w-full h-full" />
            </div>

            {/* Bottom-Left: Footer Tagline */}
            <footer className="pt-2 text-[12px] sm:text-[13px] font-normal text-[#737373] tracking-wide flex items-center gap-2 flex-wrap select-none">
              <span>Better Skills</span>
              <span className="text-[#999]">→</span>
              <span>Better Opportunities</span>
              <span className="text-[#999]">→</span>
              <span>A Brighter Future</span>
            </footer>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION (MOBILE 70vh) / RIGHT SECTION (DESKTOP/TABLET 50%)          */}
        {/* ========================================================================= */}
        <section
          aria-label="Authentication"
          className={`mobile-bottom-section desktop-right-col flex flex-col justify-center items-center px-6 ${
            wide ? "py-10 sm:px-10 lg:px-12 xl:px-14" : "py-10 sm:px-12 lg:px-12 xl:px-16 2xl:px-20"
          } bg-[#FAF9F5] lg:h-screen lg:max-h-screen overflow-y-auto`}
        >
          <div className={`mobile-form-container w-full ${wide ? "max-w-[560px] py-4" : "max-w-[380px]"}`}>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};
