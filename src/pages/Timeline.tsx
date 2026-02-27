import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Timeline = () => {
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
        <h1 className="text-xl font-semibold text-card-foreground">The Village</h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="text-center space-y-4 max-w-[300px]">
          <p className="text-lg text-foreground">
            Votre timeline est prête. Enregistrez votre premier mémo après la prochaine séance.
          </p>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium">
            Enregistrer un mémo
          </button>
        </div>
      </main>
    </div>
  );
};

export default Timeline;
