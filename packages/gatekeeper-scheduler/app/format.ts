import type { ManagementSchedule } from "../src/management-types";
import type { ScheduleCadence, Weekday } from "../src/types";
import type { SchedulerLocale } from "./locale";

const WEEKDAYS: Record<SchedulerLocale, Record<Weekday, string>> = {
  en: { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" },
  "pt-BR": { SU: "dom.", MO: "seg.", TU: "ter.", WE: "qua.", TH: "qui.", FR: "sex.", SA: "sáb." },
};

export type ScheduleTiming = {
  relative: string;
  absolute?: string;
  diagnostic?: string;
};

export function formatCadence(cadence: ScheduleCadence, locale: SchedulerLocale = "en"): string {
  if (cadence.kind === "interval") return formatInterval(cadence.everyMs, locale);
  const intlLocale = localeForIntl(locale);
  if (cadence.kind === "once") {
    const date = new Intl.DateTimeFormat(intlLocale, {
      timeZone: cadence.timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(cadence.fireAt);
    const time = new Intl.DateTimeFormat(intlLocale, {
      timeZone: cadence.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(cadence.fireAt);
    return locale === "pt-BR" ? `Uma vez em ${date}, às ${time}` : `Once on ${date} at ${time}`;
  }

  const { rule } = cadence;
  if (rule.freq === "hourly") {
    const minute = rule.minute.toString().padStart(2, "0");
    if (locale === "pt-BR") {
      const prefix = rule.interval === 1 ? "A cada hora" : `A cada ${rule.interval} horas`;
      return `${prefix}, no minuto ${minute}`;
    }
    const prefix = rule.interval === 1 ? "Hourly" : `Every ${rule.interval} hours`;
    return `${prefix} at :${minute}`;
  }
  const time = formatClock(rule.hour, rule.minute, intlLocale);
  if (rule.freq === "daily") {
    if (locale === "pt-BR") {
      return rule.interval === 1 ? `Diariamente às ${time}` : `A cada ${rule.interval} dias às ${time}`;
    }
    return rule.interval === 1 ? `Daily at ${time}` : `Every ${rule.interval} days at ${time}`;
  }
  if (rule.interval === 1 && rule.byDay.join(",") === "MO,TU,WE,TH,FR") {
    return locale === "pt-BR" ? `Dias úteis às ${time}` : `Weekdays at ${time}`;
  }
  const days = new Intl.ListFormat(intlLocale, { style: "short", type: "conjunction" }).format(
    rule.byDay.map((day) => WEEKDAYS[locale][day]),
  );
  if (locale === "pt-BR") {
    const prefix = rule.interval === 1 ? "Semanalmente" : `A cada ${rule.interval} semanas`;
    return `${prefix}, ${days}, às ${time}`;
  }
  const prefix = rule.interval === 1 ? "Weekly" : `Every ${rule.interval} weeks`;
  return `${prefix} on ${days} at ${time}`;
}

/** Describes a finite recurrence bound and, for a counted bound, progress toward it. */
export function formatOccurrences(
  schedule: ManagementSchedule,
  locale: SchedulerLocale = "en",
): string | undefined {
  const bound = schedule.occurrences;
  if (!bound) return undefined;
  if ("count" in bound) {
    const noun = locale === "pt-BR"
      ? bound.count === 1 ? "ocorrência" : "ocorrências"
      : bound.count === 1 ? "occurrence" : "occurrences";
    if (locale === "pt-BR") {
      return `${schedule.occurrenceCount ?? 0} de ${bound.count} ${noun}`;
    }
    return `${schedule.occurrenceCount ?? 0} of ${bound.count} ${noun}`;
  }
  const absolute = formatAbsolute(bound.until, scheduleTimeZone(schedule), localeForIntl(locale));
  return locale === "pt-BR" ? `até ${absolute}` : `until ${absolute}`;
}

export function formatTiming(
  schedule: ManagementSchedule,
  now = Date.now(),
  locale: SchedulerLocale = "en",
): ScheduleTiming {
  const timestamp = scheduleTimestamp(schedule);
  if (timestamp === undefined) {
    return { relative: locale === "pt-BR" ? "Próxima execução pendente" : "Next run pending" };
  }
  const intlLocale = localeForIntl(locale);
  const absolute = formatAbsolute(timestamp, scheduleTimeZone(schedule), intlLocale);
  if (schedule.status === "active") {
    const relative = formatRelative(timestamp - now, intlLocale);
    return {
      relative: locale === "pt-BR"
        ? `Próxima execução ${relative}${schedule.retrying ? " (nova tentativa)" : ""}`
        : `Next run ${relative}${schedule.retrying ? " (retry)" : ""}`,
      absolute,
    };
  }
  if (schedule.status === "dead") {
    return {
      relative: locale === "pt-BR"
        ? `Falhou ${formatRelative(schedule.failedAt - now, intlLocale)}`
        : `Failed ${formatRelative(schedule.failedAt - now, intlLocale)}`,
      absolute,
      diagnostic:
        schedule.failureCode === "authorization_failed"
          ? locale === "pt-BR"
            ? "A autorização falhou após várias tentativas."
            : "Authorization failed after retries."
          : locale === "pt-BR"
            ? "A execução da tarefa falhou após várias tentativas."
            : "Task callback failed after retries.",
    };
  }
  if (schedule.status === "completed") {
    return {
      relative: locale === "pt-BR"
        ? `Concluída ${formatRelative(schedule.completedAt - now, intlLocale)}`
        : `Completed ${formatRelative(schedule.completedAt - now, intlLocale)}`,
      absolute,
      diagnostic: schedule.occurrences
        ? locale === "pt-BR"
          ? "Esta tarefa recorrente usou sua última ocorrência agendada."
          : "This recurring task used its last scheduled occurrence."
        : locale === "pt-BR"
          ? "Esta tarefa única foi concluída."
          : "This one-time task completed.",
    };
  }
  return {
    relative: locale === "pt-BR"
      ? `Expirou ${formatRelative(schedule.expiredAt - now, intlLocale)}`
      : `Expired ${formatRelative(schedule.expiredAt - now, intlLocale)}`,
    absolute,
    diagnostic: schedule.cadence.kind === "once"
      ? locale === "pt-BR"
        ? "O prazo desta tarefa única passou sem execução."
        : "This one-time task passed without delivery."
      : locale === "pt-BR"
        ? "O prazo desta tarefa recorrente passou antes da primeira ocorrência."
        : "This recurring task's cutoff passed before its first occurrence.",
  };
}

function formatInterval(milliseconds: number, locale: SchedulerLocale): string {
  const units = [
    [7 * 24 * 60 * 60_000, "week"],
    [24 * 60 * 60_000, "day"],
    [60 * 60_000, "hour"],
    [60_000, "minute"],
    [1_000, "second"],
  ] as const;
  const [unitMs, unit] = units.find(([size]) => milliseconds % size === 0) ?? [1, "millisecond"];
  const count = milliseconds / unitMs;
  if (locale === "pt-BR") {
    const translated = {
      week: ["semana", "semanas"],
      day: ["dia", "dias"],
      hour: ["hora", "horas"],
      minute: ["minuto", "minutos"],
      second: ["segundo", "segundos"],
      millisecond: ["milissegundo", "milissegundos"],
    }[unit];
    return `A cada ${count === 1 ? translated[0] : `${count} ${translated[1]}`}`;
  }
  return `Every ${count === 1 ? unit : `${count} ${unit}s`}`;
}

function localeForIntl(locale: SchedulerLocale): string {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

function formatClock(hour: number, minute: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(Date.UTC(2020, 0, 1, hour, minute));
}

function formatRelative(milliseconds: number, locale: string): string {
  const absolute = Math.abs(milliseconds);
  const [size, unit] =
    absolute >= 24 * 60 * 60_000
      ? ([24 * 60 * 60_000, "day"] as const)
      : absolute >= 60 * 60_000
        ? ([60 * 60_000, "hour"] as const)
        : absolute >= 60_000
          ? ([60_000, "minute"] as const)
          : ([1_000, "second"] as const);
  const value = Math.round(milliseconds / size);
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(value, unit);
}

function formatAbsolute(timestamp: number, timeZone: string | undefined, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

function scheduleTimestamp(schedule: ManagementSchedule): number | undefined {
  if (schedule.status === "active") return schedule.nextFire;
  if (schedule.status === "dead") return schedule.failedAt;
  if (schedule.status === "completed") return schedule.completedAt;
  return schedule.expiredAt;
}

function scheduleTimeZone(schedule: ManagementSchedule): string | undefined {
  return schedule.cadence.kind === "interval" ? undefined : schedule.cadence.timeZone;
}
