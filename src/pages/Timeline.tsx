import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemoCard } from "@/components/memo/MemoCard";

interface Memo {
  id: string;
  created_at: string;
  memo_date?: string;
  type?: string;
  processing_status: string;
  transcription_raw: string | null;
  content_structured: any;
  intervenant_id: string | null;
  intervenant?: { nom: string; specialite: string | null } | null;
}

const Timeline = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const menuItems = [
    { icon: "🎙️", label: "Note vocale", description: "Enregistrer une séance à la voix", route: "/nouveau-memo-vocal" },
    { icon: "📝", label: "Note écrite", description: "Ajouter une observation ou une pensée", route: "/nouvelle-note" },
    { icon: "📄", label: "Document", description: "Importer un compte rendu ou une photo", route: "/nouveau-document" },
    { icon: "📌", label: "Événement", description: "Noter un fait marquant", route: "/nouvel-evenement" },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchMemos = async () => {
      const { data } = await supabase
        .from("memos")
        .select("id, created_at, memo_date, type, processing_status, transcription_raw, content_structured, intervenant_id")
        .eq("user_id", user.id)
        .order("memo_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        // Fetch intervenants for memos that have one
        const intervenantIds = [...new Set(data.filter(m => m.intervenant_id).map(m => m.intervenant_id!))];
        let intervenantsMap: Record<string, { nom: string; specialite: string | null }> = {};

        if (intervenantIds.length > 0) {
          const { data: intervenants } = await supabase
            .from("intervenants")
            .select("id, nom, specialite")
            .in("id", intervenantIds);

          if (intervenants) {
            intervenantsMap = Object.fromEntries(intervenants.map(i => [i.id, { nom: i.nom, specialite: i.specialite }]));
          }
        }

        setMemos(data.map(m => ({
          ...m,
          intervenant: m.intervenant_id ? intervenantsMap[m.intervenant_id] || null : null,
        })));
      }
      setLoadingMemos(false);
    };

    fetchMemos();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const filteredMemos = searchQuery.trim()
    ? memos.filter(m => {
        const q = searchQuery.toLowerCase();
        const structured = m.content_structured as any;
        return (
          m.transcription_raw?.toLowerCase().includes(q) ||
          structured?.resume?.toLowerCase().includes(q) ||
          structured?.details?.some((d: string) => d.toLowerCase().includes(q)) ||
          structured?.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
          m.intervenant?.nom.toLowerCase().includes(q) ||
          m.type?.toLowerCase().includes(q)
        );
      })
    : memos;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 space-y-3">
        <h1 className="text-xl font-semibold text-card-foreground">The Village</h1>
        {memos.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans vos notes..."
              className="pl-9 rounded-xl"
            />
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        {loadingMemos ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            {memos.length === 0 ? (
              <>
                <span className="text-4xl">🌿</span>
                <h2 className="text-lg font-semibold text-card-foreground">
                  Votre timeline est prête
                </h2>
                <p className="text-muted-foreground text-sm max-w-[260px]">
                  Enregistrez votre premier mémo après la prochaine séance. C'est rapide et facile.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Aucun résultat pour « {searchQuery} »</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemos.map(memo => (
              <MemoCard key={memo.id} memo={memo} />
            ))}
          </div>
        )}
      </main>

      {/* FAB + */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
        aria-label="Ajouter"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent hideClose className="w-[85vw] max-w-md rounded-2xl border-none shadow-xl p-0 gap-0 [&~[data-state]]:bg-black/40">
          <DialogHeader className="flex flex-row items-center justify-end px-4 pt-3 pb-0">
            <DialogTitle className="sr-only">Ajouter</DialogTitle>
            <button
              onClick={() => setSheetOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <nav className="px-2 pb-4 pt-1">
            {menuItems.map((item) => (
              <button
                key={item.route}
                onClick={() => { setSheetOpen(false); navigate(item.route); }}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timeline;
