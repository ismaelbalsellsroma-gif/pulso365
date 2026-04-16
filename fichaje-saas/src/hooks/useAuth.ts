import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isDemoMode, DEMO_PROFILE } from "@/lib/demo";
import type { Profile } from "@/types";

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  demo: boolean;
}

const FAKE_SESSION = { user: { id: "demo" } } as unknown as Session;

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();

  // Demo mode: bypass auth entirely
  useEffect(() => {
    if (demo) {
      setSession(FAKE_SESSION);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    async function load() {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error("profile error", error);
      }
      setProfile((data as Profile | null) ?? null);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [session?.user?.id, demo]);

  return { session, profile, loading, demo };
}
