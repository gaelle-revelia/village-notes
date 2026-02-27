import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] text-center space-y-4">
        <h1 className="text-[32px] font-semibold text-card-foreground">Bienvenue</h1>
        <p className="text-muted-foreground">L'onboarding sera bientôt disponible.</p>
      </div>
    </div>
  );
};

export default Onboarding;
