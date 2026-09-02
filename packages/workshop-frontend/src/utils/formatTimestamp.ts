// Locale-aware timestamp formatting for chat UI tooltips. The selected application locale is
// explicit so a live language change cannot leave behind a formatter cached for the browser locale.

import { formatDate } from "../i18n";

/** Format a date with the active UI locale for chat tooltips that must identify the message day. */
export function formatFullTimestamp(date: Date): string {
  return formatDate(date, { dateStyle: "short", timeStyle: "short" });
}
