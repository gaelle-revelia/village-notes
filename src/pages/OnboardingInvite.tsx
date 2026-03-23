import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mic, Eye, EyeOff } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

// ─── helpers ───────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, { label: string; desc: string }> = {
  coparent: { label: "Co-parent", desc: "accès complet" },
  famille: { label: "Famille", desc: "lecture seule" },
  owner: { label: "Propriétaire", desc: "accès complet" },
};

function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-4
}

// ─── sub-components ────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={
            i === current
              ? {
                  width: 20,
                  height: 6,
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                }
              : {
                  width: 6,
                  height: 6,
                  background: "rgba(139,116,224,0.2)",
                }
          }
        />
      ))}
    </div>
  );
}

function GlassCard({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.52)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderRadius: 20,
        boxShadow:
          "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 text-white font-medium rounded-2xl transition-opacity ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"} ${className}`}
      style={{
        background: "linear-gradient(135deg, #E8736A, #8B74E0)",
        boxShadow: "0 6px 20px rgba(139,116,224,0.35)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 15,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 text-center transition-opacity hover:opacity-70"
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        color: "#9A9490",
      }}
    >
      {children}
    </button>
  );
}

// ─── Screen components ─────────────────────────────────────────────

function ScreenWelcome({
  enfantPrenom,
  inviterName,
  role,
  onNext,
  onLogin,
}: {
  enfantPrenom: string;
  inviterName: string;
  role: string;
  onNext: () => void;
  onLogin: () => void;
}) {
  const r = ROLE_LABELS[role] || ROLE_LABELS.famille;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      {/* Logo */}
      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: "0 6px 20px rgba(139,116,224,0.4)",
        }}
      >
        <span className="text-3xl">🏡</span>
      </div>

      {/* Invite badge */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className="flex items-center justify-center text-white font-semibold"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E8736A, #C85A8A)",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {inviterName.charAt(0).toUpperCase()}
        </div>
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#9A9490",
          }}
        >
          {inviterName} vous invite
        </span>
      </div>

      {/* Title */}
      <h1
        className="text-center mb-8"
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 600,
          fontSize: 28,
          color: "#1E1A1A",
          lineHeight: 1.25,
        }}
      >
        Rejoignez le Village
        <br />
        de {enfantPrenom}
      </h1>

      {/* Role card */}
      <GlassCard className="w-full max-w-xs px-5 py-4 mb-8">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#44A882",
              flexShrink: 0,
            }}
          />
          <div>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#1E1A1A",
              }}
            >
              {r.label}
            </p>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                color: "#9A9490",
              }}
            >
              {r.desc}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="w-full max-w-xs space-y-2">
        <PrimaryButton onClick={onNext}>Rejoindre le village →</PrimaryButton>
        <GhostButton onClick={onLogin}>J'ai déjà un compte</GhostButton>
      </div>
    </div>
  );
}

function ScreenPrenom({
  onNext,
  onBack,
  value,
  onChange,
}: {
  onNext: () => void;
  onBack: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = value.trim().length >= 2;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <h2
        className="text-center mb-2"
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 600,
          fontSize: 24,
          color: "#1E1A1A",
        }}
      >
        Comment vous appelez-vous ?
      </h2>
      <p
        className="text-center mb-8"
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 14,
          color: "#9A9490",
          maxWidth: 280,
        }}
      >
        Pour personnaliser votre expérience dans le Village.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div>
          <label
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: "#9A9490",
              marginBottom: 6,
              display: "block",
            }}
          >
            Votre prénom
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Prénom"
            className="w-full px-4 py-3 rounded-xl outline-none"
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 14,
              color: "#1E1A1A",
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.65)",
            }}
          />
        </div>

        <PrimaryButton onClick={onNext} disabled={!valid}>
          Continuer
        </PrimaryButton>
        <GhostButton onClick={onBack}>← Retour</GhostButton>
      </div>
    </div>
  );
}

function ScreenPassword({
  email,
  enfantPrenom,
  invitePrenom,
  onDone,
  onBack,
}: {
  email: string;
  enfantPrenom: string;
  invitePrenom: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const strength = passwordStrength(pw);

  const submit = async () => {
    if (pw.length < 6) {
      setError("6 caractères minimum");
      return;
    }
    if (pw !== pw2) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    // Resolve email from multiple sources
    const resolvedEmail = email || localStorage.getItem("invite_email") || "";
    if (!resolvedEmail) {
      setError("Email introuvable, veuillez relancer l'invitation.");
      return;
    }

    setSaving(true);
    setError("");

    // Step 1: Sign out any existing session to avoid overwriting another user's password
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.signOut();
    }

    // Step 2: Always create a fresh account for the invited user
    const { data: signUpData, error: err } = await supabase.auth.signUp({
      email: resolvedEmail,
      password: pw,
    });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    // Detect fake success: Supabase returns user with empty identities for existing emails
    if (!signUpData.user || (signUpData.user.identities && signUpData.user.identities.length === 0)) {
      setError("Un compte existe déjà avec cet email. Utilisez « J'ai déjà un compte ».");
      setSaving(false);
      return;
    }

    // Step 2: Confirm we have a valid authenticated user
    const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !currentUser?.id) {
      setError("Impossible de vérifier votre compte. Veuillez réessayer.");
      setSaving(false);
      return;
    }

    // Step 3: Provision profile + membership + mark token used
    const inviteToken = localStorage.getItem("invite_token");
    if (!inviteToken) {
      setError("Jeton d'invitation introuvable. Veuillez réouvrir le lien d'invitation.");
      setSaving(false);
      return;
    }

    const { data: provisionResult, error: provisionError } = await supabase.functions.invoke(
      "verify-invite-token",
      {
        body: {
          token: inviteToken,
          provision_user: true,
          user_id: currentUser.id,
          prenom: invitePrenom.trim() || null,
          consent_at: new Date().toISOString(),
          consent_version: "1.0",
        },
      }
    );

    if (provisionError || provisionResult?.error) {
      setError("Une erreur est survenue, veuillez contacter contact@the-village.app");
      setSaving(false);
      return;
    }

    onDone();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 overflow-y-auto">
      <h2
        className="text-center mb-2"
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 600,
          fontSize: 24,
          color: "#1E1A1A",
        }}
      >
        Créez votre accès
      </h2>
      <p
        className="text-center mb-8"
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 14,
          color: "#9A9490",
          maxWidth: 280,
        }}
      >
        Choisissez un mot de passe pour rejoindre le Village de {enfantPrenom}.
      </p>

      <div className="w-full max-w-xs space-y-4">
        {/* Email */}
        <input
          type="email"
          value={email}
          readOnly
          className="w-full px-4 py-3 rounded-xl outline-none"
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#9A9490",
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(255,255,255,0.65)",
          }}
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-3 rounded-xl outline-none pr-11"
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 14,
              color: "#1E1A1A",
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.65)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#9A9490" }}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Strength bar */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i < strength ? "#44A882" : "rgba(0,0,0,0.08)",
              }}
            />
          ))}
        </div>

        {/* Confirm */}
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="w-full px-4 py-3 rounded-xl outline-none"
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#1E1A1A",
            background: "rgba(255,255,255,0.45)",
            border: "1px solid rgba(255,255,255,0.65)",
          }}
        />

        {/* RGPD Consent */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="invite-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-muted-foreground accent-primary flex-shrink-0"
          />
          <label
            htmlFor="invite-consent"
            className="cursor-pointer"
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: "#9A9490",
              lineHeight: 1.5,
            }}
          >
            J'accepte la{" "}
            <a
              href="/politique-confidentialite"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#8B74E0", textDecoration: "underline" }}
            >
              politique de confidentialité
            </a>{" "}
            et les conditions d'utilisation
          </label>
        </div>

        {error && (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: "#E8736A",
            }}
          >
            {error}
          </p>
        )}

        <PrimaryButton onClick={submit} disabled={saving || !consent}>
          {saving ? "Création..." : "Créer mon accès"}
        </PrimaryButton>
        <GhostButton onClick={onBack}>← Retour</GhostButton>
      </div>
    </div>
  );
}

// ─── Discovery slides ──────────────────────────────────────────────

function SlideTimeline({ enfantPrenom }: { enfantPrenom: string }) {
  const cards = [
    {
      color: "#E8736A",
      badge: "🎙 Vocal · Kiné · 12 fév",
      text: "Première séance debout avec appui.",
      delay: 0.1,
    },
    {
      color: "#8B74E0",
      badge: "✏️ Note · Psychomot · 18 fév",
      text: "Selena reconnaît les comptines.",
      delay: 0.25,
    },
    {
      color: "#E8C84A",
      badge: "⭐ Étape · 22 fév",
      text: "Premier retournement autonome !",
      delay: 0.4,
      isMilestone: true,
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="relative pl-5">
        {/* Vertical line */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[1.5px]"
          style={{
            background:
              "linear-gradient(to bottom, #E8736A, #8B74E0, #44A882)",
            opacity: 0.4,
          }}
        />
        <div className="space-y-3">
          {cards.map((c, i) => (
            <div
              key={i}
              className="animate-fade-in-up"
              style={{
                animationDelay: `${c.delay}s`,
                animationFillMode: "both",
              }}
            >
              {/* Dot */}
              <div
                className="absolute left-0 -translate-x-1/2"
                style={{
                  width: c.isMilestone ? 14 : 9,
                  height: c.isMilestone ? 14 : 9,
                  borderRadius: "50%",
                  background: c.isMilestone ? "#E8C84A" : "transparent",
                  border: c.isMilestone
                    ? "none"
                    : `2px solid ${c.color}`,
                  marginTop: 12,
                  boxShadow: c.isMilestone
                    ? "0 0 0 4px rgba(232,200,74,0.25)"
                    : `0 0 0 3px ${c.color}22`,
                }}
              />
              <div
                className="ml-3 px-4 py-3"
                style={{
                  background: c.isMilestone
                    ? "rgba(255,248,220,0.55)"
                    : "rgba(255,255,255,0.52)",
                  backdropFilter: "blur(12px) saturate(1.4)",
                  border: c.isMilestone
                    ? "1px solid rgba(232,200,74,0.35)"
                    : "1px solid rgba(255,255,255,0.85)",
                  borderRadius: 14,
                  boxShadow: "0 2px 12px rgba(139,116,224,0.06)",
                }}
              >
                <p
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 10,
                    textTransform: "uppercase",
                    color: c.color,
                    fontWeight: 500,
                    marginBottom: 2,
                  }}
                >
                  {c.badge}
                </p>
                <p
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    color: "#1E1A1A",
                    lineHeight: 1.4,
                  }}
                >
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideMemos() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
      {/* Mic */}
      <div
        className="flex items-center justify-center animate-pulse"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: "0 0 0 12px rgba(139,116,224,0.15)",
        }}
      >
        <Mic size={28} color="white" />
      </div>

      {/* Wave bars */}
      <div className="flex items-end gap-1 h-8">
        {[16, 24, 32, 20, 28, 18, 22].map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full"
            style={{
              height: h,
              background: "linear-gradient(to top, #E8736A, #8B74E0)",
              opacity: 0.6,
              animation: `wave 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* AI card */}
      <GlassCard className="px-4 py-3 max-w-[260px]">
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "#1E1A1A",
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: "#8B74E0", fontWeight: 500 }}>Résumé : </span>
          Belle progression sur le retournement.
        </p>
      </GlassCard>
    </div>
  );
}

