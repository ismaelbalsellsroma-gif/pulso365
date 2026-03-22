import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Sesión iniciada');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error('Error con Google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-5 md:space-y-6">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="4" width="20" height="26" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 10h10M7 14h10M7 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="24" cy="12" r="7" fill="hsl(183, 97%, 22%)" stroke="hsl(var(--background))" strokeWidth="2"/>
              <text x="24" y="15.5" textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="8" fontWeight="700">360</text>
            </svg>
            <span className="text-lg font-medium">
              Albarán<strong className="text-primary font-bold">360</strong>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
        </div>

        <Button
          variant="outline"
          className="w-full active:scale-[0.97]"
          onClick={handleGoogle}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">o</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1.5 bg-card"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5 bg-card"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <Button type="submit" className="w-full active:scale-[0.97]" disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
