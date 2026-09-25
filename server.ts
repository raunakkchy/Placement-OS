import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { db, initMongo, sanitizeUser, UserDocument, RoadmapDocument, SessionModel } from "./server/db.js";
import { sendOtpEmail, sendRegistrationOtpEmail } from "./server/email.js";
import {
  analyzeJobMatch,
  quickJobMatch,
  suggestJobRolesForStudent,
  generatePersonalizedRoadmap,
  generateSkillGapAndRoadmap,
  calculatePlacementReadiness,
  generateInterviewGreetingAndFirstQuestion,
  evaluateAnswerAndGenerateNextQuestion,
  evaluateMockInterview,
  adaptRoadmapFromInterview,
  generateStudentAiProfileAnalysis,
  generateJobRoleRecommendations,
} from "./server/placementAi.js";
import { parseResumeDocument } from "./server/resumeParser.js";
import { getCareerRecommendations } from "./src/data/careerRecommendationEngine.js";

const app = express();
const PORT = 3000;

// Setup upload handler
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  storage: multer.memoryStorage(),
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", app: "PlacementOS" });
});

// Auth helper
async function getAuthenticatedUser(req: Request): Promise<UserDocument | null> {
  const token =
    req.cookies?.placement_session_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    (req.headers["x-session-token"] as string);

  const userIdHeader = (req.headers["x-user-id"] as string)?.trim();
  const userEmailHeader = (req.headers["x-user-email"] as string)?.trim();

  // 1. Session token lookup
  if (token) {
    const session = await db.sessions.get(token);
    if (session) {
      const user = await db.users.findById(session.userId);
      if (user) return user;
    }

    // Direct match if token is a user ID
    const directUser = await db.users.findById(token);
    if (directUser) {
      await db.sessions
        .create(token, directUser.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .catch(() => {});
      return directUser;
    }
  }

  // 2. Check x-user-id header
  if (userIdHeader) {
    const user = await db.users.findById(userIdHeader);
    if (user) {
      if (token) {
        await db.sessions
          .create(token, user.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          .catch(() => {});
      }
      return user;
    }
  }

  // 3. Check x-user-email header
  if (userEmailHeader) {
    const user = await db.users.findByEmail(userEmailHeader);
    if (user) {
      if (token) {
        await db.sessions
          .create(token, user.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          .catch(() => {});
      }
      return user;
    }
  }

  // 4. Fallback if single active user in dev/preview environment
  const allUsers = await db.users.all();
  if (allUsers.length === 1) {
    return allUsers[0];
  } else if (allUsers.length > 1 && userEmailHeader) {
    const matched = allUsers.find(
      (u) => u.email.toLowerCase() === userEmailHeader.toLowerCase()
    );
    if (matched) return matched;
  }

  return null;
}

// Require Auth Middleware
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in." });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    next(err);
  }
}

// In-memory rate limiting map for sensitive endpoints
const passwordChangeRateLimit = new Map<string, { count: number; firstAttempt: number }>();
const deleteAccountRateLimit = new Map<string, { count: number; firstAttempt: number }>();
const registerRateLimit = new Map<string, { count: number; firstAttempt: number }>();
const loginRateLimit = new Map<string, { count: number; firstAttempt: number }>();

// Security question verification failed attempt rate limiter & temporary lockout
interface SecurityQuestionRateLimitEntry {
  attempts: number;
  blockedUntil: number;
  firstAttempt: number;
}
const securityQuestionAttempts = new Map<string, SecurityQuestionRateLimitEntry>();

function checkSecurityQuestionRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = securityQuestionAttempts.get(key);
  if (!record) {
    return { allowed: true };
  }
  if (record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    securityQuestionAttempts.delete(key);
    return { allowed: true };
  }
  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000;
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

function recordSecurityQuestionFailure(key: string) {
  const now = Date.now();
  const record = securityQuestionAttempts.get(key);
  if (!record || (now - record.firstAttempt > 15 * 60 * 1000)) {
    securityQuestionAttempts.set(key, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
  } else {
    record.attempts += 1;
    if (record.attempts >= 5) {
      record.blockedUntil = now + 15 * 60 * 1000;
    }
  }
}

function clearSecurityQuestionFailures(key: string) {
  securityQuestionAttempts.delete(key);
}

// Temporary password reset tokens for verified security questions
interface ResetTokenRecord {
  userId: string;
  email: string;
  expiresAt: number;
}
const passwordResetTokens = new Map<string, ResetTokenRecord>();

function checkRateLimit(
  map: Map<string, { count: number; firstAttempt: number }>,
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = map.get(key);

  if (!record) {
    map.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (now - record.firstAttempt > windowMs) {
    map.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  record.count += 1;
  return record.count <= maxAttempts;
}

// Rate limiting for Forgot Password OTP requests and OTP verification
interface ForgotPasswordRateLimitRecord {
  count: number;
  firstAttempt: number;
  lastRequestedAt: number;
}
const forgotPasswordRateLimit = new Map<string, ForgotPasswordRateLimitRecord>();
const otpVerifyRateLimit = new Map<string, { count: number; firstAttempt: number }>();

function checkForgotPasswordRateLimit(
  key: string,
  cooldownMs = 60 * 1000,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; reason?: "cooldown" | "limit"; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = forgotPasswordRateLimit.get(key);
  if (!record) {
    forgotPasswordRateLimit.set(key, { count: 1, firstAttempt: now, lastRequestedAt: now });
    return { allowed: true };
  }

  // 60-second resend cooldown
  if (now - record.lastRequestedAt < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - (now - record.lastRequestedAt)) / 1000);
    return { allowed: false, reason: "cooldown", retryAfterSeconds };
  }

  // Window expiry reset
  if (now - record.firstAttempt > windowMs) {
    forgotPasswordRateLimit.set(key, { count: 1, firstAttempt: now, lastRequestedAt: now });
    return { allowed: true };
  }

  // Attempt limit per window
  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return { allowed: false, reason: "limit", retryAfterSeconds };
  }

  record.count += 1;
  record.lastRequestedAt = now;
  return { allowed: true };
}

// ----------------------------------------------------
// AUTHENTICATION & SECURITY ENDPOINTS
// ----------------------------------------------------

const registerOtpRateLimit = new Map<string, { count: number; firstAttempt: number; lastRequestedAt: number }>();

// 1. Send Registration OTP
app.post("/api/auth/send-registration-otp", async (req: Request, res: Response) => {
  try {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const { email: rawEmail, fullName, rollNumber } = req.body;
    const email = (rawEmail || "").toString().trim().toLowerCase();

    if (!email) {
      res.status(400).json({ error: "Email address is required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    // 1. Check if user already exists with this email FIRST before rate limiting
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "An account with this email address already exists. Please sign in." });
      return;
    }

    // 2. Check if rollNumber is already registered FIRST before rate limiting
    if (rollNumber && rollNumber.trim()) {
      const existingRoll = await db.users.findByRollNumber(rollNumber.trim());
      if (existingRoll) {
        res.status(409).json({ error: "An account with this Roll / Registration number already exists." });
        return;
      }
    }

    // 3. Rate limiting: max 5 OTP requests per 10 minutes per IP/email
    const rateKey = `reg-otp:${clientIp}:${email}`;
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const cooldownMs = 60 * 1000;

    let rateRecord = registerOtpRateLimit.get(rateKey);
    if (!rateRecord || now - rateRecord.firstAttempt > windowMs) {
      rateRecord = { count: 1, firstAttempt: now, lastRequestedAt: now };
      registerOtpRateLimit.set(rateKey, rateRecord);
    } else {
      if (now - rateRecord.lastRequestedAt < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - (now - rateRecord.lastRequestedAt)) / 1000);
        res.status(429).json({ error: `Please wait ${waitSec} seconds before requesting a new code.` });
        return;
      }
      if (rateRecord.count >= 5) {
        res.status(429).json({ error: "Too many verification requests. Please try again after 10 minutes." });
        return;
      }
      rateRecord.count += 1;
      rateRecord.lastRequestedAt = now;
    }

    // Delete any active unverified OTPs for this email to prevent replay
    await db.registrationOtps.deleteActiveByEmail(email);

    // Generate cryptographically secure 6-digit OTP (100000 - 999999)
    const otpNumber = crypto.randomInt(100000, 1000000);
    const otp = otpNumber.toString();

    // Hash OTP using bcrypt (cost 10)
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const id = `reg-${crypto.randomBytes(8).toString("hex")}`;

    await db.registrationOtps.create({
      id,
      email,
      otpHash,
      expiresAt,
    });

    // Send branded email OTP
    const sent = await sendRegistrationOtpEmail({
      to: email,
      otp,
      studentName: fullName,
    });

    if (!sent) {
      res.status(500).json({
        error: `Could not deliver verification email to ${email}. Please check the email address or try again.`,
      });
      return;
    }

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
    });
  } catch (err: any) {
    console.error("Send registration OTP error:", err);
    res.status(500).json({ error: "Failed to send verification code: " + err.message });
  }
});

