// Schutz der Chat-Route vor Missbrauch: Herkunft, Anfragen pro IP und Größe der Anfrage.

const WINDOW_MS = 60_000;
export const RATE_LIMIT_PER_MINUTE = 20;
export const MAX_BODY_BYTES = 100_000;

/** Zeitstempel der Anfragen je IP im laufenden Fenster. Nur im Arbeitsspeicher dieser Instanz. */
const hits = new Map<string, number[]>();

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unbekannt";
}

/** Sekunden bis zur nächsten erlaubten Anfrage, oder 0, wenn die Anfrage zählt und erlaubt ist. */
export function rateLimit(ip: string, now = Date.now()): number {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) {
    hits.set(ip, recent);
    return Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
  return 0;
}

/**
 * Browser schicken bei POST immer einen Origin-Header. Er muss zur eigenen Seite passen
 * oder in CHAT_ALLOWED_ORIGINS stehen. Anfragen ohne Origin (Skripte, Tests) begrenzt das Rate-Limit.
 */
export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const ownHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (ownHost && originHost === ownHost) return true;
  const allowed = (process.env.CHAT_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return allowed.includes(origin);
}
