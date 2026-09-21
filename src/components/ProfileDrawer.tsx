import React, { useState, useEffect, useRef } from "react";
import {
  User,
  ReadinessScore,
  SuggestedJobRole,
  SkillWithLevel,
  StudentProject,
  StudentExperience,
} from "../types";
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  GraduationCap,
  Building2,
  BookOpen,
  Layers,
  Award,
  Trash2,
  Edit3,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
  FileText,
  Upload,
  RefreshCw,
  ExternalLink,
  Github,
  Globe,
  Briefcase,
  Camera,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Loader2,
  Sparkles,
  Check,
  ChevronRight,
  Phone,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import {
  updateStudentProfile,
  uploadStudentResume,
  deleteStudentResume,
  changeStudentPassword,
} from "../services/auth";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateSuccess: (
    updatedUser: User,
    score?: ReadinessScore,
    suggestedJobs?: SuggestedJobRole[]
  ) => void;
  onLogout?: () => void;
}

type TabKey =
  | "personal"
  | "academic"
  | "skills"
  | "projects"
  | "experience"
  | "resume"
  | "security";

const COURSE_OPTIONS = ["B.Tech", "B.E.", "Diploma", "BCA", "MCA", "M.Tech"];

const BRANCH_OPTIONS = [
  "Computer Science & Engineering (CSE)",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Artificial Intelligence & Machine Learning (AI/ML)",
  "Data Science",
  "Other",
];

const SKILL_LEVELS: Array<"Beginner" | "Intermediate" | "Advanced"> = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