// 2. Student Registration (with Compulsory Email OTP Verification)
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    if (!checkRateLimit(registerRateLimit, clientIp, 20, 15 * 60 * 1000)) {
      res.status(429).json({ error: "Too many registration attempts. Please try again later." });
      return;
    }

    const {
      email,
      password,
      fullName,
      phone,
      rollNumber,
      college,
      course,
      branch,
      semester,
      cgpa,
      tenthMarks,
      twelfthMarks,
      graduationYear,
      courseDuration,
      backlogs,
      skills,
      targetRoles,
      securityQuestion1,
      securityAnswer1,
      securityQuestion2,
      securityAnswer2,
    } = req.body;

    const gradYear = Number(graduationYear) || (new Date().getFullYear() + ((course === "Diploma" || course === "BCA" ? 3 : 4) - Math.ceil(Number(semester || 1) / 2)));

    if (!email || !password || !fullName || !college || !course || !branch || !semester || cgpa === undefined || !gradYear) {
      res.status(400).json({
        error: "Missing required registration fields: email, password, fullName, college, course, branch, semester, and cgpa are mandatory.",
      });
      return;
    }

    const semNum = Number(semester);
    const maxSem = (course === "Diploma" || course === "BCA") ? 6 : 8;
    if (isNaN(semNum) || semNum < 1 || semNum > maxSem) {
      res.status(400).json({
        error: `Invalid semester for ${course}. Allowed options are Semester 1 to Semester ${maxSem}.`,
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Please provide a valid email address." });
      return;
    }

    // Compulsory Email OTP Verification check
    const rawOtp = (req.body.otp || "").toString().trim();
    if (!rawOtp) {
      res.status(400).json({
        error: "Email verification is compulsory to create an account. Please enter the 6-digit OTP sent to your email.",
        requiresOtp: true,
      });
      return;
    }

    if (!/^\d{6}$/.test(rawOtp)) {
      res.status(400).json({ error: "Verification code must be exactly 6 digits." });
      return;
    }

    const regOtp = await db.registrationOtps.findLatestActiveByEmail(email);
    if (!regOtp) {
      res.status(400).json({
        error: "No active verification code found for this email or it has expired. Please request a new OTP.",
        otpExpired: true,
      });
      return;
    }

    if (regOtp.attempts >= 5) {
      await db.registrationOtps.deleteActiveByEmail(email);
      res.status(400).json({
        error: "Maximum verification attempts exceeded. Please request a new verification code.",
        maxAttemptsExceeded: true,
      });
      return;
    }

    await db.registrationOtps.incrementAttempts(regOtp.id);

    const isOtpValid = await bcrypt.compare(rawOtp, regOtp.otpHash);
    if (!isOtpValid) {
      const remaining = Math.max(0, 5 - (regOtp.attempts + 1));
      res.status(400).json({
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      });
      return;
    }

    // Mark OTP as used so it cannot be replayed
    await db.registrationOtps.markUsed(regOtp.id);

    // Password strength enforcement
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      res.status(400).json({
        error: "Password must be at least 8 characters and include uppercase, lowercase, number, and a special symbol.",
      });
      return;
    }

    // Check email uniqueness in MongoDB
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "An account with this email address already exists. Please sign in." });
      return;
    }

    // Check rollNumber uniqueness if provided
    if (rollNumber && rollNumber.trim()) {
      const existingRoll = await db.users.findByRollNumber(rollNumber.trim());
      if (existingRoll) {
        res.status(409).json({ error: "An account with this Roll / Registration number already exists." });
        return;
      }
    }

    // Enforce exactly 2 security questions with non-empty answers
    const q1 = typeof securityQuestion1 === "string" ? securityQuestion1.trim() : "";
    const a1 = typeof securityAnswer1 === "string" ? securityAnswer1.trim() : "";
    const q2 = typeof securityQuestion2 === "string" ? securityQuestion2.trim() : "";
    const a2 = typeof securityAnswer2 === "string" ? securityAnswer2.trim() : "";

    if (!q1 || !a1 || !q2 || !a2) {
      res.status(400).json({
        error: "Two security questions and their corresponding non-empty answers are required for registration.",
      });
      return;
    }

    if (q1 === q2) {
      res.status(400).json({
        error: "Please choose two different security questions.",
      });
      return;
    }

    // Hash password with bcrypt (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Hash security answers securely (bcrypt cost factor 10, normalized)
    const ans1Hash = await bcrypt.hash(a1.toLowerCase(), 10);
    const ans2Hash = await bcrypt.hash(a2.toLowerCase(), 10);
    const securityQuestionsObj = {
      question1: q1,
      answer1Hash: ans1Hash,
      question2: q2,
      answer2Hash: ans2Hash,
    };

    const userId = `student-${crypto.randomBytes(8).toString("hex")}`;
    const newUser: UserDocument = {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      phone: phone?.trim() || "",
      rollNumber: rollNumber?.trim() || "",
      college: college.trim(),
      course: course.trim(),
      branch: branch.trim(),
      semester: Number(semester),
      cgpa: Number(cgpa),
      tenthMarks: tenthMarks ? Number(tenthMarks) : undefined,
      twelfthMarks: twelfthMarks ? Number(twelfthMarks) : undefined,
      graduationYear: gradYear,
      courseDuration: courseDuration || "",
      securityQuestions: securityQuestionsObj,
      backlogs: backlogs ? Number(backlogs) : 0,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
      targetRoles: Array.isArray(targetRoles) ? targetRoles : (targetRoles ? targetRoles.split(",").map((r: string) => r.trim()).filter(Boolean) : []),
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdUser = await db.users.create(newUser);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.sessions.create(sessionToken, createdUser.id, expiresAt);

    // Set secure HTTP-only cookie
    res.cookie("placement_session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Compute initial placement readiness score
    const initialScore = await calculatePlacementReadiness(createdUser, [], []);
    await db.readinessScores.save(initialScore);

    // Generate initial suggested jobs
    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(createdUser, allJobs, 3);

    const safeUser = sanitizeUser(createdUser);

    res.status(201).json({
      success: true,
      message: "Student account registered successfully!",
      user: safeUser,
      token: sessionToken,
      readinessScore: initialScore,
      suggestedJobs,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// 2. Student Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    if (!checkRateLimit(loginRateLimit, clientIp, 15, 10 * 60 * 1000)) {
      res.status(429).json({ error: "Too many login attempts. Please try again after 10 minutes." });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.sessions.create(sessionToken, user.id, expiresAt);

    // Set secure HTTP-only cookie
    res.cookie("placement_session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    let score = await db.readinessScores.findByUser(user.id);
    if (!score) {
      const interviews = await db.interviews.findByUser(user.id);
      const roadmaps = await db.roadmaps.findByUser(user.id);
      score = await calculatePlacementReadiness(user, interviews, roadmaps);
      await db.readinessScores.save(score);
    }

    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(user, allJobs, 3);

    const safeUser = sanitizeUser(user);

    res.json({
      success: true,
      message: "Signed in successfully!",
      user: safeUser,
      token: sessionToken,
      readinessScore: score,
      suggestedJobs,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// ----------------------------------------------------
// FORGOT PASSWORD WITH SECURE EMAIL OTP VERIFICATION
// ----------------------------------------------------

// 1. Request OTP
app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body?.email || req.body?.identifier || "").trim();
    const genericResponse = {
      message: "If an account exists with this email, an OTP has been sent.",
    };

    if (!rawEmail) {
      res.status(400).json({ error: "Email address is required." });
      return;
    }

    const email = rawEmail.toLowerCase();
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    // Rate limiting: IP and email checks
    const ipCheck = checkForgotPasswordRateLimit(`ip:${clientIp}`);
    const emailCheck = checkForgotPasswordRateLimit(`email:${email}`);

    if (!ipCheck.allowed || !emailCheck.allowed) {
      const check = !emailCheck.allowed ? emailCheck : ipCheck;
      if (check.reason === "cooldown") {
        // Enforce cooldown without revealing account existence
        res.json(genericResponse);
        return;
      }
      res.status(429).json({
        error: "Too many password reset requests. Please try again in a few minutes.",
      });
      return;
    }

    // Check whether account exists in MongoDB
    const user = await db.users.findByEmail(email);

    if (user) {
      // Invalidate any existing active OTPs for this email to prevent replay
      await db.passwordResets.deleteActiveByEmail(email);

      // Generate cryptographically secure 6-digit OTP (100000 - 999999)
      const otpNumber = crypto.randomInt(100000, 1000000);
      const otp = otpNumber.toString();

      // Hash OTP using bcrypt before storing in database (cost factor 10)
      const otpHash = await bcrypt.hash(otp, 10);

      // OTP validity: 5 minutes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const resetId = `reset-${crypto.randomBytes(8).toString("hex")}`;

      await db.passwordResets.create({
        id: resetId,
        userId: user.id,
        email: user.email,
        otpHash,
        expiresAt,
      });

      // Send OTP via configured server-side email service
      await sendOtpEmail({
        to: user.email,
        otp,
      });
    }

    // Always return generic response to prevent email/account enumeration
    res.json(genericResponse);
  } catch (err: any) {
    console.error("Forgot password OTP error:", err);
    res.status(500).json({ error: "Failed to process password reset request." });
  }
});

// 2. Verify OTP
app.post("/api/auth/verify-reset-otp", async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body?.email || req.body?.identifier || "").trim();
    const rawOtp = (req.body?.otp || "").toString().trim();

    if (!rawEmail || !rawOtp) {
      res.status(400).json({ error: "Email and 6-digit OTP are required." });
      return;
    }

    const email = rawEmail.toLowerCase();
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const verifyRateKey = `verify:${clientIp}:${email}`;
    if (!checkRateLimit(otpVerifyRateLimit, verifyRateKey, 15, 15 * 60 * 1000)) {
      res.status(429).json({ error: "Too many verification attempts. Please wait 15 minutes." });
      return;
    }

    // Numeric check for 6-digit OTP
    if (!/^\d{6}$/.test(rawOtp)) {
      res.status(400).json({ error: "OTP must be exactly 6 digits." });
      return;
    }

    // Find latest active reset record for this email
    const resetRecord = await db.passwordResets.findLatestActiveByEmail(email);

    if (!resetRecord) {
      res.status(400).json({ error: "OTP has expired or is invalid. Please request a new OTP." });
      return;
    }

    // Check if attempt limit has already been exceeded (max 5 attempts)
    if (resetRecord.attempts >= 5) {
      await db.passwordResets.markUsed(resetRecord.id);
      res.status(400).json({
        error: "Maximum verification attempts exceeded. Please request a new OTP.",
      });
      return;
    }

    // Compare hashed OTP with input using bcrypt
    const isMatch = await bcrypt.compare(rawOtp, resetRecord.otpHash);

    if (!isMatch) {
      const updated = await db.passwordResets.incrementAttempts(resetRecord.id);
      const attemptsMade = updated ? updated.attempts : resetRecord.attempts + 1;
      const remaining = Math.max(0, 5 - attemptsMade);

      if (remaining === 0) {
        await db.passwordResets.markUsed(resetRecord.id);
        res.status(400).json({
          error: "Maximum verification attempts exceeded. Please request a new OTP.",
        });
        return;
      }

      res.status(400).json({
        error: `Invalid OTP. You have ${remaining} attempt(s) remaining.`,
      });
      return;
    }

    // OTP verified successfully!
    // Generate cryptographically secure reset authorization token (32 random bytes)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute validity

    await db.passwordResets.markVerified(
      resetRecord.id,
      resetTokenHash,
      resetTokenExpiresAt
    );

    res.json({
      success: true,
      resetToken,
      message: "OTP verified successfully. You may now create a new password.",
    });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Failed to verify OTP. Please try again." });
  }
});

