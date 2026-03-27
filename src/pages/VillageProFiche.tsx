import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarGradient } from "@/lib/avatar";

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

type QuestionRow = {
  id: string;
  text: string;
  type: string;
  due_date: string | null;
  archived_at: string | null;
  answer: string | null;
};


const glassCard =
  "bg-[rgba(255,255,255,0.52)] backdrop-blur-[16px] backdrop-saturate-[1.6] border border-[rgba(255,255,255,0.72)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]";

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isWithin3Days(dateStr: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = d.getTime() - now.getTime();
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

export default function VillageProFiche() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Intervenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [rdvList, setRdvList] = useState<QuestionRow[]>([]);
  const [questionList, setQuestionList] = useState<QuestionRow[]>([]);
  const [rdvExpanded, setRdvExpanded] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Fetch member
    supabase
      .from("intervenants")
      .select("id, nom, specialite, type, telephone, email, structure, notes")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setMember(data ?? null);
        setLoading(false);
      });

    // Fetch questions linked to this pro
    supabase
      .from("questions")
      .select("id, text, type, due_date, archived_at, answer")
      .contains("linked_pro_ids", [id])
      .order("archived_at", { ascending: true, nullsFirst: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        const rows = (data ?? []) as QuestionRow[];
        setRdvList(rows.filter((r) => r.type === "rdv"));
        setQuestionList(rows.filter((r) => r.type === "question" || r.type === "rappel"));
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#8B74E0", borderTopColor: "transparent" }}
        />
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

  const renderItem = (
    item: QuestionRow,
    dotColor: string,
    isLast: boolean,
    badgeNode: React.ReactNode
  ) => {
    const isArchived = !!item.archived_at;
    return (
      <button
        key={item.id}
        onClick={() => navigate(`/a-venir/${item.id}`)}
        className="flex items-center gap-2.5 py-2 w-full text-left"
        style={!isLast ? { borderBottom: "1px solid rgba(139,116,224,0.07)" } : undefined}
      >
        <div
          className="shrink-0"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isArchived ? "transparent" : dotColor,
            border: isArchived ? "2px solid #C4C0BC" : "none",
          }}
        />
        <span
          className="flex-1 text-sm min-w-0 truncate"
          style={{
            color: isArchived ? "#9A9490" : "#1E1A1A",
            textDecoration: isArchived ? "line-through" : "none",
          }}
        >
          {item.text}
        </span>
        {item.due_date && (
          <span className="shrink-0 text-[11px] text-[#9A9490]">
            {formatShortDate(item.due_date)}
          </span>
        )}
        {badgeNode}
      </button>
    );
  };

  const rdvBadge = (item: QuestionRow) => {
    if (item.archived_at) {
      return (
        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[5px]" style={{ background: "#F1EFE8", color: "#888780" }}>
          Fait
        </span>
      );
    }
    if (item.due_date && isWithin3Days(item.due_date)) {
      return (
        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[5px]" style={{ background: "#FAEEDA", color: "#854F0B" }}>
          Bientôt
        </span>
      );
    }
    return null;
  };

  const questionBadge = (item: QuestionRow) => {
    if (item.archived_at) {
      return (
        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[5px]" style={{ background: "#F1EFE8", color: "#888780" }}>
          Réponse
        </span>
      );
    }
    return (
      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[5px]" style={{ background: "#E1F5EE", color: "#0F6E56" }}>
        Ouverte
      </span>
    );
  };

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

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {/* Rendez-vous */}
        <div className={`${glassCard} px-4 py-4`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-[#9A9490] uppercase tracking-wide">
              Rendez-vous
            </span>
            <button
              onClick={() => navigate(`/nouvelle-question?type=rdv&pro_id=${member.id}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-[#8B74E0]"
            >
              <Plus className="w-3 h-3" />
              Nouveau
            </button>
          </div>
          {rdvList.length === 0 ? (
            <button
              onClick={() => navigate(`/nouvelle-question?type=rdv&pro_id=${member.id}`)}
              className="w-full text-center text-sm text-[#8B74E0] font-medium py-2"
            >
              + Nouveau RDV
            </button>
          ) : (
            <>
              {(rdvExpanded ? rdvList : rdvList.slice(0, 3)).map((item, i, arr) =>
                renderItem(item, "#8B74E0", i === arr.length - 1 && (rdvExpanded || rdvList.length <= 3), rdvBadge(item))
              )}
              {rdvList.length > 3 && (
                <button
                  onClick={() => setRdvExpanded(!rdvExpanded)}
                  className="w-full text-center py-1.5"
                  style={{ fontSize: 11, color: rdvExpanded ? "#9A9490" : "#8B74E0" }}
                >
                  {rdvExpanded ? "Replier" : `Voir ${rdvList.length - 3} de plus`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Questions */}
        <div className={`${glassCard} px-4 py-4`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-[#9A9490] uppercase tracking-wide">
              Questions
            </span>
            <button
              onClick={() => navigate(`/nouvelle-question?type=question&pro_id=${member.id}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-[#8B74E0]"
            >
              <Plus className="w-3 h-3" />
              Nouvelle
            </button>
          </div>
          {questionList.length === 0 ? (
            <button
              onClick={() => navigate(`/nouvelle-question?type=question&pro_id=${member.id}`)}
              className="w-full text-center text-sm text-[#8B74E0] font-medium py-2"
            >
              + Nouvelle question
            </button>
          ) : (
            <>
              {(questionExpanded ? questionList : questionList.slice(0, 3)).map((item, i, arr) =>
                renderItem(item, "#44A882", i === arr.length - 1 && (questionExpanded || questionList.length <= 3), questionBadge(item))
              )}
              {questionList.length > 3 && (
                <button
                  onClick={() => setQuestionExpanded(!questionExpanded)}
                  className="w-full text-center py-1.5"
                  style={{ fontSize: 11, color: questionExpanded ? "#9A9490" : "#8B74E0" }}
                >
                  {questionExpanded ? "Replier" : `Voir ${questionList.length - 3} de plus`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
