import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface MemberDetailPanelProps {
  member: Intervenant;
  getAvatarGradient: (specialite: string | null, type: string) => string;
  onSave: (fields: {
    nom: string;
    specialite: string;
    telephone: string;
    email: string;
    structure: string;
    notes: string;
  }) => void;
  onClose: () => void;
  onDelete: (member: Intervenant) => void;
  saving: boolean;
}

export default function MemberDetailPanel({
  member,
  getAvatarGradient,
  onSave,
  onClose,
  onDelete,
  saving,
}: MemberDetailPanelProps) {
  const [visible, setVisible] = useState(false);
  const [nom, setNom] = useState(member.nom);
  const [specialite, setSpecialite] = useState(member.specialite ?? "");
  const [telephone, setTelephone] = useState(member.telephone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [structure, setStructure] = useState(member.structure ?? "");
  const [notes, setNotes] = useState(member.notes ?? "");

  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  // Two-phase mount animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Swipe-right-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    if (touchDeltaX.current > 80) close();
  };

  const handleSubmit = () => {
    onSave({ nom, specialite, telephone, email, structure, notes });
  };

  const typeBadge = member.type === "pro"
    ? { label: "Pro", bg: "bg-[#8B74E0]/15 text-[#8B74E0]" }
    : { label: "Famille", bg: "bg-[#E8736A]/15 text-[#C85A8A]" };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ backgroundColor: visible ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)" }}
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed inset-y-0 right-0 z-50 w-[65%] md:w-[40%] overflow-y-auto flex flex-col"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderLeft: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition"
        >
          <X className="w-5 h-5 text-[#1E1A1A]" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-5 px-5 gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold"
            style={{ background: getAvatarGradient(member.specialite, member.type) }}
          >
            {member.nom.charAt(0).toUpperCase()}
          </div>
          <p className="font-['DM_Sans'] text-lg font-semibold text-[#1E1A1A] text-center">
            {member.nom}
          </p>
          {member.specialite && (
            <p className="font-['DM_Sans'] text-sm text-[#9A9490] text-center">
              {member.specialite}
            </p>
          )}
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${typeBadge.bg}`}>
            {typeBadge.label}
          </span>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4 px-5 flex-1">
          <FieldBlock label="NOM">
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Prénom Nom"
              className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
              maxLength={100}
            />
          </FieldBlock>

          {member.type === "famille" ? (
            <>
              <FieldBlock label="RELATION">
                <Select value={specialite} onValueChange={setSpecialite}>
                  <SelectTrigger className="bg-white/30 border-white/50 text-sm text-[#1E1A1A]">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Papa", "Maman", "Grand-parents", "Parrain", "Marraine"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock label="TÉLÉPHONE">
                <Input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  type="tel"
                  maxLength={20}
                />
              </FieldBlock>

              <FieldBlock label="EMAIL">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  type="email"
                  maxLength={255}
                />
              </FieldBlock>
            </>
          ) : (
            <>
              <FieldBlock label="SPÉCIALITÉ">
                <Input
                  value={specialite}
                  onChange={(e) => setSpecialite(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  maxLength={100}
                />
              </FieldBlock>

              <FieldBlock label="STRUCTURE / LIEU">
                <Input
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  maxLength={200}
                />
              </FieldBlock>

              <FieldBlock label="TÉLÉPHONE">
                <Input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  type="tel"
                  maxLength={20}
                />
              </FieldBlock>

              <FieldBlock label="EMAIL">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A]"
                  type="email"
                  maxLength={255}
                />
              </FieldBlock>

              <FieldBlock label="NOTES LIBRES">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter..."
                  className="bg-white/30 border-white/50 placeholder:italic placeholder:text-[#9A9490] text-sm text-[#1E1A1A] resize-none"
                  rows={3}
                  maxLength={500}
                />
              </FieldBlock>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-5 flex flex-col gap-2 mt-auto">
          <button
            onClick={handleSubmit}
            disabled={!nom.trim() || saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          <button
            onClick={close}
            className="w-full py-2 text-sm text-[#9A9490] font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => { onDelete(member); close(); }}
            className="w-full py-2 flex items-center justify-center gap-1 text-sm text-[#E8736A] hover:text-[#d4625a] font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Retirer du village
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-['DM_Sans'] text-[11px] uppercase tracking-wider text-[#9A9490] mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}