function SlideVillage({
  inviterName,
  currentUserEmail,
  role,
}: {
  inviterName: string;
  currentUserEmail: string;
  role: string;
}) {
  const userName = currentUserEmail.split("@")[0];
  const roleLabel = ROLE_LABELS[role]?.label || "Famille";
  const rows = [
    {
      letter: inviterName.charAt(0).toUpperCase(),
      gradient: "linear-gradient(135deg, #E8736A, #C85A8A)",
      name: inviterName,
      desc: "Maman · Owner",
      badge: "Owner",
      badgeColor: "#44A882",
      delay: 0.1,
    },
    {
      letter: userName.charAt(0).toUpperCase(),
      gradient: "linear-gradient(135deg, #8B74E0, #5CA8D8)",
      name: userName,
      desc: roleLabel,
      badge: "Vous",
      badgeColor: "#8B74E0",
      delay: 0.25,
    },
    {
      letter: "A",
      gradient: "linear-gradient(135deg, #E8736A, #E8845A)",
      name: "Aurore",
      desc: "Kinésithérapeute",
      badge: null,
      badgeColor: null,
      delay: 0.4,
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="animate-slide-in-left"
            style={{
              animationDelay: `${r.delay}s`,
              animationFillMode: "both",
            }}
          >
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex items-center justify-center text-white font-semibold shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: r.gradient,
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {r.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#1E1A1A",
                  }}
                >
                  {r.name}
                </p>
                <p
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 12,
                    color: "#9A9490",
                  }}
                >
                  {r.desc}
                </p>
              </div>
              {r.badge && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded-full text-white"
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 500,
                    background: r.badgeColor!,
                  }}
                >
                  {r.badge}
                </span>
              )}
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoverySlide({
  label,
  title,
  description,
  illustration,
  slideIndex,
  totalSlides,
  onNext,
}: {
  label: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
  slideIndex: number;
  totalSlides: number;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {illustration}
      <GlassCard
        className="mx-4 mb-6 px-6 py-6 space-y-4"
        style={{ borderRadius: 24 }}
      >
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#8B74E0",
            opacity: 0.7,
            fontWeight: 500,
          }}
        >
          {label}
        </p>
        <h3
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            fontSize: 22,
            color: "#1E1A1A",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#9A9490",
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <ProgressDots total={totalSlides} current={slideIndex} />
          <button
            onClick={onNext}
            className="px-5 py-2 rounded-xl text-white font-medium"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(139,116,224,0.3)",
            }}
          >
            Suivant
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