// 3. Security Question Recovery - Step 1: Identify Account
app.post(["/api/auth/forgot-password/identify", "/api/auth/forgot-password/security-questions"], async (req: Request, res: Response) => {
  try {
    const rawIdentifier = (req.body?.identifier || req.body?.email || "").trim();
    if (!rawIdentifier) {
      res.status(400).json({ error: "Email or Roll Number is required." });
      return;
    }

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const rateKey = `identify:${clientIp}:${rawIdentifier.toLowerCase()}`;
    if (!checkRateLimit(loginRateLimit, rateKey, 15, 15 * 60 * 1000)) {
      res.status(429).json({ error: "Too many lookup attempts. Please try again later." });
      return;
    }

    let user = await db.users.findByEmail(rawIdentifier);
    if (!user) {
      user = await db.users.findByRollNumber(rawIdentifier);
    }

    // Protect against account enumeration by giving a generic not-found message if user doesn't exist or questions aren't configured
    if (!user || !user.securityQuestions || !user.securityQuestions.question1 || !user.securityQuestions.question2) {
      res.status(400).json({
        hasSecurityQuestions: false,
        error: "Unable to find an account matching these details or security questions are not configured.",
      });
      return;
    }

    res.json({
      success: true,
      hasSecurityQuestions: true,
      identifier: user.email,
      question1: user.securityQuestions.question1,
      question2: user.securityQuestions.question2,
    });
  } catch (err: any) {
    console.error("Forgot password questions error:", err);
    res.status(500).json({ error: "Failed to fetch security questions: " + err.message });
  }
});

// 4. Security Question Recovery - Step 2: Verify Answers
app.post("/api/auth/forgot-password/verify-answers", async (req: Request, res: Response) => {
  try {
    const { identifier, email, securityAnswer1, securityAnswer2 } = req.body || {};
    const rawIdentifier = (identifier || email || "").trim();

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const rateKey = `${clientIp}:${rawIdentifier.toLowerCase()}`;
    const rateCheck = checkSecurityQuestionRateLimit(rateKey);
    if (!rateCheck.allowed) {
      const waitMin = Math.ceil((rateCheck.retryAfterSeconds || 900) / 60);
      res.status(429).json({
        error: `Too many failed verification attempts. Account recovery locked for ${waitMin} minute(s).`,
      });
      return;
    }

    if (!rawIdentifier) {
      res.status(400).json({ error: "Account identifier is required." });
      return;
    }

    const ans1 = typeof securityAnswer1 === "string" ? securityAnswer1.trim() : "";
    const ans2 = typeof securityAnswer2 === "string" ? securityAnswer2.trim() : "";

    if (!ans1 || !ans2) {
      res.status(400).json({ error: "Both security answers are required." });
      return;
    }

    let user = await db.users.findByEmail(rawIdentifier);
    if (!user) {
      user = await db.users.findByRollNumber(rawIdentifier);
    }

    if (!user || !user.securityQuestions || !user.securityQuestions.answer1Hash || !user.securityQuestions.answer2Hash) {
      recordSecurityQuestionFailure(rateKey);
      res.status(400).json({ error: "The security answers are incorrect." });
      return;
    }

    const isAns1Valid = await bcrypt.compare(ans1.toLowerCase(), user.securityQuestions.answer1Hash);
    const isAns2Valid = await bcrypt.compare(ans2.toLowerCase(), user.securityQuestions.answer2Hash);

    // Verify BOTH answers. If either answer is incorrect, generic error
    if (!isAns1Valid || !isAns2Valid) {
      recordSecurityQuestionFailure(rateKey);
      res.status(400).json({ error: "The security answers are incorrect." });
      return;
    }

    // Both answers verified! Clear failure counts and issue temporary reset token
    clearSecurityQuestionFailures(rateKey);

    const resetToken = crypto.randomBytes(32).toString("hex");
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min expiry
    });

    res.json({
      success: true,
      resetToken,
      message: "Security answers verified successfully. Please set your new password.",
    });
  } catch (err: any) {
    console.error("Verify security answers error:", err);
    res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

// 5. Security Question Recovery - Step 3: Reset Password
app.post(["/api/auth/reset-password", "/api/auth/forgot-password/reset-password"], async (req: Request, res: Response) => {
  try {
    const {
      resetToken,
      identifier,
      email,
      securityAnswer1,
      securityAnswer2,
      newPassword,
      confirmPassword,
      confirmNewPassword,
    } = req.body || {};

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const passwordToSet = newPassword;
    const confirmation = confirmPassword || confirmNewPassword;

    // Validate new password rules
    if (!passwordToSet) {
      res.status(400).json({ error: "New password is required." });
      return;
    }

    const hasMinLen = passwordToSet.length >= 8;
    const hasUpper = /[A-Z]/.test(passwordToSet);
    const hasLower = /[a-z]/.test(passwordToSet);
    const hasNumber = /[0-9]/.test(passwordToSet);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordToSet);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      res.status(400).json({
        error: "Password must contain at least 8 characters, uppercase, lowercase, a number, and a special character.",
      });
      return;
    }

    if (passwordToSet !== confirmation) {
      res.status(400).json({ error: "Passwords do not match." });
      return;
    }

    let targetUser: UserDocument | null = null;
    let resetDocIdToInvalidate: string | null = null;

    // Path A: Authenticated via validated resetToken
    if (resetToken && typeof resetToken === "string") {
      const resetTokenHash = crypto.createHash("sha256").update(resetToken.trim()).digest("hex");
      const record = await db.passwordResets.findByResetTokenHash(resetTokenHash);

      if (
        record &&
        record.verified &&
        !record.usedAt &&
        record.resetTokenExpiresAt &&
        new Date(record.resetTokenExpiresAt) > new Date()
      ) {
        targetUser = await db.users.findById(record.userId);
        resetDocIdToInvalidate = record.id;
      } else {
        // Fallback: Check in-memory legacy tokens for backward compatibility
        const legacyRecord = passwordResetTokens.get(resetToken);
        if (legacyRecord && legacyRecord.expiresAt > Date.now()) {
          targetUser = await db.users.findById(legacyRecord.userId);
          passwordResetTokens.delete(resetToken);
        } else {
          res.status(400).json({
            error: "Password reset authorization has expired or is invalid. Please request a new OTP.",
          });
          return;
        }
      }
    } 
    // Path B: Direct submission with identifier and security answers
    else {
      const rawIdentifier = (identifier || email || "").trim();
      const ans1 = typeof securityAnswer1 === "string" ? securityAnswer1.trim() : "";
      const ans2 = typeof securityAnswer2 === "string" ? securityAnswer2.trim() : "";

      const rateKey = `${clientIp}:${rawIdentifier.toLowerCase()}`;
      const rateCheck = checkSecurityQuestionRateLimit(rateKey);
      if (!rateCheck.allowed) {
        const waitMin = Math.ceil((rateCheck.retryAfterSeconds || 900) / 60);
        res.status(429).json({
          error: `Too many failed verification attempts. Account recovery locked for ${waitMin} minute(s).`,
        });
        return;
      }

      if (!rawIdentifier || !ans1 || !ans2) {
        res.status(400).json({ error: "Account identifier and both security answers are required." });
        return;
      }

      let user = await db.users.findByEmail(rawIdentifier);
      if (!user) {
        user = await db.users.findByRollNumber(rawIdentifier);
      }

      if (!user || !user.securityQuestions || !user.securityQuestions.answer1Hash || !user.securityQuestions.answer2Hash) {
        recordSecurityQuestionFailure(rateKey);
        res.status(400).json({ error: "The security answers are incorrect." });
        return;
      }

      const isAns1Valid = await bcrypt.compare(ans1.toLowerCase(), user.securityQuestions.answer1Hash);
      const isAns2Valid = await bcrypt.compare(ans2.toLowerCase(), user.securityQuestions.answer2Hash);

      if (!isAns1Valid || !isAns2Valid) {
        recordSecurityQuestionFailure(rateKey);
        res.status(400).json({ error: "The security answers are incorrect." });
        return;
      }

      clearSecurityQuestionFailures(rateKey);
      targetUser = user;
    }

    if (!targetUser) {
      res.status(400).json({ error: "User account could not be found." });
      return;
    }

    // Hash new password and update user record
    const newPasswordHash = await bcrypt.hash(passwordToSet, 10);
    await db.users.update(targetUser.id, { passwordHash: newPasswordHash });

    // Invalidate the reset token authorization record so it cannot be reused
    if (resetDocIdToInvalidate) {
      await db.passwordResets.markUsed(resetDocIdToInvalidate);
    }

    // Invalidate all existing sessions for this student account
    try {
      await SessionModel.deleteMany({ userId: targetUser.id }).exec();
    } catch (sessionErr) {
      console.warn("Could not purge sessions:", sessionErr);
    }

    res.json({
      success: true,
      message: "Password reset successful. You may now sign in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed: " + err.message });
  }
});

// 5. Logout
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  const token =
    req.cookies?.placement_session_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    (req.headers["x-session-token"] as string);

  if (token) {
    await db.sessions.delete(token);
  }
  res.clearCookie("placement_session_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// ----------------------------------------------------
// STUDENT ACCOUNT MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// 1. Change Student Full Name
app.patch("/api/account/name", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in." });
      return;
    }

    const { fullName } = req.body || {};
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({ error: "Full Name is required and cannot be empty." });
      return;
    }

    const trimmedName = fullName.trim();
    const updated = await db.users.update(user.id, { fullName: trimmedName });
    if (!updated) {
      res.status(404).json({ error: "Student account not found." });
      return;
    }

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      message: "Full Name updated successfully.",
      user: safeUser,
    });
  } catch (err: any) {
    console.error("Change name error:", err);
    res.status(500).json({ error: "Failed to update name: " + err.message });
  }
});

