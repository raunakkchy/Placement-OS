import {
  getCareerRecommendations,
  normalizeQualification,
  normalizeBranchKey,
  QualificationType,
  CareerRecommendationOutput,
} from "./careerRecommendationEngine";

export interface BranchSkillPreset {
  branchKey: string;
  branchName: string;
  defaultField: string;
  commonGoals: string[];
  growthGoals?: string[];
  suggestedSkills: string[];
  qualification?: QualificationType;
  eligibilityNotes?: string[];
  careerGoalAnalysis?: any;
  categorizedRoles?: {
    eligibleEntryLevelRoles: any[];
    potentialRoles: any[];
    careerGrowthRoles: any[];
  };
  careerPath?: any[];
  marketDemand?: any[];
  dataSources?: string[];
  recommendedRoles?: any[];
}

export const BRANCH_SKILL_PRESETS: Record<string, BranchSkillPreset> = {
  cse: {
    branchKey: "cse",
    branchName: "Computer Science & Engineering (CSE)",
    defaultField: "Software Engineering",
    commonGoals: [
      "Software Engineer",
      "Software Developer",
      "Full Stack Developer",
      "Backend Engineer",
      "Frontend Engineer",
      "DevOps & Cloud Engineer",
      "Data Analyst",
      "AI/ML Engineer",
      "Cybersecurity Analyst",
    ],
    suggestedSkills: [
      "C",
      "C++",
      "Java",
      "Python",
      "JavaScript",
      "HTML",
      "CSS",
      "React",
      "Node.js",
      "SQL",
      "MongoDB",
      "Git",
      "GitHub",
      "Data Structures & Algorithms",
      "Problem Solving",
      "TypeScript",
      "REST APIs",
      "Database Management Systems (DBMS)",
      "Operating Systems & Concurrency",
      "Computer Networks",
      "Docker Basics",
    ],
  },
  it: {
    branchKey: "it",
    branchName: "Information Technology (IT)",
    defaultField: "Information Technology & Web Systems",
    commonGoals: [
      "Software Engineer",
      "Full Stack Developer",
      "Cloud & DevOps Engineer",
      "Backend Developer",
      "Cybersecurity Analyst",
      "Data Analyst",
    ],
    suggestedSkills: [
      "Data Structures & Algorithms",
      "Java",
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js & Express",
      "SQL & Database Design",
      "Computer Networks",
      "Operating Systems",
      "Cloud Concepts (AWS/GCP)",
      "Git & GitHub",
      "REST APIs",
    ],
  },
  aiml: {
    branchKey: "aiml",
    branchName: "Artificial Intelligence & Machine Learning",
    defaultField: "Artificial Intelligence & Data Science",
    commonGoals: [
      "AI/ML Engineer",
      "Machine Learning Research Associate",
      "Data Scientist",
      "Computer Vision Engineer",
      "NLP Engineer",
      "Software Development Engineer",
    ],
    suggestedSkills: [
      "Python Programming",
      "Linear Algebra & Probability",
      "Machine Learning (Scikit-Learn)",
      "Deep Learning (PyTorch/TensorFlow)",
      "Data Structures & Algorithms",
      "SQL & Database Queries",
      "Pandas & NumPy",
      "Data Preprocessing & Feature Engineering",
      "Git & GitHub",
      "REST APIs (FastAPI/Flask)",
      "Model Evaluation & Metrics",
    ],
  },
  datascience: {
    branchKey: "datascience",
    branchName: "Data Science & Analytics",
    defaultField: "Data Engineering & Analytics",
    commonGoals: [
      "Data Analyst",
      "Data Engineer",
      "Business Intelligence Specialist",
      "Junior Data Scientist",
      "Analytics Consultant",
    ],
    suggestedSkills: [
      "Advanced SQL",
      "Python",
      "Pandas & NumPy",
      "Power BI or Tableau",
      "Data Warehousing Concepts",
      "Statistical Analysis & Hypothesis Testing",
      "Data Cleaning & Wrangling",
      "Machine Learning Fundamentals",
      "Git & GitHub",
      "Excel & Analytical Modeling",
    ],
  },
  ece: {
    branchKey: "ece",
    branchName: "Electronics & Communication Engineering",
    defaultField: "Embedded Systems & Electronics",
    commonGoals: [
      "Embedded Systems Engineer",
      "VLSI Design Engineer",
      "IoT Solutions Engineer",
      "Hardware Design Engineer",
      "Firmware Developer",
      "Software Engineer",
    ],
    suggestedSkills: [
      "Embedded C / C++",
      "Microcontrollers (ARM Cortex / STM32 / ESP32)",
      "Digital Electronics & Logic Design",
      "Verilog / VHDL Basics",
      "Communication Protocols (UART, SPI, I2C, CAN)",
      "PCB Design (KiCad / Altium)",
      "RTOS Fundamentals (FreeRTOS)",
      "Git & GitHub",
      "Linux for Embedded Systems",
      "Data Structures Basics",
    ],
  },
  ee: {
    branchKey: "ee",
    branchName: "Electrical Engineering",
    defaultField: "Power Systems & Electrical Infrastructure",
    commonGoals: [
      "Electrical Engineer",
      "Power Systems Engineer",
      "Electrical Design Engineer",
      "Control Systems Engineer",
      "Power Electronics Engineer",
      "EV Systems Engineer",
    ],
    suggestedSkills: [
      "Power Systems Analysis",
      "MATLAB / Simulink",
      "Power Electronics Fundamentals",
      "Protection & Switchgear Design",
      "AutoCAD Electrical",
      "PLC & SCADA Automation",
      "Motor Controls & Industrial Drives",
      "Single Line Diagrams (SLD)",
      "Electrical Safety Standards (IS/IEC)",
      "EV Battery & BMS Basics",
    ],
  },
  me: {
    branchKey: "me",
    branchName: "Mechanical Engineering",
    defaultField: "Mechanical Design & Manufacturing Systems",
    commonGoals: [
      "Mechanical Design Engineer",
      "Production Engineer",
      "Manufacturing Engineer",
      "Quality Engineer",
      "CAD/CAE Engineer",
      "Automotive Engineer",
    ],
    suggestedSkills: [
      "SolidWorks / CATIA 3D Modeling",
      "GD&T (Geometric Dimensioning & Tolerancing)",
      "Finite Element Analysis (ANSYS FEA)",
      "Design for Manufacturing & Assembly (DFMA)",
      "Manufacturing Processes & CNC/CAM",
      "Thermodynamics & Fluid Mechanics",
      "Robotics & Automation Basics",
      "APQP, PPAP & 7 QC Tools",
      "Engineering Drawing Reading",
      "Material Science & Metallurgy",
    ],
  },
  ce: {
    branchKey: "ce",
    branchName: "Civil Engineering",
    defaultField: "Structural & Infrastructure Engineering",
    commonGoals: [
      "Civil Engineer",
      "Site Engineer",
      "Planning Engineer",
      "Structural Design Engineer",
      "BIM Engineer",
      "Quantity Surveyor",
      "Geotechnical Engineer",
    ],
    suggestedSkills: [
      "Structural Analysis & Mechanics",
      "Reinforced Concrete Design (IS 456)",
      "Steel Structure Design (IS 800)",
      "AutoCAD Civil",
      "STAAD.Pro / ETABS",
      "Autodesk Revit (BIM)",
      "Surveying & Total Station / GIS",
      "Quantity Estimation & Costing",
      "Primavera P6 / MS Project",
      "Bar Bending Schedules (BBS)",
    ],
  },
  other: {
    branchKey: "other",
    branchName: "Engineering & Applied Technology",
    defaultField: "Technology & Engineering Systems",
    commonGoals: [
      "Software Development Engineer",
      "Associate Systems Engineer",
      "Data Analyst",
      "Technical Associate",
      "Operations Analyst",
    ],
    suggestedSkills: [
      "Problem Solving & Analytical Reasoning",
      "Python Programming",
      "SQL",
      "JavaScript & Web Basics",
      "Data Structures Fundamentals",
      "Git & GitHub",
      "Technical Documentation",
      "Data Analysis & Visualization",
    ],
  },
};

