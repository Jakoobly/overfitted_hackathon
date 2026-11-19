import { NextResponse } from "next/server";
import {
  chatRequestSchema,
  type ChatError,
  type ChatResponse,
  type ChatUnavailable,
  type Profile,
} from "@/lib/chat/contract";
import { catalogEntries } from "@/lib/server/catalog";
import { handleMessage, handleSelectProgramme, UnknownProgrammeError } from "@/lib/server/chat";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Die Anfrage ist kein gültiges JSON.");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, `Ungültige Anfrage: ${parsed.error.issues[0]?.message ?? "unbekannter Fehler"}`);
  const req = parsed.data;

  try {
    const result =
      req.action === "selectProgramme"
        ? await handleSelectProgramme(req)
        : await handleMessage(req);
    return NextResponse.json<ChatResponse>(result);
  } catch (error) {
    if (error instanceof UnknownProgrammeError) return fail(404, "Dieses Förderprogramm ist nicht im Katalog.");
    // Fehlender Schlüssel, Netzwerk, Zeitüberschreitung, Langdock-Fehler oder ungültige Modellausgabe
    console.error("chat route: KI nicht erreichbar", error);
    return aiUnavailable(req.profile);
  }
}