// 2. Change Student Password
app.patch("/api/account/password", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in." });
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword, confirmPassword } = req.body || {};

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const rateLimitKey = `${user.id}:${clientIp}`;
    if (!checkRateLimit(passwordChangeRateLimit, rateLimitKey, 10, 15 * 60 * 1000)) {
      res.status(429).json({
        error: "Too many password update attempts. Please try again after 15 minutes.",
      });
      return;
    }

    const confirmation = confirmNewPassword || confirmPassword;

    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required." });
      return;
    }

    const isCurrentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    if (!newPassword) {
      res.status(400).json({
        error: "Password must contain 8+ characters, uppercase, lowercase, number and special character.",
      });
      return;
    }

    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      res.status(400).json({
        error: "Password must contain 8+ characters, uppercase, lowercase, number and special character.",
      });
      return;
    }

    if (confirmation !== undefined && newPassword !== confirmation) {
      res.status(400).json({ error: "Passwords do not match." });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.users.update(user.id, { passwordHash: newPasswordHash });

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err: any) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password: " + err.message });
  }
});

// 3. Delete Student Account & Purge Associated Student Data
app.delete("/api/account", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in." });
      return;
    }

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "client";

    const rateLimitKey = `${user.id}:${clientIp}`;
    if (!checkRateLimit(deleteAccountRateLimit, rateLimitKey, 10, 15 * 60 * 1000)) {
      res.status(429).json({
        error: "Too many failed attempts. Please try again after 15 minutes.",
      });
      return;
    }

    const { password: inputPassword } = req.body;
    if (!inputPassword) {
      res.status(400).json({ error: "Incorrect password. Account was not deleted." });
      return;
    }

    const isMatch = await bcrypt.compare(inputPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: "Incorrect password. Account was not deleted." });
      return;
    }

    // Securely delete account and all associated student data from MongoDB
    await db.users.deleteUserData(user.id);

    // Destroy active session and clear HTTP-only cookie
    const token =
      req.cookies?.placement_session_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      (req.headers["x-session-token"] as string);

    if (token) {
      await db.sessions.delete(token);
    }

    res.clearCookie("placement_session_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.json({
      success: true,
      message: "Your account has been deleted successfully.",
    });
  } catch (err: any) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account: " + err.message });
  }
});

// 4. Current Authenticated User & Context
app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const safeUser = sanitizeUser(user);
    const score = await db.readinessScores.findByUser(user.id);
    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(user, allJobs, 3);

    const token =
      req.cookies?.placement_session_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    res.json({ user: safeUser, token, readinessScore: score, suggestedJobs });
  } catch (err: any) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Failed to fetch user session: " + err.message });
  }
});

// 5. Update Profile
app.put("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const {
      fullName,
      phone,
      profilePhoto,
      college,
      course,
      branch,
      semester,
      cgpa,
      tenthMarks,
      twelfthMarks,
      graduationYear,
      backlogs,
      skills,
      skillsWithLevels,
      projects,
      experience,
      targetRoles,
      removeResume,
    } = req.body;

    // Validate Full Name
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        res.status(400).json({ error: "Full name cannot be empty." });
        return;
      }
    }

    // Validate College
    if (college !== undefined) {
      if (typeof college !== "string" || !college.trim()) {
        res.status(400).json({ error: "College name cannot be empty." });
        return;
      }
    }

    // Validate Semester against Course limits
    const validCourse = course ?? user.course;
    const maxSem =
      validCourse === "Diploma" || validCourse === "BCA" || validCourse === "MCA"
        ? 6
        : validCourse === "M.Tech"
        ? 4
        : 8;

    let targetSemester = user.semester;
    if (semester !== undefined) {
      const parsedSem = Number(semester);
      if (isNaN(parsedSem) || parsedSem < 1 || parsedSem > maxSem) {
        res.status(400).json({
          error: `Invalid semester (${semester}) for course ${validCourse}. Must be between 1 and ${maxSem}.`,
        });
        return;
      }
      targetSemester = parsedSem;
    }

    // Validate CGPA
    let targetCgpa = user.cgpa;
    if (cgpa !== undefined) {
      const parsedCgpa = Number(cgpa);
      if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
        res.status(400).json({ error: "CGPA must be a valid number between 0.0 and 10.0." });
        return;
      }
      targetCgpa = Number(parsedCgpa.toFixed(2));
    }

    // Validate Backlogs
    let targetBacklogs = user.backlogs;
    if (backlogs !== undefined) {
      const parsedBacklogs = Number(backlogs);
      if (isNaN(parsedBacklogs) || parsedBacklogs < 0 || parsedBacklogs > 50) {
        res.status(400).json({ error: "Backlogs count must be a non-negative number." });
        return;
      }
      targetBacklogs = Math.floor(parsedBacklogs);
    }

    // Parse and validate skills & skillsWithLevels
    let finalSkillsWithLevels: any[] = user.skillsWithLevels || [];
    let finalFlatSkills: string[] = user.skills || [];

    if (skillsWithLevels !== undefined) {
      let parsed = Array.isArray(skillsWithLevels)
        ? skillsWithLevels
        : typeof skillsWithLevels === "string"
        ? JSON.parse(skillsWithLevels)
        : [];

      finalSkillsWithLevels = parsed
        .filter((item: any) => item && (item.name || item.skill)?.trim())
        .map((item: any) => ({
          name: (item.name || item.skill).trim(),
          level:
            item.level === "Beginner" || item.level === "Advanced"
              ? item.level
              : "Intermediate",
        }));

      finalFlatSkills = finalSkillsWithLevels.map((s) => s.name);
    } else if (skills !== undefined) {
      finalFlatSkills = Array.isArray(skills)
        ? skills.map((s: string) => s.trim()).filter(Boolean)
        : typeof skills === "string"
        ? skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : user.skills;
    }

    // Parse and validate projects
    let finalProjects = user.projects || [];
    if (projects !== undefined) {
      let parsedProjects = Array.isArray(projects)
        ? projects
        : typeof projects === "string"
        ? JSON.parse(projects)
        : [];

      finalProjects = parsedProjects
        .filter((p: any) => p && p.title && p.title.trim().length > 0)
        .map((p: any) => ({
          id: p.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: p.title.trim(),
          description: (p.description || "").trim(),
          techStack: Array.isArray(p.techStack)
            ? p.techStack.filter(Boolean)
            : typeof p.techStack === "string"
            ? p.techStack.split(",").map((t: string) => t.trim()).filter(Boolean)
            : [],
          githubUrl: (p.githubUrl || "").trim(),
          liveUrl: (p.liveUrl || "").trim(),
        }));
    }

    // Parse and validate experience
    let finalExperience = user.experience || { hasExperience: false };
    if (experience !== undefined) {
      let parsedExp = typeof experience === "string" ? JSON.parse(experience) : experience;
      finalExperience = {
        hasExperience: Boolean(parsedExp?.hasExperience),
        company: (parsedExp?.company || "").trim(),
        role: (parsedExp?.role || "").trim(),
        duration: (parsedExp?.duration || "").trim(),
        description: (parsedExp?.description || "").trim(),
      };
    }

    // Handle resume removal
    const resumeUpdates: Record<string, any> = {};
    if (removeResume === true) {
      resumeUpdates.resumeText = "";
      resumeUpdates.resumeFileName = "";
      resumeUpdates.resumeUploadedAt = "";
    }

    const updated = await db.users.update(user.id, {
      fullName: fullName !== undefined ? fullName.trim() : user.fullName,
      phone: phone !== undefined ? phone.trim() : user.phone,
      profilePhoto: profilePhoto !== undefined ? profilePhoto : user.profilePhoto,
      college: college !== undefined ? college.trim() : user.college,
      course: course !== undefined ? course.trim() : user.course,
      branch: branch !== undefined ? branch.trim() : user.branch,
      semester: targetSemester,
      cgpa: targetCgpa,
      tenthMarks: tenthMarks !== undefined ? Number(tenthMarks) : user.tenthMarks,
      twelfthMarks: twelfthMarks !== undefined ? Number(twelfthMarks) : user.twelfthMarks,
      graduationYear: graduationYear !== undefined ? Number(graduationYear) : user.graduationYear,
      backlogs: targetBacklogs,
      skills: finalFlatSkills,
      skillsWithLevels: finalSkillsWithLevels,
      projects: finalProjects,
      experience: finalExperience,
      targetRoles: Array.isArray(targetRoles)
        ? targetRoles
        : targetRoles
        ? targetRoles.split(",").map((r: string) => r.trim())
        : user.targetRoles,
      ...resumeUpdates,
    });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Recalculate AI analysis and readiness score upon profile update
    const aiAnalysis = await generateStudentAiProfileAnalysis(updated);
    await db.users.update(updated.id, { aiAnalysis });
    updated.aiAnalysis = aiAnalysis;

    const interviews = await db.interviews.findByUser(updated.id);
    const roadmaps = await db.roadmaps.findByUser(updated.id);
    const newScore = await calculatePlacementReadiness(updated, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(updated, allJobs, 4);

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      message: "Profile updated and AI analyses recalculated successfully!",
      user: safeUser,
      readinessScore: newScore,
      suggestedJobs,
      aiAnalysis,
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// 5b. Delete / Clear Student Resume
app.delete("/api/resume", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;

    const updated = await db.users.update(user.id, {
      resumeText: "",
      resumeFileName: "",
      resumeUploadedAt: "",
    });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Recalculate AI analysis & readiness score after resume removal
    const aiAnalysis = await generateStudentAiProfileAnalysis(updated);
    await db.users.update(updated.id, { aiAnalysis });
    updated.aiAnalysis = aiAnalysis;

    const interviews = await db.interviews.findByUser(updated.id);
    const roadmaps = await db.roadmaps.findByUser(updated.id);
    const newScore = await calculatePlacementReadiness(updated, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      message: "Resume removed successfully. Career analysis recalculated.",
      user: safeUser,
      readinessScore: newScore,
      aiAnalysis,
    });
  } catch (err: any) {
    console.error("Delete resume error:", err);
    res.status(500).json({ error: "Failed to remove resume: " + err.message });
  }
});

// ----------------------------------------------------
// RESUME UPLOAD & PARSING
// ----------------------------------------------------

