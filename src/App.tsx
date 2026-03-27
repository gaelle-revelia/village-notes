import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSwipeNavigation } from "./hooks/useSwipeNavigation";
import Auth from "./pages/Auth";
import Timeline from "./pages/Timeline";
import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";

import NouveauMemoVocal from "./pages/NouveauMemoVocal";
import NouvelleQuestion from "./pages/NouvelleQuestion";
import NouvelleNote from "./pages/NouvelleNote";
import NouveauDocument from "./pages/NouveauDocument";
import NouvelEvenement from "./pages/NouvelEvenement";
import MemoResult from "./pages/MemoResult";
import OutilsActiviteChrono from "./pages/OutilsActiviteChrono";
import OutilsQuestions from "./pages/OutilsQuestions";
import OutilsActiviteManuel from "./pages/OutilsActiviteManuel";
import ProfileSettings from "./pages/ProfileSettings";
import VillageSettings from "./pages/VillageSettings";
import ChildProfile from "./pages/ChildProfile";
import AppSettings from "./pages/AppSettings";
import SelenaScreen from "./pages/SelenaScreen";
import OutilsScreen from "./pages/OutilsScreen";
import OutilsActivites from "./pages/OutilsActivites";
import OutilsActiviteCreer from "./pages/OutilsActiviteCreer";
import OutilsSynthese from "./pages/OutilsSynthese";
import OutilsSyntheseRdv from "./pages/OutilsSyntheseRdv";
import OutilsSynthesePickMeUp from "./pages/OutilsSynthesePickMeUp";
import OutilsSyntheseMdph from "./pages/OutilsSyntheseMdph";
import OutilsSyntheseRdvBriefing from "./pages/OutilsSyntheseRdvBriefing";
import OutilsSyntheseMdphResultats from "./pages/OutilsSyntheseMdphResultats";
import OutilsSyntheseTransmission from "./pages/OutilsSyntheseTransmission";
import OutilsCoherence from "./pages/OutilsCoherence";

import OnboardingInvite from "./pages/OnboardingInvite";
import Vocabulaire from "./pages/Vocabulaire";
import PlaceholderScreen from "./components/PlaceholderScreen";
import NotFound from "./pages/NotFound";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import Waitlist from "./pages/Waitlist";
import AVenirDetail from "./pages/AVenirDetail";
import VillageProFiche from "./pages/VillageProFiche";
import VillageProEdit from "./pages/VillageProEdit";
import Archives from "./pages/Archives";

const queryClient = new QueryClient();

const AppRoutes = () => {
  useSwipeNavigation();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/selena" element={<SelenaScreen />} />
      <Route path="/outils" element={<OutilsScreen />} />
      <Route path="/outils/activites" element={<OutilsActivites />} />
      <Route path="/outils/activites/creer" element={<OutilsActiviteCreer />} />
      <Route path="/outils/activites/:id/chrono" element={<OutilsActiviteChrono />} />
      <Route path="/outils/activites/:id/manuel" element={<OutilsActiviteManuel />} />
      <Route path="/outils/synthese" element={<OutilsSynthese />} />
      <Route path="/outils/questions" element={<OutilsQuestions />} />
      <Route path="/outils/synthese/pick-me-up" element={<OutilsSynthesePickMeUp />} />
      <Route path="/outils/synthese/mdph" element={<OutilsSyntheseMdph />} />
      <Route path="/outils/synthese/mdph/resultats" element={<OutilsSyntheseMdphResultats />} />
      <Route path="/outils/synthese/rdv" element={<OutilsSyntheseRdv />} />
      <Route path="/outils/synthese/rdv/briefing" element={<OutilsSyntheseRdvBriefing />} />
      <Route path="/outils/synthese/rdv/presentation" element={<PlaceholderScreen title="Présenter l'enfant" />} />
      <Route path="/outils/synthese/transmission" element={<OutilsSyntheseTransmission />} />
      <Route path="/outils/coherence" element={<OutilsCoherence />} />
      <Route path="/explorer" element={<ExplorerScreen />} />
      <Route path="/a-venir" element={<OutilsQuestions />} />
      <Route path="/a-venir/:id" element={<AVenirDetail />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/record" element={<Navigate to="/nouveau-memo-vocal" replace />} />
      <Route path="/nouveau-memo-vocal" element={<NouveauMemoVocal />} />
      <Route path="/nouvelle-question" element={<NouvelleQuestion />} />
      <Route path="/nouvelle-note" element={<NouvelleNote />} />
      <Route path="/nouveau-document" element={<NouveauDocument />} />
      <Route path="/nouvel-evenement" element={<NouvelEvenement />} />
      <Route path="/memo-result/:id" element={<MemoResult />} />
      <Route path="/profil" element={<ProfileSettings />} />
      <Route path="/village" element={<VillageSettings />} />
      <Route path="/village/:id" element={<VillageProFiche />} />
      <Route path="/village/:id/edit" element={<VillageProEdit />} />
      <Route path="/enfant" element={<ChildProfile />} />
      <Route path="/parametres" element={<AppSettings />} />
      <Route path="/onboarding-invite" element={<OnboardingInvite />} />
      <Route path="/vocabulaire" element={<Vocabulaire />} />
      <Route path="/archives" element={<Archives />} />
      <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
