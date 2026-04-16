import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, getDemoNotifications } from "@/demo";
import { cn } from "@/shared/lib/utils";
import type { Notification, Profile } from "@/types";

export default function NotificationBell({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", orgId],
    refetchInterval: demo ? false : 30_000,
    queryFn: async () => {
      if (demo) return getDemoNotifications();
      const { data } = await supabase.from("notifications").select("*")
        .eq("organization_id", orgId).eq("recipient_profile_id", profile.id)
        .order("created_at", { ascending: false }).limit(20);
      return (data as Notification[]) ?? [];
    },
  });

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (demo) return;
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (demo) return;
      await supabase.from("notifications").update({ read: true })
        .eq("organization_id", orgId).eq("recipient_profile_id", profile.id).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const typeIcon: Record<string, string> = {
    schedule_published: "📅", shift_changed: "🔄", shift_swap_request: "↔️",
    shift_swap_decided: "✅", absence_requested: "🏖️", absence_decided: "📋",
    open_shift_available: "📢", clock_reminder: "⏰", overtime_alert: "⚠️", system: "ℹ️",
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-elevated border border-slate-200 z-40 animate-fade-in overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm">Notificaciones</h3>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Marcar todas leídas
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Sin notificaciones</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { markRead.mutate(n.id); if (n.link) window.location.href = n.link; setOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3",
                      !n.read && "bg-brand-50/50"
                    )}
                  >
                    <div className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] ?? "📌"}</div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm", !n.read ? "font-semibold text-slate-900" : "text-slate-700")}>
                        {n.title}
                      </div>
                      {n.body && <div className="text-xs text-slate-500 truncate mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0 mt-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