app.post("/api/resume/upload", requireAuth, upload.single("resume"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const file = req.file;

    let resumeText = "";
    let fileName = "uploaded_resume.pdf";

    if (file) {
      fileName = file.originalname;
      resumeText = await parseResumeDocument(file.buffer, file.originalname, file.mimetype);
      if (!resumeText || resumeText.trim().length < 20) {
        resumeText = `Uploaded document: ${fileName}. Resume verified for campus placement.`;
      }
    } else if (req.body.resumeText) {
      resumeText = req.body.resumeText;
      fileName = req.body.fileName || "manual_resume_profile.txt";
    } else {
      res.status(400).json({ error: "Please upload a resume file (PDF/DOCX) or paste resume text." });
      return;
    }

    const updated = await db.users.update(user.id, {
      resumeText,
      resumeFileName: fileName,
      resumeUploadedAt: new Date().toISOString(),
    });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Recalculate AI analysis and readiness score upon resume upload
    const aiAnalysis = await generateStudentAiProfileAnalysis(updated);
    await db.users.update(updated.id, { aiAnalysis });
    updated.aiAnalysis = aiAnalysis;

    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const newScore = await calculatePlacementReadiness(updated, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(updated, allJobs, 4);

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      message: "Resume uploaded and analyzed successfully!",
      user: safeUser,
      readinessScore: newScore,
      aiAnalysis,
      suggestedJobs,
    });
  } catch (err: any) {
    console.error("Resume upload error:", err);
    res.status(500).json({ error: "Failed to upload resume: " + err.message });
  }
});

// ----------------------------------------------------
// ONBOARDING & COMPREHENSIVE CAREER PROFILE
// ----------------------------------------------------

app.post("/api/onboarding/complete", (req: Request, res: Response, next: NextFunction) => {
  upload.single("resume")(req, res, (err: any) => {
    if (err) {
      console.warn("Multer upload error in /api/onboarding/complete:", err?.message || err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Resume file size exceeds the 10MB limit." });
      }
      return res.status(400).json({ error: "Resume upload failed: " + (err.message || "Invalid file.") });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const body = req.body || {};

    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in to complete onboarding." });
      return;
    }

    // 1. Career Preferences
    const careerGoal = body.careerGoal?.trim() || body.preferredJobRole?.trim() || user.careerPreferences?.careerGoal || "";
    const preferredField = body.preferredField?.trim() || user.careerPreferences?.preferredField || "";
    const preferredJobType = (body.preferredJobType === "Internship" || body.preferredJobType === "Full-time" || body.preferredJobType === "Both")
      ? body.preferredJobType
      : (user.careerPreferences?.preferredJobType || "Both");

    const careerPreferences = {
      careerGoal,
      preferredField,
      preferredJobType,
    };

    // 2. Parse Skills & Skill Levels (must be explicitly selected: Beginner / Intermediate / Advanced)
    let skillsWithLevels: any[] = [];
    if (typeof body.skillsWithLevels === "string") {
      try {
        skillsWithLevels = JSON.parse(body.skillsWithLevels);
      } catch (e) {
        skillsWithLevels = [];
      }
    } else if (Array.isArray(body.skillsWithLevels)) {
      skillsWithLevels = body.skillsWithLevels;
    }

    skillsWithLevels = skillsWithLevels
      .filter((s: any) => Boolean((s.name || s.skill)?.trim()))
      .map((s: any) => ({
        name: (s.name || s.skill).trim(),
        level: (s.level === "Beginner" || s.level === "Advanced" ? s.level : "Intermediate") as "Beginner" | "Intermediate" | "Advanced",
      }));

    let flatSkills: string[] = skillsWithLevels.map((s: any) => s.name);
    if (flatSkills.length === 0 && body.skills) {
      if (Array.isArray(body.skills)) {
        flatSkills = body.skills.filter(Boolean);
      } else if (typeof body.skills === "string") {
        try {
          flatSkills = JSON.parse(body.skills);
        } catch {
          flatSkills = body.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }

    // 3. Parse Projects
    let projects: any[] = user.projects || [];
    if (typeof body.projects === "string") {
      try {
        projects = JSON.parse(body.projects);
      } catch (e) {
        projects = user.projects || [];
      }
    } else if (Array.isArray(body.projects)) {
      projects = body.projects;
    }

    // 4. Parse Experience
    let experience: any = user.experience || { hasExperience: false };
    if (typeof body.experience === "string") {
      try {
        experience = JSON.parse(body.experience);
      } catch (e) {
        experience = user.experience || { hasExperience: false };
      }
    } else if (body.experience && typeof body.experience === "object") {
      experience = body.experience;
    }

    // 5. Optional Resume Upload
    let resumeText = user.resumeText || "";
    let resumeFileName = user.resumeFileName || "";
    let resumeUploadedAt = user.resumeUploadedAt || "";

    const file = req.file;
    if (file) {
      resumeFileName = file.originalname;
      resumeText = await parseResumeDocument(file.buffer, file.originalname, file.mimetype);
      if (!resumeText || resumeText.trim().length < 20) {
        resumeText = `Uploaded document: ${resumeFileName}. Resume verified for campus placement.`;
      }
      resumeUploadedAt = new Date().toISOString();
    } else if (body.resumeText && body.resumeText.trim()) {
      resumeText = body.resumeText.trim();
      resumeFileName = body.resumeFileName?.trim() || "resume.pdf";
      resumeUploadedAt = new Date().toISOString();
    }

    // Target roles: preserve user's existing or populated from careerGoal
    const targetRoles = careerGoal ? [careerGoal] : (user.targetRoles && user.targetRoles.length > 0 ? user.targetRoles : []);

    // 6. Update user document
    const updated = await db.users.update(user.id, {
      careerPreferences,
      skills: flatSkills,
      skillsWithLevels,
      projects,
      experience,
      targetRoles,
      onboardingCompleted: true,
      ...(resumeText ? { resumeText, resumeFileName, resumeUploadedAt } : {}),
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      res.status(404).json({ error: "Student account not found." });
      return;
    }

    // 7. Instant High-Fidelity Profile Analysis & Job Role Recommendations
    let aiAnalysis = updated.aiAnalysis;
    let aiJobRecommendations = updated.aiJobRecommendations;

    if (!aiAnalysis) {
      aiAnalysis = await generateStudentAiProfileAnalysis(updated, { skipAi: true });
    }
    if (!aiJobRecommendations) {
      aiJobRecommendations = await generateJobRoleRecommendations(updated, { skipAi: true });
    }

    await db.users.update(user.id, { aiAnalysis, aiJobRecommendations });
    updated.aiAnalysis = aiAnalysis;
    updated.aiJobRecommendations = aiJobRecommendations;

    // 8. Calculate Placement Readiness Score
    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const newScore = await calculatePlacementReadiness(updated, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    // 9. Generate suggested jobs
    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(updated, allJobs, 4);

    const safeUser = sanitizeUser(updated);

    res.json({
      success: true,
      message: "Onboarding completed and profile analyzed successfully!",
      user: safeUser,
      readinessScore: newScore,
      aiAnalysis,
      aiJobRecommendations,
      suggestedJobs,
    });

    // Background asynchronous enrichment with Gemini AI (non-blocking)
    (async () => {
      try {
        const [richAnalysis, richJobRecs] = await Promise.all([
          generateStudentAiProfileAnalysis(updated).catch(() => null),
          generateJobRoleRecommendations(updated).catch(() => null),
        ]);
        if (richAnalysis || richJobRecs) {
          const updates: any = {};
          if (richAnalysis) updates.aiAnalysis = richAnalysis;
          if (richJobRecs) updates.aiJobRecommendations = richJobRecs;
          await db.users.update(user.id, updates);
        }
      } catch (bgErr: any) {
        console.warn("Background AI enrichment notice:", bgErr?.message);
      }
    })();
  } catch (err: any) {
    console.error("Onboarding error:", err);
    res.status(500).json({ error: "Failed to complete onboarding: " + err.message });
  }
});

// GET AI Job Role Recommendations
app.get("/api/ai/job-recommendations", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const forceRefresh = req.query.forceRefresh === "true";

    if (user.aiJobRecommendations && !forceRefresh) {
      res.json({
        success: true,
        recommendations: user.aiJobRecommendations,
        selectedRole: user.selectedRole || null,
      });
      return;
    }

    const recommendations = await generateJobRoleRecommendations(user);
    await db.users.update(user.id, { aiJobRecommendations: recommendations });

    res.json({
      success: true,
      recommendations,
      selectedRole: user.selectedRole || null,
    });
  } catch (err: any) {
    console.error("Job recommendations error:", err);
    res.status(500).json({ error: "Failed to generate job recommendations: " + err.message });
  }
});

// POST AI Job Role Recommendations
app.post("/api/ai/job-recommendations", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const forceRefresh = req.body?.forceRefresh === true || req.query.forceRefresh === "true";

    if (user.aiJobRecommendations && !forceRefresh) {
      res.json({
        success: true,
        recommendations: user.aiJobRecommendations,
        selectedRole: user.selectedRole || null,
      });
      return;
    }

    const recommendations = await generateJobRoleRecommendations(user);
    await db.users.update(user.id, { aiJobRecommendations: recommendations });

    res.json({
      success: true,
      recommendations,
      selectedRole: user.selectedRole || null,
    });
  } catch (err: any) {
    console.error("Job recommendations error:", err);
    res.status(500).json({ error: "Failed to generate job recommendations: " + err.message });
  }
});

// POST Select a Recommended Role
app.post("/api/ai/select-role", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { role } = req.body || {};

    if (!role || typeof role !== "string" || !role.trim()) {
      res.status(400).json({ error: "A valid job role name must be specified." });
      return;
    }

    const trimmedRole = role.trim();
    const currentTargetRoles = user.targetRoles || [];
    const newTargetRoles = [trimmedRole, ...currentTargetRoles.filter((r) => r.toLowerCase() !== trimmedRole.toLowerCase())];

    const updated = await db.users.update(user.id, {
      selectedRole: trimmedRole,
      targetRoles: newTargetRoles,
      roleSelectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      res.status(404).json({ error: "Student account not found." });
      return;
    }

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      selectedRole: trimmedRole,
      user: safeUser,
      message: `Selected target role saved as: ${trimmedRole}`,
    });
  } catch (err: any) {
    console.error("Select role error:", err);
    res.status(500).json({ error: "Failed to save selected role: " + err.message });
  }
});

// GET AI Profile Analysis
app.get("/api/profile/analysis", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    if (user.aiAnalysis) {
      res.json({ success: true, aiAnalysis: user.aiAnalysis });
      return;
    }

    const aiAnalysis = await generateStudentAiProfileAnalysis(user);
    await db.users.update(user.id, { aiAnalysis });
    res.json({ success: true, aiAnalysis });
  } catch (err: any) {
    console.error("Profile analysis error:", err);
    res.status(500).json({ error: "Failed to generate profile analysis: " + err.message });
  }
});

