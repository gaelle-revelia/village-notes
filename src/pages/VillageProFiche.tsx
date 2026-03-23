import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Intervenant = {
  id: string;
  nom: string;
  specialite: string | null;
  type: string;
  telephone: string | null;
  email: string | null;
  structure: string | null;
  notes: string | null;
};

function getAvatarGradient(specialite: string | null, type: string): string {
  const s = (specialite ?? "").toLowerCase();
  if (s.includes("kiné") || s.includes("kine") || s.includes("moteur") || s.includes("motric"))
    return "linear-gradient(135deg, #E8736A, #E8845A)";
  if (s.includes("psychomot") || s.includes("psycho"))
    return "linear-gradient(135deg, #8B74E0, #5CA8D8)";
  if (s.includes("ergo"))
    return "linear-gradient(135deg, #44A882, #4E96C8)";
  if (s.includes("ortho"))
    return "linear-gradient(135deg, #44A882, #4E96C8)";
  if (type === "famille" || s.includes("parent") || s.includes("famille"))
    return "linear-gradient(135deg, #E8736A, #C85A8A)";
  return "linear-gradient(135deg, #8A9BAE, #6B7F94)";
}

const glassCard =
  "bg-[rgba(255,255,255,0.52)] backdrop-blur-[16px] backdrop-saturate-[1.6] border border-[rgba(255,255,255,0.72)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]";

export default function VillageProFiche() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Intervenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("intervenants")
      .select("id, nom, specialite, type, telephone, email, structure, notes")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setMember(data ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#9A9490]">Chargement…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[#9A9490]">Membre introuvable.</p>
        <button onClick={() => navigate("/village")} className="text-sm text-[#8B74E0] font-medium">
          ← Mon Village
        </button>
      </div>
    );
  }

  const hasTel = !!member.telephone?.trim();
  const hasEmail = !!member.email?.trim();

  return (
    <div className="min-h-screen px-4 pt-4 pb-24">
      {/* Back */}
      <button
        onClick={() => navigate("/village")}
        className="flex items-center gap-1.5 mb-6 text-sm font-medium text-[#8B74E0]"
      >
        <ArrowLeft className="w-4 h-4" />
        Mon Village
      </button>

      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold mb-3"
          style={{ background: getAvatarGradient(member.specialite, member.type) }}
        >
          {member.nom.charAt(0).toUpperCase()}
        </div>
        <h1 className="font-['Fraunces'] text-[22px] font-bold text-[#1E1A1A]">
          {member.nom}
        </h1>
        {member.specialite && (
          <p className="text-sm text-[#9A9490] mt-0.5">{member.specialite}</p>
        )}
        {member.structure && (
          <p className="text-xs text-[#8B74E0] font-medium mt-0.5">{member.structure}</p>
        )}
      </div>

      {/* Contact row */}
      <div className="flex gap-2.5 mb-6">
        {hasTel ? (
          <a
            href={`tel:${member.telephone!.trim()}`}
            className={`${glassCard} flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-center`}
          >
            <Phone className="w-[18px] h-[18px] text-[#44A882]" />
            <span className="text-xs font-medium text-[#1E1A1A]">Appeler</span>
          </a>
        ) : (
          <button
            onClick={() => navigate(`/village/${member.id}/edit`)}
            className={`${glassCard} flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-center`}
          >
            <Phone className="w-[18px] h-[18px] text-[#9A9490]" />
            <span className="text-xs font-medium text-[#9A9490]">Ajouter</span>
          </button>
        )}
        {hasEmail ? (
          <a
            href={`mailto:${member.email!.trim()}`}
            className={`${glassCard} flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-center`}
          >
            <Mail className="w-[18px] h-[18px] text-[#8B74E0]" />
            <span className="text-xs font-medium text-[#1E1A1A]">Email</span>
          </a>
        ) : (
          <button
            onClick={() => navigate(`/village/${member.id}/edit`)}
            className={`${glassCard} flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-center`}
          >
            <Mail className="w-[18px] h-[18px] text-[#9A9490]" />
            <span className="text-xs font-medium text-[#9A9490]">Ajouter</span>
          </button>
        )}
        <button
          onClick={() => navigate(`/village/${member.id}/edit`)}
          className={`${glassCard} flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-center`}
        >
          <Pencil className="w-[18px] h-[18px] text-[#534AB7]" />
          <span className="text-xs font-medium text-[#1E1A1A]">Éditer</span>
        </button>
      </div>

      {/* Placeholder sections */}
      <div className="flex flex-col gap-3">
        <div className={`${glassCard} px-4 py-4`}>
          <h2 className="font-['Fraunces'] text-base font-semibold text-[#1E1A1A] mb-1">
            Rendez-vous
          </h2>
          <p className="text-sm text-[#9A9490]">Bientôt disponible</p>
        </div>

        <div className={`${glassCard} px-4 py-4`}>
          <h2 className="font-['Fraunces'] text-base font-semibold text-[#1E1A1A] mb-1">
            Questions
          </h2>
          <p className="text-sm text-[#9A9490]">Bientôt disponible</p>
        </div>
      </div>
    </div>
  );
}
