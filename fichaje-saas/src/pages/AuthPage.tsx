import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Clock, ArrowLeft, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { enableDemoMode } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido");
        navigate("/app", { replace: true });
      } else {
        // 1. Crear el usuario en auth.users (el trigger `handle_new_user`
        //    creará el profile automáticamente con organization_id = null).
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (signupError) throw signupError;
        if (!signupData.user) throw new Error("No se pudo crear el usuario");

        // 2. Si Supabase tiene "confirm email" activado, no hay sesión aún.
        //    En ese caso, el admin deberá confirmar el email y luego entrar
        //    para completar la organización.
        if (!signupData.session) {
          toast.success("Cuenta creada. Revisa tu email para confirmar.");
          setMode("signin");
          return;
        }

        // 3. Crear la organización vía RPC (bypasa RLS con SECURITY DEFINER).
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-brand-600 items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "signin"
                ? "Accede al panel de fichaje"
                : "Prueba Fichaje gratis — sin tarjeta"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label>Nombre del local / empresa</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Bar La Plaza"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Tu nombre</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="María García"
                    required
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

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
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="mt-1.5"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? "Procesando..."
                : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">o</span></div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => {
                enableDemoMode();
                toast.success("Modo demo activado — datos de ejemplo");
                navigate("/app", { replace: true });
                window.location.reload();
              }}
            >
              <Play className="h-4 w-4" />
              Ver demo con datos de ejemplo
            </Button>

            <div className="text-center text-sm text-slate-500 pt-2">
              {mode === "signin" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    Regístrate gratis
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
