import { generateGeminiJson } from "./gemini.js";
import {
  UserDocument,
  JobDocument,
  RoadmapDocument,
  RoadmapItem,
  SkillWithLevel,
  InterviewDocument,
  ReadinessScoreDocument,
  AiProfileAnalysis,
  AiRecommendedJobRole,
  StudentAiRecommendations,
  SkillGapAnalysis,
  PrioritySkillItem,
} from "./db.js";
import {
  getCareerRecommendations,
  normalizeQualification,
  normalizeBranchKey,
  CareerRecommendationOutput,
  VERIFIED_CAREER_ROLES,
} from "../src/data/careerRecommendationEngine.js";

export function quickJobMatch(student: UserDocument, job: JobDocument) {
  // 1. CGPA cutoff check
  const cgpaPass = student.cgpa >= job.minCgpa;

  // 2. Active backlogs check
  const backlogPass = (student.backlogs || 0) <= job.maxBacklogs;

  // 3. Qualification-Aware Check (Degree / Diploma / BCA / MCA separation)
  const studentQual = normalizeQualification(student.course);
  const isQualAllowed =
    !job.allowedQualifications ||
    job.allowedQualifications.length === 0 ||
    job.allowedQualifications.some((q) => {
      const normQ = normalizeQualification(q);
      return (
        normQ === studentQual ||
        (studentQual === "B.Tech" && normQ === "B.E.") ||
        (studentQual === "B.E." && normQ === "B.Tech")
      );
    });

  // 4. Branch check (strict check without conflating unrelated engineering streams)
  const branchNormalized = (student.branch || "").toLowerCase();
  const isBranchAllowed = job.allowedBranches.some((b) => {
    const bLower = b.toLowerCase();
    return bLower.includes("all") || branchNormalized.includes(bLower) || bLower.includes(branchNormalized);
  });

  const isEligible = cgpaPass && backlogPass && isQualAllowed && isBranchAllowed;

  let eligibilityStatus = "Eligible";
  let eligibilityReason = "Eligible for on-campus drives";

  if (!isQualAllowed) {
    eligibilityStatus = "Qualification Restricted";
    eligibilityReason = `Role typically requires ${job.allowedQualifications?.join(" / ") || "graduate degree"} (Current: ${student.course || "Diploma"})`;
  } else if (!isBranchAllowed) {
    eligibilityStatus = "Branch Restricted";
    eligibilityReason = `Open for ${job.allowedBranches.join(", ")} (Current: ${student.branch})`;
  } else if (!cgpaPass) {
    eligibilityStatus = "Below CGPA Cutoff";
    eligibilityReason = `Requires minimum ${job.minCgpa} CGPA (Current: ${student.cgpa})`;
  } else if (!backlogPass) {
    eligibilityStatus = "Backlogs Limit Exceeded";
    eligibilityReason = `Maximum ${job.maxBacklogs} active backlog(s) permitted (Current: ${student.backlogs})`;
  }

  // Skills matching
  const studentSkills = (student.skills || []).map((s) => s.trim().toLowerCase());
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  job.requiredSkills.forEach((req) => {
    const isMatch = studentSkills.some((s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s));
    if (isMatch) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  // Calculate base match score
  let baseScore = 50;
  if (cgpaPass) baseScore += 15;
  if (backlogPass) baseScore += 10;
  if (isBranchAllowed) baseScore += 10;
  const skillsRatio = job.requiredSkills.length > 0 ? matchedSkills.length / job.requiredSkills.length : 0.8;
  let matchPercentage = Math.min(98, Math.max(25, Math.round(baseScore * 0.4 + skillsRatio * 60)));

  // If qualification is not accepted for direct hiring, reflect realistic gap
  if (!isQualAllowed) {
    matchPercentage = Math.min(42, matchPercentage);
  } else if (!isBranchAllowed) {
    matchPercentage = Math.min(48, matchPercentage);
  }

  let fitSummary = `Possesses foundational skills for ${job.title} at ${job.company}.`;
  if (!isQualAllowed) {
    fitSummary = `Direct campus hiring for ${job.title} at ${job.company} strictly mandates ${job.allowedQualifications?.join(" / ") || "a 4-year degree"}. Candidates with ${student.course} can qualify via entry-level technical roles (e.g. Junior Web Developer, Technician) followed by verified industry experience.`;
  } else if (missingSkills.length > 0) {
    fitSummary += ` Requires bridging technical gaps in ${missingSkills.slice(0, 3).join(", ") || "advanced topics"}.`;
  }

  const recruiterAdvice = !isQualAllowed
    ? `Prioritize roles that accept ${student.course} directly, or pursue lateral entry / bridging certifications to meet formal qualification benchmarks.`
    : `Review core ${job.selectionRounds[0] || "technical evaluation"} preparation and build a portfolio project demonstrating ${job.requiredSkills.slice(0, 2).join(", ")}.`;

  return {
    jobId: job.id,
    isEligible,
    eligibilityStatus,
    eligibilityReason,
    matchPercentage,
    fitSummary,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : student.skills.slice(0, 3),
    skillGaps: missingSkills.length > 0 ? missingSkills : ["System Design Basics", "Advanced Coding Practice"],
    recruiterAdvice,
  };
}

export async function analyzeJobMatch(student: UserDocument, job: JobDocument) {
  const baseMatch = quickJobMatch(student, job);

  const prompt = `You are a Senior Campus Placement Director and Technical Recruiter.
Analyze this college student against the target job role.

Student Profile:
- Name: ${student.fullName}
- Course: ${student.course}, Branch: ${student.branch}, Semester: ${student.semester}
- CGPA: ${student.cgpa} / 10, Backlogs: ${student.backlogs}
- Stated Skills: ${student.skills.join(", ")}
- Resume Summary: ${student.resumeText ? student.resumeText.slice(0, 800) : "No resume text provided yet"}

Job Target:
- Company: ${job.company} (${job.badge})
- Role: ${job.title} (${job.ctc})
- Required Skills: ${job.requiredSkills.join(", ")}
- Nice-to-have: ${job.niceToHaveSkills.join(", ")}
- Min CGPA: ${job.minCgpa}

Return JSON with:
{
  "eligibilityStatus": "Eligible" or "Borderline" or "Ineligible",
  "eligibilityReason": "string explanation of CGPA and branch standing",
  "matchPercentage": number between 30 and 95,
  "fitSummary": "concise 2-sentence executive summary of student's fit",
  "matchedSkills": ["skill1", "skill2"],
  "skillGaps": ["gap1", "gap2", "gap3"],
  "recruiterAdvice": "actionable advice for cracking this specific company's selection rounds"
}`;

  const parsed = await generateGeminiJson<any>(prompt);
  if (parsed) {
    return {
      jobId: job.id,
      isEligible: baseMatch.isEligible,
      eligibilityStatus: parsed.eligibilityStatus || baseMatch.eligibilityStatus,
      eligibilityReason: parsed.eligibilityReason || baseMatch.eligibilityReason,
      matchPercentage: parsed.matchPercentage || baseMatch.matchPercentage,
      fitSummary: parsed.fitSummary || baseMatch.fitSummary,
      matchedSkills: parsed.matchedSkills && parsed.matchedSkills.length > 0 ? parsed.matchedSkills : baseMatch.matchedSkills,
      skillGaps: parsed.skillGaps && parsed.skillGaps.length > 0 ? parsed.skillGaps : baseMatch.skillGaps,
      recruiterAdvice: parsed.recruiterAdvice || baseMatch.recruiterAdvice,
    };
  }

  return baseMatch;
}

export interface StudentSkillProfile {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export function extractStudentDeclaredSkills(student: UserDocument): StudentSkillProfile[] {
  const result: StudentSkillProfile[] = [];
  const seen = new Set<string>();

  if (Array.isArray(student.skillsWithLevels) && student.skillsWithLevels.length > 0) {
    for (const s of student.skillsWithLevels) {
      if (s && s.name && typeof s.name === "string" && !seen.has(s.name.toLowerCase().trim())) {
        const norm = s.name.trim();
        // Phase 3 Rule: No skill gets an automatic level. Only skills with an explicitly confirmed level receive credit.
        if (s.level === "Advanced" || s.level === "Intermediate" || s.level === "Beginner") {
          seen.add(norm.toLowerCase());
          result.push({ name: norm, level: s.level });
        }
      }
    }
  }

  return result;
}

export function getStandardRoleRequirements(roleName: string, studentBranch?: string): string[] {
  const norm = roleName.toLowerCase();
  const matched = VERIFIED_CAREER_ROLES.find(
    (r) =>
      r.role.toLowerCase() === norm ||
      norm.includes(r.role.toLowerCase()) ||
      r.role.toLowerCase().includes(norm)
  );
  if (matched && Array.isArray(matched.requiredSkills) && matched.requiredSkills.length > 0) {
    return matched.requiredSkills;
  }

  if (norm.includes("frontend") || norm.includes("react") || norm.includes("ui") || norm.includes("web developer")) {
    return ["HTML", "CSS", "JavaScript", "React", "Git", "Responsive Web Design", "REST APIs", "Frontend Testing"];
  }
  if (norm.includes("backend") || norm.includes("node") || norm.includes("api")) {
    return ["Node.js", "Express", "REST APIs", "SQL", "MongoDB", "Authentication & JWT", "Git", "API Testing"];
  }
  if (norm.includes("full stack") || norm.includes("software engineer") || norm.includes("software developer") || norm.includes("sde")) {
    return ["JavaScript", "HTML/CSS", "React", "Node.js", "SQL", "Data Structures & Algorithms", "Git", "System Design Basics"];
  }
  if (norm.includes("data analyst") || norm.includes("business analyst") || norm.includes("analytics")) {
    return ["SQL", "Python", "Pandas", "Data Visualization", "Excel / Spreadsheets", "Statistical Analysis", "PowerBI or Tableau"];
  }
  if (norm.includes("machine learning") || norm.includes("ai") || norm.includes("data scientist")) {
    return ["Python", "NumPy & Pandas", "Scikit-Learn", "Machine Learning Algorithms", "Data Preprocessing", "Model Evaluation", "SQL"];
  }
  if (norm.includes("devops") || norm.includes("cloud") || norm.includes("site reliability")) {
    return ["Linux & Bash", "Git", "Docker", "CI/CD Pipelines", "AWS or Cloud Basics", "Kubernetes Basics", "Networking Fundamentals"];
  }
  if (norm.includes("cybersecurity") || norm.includes("security")) {
    return ["Networking Protocols", "Linux & Bash", "Web Application Security", "Vulnerability Scanning", "Cryptography Basics", "Python or Scripting"];
  }
  if (norm.includes("embedded") || norm.includes("iot") || norm.includes("firmware")) {
    return ["Embedded C", "Microcontroller Architecture", "UART / SPI / I2C", "RTOS Basics", "Hardware Debugging & Oscilloscope", "Digital Electronics"];
  }
  if (norm.includes("electrical") || norm.includes("power") || norm.includes("automation")) {
    return ["Single Line Diagrams (SLD)", "Motor Controls & Starters", "Switchgear & MCC Operation", "Multimeter & Insulation Testing", "Electrical Safety", "PLC Basics"];
  }
  if (norm.includes("mechanical") || norm.includes("cad") || norm.includes("design engineer")) {
    return ["Engineering Drawing Reading", "SolidWorks or CATIA", "GD&T (ASME Y14.5)", "Finite Element Analysis (FEA)", "Material Selection & Metallurgy", "DFMA"];
  }
  if (norm.includes("civil") || norm.includes("construction") || norm.includes("site engineer")) {
    return ["AutoCAD Civil", "Structural Drawing Reading", "Reinforced Concrete (RCC)", "Quantity Estimation & BBS", "Surveying & Total Station", "IS Codes"];
  }

  return ["Core Programming", "Data Structures", "Database Management", "Git Version Control", "API Integration", "Problem Solving"];
}

export function generateDeterministicSkillGapAndRoadmap(
  student: UserDocument,
  targetRole: string,
  job?: JobDocument
): { skillGap: SkillGapAnalysis; roadmap: RoadmapDocument } {
  const timestamp = new Date().toISOString();
  const declaredSkills = extractStudentDeclaredSkills(student);
  const requiredSkills = getStandardRoleRequirements(targetRole, student.branch);

  const strong: string[] = [];
  const developing: string[] = [];
  const needsImprovement: string[] = [];
  const missing: string[] = [];
  const prioritySkills: PrioritySkillItem[] = [];

  const studentSkillMap = new Map<string, "Beginner" | "Intermediate" | "Advanced">();
  for (const s of declaredSkills) {
    studentSkillMap.set(s.name.toLowerCase().trim(), s.level);
  }

  // Evaluate required skills against student's verified profile
  for (const req of requiredSkills) {
    const reqLower = req.toLowerCase().trim();
    let matchedLevel: "Beginner" | "Intermediate" | "Advanced" | null = null;
    let matchedName = req;

    for (const [sName, sLvl] of studentSkillMap.entries()) {
      if (reqLower === sName || reqLower.includes(sName) || sName.includes(reqLower)) {
        matchedLevel = sLvl;
        matchedName = req;
        break;
      }
    }

    if (matchedLevel === "Advanced") {
      strong.push(matchedName);
    } else if (matchedLevel === "Intermediate") {
      developing.push(matchedName);
      prioritySkills.push({
        skill: matchedName,
        currentLevel: "Intermediate",
        requiredLevel: "Advanced",
        priority: "Medium",
        reason: `${matchedName} is currently at Intermediate level; build practical project depth for ${targetRole} standards.`,
      });
    } else if (matchedLevel === "Beginner") {
      needsImprovement.push(matchedName);
      prioritySkills.push({
        skill: matchedName,
        currentLevel: "Beginner",
        requiredLevel: "Intermediate",
        priority: "High",
        reason: `${matchedName} is at Beginner level and is a core requirement for ${targetRole}.`,
      });
    } else {
      missing.push(matchedName);
      const isCritical = prioritySkills.filter((p) => p.priority === "High").length < 2;
      prioritySkills.push({
        skill: matchedName,
        currentLevel: "None",
        requiredLevel: "Intermediate",
        priority: isCritical ? "High" : "Medium",
        reason: `${matchedName} is a standard industry requirement for ${targetRole} not present in your declared profile.`,
      });
    }
  }

  // Also categorize any declared skills that aren't in requiredSkills
  for (const s of declaredSkills) {
    const sLower = s.name.toLowerCase();
    const alreadyCounted = [...strong, ...developing, ...needsImprovement].some(
      (name) => name.toLowerCase() === sLower || name.toLowerCase().includes(sLower)
    );
    if (!alreadyCounted) {
      if (s.level === "Advanced") {
        strong.push(s.name);
      } else if (s.level === "Intermediate") {
        developing.push(s.name);
      }
    }
  }

  const skillGap: SkillGapAnalysis = {
    role: targetRole,
    strong: Array.from(new Set(strong)),
    developing: Array.from(new Set(developing)),
    needsImprovement: Array.from(new Set(needsImprovement)),
    missing: Array.from(new Set(missing)),
    prioritySkills: prioritySkills.slice(0, 5),
    analyzedAt: timestamp,
    isAiGenerated: false,
  };

  // Generate personalized phases targeting the gaps
  const customGapsIdentified: string[] = [];
  if (needsImprovement.length > 0) {
    customGapsIdentified.push(`Upgrade ${needsImprovement.slice(0, 2).join(" & ")} from Beginner to Intermediate proficiency`);
  }
  if (missing.length > 0) {
    customGapsIdentified.push(`Acquire core competency in ${missing.slice(0, 2).join(" & ")}`);
  }
  if (developing.length > 0) {
    customGapsIdentified.push(`Apply ${developing.slice(0, 2).join(" & ")} in role-specific production environments`);
  }
  if (customGapsIdentified.length === 0) {
    customGapsIdentified.push(`Advanced interview readiness and portfolio polish for ${targetRole}`);
  }

  const phases: RoadmapDocument["phases"] = [];
  let phaseNum = 1;

  // Phase 1: High Priority Gap Remediation
  const urgentGaps = [...needsImprovement, ...missing.slice(0, 2)];
  if (urgentGaps.length > 0) {
    phases.push({
      phaseNumber: phaseNum++,
      title: `Foundation & Priority Gap Closure: ${urgentGaps.slice(0, 2).join(" & ")}`,
      durationWeeks: "Weeks 1-2",
      items: urgentGaps.slice(0, 3).map((gapSkill, idx) => ({
        id: `task-p1-${idx + 1}`,
        title: `Master Core Concepts of ${gapSkill}`,
        skill: gapSkill,
        topic: `${gapSkill} Principles and Syntax`,
        priority: "High",
        reason: `${gapSkill} is identified as a primary preparation gap for ${targetRole}.`,
        type: "learn",
        category: "topic",
        difficulty: "Intermediate",
        estimatedHours: 8,
        estimatedTime: "8 hours",
        description: `Study the official documentation and best practices for ${gapSkill}, focusing on real-world patterns needed in ${targetRole}.`,
        linkText: `${gapSkill} Official Docs & Guides`,
        completed: false,
      })),
    });
  }

  // Phase 2: Practical Application & Integration
  const practicalSkills = [...missing.slice(2, 4), ...developing.slice(0, 2)];
  if (practicalSkills.length > 0) {
    phases.push({
      phaseNumber: phaseNum++,
      title: `Practical Hands-on Application: ${practicalSkills.slice(0, 2).join(" & ")}`,
      durationWeeks: "Weeks 3-4",
      items: practicalSkills.slice(0, 3).map((skill, idx) => ({
        id: `task-p2-${idx + 1}`,
        title: `Build Hands-On Exercise with ${skill}`,
        skill: skill,
        topic: `${skill} Practical Implementation`,
        priority: "Medium",
        reason: `Translate conceptual understanding of ${skill} into functioning code/designs.`,
        type: "practice",
        category: "coding",
        difficulty: "Intermediate",
        estimatedHours: 10,
        estimatedTime: "10 hours",
        description: `Implement modular exercises and integration routines highlighting ${skill} under simulated production constraints.`,
        linkText: `${skill} Interactive Exercises`,
        completed: false,
      })),
    });
  }

  // Phase 3: Role-Specific Portfolio Project
  const techStackForProject = Array.from(new Set([...needsImprovement, ...missing.slice(0, 2), ...developing.slice(0, 2)])).slice(0, 4);
  const projectTech = techStackForProject.length > 0 ? techStackForProject : [targetRole];
  phases.push({
    phaseNumber: phaseNum++,
    title: `Role-Specific Capstone Project: End-to-End ${targetRole} Implementation`,
    durationWeeks: "Weeks 5-6",
    items: [
      {
        id: `task-p3-1`,
        title: `Design & Architect Capstone for ${targetRole}`,
        skill: projectTech[0] || targetRole,
        topic: "System Architecture & Data Modeling",
        priority: "High",
        reason: `Demonstrates full-lifecycle ownership of technical requirements for ${targetRole}.`,
        type: "project",
        category: "project",
        difficulty: "Advanced",
        estimatedHours: 14,
        estimatedTime: "14 hours",
        description: `Architect and construct a deployed application or system showcasing ${projectTech.join(", ")} with error handling and documentation.`,
        linkText: "GitHub Project Template & Spec",
        completed: false,
      },
      {
        id: `task-p3-2`,
        title: `Production Deployment & README Documentation`,
        skill: "Git & Deployment",
        topic: "CI/CD & Documentation",
        priority: "Medium",
        reason: "Recruiters and hiring managers review deployed live links and GitHub README clarity.",
        type: "project",
        category: "project",
        difficulty: "Intermediate",
        estimatedHours: 6,
        estimatedTime: "6 hours",
        description: "Deploy to a cloud provider with live demo link and write a technical breakdown of architectural decisions.",
        linkText: "Deployment Documentation Guide",
        completed: false,
      },
    ],
  });

  // Phase 4: Role-Specific Assessment & Interview Preparation
  phases.push({
    phaseNumber: phaseNum++,
    title: `Role Technical Assessment & Hiring Bar Preparation`,
    durationWeeks: "Weeks 7-8",
    items: [
      {
        id: `task-p4-1`,
        title: `${targetRole} Technical Assessment Simulation`,
        skill: targetRole,
        topic: "Technical Screening & Problem Solving",
        priority: "High",
        reason: `Verify mastery of ${urgentGaps.slice(0, 2).join(" & ") || targetRole} under timed test conditions.`,
        type: "assessment",
        category: "coding",
        difficulty: "Advanced",
        estimatedHours: 4,
        estimatedTime: "4 hours",
        description: `Complete a comprehensive technical assessment covering core domain questions and live problem-solving for ${targetRole}.`,
        linkText: "PlacementOS Assessment Room",
        completed: false,
      },
      {
        id: `task-p4-2`,
        title: `STAR Technical Deep-Dive Interview Preparation`,
        skill: "Technical Communication",
        topic: "Architecture Defense & Behavioral Alignment",
        priority: "Medium",
        reason: "Equips student to defend architectural decisions made in capstone projects during technical rounds.",
        type: "interview",
        category: "interview",
        difficulty: "Intermediate",
        estimatedHours: 4,
        estimatedTime: "4 hours",
        description: "Practice answering deep-dive questions on trade-offs, scalability, and challenges faced during development.",
        linkText: "PlacementOS Mock Interview Studio",
        completed: false,
      },
    ],
  });

  let totalTasks = 0;
  phases.forEach((p) => {
    totalTasks += p.items.length;
  });

  const baseRoadmapId = `roadmap-${student.id}-${targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const companyName = job ? job.company : "Industry Standard";
  const jobId = job ? job.id : `role-${targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const roadmap: RoadmapDocument = {
    id: baseRoadmapId,
    userId: student.id,
    jobId,
    jobTitle: targetRole,
    companyName,
    selectedRole: targetRole,
    skillGap,
    overallProgress: 0,
    totalTasks,
    completedTasks: 0,
    phases,
    customGapsIdentified,
    recommendedProjects: [
      {
        title: `Enterprise-Grade ${targetRole} Showcase`,
        description: `End-to-end system utilizing ${projectTech.join(", ")}, built to production standards with comprehensive testing.`,
        techStack: projectTech,
        portfolioImpact: `Proves hands-on competence in ${projectTech.slice(0, 2).join(" & ")} sought by hiring managers.`,
      },
    ],
    codingPracticePlan: [
      {
        platform: "PlacementOS Practice / LeetCode",
        problemTitle: `${targetRole} Domain Benchmark Problem`,
        topic: projectTech[0] || targetRole,
        difficulty: "Medium",
        url: "https://leetcode.com",
      },
    ],
    generatedAt: timestamp,
    updatedAt: timestamp,
    isAiGenerated: false,
  };

  return { skillGap, roadmap };
}

export async function generateSkillGapAndRoadmap(
  student: UserDocument,
  targetRoleName?: string,
  job?: JobDocument
): Promise<{ skillGap: SkillGapAnalysis; roadmap: RoadmapDocument }> {
  const timestamp = new Date().toISOString();
  const targetRole =
    targetRoleName?.trim() ||
    student.selectedRole ||
    (job ? job.title : undefined) ||
    student.targetRoles?.[0] ||
    "Software Engineer";

  const declaredSkills = extractStudentDeclaredSkills(student);
  const standardRoleRequirements = getStandardRoleRequirements(targetRole, student.branch);
  const companyName = job ? job.company : "Industry Standard";
  const jobId = job ? job.id : `role-${targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const baseRoadmapId = `roadmap-${student.id}-${targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  const prompt = `You are an adaptive career learning planner for Placement OS.
Analyze the student's actual profile and the selected job role: "${targetRole}".

CRITICAL DIRECTIVES:
1. Role is the foundation: Formulate requirements and skill gaps specifically for "${targetRole}".
2. Strict truthfulness: Use ONLY the student's actual declared skills and levels. Do NOT assume skills based on their college branch (e.g. CSE does NOT automatically know Python; ECE does NOT automatically know Embedded C).
3. Resume policy: ${
    student.resumeText
      ? `Resume evidence available. Use extracted text for supporting evidence of projects/exposure, but do NOT silently elevate the student's declared skill level (e.g. if React is declared as Beginner, it remains Beginner).`
      : `Resume: Not Assessed (no resume uploaded). Do NOT invent any resume information.`
  }
4. Projects/Experience: ${
    student.projects && student.projects.length > 0
      ? `Student has built: ${student.projects.map((p) => `${p.title} (${p.techStack.join(", ")})`).join("; ")}. Acknowledge this practical exposure so they don't relearn from zero.`
      : `Projects: Not Provided. Do NOT invent projects.`
  }
5. No generic roadmaps: Do NOT output fixed syllabi (no generic DSA, Trees, Graphs, OS, DBMS unless specifically relevant to "${targetRole}" and identified as student gaps).
6. Meaningful progression: Generate actionable tasks (learn -> practice -> project -> assessment).
7. No fake completion: Every roadmap task MUST have "completed": false.

Student Profile:
- Name: ${student.fullName}
- Academic: ${student.course}, ${student.branch}, Semester ${student.semester}, CGPA ${student.cgpa}
- Declared Skills & Verified Levels:
${
  declaredSkills.length > 0
    ? declaredSkills.map((s) => `  • ${s.name} (Current Level: ${s.level})`).join("\n")
    : "  • No skills declared yet"
}
${student.resumeText ? `- Extracted Resume Context: ${student.resumeText.slice(0, 1500)}` : ""}

Target Job Role: ${targetRole}
${job ? `Target Company: ${job.company} (${job.badge})` : "Target Company: Industry Standard"}
Standard Role Requirements: ${standardRoleRequirements.join(", ")}

Perform the 3 stages:
STAGE 1: Role Requirement Analysis — identify required skills and expected levels for "${targetRole}".
STAGE 2: Student Skill Gap Analysis — categorize into:
  - "strong": current knowledge is sufficient for the role
  - "developing": has knowledge, needs more practice
  - "needsImprovement": current level is insufficient (e.g. Beginner for core role skill)
  - "missing": required skill not present in student's declared profile
  - "prioritySkills": array of { skill, currentLevel, requiredLevel, priority ('High'|'Medium'|'Low'), reason }
STAGE 3: Personalized Roadmap — 3 to 4 sequential phases focused PRIMARILY on the student's actual gaps for this role.
If the student already has strong skills, make the roadmap concise and focused only on the remaining gaps.

Output MUST be valid JSON adhering strictly to this schema:
{
  "skillGap": {
    "role": "${targetRole}",
    "strong": ["skill1"],
    "developing": ["skill2"],
    "needsImprovement": ["skill3"],
    "missing": ["skill4"],
    "prioritySkills": [
      {
        "skill": "skill_name",
        "currentLevel": "Beginner",
        "requiredLevel": "Intermediate",
        "priority": "High",
        "reason": "Clear explanation of why this gap matters for ${targetRole}."
      }
    ]
  },
  "customGapsIdentified": ["Gap summary 1", "Gap summary 2", "Gap summary 3"],
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Phase Title (e.g. React Architecture & State Management)",
      "durationWeeks": "Weeks 1-2",
      "items": [
        {
          "id": "p1-1",
          "title": "Actionable task title",
          "skill": "React",
          "topic": "State and Component Lifecycle",
          "priority": "High",
          "reason": "Why this task is needed for the student",
          "type": "learn",
          "category": "topic",
          "difficulty": "Intermediate",
          "estimatedHours": 8,
          "estimatedTime": "8 hours",
          "description": "Concrete guidance on what to master",
          "linkText": "Recommended documentation or resource",
          "completed": false
        }
      ]
    }
  ],
  "recommendedProjects": [
    {
      "title": "Project Name tailored to ${targetRole}",
      "description": "Project overview bridging the student's tech gaps",
      "techStack": ["React", "TypeScript", "Tailwind CSS"],
      "portfolioImpact": "Why recruiters will value this"
    }
  ],
  "codingPracticePlan": [
    {
      "platform": "LeetCode / Platform Name",
      "problemTitle": "Problem Title",
      "topic": "Specific Topic",
      "difficulty": "Medium",
      "url": "https://leetcode.com"
    }
  ]
}`;

  try {
    const parsed = await generateGeminiJson<any>(prompt);
    if (
      parsed &&
      parsed.skillGap &&
      parsed.phases &&
      Array.isArray(parsed.phases) &&
      parsed.phases.length > 0
    ) {
      // Ensure all tasks have proper IDs and completed: false
      let totalTasks = 0;
      parsed.phases.forEach((phase: any, pIdx: number) => {
        if (Array.isArray(phase.items)) {
          phase.items.forEach((item: any, iIdx: number) => {
            if (!item.id) item.id = `task-p${pIdx + 1}-${iIdx + 1}`;
            item.completed = false; // Strictly enforce no fake completion
            totalTasks++;
          });
        }
      });

      const skillGap: SkillGapAnalysis = {
        role: targetRole,
        strong: Array.isArray(parsed.skillGap.strong) ? parsed.skillGap.strong : [],
        developing: Array.isArray(parsed.skillGap.developing) ? parsed.skillGap.developing : [],
        needsImprovement: Array.isArray(parsed.skillGap.needsImprovement) ? parsed.skillGap.needsImprovement : [],
        missing: Array.isArray(parsed.skillGap.missing) ? parsed.skillGap.missing : [],
        prioritySkills: Array.isArray(parsed.skillGap.prioritySkills) ? parsed.skillGap.prioritySkills : [],
        analyzedAt: timestamp,
        isAiGenerated: true,
      };

      const roadmap: RoadmapDocument = {
        id: baseRoadmapId,
        userId: student.id,
        jobId,
        jobTitle: targetRole,
        companyName,
        selectedRole: targetRole,
        skillGap,
        overallProgress: 0,
        totalTasks,
        completedTasks: 0,
        phases: parsed.phases,
        customGapsIdentified: parsed.customGapsIdentified || [],
        recommendedProjects: parsed.recommendedProjects || [],
        codingPracticePlan: parsed.codingPracticePlan || [],
        generatedAt: timestamp,
        updatedAt: timestamp,
        isAiGenerated: true,
      };

      return { skillGap, roadmap };
    }
  } catch (err) {
    console.warn("Gemini roadmap generation failed, falling back to deterministic gap analysis:", err);
  }

  // Graceful deterministic fallback
  return generateDeterministicSkillGapAndRoadmap(student, targetRole, job);
}

export async function generatePersonalizedRoadmap(
  student: UserDocument,
  jobOrRole?: JobDocument | string
): Promise<RoadmapDocument> {
  const isJob = typeof jobOrRole === "object" && jobOrRole !== null && "id" in jobOrRole;
  const targetJob = isJob ? (jobOrRole as JobDocument) : undefined;
  const targetRole = typeof jobOrRole === "string" ? jobOrRole : targetJob ? targetJob.title : student.selectedRole;

  const { roadmap } = await generateSkillGapAndRoadmap(student, targetRole, targetJob);
  return roadmap;
}

export async function calculatePlacementReadiness(
  student: UserDocument,
  interviews: InterviewDocument[] = [],
  roadmaps: RoadmapDocument[] = []
): Promise<ReadinessScoreDocument> {
  // 1. Academics Score (0-100) - Assessed
  let academicsScore = Math.min(100, Math.round((student.cgpa / 10) * 100));
  if (student.backlogs > 0) {
    academicsScore = Math.max(30, academicsScore - student.backlogs * 12);
  }

  // 2. Technical Skills Score (0-100) - Only credit skills with confirmed explicit levels
  const confirmedSkills = (student.skillsWithLevels || []).filter(
    (s) => s && s.name && (s.level === "Advanced" || s.level === "Intermediate" || s.level === "Beginner")
  );
  
  let technicalSkillsScore = 30;
  if (confirmedSkills.length > 0) {
    let levelSum = 0;
    confirmedSkills.forEach((s) => {
      if (s.level === "Advanced") levelSum += 8;
      else if (s.level === "Intermediate") levelSum += 5;
      else if (s.level === "Beginner") levelSum += 2;
    });
    technicalSkillsScore = Math.min(98, Math.max(35, 30 + levelSum));
  } else {
    // Unconfirmed skills do not receive credit
    technicalSkillsScore = 25;
  }

  // 3. Projects Score (0-100) - Assessed
  let projectsScore = 50;
  if (student.projects && student.projects.length > 0) {
    projectsScore = Math.min(96, 60 + student.projects.length * 12);
    const hasLiveOrGithub = student.projects.some(p => p.githubUrl || p.liveUrl);
    if (hasLiveOrGithub) projectsScore = Math.min(98, projectsScore + 8);
  } else if (student.resumeText) {
    const textLower = student.resumeText.toLowerCase();
    if (textLower.includes("project") || textLower.includes("github") || textLower.includes("deployed")) {
      projectsScore += 20;
    }
  }
  const completedProjectItems = roadmaps.flatMap(r => r.phases).flatMap(p => p.items).filter(i => i.category === 'project' && i.completed).length;
  projectsScore = Math.min(98, projectsScore + completedProjectItems * 8);

  // 4. Resume Assessment
  const resumeAssessed = !!(student.resumeUploadedAt || (student.resumeText && student.resumeText.length > 50));
  let resumeScore: number | null = null;
  if (resumeAssessed) {
    resumeScore = 70;
    if (student.resumeText && student.resumeText.length > 400) resumeScore += 14;
    if (confirmedSkills.length >= 5) resumeScore += 8;
    resumeScore = Math.min(95, resumeScore);
  }

  // 5. Communication Assessment (requires verified evaluated mock interview completion)
  const evaluatedInterviews = interviews.filter(
    (inv) => inv.scoreAssessed === true && typeof inv.overallScore === "number" && inv.overallScore > 0
  );
  const communicationAssessed = evaluatedInterviews.length > 0;
  let communicationScore: number | null = null;
  if (communicationAssessed) {
    const avgComm = evaluatedInterviews.reduce((sum, inv) => sum + (inv.subScores?.communicationClarity || 14), 0) / evaluatedInterviews.length;
    communicationScore = Math.min(98, Math.round((avgComm / 20) * 100));
  }

  // 6. Interview Readiness Assessment (requires verified evaluated mock interview completion)
  const interviewAssessed = evaluatedInterviews.length > 0;
  let interviewReadinessScore: number | null = null;
  if (interviewAssessed) {
    const latestScore = evaluatedInterviews[0].overallScore as number;
    interviewReadinessScore = Math.min(100, Math.round(latestScore));
  }

  // Calculate Weighted Overall Placement Readiness Score across ASSESSED pillars only
  let totalAssessedWeight = 0;
  let weightedScoreSum = 0;

  // Academics weight: 0.25
  weightedScoreSum += academicsScore * 0.25;
  totalAssessedWeight += 0.25;

  // Technical Skills weight: 0.35
  weightedScoreSum += technicalSkillsScore * 0.35;
  totalAssessedWeight += 0.35;

  // Projects weight: 0.20
  weightedScoreSum += projectsScore * 0.20;
  totalAssessedWeight += 0.20;

  if (resumeAssessed && resumeScore !== null) {
    weightedScoreSum += resumeScore * 0.10;
    totalAssessedWeight += 0.10;
  }

  if (communicationAssessed && communicationScore !== null) {
    weightedScoreSum += communicationScore * 0.05;
    totalAssessedWeight += 0.05;
  }

  if (interviewAssessed && interviewReadinessScore !== null) {
    weightedScoreSum += interviewReadinessScore * 0.05;
    totalAssessedWeight += 0.05;
  }

  const overallScore = Math.round(weightedScoreSum / totalAssessedWeight);

  // Clearly labeled AI estimate indicator
  const jobReadinessPercentage = Math.min(96, Math.max(30, Math.round(overallScore * 0.96)));

  const skillsCount = confirmedSkills.length;
  const skillsLower = confirmedSkills.map(s => s.name.toLowerCase());
  const hasDsa = skillsLower.some(s => s.includes("dsa") || s.includes("algorithm") || s.includes("data structure"));

  let rationale = {
    academicsNote: `CGPA ${student.cgpa} with ${student.backlogs} backlogs. ${student.cgpa >= 8.0 ? 'Strong academic eligibility for Tier-1 companies.' : 'Meets general cutoff for campus recruiters.'}`,
    skillsNote: `Stated ${skillsCount} confirmed competencies across ${student.branch}. ${hasDsa ? 'Good foundation in Data Structures.' : 'Prioritize Core DSA & problem solving.'}`,
    resumeNote: resumeAssessed ? 'Resume uploaded and scanned for keywords and formatting.' : 'Not Assessed — Upload your resume (PDF/DOCX) to evaluate ATS score and structural suggestions.',
    projectsNote: student.projects && student.projects.length > 0 ? `${student.projects.length} verified project(s) added.` : 'Evaluated from coursework. Add hands-on projects to strengthen portfolio.',
    communicationNote: communicationAssessed ? `Evaluated from ${evaluatedInterviews.length} live mock interview session(s).` : 'Not Assessed — Complete an AI Mock Interview to benchmark spoken articulation.',
    interviewNote: interviewAssessed ? `Latest mock interview score: ${interviewReadinessScore}/100.` : 'Not Assessed — Practice in Mock Interview Room to assess technical bar-raiser readiness.',
  };

  let topStrengths = [
    academicsScore >= 75 ? `Solid academic track record (CGPA ${student.cgpa})` : "Coursework completion in progress",
    technicalSkillsScore >= 70 ? `Strong proficiency in ${confirmedSkills.slice(0, 2).map(s => s.name).join(" & ") || "core technical subjects"}` : "Foundational engineering knowledge",
    resumeAssessed ? "Structured resume profile parsed" : (student.projects && student.projects.length > 0 ? "Hands-on projects documented" : "Clear career aspiration"),
  ];

  let urgentActionItems = [
    !interviewAssessed ? "Take an AI Mock Interview to benchmark your interview readiness" : "Review mock interview feedback and practice STAR behavioral stories",
    !resumeAssessed ? "Upload your resume (PDF/DOCX) for automated ATS screening" : "Add quantifiable metrics to project outcomes",
    !hasDsa ? "Practice fundamental Data Structures & Algorithms" : "Explore system architecture and design patterns",
  ];

  return {
    id: `score-${student.id}-${Date.now()}`,
    userId: student.id,
    overallScore,
    jobReadinessPercentage,
    academicsScore,
    technicalSkillsScore,
    resumeScore,
    projectsScore,
    communicationScore,
    interviewReadinessScore,
    resumeAssessed,
    communicationAssessed,
    interviewAssessed,
    scoringRationale: rationale,
    topStrengths,
    urgentActionItems,
    calculatedAt: new Date().toISOString(),
  };
}

export async function generateStudentAiProfileAnalysis(
  student: UserDocument,
  options?: { skipAi?: boolean }
): Promise<AiProfileAnalysis> {
  const targetRole = student.careerPreferences?.careerGoal || student.targetRoles?.[0] || "Software Development Engineer";
  const preferredField = student.careerPreferences?.preferredField || "Software Engineering";
  const skillsList = (student.skillsWithLevels && student.skillsWithLevels.length > 0)
    ? student.skillsWithLevels.map(s => `${s.name} (${s.level})`).join(", ")
    : (student.skills || []).join(", ");
  
  const projectsList = (student.projects || []).map((p, idx) => 
    `${idx + 1}. ${p.title} [Tech: ${p.techStack.join(", ")}]: ${p.description}`
  ).join("\n");

  const expInfo = student.experience?.hasExperience
    ? `${student.experience.role || "Intern"} at ${student.experience.company || "Company"} (${student.experience.duration || "Period"}): ${student.experience.description || ""}`
    : "Fresher / No prior formal corporate internship";

  const resumeSnippet = student.resumeText ? student.resumeText.slice(0, 1000) : "No resume uploaded yet.";

  // Compute qualification-aware verified recommendations
  const engineRec = getCareerRecommendations({
    course: student.course,
    branch: student.branch,
    careerGoal: targetRole,
    preferredDomain: preferredField,
    skills: student.skills,
  });

  const prompt = `You are a Principal Campus Placement Director and Technical Recruiter in India.
Conduct an in-depth AI career analysis for this student:

CRITICAL QUALIFICATION CONSTRAINT:
- Qualification: ${student.course}
- Branch: ${student.branch}
- Target Career Goal: ${targetRole}
- PlacementOS RULE: NEVER treat Diploma, B.Tech, BCA, MCA, or B.Sc as interchangeable.
- Verified Roles for this student's exact qualification profile:
${engineRec.recommendedRoles.map(r => `* ${r.role} (CTC: ${r.expectedCtc}): ${r.qualificationNote}. Domain: ${r.domain}`).join("\n")}
${engineRec.eligibilityNotes.length > 0 ? `* Eligibility Notice: ${engineRec.eligibilityNotes.join("; ")}` : ""}

STUDENT PROFILE:
- Name: ${student.fullName}
- College: ${student.college}
- Degree/Course: ${student.course} in ${student.branch} (Semester ${student.semester})
- CGPA: ${student.cgpa}/10, Active Backlogs: ${student.backlogs}
- Target Career Goal: ${targetRole}
- Preferred Field / Domain: ${preferredField}
- Preferred Job Type: ${student.careerPreferences?.preferredJobType || "Both Internship & Full-time"}
- Stated Skills & Proficiency: ${skillsList || "None declared yet"}
- Projects Completed:
${projectsList || "None documented yet"}
- Work Experience: ${expInfo}
- Resume Status: ${student.resumeUploadedAt ? "Uploaded" : "Not uploaded"}
- Resume Context: ${resumeSnippet}

Generate an exhaustive, realistic, and actionable JSON career analysis matching this exact structure:
{
  "currentStrengths": [
    "strength 1 specific to their qualification (${student.course}) and skills",
    "strength 2",
    "strength 3",
    "strength 4"
  ],
  "skillGaps": [
    "identified skill gap 1 for target role ${targetRole}",
    "identified skill gap 2",
    "identified skill gap 3"
  ],
  "missingSkillsForTargetRoles": [
    "specific technology / tool 1 missing",
    "specific technology / tool 2 missing",
    "specific concept missing"
  ],
  "recommendedJobRoles": [
    {
      "title": "Role Title 1 (Must be qualification-appropriate for ${student.course})",
      "description": "Short 1-2 sentence description",
      "fitReason": "Why suitable based on ${student.course} in ${student.branch}",
      "expectedCtc": "₹X - Y LPA"
    },
    {
      "title": "Role Title 2",
      "description": "Short description",
      "fitReason": "Why suitable",
      "expectedCtc": "₹X - Y LPA"
    },
    {
      "title": "Role Title 3",
      "description": "Short description",
      "fitReason": "Why suitable",
      "expectedCtc": "₹X - Y LPA"
    }
  ],
  "recommendedLearningTopics": [
    {
      "topic": "Topic Name",
      "why": "Specific reason this is crucial for cracking ${targetRole} interviews",
      "priority": "Essential"
    },
    {
      "topic": "Topic Name 2",
      "why": "Explanation",
      "priority": "High"
    },
    {
      "topic": "Topic Name 3",
      "why": "Explanation",
      "priority": "Medium"
    }
  ],
  "projectRecommendations": [
    {
      "title": "Project Title 1",
      "description": "Detailed impactful project description solving real problem",
      "techStack": ["Tech1", "Tech2", "Tech3"],
      "portfolioImpact": "How this project impresses recruiters during technical rounds"
    },
    {
      "title": "Project Title 2",
      "description": "Detailed project description",
      "techStack": ["Tech1", "Tech2"],
      "portfolioImpact": "Portfolio impact explanation"
    }
  ],
  "resumeImprovements": {
    "status": "${student.resumeUploadedAt ? "available" : "not_uploaded"}",
    "score": ${student.resumeUploadedAt ? "80" : "null"},
    "suggestions": [
      "${student.resumeUploadedAt ? "Suggestion 1" : "Upload your resume in PDF/DOCX to unlock instant ATS scoring and structural review"}",
      "${student.resumeUploadedAt ? "Suggestion 2" : "Ensure standard single-column format with quantified bullet points (e.g., 'Improved performance by 30%')"}"
    ],
    "atsTips": [
      "Include keywords from target job description: ${targetRole}",
      "Use strong action verbs like Designed, Implemented, Orchestrated, Optimized"
    ]
  },
  "interviewPrepAreas": [
    {
      "area": "Core Technical / Domain Area",
      "focus": "Specific focus points to practice",
      "sampleQuestion": "Sample question recruiters frequently ask"
    },
    {
      "area": "Practical Problem Solving",
      "focus": "Focus points",
      "sampleQuestion": "Sample question"
    },
    {
      "area": "Behavioral & Situational",
      "focus": "Focus points",
      "sampleQuestion": "Sample question"
    }
  ]
}`;

  let geminiResult: AiProfileAnalysis | null = null;
  if (!options?.skipAi) {
    try {
      geminiResult = await generateGeminiJson<AiProfileAnalysis>(prompt);
    } catch (aiErr: any) {
      console.warn("generateStudentAiProfileAnalysis error, applying verified engine fallback:", aiErr?.message);
    }
  }

  if (geminiResult && geminiResult.currentStrengths && geminiResult.currentStrengths.length > 0) {
    return {
      ...geminiResult,
      analyzedAt: new Date().toISOString(),
    };
  }

  // High-fidelity fallback powered directly by verified recommendation engine
  const fallbackRoles = engineRec.recommendedRoles.map((r) => ({
    title: r.role,
    description: `${r.domain} role. ${r.qualificationNote}`,
    fitReason: `${r.qualificationStatus} alignment for ${student.course} in ${student.branch}. ${r.fitReason}`.trim(),
    expectedCtc: r.expectedCtc,
  }));

  const recommendedTopics = (engineRec.recommendedSkills || []).slice(0, 3).map((skill, idx) => ({
    topic: skill,
    why: `Industry benchmark competence required for target profile in ${preferredField}.`,
    priority: (idx === 0 ? "Essential" : idx === 1 ? "High" : "Medium") as "Essential" | "High" | "Medium",
  }));

  return {
    currentStrengths: [
      `Solid academic foundation with ${student.cgpa} CGPA in ${student.course} (${student.branch})`,
      student.skills.length > 0 ? `Active familiarity with ${student.skills.slice(0, 3).join(", ")}` : "Clear career aspiration and committed technical focus",
      student.projects && student.projects.length > 0 ? `Practical project implementation experience (${student.projects.length} project(s))` : "Strong grasp of fundamental curriculum principles",
      student.backlogs === 0 ? "Clean academic record with zero active backlogs" : "Clear determination to clear pending subjects for campus drives",
    ],
    skillGaps: (engineRec.skillGaps && engineRec.skillGaps.length > 0) ? engineRec.skillGaps : [
      `Industry-standard tools and domain depth for ${targetRole}`,
      "Production deployment and real-world project verification",
      "Technical communication for recruiter rounds",
    ],
    missingSkillsForTargetRoles: engineRec.recommendedSkills.slice(0, 4),
    recommendedJobRoles: fallbackRoles.length > 0 ? fallbackRoles : [
      {
        title: targetRole,
        description: `Core entry-level technical position aligned with your aspirations in ${preferredField}.`,
        fitReason: `Directly matches your stated preference and coursework in ${student.branch}.`,
        expectedCtc: "₹4 - 8 LPA",
      },
    ],
    recommendedLearningTopics: recommendedTopics.length > 0 ? recommendedTopics : [
      {
        topic: "Core Problem Solving & Domain Principles",
        why: "Frequently appears in Online Coding Assessments and Round 1 technical interviews.",
        priority: "Essential",
      },
      {
        topic: "Version Control & Project Delivery",
        why: "Essential for clearing technical grilling questions on efficiency and reliability.",
        priority: "High",
      },
      {
        topic: "STAR Technique for Behavioral Rounds",
        why: "Crucial for HR and leadership evaluation rounds to showcase team collaboration.",
        priority: "Medium",
      },
    ],
    projectRecommendations: [
      {
        title: `Industry-Aligned ${student.branch} Implementation Project`,
        description: `Practical capstone project modeling real-world technical requirements in ${preferredField}.`,
        techStack: engineRec.recommendedSkills.slice(0, 3),
        portfolioImpact: "Demonstrates hands-on engineering execution and readiness for campus selection rounds.",
      },
      {
        title: "Collaborative Technical Portfolio System",
        description: "Interactive application or prototype with clean documentation, testing, and Git versioning.",
        techStack: ["Git", ...engineRec.recommendedSkills.slice(0, 2)],
        portfolioImpact: "Proves front-to-back delivery mastery with verifiable code quality.",
      },
    ],
    resumeImprovements: {
      status: student.resumeUploadedAt ? "available" : "not_uploaded",
      score: student.resumeUploadedAt ? 78 : undefined,
      suggestions: student.resumeUploadedAt ? [
        "Include live URLs or GitHub repository links for each listed project.",
        "Begin every project bullet point with strong action verbs (Architected, Engineered, Supervised, Optimized).",
        "Quantify outcomes (e.g. 'reduced latency by 25%' or 'verified 150+ concrete test cubes').",
      ] : [
        "Upload your resume in PDF/DOCX format to receive automated ATS scoring and section-by-section analysis.",
        "Keep resume strictly to 1 page with standard font sizing (10-12pt) for campus placement drives.",
      ],
      atsTips: [
        `Ensure core keywords match target role: ${targetRole}`,
        "Avoid using graphical progress bars for skills as ATS parsers fail on visual graphics.",
      ],
    },
    interviewPrepAreas: [
      {
        area: "Core Technical Competency",
        focus: "Domain concepts, fundamentals, and edge-case handling",
        sampleQuestion: `Explain the fundamental working principle behind your primary project in ${student.branch}.`,
      },
      {
        area: "Practical Hands-on Evaluation",
        focus: "Trade-offs between different techniques or materials chosen in your projects",
        sampleQuestion: "Why did you choose your specific tooling over alternatives? What bottlenecks did you encounter?",
      },
      {
        area: "Situational & Behavioral Alignment",
        focus: "Handling tight deadlines, conflict in group projects, and learning new tools quickly",
        sampleQuestion: "Tell me about a time an error occurred in testing and how you systematically diagnosed it.",
      },
    ],
    analyzedAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------
// FEATURE 3: REAL-TIME ADAPTIVE AI MOCK INTERVIEW & ADAPTIVE ROADMAP
// ----------------------------------------------------

export function buildStudentInterviewContext(
  student: UserDocument,
  targetRole: string,
  roadmap?: RoadmapDocument,
  skillGap?: SkillGapAnalysis
) {
  // 1. Stated skills + skill levels
  let skillsContext = "";
  if (student.skillsWithLevels && student.skillsWithLevels.length > 0) {
    skillsContext = student.skillsWithLevels.map(s => `${s.name || (s as any).skill} (${s.level})`).join(", ");
  } else if (student.skills && student.skills.length > 0) {
    skillsContext = student.skills.join(", ");
  } else {
    skillsContext = "None explicitly declared";
  }

  // 2. Skill gaps & priority skills
  let gapsContext = "";
  if (skillGap) {
    gapsContext = `
- Strong Skills: ${skillGap.strong.length > 0 ? skillGap.strong.join(", ") : "None yet verified"}
- Developing Skills: ${skillGap.developing.length > 0 ? skillGap.developing.join(", ") : "None"}
- Needs Improvement: ${skillGap.needsImprovement.length > 0 ? skillGap.needsImprovement.join(", ") : "None"}
- Missing Role Requirements: ${skillGap.missing.length > 0 ? skillGap.missing.join(", ") : "None"}
- Priority Focus Areas: ${skillGap.prioritySkills.map(p => `${p.skill} [${p.currentLevel} -> ${p.requiredLevel}, Priority: ${p.priority}]`).join("; ")}`;
  } else {
    gapsContext = "Skill gap analysis pending";
  }

  // 3. Projects
  let projectsContext = "Projects: Not Provided";
  if (student.projects && student.projects.length > 0) {
    projectsContext = student.projects.map((p, idx) => 
      `Project ${idx + 1}: "${p.title}" - Tech Stack: ${p.techStack.join(", ")}. Description: ${p.description || "No description provided."}`
    ).join("\n");
  }

  // 4. Experience
  let experienceContext = "Experience: Fresher / Not Provided";
  if (student.experience && (student.experience.role || student.experience.company)) {
    experienceContext = `${student.experience.role || "Intern"} at ${student.experience.company || "Organization"} (${student.experience.duration || "N/A"}). ${student.experience.description || ""}`;
  }

  // 5. Resume
  let resumeContext = "Resume: Not Assessed";
  if (student.resumeText && student.resumeText.length > 40) {
    resumeContext = student.resumeText.slice(0, 600);
  }

  // 6. Roadmap
  let roadmapContext = "Roadmap: Not yet generated";
  if (roadmap && roadmap.phases && roadmap.phases.length > 0) {
    roadmapContext = roadmap.phases.map(p => 
      `Phase ${p.phaseNumber} (${p.title}): ` + p.items.map(i => `${i.title} [Priority: ${i.priority || "Medium"}${i.completed ? " - Completed" : ""}]`).join("; ")
    ).join("\n");
  }

  const candidateSummary = `
Candidate Name: ${student.fullName}
Degree / Branch: ${student.course} in ${student.branch} (Semester ${student.semester}, CGPA ${student.cgpa})
Target Role: ${targetRole}
Stated Skills & Proficiency: ${skillsContext}
Identified Skill Gaps for ${targetRole}:
${gapsContext}
Projects:
${projectsContext}
Experience:
${experienceContext}
Resume Context:
${resumeContext}
Personalized Learning Roadmap:
${roadmapContext}
`;

  return { candidateSummary };
}

export async function generateInterviewGreetingAndFirstQuestion(
  student: UserDocument,
  targetRole: string,
  companyTarget: string = "",
  roadmap?: RoadmapDocument,
  skillGap?: SkillGapAnalysis
): Promise<{
  interviewerIntro: string;
  firstQuestion: {
    questionNumber: number;
    category: string;
    question: string;
    skill: string;
    topic: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    whatInterviewerIsLookingFor: string;
    timeLimitSeconds: number;
  };
  targetRole: string;
}> {
  const { candidateSummary } = buildStudentInterviewContext(student, targetRole, roadmap, skillGap);

  const prompt = `You are Dr. Maya Ramanathan, an Executive Technical Bar Raiser conducting an interactive on-campus placement mock interview for the role of "${targetRole}".

Candidate Profile & Academic/Skill Context:
${candidateSummary}

OBJECTIVES:
1. Provide a brief, warm yet professional spoken introduction (1-2 sentences) welcoming the candidate and framing the ${targetRole} interview. Keep it concise.
2. Formulate the FIRST interview question. It must be strictly role-specific and tailored to their profile:
   - For a software/frontend engineer with projects, open by asking them to introduce their most technically demanding project and its architecture.
   - For an embedded/hardware engineer, ask about their microcontroller/firmware hands-on experience or memory constraints.
   - For a role where they have priority skill gaps, pick a foundational question on one of their priority skills or stated core skills.
   - Ground it strictly in their declared engineering skills or projects.

Output strictly in JSON matching this exact structure:
{
  "intro": "Welcome, ${student.fullName}! I'm looking forward to our technical conversation today for the ${targetRole} position. Let's begin by discussing your hands-on technical work.",
  "firstQuestion": {
    "questionNumber": 1,
    "category": "Project Deep-Dive",
    "question": "Walk me through the architecture of the most technically demanding project you have built. What technical tradeoffs did you make, and how did you test its reliability?",
    "skill": "System Architecture",
    "topic": "Project Architecture & Tradeoffs",
    "difficulty": "Intermediate",
    "whatInterviewerIsLookingFor": "Clarity of design decisions, ownership of technical components, awareness of limitations.",
    "timeLimitSeconds": 120
  }
}`;

  const parsed = await generateGeminiJson<{
    intro: string;
    firstQuestion: {
      questionNumber: number;
      category: string;
      question: string;
      skill: string;
      topic: string;
      difficulty: "Beginner" | "Intermediate" | "Advanced";
      whatInterviewerIsLookingFor: string;
      timeLimitSeconds: number;
    };
  }>(prompt);

  if (parsed && parsed.firstQuestion && parsed.firstQuestion.question) {
    return {
      interviewerIntro: parsed.intro || `Hello ${student.fullName}! Welcome to your technical mock interview for the ${targetRole} position. Let's dive straight in.`,
      firstQuestion: {
        questionNumber: 1,
        category: parsed.firstQuestion.category || "Project Deep-Dive",
        question: parsed.firstQuestion.question,
        skill: parsed.firstQuestion.skill || "Core Engineering",
        topic: parsed.firstQuestion.topic || "Architecture",
        difficulty: parsed.firstQuestion.difficulty || "Intermediate",
        whatInterviewerIsLookingFor: parsed.firstQuestion.whatInterviewerIsLookingFor || "Engineering clarity and ownership.",
        timeLimitSeconds: parsed.firstQuestion.timeLimitSeconds || 120,
      },
      targetRole,
    };
  }

  // High quality role-grounded fallback
  const firstSkill = (student.skillsWithLevels?.[0]?.name) || "technical implementation";
  return {
    interviewerIntro: `Hello ${student.fullName}! Welcome to your technical mock interview for the ${targetRole} position. Let's get started with your practical experience.`,
    firstQuestion: {
      questionNumber: 1,
      category: student.projects && student.projects.length > 0 ? "Project Deep-Dive" : "Technical",
      question: student.projects && student.projects.length > 0
        ? `Hello ${student.fullName}! To start our ${targetRole} discussion, walk me through the architecture of your project "${student.projects[0].title}". What specific technical choices did you make, and what was the most difficult bottleneck you resolved?`
        : `Hello ${student.fullName}! For the ${targetRole} role, you've highlighted experience with ${firstSkill}. Can you explain how you have applied ${firstSkill} in practical coursework or lab assignments, and what foundational principles govern its performance?`,
      skill: firstSkill,
      topic: "Core Implementation",
      difficulty: "Intermediate",
      whatInterviewerIsLookingFor: "Architectural reasoning, problem-solving mindset, and concrete technical depth.",
      timeLimitSeconds: 120,
    },
    targetRole,
  };
}

