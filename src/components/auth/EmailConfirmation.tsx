import { ArrowLeft } from "lucide-react";

interface EmailConfirmationProps {
  email: string;
  onBack: () => void;
}

export function EmailConfirmation({ email, onBack }: EmailConfirmationProps) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à la connexion
      </button>

      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground">Vérifiez votre boîte mail</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-3">
        <p className="text-foreground">
          Un lien de confirmation vous a été envoyé à <strong>{email}</strong>.
        </p>
        <p className="text-muted-foreground text-sm">
          Cliquez dessus pour activer votre compte. Pensez à vérifier vos spams.
        </p>
      </div>
    </div>
  );
}
