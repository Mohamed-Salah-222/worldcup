import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TZ = "Africa/Cairo";

export function formatCairoTime(utcDate: string | Date): string {
  return format(toZonedTime(new Date(utcDate), TZ), "dd MMM yyyy, HH:mm");
}

export function formatCairoDay(utcDate: string | Date): string {
  const zonedDate = toZonedTime(new Date(utcDate), TZ);
  const today = startOfDay(toZonedTime(new Date(), TZ));
  const tomorrow = addDays(today, 1);

  if (isSameDay(zonedDate, today)) {
    return "Today";
  }

  if (isSameDay(zonedDate, tomorrow)) {
    return "Tomorrow";
  }

  return format(zonedDate, "dd MMM");
}

export function timeUntilKickoff(utcDate: string | Date): string {
  const diffMs = new Date(utcDate).getTime() - Date.now();

  if (diffMs <= 0) {
    return "Locked";
  }

  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

export function isSameCairoDate(
  utcDate: string | Date,
  target: "Today" | "Tomorrow",
): boolean {
  return formatCairoDay(utcDate) === target;
}
