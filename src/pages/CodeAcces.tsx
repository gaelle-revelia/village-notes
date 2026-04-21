import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CodeAcces = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    try {
      const codeToSend = code.trim().toUpperCase();
      const { data, error: invokeError } = await supabase.functions.invoke(
        "verify-access-code",
        { body: { code: codeToSend } }
      );
      if (invokeError) throw invokeError;
      if (data?.valid === true) {
        sessionStorage.setItem("access_code_valid", "true");
        navigate("/auth");
      } else {
        setError("Ce code ne semble pas valide");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div
        className="w-full max-w-[400px] rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.52)",
          backdropFilter: "blur(16px) saturate(1.6)",
          WebkitBackdropFilter: "blur(16px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        <div className="text-center space-y-2 mb-6">
          <h1 className="font-serif text-[28px] font-semibold text-[#1E1A1A]">
            Accès partenaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Saisissez le code qui vous a été communiqué pour accéder à l'inscription.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            autoFocus
            type="text"
            placeholder="Votre code d'accès"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg text-center tracking-wider bg-white/60"
          />
          {error && (
            <p className="text-sm text-center" style={{ color: "#E8736A" }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-xl h-12 text-base text-white"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            }}
          >
            {loading ? "Vérification..." : "Valider"}
          </Button>
        </form>

        <p className="text-center text-sm mt-6">
          <a
            href="/waitlist"
            className="text-muted-foreground hover:underline"
          >
            Retour à la liste d'attente
          </a>
        </p>
      </div>
    </main>
  );
};

export default CodeAcces;