type SlideData = {
  label: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
};

function DiscoveryCarousel({
  slides,
  onFinish,
}: {
  slides: SlideData[];
  onFinish: () => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ watchDrag: true });
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const handleNext = () => {
    if (!emblaApi) return;
    if (emblaApi.canScrollNext()) {
      emblaApi.scrollNext();
    } else {
      onFinish();
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Swipable illustrations */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 flex flex-col justify-center">
              {slide.illustration}
            </div>
          ))}
        </div>
      </div>
      {/* Fixed bottom card — always shows current slide info */}
      <GlassCard
        className="mx-4 mb-6 px-6 py-6 space-y-4"
        style={{ borderRadius: 24 }}
      >
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#8B74E0", opacity: 0.7, fontWeight: 500 }}>
          {currentSlide?.label}
        </p>
        <h3 style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 22, color: "#1E1A1A", lineHeight: 1.3 }}>
          {currentSlide?.title}
        </h3>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 14, color: "#9A9490", lineHeight: 1.55 }}>
          {currentSlide?.description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <ProgressDots total={slides.length} current={currentIndex} />
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-xl text-white font-medium"
            style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", fontFamily: "DM Sans, sans-serif", fontSize: 14, boxShadow: "0 4px 14px rgba(139,116,224,0.3)" }}
          >
            Suivant
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

function ScreenReady({
  enfantPrenom,
  role,
  onFinish,
}: {
  enfantPrenom: string;
  role: string;
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div
        className="text-5xl mb-6"
        style={{
          animation: "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        🌿
      </div>
      <h1
        className="text-center mb-3"
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 600,
          fontSize: 26,
          color: "#1E1A1A",
        }}
      >
        Vous faites partie du Village !
      </h1>
      <p
        className="text-center mb-2"
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 15,
          color: "#9A9490",
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Bienvenue dans le suivi de {enfantPrenom}. Vous pouvez maintenant
        consulter sa timeline.
      </p>
      {role === "famille" && (
        <p
          className="text-center mb-6"
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "#8B74E0",
            fontWeight: 500,
          }}
        >
          Votre accès est en lecture seule.
        </p>
      )}
      <div className="w-full max-w-xs mt-4">
        <PrimaryButton onClick={onFinish}>
          Découvrir la timeline →
        </PrimaryButton>
      </div>
    </div>
  );
}