export async function evaluateAnswerAndGenerateNextQuestion(
  student: UserDocument,
  targetRole: string,
  previousQuestions: {
    questionNumber: number;
    category: string;
    question: string;
    skill?: string;
    topic?: string;
    difficulty?: string;
  }[],
  previousAnswers: {
    questionNumber: number;
    question: string;
    category: string;
    studentAnswer: string;
  }[],
  latestAnswer: string,
  roadmap?: RoadmapDocument,
  skillGap?: SkillGapAnalysis
): Promise<{
  answerAssessment: {
    quality: "strong" | "good" | "partial" | "weak" | "silent";
    score: number;
    critique: string;
    strengths: string[];
    weaknesses: string[];
    detectedGap?: { skill: string; topic: string; priority: "High" | "Medium" | "Low"; reason: string };
  };
  interviewerRemark?: string;
  nextQuestion?: {
    questionNumber: number;
    category: string;
    question: string;
    skill: string;
    topic: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    whatInterviewerIsLookingFor: string;
    timeLimitSeconds: number;
  };
  continueInterview: boolean;
}> {
  const currentTurn = previousQuestions.length;
  const currentQuestion = previousQuestions[previousQuestions.length - 1];
  const { candidateSummary } = buildStudentInterviewContext(student, targetRole, roadmap, skillGap);

  // Phase 3 Rule: Adaptive interview of 8–12 meaningful turns (no fixed 7-turn stopping logic).
  const isMaxTurnsReached = currentTurn >= 12;

  const conversationTranscript = previousQuestions.map((q, idx) => {
    const matchedAnswer = previousAnswers.find(a => a.questionNumber === q.questionNumber);
    const ansText = (idx === previousQuestions.length - 1)
      ? latestAnswer
      : (matchedAnswer ? matchedAnswer.studentAnswer : "(No answer recorded)");
    return `[Turn ${q.questionNumber} - ${q.category} (${q.difficulty || "Intermediate"})]
Interviewer: "${q.question}"
Candidate Answer: "${ansText || "(Silence / No verbal answer)"}"`;
  }).join("\n\n");

  const prompt = `You are Dr. Maya Ramanathan, an Executive Technical Bar Raiser conducting an interactive mock placement interview for the role of "${targetRole}".

Candidate Profile & Target Role:
${candidateSummary}

Full Conversation Transcript So Far:
${conversationTranscript}

Current Turn: ${currentTurn}
The candidate just answered Question ${currentTurn} (${currentQuestion?.category || "Technical"}):
"${latestAnswer || "(Blank / Silence)"}"

CRITICAL INSTRUCTIONS FOR REAL-TIME INTERACTIVE INTERVIEW (Phase 3 Adaptive Model):
1. Objectively evaluate the candidate's latest answer:
   - quality: "strong" | "good" | "partial" | "weak" | "silent"
   - score: 0 to 20
   - critique: 1-2 constructive sentences on technical accuracy, depth, and communication.
   - strengths: 1-2 bullet points.
   - weaknesses: 1-2 bullet points.
   - detectedGap: If the candidate struggled, had misconceptions, or lacked depth on a core skill/topic, specify it in:
     { "skill": "...", "topic": "...", "priority": "High" | "Medium" | "Low", "reason": "..." } (or null if answer was strong).

2. Decide if the interview should continue (8 to 12 meaningful turns):
   - If currentTurn < 8: continueInterview MUST be true.
   - If currentTurn >= 12: continueInterview MUST be false.
   - If 8 <= currentTurn < 12: continueInterview should only become false if the candidate has been thoroughly evaluated across Technical Depth, Architecture/Design, Algorithmic/Problem-Solving, Priority Skill Gaps, and Behavioral alignment for ${targetRole}.

3. Formulate the NEXT question (Question ${currentTurn + 1}) if continueInterview is true:
   - Follow-up behavior: If the previous answer was incomplete, superficial, or had logical gaps, ask a sharp technical follow-up drill down on that topic.
   - Progression: Probe priority skill gaps identified for "${targetRole}", real-world tradeoffs, debugging scenarios, and scale considerations.
   - Ground all questions in the role "${targetRole}".

Output strictly JSON:
{
  "answerAssessment": {
    "quality": "good",
    "score": 15,
    "critique": "Solid conceptual explanation of components, though could have expanded on reconciliation performance.",
    "strengths": ["Clear communication", "Understands basic flow"],
    "weaknesses": ["Omitted edge case handling"],
    "detectedGap": {
      "skill": "React",
      "topic": "State Reconciliation",
      "priority": "High",
      "reason": "Candidate struggled to explain how virtual DOM reconciliation behaves with complex lists."
    }
  },
  "interviewerRemark": "That gives me a good sense of your component structure. Let's move to data flow and API integration.",
  "continueInterview": ${!isMaxTurnsReached},
  "nextQuestion": {
    "questionNumber": ${currentTurn + 1},
    "category": "Problem-Solving",
    "question": "How would you handle optimistic UI updates when a network request might fail halfway through?",
    "skill": "Web APIs",
    "topic": "Error Handling & Optimistic Updates",
    "difficulty": "Intermediate",
    "whatInterviewerIsLookingFor": "Understanding of rollback strategies, user feedback, and asynchronous state.",
    "timeLimitSeconds": 120
  }
}`;

  const parsed = await generateGeminiJson<any>(prompt);
  if (parsed && parsed.answerAssessment) {
    const continueInterview = isMaxTurnsReached
      ? false
      : currentTurn < 8
      ? true
      : Boolean(parsed.continueInterview);

    return {
      answerAssessment: {
        quality: parsed.answerAssessment.quality || "good",
        score: typeof parsed.answerAssessment.score === "number" ? parsed.answerAssessment.score : 14,
        critique: parsed.answerAssessment.critique || "Answer evaluated for technical accuracy and relevance.",
        strengths: parsed.answerAssessment.strengths || ["Answered promptly"],
        weaknesses: parsed.answerAssessment.weaknesses || [],
        detectedGap: parsed.answerAssessment.detectedGap || undefined,
      },
      interviewerRemark: parsed.interviewerRemark,
      continueInterview,
      nextQuestion: continueInterview && parsed.nextQuestion ? {
        questionNumber: currentTurn + 1,
        category: parsed.nextQuestion.category || "Technical",
        question: parsed.nextQuestion.question,
        skill: parsed.nextQuestion.skill || targetRole,
        topic: parsed.nextQuestion.topic || "Engineering Concept",
        difficulty: parsed.nextQuestion.difficulty || "Intermediate",
        whatInterviewerIsLookingFor: parsed.nextQuestion.whatInterviewerIsLookingFor || "Deep conceptual grasp and trade-off analysis.",
        timeLimitSeconds: parsed.nextQuestion.timeLimitSeconds || 120,
      } : undefined,
    };
  }

  // Dynamic algorithmic fallback if Gemini generation is temporarily unavailable
  const ansLen = (latestAnswer || "").trim().length;
  const quality = ansLen === 0 ? "silent" : ansLen < 25 ? "weak" : ansLen < 80 ? "partial" : "good";
  const fallbackScore = ansLen === 0 ? 0 : ansLen < 25 ? 6 : ansLen < 80 ? 12 : 16;
  const shouldContinue = currentTurn < 8;

  const categories = ["Technical", "DSA / Problem-Solving", "System Architecture", "Role-Specific Practical", "Behavioral"];
  const nextCat = categories[currentTurn % categories.length];

  return {
    answerAssessment: {
      quality,
      score: fallbackScore,
      critique: ansLen === 0
        ? "No answer was recorded for this question."
        : "Answer provided. Elaborate with deeper architectural details and concrete engineering tradeoffs.",
      strengths: ansLen > 50 ? ["Articulated core concept"] : [],
      weaknesses: ansLen < 50 ? ["Answer lacked depth and concrete implementation examples"] : [],
    },
    interviewerRemark: "Understood. Let's explore the next dimension of the role.",
    continueInterview: shouldContinue,
    nextQuestion: shouldContinue ? {
      questionNumber: currentTurn + 1,
      category: nextCat,
      question: `In the context of ${targetRole}, how do you evaluate edge cases, latency bottlenecks, and error handling when building a scalable feature?`,
      skill: targetRole,
      topic: "Reliability & Scalability",
      difficulty: "Intermediate",
      whatInterviewerIsLookingFor: "Failure recovery, performance optimization, and rigorous testing.",
      timeLimitSeconds: 120,
    } : undefined,
  };
}

