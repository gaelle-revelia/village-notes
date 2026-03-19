import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send } from "lucide-react";

interface TextInputViewProps {
  onSubmit: (text: string) => void;
  onSwitchToVoice: () => void;
}

export function TextInputView({ onSubmit, onSwitchToVoice }: TextInputViewProps) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-card-foreground">Saisie texte</h2>
        <p className="text-sm text-muted-foreground">
          Décrivez la séance en quelques mots ou phrases. L'app structurera votre note
          automatiquement.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Aujourd'hui, lors de la séance de kiné, on a travaillé sur..."
        className="min-h-[200px] rounded-xl resize-none"
        autoFocus
        autoResize
      />

      <div className="space-y-3">
        <Button
          onClick={() => onSubmit(text)}
          disabled={!text.trim()}
          className="w-full rounded-xl h-12 text-base"
        >
          <Send className="mr-2 h-4 w-4" />
          Structurer ma note
        </Button>

        <button
          onClick={onSwitchToVoice}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <Mic className="h-3.5 w-3.5" />
          Enregistrer en vocal à la place
        </button>
      </div>
    </div>
  );
}
