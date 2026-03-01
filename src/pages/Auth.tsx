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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (user) {
    // Don't redirect to timeline if invite onboarding is pending
    const meta = user.user_metadata;
    if (meta?.enfant_id && meta?.role) {
      // useAuth will handle redirect to /onboarding-invite
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Redirection…</div>
        </div>
      );
    }
    return <Navigate to="/timeline" replace />;
  }

  const handleSignupSuccess = (email: string) => {
    setConfirmationEmail(email);
    setView("email-confirmation");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px] rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.52)", backdropFilter: "blur(16px) saturate(1.6)", WebkitBackdropFilter: "blur(16px) saturate(1.6)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
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