export async function evaluateMockInterview(
  student: UserDocument,
  targetRole: string,
  companyTarget: string = "",
  answers: { questionNumber: number; question: string; category: string; studentAnswer: string }[],
  transcript?: { speaker: "interviewer" | "student"; text: string; timestamp: string }[]
): Promise<{ report: InterviewDocument; evaluationSuccess: boolean }> {
  const timestamp = new Date().toISOString();
  const id = `interview-${student.id}-${Date.now()}`;

  // Check if candidate provided sufficient verbal or written technical evidence
  const validAnswers = answers.filter(
    (a) => a.studentAnswer && a.studentAnswer.trim().length > 15 && !a.studentAnswer.includes("Candidate remained silent")
  );

  const hasSufficientEvidence = validAnswers.length >= 2;

  const prompt = `You are Dr. Maya Ramanathan, an Executive Technical Bar Raiser evaluating a complete on-campus placement mock interview for the role of "${targetRole}".

Candidate: ${student.fullName}, Branch: ${student.branch}, Semester: ${student.semester}, CGPA: ${student.cgpa}
Target Role: ${targetRole}

Student's Full Interview Transcript:
${answers.map(a => `
[Q${a.questionNumber} - ${a.category}]
Question: ${a.question}
Candidate's Spoken Answer: "${a.studentAnswer || "(No answer recorded / blank)"}"
`).join("\n")}

STRICT BAR-RAISER EVALUATION RULES:
1. The evaluation and scores MUST be derived strictly from the actual answers given above.
2. If the candidate remained silent or gave answers with no technical substance, reflect that with truthful low scores and specific weaknesses. Do NOT invent fake positive traits.
3. If the candidate gave clear, technically sound answers, recognize their strengths with specific quotes or concepts they explained.
4. Calculate:
   - overallScore: An overall integer from 0 to 100 based on demonstrated competence.
   - subScores (each integer 0 to 20):
     * technicalKnowledge (0-20)
     * problemSolving (0-20)
     * communicationClarity (0-20)
     * confidencePacing (0-20)
     * roleAlignment (0-20)
   - questionReviews: For EACH question, provide:
     * score (0-20)
     * interviewerCritique (candid, professional feedback)
     * modelAnswerKey (what a top 1% engineer would articulate)
     * strengths (1-2 bullets)
     * improvements (1-2 bullets)
   - coreStrengths: 3 concrete strengths demonstrated in the transcript.
   - coreWeaknesses: 3 concrete technical, conceptual, or communication weaknesses demonstrated.
   - personalizedActionPlan: 4 high-impact, actionable steps before the next placement interview.
   - skillGapsDetected: Array of specific skill weaknesses or misconceptions observed during this interview:
     [
       {
         "skill": "...",
         "topic": "...",
         "priority": "High" | "Medium" | "Low",
         "reason": "..."
       }
     ]

Output strict JSON:
{
  "overallScore": 76,
  "subScores": {
    "technicalKnowledge": 16,
    "problemSolving": 15,
    "communicationClarity": 16,
    "confidencePacing": 14,
    "roleAlignment": 15
  },
  "questionReviews": [
    {
      "questionNumber": 1,
      "question": "...",
      "category": "Technical",
      "studentAnswer": "...",
      "score": 15,
      "interviewerCritique": "...",
      "modelAnswerKey": "...",
      "strengths": ["..."],
      "improvements": ["..."]
    }
  ],
  "coreStrengths": ["...", "...", "..."],
  "coreWeaknesses": ["...", "...", "..."],
  "personalizedActionPlan": ["...", "...", "...", "..."],
  "skillGapsDetected": [
    {
      "skill": "React",
      "topic": "State Management",
      "priority": "High",
      "reason": "Struggled to articulate re-render optimization with Context API"
    }
  ]
}`;

  if (hasSufficientEvidence) {
    const parsedEval = await generateGeminiJson<any>(prompt);
    if (parsedEval && typeof parsedEval.overallScore === "number") {
      const report: InterviewDocument = {
        id,
        userId: student.id,
        targetRole,
        companyTarget,
        overallScore: Math.min(100, Math.max(0, Math.round(parsedEval.overallScore))),
        scoreAssessed: true,
        subScores: parsedEval.subScores || {
          technicalKnowledge: 14,
          problemSolving: 14,
          communicationClarity: 14,
          confidencePacing: 14,
          roleAlignment: 14,
        },
        durationMinutes: Math.max(5, Math.round((answers.length * 2.5))),
        questionsCount: answers.length,
        questionReviews: parsedEval.questionReviews || [],
        coreWeaknesses: parsedEval.coreWeaknesses || ["Needs deeper exploration of edge cases and tradeoffs."],
        coreStrengths: parsedEval.coreStrengths || ["Professional demeanor and foundational awareness."],
        personalizedActionPlan: parsedEval.personalizedActionPlan || ["Practice 2-minute structured responses using the STAR method."],
        skillGapsDetected: parsedEval.skillGapsDetected || [],
        transcript: transcript || answers.flatMap(a => [
          { speaker: "interviewer" as const, text: a.question, timestamp: timestamp },
          { speaker: "student" as const, text: a.studentAnswer || "(No answer recorded)", timestamp: timestamp },
        ]),
        conductedAt: timestamp,
      };
      return { report, evaluationSuccess: true };
    }
  }

  // If live AI evaluation fails or insufficient evidence exists: Return "Not Assessed" (overallScore: null, scoreAssessed: false)
  const fallbackReport: InterviewDocument = {
    id,
    userId: student.id,
    targetRole,
    companyTarget,
    overallScore: null,
    scoreAssessed: false,
    subScores: {
      technicalKnowledge: 0,
      problemSolving: 0,
      communicationClarity: 0,
      confidencePacing: 0,
      roleAlignment: 0,
    },
    durationMinutes: Math.max(5, Math.round(answers.length * 2)),
    questionsCount: answers.length,
    questionReviews: answers.map(a => ({
      questionNumber: a.questionNumber,
      question: a.question,
      category: a.category as any,
      studentAnswer: a.studentAnswer || "(No answer recorded)",
      score: 0,
      interviewerCritique: hasSufficientEvidence 
        ? "Evaluation service temporarily unavailable for automated scoring." 
        : "Insufficient response provided to assess technical readiness.",
      modelAnswerKey: "Technical bar raisers expect clear architectural tradeoffs, precise vocabulary, and concrete examples.",
      strengths: [],
      improvements: ["Provide structured technical answers with concrete implementation details."],
    })),
    coreWeaknesses: [
      hasSufficientEvidence 
        ? "AI evaluation service was temporarily unavailable for automated scoring."
        : "Candidate did not provide enough substantive answers to calculate a reliable placement score.",
      "Transcript has been securely archived for student review.",
    ],
    coreStrengths: [
      "Engaged in technical mock interview practice.",
    ],
    personalizedActionPlan: [
      `Review core topics for ${targetRole}`,
      "Practice narrating architecture and problem solving aloud",
      "Retake the mock interview practice once ready to provide detailed answers",
    ],
    skillGapsDetected: [],
    transcript: transcript || answers.flatMap(a => [
      { speaker: "interviewer" as const, text: a.question, timestamp: timestamp },
      { speaker: "student" as const, text: a.studentAnswer || "(No answer recorded)", timestamp: timestamp },
    ]),
    conductedAt: timestamp,
  };

  return { report: fallbackReport, evaluationSuccess: false };
}