export const DIPLOMA_BRANCH_PRESETS: Record<string, { commonGoals: string[]; growthGoals: string[]; defaultField: string }> = {
  ece: {
    defaultField: "Electronics Testing & Hardware Support",
    commonGoals: [
      "Electronics Technician",
      "Electronics Testing Technician",
      "Telecom Technician",
      "Field Service Technician",
      "Electronics Production Technician",
      "Maintenance Technician (Electronics)",
      "Embedded Trainee",
      "Diploma Apprentice Trainee (ECE)",
    ],
    growthGoals: [
      "Electronics Engineer",
      "Embedded Systems Engineer",
      "Hardware Design Engineer",
      "VLSI Design Engineer",
      "Firmware Engineer",
      "IoT Solutions Architect",
    ],
  },
  ee: {
    defaultField: "Electrical Maintenance & Power Distribution",
    commonGoals: [
      "Maintenance Technician (Electrical)",
      "Electrical Testing & Quality Technician",
      "Substation Operator Trainee",
      "Diploma Apprentice Trainee (Electrical)",
      "Field Service Technician (Electrical)",
      "Switchgear & Control Panel Technician",
      "Junior Electrical Engineer",
    ],
    growthGoals: [
      "Electrical Engineer",
      "Power Systems Engineer",
      "Substation Design Engineer",
      "Automation & PLC Engineer",
      "EV Powertrain Engineer",
    ],
  },
  me: {
    defaultField: "Mechanical Production & Maintenance",
    commonGoals: [
      "Maintenance Technician (Mechanical)",
      "CNC Machine Operator & Programmer",
      "CAD Draughtsman (Mechanical)",
      "Quality Control & Inspection Technician",
      "Diploma Apprentice Trainee (Mechanical)",
      "HVAC & Refrigeration Technician",
      "Junior Mechanical Engineer",
    ],
    growthGoals: [
      "Mechanical Design Engineer",
      "Production Planning Engineer",
      "Quality Assurance Engineer",
      "R&D Mechanical Engineer",
      "Robotics & Automation Engineer",
    ],
  },
  ce: {
    defaultField: "Civil Site Supervision & Estimation",
    commonGoals: [
      "Civil Site Supervisor",
      "CAD Draughtsman (Civil)",
      "Land Survey Technician",
      "Quality & Material Testing Technician",
      "Diploma Apprentice Trainee (Civil)",
      "Billing & Estimation Assistant",
      "Junior Civil Engineer",
    ],
    growthGoals: [
      "Civil Project Engineer",
      "Structural Design Engineer",
      "BIM Coordinator",
      "Geotechnical Engineer",
      "Project Planning Manager",
    ],
  },
  cse: {
    defaultField: "IT Support & Web Development",
    commonGoals: [
      "Junior Web Developer",
      "Technical Support Associate",
      "IT Support / Helpdesk Technician",
      "Software Testing / QA Trainee",
      "Web Assistant / UI Trainee",
      "Diploma Apprentice Trainee (IT)",
      "Database Support Assistant",
      "Junior Programmer",
    ],
    growthGoals: [
      "Software Engineer",
      "Full Stack Developer",
      "Backend Engineer",
      "DevOps & Cloud Engineer",
      "System Architect",
    ],
  },
  it: {
    defaultField: "IT Infrastructure & Support",
    commonGoals: [
      "Technical Support Associate",
      "Junior Web Developer",
      "IT Support / Helpdesk Technician",
      "Software Testing / QA Trainee",
      "Diploma Apprentice Trainee (IT)",
      "Database Support Assistant",
      "Junior Programmer",
    ],
    growthGoals: [
      "Software Engineer",
      "Cloud & DevOps Engineer",
      "Information Security Analyst",
      "Database Administrator",
    ],
  },
  other: {
    defaultField: "Technical Support & Operations",
    commonGoals: [
      "Technical Support Associate",
      "Testing & Quality Technician",
      "Field Service Technician",
      "Diploma Apprentice Trainee",
      "Operations Assistant",
    ],
    growthGoals: [
      "Operations Engineer",
      "Quality Assurance Engineer",
      "Technical Project Coordinator",
    ],
  },
};

