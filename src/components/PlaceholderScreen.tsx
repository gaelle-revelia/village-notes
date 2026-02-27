import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PlaceholderScreenProps {
  title: string;
}

export default function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate("/timeline")}
          className="flex items-center gap-1"
          style={{ color: "#6B8CAE", fontFamily: "Inter, sans-serif", fontSize: 14 }}
        >
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "'Crimson Text', Georgia, serif", color: "#2A2A2A" }}
        >
          {title}
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B" }}>
          Bientôt disponible
        </p>
      </main>
    </div>
  );
}
