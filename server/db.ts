import mongoose, { Schema, Document, Model } from "mongoose";

export interface SkillWithLevel {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export interface StudentProject {
  id?: string;
  title: string;
  description: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
}

export interface StudentExperience {
  hasExperience: boolean;
  company?: string;
  role?: string;
  duration?: string;
  description?: string;
}

export interface CareerPreferences {
  careerGoal: string;
  preferredField: string;
  preferredJobType: "Internship" | "Full-time" | "Both";
}

export interface AiRecommendedJobRole {
  role: string;
  whyMatch: string;
  requiredSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  eligibility: string;
  matchIndicator: number;
}

export interface StudentAiRecommendations {
  studentId: string;
  generatedAt: string;
  isAiGenerated: boolean;
  recommendedRoles: AiRecommendedJobRole[];
}

export interface AiProfileAnalysis {
  currentStrengths: string[];
  skillGaps: string[];
  missingSkillsForTargetRoles: string[];
  recommendedJobRoles: {
    title: string;
    description: string;
    fitReason: string;
    expectedCtc?: string;
  }[];
  recommendedLearningTopics: {
    topic: string;
    why: string;
    priority: "Essential" | "High" | "Medium";
  }[];
  projectRecommendations: {
    title: string;
    description: string;
    techStack: string[];
    portfolioImpact: string;
  }[];
  resumeImprovements: {
    status: "available" | "not_uploaded";
    score?: number;
    suggestions: string[];
    atsTips?: string[];
  };
  interviewPrepAreas: {
    area: string;
    focus: string;
    sampleQuestion?: string;
  }[];
  analyzedAt: string;
}

export interface UserDocument {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  profilePhoto?: string;
  rollNumber?: string;
  college: string;
  course: string; // e.g. B.Tech, B.E., MCA, BCA
  branch: string; // e.g. Computer Science, Information Technology, Electronics & Comm.
  semester: number; // 1-8
  cgpa: number; // e.g. 8.4
  tenthMarks?: number; // e.g. 92%
  twelfthMarks?: number; // e.g. 89%
  graduationYear: number;
  courseDuration?: string;
  securityQuestions?: {
    question1: string;
    answer1Hash: string;
    question2: string;
    answer2Hash: string;
  };
  backlogs: number;
  skills: string[];
  targetRoles: string[];
  selectedRole?: string;
  aiJobRecommendations?: StudentAiRecommendations;
  resumeText?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  onboardingCompleted?: boolean;
  careerPreferences?: CareerPreferences;
  skillsWithLevels?: SkillWithLevel[];
  projects?: StudentProject[];
  experience?: StudentExperience;
  aiAnalysis?: AiProfileAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface JobDocument {
  id: string;
  title: string;
  company: string;
  logoText: string;
  badge: string;
  type: "Full-Time" | "Internship" | "Pre-Placement Offer (PPO)";
  location: string;
  ctc: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minCgpa: number;
  allowedBranches: string[];
  allowedQualifications?: string[];
  maxBacklogs: number;
  graduationYears: number[];
  applicationDeadline: string;
  selectionRounds: string[];
  openings: number;
}

export interface PrioritySkillItem {
  skill: string;
  currentLevel: "Beginner" | "Intermediate" | "Advanced" | "None";
  requiredLevel: "Beginner" | "Intermediate" | "Advanced";
  priority: "High" | "Medium" | "Low";
  reason: string;
}

export interface SkillGapAnalysis {
  role: string;
  strong: string[];
  developing: string[];
  needsImprovement: string[];
  missing: string[];
  prioritySkills: PrioritySkillItem[];
  analyzedAt: string;
  isAiGenerated?: boolean;
}

export interface RoadmapItem {
  id: string;
  title: string;
  category: "topic" | "project" | "coding" | "course" | "interview" | "learn" | "practice" | "assessment";
  description: string;
  skill?: string;
  topic?: string;
  priority?: "High" | "Medium" | "Low";
  reason?: string;
  source?: "mock_interview" | "skill_gap" | "onboarding" | "manual" | string;
  type?: "learn" | "practice" | "project" | "assessment" | "interview";
  estimatedTime?: string;
  linkText?: string;
  resourceUrl?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  estimatedHours?: number;
  completed: boolean;
  completedAt?: string;
}

export interface RoadmapPhase {
  phaseNumber: number;
  title: string;
  durationWeeks: string;
  items: RoadmapItem[];
}

export interface RoadmapDocument {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  selectedRole?: string;
  skillGap?: SkillGapAnalysis;
  overallProgress: number; // 0 - 100
  totalTasks?: number;
  completedTasks?: number;
  phases: RoadmapPhase[];
  customGapsIdentified: string[];
  recommendedProjects: {
    title: string;
    description: string;
    techStack: string[];
    portfolioImpact: string;
  }[];
  codingPracticePlan: {
    platform: string;
    problemTitle: string;
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard";
    url?: string;
  }[];
  generatedAt: string;
  updatedAt: string;
  isAiGenerated?: boolean;
}

export interface InterviewQuestionReview {
  questionNumber: number;
  question: string;
  category: "Technical" | "System Design" | "DSA" | "Project Deep-Dive" | "CS Fundamentals" | "Behavioral" | "Problem-Solving" | "Role-Specific" | string;
  studentAnswer: string;
  score: number; // 0 - 20
  interviewerCritique: string;
  modelAnswerKey: string;
  strengths: string[];
  improvements: string[];
  skill?: string;
  topic?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
}

export interface InterviewDocument {
  id: string;
  userId: string;
  jobId?: string;
  targetRole: string;
  companyTarget?: string;
  overallScore: number | null; // 0 - 100, or null if unassessed
  scoreAssessed?: boolean;
  subScores: {
    technicalKnowledge: number; // 0-20
    problemSolving: number; // 0-20
    communicationClarity: number; // 0-20
    confidencePacing?: number; // 0-20
    roleAlignment: number; // 0-20
    roleKnowledge?: number; // 0-20
    answerQuality?: number; // 0-20
  };
  durationMinutes: number;
  questionsCount: number;
  questionReviews: InterviewQuestionReview[];
  coreWeaknesses: string[];
  coreStrengths: string[];
  personalizedActionPlan: string[];
  skillGapsDetected?: {
    skill: string;
    topic: string;
    priority: "High" | "Medium" | "Low";
    reason: string;
  }[];
  roadmapChanges?: {
    type: "updated" | "added";
    skill: string;
    topic: string;
    previousPriority?: string;
    newPriority?: string;
    taskTitle: string;
    reason: string;
  }[];
  transcript: {
    speaker: "interviewer" | "student";
    text: string;
    timestamp: string;
  }[];
  conductedAt: string;
}

export interface ReadinessScoreDocument {
  id: string;
  userId: string;
  overallScore: number; // 0 - 100
  jobReadinessPercentage: number; // 0 - 100 (clearly labeled AI estimate)
  academicsScore: number; // 0 - 100
  technicalSkillsScore: number; // 0 - 100
  resumeScore: number | null; // 0 - 100 or null if Not Assessed
  projectsScore: number; // 0 - 100
  communicationScore: number | null; // 0 - 100 or null if Not Assessed
  interviewReadinessScore: number | null; // 0 - 100 or null if Not Assessed
  resumeAssessed: boolean;
  communicationAssessed: boolean;
  interviewAssessed: boolean;
  scoringRationale: {
    academicsNote: string;
    skillsNote: string;
    resumeNote: string;
    projectsNote: string;
    communicationNote: string;
    interviewNote: string;
  };
  topStrengths: string[];
  urgentActionItems: string[];
  calculatedAt: string;
}

export interface SessionDocument {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// ----------------------------------------------------
// MONGOOSE SCHEMAS & MODELS
// ----------------------------------------------------

const UserSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    rollNumber: { type: String, index: true, sparse: true, trim: true },
    college: { type: String, required: true },
    course: { type: String, required: true },
    branch: { type: String, required: true },
    semester: { type: Number, required: true },
    cgpa: { type: Number, required: true },
    tenthMarks: { type: Number },
    twelfthMarks: { type: Number },
    graduationYear: { type: Number, required: true },
    courseDuration: { type: String },
    securityQuestions: {
      question1: { type: String },
      answer1Hash: { type: String },
      question2: { type: String },
      answer2Hash: { type: String },
    },
    backlogs: { type: Number, default: 0 },
    skills: [{ type: String }],
    targetRoles: [{ type: String }],
    selectedRole: { type: String },
    aiJobRecommendations: { type: Schema.Types.Mixed },
    resumeText: { type: String },
    resumeFileName: { type: String },
    resumeUploadedAt: { type: String },
    onboardingCompleted: { type: Boolean, default: false },
    careerPreferences: {
      careerGoal: { type: String },
      preferredField: { type: String },
      preferredJobType: { type: String },
    },
    skillsWithLevels: [
      {
        name: { type: String, required: true },
        level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], required: true },
      },
    ],
    projects: [
      {
        id: { type: String },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        techStack: [{ type: String }],
        liveUrl: { type: String },
        githubUrl: { type: String },
      },
    ],
    experience: {
      hasExperience: { type: Boolean, default: false },
      company: { type: String },
      role: { type: String },
      duration: { type: String },
      description: { type: String },
    },
    aiAnalysis: { type: Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ rollNumber: 1 });

