import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AlbaranesPage from "@/pages/AlbaranesPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import CategoriasPage from "@/pages/CategoriasPage";
import FamiliasPage from "@/pages/FamiliasPage";
import ProductosPage from "@/pages/ProductosPage";
import CartaPage from "@/pages/CartaPage";
import StockPage from "@/pages/StockPage";
import ArqueoZPage from "@/pages/ArqueoZPage";
import FacturacionPage from "@/pages/FacturacionPage";
import ConciliacionPage from "@/pages/ConciliacionPage";
import AjustesPage from "@/pages/AjustesPage";
import PersonalPage from "@/pages/PersonalPage";
import AlquilerPage from "@/pages/AlquilerPage";
import BancosPage from "@/pages/BancosPage";
import SuministrosPage from "@/pages/SuministrosPage";
import CuadrantePage from "@/pages/CuadrantePage";
import FichajePage from "@/pages/FichajePage";
import AusenciasPage from "@/pages/AusenciasPage";
import PrediccionPage from "@/pages/PrediccionPage";
import IngenieriaMenuPage from "@/pages/IngenieriaMenuPage";
import MermasPage from "@/pages/MermasPage";
import PricingPage from "@/pages/PricingPage";
import BancaPage from "@/pages/BancaPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/albaranes" element={<AlbaranesPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/familias" element={<FamiliasPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/carta" element={<CartaPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/arqueo-z" element={<ArqueoZPage />} />
        <Route path="/facturacion" element={<FacturacionPage />} />
        <Route path="/conciliacion" element={<ConciliacionPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/cuadrante" element={<CuadrantePage />} />
        <Route path="/fichaje" element={<FichajePage />} />
        <Route path="/ausencias" element={<AusenciasPage />} />
        <Route path="/alquiler" element={<AlquilerPage />} />
        <Route path="/bancos" element={<BancosPage />} />
        <Route path="/suministros" element={<SuministrosPage />} />
        <Route path="/prediccion" element={<PrediccionPage />} />
        <Route path="/ingenieria-menu" element={<IngenieriaMenuPage />} />
        <Route path="/mermas" element={<MermasPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/banca" element={<BancaPage />} />
      </Route>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

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
