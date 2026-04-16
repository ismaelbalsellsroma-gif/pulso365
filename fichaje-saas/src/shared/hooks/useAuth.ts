import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_PROFILE } from "@/demo";
import type { Profile } from "@/types";

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  demo: boolean;
  employeeSession: EmployeeSessionData | null;
}

export interface EmployeeSessionData {
  employee: {
    id: string;
    organization_id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    position: string | null;
    pin: string;
    color: string | null;
    primary_location_id: string | null;
    contract_hours_week: number | null;
    hourly_cost: number | null;
  };
  org_name: string;
  logged_in_at: string;
}

const FAKE_SESSION = { user: { id: "demo" } } as unknown as Session;

function getEmployeeSession(): EmployeeSessionData | null {
  try {
    const raw = localStorage.getItem("fichaje_employee_session");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();
  const [employeeSession, setEmployeeSession] = useState<EmployeeSessionData | null>(getEmployeeSession);

  useEffect(() => {
    // Employee session via email+PIN (no Supabase auth)
    const empSession = getEmployeeSession();
    if (empSession) {
      setEmployeeSession(empSession);
      setSession(FAKE_SESSION);
      setProfile({
        id: empSession.employee.id,
        organization_id: empSession.employee.organization_id,
        email: empSession.employee.email,
        full_name: `${empSession.employee.first_name} ${empSession.employee.last_name ?? ""}`.trim(),
        role: "employee",
        avatar_url: null,
        created_at: empSession.logged_in_at,
        updated_at: empSession.logged_in_at,
      });
      setLoading(false);
      return;
    }

    // Demo mode
    if (demo) {
      setSession(FAKE_SESSION);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Normal Supabase auth
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
    if (demo || getEmployeeSession()) return;
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

  return { session, profile, loading, demo, employeeSession };
}
