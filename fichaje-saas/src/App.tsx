import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import Layout from "@/shared/components/Layout";

// Modules
import LandingPage from "@/modules/auth/LandingPage";
import AuthPage from "@/modules/auth/AuthPage";
import DashboardPage from "@/modules/dashboard/DashboardPage";
import MyClockPage from "@/modules/clock/MyClockPage";
import FichajePage from "@/modules/clock/FichajePage";
import KioskPage from "@/modules/clock/KioskPage";
import CuadrantePage from "@/modules/schedule/CuadrantePage";
import CuadranteIAPage from "@/modules/schedule/CuadranteIAPage";
import AusenciasPage from "@/modules/absences/AusenciasPage";
import ShiftSwapPage from "@/modules/swaps/ShiftSwapPage";
import ReportesPage from "@/modules/reports/ReportesPage";
import NominaPage from "@/modules/payroll/NominaPage";
import EmployeesPage from "@/modules/employees/EmployeesPage";
import LocationsPage from "@/modules/locations/LocationsPage";
import SettingsPage from "@/modules/settings/SettingsPage";
import NotFoundPage from "@/shared/components/NotFoundPage";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading && session) return <Spinner />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={session ? <Navigate to="/app" replace /> : <AuthPage />} />
      <Route path="/kiosco" element={<KioskPage />} />

      {/* Protected */}
      {session && profile ? (
        <Route path="/app" element={<Layout profile={profile} />}>
          <Route index element={<DashboardPage profile={profile} />} />
          <Route path="my-clock" element={<MyClockPage profile={profile} />} />
          <Route path="fichaje" element={<FichajePage profile={profile} />} />
          <Route path="cuadrante" element={<CuadrantePage profile={profile} />} />
          <Route path="cuadrante-ia" element={<CuadranteIAPage profile={profile} />} />
          <Route path="ausencias" element={<AusenciasPage profile={profile} />} />
          <Route path="swaps" element={<ShiftSwapPage profile={profile} />} />
          <Route path="reportes" element={<ReportesPage profile={profile} />} />
          <Route path="nomina" element={<NominaPage profile={profile} />} />
          <Route path="empleados" element={<EmployeesPage profile={profile} />} />
          <Route path="locales" element={<LocationsPage profile={profile} />} />
          <Route path="ajustes" element={<SettingsPage profile={profile} />} />
        </Route>
      ) : (
        <Route path="/app/*" element={<Navigate to="/auth" replace />} />
      )}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
