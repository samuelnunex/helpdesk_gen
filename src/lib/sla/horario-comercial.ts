import { addDays, addMilliseconds, addMinutes, set } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Fuso usado para SLA (horário de Brasília). */
export const SLA_TIMEZONE = "America/Sao_Paulo";

/** Manhã: [07:30, 12:00). Tarde: [14:00, 18:18] inclusive. */
const W1_START_MIN = 7 * 60 + 30;
const W1_END_MIN = 12 * 60;
const W2_START_MIN = 14 * 60;
const W2_END_MIN = 18 * 60 + 18;

/** ISO weekday em SP: 1=seg … 7=dom */
function isoWeekdaySp(utc: Date): number {
  return Number(formatInTimeZone(utc, SLA_TIMEZONE, "i"));
}

function isFimDeSemanaSp(utc: Date): boolean {
  const d = isoWeekdaySp(utc);
  return d === 6 || d === 7;
}

function minutesOfDaySp(utc: Date): number {
  const H = Number(formatInTimeZone(utc, SLA_TIMEZONE, "H"));
  const M = Number(formatInTimeZone(utc, SLA_TIMEZONE, "m"));
  const S = Number(formatInTimeZone(utc, SLA_TIMEZONE, "s"));
  return H * 60 + M + S / 60 + Number(formatInTimeZone(utc, SLA_TIMEZONE, "SSS")) / 60000;
}

/** Define hora civil em SP mantendo o mesmo dia civil em SP. */
function setSpClockSameDay(utc: Date, h: number, mi: number, s = 0, ms = 0): Date {
  const z = toZonedTime(utc, SLA_TIMEZONE);
  const z2 = set(z, { hours: h, minutes: mi, seconds: s, milliseconds: ms });
  return fromZonedTime(z2, SLA_TIMEZONE);
}

/** Próximo dia útil às 07:30 (SP) a partir do instante UTC atual. */
function proximoDiaUtil0730Sp(utc: Date): Date {
  let u = new Date(utc.getTime());
  u = addDays(u, 1);
  while (isFimDeSemanaSp(u)) {
    u = addDays(u, 1);
  }
  return setSpClockSameDay(u, 7, 30, 0, 0);
}

/**
 * Soma minutos úteis ao instante UTC `startUtc`, respeitando seg–sex e janelas em SP.
 */
export function adicionarMinutosUteis(startUtc: Date, minutosUteis: number): Date {
  if (minutosUteis <= 0) return new Date(startUtc.getTime());

  let cur = new Date(startUtc.getTime());
  let remaining = minutosUteis;
  let safety = 0;
  const maxIter = 500_000;

  while (remaining > 0 && safety++ < maxIter) {
    if (isFimDeSemanaSp(cur)) {
      cur = proximoDiaUtil0730Sp(cur);
      continue;
    }

    const m = minutesOfDaySp(cur);

    if (m < W1_START_MIN) {
      cur = setSpClockSameDay(cur, 7, 30, 0, 0);
      continue;
    }

    if (m >= W1_START_MIN && m < W1_END_MIN) {
      const fimManha = setSpClockSameDay(cur, 12, 0, 0, 0);
      const availMs = fimManha.getTime() - cur.getTime();
      const needMs = remaining * 60_000;
      if (needMs <= availMs) {
        cur = addMilliseconds(cur, Math.round(remaining * 60_000));
        remaining = 0;
        break;
      }
      remaining -= availMs / 60_000;
      cur = setSpClockSameDay(cur, 14, 0, 0, 0);
      continue;
    }

    if (m >= W1_END_MIN && m < W2_START_MIN) {
      cur = setSpClockSameDay(cur, 14, 0, 0, 0);
      continue;
    }

    if (m >= W2_START_MIN) {
      const fimTarde = setSpClockSameDay(cur, 18, 18, 59, 999);
      const availMs = fimTarde.getTime() - cur.getTime();
      if (availMs <= 0) {
        cur = proximoDiaUtil0730Sp(cur);
        continue;
      }
      const needMs = remaining * 60_000;
      if (needMs <= availMs) {
        cur = addMilliseconds(cur, Math.round(remaining * 60_000));
        remaining = 0;
        break;
      }
      remaining -= availMs / 60_000;
      cur = proximoDiaUtil0730Sp(cur);
      continue;
    }

    cur = proximoDiaUtil0730Sp(cur);
  }

  return cur;
}

/**
 * Minutos úteis entre dois instantes UTC (a <= b). Granularidade 1 minuto.
 */
export function minutosUteisEntre(aUtc: Date, bUtc: Date): number {
  if (bUtc.getTime() <= aUtc.getTime()) return 0;
  let total = 0;
  let cur = new Date(aUtc.getTime());
  const end = bUtc.getTime();
  let guard = 0;
  while (cur.getTime() < end && guard++ < 1_000_000) {
    if (!isFimDeSemanaSp(cur)) {
      const m = minutesOfDaySp(cur);
      if ((m >= W1_START_MIN && m < W1_END_MIN) || (m >= W2_START_MIN && m <= W2_END_MIN)) {
        total += 1;
      }
    }
    cur = addMinutes(cur, 1);
  }
  return total;
}
