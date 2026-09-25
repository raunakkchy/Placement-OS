import React, { useState, useMemo, useEffect, useRef } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { PasswordInput } from "../components/auth/PasswordInput";
import { AuthSelect, SelectOption } from "../components/auth/AuthSelect";
import {
  PasswordStrengthIndicator,
  evaluatePassword,
} from "../components/auth/PasswordStrengthIndicator";
import { registerStudent, sendRegistrationOtp } from "../services/auth";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Mail,
  RotateCcw,
  X,
  ArrowLeft,
} from "lucide-react";

interface RegisterProps {
  onNavigateToLogin: () => void;
  onLoginSuccess?: (user: any) => void;
  onSuccess?: (authData: any) => void;
}

export const PREDEFINED_SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What is your favourite teacher's name?",
  "What was your childhood nickname?",
  "What is the name of your first pet?",
  "What is your favourite subject?",
];

const COURSE_OPTIONS: SelectOption[] = [
  { value: "Diploma", label: "Diploma" },
  { value: "B.Tech", label: "B.Tech" },
  { value: "B.E.", label: "B.E." },
  { value: "BCA", label: "BCA" },
];

const SEMESTER_OPTIONS_6: SelectOption[] = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
  { value: "3", label: "Semester 3" },
  { value: "4", label: "Semester 4" },
  { value: "5", label: "Semester 5" },
  { value: "6", label: "Semester 6" },
];

const SEMESTER_OPTIONS_8: SelectOption[] = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
  { value: "3", label: "Semester 3" },
  { value: "4", label: "Semester 4" },
  { value: "5", label: "Semester 5" },
  { value: "6", label: "Semester 6" },
  { value: "7", label: "Semester 7" },
  { value: "8", label: "Semester 8" },
];

const BRANCH_OPTIONS: SelectOption[] = [
  { value: "Computer Science & Engineering (CSE)", label: "Computer Science & Engineering (CSE)" },
  { value: "Information Technology (IT)", label: "Information Technology (IT)" },
  { value: "Electronics & Communication Engineering (ECE)", label: "Electronics & Communication Engineering (ECE)" },
  { value: "Electrical Engineering (EE)", label: "Electrical Engineering (EE)" },
  { value: "Mechanical Engineering (ME)", label: "Mechanical Engineering (ME)" },
  { value: "Civil Engineering (CE)", label: "Civil Engineering (CE)" },
  { value: "Artificial Intelligence & Machine Learning (AI/ML)", label: "Artificial Intelligence & Machine Learning (AI/ML)" },
  { value: "Data Science", label: "Data Science" },
  { value: "Other", label: "Other" },
];

