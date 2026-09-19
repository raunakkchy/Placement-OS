import React, { useState, useMemo, useEffect } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { PasswordInput } from "../components/auth/PasswordInput";
import { AuthSelect, SelectOption } from "../components/auth/AuthSelect";
import {
  PasswordStrengthIndicator,
  evaluatePassword,
} from "../components/auth/PasswordStrengthIndicator";
import { registerStudent } from "../services/auth";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  GraduationCap,
  ShieldCheck,
  UserCheck,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) {
      setErrorMsg("Please correct the highlighted errors in the form.");
      return;
    }

    setLoading(true);

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
      });

      setSuccessMsg("Account created successfully! Preparing your Placement OS...");

      // Smooth transition to authenticated session
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response);
        } else if (onLoginSuccess) {
          onLoginSuccess(response.user);
        }
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                  <span>Creating Account & Calculating Score...</span>
                </>
              ) : (
                <span>Create Account</span>
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
    </AuthLayout>
  );
};

export const RegisterPage = Register;
