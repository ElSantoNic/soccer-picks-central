import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import PicksPage from "./pages/PicksPage";
import ResultsPage from "./pages/ResultsPage";
import CreateLeaguePage from "./pages/CreateLeaguePage";
import LeaguePage from "./pages/LeaguePage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/picks" element={<PicksPage />} />
          <Route path="/picks/results" element={<ResultsPage />} />
          <Route path="/league/create" element={<CreateLeaguePage />} />
          <Route path="/league/:leagueId" element={<LeaguePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
