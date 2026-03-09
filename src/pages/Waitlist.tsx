import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const Waitlist = () => {
  const [submitted, setSubmitted] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [raison, setRaison] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent) return;
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.from("waitlist" as any).insert({
      email,
      prenom: prenom || null,
      nom: nom || null,
      motivation: raison || null,
      consent_at: new Date().toISOString(),
    } as any);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setErrorMsg("Cette adresse est déjà sur la liste — on ne vous oublie pas 😊");
      } else {
        setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
      }
      return;
    }

    // Fire-and-forget: send confirmation emails
    supabase.functions.invoke("send-waitlist-emails", {
      body: { email, prenom, nom, motivation: raison, created_at: new Date().toISOString() },
    }).catch((err) => console.error("Waitlist email error:", err));

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md p-8"
        style={{
          background: "rgba(255,255,255,0.38)",
          backdropFilter: "blur(16px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "16px",
          boxShadow:
            "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        {submitted ? (
          <div className="text-center py-8">
            <h1 className="font-serif text-2xl font-semibold text-[#1E1A1A] mb-4">
              C'est noté !
            </h1>
            <p className="font-sans text-[#1E1A1A] leading-relaxed">
              On vous écrit dès que les portes ouvrent. 🏡
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h1 className="font-serif text-2xl font-semibold text-[#1E1A1A] text-center">
              The Village arrive bientôt 🌱
            </h1>
            <p className="font-sans text-sm text-[#1E1A1A] leading-relaxed text-center">
              L'application est en cours de finalisation. Nous prenons le soin
              de bien faire les choses, notamment sur la protection de vos
              données. Laissez vos coordonnées : vous serez parmi les premiers
              à rejoindre le Village.
            </p>

            <div className="space-y-3">
              <Input
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white/60"
              />
              <Input
                placeholder="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white/60"
              />
              <Input
                type="email"
                placeholder="Email *"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/60"
              />
              <Textarea
                placeholder="Mon enfant, notre situation..."
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                className="bg-white/60 w-full"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="consent"
                className="font-sans text-sm text-[#1E1A1A] leading-snug cursor-pointer"
              >
                J'accepte d'être recontacté(e) par The Village *
              </label>
            </div>

            {errorMsg && (
              <p className="font-sans text-sm text-[#E8736A] text-center">{errorMsg}</p>
            )}

            <Button
              type="submit"
              disabled={!email || !consent || loading}
              className="w-full text-white font-sans font-medium"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              }}
            >
              {loading ? "Envoi en cours..." : "Me prévenir"}
            </Button>

            <p className="font-sans text-xs text-[#9A9490] text-center">
              Pas de spam. Un seul message, quand c'est prêt.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Waitlist;
