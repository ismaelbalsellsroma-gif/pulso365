import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Clock, ArrowLeft, Play, Users, Shield } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { enableDemoMode } from "@/demo";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type Mode = "admin-login" | "admin-signup" | "employee-login";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("employee-login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login empleado con email + PIN
  async function handleEmployeeLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("employee_login", {
        p_email: email,
        p_pin: pin,
      });
      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.error ?? "Email o PIN incorrecto");
        return;
      }

      // Guardar sesión de empleado en localStorage
      localStorage.setItem("fichaje_employee_session", JSON.stringify({
        employee: result.employee,
        org_name: result.org_name,
        logged_in_at: new Date().toISOString(),
      }));

      toast.success(`¡Bienvenido, ${result.employee.first_name}!`);
      navigate("/app/my-clock", { replace: true });
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  // Login/signup admin con email + contraseña
  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "admin-login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido");
        navigate("/app", { replace: true });
      } else {
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signupError) throw signupError;
        if (!signupData.user) throw new Error("No se pudo crear el usuario");

        if (!signupData.session) {
          toast.success("Cuenta creada. Revisa tu email para confirmar.");
          setMode("admin-login");
          return;
        }

        const { error: rpcError } = await supabase.rpc("bootstrap_organization", {
          org_name: orgName,
          full_user_name: fullName,
        });
        if (rpcError) throw rpcError;

        toast.success("Cuenta creada");
        navigate("/app", { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-brand-600 items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === "employee-login" ? "Acceso empleado" : mode === "admin-login" ? "Acceso manager" : "Crear cuenta empresa"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "employee-login" ? "Entra con tu email y PIN" : mode === "admin-login" ? "Panel de gestión" : "Configura tu negocio"}
            </p>
          </div>

          {/* Toggle tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setMode("employee-login")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${mode === "employee-login" ? "text-brand-600 border-b-2 border-brand-600 bg-brand-50/50" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Users className="h-4 w-4" /> Empleado
            </button>
            <button
              onClick={() => setMode("admin-login")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${mode === "admin-login" || mode === "admin-signup" ? "text-brand-600 border-b-2 border-brand-600 bg-brand-50/50" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Shield className="h-4 w-4" /> Manager
            </button>
          </div>

          {/* ═══ EMPLOYEE LOGIN: email + PIN ═══ */}
          {mode === "employee-login" && (
            <form onSubmit={handleEmployeeLogin} className="p-6 space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="mt-1.5"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label>PIN (el que te dio tu manager)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  required
                  className="mt-1.5 text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading || pin.length < 4}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <p className="text-center text-xs text-slate-400 mt-2">
                Tu manager te da el email y el PIN cuando te da de alta
              </p>
            </form>
          )}

          {/* ═══ ADMIN LOGIN ═══ */}
          {mode === "admin-login" && (
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@tulocal.com" required className="mt-1.5" autoComplete="email" />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1.5" autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Entrando..." : "Entrar como manager"}
              </Button>
              <div className="text-center text-sm text-slate-500 pt-2">
                ¿Primera vez?{" "}
                <button type="button" onClick={() => setMode("admin-signup")} className="text-brand-600 font-semibold hover:underline">
                  Crear cuenta de empresa
                </button>
              </div>
            </form>
          )}

          {/* ═══ ADMIN SIGNUP ═══ */}
          {mode === "admin-signup" && (
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div>
                <Label>Nombre del local / empresa</Label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Bar La Plaza" required className="mt-1.5" />
              </div>
              <div>
                <Label>Tu nombre</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="María García" required className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@tulocal.com" required className="mt-1.5" autoComplete="email" />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1.5" autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Creando..." : "Crear cuenta"}
              </Button>
              <div className="text-center text-sm text-slate-500 pt-2">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => setMode("admin-login")} className="text-brand-600 font-semibold hover:underline">
                  Iniciar sesión
                </button>
              </div>
            </form>
          )}

          {/* Demo */}
          <div className="px-6 pb-6">
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">o</span></div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              size="sm"
              onClick={() => {
                enableDemoMode();
                toast.success("Modo demo activado");
                navigate("/app", { replace: true });
                window.location.reload();
              }}
            >
              <Play className="h-3.5 w-3.5" /> Ver demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
