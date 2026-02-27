import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSent(true);
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground">Réinitialiser le mot de passe</h1>
        {!sent && (
          <p className="text-muted-foreground">
            Entrez votre email, nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        )}
      </div>

      {sent ? (
        <div className="rounded-xl border bg-card p-6 space-y-2">
          <p className="text-foreground">
            Un lien vous a été envoyé à <strong>{email}</strong>. Vérifiez aussi vos spams.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Votre email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-base">
            {loading ? "Envoi..." : "Recevoir le lien"}
          </Button>
        </form>
      )}
    </div>
  );
}