/**
 * Qualification-Aware Preset Retriever
 * Adapts popular goals, skills, and eligibility notes specifically to:
 * 1. Course / Degree (Diploma vs B.Tech vs BCA vs MCA vs B.Sc)
 * 2. Branch (CSE, Civil, Mechanical, Electrical, ECE, etc.)
 * 3. Target Career Goal (Supports Cross-domain overrides like Diploma Civil -> Software Developer)
 * 4. Preferred Domain
 */
export function getQualificationAwarePreset(
  course?: string,
  branchName?: string,
  careerGoal?: string,
  preferredDomain?: string,
  skills?: string[] | { name: string; level?: string }[]
): BranchSkillPreset {
  const normQual = normalizeQualification(course);
  const branchKey = normalizeBranchKey(branchName);
  const basePreset = BRANCH_SKILL_PRESETS[branchKey] || BRANCH_SKILL_PRESETS.other;

  // Run the centralized recommendation engine
  const recOutput: CareerRecommendationOutput = getCareerRecommendations({
    course,
    branch: branchName,
    careerGoal,
    preferredDomain,
    skills,
  });

  let dynamicGoals: string[] = [];
  let dynamicGrowthGoals: string[] = [];

  if (normQual === "Diploma") {
    const diplomaFallback = DIPLOMA_BRANCH_PRESETS[branchKey] || DIPLOMA_BRANCH_PRESETS.other;
    const entryRoles = (recOutput.categorizedRoles?.eligibleEntryLevelRoles || []).map((r) => r.role);
    const potRoles = (recOutput.categorizedRoles?.potentialRoles || []).map((r) => r.role);

    // Rule: For Diploma students, Popular paths must only contain realistic entry-level roles
    // (Technician, Trainee, Apprentice, Operator, Supervisor, Draughtsman, Assistant, Support, Junior Engineer)
    const isRealisticDiplomaEntryRole = (roleName: string) => {
      const lower = roleName.toLowerCase();
      if (lower.includes("junior")) return true;
      if (
        lower.includes("technician") ||
        lower.includes("trainee") ||
        lower.includes("apprentice") ||
        lower.includes("operator") ||
        lower.includes("supervisor") ||
        lower.includes("draughtsman") ||
        lower.includes("assistant") ||
        lower.includes("associate") ||
        lower.includes("support")
      ) {
        return true;
      }
      return (
        !lower.includes("engineer") &&
        !lower.includes("architect") &&
        !lower.includes("lead") &&
        !lower.includes("scientist")
      );
    };

    const verifiedEntry = entryRoles.filter(isRealisticDiplomaEntryRole);
    dynamicGoals = verifiedEntry.length > 0 ? verifiedEntry : diplomaFallback.commonGoals;

    const growthRoles = (recOutput.categorizedRoles?.careerGrowthRoles || []).map((r) => r.role);
    const excludedRoles = [...entryRoles, ...potRoles].filter((r) => !isRealisticDiplomaEntryRole(r));
    dynamicGrowthGoals = Array.from(new Set([...growthRoles, ...excludedRoles, ...diplomaFallback.growthGoals]));
  } else {
    // For B.Tech / BCA / MCA / B.Sc
    const entryGoals = (recOutput.categorizedRoles?.eligibleEntryLevelRoles || []).map((r) => r.role);
    const potGoals = (recOutput.categorizedRoles?.potentialRoles || []).map((r) => r.role);
    const combinedGoals = Array.from(new Set([...entryGoals, ...potGoals]));
    dynamicGoals = combinedGoals.length > 0 ? combinedGoals : recOutput.recommendedRoles.map((r) => r.role);
    dynamicGrowthGoals = (recOutput.categorizedRoles?.careerGrowthRoles || []).map((r) => r.role);
  }

  return {
    branchKey,
    branchName: basePreset.branchName,
    defaultField: preferredDomain || (normQual === "Diploma" ? (DIPLOMA_BRANCH_PRESETS[branchKey]?.defaultField || basePreset.defaultField) : basePreset.defaultField),
    commonGoals: dynamicGoals.length > 0 ? dynamicGoals : basePreset.commonGoals,
    growthGoals: dynamicGrowthGoals,
    suggestedSkills: recOutput.recommendedSkills.length > 0 ? recOutput.recommendedSkills : basePreset.suggestedSkills,
    qualification: normQual,
    eligibilityNotes: recOutput.eligibilityNotes,
    careerGoalAnalysis: recOutput.careerGoalAnalysis,
    categorizedRoles: recOutput.categorizedRoles,
    careerPath: recOutput.careerPath,
    marketDemand: recOutput.marketDemand,
    dataSources: recOutput.dataSources,
    recommendedRoles: recOutput.recommendedRoles,
  };
}