export function adaptRoadmapFromInterview(
  roadmap: RoadmapDocument,
  skillGapsDetected: {
    skill: string;
    topic: string;
    priority?: "High" | "Medium" | "Low";
    reason: string;
  }[] = []
): {
  updatedRoadmap: RoadmapDocument;
  changes: {
    type: "updated" | "added";
    skill: string;
    topic: string;
    previousPriority?: string;
    newPriority?: string;
    taskTitle: string;
    reason: string;
  }[];
} {
  const changes: {
    type: "updated" | "added";
    skill: string;
    topic: string;
    previousPriority?: string;
    newPriority?: string;
    taskTitle: string;
    reason: string;
  }[] = [];

  if (!roadmap || !roadmap.phases || !Array.isArray(roadmap.phases) || skillGapsDetected.length === 0) {
    return { updatedRoadmap: roadmap, changes };
  }

  for (const gap of skillGapsDetected) {
    const gapSkill = (gap.skill || "").trim();
    const gapTopic = (gap.topic || "").trim();
    if (!gapSkill && !gapTopic) continue;

    const gapSkillLower = gapSkill.toLowerCase();
    const gapTopicLower = gapTopic.toLowerCase();

    let matchedItem: RoadmapItem | null = null;

    // Search across all phases
    for (const phase of roadmap.phases) {
      for (const item of phase.items) {
        const itemSkillLower = (item.skill || "").toLowerCase();
        const itemTopicLower = (item.topic || "").toLowerCase();
        const itemTitleLower = item.title.toLowerCase();

        const matchBySkill = gapSkillLower && (itemSkillLower.includes(gapSkillLower) || gapSkillLower.includes(itemSkillLower));
        const matchByTopic = gapTopicLower && (itemTopicLower.includes(gapTopicLower) || itemTitleLower.includes(gapTopicLower));

        if (matchBySkill || matchByTopic) {
          matchedItem = item;
          break;
        }
      }
      if (matchedItem) break;
    }

    if (matchedItem) {
      // Existing task found!
      if (!matchedItem.completed) {
        // Do NOT duplicate. Update priority and reason if needed.
        const prevPriority = matchedItem.priority || "Medium";
        if (matchedItem.priority !== "High") {
          matchedItem.priority = "High";
          changes.push({
            type: "updated",
            skill: matchedItem.skill || gapSkill,
            topic: matchedItem.topic || gapTopic,
            previousPriority: prevPriority,
            newPriority: "High",
            taskTitle: matchedItem.title,
            reason: `Priority increased to High after mock interview: ${gap.reason || "Weakness detected in live technical evaluation."}`,
          });
        }
        matchedItem.source = "mock_interview";
        matchedItem.reason = `Updated after weakness detected in the latest AI mock interview: ${gap.reason || "Needs reinforcement based on interview performance."}`;
      } else {
        // Already completed! Keep completed true so student's progress is preserved.
        // Add a new targeted practice / refresher task in Phase 2 or Phase 3.
        const targetPhase = roadmap.phases.find(p => p.phaseNumber === 2) || roadmap.phases[0];
        const newTaskId = `task-interview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newTaskTitle = `Interview Refresher: ${gapTopic || gapSkill} Under Pressure`;
        const newTask: RoadmapItem = {
          id: newTaskId,
          title: newTaskTitle,
          category: "interview",
          description: `Targeted interview follow-up created after AI mock interview. Focus: ${gap.reason || "Review edge cases and oral technical explanation."}`,
          skill: gapSkill,
          topic: gapTopic || gapSkill,
          priority: "High",
          reason: "Added after weakness detected in the latest AI mock interview.",
          source: "mock_interview",
          type: "interview",
          difficulty: "Intermediate",
          estimatedHours: 4,
          estimatedTime: "4 hours",
          completed: false,
        };
        targetPhase.items.push(newTask);
        changes.push({
          type: "added",
          skill: gapSkill,
          topic: gapTopic || gapSkill,
          newPriority: "High",
          taskTitle: newTaskTitle,
          reason: `Added after weakness detected in latest AI mock interview: ${gap.reason || "Practice technical articulation under interview conditions."}`,
        });
      }
    } else {
      // Completely new skill/topic weakness detected in interview!
      const targetPhase = roadmap.phases.find(p => p.phaseNumber === 2) || roadmap.phases[0];
      const newTaskId = `task-interview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newTaskTitle = `Practice ${gapTopic || gapSkill}: Technical & Practical Implementation`;
      const newTask: RoadmapItem = {
        id: newTaskId,
        title: newTaskTitle,
        category: "practice",
        description: `Targeted practice task created following mock interview evaluation. Focus on: ${gap.reason || "Strengthening conceptual foundations and real-world application."}`,
        skill: gapSkill,
        topic: gapTopic || gapSkill,
        priority: gap.priority || "High",
        reason: "Added after weakness detected in the latest AI mock interview.",
        source: "mock_interview",
        type: "practice",
        difficulty: "Intermediate",
        estimatedHours: 6,
        estimatedTime: "6 hours",
        completed: false,
      };
      targetPhase.items.push(newTask);
      changes.push({
        type: "added",
        skill: gapSkill,
        topic: gapTopic || gapSkill,
        newPriority: newTask.priority,
        taskTitle: newTaskTitle,
        reason: `Added after weakness detected in latest AI mock interview: ${gap.reason || "Identified as a critical priority for role readiness."}`,
      });
    }
  }

  // Recalculate totals
  const allItems = roadmap.phases.flatMap(p => p.items);
  roadmap.totalTasks = allItems.length;
  roadmap.completedTasks = allItems.filter(i => i.completed).length;
  roadmap.overallProgress = roadmap.totalTasks > 0 ? Math.round((roadmap.completedTasks / roadmap.totalTasks) * 100) : 0;
  roadmap.updatedAt = new Date().toISOString();

  return { updatedRoadmap: roadmap, changes };
}

// Backwards compatibility helper
export async function generateInterviewQuestions(student: UserDocument, targetRole: string, companyTarget?: string) {
  const result = await generateInterviewGreetingAndFirstQuestion(student, targetRole, companyTarget);
  return [
    result.firstQuestion,
    {
      questionNumber: 2,
      category: "Technical",
      question: `For the role of ${targetRole}, can you explain the underlying memory or execution model of your primary programming language and how you avoid bottlenecks?`,
      whatInterviewerIsLookingFor: "Deep language internals, memory efficiency, and runtime complexity.",
      timeLimitSeconds: 120,
    },
    {
      questionNumber: 3,
      category: "DSA / Problem-Solving",
      question: `Suppose you need to design an in-memory auto-complete search service that returns the top 5 suggested queries in real time. Which data structure would you pick and what are its performance characteristics?`,
      whatInterviewerIsLookingFor: "Trie and min-heap implementation, time and space complexity.",
      timeLimitSeconds: 120,
    },
    {
      questionNumber: 4,
      category: "System Design",
      question: `How would you handle sudden database write bottlenecks during high-traffic placement registrations? Explain caching and asynchronous queuing strategies.`,
      whatInterviewerIsLookingFor: "Caching patterns, message queues, and horizontal partitioning.",
      timeLimitSeconds: 120,
    },
    {
      questionNumber: 5,
      category: "Behavioral",
      question: `Describe a situation during a college team project where team members had differing technical opinions or a deadline was at risk. How did you resolve it?`,
      whatInterviewerIsLookingFor: "STAR framework, interpersonal maturity, and technical leadership.",
      timeLimitSeconds: 120,
    },
  ];
}

export function suggestJobRolesForStudent(student: UserDocument, jobs: JobDocument[], limit: number = 4) {
  // Rank catalog jobs for this candidate with full qualification awareness
  const studentQual = normalizeQualification(student.course);
  const scored = jobs.map((job) => {
    const match = quickJobMatch(student, job);
    let category: "Eligible Entry-Level" | "Potential Role" | "Career Growth" = "Eligible Entry-Level";
    let categoryLabel = "Eligible Entry-Level Role";

    if (!match.isEligible) {
      if (match.eligibilityStatus === "Qualification Restricted") {
        category = "Career Growth";
        categoryLabel = "Career Growth / Future Role";
      } else {
        category = "Potential Role";
        categoryLabel = "Potential Role (Eligibility varies by employer)";
      }
    } else {
      const titleLower = job.title.toLowerCase();
      if (
        studentQual === "Diploma" &&
        (titleLower.includes("engineer") &&
          !titleLower.includes("junior") &&
          !titleLower.includes("trainee") &&
          !titleLower.includes("technician"))
      ) {
        category = "Career Growth";
        categoryLabel = "Career Growth / Future Role";
      } else if (
        titleLower.includes("junior engineer") ||
        job.badge?.toLowerCase().includes("potential") ||
        (studentQual === "BCA" && (titleLower.includes("full stack") || titleLower.includes("software engineer 1")))
      ) {
        category = "Potential Role";
        categoryLabel = "Potential Role (Eligibility varies by employer)";
      }
    }

    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      logoText: job.logoText,
      badge: job.badge,
      type: job.type,
      location: job.location,
      ctc: job.ctc,
      matchPercentage: match.matchPercentage,
      isEligible: match.isEligible,
      eligibilityStatus: match.eligibilityStatus,
      eligibilityReason: match.eligibilityReason,
      fitSummary: match.fitSummary,
      matchedSkills: match.matchedSkills,
      skillGaps: match.skillGaps,
      recruiterAdvice: match.recruiterAdvice,
      category,
      categoryLabel,
    };
  });

  // Sort prioritizing:
  // 1. Eligible Entry-Level roles first
  // 2. Potential roles next
  // 3. Career Growth roles last
  // Within category, highest match percentage descending
  const categoryRank: Record<string, number> = {
    "Eligible Entry-Level": 1,
    "Potential Role": 2,
    "Career Growth": 3,
  };

  scored.sort((a, b) => {
    const rankA = categoryRank[a.category] || 2;
    const rankB = categoryRank[b.category] || 2;
    if (rankA !== rankB) return rankA - rankB;
    return b.matchPercentage - a.matchPercentage;
  });

  return scored.slice(0, limit);
}