export const Register: React.FC<RegisterProps> = ({
  onNavigateToLogin,
  onLoginSuccess,
  onSuccess,
}) => {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [branch, setBranch] = useState("");
  const [otherBranch, setOtherBranch] = useState("");
  const [college, setCollege] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion1, setSecurityQuestion1] = useState(
    PREDEFINED_SECURITY_QUESTIONS[0]
  );
  const [securityAnswer1, setSecurityAnswer1] = useState("");
  const [securityQuestion2, setSecurityQuestion2] = useState(
    PREDEFINED_SECURITY_QUESTIONS[1]
  );
  const [securityAnswer2, setSecurityAnswer2] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Compulsory Email OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Decrement OTP resend cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Auto-focus first OTP input when modal opens
  useEffect(() => {
    if (showOtpModal) {
      const timer = setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showOtpModal]);

  // Available Semester options based on selected Course (Diploma/BCA: 1-6, B.Tech/B.E.: 1-8)
  const semesterOptions: SelectOption[] = useMemo(() => {
    if (!course) {
      return [];
    }
    if (course === "Diploma" || course === "BCA") {
      return SEMESTER_OPTIONS_6;
    }
    return SEMESTER_OPTIONS_8;
  }, [course]);

  // Handle course changes - resets semester and shows only valid options
  const handleCourseChange = (newCourse: string) => {
    setCourse(newCourse);
    setSemester("");
    if (fieldErrors.course) {
      setFieldErrors((prev) => ({ ...prev, course: "" }));
    }
    if (fieldErrors.semester) {
      setFieldErrors((prev) => ({ ...prev, semester: "" }));
    }
  };

  // If the selected course changes, clear invalid semester if needed
  useEffect(() => {
    if ((course === "Diploma" || course === "BCA") && Number(semester) > 6) {
      setSemester("");
    }
  }, [course, semester]);

  // Dynamic security question options to prevent selecting the same question twice
  const question1Options: SelectOption[] = useMemo(() => {
    return PREDEFINED_SECURITY_QUESTIONS.map((q) => ({
      value: q,
      label: q,
      disabled: q === securityQuestion2,
    }));
  }, [securityQuestion2]);

  const question2Options: SelectOption[] = useMemo(() => {
    return PREDEFINED_SECURITY_QUESTIONS.map((q) => ({
      value: q,
      label: q,
      disabled: q === securityQuestion1,
    }));
  }, [securityQuestion1]);

  // Live password validation
  const passwordEvaluation = useMemo(() => evaluatePassword(password), [password]);

  // Live confirm password check
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full Name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email ID is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!rollNumber.trim()) {
      errors.rollNumber = "Roll Number is required.";
    }

    if (!course) {
      errors.course = "Please select your course.";
    }

    if (!semester) {
      errors.semester = "Current Semester is required.";
    }

    if (!branch.trim() || branch === "Select Branch") {
      errors.branch = "Branch is required.";
    } else if (branch === "Other" && !otherBranch.trim()) {
      errors.otherBranch = "Please specify your branch.";
    }

    if (!college.trim()) {
      errors.college = "College Name is required.";
    }

    const numCgpa = parseFloat(cgpa);
    if (!cgpa.trim()) {
      errors.cgpa = "CGPA is required.";
    } else if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
      errors.cgpa = "CGPA must be between 0.0 and 10.0.";
    }

    if (!password) {
      errors.password = "Create Password is required.";
    } else if (!passwordEvaluation.isValid) {
      errors.password =
        "Password must contain 8+ characters, uppercase, lowercase, number and special character.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!securityQuestion1) {
      errors.securityQuestion1 = "Security Question 1 is required.";
    }
    if (!securityAnswer1.trim()) {
      errors.securityAnswer1 = "Security Answer 1 is required.";
    }

    if (!securityQuestion2) {
      errors.securityQuestion2 = "Security Question 2 is required.";
    }
    if (!securityAnswer2.trim()) {
      errors.securityAnswer2 = "Security Answer 2 is required.";
    }

    if (securityQuestion1 && securityQuestion2 && securityQuestion1 === securityQuestion2) {
      errors.securityQuestion2 = "Please choose two different security questions.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Validate form and dispatch 6-digit registration OTP to student email
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) {
      setErrorMsg("Please correct the highlighted errors in the form.");
      return;
    }

    setLoading(true);

    try {
      await sendRegistrationOtp({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
      });

      setOtpDigits(Array(6).fill(""));
      setOtpError(null);
      setOtpCooldown(60);
      setShowOtpModal(true);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code. Please check your details and try again.";
      setErrorMsg(msg);
      if (msg.toLowerCase().includes("roll")) {
        setFieldErrors((prev) => ({ ...prev, rollNumber: msg }));
      } else if (msg.toLowerCase().includes("email address already exists")) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP digit input, backspace, and pasting
  const handleOtpDigitChange = (index: number, val: string) => {
    if (otpError) setOtpError(null);
    const numericChar = val.replace(/\D/g, "");

    if (!numericChar) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    const char = numericChar.slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
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
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (otpError) setOtpError(null);

    const pasted = e.clipboardData.getData("text");
    const digitsOnly = pasted.replace(/\D/g, "").slice(0, 6);

    if (digitsOnly.length > 0) {
      const updated = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        updated[i] = digitsOnly[i] || "";
      }
      setOtpDigits(updated);

      const nextEmpty = updated.findIndex((d) => !d);
      if (nextEmpty !== -1) {
        otpRefs.current[nextEmpty]?.focus();
      } else {
        otpRefs.current[5]?.focus();
      }
    }
  };

  // Step 3: Resend registration OTP
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || otpVerifying) return;
    setOtpError(null);

    try {
      await sendRegistrationOtp({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
      });
      setOtpCooldown(60);
      setOtpDigits(Array(6).fill(""));
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend verification code. Please try again.");
    }
  };

  // Step 4: Verify OTP and complete account creation
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);

    const finalBranch =
      branch === "Other" && otherBranch.trim()
        ? otherBranch.trim()
        : branch.trim();

    try {
      const response = await registerStudent({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        rollNumber: rollNumber.trim(),
        course,
        semester: Number(semester),
        branch: finalBranch,
        college: college.trim(),
        graduationYear: new Date().getFullYear() + ((course === "Diploma" || course === "BCA" ? 3 : 4) - Math.ceil(Number(semester) / 2)),
        cgpa: parseFloat(cgpa),
        password,
        confirmPassword,
        securityQuestion1,
        securityAnswer1: securityAnswer1.trim(),
        securityQuestion2,
        securityAnswer2: securityAnswer2.trim(),
        otp: fullOtp,
      });

      setOtpSuccess(true);
      setSuccessMsg("Account verified & created successfully! Preparing your Placement OS...");

      setTimeout(() => {
        setShowOtpModal(false);
        if (onSuccess) {
          onSuccess(response);
        } else if (onLoginSuccess) {
          onLoginSuccess(response.user);
        }
      }, 700);
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code. Please check and try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const isOtpComplete = otpDigits.join("").length === 6;

  return (
    <AuthLayout wide={true} showHero={false}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#111315]/5 text-[#111315] text-xs font-semibold uppercase tracking-wider mb-2">
            <UserCheck className="h-3.5 w-3.5 text-[#FF5A36]" />
            <span>New Student Onboarding</span>
          </div>
          <h2 className="text-[28px] sm:text-[32px] font-[700] text-[#111315] tracking-tight leading-tight">
            Create Student Account
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#737373] mt-1.5 leading-relaxed">
            Register your academic profile to activate Placement OS career
            readiness tracking.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            id="alert-register-success"
            role="status"
            className="mb-6 p-4 rounded-[9px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Registration Complete</p>
              <p className="text-emerald-700 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            id="alert-register-error"
            role="alert"
            className="mb-6 p-4 rounded-[9px] bg-[#FFF5F3] border border-[#FFDCD4] text-[#B91C1C] text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-[#FF5A36] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#991B1B]">Registration Error</p>
              <p className="text-[#B91C1C] mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* SECTION 1: Personal & Academic Credentials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E5E3DE]">
              <GraduationCap className="h-4 w-4 text-[#111315]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#111315]">
                Academic & Student Profile
              </span>
            </div>

            {/* Desktop 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <AuthInput
                  id="reg-input-fullname"
                  label="Full Name *"
                  placeholder="e.g. Raunak Choudhary"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                    }
                  }}
                  error={fieldErrors.fullName}
                  required
                />
              </div>

              {/* Email ID */}
              <div>
                <AuthInput
                  id="reg-input-email"
                  label="Email ID *"
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  error={fieldErrors.email}
                  required
                />
              </div>

              {/* Roll Number */}
              <div>
                <AuthInput
                  id="reg-input-rollnumber"
                  label="Roll Number *"
                  placeholder="e.g. 22CS104"
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    if (fieldErrors.rollNumber) {
                      setFieldErrors((prev) => ({ ...prev, rollNumber: "" }));
                    }
                  }}
                  error={fieldErrors.rollNumber}
                  required
                />
              </div>

              {/* Course Dropdown */}
              <div>
                <AuthSelect
                  id="reg-select-course"
                  label="Course *"
                  placeholder="Select Course"
                  value={course}
                  options={COURSE_OPTIONS}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  error={fieldErrors.course}
                  required
                />
              </div>

              {/* Current Semester Dropdown */}
              <div>
                <AuthSelect
                  id="reg-select-semester"
                  label="Current Semester *"
                  placeholder={course ? "Select Semester" : "Select Course First"}
                  value={semester}
                  options={semesterOptions}
                  disabled={!course}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    if (fieldErrors.semester) {
                      setFieldErrors((prev) => ({ ...prev, semester: "" }));
                    }
                  }}
                  error={fieldErrors.semester}
                  required
                />
              </div>

              {/* Branch */}
              <div>
                <AuthSelect
                  id="reg-select-branch"
                  label="BRANCH *"
                  placeholder="Select Branch"
                  value={branch}
                  options={BRANCH_OPTIONS}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBranch(val);
                    if (val !== "Other") {
                      setOtherBranch("");
                    }
                    if (fieldErrors.branch || fieldErrors.otherBranch) {
                      setFieldErrors((prev) => ({ ...prev, branch: "", otherBranch: "" }));
                    }
                  }}
                  error={fieldErrors.branch}
                  required
                />
              </div>

              {/* Specify Branch (shown when 'Other' is selected) */}
              {branch === "Other" && (
                <div>
                  <AuthInput
                    id="reg-input-other-branch"
                    label="SPECIFY BRANCH *"
                    placeholder="Enter your branch name"
                    value={otherBranch}
                    onChange={(e) => {
                      setOtherBranch(e.target.value);
                      if (fieldErrors.otherBranch) {
                        setFieldErrors((prev) => ({ ...prev, otherBranch: "" }));
                      }
                    }}
                    error={fieldErrors.otherBranch}
                    required
                  />
                </div>
              )}

              {/* CGPA */}
              <div>
                <AuthInput
                  id="reg-input-cgpa"
                  label="CGPA *"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 8.75"
                  value={cgpa}
                  onChange={(e) => {
                    setCgpa(e.target.value);
                    if (fieldErrors.cgpa) {
                      setFieldErrors((prev) => ({ ...prev, cgpa: "" }));
                    }
                  }}
                  error={fieldErrors.cgpa}
                  required
                />
              </div>

              {/* College Name */}
              <div className="sm:col-span-2">
                <AuthInput
                  id="reg-input-college"
                  label="College Name *"
                  placeholder="e.g. Delhi Technological University"
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    if (fieldErrors.college) {
                      setFieldErrors((prev) => ({ ...prev, college: "" }));
                    }
                  }}
                  error={fieldErrors.college}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Password & Security Credentials */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E5E3DE]">
              <Lock className="h-4 w-4 text-[#111315]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#111315]">
                Account Password & Credentials
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Create Password */}
              <div>
                <PasswordInput
                  id="reg-input-password"
                  label="Create Password *"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }}
                  error={fieldErrors.password}
                  required
                />
                {/* Live Password Strength & Requirement Indicator */}
                <PasswordStrengthIndicator password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <PasswordInput
                  id="reg-input-confirm-password"
                  label="Confirm Password *"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  error={
                    fieldErrors.confirmPassword ||
                    (!passwordsMatch ? "Passwords do not match." : undefined)
                  }
                  required
                />
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs font-medium text-emerald-700 mt-1 pl-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Passwords match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Security Questions & Recovery */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E5E3DE]">
              <ShieldCheck className="h-4 w-4 text-[#111315]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#111315]">
                Security Questions & Account Recovery
              </span>
            </div>
            <p className="text-xs text-[#737373]">
              Select two different security questions. These are hashed securely
              and used to verify your identity during password recovery.
            </p>

            <div className="space-y-3.5">
              {/* Security Question 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                <AuthSelect
                  id="reg-select-sq1"
                  label="Security Question 1 *"
                  value={securityQuestion1}
                  options={question1Options}
                  onChange={(e) => {
                    setSecurityQuestion1(e.target.value);
                    if (fieldErrors.securityQuestion1) {
                      setFieldErrors((prev) => ({ ...prev, securityQuestion1: "" }));
                    }
                  }}
                  error={fieldErrors.securityQuestion1}
                  required
                />
                <AuthInput
                  id="reg-input-sa1"
                  label="Security Answer 1 *"
                  placeholder="Your confidential answer"
                  value={securityAnswer1}
                  onChange={(e) => {
                    setSecurityAnswer1(e.target.value);
                    if (fieldErrors.securityAnswer1) {
                      setFieldErrors((prev) => ({ ...prev, securityAnswer1: "" }));
                    }
                  }}
                  error={fieldErrors.securityAnswer1}
                  required
                />
              </div>

              {/* Security Question 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                <AuthSelect
                  id="reg-select-sq2"
                  label="Security Question 2 *"
                  value={securityQuestion2}
                  options={question2Options}
                  onChange={(e) => {
                    setSecurityQuestion2(e.target.value);
                    if (fieldErrors.securityQuestion2) {
                      setFieldErrors((prev) => ({ ...prev, securityQuestion2: "" }));
                    }
                  }}
                  error={fieldErrors.securityQuestion2}
                  required
                />
                <AuthInput
                  id="reg-input-sa2"
                  label="Security Answer 2 *"
                  placeholder="Your confidential answer"
                  value={securityAnswer2}
                  onChange={(e) => {
                    setSecurityAnswer2(e.target.value);
                    if (fieldErrors.securityAnswer2) {
                      setFieldErrors((prev) => ({ ...prev, securityAnswer2: "" }));
                    }
                  }}
                  error={fieldErrors.securityAnswer2}
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button
              id="btn-register-submit"
              type="submit"
              disabled={loading || !passwordsMatch}
              className="w-full h-[56px] flex items-center justify-center gap-2 rounded-[9px] bg-[#111315] text-white text-[15px] sm:text-[16px] font-semibold tracking-wide hover:bg-[#202327] hover:-translate-y-[1px] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-[#FF5A36]" />
                  <span>Verify Email & Create Account</span>
                </>
              )}
            </button>
          </div>

          {/* Back to Login Link */}
          <div className="pt-2 text-center text-[14px] text-[#737373]">
            Already have an account?{" "}
            <button
              id="btn-back-to-login"
              type="button"
              onClick={onNavigateToLogin}
              className="font-semibold text-[#111315] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================== */}
      {/* COMPULSORY EMAIL OTP VERIFICATION MODAL */}
      {/* ==================================================== */}
      {showOtpModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-[#E5E3DE] space-y-5">
            {/* Close / Dismiss button */}
            {!otpVerifying && !otpSuccess && (
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-[#111315] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close verification modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 mb-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Email Verification Compulsory</span>
              </div>
              <h3
                id="otp-modal-title"
                className="text-2xl font-bold text-[#111315] tracking-tight"
              >
                Verify Your Email
              </h3>
              <p className="mt-1.5 text-sm text-[#737373] leading-relaxed">
                We've sent a 6-digit verification code to{" "}
                <strong className="text-[#111315] font-semibold break-all">
                  {email}
                </strong>
                .
              </p>
            </div>

            {/* Email delivery note */}
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <div className="leading-snug">
                <span>Inbox me email na mile toh kripya apna </span>
                <strong className="font-semibold text-amber-950">Spam / Junk</strong>
                <span> ya </span>
                <strong className="font-semibold text-amber-950">All Mail / Updates</strong>
                <span> folder zaroor check karein.</span>
              </div>
            </div>

            {/* Error banner */}
            {otpError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-[#FFF5F3] border border-[#FF5A36]/30 text-sm font-medium text-[#D93815] flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{otpError}</span>
              </div>
            )}

            {/* Success state */}
            {otpSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-base text-emerald-900">
                  Email Verified Successfully!
                </p>
                <p className="text-xs text-emerald-700">
                  Activating your Placement OS dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                {/* 6 Segmented OTP Boxes */}
                <div className="flex justify-between items-center gap-2 sm:gap-2.5 pt-1">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      id={`reg-otp-digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      disabled={otpVerifying}
                      aria-label={`Digit ${index + 1} of 6`}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-xl sm:text-2xl rounded-lg border bg-white text-[#111315] transition-all duration-150 outline-none select-all ${
                        digit
                          ? "border-[#111315] bg-[#FAF8F5]"
                          : "border-[#E5E3DE] hover:border-slate-400"
                      } focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/10`}
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <button
                  id="btn-verify-registration-otp"
                  type="submit"
                  disabled={otpVerifying || !isOtpComplete}
                  className="w-full h-12 sm:h-13 flex items-center justify-center gap-2 rounded-lg bg-[#111315] text-white text-[15px] font-semibold tracking-wide hover:bg-[#202327] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none shadow-xs"
                >
                  {otpVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Verifying & Creating Account...</span>
                    </>
                  ) : (
                    <span>Verify & Create Account</span>
                  )}
                </button>

                {/* Resend and change email actions */}
                <div className="flex flex-col items-center gap-2.5 pt-1 text-center">
                  {otpCooldown > 0 ? (
                    <p className="text-xs sm:text-[13px] font-medium text-[#737373]">
                      Resend code in{" "}
                      <span className="font-semibold text-[#111315] tabular-nums">
                        {String(Math.floor(otpCooldown / 60)).padStart(2, "0")}:
                        {String(otpCooldown % 60).padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <button
                      id="btn-resend-reg-otp"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpVerifying}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-[#111315] hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Resend Verification Code</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    disabled={otpVerifying}
                    className="text-xs text-[#737373] hover:text-[#111315] transition-colors cursor-pointer inline-flex items-center gap-1 pt-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Change email or edit profile details</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export const RegisterPage = Register;
