import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { LoginPage } from "../pages/Login";
import { RegisterPage } from "../pages/Register";
import { ForgotPasswordPage } from "../pages/ForgotPassword";
import { AuthResponse } from "../services/auth";

interface AppRoutesProps {
  user: any | null;
  onAuthSuccess: (authData: AuthResponse) => void;
  dashboardComponent:
    | React.ReactNode
    | ((navigate: (path: string, options?: any) => void) => React.ReactNode);
}

const RouteBridge: React.FC<AppRoutesProps> = ({
  user,
  onAuthSuccess,
  dashboardComponent,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  const handleLoginSuccess = (authData: AuthResponse) => {
    onAuthSuccess(authData);
    navigate("/dashboard");
  };

  const renderedDashboard =
    typeof dashboardComponent === "function"
      ? dashboardComponent(navigate)
      : dashboardComponent;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onNavigateToRegister={() => navigate("/register")}
              onNavigateToForgotPassword={() => navigate("/forgot-password")}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage
              onSuccess={handleLoginSuccess}
              onNavigateToLogin={() => navigate("/login")}
            />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          <ForgotPasswordPage onNavigateToLogin={() => navigate("/login")} />
        }
      />
      <Route
        path="/dashboard"
        element={
          user ? (
            <>{renderedDashboard}</>
          ) : (
            <Navigate to="/login" replace state={{ from: location }} />
          )
        }
      />
      <Route
        path="*"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export const AppRoutes: React.FC<AppRoutesProps> = ({
  user,
  onAuthSuccess,
  dashboardComponent,
}) => {
  return (
    <BrowserRouter>
      <RouteBridge
        user={user}
        onAuthSuccess={onAuthSuccess}
        dashboardComponent={dashboardComponent}
      />
    </BrowserRouter>
  );
};
