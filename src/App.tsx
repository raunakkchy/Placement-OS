import React, { useState, useEffect } from "react";
import { User, ReadinessScore, Roadmap, InterviewReport, DashboardData } from "./types";
import { Navbar } from "./components/Navbar";
import { ScoreDashboard } from "./components/ScoreDashboard";
import { AiJobRoleRecommendations } from "./components/AiJobRoleRecommendations";
import { RoadmapView } from "./components/RoadmapView";
import { MockInterviewRoom } from "./components/MockInterviewRoom";
import { AuthModal } from "./components/AuthModal";
import { ProfileDrawer } from "./components/ProfileDrawer";
import { AppRoutes } from "./routes/AppRoutes";
import { logoutStudent, getCurrentUser, saveAuthToken, getAuthHeaders } from "./services/auth";
import { LogoutConfirmModal } from "./components/LogoutConfirmModal";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { GraduationCap } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [readinessScore, setReadinessScore] = useState<ReadinessScore | null>(null);
  const [currentRoadmap, setCurrentRoadmap] = useState<Roadmap | null>(null);
  const [isEditingCareerProfile, setIsEditingCareerProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<"score" | "jobs" | "roadmap" | "interview">("score");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("register");
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleOpenAuth = (mode: "login" | "register" = "register") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Initial load: check user session
  useEffect(() => {
    checkAuthAndInitialize();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        setDashboardData(d);
      }
    } catch (e) {
      console.warn("Failed to fetch dashboard data:", e);
    }
  };

  const checkAuthAndInitialize = async () => {
    try {
      const data = await getCurrentUser();
      if (data && data.user) {
        setUser(data.user);
        if (data.token) {
          saveAuthToken(data.token, data.user.email);
        }
        if (data.readinessScore) {
          setReadinessScore(data.readinessScore);
        }
        await fetchScoresAndRoadmap(data.user);
        await fetchDashboardData();
      } else {
        setUser(null);
        setReadinessScore(null);
        setCurrentRoadmap(null);
        setDashboardData(null);
      }
    } catch (e) {
      console.warn("Auth initialization error:", e);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchScoresAndRoadmap = async (currentUser?: User | null) => {
    try {
      const targetUser = currentUser || user;
      // 1. Fetch current score
      const scoreRes = await fetch("/api/scores/current", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setReadinessScore(scoreData.score);
      }

      // 2. Fetch roadmap for selected role or active target role
      if (targetUser?.selectedRole || targetUser?.targetRoles?.[0]) {
        await fetchRoadmap(targetUser.selectedRole || targetUser.targetRoles?.[0]);
      } else {
        await fetchRoadmap();
      }

      // 3. Refresh dashboard data
      await fetchDashboardData();
    } catch (e) {
      console.warn("Failed to load initial scores and roadmap:", e);
    }
  };

  const fetchRoadmap = async (roleName?: string, forceRegenerate?: boolean) => {
    setLoadingRoadmap(true);
    try {
      const targetRole = roleName || user?.selectedRole || (user?.targetRoles && user.targetRoles[0]);

      if (forceRegenerate && targetRole) {
        const res = await fetch("/api/roadmaps/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({ role: targetRole }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.roadmap) {
            setCurrentRoadmap(data.roadmap);
          }
          return;
        }
      }

      const url = targetRole
        ? `/api/roadmaps?role=${encodeURIComponent(targetRole)}`
        : `/api/roadmaps`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.roadmap) {
          setCurrentRoadmap(data.roadmap);
        }
      }
    } catch (e) {
      console.warn("Failed to load roadmap:", e);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const handleToggleRoadmapItem = async (
    roadmapId: string,
    itemId: string,
    completed: boolean
  ) => {
    if (!currentRoadmap) return;

    // Optimistically update local roadmap state
    const updatedPhases = currentRoadmap.phases.map((phase) => ({
      ...phase,
      items: phase.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            }
          : item
      ),
    }));

    const totalTasks = updatedPhases.reduce((acc, p) => acc + p.items.length, 0);
    const completedTasks = updatedPhases.reduce(
      (acc, p) => acc + p.items.filter((i) => i.completed).length,
      0
    );
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    setCurrentRoadmap({
      ...currentRoadmap,
      phases: updatedPhases,
      overallProgress,
    });

    try {
      const res = await fetch(`/api/roadmaps/${roadmapId}/items/${itemId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentRoadmap(data.roadmap);
        // Refresh score with new roadmap progress
        const scoreRes = await fetch("/api/scores/current", {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          setReadinessScore(scoreData.score);
        }
        // Update dashboard data deterministically
        fetchDashboardData();
      }
    } catch (e) {
      console.warn("Failed to toggle item on server:", e);
    }
  };

  const handleRecalculateScore = async () => {
    setIsRecalculatingScore(true);
    try {
      const res = await fetch("/api/scores/recalculate", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setReadinessScore(data.score);
        fetchDashboardData();
      }
    } catch (e) {
      console.warn("Failed to recalculate score:", e);
    } finally {
      setIsRecalculatingScore(false);
    }
  };

  const handleInterviewComplete = async (report: InterviewReport, updatedRoadmap?: Roadmap) => {
    if (updatedRoadmap) {
      setCurrentRoadmap(updatedRoadmap);
    } else {
      await fetchRoadmap();
    }
    // Refresh readiness score and dashboard data
    await handleRecalculateScore();
    await fetchDashboardData();
  };

  const handleLogout = async () => {
    await logoutStudent();
    setUser(null);
    setReadinessScore(null);
    setCurrentRoadmap(null);
    setDashboardData(null);
  };

  const handleAuthSuccess = (authData: any) => {
    setUser(authData.user);
    if (authData.token) {
      saveAuthToken(authData.token, authData.user?.email);
    }
    if (authData.readinessScore) {
      setReadinessScore(authData.readinessScore);
    }
    fetchScoresAndRoadmap(authData.user);
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F7F3] space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111315] text-white shadow-lg animate-pulse">
          <GraduationCap className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold text-[#737373] tracking-wide">
          Initializing Placement OS...
        </p>
      </div>
    );
  }

  const renderDashboard = (navigate: (path: string, options?: any) => void) => {
    if (user && (user.onboardingCompleted === false || isEditingCareerProfile)) {
      return (
        <OnboardingFlow
          user={user}
          onComplete={(updatedUser, score) => {
            setUser(updatedUser);
            if (score) setReadinessScore(score);
            setIsEditingCareerProfile(false);
            if (!updatedUser.selectedRole) {
              setActiveTab("jobs");
            }
            fetchScoresAndRoadmap(updatedUser);
          }}
          onCancel={user.onboardingCompleted ? () => setIsEditingCareerProfile(false) : undefined}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
        {/* Top Application Navbar */}
        <Navbar
          user={user}
          readinessScore={readinessScore}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenProfile={() => setIsProfileDrawerOpen(true)}
          onLogout={() => setIsLogoutModalOpen(true)}
          onOpenAuth={(mode) => handleOpenAuth(mode || "register")}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div>
            {activeTab === "score" && user && (
              <ScoreDashboard
                user={user}
                score={readinessScore}
                onRecalculate={handleRecalculateScore}
                onNavigateTab={setActiveTab}
                onOpenProfile={() => setIsProfileDrawerOpen(true)}
                isRecalculating={isRecalculatingScore}
                dashboardData={dashboardData}
                onRefreshDashboard={fetchDashboardData}
              />
            )}

            {activeTab === "jobs" && user && (
              <AiJobRoleRecommendations
                user={user}
                onUserUpdate={(updatedUser) => {
                  setUser(updatedUser);
                  if (updatedUser.selectedRole) {
                    fetchRoadmap(updatedUser.selectedRole);
                  }
                  fetchDashboardData();
                }}
                onNavigateToRoadmap={() => {
                  if (user?.selectedRole) {
                    fetchRoadmap(user.selectedRole);
                  }
                  setActiveTab("roadmap");
                }}
              />
            )}

            {activeTab === "roadmap" && user && (
              <RoadmapView
                roadmap={currentRoadmap}
                selectedRole={user.selectedRole || undefined}
                onSelectRole={(role) => {
                  fetchRoadmap(role);
                }}
                onToggleItem={handleToggleRoadmapItem}
                onRegenerate={() => fetchRoadmap(user?.selectedRole, true)}
                loading={loadingRoadmap}
                user={user}
                onNavigateToRoles={() => setActiveTab("jobs")}
              />
            )}

            {activeTab === "interview" && user && (
              <MockInterviewRoom
                user={user}
                roadmap={currentRoadmap}
                onInterviewComplete={handleInterviewComplete}
                onNavigateTab={setActiveTab}
              />
            )}
          </div>
        </main>

        {/* Auth & Registration Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(newUser, score) => {
            setUser(newUser);
            if (score) setReadinessScore(score);
            fetchScoresAndRoadmap(newUser);
          }}
        />

        {/* Unified Profile Drawer */}
        {user && (
          <ProfileDrawer
            isOpen={isProfileDrawerOpen}
            onClose={() => setIsProfileDrawerOpen(false)}
            user={user}
            onLogout={() => {
              setIsProfileDrawerOpen(false);
              setIsLogoutModalOpen(true);
            }}
            onUpdateSuccess={(updatedUser, score) => {
              setUser(updatedUser);
              if (score) setReadinessScore(score);
              fetchScoresAndRoadmap(updatedUser);
            }}
          />
        )}

        {/* Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={async () => {
            await logoutStudent();
            setUser(null);
            setReadinessScore(null);
            setCurrentRoadmap(null);
            navigate("/login");
          }}
        />
      </div>
    );
  };

  return (
    <AppRoutes
      user={user}
      onAuthSuccess={handleAuthSuccess}
      dashboardComponent={renderDashboard}
    />
  );
}
