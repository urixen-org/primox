import type { Domain } from "./api";

export const errmsg = (err: unknown): string =>
  "" + ((err as { message?: string } | null)?.message || "(no error message)");

export const domainName = (d: Domain): string => d.Unicode || d.ASCII;

export const domainString = (d: Domain): string =>
  d.Unicode ? d.Unicode + " (" + d.ASCII + ")" : d.ASCII;

// formatQuotaSize formats a size in a compact way using m/g/t when it is an
// exact multiple, mirroring the original account UI.
export const formatQuotaSize = (v: number): string => {
  if (v === 0) {
    return "0";
  }
  const m = 1024 * 1024;
  const g = m * 1024;
  const t = g * 1024;
  if (Math.floor(v / t) * t === v) {
    return "" + v / t + "t";
  } else if (Math.floor(v / g) * g === v) {
    return "" + v / g + "g";
  } else if (Math.floor(v / m) * m === v) {
    return "" + v / m + "m";
  }
  return "" + v;
};

// parseQuotaSize parses values like "1g", "500m", "2t", "1024k", or plain bytes.
export const parseQuotaSize = (s: string): number => {
  s = s.trim();
  if (!s) {
    return 0;
  }
  const last = s[s.length - 1].toLowerCase();
  const units: { [k: string]: number } = {
    k: 1024,
    m: 1024 ** 2,
    g: 1024 ** 3,
    t: 1024 ** 4,
  };
  if (last in units) {
    const n = parseFloat(s.slice(0, -1));
    return Math.round(n * units[last]);
  }
  return parseInt(s) || 0;
};

export const formatSize = (v: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = v;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? "" + n : n.toFixed(1)) + " " + units[i];
};

// age renders a coarse, human-friendly duration since date.
export const age = (date: Date): string => {
  const nowSecs = Date.now() / 1000;
  let t = nowSecs - date.getTime() / 1000;
  let negative = "";
  if (t < 0) {
    negative = "-";
    t = -t;
  }
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  const periods = [year, month, day, hour, minute];
  const suffix = ["y", "mo", "d", "h", "min"];
  if (t < 60) {
    // Avoid showing "-<1min" for small clock drift between browser and server.
    return "<1min";
  }
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (t >= 2 * p || i === periods.length - 1) {
      return negative + Math.round(t / p) + suffix[i];
    }
  }
  return negative + Math.round(t / minute) + "min";
};

const second = 1000 * 1000 * 1000;
const minuteNs = 60 * second;
const hourNs = 60 * minuteNs;
const dayNs = 24 * hourNs;
const weekNs = 7 * dayNs;

// parseDuration parses values like "3d", "12h", "30m", "10s", "2w".
export const parseDuration = (s: string): number => {
  if (!s) {
    return 0;
  }
  const n = parseInt(s.substring(0, s.length - 1));
  if (isNaN(n) || Math.round(n) !== n) {
    throw new Error("bad number in duration");
  }
  if (s.endsWith("w")) return n * weekNs;
  if (s.endsWith("d")) return n * dayNs;
  if (s.endsWith("h")) return n * hourNs;
  if (s.endsWith("m")) return n * minuteNs;
  if (s.endsWith("s")) return n * second;
  throw new Error("bad duration " + s);
};

// formatDuration renders a nanosecond duration as the shortest exact unit.
export const formatDuration = (v: number): string => {
  if (v === 0) {
    return "";
  }
  const is = (period: number) => v > 0 && Math.round(v / period) === v / period;
  const format = (period: number, s: string) => "" + v / period + s;
  if (is(weekNs)) return format(weekNs, "w");
  if (is(dayNs)) return format(dayNs, "d");
  if (is(hourNs)) return format(hourNs, "h");
  if (is(minuteNs)) return format(minuteNs, "m");
  return format(second, "s");
};