const SessionSchema = new Schema<SessionDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    expiresAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  }
);

SessionSchema.index({ token: 1 }, { unique: true });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 });

const JobSchema = new Schema<JobDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    logoText: { type: String, default: "" },
    badge: { type: String, default: "" },
    type: { type: String, required: true },
    location: { type: String, required: true },
    ctc: { type: String, required: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String }],
    niceToHaveSkills: [{ type: String }],
    minCgpa: { type: Number, default: 0 },
    allowedBranches: [{ type: String }],
    allowedQualifications: [{ type: String }],
    maxBacklogs: { type: Number, default: 0 },
    graduationYears: [{ type: Number }],
    applicationDeadline: { type: String, default: "" },
    selectionRounds: [{ type: String }],
    openings: { type: Number, default: 1 },
  },
  {
    versionKey: false,
  }
);

JobSchema.index({ id: 1 }, { unique: true });

const RoadmapSchema = new Schema<RoadmapDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    jobId: { type: String, default: "", index: true },
    jobTitle: { type: String, default: "" },
    companyName: { type: String, default: "" },
    selectedRole: { type: String, default: "" },
    skillGap: { type: Schema.Types.Mixed },
    overallProgress: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    phases: [
      {
        phaseNumber: { type: Number, required: true },
        title: { type: String, required: true },
        durationWeeks: { type: String, default: "1-2 Weeks" },
        items: [
          {
            id: { type: String, required: true },
            title: { type: String, required: true },
            category: { type: String, default: "topic" },
            description: { type: String, default: "" },
            skill: { type: String },
            topic: { type: String },
            priority: { type: String },
            reason: { type: String },
            source: { type: String },
            type: { type: String },
            estimatedTime: { type: String },
            linkText: { type: String },
            resourceUrl: { type: String },
            difficulty: { type: String },
            estimatedHours: { type: Number },
            completed: { type: Boolean, default: false },
            completedAt: { type: String },
          },
        ],
      },
    ],
    customGapsIdentified: [{ type: String }],
    recommendedProjects: [
      {
        title: { type: String },
        description: { type: String },
        techStack: [{ type: String }],
        portfolioImpact: { type: String },
      },
    ],
    codingPracticePlan: [
      {
        platform: { type: String },
        problemTitle: { type: String },
        topic: { type: String },
        difficulty: { type: String },
        url: { type: String },
      },
    ],
    generatedAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    isAiGenerated: { type: Boolean, default: true },
  },
  {
    versionKey: false,
  }
);

RoadmapSchema.index({ id: 1 }, { unique: true });
RoadmapSchema.index({ userId: 1, selectedRole: 1 });
RoadmapSchema.index({ userId: 1, jobId: 1 });
RoadmapSchema.index({ userId: 1, updatedAt: -1 });

