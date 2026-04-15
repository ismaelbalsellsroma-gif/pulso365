import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import MyClockPage from "@/pages/MyClockPage";
import FichajePage from "@/pages/FichajePage";
import EmployeesPage from "@/pages/EmployeesPage";
import LocationsPage from "@/pages/LocationsPage";
import SettingsPage from "@/pages/SettingsPage";
import KioskPage from "@/pages/KioskPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={session ? <Navigate to="/app" replace /> : <AuthPage />}
      />
      <Route path="/kiosco" element={<KioskPage />} />

      {/* Protected routes */}
      {session && profile ? (
        <Route path="/app" element={<Layout profile={profile} />}>
          <Route index element={<DashboardPage profile={profile} />} />
          <Route path="my-clock" element={<MyClockPage profile={profile} />} />
          <Route path="fichaje" element={<FichajePage profile={profile} />} />
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
