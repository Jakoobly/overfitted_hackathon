import { z } from "zod";
import {
  matchStatusSchema,
  profileSchema,
  type ChatResponse,
  type HistoryEntry,
  type Match,
  type Profile,
} from "@/lib/chat/contract";
import { catalogForSearch, getProgramme, type Programme } from "./catalog";
import { generateStructured } from "./langdock";

const MAX_MATCHES = 3;
const MAX_HISTORY = 20;

const messageOutputSchema = z.strictObject({
  reply: z.string().describe("Antwort an die VHS, höchstens eine gezielte Rückfrage am Ende"),
  profile: profileSchema.describe("Vollständiges, aktualisiertes Projektprofil"),
  neueSuche: z.boolean().describe("true, wenn die Trefferliste neu bewertet wurde"),
  treffer: z.array(
    z.strictObject({
      programmeId: z.string().describe("id aus dem Katalog"),
      status: matchStatusSchema,
      begruendung: z.string().describe("Ein bis zwei Sätze, warum das Programm passt"),
      offenePunkte: z.array(z.string()).describe("Offene oder abweichende Bedingungen"),
      anpassung: z.string().nullable().describe("Planbare Projektänderung bei Status aehnlich, sonst null"),
    }),
  ),
});

const checklistOutputSchema = z.strictObject({
  reply: z.string().describe("Antragscheckliste für das ausgewählte Programm"),
});

const BASE_RULES = `Du bist der VHS-Förderfinder des Volkshochschulverbands Baden-Württemberg.
Du hilfst Mitarbeitenden einer Volkshochschule (VHS), Förderprogramme für ihr Projekt zu finden und den Antrag vorzubereiten.
Antworte auf Deutsch, in der Sie-Form, sachlich und knapp (höchstens etwa 120 Wörter, Aufzählungen erlaubt, kein Markdown außer "- " für Listen).
Fakten zu Programmen (Fristen, Unterlagen, Beträge, Förderquoten, URLs, Bedingungen) stammen ausschließlich aus dem Katalog unten. Erfinde nichts.
Fehlt eine Angabe im Katalog (z. B. "unterlagen": null), schreibe "bei der Förderstelle prüfen" und nenne, falls vorhanden, die Programmwebsite. Liste dann KEINE vermuteten oder üblichen Unterlagen, Formulare oder Fristen auf.
Eine Voraussetzung gilt nur als erfüllt, wenn das Projektprofil sie ausdrücklich belegt. Alles andere ist "noch zu klären".
Heutiges Datum: ${new Date().toISOString().slice(0, 10)}.`;

const SEARCH_RULES = `
Projektprofil:
- Gib immer das vollständige Profil zurück. Übernimm bestehende Werte und ändere nur, was die VHS neu nennt oder korrigiert. Eine Korrektur der VHS hat Vorrang.
- Unbekanntes bleibt null bzw. leer. Rate nicht. Städte ordnest du dem Bundesland zu (z. B. Heilbronn -> Baden-Württemberg).
- start als YYYY-MM. Sagt die VHS ausdrücklich, dass der Start noch offen ist, setze startOffen = true.

Förderprüfung (nur Programme aus dem Katalog):
- "passend": fachlicher Bezug und alle bekannten Pflichtbedingungen sind erfüllt.
- "pruefen": fachlich passend, aber Pflichtbedingungen sind offen (Angabe fehlt), keine bekannte Abweichung.
- "aehnlich": eine dokumentierte, realistisch veränderbare Bedingung weicht ab (z. B. späterer Projektbeginn, höheres Budget, zusätzlicher Partner). Nenne die Änderung in "anpassung".
- Schließe aus und liste NICHT: falsche Förderregion (foerdergebiet passt nicht zum Bundesland), ungeeigneter Träger, abgelaufene Frist, frist.status "kein_aufruf".
- Bewerte bei jeder neuen Suche alle Programme im Katalog selbst, statt eine Prüfung nur anzubieten. Fallen regionale Programme weg, prüfe bundes- und EU-weite Programme mit fachlichem Bezug.
- Höchstens ${MAX_MATCHES} Treffer, nach Relevanz für Thema und Zielgruppe sortiert. Gibt es keine, ist "treffer" leer und die Antwort nennt kurz die Gründe.
- Die Größe der VHS (klein/mittel/groß) beeinflusst die Förderfähigkeit nur, wenn der Katalog dafür ein Kriterium nennt.

Gesprächsführung:
- Setze neueSuche = true bei einer neuen Projektbeschreibung oder wenn sich eine Angabe ändert, die die Bewertung beeinflusst (Thema, Zielgruppe, Bundesland, Träger, Budget, Eigenanteil, Projektbeginn, Partner). Das gilt auch, wenn bereits ein Programm ausgewählt ist. Sonst neueSuche = false und treffer = [].
- Fehlt eine Angabe, die die Bewertung eines Top-Treffers ändert (z. B. Bundesland, Projektbeginn, Budget, Eigenanteil, Partner), stelle am Ende genau EINE gezielte Rückfrage und begründe sie kurz mit dem betroffenen Programm.
- Fasse die erkannten Eckdaten in einem kurzen Satz zur Kontrolle zusammen, wenn sich das Profil geändert hat.`;

