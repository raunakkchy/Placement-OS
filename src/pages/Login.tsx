import React from "react";
import { useLocation } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { LoginForm } from "../components/auth/LoginForm";
import { AuthResponse } from "../services/auth";

interface LoginPageProps {
  onSuccess: (authData: AuthResponse) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const location = useLocation();
  const notification = (location.state as any)?.notification;

  return (
    <AuthLayout showHero={true}>
      <LoginForm
        onSuccess={onSuccess}
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToForgotPassword={onNavigateToForgotPassword}
        notification={notification}
      />
    </AuthLayout>
  );
};