// ─── Animations CSS ────────────────────────────────────────────────

const animationStyles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes wave {
  from { transform: scaleY(0.6); }
  to { transform: scaleY(1); }
}
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}
.animate-slide-in-left {
  animation: slideInLeft 0.5s ease-out;
}
`;

// ─── Main page ─────────────────────────────────────────────────────

export default function OnboardingInvite() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [invitePrenom, setInvitePrenom] = useState("");

  const [enfantPrenom, setEnfantPrenom] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [role, setRole] = useState("famille");
  const [inviteEmail, setInviteEmail] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [loading, setLoading] = useState(true);

  // Compute total discovery slides (skip memos for famille)
  const showMemos = role === "coparent" || role === "owner";
  const totalDiscoverySlides = showMemos ? 3 : 2;

  const initDone = useRef(false);

  // Verify invite token and load context data
  useEffect(() => {
    if (initDone.current) return;
    async function init() {
      // Step 1: Verify token if present
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        const { data, error } = await supabase.functions.invoke("verify-invite-token", {
          body: { token },
        });

        if (error || !data?.enfant_id) {
          setTokenError(data?.error || "Lien d'invitation invalide ou expiré");
          setLoading(false);
          return;
        }

        localStorage.setItem("invite_enfant_id", data.enfant_id);
        localStorage.setItem("invite_role", data.role);
        localStorage.setItem("invite_token", token);
        setRole(data.role);
        setInviteEmail(data.email);
        if (data.email) localStorage.setItem("invite_email", data.email);
      }

      // Step 2: Load context data
      const enfantId =
        user?.user_metadata?.enfant_id ||
        localStorage.getItem("invite_enfant_id");
      const storedRole =
        user?.user_metadata?.role ||
        localStorage.getItem("invite_role") ||
        "famille";
      setRole(storedRole);

      if (!enfantId) {
        setLoading(false);
        return;
      }

      // Fetch enfant prénom
      const { data: enfant } = await supabase
        .from("enfants")
        .select("prenom")
        .eq("id", enfantId)
        .single();
      if (enfant) setEnfantPrenom(enfant.prenom);

      // Fetch inviter name
      const { data: membres } = await supabase
        .from("enfant_membres" as any)
        .select("user_id")
        .eq("enfant_id", enfantId)
        .eq("role", "owner")
        .limit(1);

      if (membres && (membres as any[]).length > 0) {
        const { data: intervenant } = await supabase
          .from("intervenants")
          .select("nom")
          .eq("enfant_id", enfantId)
          .eq("type", "famille")
          .limit(1)
          .single();
        if (intervenant) {
          setInviterName(intervenant.nom);
        } else {
          setInviterName("L'équipe");
        }
      } else {
        setInviterName("L'équipe");
      }

      setLoading(false);
      initDone.current = true;
    }
    init();
  }, [user]);

  const finish = useCallback(() => {
    localStorage.setItem("onboarding_invite_done", "true");
    localStorage.removeItem("invite_enfant_id");
    localStorage.removeItem("invite_role");
    localStorage.removeItem("invite_token");
    localStorage.removeItem("invite_hash");
    localStorage.removeItem("invite_email");
    navigate("/timeline");
  }, [navigate]);

  if (tokenError) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6"
        style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
        <h2
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            fontSize: 22,
            color: "#1E1A1A",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Lien invalide
        </h2>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#9A9490",
            textAlign: "center",
            maxWidth: 300,
            marginBottom: 24,
          }}
        >
          {tokenError}
        </p>
        <PrimaryButton onClick={() => navigate("/auth")} className="max-w-xs">
          Se connecter
        </PrimaryButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#8B74E0", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Discovery carousel slides data
  const discoverySlides = [
    {
      label: "01 — La timeline",
      title: `Le chemin parcouru par ${enfantPrenom || "l'enfant"}`,
      description: "Chaque séance, chaque observation, chaque étape clé — réunis en un seul endroit, chronologiquement.",
      illustration: <SlideTimeline enfantPrenom={enfantPrenom || "l'enfant"} />,
    },
    ...(showMemos
      ? [
          {
            label: "02 — Les mémos",
            title: "Capturer l'essentiel en quelques secondes",
            description: "Après une séance, dictez vos observations à voix haute. L'IA structure et résume automatiquement.",
            illustration: <SlideMemos />,
          },
        ]
      : []),
    {
      label: showMemos ? "03 — Le village" : "02 — Le village",
      title: `Tous ceux qui accompagnent ${enfantPrenom || "l'enfant"}`,
      description: "Professionnels, famille, proches — réunis dans un seul espace pour coordonner le suivi.",
      illustration: (
        <SlideVillage
          inviterName={inviterName || "L'équipe"}
          currentUserEmail={user?.email || "invité"}
          role={role}
        />
      ),
    },
  ];

  return (
    <>
      <style>{animationStyles}</style>
      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)",
        }}
      >
        {step === 1 && (
          <ScreenWelcome
            enfantPrenom={enfantPrenom || "l'enfant"}
            inviterName={inviterName || "L'équipe"}
            role={role}
            onNext={() => setStep(2)}
            onLogin={() => navigate("/auth")}
          />
        )}
        {step === 2 && (
          <ScreenPrenom
            value={invitePrenom}
            onChange={setInvitePrenom}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ScreenPassword
            email={inviteEmail || user?.email || ""}
            enfantPrenom={enfantPrenom || "l'enfant"}
            invitePrenom={invitePrenom}
            onDone={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <DiscoveryCarousel
            slides={discoverySlides}
            onFinish={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <ScreenReady
            enfantPrenom={enfantPrenom || "l'enfant"}
            role={role}
            onFinish={finish}
          />
        )}
      </div>
    </>
  );
}