const POPULAR_SKILL_SUGGESTIONS = [
  "Data Structures & Algorithms",
  "Java",
  "Python",
  "C++",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "SQL",
  "MongoDB",
  "System Design",
  "Operating Systems",
  "Computer Networks",
  "DBMS",
  "Docker",
  "AWS",
  "Git",
];

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Personal Fields
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || "");

  // 2. Academic Fields
  const [college, setCollege] = useState(user.college || "");
  const [course, setCourse] = useState(user.course || "B.Tech");
  const [branch, setBranch] = useState(
    user.branch || "Computer Science & Engineering (CSE)"
  );
  const [semester, setSemester] = useState(user.semester || 1);
  const [cgpa, setCgpa] = useState(user.cgpa !== undefined ? user.cgpa : 8.0);
  const [graduationYear, setGraduationYear] = useState(
    user.graduationYear || new Date().getFullYear()
  );
  const [backlogs, setBacklogs] = useState(user.backlogs || 0);

  // 3. Skills with Explicit Levels (Beginner, Intermediate, Advanced only)
  const [skillsWithLevels, setSkillsWithLevels] = useState<SkillWithLevel[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<
    "Beginner" | "Intermediate" | "Advanced"
  >("Intermediate");

  // 4. Projects
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<{
    title: string;
    description: string;
    techStack: string;
    githubUrl: string;
    liveUrl: string;
  }>({
    title: "",
    description: "",
    techStack: "",
    githubUrl: "",
    liveUrl: "",
  });
  const [isAddingProject, setIsAddingProject] = useState(false);

  // 5. Experience
  const [hasExperience, setHasExperience] = useState(false);
  const [experienceForm, setExperienceForm] = useState<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>({
    company: "",
    role: "",
    duration: "",
    description: "",
  });

  // 6. Resume
  const [resumeFileName, setResumeFileName] = useState(user.resumeFileName || "");
  const [resumeUploadedAt, setResumeUploadedAt] = useState(
    user.resumeUploadedAt || ""
  );
  const [resumeText, setResumeText] = useState(user.resumeText || "");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 7. Security / Change Password Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // 8. Delete Account Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Initialize and synchronize from user prop
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setPhone(user.phone || "");
    setProfilePhoto(user.profilePhoto || "");
    setCollege(user.college || "");
    setCourse(user.course || "B.Tech");
    setBranch(user.branch || "Computer Science & Engineering (CSE)");
    setSemester(user.semester || 1);
    setCgpa(user.cgpa !== undefined ? user.cgpa : 8.0);
    setGraduationYear(user.graduationYear || new Date().getFullYear());
    setBacklogs(user.backlogs || 0);

    // Sync skills strictly preserving explicitly configured levels
    if (user.skillsWithLevels && user.skillsWithLevels.length > 0) {
      setSkillsWithLevels(
        user.skillsWithLevels.filter(
          (s) =>
            s &&
            s.name &&
            ["Beginner", "Intermediate", "Advanced"].includes(s.level)
        )
      );
    } else {
      setSkillsWithLevels([]);
    }

    // Sync projects
    setProjects(user.projects || []);

    // Sync experience
    if (user.experience && user.experience.hasExperience) {
      setHasExperience(true);
      setExperienceForm({
        company: user.experience.company || "",
        role: user.experience.role || "",
        duration: user.experience.duration || "",
        description: user.experience.description || "",
      });
    } else {
      setHasExperience(false);
      setExperienceForm({ company: "", role: "", duration: "", description: "" });
    }

    // Sync resume
    setResumeFileName(user.resumeFileName || "");
    setResumeUploadedAt(user.resumeUploadedAt || "");
    setResumeText(user.resumeText || "");
  }, [user]);

  if (!isOpen) return null;

  // Semester limits based on course
  const getMaxSemester = (c: string) => {
    if (c === "Diploma" || c === "BCA" || c === "MCA") return 6;
    if (c === "M.Tech") return 4;
    return 8; // B.Tech, B.E.
  };

  const maxSemester = getMaxSemester(course);
  const semesterList = Array.from({ length: maxSemester }, (_, i) => i + 1);

  // When Course is changed, reset Current Semester to 1 and show valid options for new course
  const handleCourseChange = (newCourse: string) => {
    setCourse(newCourse);
    setSemester(1);
  };

  // Skill Management
  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    if (
      skillsWithLevels.some(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError(`Skill "${trimmed}" is already in your skills list.`);
      return;
    }

    if (!["Beginner", "Intermediate", "Advanced"].includes(newSkillLevel)) {
      setError("Please select a valid skill level (Beginner, Intermediate, or Advanced).");
      return;
    }

    setSkillsWithLevels((prev) => [
      ...prev,
      { name: trimmed, level: newSkillLevel },
    ]);
    setNewSkillName("");
    setError(null);
  };

  const handleQuickAddSkill = (skillName: string) => {
    if (
      skillsWithLevels.some(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
      )
    ) {
      setSkillsWithLevels((prev) =>
        prev.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase())
      );
    } else {
      setSkillsWithLevels((prev) => [
        ...prev,
        { name: skillName, level: newSkillLevel },
      ]);
    }
  };

  const handleUpdateSkillLevel = (
    skillName: string,
    newLevel: "Beginner" | "Intermediate" | "Advanced"
  ) => {
    setSkillsWithLevels((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, level: newLevel } : s))
    );
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkillsWithLevels((prev) => prev.filter((s) => s.name !== skillName));
  };

  // Project Management
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      setError("Project title is required.");
      return;
    }

    const techArray = projectForm.techStack
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingProjectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProjectId
            ? {
                ...p,
                title: projectForm.title.trim(),
                description: projectForm.description.trim(),
                techStack: techArray,
                githubUrl: projectForm.githubUrl.trim() || undefined,
                liveUrl: projectForm.liveUrl.trim() || undefined,
              }
            : p
        )
      );
      setEditingProjectId(null);
    } else {
      const newProj: StudentProject = {
        id: "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        techStack: techArray,
        githubUrl: projectForm.githubUrl.trim() || undefined,
        liveUrl: projectForm.liveUrl.trim() || undefined,
      };
      setProjects((prev) => [...prev, newProj]);
    }

    setProjectForm({
      title: "",
      description: "",
      techStack: "",
      githubUrl: "",
      liveUrl: "",
    });
    setIsAddingProject(false);
    setError(null);
  };

  const handleStartEditProject = (proj: StudentProject) => {
    setEditingProjectId(proj.id);
    setProjectForm({
      title: proj.title,
      description: proj.description || "",
      techStack: (proj.techStack || []).join(", "),
      githubUrl: proj.githubUrl || "",
      liveUrl: proj.liveUrl || "",
    });
    setIsAddingProject(true);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // Resume Management
  const handleResumeFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploading(true);
    setResumeError(null);
    try {
      const result = await uploadStudentResume(file);
      setResumeFileName(result.user.resumeFileName || file.name);
      setResumeUploadedAt(result.user.resumeUploadedAt || new Date().toISOString());
      setResumeText(result.user.resumeText || "");
      onUpdateSuccess(result.user, result.readinessScore, result.suggestedJobs);
      setSuccessMessage("Resume uploaded, parsed, and verified successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setResumeError(err.message || "Failed to parse and upload resume file.");
    } finally {
      setResumeUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveResume = async () => {
    if (!window.confirm("Are you sure you want to remove your uploaded resume?")) {
      return;
    }
    setResumeUploading(true);
    setResumeError(null);
    try {
      const result = await deleteStudentResume();
      setResumeFileName("");
      setResumeUploadedAt("");
      setResumeText("");
      onUpdateSuccess(result.user, result.readinessScore, result.suggestedJobs);
      setSuccessMessage("Resume removed successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setResumeError(err.message || "Failed to remove resume.");
    } finally {
      setResumeUploading(false);
    }
  };

  // Profile Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile image must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Password Change Handler inside Profile
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }

    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setPasswordError(
        "Password must contain 8+ characters, uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changeStudentPassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Save All Profile Changes & Recalculate AI
  const handleSaveAll = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setError("Full Name is required.");
      setLoading(false);
      return;
    }

    if (!college.trim()) {
      setError("College / University name is required.");
      setLoading(false);
      return;
    }

    const cgpaNum = Number(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      setError("CGPA must be a valid number between 0.0 and 10.0.");
      setLoading(false);
      return;
    }

    const invalidSkill = skillsWithLevels.find(
      (s) => !["Beginner", "Intermediate", "Advanced"].includes(s.level)
    );
    if (invalidSkill) {
      setError(
        `Skill "${invalidSkill.name}" must have a valid level (Beginner, Intermediate, or Advanced).`
      );
      setLoading(false);
      return;
    }

    try {
      const experienceData: StudentExperience = {
        hasExperience,
        company: hasExperience ? experienceForm.company.trim() || undefined : undefined,
        role: hasExperience ? experienceForm.role.trim() || undefined : undefined,
        duration: hasExperience ? experienceForm.duration.trim() || undefined : undefined,
        description: hasExperience ? experienceForm.description.trim() || undefined : undefined,
      };

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        profilePhoto: profilePhoto || undefined,
        college: college.trim(),
        course,
        branch,
        semester: Number(semester),
        cgpa: cgpaNum,
        graduationYear: Number(graduationYear),
        backlogs: Number(backlogs),
        skillsWithLevels,
        skills: skillsWithLevels.map((s) => s.name),
        projects,
        experience: experienceData,
      };

      const result = await updateStudentProfile(payload);
      onUpdateSuccess(result.user, result.readinessScore, result.suggestedJobs);
      setSuccessMessage("Profile updated and Placement AI recalculated successfully.");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const PROFILE_TABS: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: "personal", label: "Personal Information", icon: UserIcon },
    { key: "academic", label: "Academic Details", icon: GraduationCap },
    { key: "skills", label: `Skills (${skillsWithLevels.length})`, icon: Layers },
    { key: "projects", label: `Projects (${projects.length})`, icon: BookOpen },
    { key: "experience", label: "Experience", icon: Briefcase },
    { key: "resume", label: "Resume", icon: FileText },
    { key: "security", label: "Account & Security", icon: ShieldAlert },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200">
        {/* COMPACT PROFILE HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2E5BFF] via-[#2F54EB] to-[#1C3ED8] text-white font-bold text-base shadow-xs overflow-hidden">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={fullName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (fullName || user.fullName || "S").charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow hover:bg-[#2F54EB] transition-colors"
                title="Update Profile Photo"
                aria-label="Update Profile Photo"
              >
                <Camera className="h-2.5 w-2.5" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Student Info */}
            <div className="min-w-0">
              <h2
                id="profile-drawer-title"
                className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate"
              >
                {fullName || user.fullName}
              </h2>
              <div className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                {course} • {branch}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Semester {semester} • CGPA {cgpa !== undefined ? Number(cgpa).toFixed(1) : "N/A"}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-2xs"
              aria-label="Close Profile"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Real-time AI Notice */}
        <div className="bg-orange-50/70 border-b border-orange-100/80 px-6 py-2.5 flex items-center justify-between text-xs text-orange-950 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FF5A36] shrink-0" />
            <span className="font-medium text-[11px] leading-tight">
              Placement AI analysis and readiness scores synchronize automatically with your verified academic profile.
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#FF5A36]">
            Real-Time Engine
          </span>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto gap-2 shrink-0">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[#FF5A36] text-[#FF5A36] font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* 1. PERSONAL INFORMATION */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Roll Number</span>
                      <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.rollNumber || "Not Assigned"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/80 p-2 text-xs text-slate-600 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Roll number is fixed to your student account credentials.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Email Address</span>
                      <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/80 p-2 text-xs text-slate-600 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Primary authenticated student identifier.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ACADEMIC DETAILS */}
          {activeTab === "academic" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                  Academic Details
                </h3>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    College / University Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Degree Course <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={course}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    >
                      {COURSE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Branch / Specialization <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    >
                      {BRANCH_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Current Semester <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    >
                      {semesterList.map((num) => (
                        <option key={num} value={num}>
                          Semester {num}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {course} duration (1–{maxSemester})
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      CGPA / Scale 10 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      required
                      value={cgpa}
                      onChange={(e) => setCgpa(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">0.0 to 10.0 scale</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Active Backlogs
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={backlogs}
                      onChange={(e) => setBacklogs(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">0 if cleared</p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expected Graduation Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(parseInt(e.target.value, 10) || 2026)}
                    className="w-full sm:w-1/2 rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. SKILLS */}
          {activeTab === "skills" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  Verified Technical Skills
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Declare your actual technical competencies. Each skill is verified by skill level (Beginner, Intermediate, Advanced).
                </p>
              </div>

              {/* Add New Skill Bar */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                <form
                  onSubmit={handleAddSkill}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Enter skill name (e.g. React, SQL, Java)..."
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                  />

                  <select
                    value={newSkillLevel}
                    onChange={(e) =>
                      setNewSkillLevel(
                        e.target.value as "Beginner" | "Intermediate" | "Advanced"
                      )
                    }
                    className="rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white font-medium"
                  >
                    {SKILL_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level} Level
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Skill
                  </button>
                </form>

                {/* Popular Skill Suggestions */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Add Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SKILL_SUGGESTIONS.map((s) => {
                      const isSelected = skillsWithLevels.some(
                        (item) => item.name.toLowerCase() === s.toLowerCase()
                      );
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleQuickAddSkill(s)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-2xs font-semibold"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? `✓ ${s}` : `+ ${s}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Added Skills List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                  <span>Declared Skills ({skillsWithLevels.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Adjust skill level per item
                  </span>
                </div>

                {skillsWithLevels.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 bg-slate-50/50">
                    No technical skills added yet. Add your core languages, frameworks, or tools above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {skillsWithLevels.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                      >
                        <div className="font-semibold text-slate-900 text-xs truncate max-w-[140px]">
                          {skill.name}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={skill.level}
                            onChange={(e) =>
                              handleUpdateSkillLevel(
                                skill.name,
                                e.target.value as "Beginner" | "Intermediate" | "Advanced"
                              )
                            }
                            className={`rounded-lg border text-[10px] font-bold px-2 py-1 bg-white ${
                              skill.level === "Advanced"
                                ? "border-emerald-300 text-emerald-800 bg-emerald-50/50"
                                : skill.level === "Intermediate"
                                ? "border-blue-300 text-blue-800 bg-blue-50/50"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {SKILL_LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.name)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Remove Skill"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. PROJECTS */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    Student Projects
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Showcase genuine academic or self-directed software projects.
                  </p>
                </div>

                {!isAddingProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProjectId(null);
                      setProjectForm({
                        title: "",
                        description: "",
                        techStack: "",
                        githubUrl: "",
                        liveUrl: "",
                      });
                      setIsAddingProject(true);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Project
                  </button>
                )}
              </div>

              {/* Add / Edit Project Form */}
              {isAddingProject && (
                <form
                  onSubmit={handleSaveProject}
                  className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      {editingProjectId ? "Edit Project" : "New Project Details"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Project Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Distributed E-Commerce Microservices Engine"
                      value={projectForm.title}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, title: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tech Stack (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, PostgreSQL, Docker, Redis"
                      value={projectForm.techStack}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, techStack: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Description & Core Capabilities
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what the project does, key technical challenges solved, architecture, and impact..."
                      value={projectForm.description}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        GitHub Repository URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/yourname/repo"
                        value={projectForm.githubUrl}
                        onChange={(e) =>
                          setProjectForm({ ...projectForm, githubUrl: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Live Demo URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourproject.domain.com"
                        value={projectForm.liveUrl}
                        onChange={(e) =>
                          setProjectForm({ ...projectForm, liveUrl: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(false)}
                      className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                    >
                      {editingProjectId ? "Update Project" : "Save Project"}
                    </button>
                  </div>
                </form>
              )}

              {/* Projects List */}
              <div className="space-y-3">
                {projects.length === 0 && !isAddingProject ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 bg-slate-50/50">
                    No projects added yet. Click "Add Project" to showcase your builds.
                  </div>
                ) : (
                  projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {proj.title}
                          </h4>
                          {proj.description && (
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditProject(proj)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Edit Project"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tech Stack Pills */}
                      {proj.techStack && proj.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      {(proj.githubUrl || proj.liveUrl) && (
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-medium">
                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                            >
                              <Github className="h-3 w-3" /> Repository
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                            >
                              <Globe className="h-3 w-3" /> Live Demo
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. EXPERIENCE */}
          {activeTab === "experience" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                  Internship & Work Experience (Optional)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Add prior corporate internship, startup apprenticeship, or open source fellowship experience.
                </p>
              </div>

              {!hasExperience ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                  <Briefcase className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Not Added</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No prior industry experience specified. (Defaulting to Fresher profile for campus recruitment).
                  </p>
                  <button
                    type="button"
                    onClick={() => setHasExperience(true)}
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Experience
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Organization / Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Tech Solutions"
                        value={experienceForm.company}
                        onChange={(e) =>
                          setExperienceForm({
                            ...experienceForm,
                            company: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineering Intern"
                        value={experienceForm.role}
                        onChange={(e) =>
                          setExperienceForm({
                            ...experienceForm,
                            role: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Duration / Dates
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. May 2025 – July 2025 (3 Months)"
                      value={experienceForm.duration}
                      onChange={(e) =>
                        setExperienceForm({
                          ...experienceForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Key Responsibilities & Outcomes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what you built, technologies used, and metrics achieved..."
                      value={experienceForm.description}
                      onChange={(e) =>
                        setExperienceForm({
                          ...experienceForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHasExperience(false);
                        setExperienceForm({
                          company: "",
                          role: "",
                          duration: "",
                          description: "",
                        });
                      }}
                      className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Clear Experience
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. RESUME */}
          {activeTab === "resume" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Resume Verification & Analysis
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload your ATS-compliant resume (PDF, DOCX, or TXT) for keyword matching and readiness scoring.
                </p>
              </div>

              {resumeError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{resumeError}</span>
                </div>
              )}

              {/* Upload Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Status</span>
                  {resumeFileName ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified & Analyzed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      Not Uploaded
                    </span>
                  )}
                </div>

                {resumeFileName ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {resumeFileName}
                          </p>
                          {resumeUploadedAt && (
                            <p className="text-[10px] text-slate-400">
                              Uploaded on {new Date(resumeUploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={resumeUploading}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveResume}
                          disabled={resumeUploading}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Remove Resume"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {resumeText && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Extracted Resume Highlights:
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-lg font-mono">
                          {resumeText}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer transition-all"
                  >
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Click to browse or drag & drop resume
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Supports PDF, DOCX, and TXT files (Max 10MB)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleResumeFileSelect}
                  className="hidden"
                />

                {resumeUploading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-indigo-600 font-semibold text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing and extracting placement keywords...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. ACCOUNT & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
                  Account & Security
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Manage password credentials, active session status, and account lifecycle.
                </p>
              </div>

              {/* Password Feedback */}
              {passwordError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {/* SECURITY QUESTIONS STATUS CARD */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-xs">Security Questions</h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Configured
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Two recovery questions are linked to your student account for secure password resets. For your privacy, answers and answer hashes are never displayed.
                </p>
              </div>

              {/* CHANGE PASSWORD CARD */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-xs">Change Password</h4>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full rounded-xl border border-slate-300 p-2 pr-9 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 chars, 1 uppercase, 1 special"
                          className="w-full rounded-xl border border-slate-300 p-2 pr-9 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl border border-slate-300 p-2 pr-9 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* LOGOUT ACTION */}
              {onLogout && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">End Active Session</h4>
                    <p className="text-[11px] text-slate-500">
                      Safely log out of your Placement OS student profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </div>
              )}

              {/* DANGER ZONE: DELETE ACCOUNT */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs">Danger Zone</h4>
                    <p className="text-[11px] text-rose-700">
                      Permanently delete your student account, resume, mock interviews, roadmaps, and scores.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-[#FF5A36] px-5 py-2 text-xs font-bold text-white hover:bg-[#e04825] shadow-xs disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving & Recalculating...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save & Recalculate AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal (Requires Current Password) */}
      {isDeleteModalOpen && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onAccountDeleted={() => {
            setIsDeleteModalOpen(false);
            onClose();
            window.location.reload();
          }}
          user={user}
        />
      )}
    </div>
  );
};
