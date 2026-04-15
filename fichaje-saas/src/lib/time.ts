import { format, formatDistanceStrict, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

export const nowIso = () => new Date().toISOString();

export const todayDate = () => format(new Date(), "yyyy-MM-dd");

export function formatTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "HH:mm", { locale: es });
}

export function formatDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM · HH:mm", { locale: es });
}

export function formatLongDate(d: Date = new Date()) {
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

export function minutesToHours(min: number | null | undefined, decimals = 1) {
  if (min == null) return "0h";
  const h = min / 60;
  return `${h.toFixed(decimals)}h`;
}

export function elapsedSince(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return formatDistanceStrict(new Date(iso), new Date(), {
    locale: es,
    roundingMethod: "floor",
  });
}

export function diffMinutes(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): number {
  if (!a || !b) return 0;
  return Math.max(0, differenceInMinutes(new Date(b), new Date(a)));
}

/**
 * Devuelve minutos trabajados descontando pausas.
 */
export function computeWorkedMinutes(
  clockInAt: string | Date,
  clockOutAt: string | Date,
  breakMinutes = 0
): number {
  const total = diffMinutes(clockInAt, clockOutAt);
  return Math.max(0, total - breakMinutes);
}
