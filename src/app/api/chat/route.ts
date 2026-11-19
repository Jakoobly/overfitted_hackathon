import { NextResponse } from "next/server";
import { chatRequestSchema, type ChatError, type ChatResponse } from "@/lib/chat/contract";
import { handleMessage, handleSelectProgramme, UnknownProgrammeError } from "@/lib/server/chat";
import { LangdockConfigError } from "@/lib/server/langdock";

export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json<ChatError>({ error }, { status });

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
    if (error instanceof LangdockConfigError) {
      console.error(error.message);
      return fail(500, "Der KI-Zugang ist auf dem Server nicht eingerichtet.");
    }
    console.error("chat route failed", error);
    return fail(502, "Der Förderfinder ist gerade nicht erreichbar. Bitte versuchen Sie es gleich noch einmal.");
  }
}