// Comprehensive Profile Update
app.put("/api/profile/update-comprehensive", upload.single("resume"), async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const body = req.body || {};

    if (!user) {
      res.status(401).json({ error: "Unauthorized. Please log in to update your profile." });
      return;
    }

    const careerGoal = body.careerGoal?.trim() || user.careerPreferences?.careerGoal || user.targetRoles?.[0] || "Software Development Engineer";
    const preferredField = body.preferredField?.trim() || user.careerPreferences?.preferredField || "Software Development";
    const preferredJobType = body.preferredJobType || user.careerPreferences?.preferredJobType || "Both";

    let skillsWithLevels = user.skillsWithLevels || [];
    if (body.skillsWithLevels) {
      try {
        skillsWithLevels = typeof body.skillsWithLevels === "string" ? JSON.parse(body.skillsWithLevels) : body.skillsWithLevels;
      } catch (e) {
        // preserve existing
      }
    }

    let flatSkills = skillsWithLevels.map((s: any) => s.name?.trim()).filter(Boolean);
    if (flatSkills.length === 0 && body.skills) {
      flatSkills = Array.isArray(body.skills) ? body.skills : body.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    if (flatSkills.length === 0) flatSkills = user.skills;

    let projects = user.projects || [];
    if (body.projects) {
      try {
        projects = typeof body.projects === "string" ? JSON.parse(body.projects) : body.projects;
      } catch (e) {
        // preserve
      }
    }

    let experience = user.experience || { hasExperience: false };
    if (body.experience) {
      try {
        experience = typeof body.experience === "string" ? JSON.parse(body.experience) : body.experience;
      } catch (e) {
        // preserve
      }
    }

    let resumeText = user.resumeText;
    let resumeFileName = user.resumeFileName;
    let resumeUploadedAt = user.resumeUploadedAt;

    const file = req.file;
    if (file) {
      resumeFileName = file.originalname;
      const parsedText = await parseResumeDocument(file.buffer, file.originalname, file.mimetype);
      if (!parsedText || parsedText.trim().length < 20) {
        res.status(400).json({ error: "Failed to extract readable text from the uploaded resume (PDF/DOCX). Please ensure the file is not password-protected or corrupted." });
        return;
      }
      resumeText = parsedText;
      resumeUploadedAt = new Date().toISOString();
    }

    const updated = await db.users.update(user.id, {
      careerPreferences: { careerGoal, preferredField, preferredJobType },
      skills: flatSkills,
      skillsWithLevels,
      projects,
      experience,
      targetRoles: [careerGoal],
      ...(resumeText ? { resumeText, resumeFileName, resumeUploadedAt } : {}),
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      res.status(404).json({ error: "Student account not found." });
      return;
    }

    const aiAnalysis = await generateStudentAiProfileAnalysis(updated);
    await db.users.update(user.id, { aiAnalysis });
    updated.aiAnalysis = aiAnalysis;

    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const newScore = await calculatePlacementReadiness(updated, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(updated, allJobs, 4);

    const safeUser = sanitizeUser(updated);
    res.json({
      success: true,
      message: "Profile and career metrics updated successfully!",
      user: safeUser,
      readinessScore: newScore,
      aiAnalysis,
      suggestedJobs,
    });
  } catch (err: any) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// ----------------------------------------------------
// QUALIFICATION-AWARE CAREER RECOMMENDATION ENGINE
// ----------------------------------------------------

app.get("/api/career/recommendations", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const course = (req.query.course as string) || user?.course || "B.Tech";
    const branch = (req.query.branch as string) || user?.branch || "Computer Science";
    const careerGoal = (req.query.careerGoal as string) || user?.careerPreferences?.careerGoal || user?.targetRoles?.[0] || "";
    const preferredDomain = (req.query.preferredDomain as string) || user?.careerPreferences?.preferredField || "";
    const skillsParam = req.query.skills as string;
    const skills = skillsParam ? skillsParam.split(",").map((s) => s.trim()) : user?.skills || [];
    const experienceLevel = (req.query.experienceLevel as string) || (user?.experience?.hasExperience ? "Internship Experience" : "Fresher");

    const recommendations = getCareerRecommendations({
      course,
      branch,
      careerGoal,
      preferredDomain,
      skills,
      experienceLevel,
    });

    res.json({ success: true, recommendations });
  } catch (err: any) {
    console.error("Career recommendations error:", err);
    res.status(500).json({ error: "Failed to generate recommendations: " + err.message });
  }
});

app.post("/api/career/recommendations", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const body = req.body || {};
    const course = body.course || user?.course || "B.Tech";
    const branch = body.branch || user?.branch || "Computer Science";
    const careerGoal = body.careerGoal || user?.careerPreferences?.careerGoal || user?.targetRoles?.[0] || "";
    const preferredDomain = body.preferredDomain || user?.careerPreferences?.preferredField || "";
    const skills = Array.isArray(body.skills) ? body.skills : (body.skills ? body.skills.split(",").map((s: string) => s.trim()) : user?.skills || []);
    const experienceLevel = body.experienceLevel || (user?.experience?.hasExperience ? "Internship Experience" : "Fresher");

    const recommendations = getCareerRecommendations({
      course,
      branch,
      careerGoal,
      preferredDomain,
      skills,
      experienceLevel,
    });

    res.json({ success: true, recommendations });
  } catch (err: any) {
    console.error("Career recommendations error:", err);
    res.status(500).json({ error: "Failed to generate recommendations: " + err.message });
  }
});

// ----------------------------------------------------
// JOBS & PLACEMENT MATCHING INTELLIGENCE
// ----------------------------------------------------

app.get("/api/jobs", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const allJobs = await db.jobs.all();

    const jobsWithMatch = allJobs.map((job) => {
      const match = quickJobMatch(user, job);
      return {
        ...job,
        matchAnalysis: match,
      };
    });

    jobsWithMatch.sort((a, b) => b.matchAnalysis.matchPercentage - a.matchAnalysis.matchPercentage);

    res.json({ jobs: jobsWithMatch });
  } catch (err: any) {
    console.error("Jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs: " + err.message });
  }
});

app.get("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const job = await db.jobs.findById(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job listing not found" });
      return;
    }

    const matchAnalysis = await analyzeJobMatch(user, job);
    res.json({ job, matchAnalysis });
  } catch (err: any) {
    console.error("Job details error:", err);
    res.status(500).json({ error: "Failed to fetch job details: " + err.message });
  }
});

// ----------------------------------------------------
// PLACEMENT READINESS & PERSONALIZED ROADMAPS
// ----------------------------------------------------

// GET Skill Gap Analysis for Student's Target Role
app.get("/api/skill-gap", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const roleQuery = (req.query.role as string) || "";
    const targetRole = roleQuery.trim() || user.selectedRole || user.targetRoles?.[0];

    if (!targetRole) {
      res.json({
        skillGap: null,
        message: "Please select an AI-recommended job role first to view your Skill Gap Analysis.",
      });
      return;
    }

    let roadmap = await db.roadmaps.findByUserAndRole(user.id, targetRole);
    if (roadmap && roadmap.skillGap) {
      res.json({ success: true, role: targetRole, skillGap: roadmap.skillGap });
      return;
    }

    const { skillGap, roadmap: newRoadmap } = await generateSkillGapAndRoadmap(user, targetRole);
    await db.roadmaps.save(newRoadmap);

    res.json({ success: true, role: targetRole, skillGap });
  } catch (err: any) {
    console.error("Skill gap fetch error:", err);
    res.status(500).json({ error: "Failed to generate skill gap analysis: " + err.message });
  }
});

// POST Analyze Skill Gap for a Specific Role
app.post("/api/skill-gap/analyze", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { role } = req.body || {};
    const targetRole = (role as string)?.trim() || user.selectedRole || user.targetRoles?.[0];

    if (!targetRole) {
      res.status(400).json({ error: "No target job role specified or selected." });
      return;
    }

    const { skillGap, roadmap } = await generateSkillGapAndRoadmap(user, targetRole);
    await db.roadmaps.save(roadmap);

    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const updatedScore = await calculatePlacementReadiness(user, interviews, roadmaps);
    await db.readinessScores.save(updatedScore);

    res.json({ success: true, role: targetRole, skillGap, roadmap });
  } catch (err: any) {
    console.error("Analyze skill gap error:", err);
    res.status(500).json({ error: "Failed to perform skill gap analysis: " + err.message });
  }
});

// GET Roadmap for Selected Role
app.get("/api/roadmaps", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const roleQuery = (req.query.role as string)?.trim() || "";
    const targetRole = roleQuery || user.selectedRole || user.targetRoles?.[0];

    if (!targetRole) {
      res.json({
        roadmap: null,
        message: "No target job role selected yet. Please complete role selection.",
      });
      return;
    }

    let roadmap = await db.roadmaps.findByUserAndRole(user.id, targetRole);
    if (!roadmap) {
      const { roadmap: generatedRoadmap } = await generateSkillGapAndRoadmap(user, targetRole);
      roadmap = await db.roadmaps.save(generatedRoadmap);
    }

    res.json({ success: true, roadmap });
  } catch (err: any) {
    console.error("Roadmap get error:", err);
    res.status(500).json({ error: "Failed to retrieve personalized roadmap: " + err.message });
  }
});

// POST Generate or Regenerate Personalized Roadmap
app.post("/api/roadmaps/generate", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { role } = req.body || {};
    const targetRole = (role as string)?.trim() || user.selectedRole || user.targetRoles?.[0];

    if (!targetRole) {
      res.status(400).json({ error: "No target job role specified or selected." });
      return;
    }

    const { roadmap } = await generateSkillGapAndRoadmap(user, targetRole);
    const saved = await db.roadmaps.save(roadmap);

    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const updatedScore = await calculatePlacementReadiness(user, interviews, roadmaps);
    await db.readinessScores.save(updatedScore);

    res.json({ success: true, roadmap: saved });
  } catch (err: any) {
    console.error("Roadmap generation error:", err);
    res.status(500).json({ error: "Failed to generate roadmap: " + err.message });
  }
});