function selectedRules(programme: Programme) {
  return `
Die VHS hat das Programm "${programme.titel}" (id: ${programme.id}) ausgewählt, um den Antrag vorzubereiten.
Beantworte Fragen zu Voraussetzungen, Unterlagen, Fristen und nächsten Schritten anhand dieses Katalogeintrags.
Korrigiert oder ergänzt die VHS dabei Eckdaten, übernimm sie ins Profil und führe eine neue Suche durch. Passt das ausgewählte Programm danach nicht mehr, sage das deutlich.
${JSON.stringify(programme)}`;
}

/** Profilfelder, deren Änderung die Bewertung beeinflusst. */
const SEARCH_FIELDS = ["themen", "zielgruppen", "bundesland", "traeger", "budget", "eigenanteil", "start", "partner"] as const;

function searchCriteriaChanged(before: Profile, after: Profile) {
  return SEARCH_FIELDS.some((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

function historyInput(history: HistoryEntry[]) {
  return history.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, content: text }));
}

function toMatches(treffer: z.infer<typeof messageOutputSchema>["treffer"]): Match[] {
  const seen = new Set<string>();
  const matches: Match[] = [];
  for (const t of treffer) {
    const programme = getProgramme(t.programmeId);
    if (!programme || seen.has(programme.id)) continue;
    seen.add(programme.id);
    matches.push({
      programmeId: programme.id,
      titel: programme.titel,
      status: t.status,
      begruendung: t.begruendung,
      offenePunkte: t.offenePunkte,
      anpassung: t.status === "aehnlich" ? t.anpassung : null,
      url: programme.links.programmwebsite ?? null,
    });
  }
  return matches.slice(0, MAX_MATCHES);
}

export async function handleMessage(input: {
  message: string;
  history: HistoryEntry[];
  profile: Profile;
  selectedProgrammeId: string | null;
}): Promise<ChatResponse> {
  const selected = input.selectedProgrammeId ? getProgramme(input.selectedProgrammeId) : undefined;
  const messages = [...historyInput(input.history), { role: "user" as const, content: input.message }];
  const ask = (profile: Profile, extra = "") =>
    generateStructured({
      name: "chat_antwort",
      schema: messageOutputSchema,
      instructions: [
        BASE_RULES,
        SEARCH_RULES,
        selected ? selectedRules(selected) : "",
        `\nBisheriges Projektprofil:\n${JSON.stringify(profile)}`,
        extra,
        `\nKatalog:\n${JSON.stringify(catalogForSearch())}`,
      ].join("\n"),
      input: messages,
    });

  let output = await ask(input.profile);
  // Absicherung: Eine bewertungsrelevante Korrektur muss die Trefferliste neu bewerten.
  if (!output.neueSuche && searchCriteriaChanged(input.profile, output.profile)) {
    output = await ask(
      output.profile,
      "\nDas Projektprofil oben enthält bereits die Änderungen aus der letzten Nachricht. Führe jetzt eine neue Suche durch (neueSuche = true), nenne kurz die Auswirkung und beantworte die Nachricht.",
    );
    output.neueSuche = true;
  }

  return {
    reply: output.reply,
    profile: output.profile,
    ...(output.neueSuche ? { matches: toMatches(output.treffer) } : {}),
  };
}

export class UnknownProgrammeError extends Error {}

export async function handleSelectProgramme(input: {
  programmeId: string;
  history: HistoryEntry[];
  profile: Profile;
}): Promise<ChatResponse> {
  const programme = getProgramme(input.programmeId);
  if (!programme) throw new UnknownProgrammeError(input.programmeId);

  const instructions = [
    BASE_RULES,
    selectedRules(programme),
    `\nBestätigtes Projektprofil:\n${JSON.stringify(input.profile)}`,
    `
Erstelle jetzt die Antragscheckliste (höchstens etwa 180 Wörter):
- Nenne zuerst das gewählte Programm.
- Voraussetzungen: was das Profil bereits erfüllt und was noch zu klären ist.
- Benötigte Unterlagen und Antragsfrist laut Katalog, sonst "bei der Förderstelle prüfen".
- Genau einen konkreten nächsten Schritt und die Programmwebsite, falls bekannt.`,
  ].join("\n");

  const output = await generateStructured({
    name: "antragscheckliste",
    schema: checklistOutputSchema,
    instructions,
    input: [
      ...historyInput(input.history),
      { role: "user", content: `Antrag vorbereiten: ${programme.titel}` },
    ],
  });

  return {
    reply: output.reply,
    profile: input.profile,
    selectedProgramme: { id: programme.id, titel: programme.titel },
  };
}
