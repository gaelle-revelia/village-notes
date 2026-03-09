import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onSwitchToSignup, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("network")) {
        toast({
          title: "Connexion impossible",
          description: "Vérifiez votre réseau et réessayez.",
          variant: "destructive",
        });
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      return;
    }

    // Check if user has completed onboarding (has an enfant)
    const { data: enfants } = await supabase
      .from("enfants")
      .select("id")
      .limit(1);

    if (!enfants || enfants.length === 0) {
      navigate("/onboarding");
    } else {
      navigate("/timeline");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold text-card-foreground">Bon retour</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Votre email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Votre mot de passe</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-primary hover:underline"
        >
          Mot de passe oublié ?
        </button>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl h-12 text-base"
        >
          {loading ? "Connexion..." : "Me connecter"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <a href="/waitlist" className="text-primary hover:underline font-medium">
          Créer mon espace
        </a>
      </p>
    </div>
  );
}