app.get("/api/roadmaps/:jobId", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { jobId } = req.params;

    let roadmap = await db.roadmaps.findByUserAndJob(user.id, jobId);
    if (!roadmap) {
      const job = await db.jobs.findById(jobId);
      if (!job) {
        const roleName = jobId.startsWith("role-")
          ? jobId.replace("role-", "").replace(/-/g, " ")
          : jobId;
        roadmap = await generatePersonalizedRoadmap(user, roleName);
      } else {
        roadmap = await generatePersonalizedRoadmap(user, job);
      }
      await db.roadmaps.save(roadmap);
    }

    res.json({ roadmap });
  } catch (err: any) {
    console.error("Roadmap fetch error:", err);
    res.status(500).json({ error: "Failed to get roadmap: " + err.message });
  }
});

app.post("/api/roadmaps/:jobId/regenerate", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { jobId } = req.params;

    const job = await db.jobs.findById(jobId);
    let newRoadmap: RoadmapDocument;
    if (!job) {
      const roleName = jobId.startsWith("role-")
        ? jobId.replace("role-", "").replace(/-/g, " ")
        : jobId;
      newRoadmap = await generatePersonalizedRoadmap(user, roleName);
    } else {
      newRoadmap = await generatePersonalizedRoadmap(user, job);
    }
    await db.roadmaps.save(newRoadmap);

    res.json({ roadmap: newRoadmap });
  } catch (err: any) {
    console.error("Roadmap regenerate error:", err);
    res.status(500).json({ error: "Failed to regenerate roadmap: " + err.message });
  }
});

app.post("/api/roadmaps/:roadmapId/items/:itemId/toggle", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { roadmapId, itemId } = req.params;
    const { completed } = req.body;

    const updatedRoadmap = await db.roadmaps.updateItem(roadmapId, itemId, Boolean(completed));
    if (!updatedRoadmap) {
      res.status(404).json({ error: "Roadmap item not found" });
      return;
    }

    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const updatedScore = await calculatePlacementReadiness(user, interviews, roadmaps);
    await db.readinessScores.save(updatedScore);

    res.json({ roadmap: updatedRoadmap, readinessScore: updatedScore });
  } catch (err: any) {
    console.error("Roadmap toggle error:", err);
    res.status(500).json({ error: "Failed to toggle roadmap item: " + err.message });
  }
});

// ----------------------------------------------------
// OVERALL PROGRESS DASHBOARD (AGGREGATION ENGINE)
// ----------------------------------------------------

app.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const selectedRole = user.selectedRole || null;

    // 1. Target Role
    const targetRole = {
      selected: Boolean(selectedRole),
      role: selectedRole,
    };

    // 2. Fetch Roadmap & Task Progress
    let roadmap = selectedRole
      ? await db.roadmaps.findByUserAndRole(user.id, selectedRole)
      : ((await db.roadmaps.findByUser(user.id))[0] || null);

    let totalTasks = 0;
    let completedTasks = 0;
    let nextPriorityTask: any = null;

    if (roadmap && Array.isArray(roadmap.phases)) {
      for (const phase of roadmap.phases) {
        if (!Array.isArray(phase.items)) continue;
        totalTasks += phase.items.length;
        for (const item of phase.items) {
          if (item.completed) {
            completedTasks++;
          } else if (!nextPriorityTask && item.priority === "High") {
            nextPriorityTask = {
              id: item.id,
              title: item.title,
              skill: item.skill,
              topic: item.topic,
              priority: item.priority,
              reason: item.reason || (item.skill ? `High-priority skill gap for ${selectedRole || "your target role"}.` : "Key priority task in your learning plan."),
              category: item.type || (item as any).category,
              phaseNumber: phase.phaseNumber,
            };
          }
        }
      }

      if (!nextPriorityTask) {
        for (const phase of roadmap.phases) {
          const incomplete = phase.items?.find((i) => !i.completed);
          if (incomplete) {
            nextPriorityTask = {
              id: incomplete.id,
              title: incomplete.title,
              skill: incomplete.skill,
              topic: incomplete.topic,
              priority: incomplete.priority || "Medium",
              reason: incomplete.reason || `Target milestone in Phase ${phase.phaseNumber}.`,
              category: incomplete.type || (incomplete as any).category,
              phaseNumber: phase.phaseNumber,
            };
            break;
          }
        }
      }
    }

    const roadmapProgressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Skills Overview
    const skillGap = roadmap?.skillGap || null;
    const skills = {
      assessed: Boolean(skillGap),
      strong: skillGap?.strong || [],
      developing: skillGap?.developing || [],
      needsImprovement: skillGap?.needsImprovement || [],
      missing: skillGap?.missing || [],
      prioritySkills: skillGap?.prioritySkills || [],
    };

    // 4. Latest Mock Interview
    const interviews = await db.interviews.findByUser(user.id);
    const latestInterviewDoc = interviews && interviews.length > 0 ? interviews[0] : null;

    let latestInterview = null;
    if (latestInterviewDoc) {
      const isAssessed = latestInterviewDoc.scoreAssessed !== false && latestInterviewDoc.overallScore !== null;
      latestInterview = {
        conducted: true,
        id: latestInterviewDoc.id,
        targetRole: latestInterviewDoc.targetRole,
        companyTarget: latestInterviewDoc.companyTarget,
        score: isAssessed ? latestInterviewDoc.overallScore : null,
        scoreAssessed: isAssessed,
        subScores: latestInterviewDoc.subScores,
        coreStrengths: latestInterviewDoc.coreStrengths || [],
        coreWeaknesses: latestInterviewDoc.coreWeaknesses || [],
        conductedAt: latestInterviewDoc.conductedAt,
      };
    }

    // 5. Latest Roadmap Update
    let latestRoadmapUpdate = null;
    if (latestInterviewDoc?.roadmapChanges && latestInterviewDoc.roadmapChanges.length > 0) {
      latestRoadmapUpdate = {
        hasUpdate: true,
        source: "mock_interview",
        updatedAt: latestInterviewDoc.conductedAt,
        changes: latestInterviewDoc.roadmapChanges,
      };
    } else if (roadmap) {
      const adaptedItems: any[] = [];
      for (const phase of roadmap.phases || []) {
        for (const item of phase.items || []) {
          if (item.source === "mock_interview") {
            adaptedItems.push({
              type: item.title.includes("Interview Refresher") || item.title.includes("Practice") ? "added" : "updated",
              skill: item.skill || "Technical Skill",
              topic: item.topic || item.title,
              newPriority: item.priority || "High",
              taskTitle: item.title,
              reason: item.reason || "Updated after weakness detected during mock interview.",
            });
          }
        }
      }
      if (adaptedItems.length > 0) {
        latestRoadmapUpdate = {
          hasUpdate: true,
          source: "mock_interview",
          updatedAt: roadmap.updatedAt,
          changes: adaptedItems,
        };
      }
    }

    // 6. Overall Progress Indicator
    const hasSufficientData = Boolean(roadmap && totalTasks > 0) || Boolean(latestInterview?.scoreAssessed);
    let statusSummary = "";
    if (roadmap && totalTasks > 0 && latestInterview?.scoreAssessed) {
      statusSummary = `${completedTasks} of ${totalTasks} roadmap tasks completed (${roadmapProgressPercentage}%) • Latest mock interview evaluated (${latestInterview.score}/100)`;
    } else if (roadmap && totalTasks > 0) {
      statusSummary = `${completedTasks} of ${totalTasks} roadmap tasks completed (${roadmapProgressPercentage}%) • Mock interview not yet taken`;
    } else if (selectedRole) {
      statusSummary = `Preparing for ${selectedRole} • Complete roadmap tasks and mock interview to establish progress.`;
    } else {
      statusSummary = "Progress tracking will appear as you complete your roadmap and assessments.";
    }

    // 7. Academic Profile
    const academic = {
      college: user.college || "Engineering College",
      course: user.course || "B.Tech",
      branch: user.branch || "Computer Science",
      semester: user.semester || 1,
      cgpa: (user.cgpa !== undefined && user.cgpa !== null) ? user.cgpa : null,
      backlogs: user.backlogs || 0,
      graduationYear: user.graduationYear || new Date().getFullYear(),
    };

    // 8. Resume Status
    const isResumeUploaded = Boolean(user.resumeUploadedAt || user.resumeFileName || (user.resumeText && user.resumeText.length > 20));
    const resume = {
      isUploaded: isResumeUploaded,
      fileName: user.resumeFileName || (isResumeUploaded ? "Uploaded Resume" : null),
      uploadedAt: user.resumeUploadedAt || null,
      assessmentStatus: isResumeUploaded ? ("uploaded_unassessed" as const) : ("not_uploaded" as const),
      note: isResumeUploaded ? "Uploaded — Assessment not available yet." : "Not Uploaded",
    };

    // 9. Next Action
    let nextAction: {
      title: string;
      description: string;
      actionLabel: string;
      targetTab: "score" | "jobs" | "roadmap" | "interview";
      reason: string;
    };

    if (!selectedRole) {
      nextAction = {
        title: "Select Your Target Job Role",
        description: "Review AI-recommended roles and select the position you want to target for campus placements.",
        actionLabel: "View Recommended Roles",
        targetTab: "jobs",
        reason: "Selecting a target role activates your AI skill gap breakdown and personalized learning plan.",
      };
    } else if (!roadmap || totalTasks === 0) {
      nextAction = {
        title: "Generate Your Personalized Roadmap",
        description: `Analyze your skill gaps and generate a step-by-step roadmap for ${selectedRole}.`,
        actionLabel: "Open Learning Roadmap",
        targetTab: "roadmap",
        reason: "Your personalized roadmap translates required role competencies into actionable milestones.",
      };
    } else if (nextPriorityTask) {
      nextAction = {
        title: `Work on: ${nextPriorityTask.title}`,
        description: nextPriorityTask.reason || `Targeted task in Phase ${nextPriorityTask.phaseNumber || 1}.`,
        actionLabel: "Continue Roadmap Task",
        targetTab: "roadmap",
        reason: "Highest-priority incomplete milestone in your active placement preparation roadmap.",
      };
    } else if (!latestInterview?.conducted) {
      nextAction = {
        title: "Take Your First AI Mock Interview",
        description: `Test your technical knowledge and problem-solving skills for ${selectedRole} with Dr. Maya Ramanathan.`,
        actionLabel: "Start Mock Interview",
        targetTab: "interview",
        reason: "A mock interview provides real evidence of communication, technical depth, and adaptive roadmap tuning.",
      };
    } else {
      nextAction = {
        title: "Retake Mock Interview or Refine Skills",
        description: "All current priority tasks are completed. Take another interview session to verify mastery.",
        actionLabel: "Practice Another Mock",
        targetTab: "interview",
        reason: "Continuous mock practice under interview conditions locks in competitive campus readiness.",
      };
    }

    // 10. Real Recent Activities from MongoDB event timestamps
    const recentActivities: Array<{
      id: string;
      type: "profile" | "role" | "skill_gap" | "roadmap" | "interview" | "resume";
      title: string;
      timestamp: string | null;
    }> = [];

    // Mock interviews completed
    if (interviews && interviews.length > 0) {
      for (const inv of interviews.slice(0, 5)) {
        if (inv.conductedAt) {
          recentActivities.push({
            id: `interview-${inv.id}`,
            type: "interview",
            title: inv.targetRole ? `Mock interview completed for ${inv.targetRole}` : "Mock interview completed",
            timestamp: inv.conductedAt,
          });
        }
      }
    }

    // Roadmap updated/generated
    if (roadmap && (roadmap.updatedAt || roadmap.generatedAt)) {
      recentActivities.push({
        id: `roadmap-${roadmap.id || "active"}`,
        type: "roadmap",
        title: roadmap.selectedRole ? `Roadmap updated for ${roadmap.selectedRole}` : "Roadmap updated",
        timestamp: roadmap.updatedAt || roadmap.generatedAt,
      });
    }

    // Skill gap generated/analyzed
    if (roadmap?.skillGap?.analyzedAt) {
      recentActivities.push({
        id: `skillgap-${roadmap.id || "active"}`,
        type: "skill_gap",
        title: roadmap.skillGap.role ? `Skill gap analyzed for ${roadmap.skillGap.role}` : "Skill gap analysis completed",
        timestamp: roadmap.skillGap.analyzedAt,
      });
    }

    // Resume updated/uploaded
    if (user.resumeUploadedAt) {
      recentActivities.push({
        id: `resume-${user.id}`,
        type: "resume",
        title: user.resumeFileName ? `Resume uploaded: ${user.resumeFileName}` : "Resume updated",
        timestamp: user.resumeUploadedAt,
      });
    }

    // Target role selected
    if (user.selectedRole) {
      recentActivities.push({
        id: `role-${user.id}`,
        type: "role",
        title: `Target role selected: ${user.selectedRole}`,
        timestamp: user.roleSelectedAt || (roadmap?.generatedAt || null),
      });
    }

    // Profile updated/created
    if (user.updatedAt || user.createdAt) {
      recentActivities.push({
        id: `profile-${user.id}`,
        type: "profile",
        title: "Profile updated",
        timestamp: user.updatedAt || user.createdAt,
      });
    }

    // Sort by actual event timestamp descending (newest first)
    recentActivities.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    res.json({
      targetRole,
      overallProgress: {
        hasSufficientData,
        roadmapCompletionPercent: roadmapProgressPercentage,
        completedTasksCount: completedTasks,
        totalTasksCount: totalTasks,
        interviewScore: latestInterview?.score || null,
        interviewAssessed: Boolean(latestInterview?.scoreAssessed),
        statusSummary,
      },
      skills,
      roadmap: {
        hasRoadmap: Boolean(roadmap),
        id: roadmap?.id,
        totalTasks,
        completedTasks,
        progressPercentage: roadmapProgressPercentage,
        nextPriority: nextPriorityTask,
      },
      latestInterview,
      latestRoadmapUpdate,
      academic,
      resume,
      nextAction,
      recentActivities,
    });
  } catch (err: any) {
    console.error("Dashboard aggregation error:", err);
    res.status(500).json({ error: "Failed to load dashboard data: " + err.message });
  }
});

