import { User, ReadinessScore, SuggestedJobRole } from "../types";

export interface AuthResponse {
  user: User;
  token?: string;
  readinessScore?: ReadinessScore;
  suggestedJobs?: SuggestedJobRole[];
  error?: string;
}

const TOKEN_KEY = "placement_session_token";
const USER_IDENTIFIER_KEY = "placement_user_identifier";

export function saveAuthToken(token?: string, identifier?: string) {
  if (token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }
  if (identifier) {
    try {
      localStorage.setItem(USER_IDENTIFIER_KEY, identifier);
    } catch {}
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredIdentifier(): string | null {
  try {
    return localStorage.getItem(USER_IDENTIFIER_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_IDENTIFIER_KEY);
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-session-token"] = token;
  }
  return headers;
}

export async function loginStudent(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const email = credentials.email.trim();
  const password = credentials.password;

  if (!email) {
    throw new Error("Please enter your email or roll number.");
  }
  if (!password) {
    throw new Error("Password is required.");
  }

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Invalid login credentials.");
  }

  if (data.token) {
    saveAuthToken(data.token, data.user?.email || email);
  }

  return data;
}

export async function registerStudent(
  userData: Record<string, any>
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(userData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Registration failed.");
  }

  if (data.token) {
    saveAuthToken(data.token, data.user?.email || userData.email);
  }

  return data;
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.token) {
      saveAuthToken(data.token, data.user?.email);
    }
    return data;
  } catch {
    return null;
  }
}

export async function logoutStudent(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
  } catch (e) {
    console.error("Logout error", e);
  } finally {
    clearAuthToken();
  }
}

export async function changeStudentName(
  fullName: string
): Promise<{ user: User; message: string }> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    throw new Error("Full Name is required.");
  }

  const res = await fetch("/api/account/name", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      fullName: trimmed,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update full name.");
  }

  return data;
}

export async function changeStudentPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ message: string }> {
  const res = await fetch("/api/account/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      confirmNewPassword: payload.confirmNewPassword,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to change password.");
  }

  return data;
}

export async function deleteStudentAccount(
  password: string
): Promise<{ message: string }> {
  const res = await fetch("/api/account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete account.");
  }

  clearAuthToken();
  return data;
}

export async function updateStudentProfile(profileData: any): Promise<{
  user: User;
  readinessScore?: ReadinessScore;
  suggestedJobs?: SuggestedJobRole[];
  aiAnalysis?: any;
  message?: string;
}> {
  const res = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(profileData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update profile.");
  }

  return data;
}

export async function uploadStudentResume(file: File): Promise<{
  user: User;
  readinessScore?: ReadinessScore;
  suggestedJobs?: SuggestedJobRole[];
  aiAnalysis?: any;
  message?: string;
}> {
  const formData = new FormData();
  formData.append("resume", file);

  const headers = getAuthHeaders();
  const requestHeaders: Record<string, string> = {};
  if (headers.Authorization) requestHeaders["Authorization"] = headers.Authorization;
  if (headers["x-session-token"]) requestHeaders["x-session-token"] = headers["x-session-token"];

  const res = await fetch("/api/resume/upload", {
    method: "POST",
    headers: requestHeaders,
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to upload resume.");
  }

  return data;
}

export async function deleteStudentResume(): Promise<{
  user: User;
  readinessScore?: ReadinessScore;
  suggestedJobs?: SuggestedJobRole[];
  aiAnalysis?: any;
  message?: string;
}> {
  const res = await fetch("/api/resume", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to remove resume.");
  }

  return data;
}

export interface SecurityQuestionsRecoveryResponse {
  success: boolean;
  hasSecurityQuestions: boolean;
  identifier: string;
  question1: string;
  question2: string;
}

export async function identifyStudentAccount(
  identifier: string
): Promise<SecurityQuestionsRecoveryResponse> {
  const res = await fetch("/api/auth/forgot-password/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unable to identify account. Please check your credentials.");
  }
  return data;
}

export async function verifySecurityAnswers(payload: {
  identifier: string;
  securityAnswer1: string;
  securityAnswer2: string;
}): Promise<{ success: boolean; resetToken: string; message: string }> {
  const res = await fetch("/api/auth/forgot-password/verify-answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "The security answers are incorrect.");
  }
  return data;
}

export async function resetPasswordWithSecurity(payload: {
  resetToken?: string;
  identifier?: string;
  securityAnswer1?: string;
  securityAnswer2?: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Password reset failed. Please try again.");
  }
  return data;
}