// ----------------------------------------------------------------------
// FEATURE 1: AI JOB ROLE RECOMMENDATION (GEMINI BACKEND ENGINE)
// ----------------------------------------------------------------------
export async function generateJobRoleRecommendations(
  student: UserDocument,
  options?: { skipAi?: boolean }
): Promise<StudentAiRecommendations> {
  const course = student.course || "B.Tech";
  const branch = student.branch || "Computer Science";
  const studentQual = normalizeQualification(course);
  const branchKey = normalizeBranchKey(branch);

  // 1. Explicitly selected skills with declared levels
  let declaredSkillsText = "None declared";
  const declaredSkillNames: string[] = [];

  if (student.skillsWithLevels && student.skillsWithLevels.length > 0) {
    declaredSkillsText = student.skillsWithLevels
      .map((s) => {
        declaredSkillNames.push(s.name.trim().toLowerCase());
        return `- ${s.name} (Proficiency Level: ${s.level})`;
      })
      .join("\n");
  } else if (student.skills && student.skills.length > 0) {
    declaredSkillsText = student.skills
      .map((s) => {
        declaredSkillNames.push(s.trim().toLowerCase());
        return `- ${s} (Proficiency Level: Intermediate)`;
      })
      .join("\n");
  }

  // 2. Projects
  let projectsText = "Projects: Not Provided";
  if (student.projects && student.projects.length > 0) {
    projectsText = student.projects
      .map((p) => `- ${p.title}: ${p.description} (Tech Stack: ${p.techStack.join(", ")})`)
      .join("\n");
  }

  // 3. Experience
  let experienceText = "Experience: Not Provided";
  if (student.experience?.hasExperience) {
    experienceText = `Company: ${student.experience.company || "Not Specified"}, Role: ${student.experience.role || "Intern"}, Duration: ${student.experience.duration || "Not Specified"}\nDescription: ${student.experience.description || "Practical work experience"}`;
  }

  // 4. Resume
  let resumeText = "Resume: Not Assessed";
  const hasResume = !!(student.resumeText && student.resumeText.trim().length > 0);
  if (hasResume) {
    resumeText = `Resume Context (Verified Upload):\n${student.resumeText!.trim().slice(0, 3000)}`;
  }

  // 5. Deterministic baseline reference for qualification alignment
  const verifiedEngine = getCareerRecommendations({
    course,
    branch,
    skills: student.skills || [],
    experienceLevel: student.experience?.hasExperience ? "Internship Experience" : "Fresher",
  });

  const prompt = `You are a career-role recommendation engine for college students in Placement OS.
Analyze the provided student profile.
Recommend 3 to 5 suitable JOB ROLES based ONLY on the information provided.

STRICT INSTRUCTIONS & CONSTRAINTS:
1. Do NOT assume the student has skills that are not explicitly present in their declared skills or verified resume text.
   - For example, if the student did not select Python, you MUST NOT treat Python as a known skill.
   - Honor the exact skill level declared (Beginner, Intermediate, Advanced) for every skill.
2. Consider:
   - Course and Qualification level (e.g., Diploma vs B.Tech / B.E. vs BCA / MCA)
   - Branch of Engineering / Study
   - Academic background, CGPA, and backlogs
   - Explicitly selected skills and their declared proficiency levels
   - Projects (if provided)
   - Experience / Internships (if provided)
   - Resume text (if provided)
3. Branch and course compatibility MUST strictly matter:
   - CSE / IT / Computer Applications: Recommend roles like Frontend Developer, Backend Developer, Full Stack Developer, Software Developer, QA/Test Engineer, Data Analyst, Technical Support Engineer, etc.
   - ECE / Electronics: Recommend roles like Embedded Systems Engineer, Electronics Engineer, Firmware Engineer, IoT Systems Engineer, Hardware Test Engineer, VLSI/PCB Draughtsman, etc.
   - Mechanical: Recommend roles like CAD/CAM Draughting Engineer, Quality Control Engineer, Maintenance Engineer, HVAC/Automotive Engineer, Production Engineer, etc.
   - Civil: Recommend roles like Site Engineer, Junior Civil Engineer, Quantity Estimation Engineer, Survey Engineer, Structural Draughtsman, etc.
   - Electrical: Recommend roles like Electrical Maintenance Engineer, Power Systems Engineer, Control Systems Engineer, PLC/Automation Engineer, etc.
   - Inter-branch restriction: Do NOT recommend unrelated tech/software roles to core engineering students (e.g. Civil or Mechanical) simply because they selected 1 generic skill. The student's complete academic background and branch must be respected.
   - Diploma qualification restriction: If the student is in a Diploma program, recommend realistic entry-level roles (e.g., Junior Engineer, Junior Developer, Technical Associate, Draughtsman).
4. Recommend JOB ROLES, NOT specific company openings or job listings.
   - Do NOT provide fake company names or specific salary promises.
   - Do NOT claim employment or placement is guaranteed.
   - Do NOT recommend a role only because it is popular.
5. Missing Data Handling:
   - If Resume is "Not Assessed", do NOT fabricate resume details or past experiences.
   - If Projects is "Not Provided", do NOT invent projects.
   - If Experience is "Not Provided", do NOT invent work experience.
6. Number of recommendations:
   - Recommend exactly 3 to 5 suitable job roles.
7. Match Indicator ("Profile Match"):
   - Calculate a realistic integer match score between 25 and 95 representing how closely the student's current declared profile, skills, and background match the requirements of the recommended role.
   - It represents "Profile Match" / "Skill/Profile Match" — NOT a probability of hiring or guaranteed placement.
   - Do not assign identical arbitrary scores across all roles.
8. Required output structure:
   Return valid JSON matching this exact structure:
{
  "recommendedRoles": [
    {
      "role": "Frontend Developer",
      "whyMatch": "The student has HTML, CSS and JavaScript experience and is studying a computer-related course.",
      "requiredSkills": ["HTML", "CSS", "JavaScript", "React"],
      "matchingSkills": ["HTML", "CSS", "JavaScript"],
      "missingSkills": ["React"],
      "eligibility": "Academic and branch background are compatible with this role.",
      "matchIndicator": 78
    }
  ]
}

STUDENT PROFILE TO ANALYZE:
- College: ${student.college || "Not Provided"}
- Course: ${course}
- Branch: ${branch}
- Current Semester: ${student.semester || 6}
- CGPA: ${student.cgpa !== undefined && student.cgpa !== null ? `${student.cgpa}/10` : "Not Provided"}
- Active Backlogs: ${student.backlogs ?? 0}
- Class 10th Marks: ${student.tenthMarks ? `${student.tenthMarks}%` : "Not Provided"}
- Class 12th Marks: ${student.twelfthMarks ? `${student.twelfthMarks}%` : "Not Provided"}

EXPLICITLY DECLARED SKILLS & LEVELS (Do not assume or invent unlisted skills):
${declaredSkillsText}

PROJECTS:
${projectsText}

WORK / INTERNSHIP EXPERIENCE:
${experienceText}

RESUME:
${resumeText}

QUALIFICATION BASELINE REFERENCE:
- Validated branch domain roles for this course/branch:
${verifiedEngine.recommendedRoles.slice(0, 5).map(r => `  * ${r.role} (${r.qualificationNote})`).join("\n")}
`;

  if (!options?.skipAi) {
    try {
      const rawResult = await generateGeminiJson<{ recommendedRoles: AiRecommendedJobRole[] }>(prompt);

      if (rawResult && Array.isArray(rawResult.recommendedRoles) && rawResult.recommendedRoles.length > 0) {
        // Step 10: Validation & Sanitization Layer
        const validatedRoles: AiRecommendedJobRole[] = [];
        const resumeLower = (student.resumeText || "").toLowerCase();

        for (const item of rawResult.recommendedRoles.slice(0, 5)) {
          if (!item.role || typeof item.role !== "string") continue;

          const roleTitle = item.role.trim();
          const requiredSkills = Array.isArray(item.requiredSkills)
            ? item.requiredSkills.map((s) => s.trim()).filter(Boolean)
            : [];

          // Validate matching skills strictly against declared skills or verified resume
          const rawMatching = Array.isArray(item.matchingSkills) ? item.matchingSkills : [];
          const rawMissing = Array.isArray(item.missingSkills) ? item.missingSkills : [];

          const verifiedMatching: string[] = [];
          const verifiedMissing = new Set<string>(rawMissing.map((s) => s.trim()).filter(Boolean));

          for (const mSkill of rawMatching) {
            const mLower = mSkill.trim().toLowerCase();
            const isDeclared = declaredSkillNames.some(
              (ds) => ds === mLower || ds.includes(mLower) || mLower.includes(ds)
            );
            const inResume = hasResume && resumeLower.includes(mLower);

            if (isDeclared || inResume) {
              verifiedMatching.push(mSkill.trim());
            } else {
              // Did not exist in student profile — move to missing skills
              verifiedMissing.add(mSkill.trim());
            }
          }

          // Compute realistic matchIndicator
          let indicator = Number(item.matchIndicator);
          if (isNaN(indicator) || indicator < 10 || indicator > 100) {
            const ratio = requiredSkills.length > 0 ? verifiedMatching.length / requiredSkills.length : 0.6;
            indicator = Math.round(35 + ratio * 55);
          }
          indicator = Math.min(95, Math.max(25, indicator));

          validatedRoles.push({
            role: roleTitle,
            whyMatch:
              item.whyMatch?.trim() ||
              `Matches your ${course} in ${branch} and verified technical competencies.`,
            requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Core Technical Competence"],
            matchingSkills: verifiedMatching,
            missingSkills: Array.from(verifiedMissing),
            eligibility:
              item.eligibility?.trim() ||
              `Academic course (${course}) and branch (${branch}) are compatible with this role.`,
            matchIndicator: indicator,
          });
        }

        if (validatedRoles.length >= 2) {
          return {
            studentId: student.id,
            generatedAt: new Date().toISOString(),
            isAiGenerated: true,
            recommendedRoles: validatedRoles.slice(0, 5),
          };
        }
      }
    } catch (aiErr) {
      console.warn("Gemini AI job role recommendation encountered an error, falling back to verified qualification engine:", aiErr);
    }
  }

  // Safe deterministic fallback (Clearly labeled as non-AI fallback)
  const studentSkillsLower = declaredSkillNames;
  const fallbackRoles: AiRecommendedJobRole[] = verifiedEngine.recommendedRoles.slice(0, 4).map((r) => {
    const roleReqs = r.requiredSkills || ["Domain Knowledge", "Technical Aptitude", "Problem Solving"];
    const matched = roleReqs.filter((req) =>
      studentSkillsLower.some((s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s))
    );
    const missing = roleReqs.filter(
      (req) => !studentSkillsLower.some((s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s))
    );
    const ratio = roleReqs.length > 0 ? matched.length / roleReqs.length : 0.5;
    const matchIndicator = Math.min(90, Math.max(30, Math.round(40 + ratio * 48)));

    return {
      role: r.role,
      whyMatch: `Based on your ${student.course || "program"} in ${student.branch || "engineering"}, this role aligns with your course syllabus and foundational competencies.`,
      requiredSkills: roleReqs.slice(0, 4),
      matchingSkills: matched.length > 0 ? matched : (student.skills || []).slice(0, 2),
      missingSkills: missing.length > 0 ? missing : ["Industry Standard Practices", "Tooling Proficiency"],
      eligibility: r.qualificationNote || `Compatible with ${student.course} in ${student.branch}`,
      matchIndicator,
    };
  });

  return {
    studentId: student.id,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false,
    recommendedRoles: fallbackRoles.length > 0 ? fallbackRoles : [
      {
        role: branchKey === "ece" ? "Embedded Systems Engineer" : branchKey === "ce" ? "Site Engineer" : branchKey === "me" ? "CAD Draughting Engineer" : "Software Developer",
        whyMatch: `Curated standard entry-level role matching ${course} in ${branch}.`,
        requiredSkills: ["Technical Fundamentals", "Domain Practical Skills", "Communication"],
        matchingSkills: (student.skills || []).slice(0, 2),
        missingSkills: ["Advanced Domain Certification"],
        eligibility: `Standard recruitment stream for ${course} graduates.`,
        matchIndicator: 65,
      }
    ],
  };
}