const InterviewSchema = new Schema<InterviewDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    jobId: { type: String },
    targetRole: { type: String, required: true },
    companyTarget: { type: String, default: "" },
    overallScore: { type: Number, default: null },
    scoreAssessed: { type: Boolean, default: false },
    subScores: {
      technicalKnowledge: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      communicationClarity: { type: Number, default: 0 },
      confidencePacing: { type: Number, default: 0 },
      roleAlignment: { type: Number, default: 0 },
      roleKnowledge: { type: Number },
      answerQuality: { type: Number },
    },
    durationMinutes: { type: Number, default: 0 },
    questionsCount: { type: Number, default: 0 },
    questionReviews: [
      {
        questionNumber: { type: Number },
        question: { type: String },
        category: { type: String },
        studentAnswer: { type: String },
        score: { type: Number },
        interviewerCritique: { type: String },
        modelAnswerKey: { type: String },
        strengths: [{ type: String }],
        improvements: [{ type: String }],
        skill: { type: String },
        topic: { type: String },
        difficulty: { type: String },
      },
    ],
    coreWeaknesses: [{ type: String }],
    coreStrengths: [{ type: String }],
    personalizedActionPlan: [{ type: String }],
    skillGapsDetected: [
      {
        skill: { type: String },
        topic: { type: String },
        priority: { type: String },
        reason: { type: String },
      },
    ],
    roadmapChanges: [
      {
        type: { type: String },
        skill: { type: String },
        topic: { type: String },
        previousPriority: { type: String },
        newPriority: { type: String },
        taskTitle: { type: String },
        reason: { type: String },
      },
    ],
    transcript: [
      {
        speaker: { type: String, enum: ["interviewer", "student"] },
        text: { type: String },
        timestamp: { type: String },
      },
    ],
    conductedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
);

InterviewSchema.index({ id: 1 }, { unique: true });
InterviewSchema.index({ userId: 1, conductedAt: -1 });

const ReadinessScoreSchema = new Schema<ReadinessScoreDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    overallScore: { type: Number, required: true },
    jobReadinessPercentage: { type: Number, required: true },
    academicsScore: { type: Number, required: true },
    technicalSkillsScore: { type: Number, required: true },
    resumeScore: { type: Number, default: null },
    projectsScore: { type: Number, required: true },
    communicationScore: { type: Number, default: null },
    interviewReadinessScore: { type: Number, default: null },
    resumeAssessed: { type: Boolean, default: false },
    communicationAssessed: { type: Boolean, default: false },
    interviewAssessed: { type: Boolean, default: false },
    scoringRationale: {
      academicsNote: { type: String, default: "" },
      skillsNote: { type: String, default: "" },
      resumeNote: { type: String, default: "" },
      projectsNote: { type: String, default: "" },
      communicationNote: { type: String, default: "" },
      interviewNote: { type: String, default: "" },
    },
    topStrengths: [{ type: String }],
    urgentActionItems: [{ type: String }],
    calculatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
  }
);

ReadinessScoreSchema.index({ userId: 1 }, { unique: true });

