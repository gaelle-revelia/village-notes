import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const NouvelEvenement = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/timeline")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Nouvel événement</h1>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">À venir…</p>
      </main>
    </div>
  );
};

export default NouvelEvenement;
