import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SignupForm } from "@/components/auth/SignupForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { EmailConfirmation } from "@/components/auth/EmailConfirmation";

type AuthView = "login" | "signup" | "forgot-password" | "email-confirmation";

const Auth = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/timeline" replace />;
  }

  const handleSignupSuccess = (email: string) => {
    setConfirmationEmail(email);
    setView("email-confirmation");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[400px]">
        {view === "login" && (
          <LoginForm
            onSwitchToSignup={() => setView("signup")}
            onForgotPassword={() => setView("forgot-password")}
          />
        )}
        {view === "signup" && (
          <SignupForm
            onSwitchToLogin={() => setView("login")}
            onSuccess={handleSignupSuccess}
          />
        )}
        {view === "forgot-password" && (
          <ForgotPasswordForm onBack={() => setView("login")} />
        )}
        {view === "email-confirmation" && (
          <EmailConfirmation
            email={confirmationEmail}
            onBack={() => setView("login")}
          />
        )}
      </div>
    </main>
  );
};

export default Auth;