// Models export with explicit Model<T> typing
export const UserModel: Model<UserDocument> = (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", UserSchema);
export const SessionModel: Model<SessionDocument> = (mongoose.models.Session as Model<SessionDocument>) || mongoose.model<SessionDocument>("Session", SessionSchema);
export const JobModel: Model<JobDocument> = (mongoose.models.Job as Model<JobDocument>) || mongoose.model<JobDocument>("Job", JobSchema);
export const RoadmapModel: Model<RoadmapDocument> = (mongoose.models.Roadmap as Model<RoadmapDocument>) || mongoose.model<RoadmapDocument>("Roadmap", RoadmapSchema);
export const InterviewModel: Model<InterviewDocument> = (mongoose.models.Interview as Model<InterviewDocument>) || mongoose.model<InterviewDocument>("Interview", InterviewSchema);
export const ReadinessScoreModel: Model<ReadinessScoreDocument> = (mongoose.models.ReadinessScore as Model<ReadinessScoreDocument>) || mongoose.model<ReadinessScoreDocument>("ReadinessScore", ReadinessScoreSchema);

// ----------------------------------------------------
// SANITIZE USER HELPER (Removes Sensitive Fields)
// ----------------------------------------------------
export function sanitizeUser(user: any): any {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj._id;
  delete userObj.passwordHash;
  userObj.securityQuestionsConfigured = Boolean(
    userObj.securityQuestions?.question1 &&
    userObj.securityQuestions?.question2 &&
    userObj.securityQuestions?.answer1Hash &&
    userObj.securityQuestions?.answer2Hash
  );
  delete userObj.securityQuestions;
  return userObj;
}

// ----------------------------------------------------
// DEFAULT JOBS CATALOG
// ----------------------------------------------------
export const defaultJobs: JobDocument[] = [
  {
    id: "job-google-swe",
    title: "Software Engineer (University Graduate)",
    company: "Google",
    logoText: "G",
    badge: "Tier 1 - Product",
    type: "Full-Time",
    location: "Bangalore / Hyderabad, India",
    ctc: "₹28 - 34 LPA",
    description: "Join Google engineering to design large-scale distributed systems, web architectures, and intelligent infrastructure serving billions of users worldwide.",
    requiredSkills: ["Data Structures & Algorithms", "C++", "Java", "Python", "System Design", "Operating Systems", "Computer Networks"],
    niceToHaveSkills: ["Distributed Systems", "Cloud Platforms (GCP)", "Open Source Contributions", "Competitive Programming"],
    minCgpa: 8.0,
    allowedBranches: ["Computer Science", "Information Technology", "Electronics & Communication", "AI & Data Science", "Electrical Engineering"],
    allowedQualifications: ["B.Tech", "B.E.", "MCA", "M.Tech"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-10-31",
    selectionRounds: ["Online Coding Assessment (2 LeetCode Medium/Hard)", "Technical Phone Screen", "3x Technical & System Architecture Rounds", "Googleyness & Leadership"],
    openings: 45,
  },
  {
    id: "job-microsoft-sde",
    title: "Software Development Engineer 1",
    company: "Microsoft",
    logoText: "MS",
    badge: "Tier 1 - Product",
    type: "Full-Time",
    location: "Hyderabad / Noida / Bengaluru",
    ctc: "₹24 - 28 LPA",
    description: "Build robust cloud infrastructure for Microsoft Azure, Office 365, and AI platform tools with focus on security, performance, and high availability.",
    requiredSkills: ["Data Structures & Algorithms", "Object-Oriented Programming", "C#", "Java", "Python", "DBMS", "REST APIs"],
    niceToHaveSkills: ["Docker", "Kubernetes", "Microservices Architecture", "Azure Fundamentals"],
    minCgpa: 7.5,
    allowedBranches: ["Computer Science", "Information Technology", "Electronics & Communication", "AI & Data Science", "Mathematics & Computing"],
    allowedQualifications: ["B.Tech", "B.E.", "MCA"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-15",
    selectionRounds: ["Online Coding Test (3 DSA Problems)", "Technical Interview Round 1 (DSA & Problem Solving)", "Technical Round 2 (Projects & Design)", "AA (As Appropriate / Managerial Round)"],
    openings: 60,
  },
  {
    id: "job-amazon-sde1",
    title: "Software Development Engineer (SDE-1)",
    company: "Amazon",
    logoText: "AMZ",
    badge: "Tier 1 - Product",
    type: "Full-Time",
    location: "Bangalore / Chennai / Hyderabad",
    ctc: "₹22 - 27 LPA",
    description: "Innovate and build scalable customer-facing services and logistics algorithms. Adhere to Amazon Leadership Principles and write production-grade code.",
    requiredSkills: ["Data Structures & Algorithms", "Java", "Python", "C++", "Object Oriented Design", "SQL", "Git"],
    niceToHaveSkills: ["AWS Services (DynamoDB, S3, Lambda)", "Spring Boot", "Kafka"],
    minCgpa: 7.0,
    allowedBranches: ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical Engineering", "AI & Data Science", "Mechanical Engineering"],
    allowedQualifications: ["B.Tech", "B.E.", "MCA"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-01",
    selectionRounds: ["Online Assessment (OA1: Debugging & OA2: Coding + Work Simulation)", "Technical Round 1 (Trees/Graphs/DP)", "Technical Round 2 (OOP/Low Level Design)", "Bar Raiser + Amazon Leadership Principles"],
    openings: 80,
  },
  {
    id: "job-razorpay-fullstack",
    title: "Software Engineer - Frontend & Full Stack",
    company: "Razorpay",
    logoText: "RZP",
    badge: "Fintech Leader",
    type: "Full-Time",
    location: "Bengaluru (Hybrid)",
    ctc: "₹16 - 20 LPA",
    description: "Design seamless payment checkouts and merchant dashboard interfaces powered by React, TypeScript, and micro-frontend architectures.",
    requiredSkills: ["TypeScript", "React", "Node.js", "State Management (Redux/Zustand)", "HTML5 & CSS3", "REST APIs", "Performance Optimization"],
    niceToHaveSkills: ["Next.js", "WebSockets", "Payment Gateways", "Tailwind CSS"],
    minCgpa: 6.5,
    allowedBranches: ["All Engineering Branches (B.Tech/B.E.)", "MCA", "BCA", "B.Sc Computer Science", "Computer Science", "Information Technology"],
    allowedQualifications: ["B.Tech", "B.E.", "MCA", "BCA", "B.Sc"],
    maxBacklogs: 2,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-30",
    selectionRounds: ["Frontend Take-Home / Live Coding Challenge", "Architecture & Web Vitals Deep-Dive", "Cultural & Values Discussion"],
    openings: 25,
  },
  {
    id: "job-tcs-digital",
    title: "Systems Engineer (TCS Digital Cadre)",
    company: "Tata Consultancy Services",
    logoText: "TCS",
    badge: "Elite IT Services",
    type: "Full-Time",
    location: "Pan-India (Major Tech Hubs)",
    ctc: "₹7.5 - 9.0 LPA",
    description: "Work on digital transformation projects in Cloud, Enterprise AI, and Cybersecurity for Fortune 500 global clients.",
    requiredSkills: ["Python", "Java", "SQL", "Cloud Basics", "Data Structures", "Problem Solving", "Good Communication"],
    niceToHaveSkills: ["AWS / Azure Certifications", "Machine Learning Basics", "Git"],
    minCgpa: 6.5,
    allowedBranches: ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "MCA", "BCA"],
    allowedQualifications: ["B.Tech", "B.E.", "MCA", "BCA"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-12-15",
    selectionRounds: ["National Qualifier Test (NQT) Digital Section", "Technical & Coding Interview", "Managerial & HR Interview"],
    openings: 250,
  },
  {
    id: "job-zoho-jr-web-dev",
    title: "Junior Web Developer / Trainee",
    company: "Zoho Corporation",
    logoText: "ZH",
    badge: "Product SaaS",
    type: "Full-Time",
    location: "Chennai / Tenkasi, Tamil Nadu",
    ctc: "₹4.5 - 6.5 LPA",
    description: "Build clean, performant web applications for Zoho's global suite of business tools. Qualification-open with rigorous focus on practical JavaScript, HTML/CSS, and problem-solving.",
    requiredSkills: ["HTML5 & CSS3", "JavaScript", "Responsive Web Design", "Git & GitHub", "Problem Solving"],
    niceToHaveSkills: ["React Basics", "REST APIs", "Node.js Basics"],
    minCgpa: 6.0,
    allowedBranches: ["Computer Science", "Information Technology", "Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "All"],
    allowedQualifications: ["Diploma", "BCA", "B.Sc", "B.Tech", "B.E."],
    maxBacklogs: 2,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-20",
    selectionRounds: ["Basic Programming & Aptitude", "Hands-on Web Slicing Challenge", "Technical HR Round"],
    openings: 75,
  },
  {
    id: "job-wipro-wilp-bca",
    title: "Associate Software Developer (Scholar Trainee)",
    company: "Wipro Technologies",
    logoText: "WIP",
    badge: "Global IT Services",
    type: "Full-Time",
    location: "Bengaluru / Pune / Hyderabad / NCR",
    ctc: "₹3.5 - 4.8 LPA + M.Tech Sponsorship",
    description: "Work on enterprise software development, testing, and cloud infrastructure while pursuing a sponsored higher degree. Dedicated pipeline for BCA and B.Sc graduates.",
    requiredSkills: ["Core Java or Python", "SQL & Database Queries", "Object-Oriented Programming", "Git & GitHub", "Good Communication"],
    niceToHaveSkills: ["Linux Basics", "Web Technologies", "Testing Concepts"],
    minCgpa: 6.0,
    allowedBranches: ["Computer Science", "Information Technology", "Computer Applications", "All"],
    allowedQualifications: ["BCA", "B.Sc", "Diploma"],
    maxBacklogs: 1,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-12-05",
    selectionRounds: ["Online Assessment (Quantitative + Logical + Verbal + Coding)", "Technical Interview", "HR Discussion"],
    openings: 350,
  },
  {
    id: "job-techm-it-support",
    title: "Technical Support Associate",
    company: "Tech Mahindra",
    logoText: "TM",
    badge: "Telecom & IT Solutions",
    type: "Full-Time",
    location: "Noida / Pune / Bengaluru",
    ctc: "₹2.8 - 4.0 LPA",
    description: "Provide enterprise IT infrastructure support, networking diagnosis, and user incident resolution across global telecom and banking clients.",
    requiredSkills: ["Hardware & OS Troubleshooting", "Computer Networks Basics", "Ticketing Systems", "Customer Communication", "Basic SQL"],
    niceToHaveSkills: ["Linux Basics", "Active Directory", "ITIL"],
    minCgpa: 5.5,
    allowedBranches: ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical Engineering", "Civil Engineering", "Mechanical Engineering", "All"],
    allowedQualifications: ["Diploma", "BCA", "B.Sc", "B.Tech"],
    maxBacklogs: 3,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-15",
    selectionRounds: ["Aptitude & Communication Screen", "Technical Q&A", "Operations Manager Round"],
    openings: 120,
  },
  {
    id: "job-lt-civil-site-sup",
    title: "Site Supervisor / Junior Civil Engineer Trainee",
    company: "Larsen & Toubro (L&T Construction)",
    logoText: "L&T",
    badge: "Infrastructure Giant",
    type: "Full-Time",
    location: "Pan-India Mega Project Sites (Highways, Metro, Bridges)",
    ctc: "₹3.2 - 4.5 LPA",
    description: "Supervise on-site construction execution, bar-bending schedule (BBS) verification, daily progress reporting (DPR), and concrete quality checks.",
    requiredSkills: ["Site Supervision", "Building Materials & Concrete Technology", "Surveying Basics", "AutoCAD Civil", "Bar Bending Schedules (BBS)", "Quantity Estimation Basics"],
    niceToHaveSkills: ["Total Station Surveying", "Quality Control Testing", "Basic Safety Compliance"],
    minCgpa: 6.0,
    allowedBranches: ["Civil Engineering", "Civil"],
    allowedQualifications: ["Diploma", "B.Tech", "B.E."],
    maxBacklogs: 1,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-10-30",
    selectionRounds: ["Technical Domain Written Test", "Practical Drawing & BBS Evaluation", "Site Head Interview"],
    openings: 90,
  },
  {
    id: "job-shapoorji-structural-eng",
    title: "Structural Design Engineer",
    company: "Shapoorji Pallonji Engineering",
    logoText: "SP",
    badge: "Core Engineering",
    type: "Full-Time",
    location: "Mumbai / Bengaluru / Hyderabad",
    ctc: "₹5.5 - 8.5 LPA",
    description: "Perform structural analysis and design calculations for high-rise commercial towers and industrial steel structures adhering strictly to IS 456, IS 800, and IS 1893 seismic codes.",
    requiredSkills: ["STAAD.Pro or ETABS", "RCC & Steel Structure Design (IS 456 / IS 800)", "Wind & Earthquake Load Analysis (IS 1893)", "Structural Detailing"],
    niceToHaveSkills: ["Revit Structure (BIM)", "SAFE Foundation Design"],
    minCgpa: 7.0,
    allowedBranches: ["Civil Engineering", "Civil"],
    allowedQualifications: ["B.Tech", "B.E.", "M.Tech"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-10",
    selectionRounds: ["Structural Engineering Written Exam", "Design Software Practical Modeling Test", "Technical Panel Interview"],
    openings: 20,
  },
  {
    id: "job-schneider-elec-tech",
    title: "Electrical Maintenance & Testing Technician",
    company: "Schneider Electric India",
    logoText: "SE",
    badge: "Energy & Automation",
    type: "Full-Time",
    location: "Chennai / Bengaluru / Vadodara",
    ctc: "₹3.0 - 4.2 LPA",
    description: "Install, calibrate, and maintain switchgear panels, motor control centers (MCC), transformers, and variable frequency drives (VFD) in industrial plants.",
    requiredSkills: ["Single Line Diagrams (SLD)", "Motor Controls & Starters", "Switchgear & MCC Operation", "Multimeter / Megger Insulation Testing", "Electrical Safety Procedures"],
    niceToHaveSkills: ["PLC Basics", "Relay Calibration", "Industrial Wiring"],
    minCgpa: 6.0,
    allowedBranches: ["Electrical Engineering", "Electrical"],
    allowedQualifications: ["Diploma"],
    maxBacklogs: 1,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-10-25",
    selectionRounds: ["Electrical Circuit Diagram Test", "Practical Wiring & Testing Assessment", "Plant HR Round"],
    openings: 40,
  },
  {
    id: "job-abb-electrical-engineer",
    title: "Power Systems & EV Systems Engineer",
    company: "ABB India",
    logoText: "ABB",
    badge: "Power & Automation",
    type: "Full-Time",
    location: "Bengaluru / Nashik",
    ctc: "₹6.0 - 9.5 LPA",
    description: "Design power distribution systems, grid integration for renewables, and EV fast-charging power conversion systems using MATLAB/Simulink and ETAP.",
    requiredSkills: ["Power Systems Analysis", "MATLAB / Simulink", "Power Electronics Fundamentals", "Electrical Machine Design", "Protection & Switchgear Design", "AutoCAD Electrical"],
    niceToHaveSkills: ["ETAP Power System Modeling", "EV Powertrain & BMS", "PLC / SCADA Automation"],
    minCgpa: 7.0,
    allowedBranches: ["Electrical Engineering", "Electrical", "Electronics & Communication"],
    allowedQualifications: ["B.Tech", "B.E."],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-15",
    selectionRounds: ["Aptitude + Core Electrical Gate-level Assessment", "Technical Interview 1 (Power Systems & Power Electronics)", "Leadership Round"],
    openings: 25,
  },
  {
    id: "job-tatamotors-mech-tech",
    title: "Production & Assembly Technician (Mechanical)",
    company: "Tata Motors",
    logoText: "TML",
    badge: "Automotive Pioneer",
    type: "Full-Time",
    location: "Pune / Pantnagar / Jamshedpur",
    ctc: "₹2.8 - 3.8 LPA",
    description: "Manage precision mechanical assembly, CNC/VMC setup, dimensional verification with precision gauges, and line maintenance.",
    requiredSkills: ["Engineering Drawing Reading", "Vernier Caliper & Micrometer Precision Measurement", "Pneumatic & Hydraulic Circuits", "Lathe & Milling Basics", "Workshop Safety"],
    niceToHaveSkills: ["G-Code / CNC Operation", "7 QC Tools", "Preventive Maintenance"],
    minCgpa: 6.0,
    allowedBranches: ["Mechanical Engineering", "Mechanical"],
    allowedQualifications: ["Diploma"],
    maxBacklogs: 1,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-05",
    selectionRounds: ["Trade & Drawing Test", "Machine Shop Practical", "HR Round"],
    openings: 85,
  },
  {
    id: "job-mahindra-design-eng",
    title: "Mechanical Design Engineer (CAD/CAE)",
    company: "Mahindra & Mahindra",
    logoText: "M&M",
    badge: "Auto & Farm Equipment",
    type: "Full-Time",
    location: "Chennai (MRV) / Pune",
    ctc: "₹5.5 - 9.0 LPA",
    description: "Conceptualize, model, and simulate chassis, body-in-white (BIW), and powertrain components using SolidWorks/CATIA and ANSYS FEA.",
    requiredSkills: ["SolidWorks or CATIA", "Geometric Dimensioning & Tolerancing (GD&T - ASME Y14.5)", "Finite Element Analysis (FEA - ANSYS basics)", "Material Selection & Metallurgy", "Design for Manufacturing & Assembly (DFMA)"],
    niceToHaveSkills: ["Kinematic Simulation", "Thermal & CFD Analysis", "DFMEA"],
    minCgpa: 7.0,
    allowedBranches: ["Mechanical Engineering", "Mechanical"],
    allowedQualifications: ["B.Tech", "B.E."],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-20",
    selectionRounds: ["Automotive Engineering Technical Screening", "3D CAD Modeling Challenge (CATIA/SolidWorks)", "R&D Technical Panel Interview"],
    openings: 30,
  },
  {
    id: "job-bel-electronics-tech",
    title: "Electronics Testing & Maintenance Technician",
    company: "Bharat Electronics Limited (BEL)",
    logoText: "BEL",
    badge: "PSU / Defense Electronics",
    type: "Full-Time",
    location: "Bengaluru / Ghaziabad / Hyderabad",
    ctc: "₹3.2 - 4.5 LPA",
    description: "Perform electronic circuit testing, component-level troubleshooting using digital storage oscilloscopes (DSO), SMD soldering, and PCB inspection in defense and avionics manufacturing units.",
    requiredSkills: ["Multimeter & DSO Operation", "SMD Soldering & De-soldering", "PCB Testing & Inspection", "Component Identification", "Electronic Circuit Reading"],
    niceToHaveSkills: ["ESD Standards", "Signal Generators", "IPC-A-610 Basics"],
    minCgpa: 6.0,
    allowedBranches: ["Electronics & Communication", "Electronics", "ECE", "Telecommunication", "Electrical Engineering"],
    allowedQualifications: ["Diploma"],
    maxBacklogs: 1,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-12",
    selectionRounds: ["Electronics Technical Written Test", "Practical Trade Test (Soldering & Oscilloscope Measurement)", "Document Verification & HR"],
    openings: 45,
  },
  {
    id: "job-airtel-telecom-tech",
    title: "Telecom Network & Field Technician",
    company: "Bharti Airtel",
    logoText: "AIR",
    badge: "Telecom Infrastructure",
    type: "Full-Time",
    location: "Delhi NCR / Mumbai / Kolkata / Pune",
    ctc: "₹2.6 - 3.8 LPA",
    description: "Field maintenance of cellular base stations, optical fiber testing (OTDR), microwave link alignment, and telecom shelter electrical and battery backup equipment.",
    requiredSkills: ["Optical Fiber Splicing & OTDR", "RF Cable & Antenna Installation", "Tower Shelter Equipment", "Telecom Network Protocols", "Field Safety"],
    niceToHaveSkills: ["4G/5G Radio Basics", "Battery Bank Maintenance", "Power Backups"],
    minCgpa: 5.5,
    allowedBranches: ["Electronics & Communication", "Electronics", "ECE", "Telecommunication", "Electrical Engineering"],
    allowedQualifications: ["Diploma"],
    maxBacklogs: 2,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-08",
    selectionRounds: ["Technical Screening", "Field Equipment Practical Test", "HR Interview"],
    openings: 60,
  },
  {
    id: "job-ti-embedded-engineer",
    title: "Embedded Systems & Firmware Engineer",
    company: "Texas Instruments India",
    logoText: "TI",
    badge: "Tier 1 - Semiconductors",
    type: "Full-Time",
    location: "Bengaluru",
    ctc: "₹15 - 22 LPA",
    description: "Design bare-metal and RTOS firmware for ARM Cortex-M microcontrollers, sensor interface drivers, and low-power power management integrated circuits.",
    requiredSkills: ["Embedded C / C++", "Microcontrollers (ARM Cortex-M / STM32)", "RTOS Fundamentals (FreeRTOS)", "Communication Protocols (UART, SPI, I2C, CAN)", "Digital Electronics", "PCB Design (KiCad / Altium)"],
    niceToHaveSkills: ["Linux Kernel & Device Drivers", "Oscilloscopes & Logic Analyzers", "Python for Test Automation"],
    minCgpa: 7.5,
    allowedBranches: ["Electronics & Communication", "ECE", "Electronics", "Computer Science", "Electrical Engineering"],
    allowedQualifications: ["B.Tech", "B.E.", "M.Tech"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-11-25",
    selectionRounds: ["Online Technical & Embedded Coding Test", "Technical Interview 1 (Digital Electronics & Microcontrollers)", "Technical Interview 2 (Firmware Design & Protocols)", "Managerial & Fitment Round"],
    openings: 25,
  },
  {
    id: "job-qualcomm-vlsi-engineer",
    title: "VLSI Design & Verification Engineer",
    company: "Qualcomm India",
    logoText: "QCOM",
    badge: "Tier 1 - Semiconductors",
    type: "Full-Time",
    location: "Hyderabad / Bengaluru / Chennai",
    ctc: "₹18 - 26 LPA",
    description: "Develop and verify digital IP blocks for Snapdragon processors, cellular modems, and RF connectivity chips using SystemVerilog and UVM.",
    requiredSkills: ["Verilog HDL", "SystemVerilog Basics", "Digital System Design & Boolean Logic", "CMOS VLSI Fundamentals", "Static Timing Analysis (STA)", "EDA Simulation Tools (ModelSim / Vivado)"],
    niceToHaveSkills: ["UVM Verification", "FPGA Prototyping", "Perl / Python Scripting"],
    minCgpa: 7.5,
    allowedBranches: ["Electronics & Communication", "ECE", "Electronics", "Electrical Engineering"],
    allowedQualifications: ["B.Tech", "B.E.", "M.Tech"],
    maxBacklogs: 0,
    graduationYears: [2025, 2026, 2027],
    applicationDeadline: "2026-12-05",
    selectionRounds: ["Online Aptitude + Digital Electronics Assessment", "Technical Interview 1 (Verilog & FSM Design)", "Technical Interview 2 (STA & SystemVerilog)", "HR & Executive Round"],
    openings: 30,
  }
];

// Helper to seed standard jobs into MongoDB if collection is empty
async function seedDefaultJobs(): Promise<void> {
  try {
    const count = await JobModel.countDocuments();
    if (count === 0) {
      await JobModel.insertMany(defaultJobs);
      console.log(`[MongoDB] Initialized ${defaultJobs.length} default campus job listings.`);
    }
  } catch (err: any) {
    console.error("[MongoDB] Error checking/seeding job catalog:", err.message);
  }
}

// ----------------------------------------------------
// MONGODB SERVICE INTERFACE (Async CRUD Operations)
// ----------------------------------------------------

export const db = {
  // Users
  users: {
    all: async (): Promise<UserDocument[]> => {
      const docs = await UserModel.find({}).lean().exec();
      return docs as unknown as UserDocument[];
    },
    find: async (query: any): Promise<UserDocument[]> => {
      const docs = await UserModel.find(query).lean().exec();
      return docs as unknown as UserDocument[];
    },
    findById: async (id: string): Promise<UserDocument | null> => {
      const doc = await UserModel.findOne({ id }).lean().exec();
      return doc as unknown as UserDocument | null;
    },
    findByEmail: async (email: string): Promise<UserDocument | null> => {
      const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean().exec();
      return doc as unknown as UserDocument | null;
    },
    findByRollNumber: async (rollNumber: string): Promise<UserDocument | null> => {
      const doc = await UserModel.findOne({ rollNumber: rollNumber.trim() }).lean().exec();
      return doc as unknown as UserDocument | null;
    },
    create: async (user: UserDocument): Promise<UserDocument> => {
      const doc = await UserModel.create(user);
      return doc.toObject() as unknown as UserDocument;
    },
    update: async (id: string, updates: Partial<UserDocument>): Promise<UserDocument | null> => {
      const updated = await UserModel.findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { new: true }
      ).lean().exec();
      return updated as unknown as UserDocument | null;
    },
    delete: async (id: string): Promise<void> => {
      await UserModel.deleteOne({ id }).exec();
    },
    deleteUserData: async (userId: string): Promise<void> => {
      await Promise.all([
        UserModel.deleteOne({ id: userId }).exec(),
        SessionModel.deleteMany({ userId }).exec(),
        RoadmapModel.deleteMany({ userId }).exec(),
        InterviewModel.deleteMany({ userId }).exec(),
        ReadinessScoreModel.deleteMany({ userId }).exec(),
      ]);
    },
  },

  // Jobs
  jobs: {
    all: async (): Promise<JobDocument[]> => {
      const docs = await JobModel.find({}).lean().exec();
      return docs as unknown as JobDocument[];
    },
    findById: async (id: string): Promise<JobDocument | null> => {
      const doc = await JobModel.findOne({ id }).lean().exec();
      return doc as unknown as JobDocument | null;
    },
    create: async (job: JobDocument): Promise<JobDocument> => {
      const doc = await JobModel.create(job);
      return doc.toObject() as unknown as JobDocument;
    },
  },

  // Roadmaps
  roadmaps: {
    findById: async (id: string): Promise<RoadmapDocument | null> => {
      const doc = await RoadmapModel.findOne({ id }).lean().exec();
      return doc as unknown as RoadmapDocument | null;
    },
    findByUserAndJob: async (userId: string, jobId: string): Promise<RoadmapDocument | null> => {
      const doc = await RoadmapModel.findOne({ userId, jobId }).lean().exec();
      return doc as unknown as RoadmapDocument | null;
    },
    findByUserAndRole: async (userId: string, role: string): Promise<RoadmapDocument | null> => {
      const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedRole}$`, "i");
      const doc = await RoadmapModel.findOne({
        userId,
        $or: [{ selectedRole: regex }, { jobTitle: regex }],
      }).lean().exec();
      return doc as unknown as RoadmapDocument | null;
    },
    findByUser: async (userId: string): Promise<RoadmapDocument[]> => {
      const docs = await RoadmapModel.find({ userId }).sort({ updatedAt: -1 }).lean().exec();
      return docs as unknown as RoadmapDocument[];
    },
    save: async (roadmap: RoadmapDocument): Promise<RoadmapDocument> => {
      let totalItems = 0;
      let completedItems = 0;
      for (const phase of roadmap.phases || []) {
        for (const item of phase.items || []) {
          totalItems++;
          if (item.completed) completedItems++;
        }
      }
      roadmap.totalTasks = totalItems;
      roadmap.completedTasks = completedItems;
      roadmap.overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      roadmap.updatedAt = new Date().toISOString();

      const saved = await RoadmapModel.findOneAndUpdate(
        { id: roadmap.id },
        { $set: roadmap },
        { upsert: true, new: true }
      ).lean().exec();
      return saved as unknown as RoadmapDocument;
    },
    updateItem: async (roadmapId: string, itemId: string, completed: boolean): Promise<RoadmapDocument | null> => {
      const roadmapDoc = await RoadmapModel.findOne({ id: roadmapId });
      if (!roadmapDoc) return null;

      let totalItems = 0;
      let completedItems = 0;
      for (const phase of roadmapDoc.phases) {
        for (const item of phase.items) {
          if (item.id === itemId) {
            item.completed = completed;
            item.completedAt = completed ? new Date().toISOString() : undefined;
          }
          totalItems++;
          if (item.completed) completedItems++;
        }
      }
      roadmapDoc.totalTasks = totalItems;
      roadmapDoc.completedTasks = completedItems;
      roadmapDoc.overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      roadmapDoc.updatedAt = new Date().toISOString();

      roadmapDoc.markModified("phases");
      await roadmapDoc.save();
      return roadmapDoc.toObject() as unknown as RoadmapDocument;
    },
  },

  // Interviews
  interviews: {
    findByUser: async (userId: string): Promise<InterviewDocument[]> => {
      const docs = await InterviewModel.find({ userId }).sort({ conductedAt: -1 }).lean().exec();
      return docs as unknown as InterviewDocument[];
    },
    findById: async (id: string): Promise<InterviewDocument | null> => {
      const doc = await InterviewModel.findOne({ id }).lean().exec();
      return doc as unknown as InterviewDocument | null;
    },
    create: async (interview: InterviewDocument): Promise<InterviewDocument> => {
      const doc = await InterviewModel.create(interview);
      return doc.toObject() as unknown as InterviewDocument;
    },
  },

  // Readiness Scores
  readinessScores: {
    findByUser: async (userId: string): Promise<ReadinessScoreDocument | null> => {
      const doc = await ReadinessScoreModel.findOne({ userId }).sort({ calculatedAt: -1 }).lean().exec();
      return doc as unknown as ReadinessScoreDocument | null;
    },
    save: async (score: ReadinessScoreDocument): Promise<ReadinessScoreDocument> => {
      const saved = await ReadinessScoreModel.findOneAndUpdate(
        { userId: score.userId },
        { $set: score },
        { upsert: true, new: true }
      ).lean().exec();
      return saved as unknown as ReadinessScoreDocument;
    },
  },

  // Sessions
  sessions: {
    create: async (token: string, userId: string, expiresAt: string): Promise<void> => {
      await SessionModel.create({ token, userId, createdAt: new Date().toISOString(), expiresAt });
    },
    get: async (token: string): Promise<SessionDocument | null> => {
      const session = await SessionModel.findOne({ token }).lean().exec();
      if (!session) return null;
      if (new Date(session.expiresAt) < new Date()) {
        await SessionModel.deleteOne({ token }).exec();
        return null;
      }
      return session as unknown as SessionDocument;
    },
    delete: async (token: string): Promise<void> => {
      await SessionModel.deleteOne({ token }).exec();
    },
  },
};

// ----------------------------------------------------
// INITIALIZE MONGOOSE / MONGODB CONNECTION
// ----------------------------------------------------

let mongoMemoryServerInstance: any = null;

export async function initMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (uri) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log("[MongoDB] Connected to configured MONGODB_URI database via Mongoose successfully.");
      await seedDefaultJobs();
      return;
    } catch (err: any) {
      console.error("[MongoDB Connection Error] Failed to connect to MONGODB_URI:", err.message);
      if (isProduction) {
        throw new Error(`[MongoDB Production Error] Cannot connect to production MONGODB_URI: ${err.message}`);
      }
      console.warn(
        `[MongoDB Dev Fallback] Could not connect to remote MONGODB_URI in development (${err.message}). Starting local in-memory engine for preview environment.`
      );
    }
  } else if (isProduction) {
    throw new Error("[MongoDB Production Error] MONGODB_URI environment variable is required in production mode.");
  }

  // Spin up real MongoMemoryServer for reliable container/preview execution
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongoMemoryServerInstance = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServerInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log("[MongoDB] Started live in-memory MongoDB instance and connected via Mongoose.");
    await seedDefaultJobs();
  } catch (err: any) {
    console.error("[MongoDB Engine Error] Failed to initialize MongoDB:", err.message);
    throw err;
  }
}
