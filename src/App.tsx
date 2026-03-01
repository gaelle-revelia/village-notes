import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSwipeNavigation } from "./hooks/useSwipeNavigation";
import { useAuth } from "./hooks/useAuth";
import Auth from "./pages/Auth";
import Timeline from "./pages/Timeline";
import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";
import RecordMemo from "./pages/RecordMemo";
import NouveauMemoVocal from "./pages/NouveauMemoVocal";
import NouvelleNote from "./pages/NouvelleNote";
import NouveauDocument from "./pages/NouveauDocument";
import NouvelEvenement from "./pages/NouvelEvenement";
import MemoResult from "./pages/MemoResult";
import ProfileSettings from "./pages/ProfileSettings";
import VillageSettings from "./pages/VillageSettings";
import ChildProfile from "./pages/ChildProfile";
import AppSettings from "./pages/AppSettings";
import SelenaScreen from "./pages/SelenaScreen";
import OutilsScreen from "./pages/OutilsScreen";
import ExplorerScreen from "./pages/ExplorerScreen";
import OnboardingInvite from "./pages/OnboardingInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (localStorage.getItem('invite_pending') === 'true') {
    return <Navigate to="/onboarding-invite" replace />;
  }

  return <Navigate to="/timeline" replace />;
};

const AppRoutes = () => {
  useSwipeNavigation();
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/selena" element={<SelenaScreen />} />
      <Route path="/outils" element={<OutilsScreen />} />
      <Route path="/explorer" element={<ExplorerScreen />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/record" element={<RecordMemo />} />
      <Route path="/nouveau-memo-vocal" element={<NouveauMemoVocal />} />
      <Route path="/nouvelle-note" element={<NouvelleNote />} />
      <Route path="/nouveau-document" element={<NouveauDocument />} />
      <Route path="/nouvel-evenement" element={<NouvelEvenement />} />
      <Route path="/memo-result/:id" element={<MemoResult />} />
      <Route path="/profil" element={<ProfileSettings />} />
      <Route path="/village" element={<VillageSettings />} />
      <Route path="/enfant" element={<ChildProfile />} />
      <Route path="/parametres" element={<AppSettings />} />
      <Route path="/onboarding-invite" element={<OnboardingInvite />} />
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
