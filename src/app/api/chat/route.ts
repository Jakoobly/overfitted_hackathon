import { NextResponse } from "next/server";
import {
  chatRequestSchema,
  type ChatError,
  type ChatResponse,
  type ChatUnavailable,
  type Profile,
} from "@/lib/chat/contract";
import { catalogEntries } from "@/lib/server/catalog";
import { answerStep, currentQuestion, isQuestion, startApplication, UnknownApplicationError } from "@/lib/server/application";
import { handleMessage, handleSelectProgramme, UnknownProgrammeError } from "@/lib/server/chat";
import { clientIp, MAX_BODY_BYTES, originAllowed, rateLimit } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json<ChatError>({ error }, { status });

/** 503 Service Unavailable: KI gestört, Katalog trotzdem anzeigen. */
function aiUnavailable(profile: Profile) {
  const catalog = catalogEntries();
  return NextResponse.json<ChatUnavailable>(
    {
      error: "Die KI-Anbindung ist gerade gestört.",
      code: "KI_NICHT_ERREICHBAR",
      reply:
        "Es gibt aktuell ein Problem mit der Anbindung an unseren KI-Dienst (Fehler 503 – Dienst nicht verfügbar). " +
        "Ich kann Ihre Nachricht deshalb gerade nicht auswerten. " +
        `Daneben sehen Sie alle ${catalog.length} Förderprogramme aus unserem Katalog. ` +
        "Bitte versuchen Sie es in ein paar Minuten noch einmal.",
      profile,
      catalog,
    },
    { status: 503, headers: { "Retry-After": "60" } },
  );
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return fail(403, "Anfragen sind nur über den Förderfinder selbst möglich.");

  const retryAfter = rateLimit(clientIp(request));
  if (retryAfter) {
    return NextResponse.json<ChatError>(
      { error: `Zu viele Anfragen in kurzer Zeit. Bitte warten Sie ${retryAfter} Sekunden und versuchen Sie es dann erneut.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "Die Anfrage ist zu groß.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail(413, "Die Anfrage ist zu groß.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Die Anfrage ist kein gültiges JSON.");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, `Ungültige Anfrage: ${parsed.error.issues[0]?.message ?? "unbekannter Fehler"}`);
  const req = parsed.data;

  try {
    if (req.action === "startApplication") return NextResponse.json<ChatResponse>(startApplication(req.programmeId, req.profile));
    if (req.action === "selectProgramme") return NextResponse.json<ChatResponse>(await handleSelectProgramme(req));

    const { application, ...message } = req;
    if (!application) return NextResponse.json<ChatResponse>(await handleMessage(message));
    if (!isQuestion(req.message)) return NextResponse.json<ChatResponse>(answerStep(application, req.message, req.profile));

    // Zwischenfrage während der Erfassung: beantworten, dann die offene Frage wiederholen
    const answer = await handleMessage({ ...message, selectedProgrammeId: application.programmeId });
    return NextResponse.json<ChatResponse>({
      ...answer,
      reply: `${answer.reply}\n\nZurück zur Erfassung – ${currentQuestion(application, answer.profile)}`,
    });
  } catch (error) {
    if (error instanceof UnknownProgrammeError || error instanceof UnknownApplicationError) {
      return fail(404, "Dieses Förderprogramm ist nicht im Katalog.");
    }
    // Fehlender Schlüssel, Netzwerk, Zeitüberschreitung, Langdock-Fehler oder ungültige Modellausgabe
    console.error("chat route: KI nicht erreichbar", error);
    return aiUnavailable(req.profile);
  }
}