/**
 * Backward-compatible helper that incorporates course, careerGoal, preferredDomain when available
 */
export function getBranchPreset(
  branchName?: string,
  course?: string,
  careerGoal?: string,
  preferredDomain?: string
): BranchSkillPreset {
  if (course || careerGoal || preferredDomain) {
    return getQualificationAwarePreset(course, branchName, careerGoal, preferredDomain);
  }
  const branchKey = normalizeBranchKey(branchName);
  return BRANCH_SKILL_PRESETS[branchKey] || BRANCH_SKILL_PRESETS.other;
}

/**
 * Direct Skill Suggestions based on student's Course & Branch.
 * Reuses existing branch skills without asking student for career goal.
 */
export function getBranchSkillSuggestions(course?: string, branchName?: string): string[] {
  const normQual = normalizeQualification(course);
  const branchKey = normalizeBranchKey(branchName);
  const basePreset = BRANCH_SKILL_PRESETS[branchKey] || BRANCH_SKILL_PRESETS.other;

  let skills = [...basePreset.suggestedSkills];

  // If Diploma, include realistic technician and practical skills
  if (normQual === "Diploma") {
    const diplomaSkillsMap: Record<string, string[]> = {
      ece: [
        "Circuit Debugging & Multimeter",
        "Soldering & Electronic Assembly",
        "Electronic Component Testing",
        "Microcontrollers (8051 / AVR / Arduino)",
        "PCB Layout & Testing",
        "Digital Electronics",
        "Sensors & Actuators Interface",
      ],
      ee: [
        "Control Panel Wiring & Testing",
        "Multimeter & Megger Insulation Testing",
        "Single Line Diagram (SLD) Reading",
        "Substation Equipment Maintenance",
        "Motor Starters & DOL / Star-Delta",
        "Electrical Safety Procedures & Earthing",
        "PLC Basics",
      ],
      me: [
        "CNC Machine Operation & G/M Codes",
        "Engineering Drawing Reading",
        "Vernier Caliper & Micrometer Inspection",
        "AutoCAD 2D / 3D Draughting",
        "Preventive Maintenance Procedures",
        "Welding, Fitting & Machining",
        "Hydraulics & Pneumatics",
      ],
      ce: [
        "AutoCAD Civil Draughting",
        "Total Station & Surveying",
        "Quantity Estimation & Costing",
        "Site Supervision & Quality Inspection",
        "Bar Bending Schedule (BBS)",
        "Concrete Slump & Cube Testing",
      ],
      cse: [
        "HTML",
        "CSS",
        "JavaScript",
        "C",
        "C++",
        "Python",
        "SQL & Database Basics",
        "Computer Hardware & Troubleshooting",
        "OS Installation & Networking Basics",
        "Git & GitHub",
      ],
      it: [
        "HTML",
        "CSS",
        "JavaScript",
        "Python",
        "SQL",
        "Computer Networks & LAN Configuration",
        "Hardware & Helpdesk Support",
        "Windows & Linux Administration Basics",
        "Git & GitHub",
      ],
    };

    const diplomaSkills = diplomaSkillsMap[branchKey];
    if (diplomaSkills && diplomaSkills.length > 0) {
      // Put practical technician / entry skills first, then combine with unique base skills
      skills = Array.from(new Set([...diplomaSkills, ...skills]));
    }
  }

  return skills;
}

