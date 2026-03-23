import { Activity, Hand, Brain, Stethoscope, MessageCircle, User, Heart, Waves, type LucideIcon } from "lucide-react";

export function getAvatarGradient(specialite: string | null, type: string): string {
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

const SPECIALITE_AVATARS: Record<string, { icon: LucideIcon; gradient: string }> = {
  kiné: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  kinésithérapeute: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  psychomotric: { icon: Brain, gradient: "linear-gradient(135deg, #8B74E0, #5CA8D8)" },
  ergothérapeute: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  ergo: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  parent: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  famille: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  papa: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  maman: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  "grand-parents": { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  parrain: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  marraine: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  médecin: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  mpr: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  orthophoniste: { icon: MessageCircle, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  piscine: { icon: Waves, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
};

export function getSpecialiteAvatar(specialite: string | null): { icon: LucideIcon; gradient: string } {
  const s = (specialite || "").toLowerCase();
  for (const [key, val] of Object.entries(SPECIALITE_AVATARS)) {
    if (s.includes(key)) return val;
  }
  return { icon: User, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" };
}