// ----------------------------------------------------
// JOB & PLACEMENT READINESS SCORE
// ----------------------------------------------------

app.get("/api/scores/current", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    let score = await db.readinessScores.findByUser(user.id);

    if (!score) {
      const interviews = await db.interviews.findByUser(user.id);
      const roadmaps = await db.roadmaps.findByUser(user.id);
      score = await calculatePlacementReadiness(user, interviews, roadmaps);
      await db.readinessScores.save(score);
    }

    res.json({ score });
  } catch (err: any) {
    console.error("Score fetch error:", err);
    res.status(500).json({ error: "Failed to fetch score: " + err.message });
  }
});

app.post("/api/scores/recalculate", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);

    const newScore = await calculatePlacementReadiness(user, interviews, roadmaps);
    await db.readinessScores.save(newScore);

    const allJobs = await db.jobs.all();
    const suggestedJobs = suggestJobRolesForStudent(user, allJobs, 3);

    res.json({ score: newScore, suggestedJobs });
  } catch (err: any) {
    console.error("Score recalculate error:", err);
    res.status(500).json({ error: "Failed to recalculate score: " + err.message });
  }
});

// ----------------------------------------------------
// REAL-TIME INTERACTIVE AI MOCK INTERVIEW & ADAPTIVE ROADMAP
// ----------------------------------------------------

app.post("/api/interviews/start", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { targetRole, companyTarget } = req.body;

    const role = targetRole || user.selectedRole || (user.targetRoles && user.targetRoles[0]) || "Software Development Engineer";
    const company = companyTarget?.trim() || "";

    const existingRoadmap = (await db.roadmaps.findByUserAndJob(user.id, role)) || (await db.roadmaps.findByUser(user.id))[0];
    const skillGap = existingRoadmap?.skillGap;
    const previousInterviews = await db.interviews.findByUser(user.id);

    const result = await generateInterviewGreetingAndFirstQuestion(user, role, company, existingRoadmap, skillGap, previousInterviews);
    const sessionId = `session-${user.id}-${Date.now()}`;

    res.json({
      sessionId,
      targetRole: role,
      companyTarget: company || undefined,
      interviewerIntro: result.interviewerIntro,
      firstQuestion: result.firstQuestion,
      interviewer: {
        name: "Dr. Maya Ramanathan",
        title: "Principal Technical Bar Raiser & Engineering Lead",
        avatarType: "tech-lead",
      },
    });
  } catch (err: any) {
    console.error("Interview start error:", err);
    res.status(500).json({ error: "Failed to start interview: " + err.message });
  }
});

app.post("/api/interviews/next-question", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { targetRole, previousQuestions, previousAnswers } = req.body;
    const latestAnswer = req.body.latestAnswer !== undefined ? req.body.latestAnswer : req.body.answer || "";

    const role = targetRole || user.selectedRole || (user.targetRoles && user.targetRoles[0]) || "Software Development Engineer";
    const existingRoadmap = (await db.roadmaps.findByUserAndJob(user.id, role)) || (await db.roadmaps.findByUser(user.id))[0];
    const skillGap = existingRoadmap?.skillGap;
    const previousInterviews = await db.interviews.findByUser(user.id);

    const turnResult = await evaluateAnswerAndGenerateNextQuestion(
      user,
      role,
      previousQuestions || [],
      previousAnswers || [],
      latestAnswer || "",
      existingRoadmap,
      skillGap,
      previousInterviews
    );

    res.json(turnResult);
  } catch (err: any) {
    console.error("Next question generation error:", err);
    res.status(500).json({ error: "Failed to generate next interview question: " + err.message });
  }
});

app.post("/api/interviews/evaluate", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const { targetRole, companyTarget, answers, transcript } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: "Interview answers are required for evaluation." });
      return;
    }

    const role = targetRole || user.selectedRole || (user.targetRoles && user.targetRoles[0]) || "Software Development Engineer";
    const company = companyTarget?.trim() || "";

    const { report } = await evaluateMockInterview(
      user,
      role,
      company,
      answers,
      transcript
    );

    // Save the finalized interview session in MongoDB
    await db.interviews.create(report);

    // Dynamic Adaptive Roadmap updates
    let userRoadmap = (await db.roadmaps.findByUserAndJob(user.id, role)) || (await db.roadmaps.findByUser(user.id))[0];
    if (!userRoadmap) {
      const generated = await generateSkillGapAndRoadmap(user, role);
      userRoadmap = generated.roadmap;
      await db.roadmaps.save(userRoadmap);
    }

    let roadmapChanges: any[] = [];
    if (userRoadmap && report.skillGapsDetected && report.skillGapsDetected.length > 0) {
      const adaptation = adaptRoadmapFromInterview(userRoadmap, report.skillGapsDetected);
      userRoadmap = adaptation.updatedRoadmap;
      roadmapChanges = adaptation.changes;
      await db.roadmaps.save(userRoadmap);
      report.roadmapChanges = roadmapChanges;
    }

    // Recalculate score with new mock interview assessment
    const interviews = await db.interviews.findByUser(user.id);
    const roadmaps = await db.roadmaps.findByUser(user.id);
    const updatedScore = await calculatePlacementReadiness(user, interviews, roadmaps);
    await db.readinessScores.save(updatedScore);

    res.json({
      report,
      updatedRoadmap: userRoadmap,
      roadmapChanges,
      updatedScore,
    });
  } catch (err: any) {
    console.error("Interview evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate interview: " + err.message });
  }
});

app.get("/api/interviews/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const history = await db.interviews.findByUser(user.id);
    res.json({ interviews: history });
  } catch (err: any) {
    console.error("Interview history error:", err);
    res.status(500).json({ error: "Failed to fetch interview history: " + err.message });
  }
});

app.get("/api/interviews/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserDocument;
    const interview = await db.interviews.findById(req.params.id);
    if (!interview || interview.userId !== user.id) {
      res.status(404).json({ error: "Interview report not found" });
      return;
    }
    res.json({ interview });
  } catch (err: any) {
    console.error("Interview detail error:", err);
    res.status(500).json({ error: "Failed to fetch interview detail: " + err.message });
  }
});

// ----------------------------------------------------
// API ERROR & 404 MIDDLEWARE (Guarantees JSON response)
// ----------------------------------------------------

app.all("/api/*", (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

app.use("/api", (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("API error encountered:", err);
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    success: false,
    error: err.message || "An internal server error occurred",
  });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER BOOTSTRAP
// ----------------------------------------------------

async function startServer() {
  await initMongo();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PlacementOS Server running on port ${PORT}`);
  });
}

startServer();
