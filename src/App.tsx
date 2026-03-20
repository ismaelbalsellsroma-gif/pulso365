import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="/alquiler" element={<AlquilerPage />} />
            <Route path="/bancos" element={<BancosPage />} />
            <Route path="/suministros" element={<SuministrosPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
