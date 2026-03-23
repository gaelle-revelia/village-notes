import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess: (email: string) => void;
}

export function SignupForm({ onSwitchToLogin, onSuccess }: SignupFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
        setErrors({ email: "Cet email est déjà associé à un compte. Vous souhaitez vous connecter ?" });
      } else if (authError.message.includes("network")) {
        toast({
          title: "Connexion impossible",
          description: "Vérifiez votre réseau et réessayez.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: authError.message,
          variant: "destructive",
        });
      }
      return;
    }

    navigate("/onboarding");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold text-card-foreground">Créez votre espace</h1>
        <p className="text-muted-foreground">
          Un espace privé pour garder la mémoire du chemin parcouru.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Votre email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Choisissez un mot de passe</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm leading-relaxed font-normal text-muted-foreground cursor-pointer">
            J'accepte la{" "}
            <a href="/politique-confidentialite" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              politique de confidentialité
            </a>{" "}
            et les conditions d'utilisation
          </Label>
        </div>

        <Button
          type="submit"
          disabled={loading || !consent}
          className="w-full rounded-xl h-12 text-base"
        >
          {loading ? "Création en cours..." : "Créer mon espace"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <button onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
          Me connecter
        </button>
      </p>
    </div>
  );
}
