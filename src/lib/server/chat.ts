import { z } from "zod";
import {
  matchStatusSchema,
  profileSchema,
  type ChatResponse,
  type HistoryEntry,
  type Match,
  type Profile,
} from "@/lib/chat/contract";
import { availability, catalogForSearch, getProgramme, today, type Programme } from "./catalog";
import { CHECKLIST_TASK, checklistOutputSchema, renderChecklist } from "./checklist";
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

const baseRules = () => `Du bist der VHS-Förderfinder des Volkshochschulverbands Baden-Württemberg.
Du hilfst Mitarbeitenden einer Volkshochschule (VHS), Förderprogramme für ihr Projekt zu finden und den Antrag vorzubereiten.
Antworte auf Deutsch, in der Sie-Form, sachlich und knapp (höchstens etwa 120 Wörter, Aufzählungen erlaubt, kein Markdown außer "- " für Listen).
Fakten zu Programmen (Fristen, Unterlagen, Beträge, Förderquoten, URLs, Bedingungen) stammen ausschließlich aus dem Katalog unten. Erfinde nichts.
Fehlt eine Angabe im Katalog (z. B. "unterlagen": null), schreibe "bei der Förderstelle prüfen" und nenne, falls vorhanden, die Programmwebsite. Liste dann KEINE vermuteten oder üblichen Unterlagen, Formulare oder Fristen auf.
Eine Voraussetzung gilt nur als erfüllt, wenn das Projektprofil sie ausdrücklich belegt. Alles andere ist "noch zu klären".
Heutiges Datum: ${today()}. Der Förderfinder sucht nur Programme, für die man sich jetzt noch bewerben kann, für Projekte, die noch nicht begonnen haben.`;

const SEARCH_RULES = `
Projektprofil:
- Gib immer das vollständige Profil zurück. Übernimm bestehende Werte und ändere nur, was die VHS neu nennt oder korrigiert. Eine Korrektur der VHS hat Vorrang.
- Unbekanntes bleibt null bzw. leer. Rate nicht. Städte ordnest du dem Bundesland zu (z. B. Heilbronn -> Baden-Württemberg).
- start als YYYY-MM. Relative Angaben ("nächsten März", "letztes Jahr") rechnest du vom heutigen Datum aus um. Sagt die VHS ausdrücklich, dass der Start noch offen ist, setze startOffen = true.
- Liegt der genannte Projektbeginn vor dem aktuellen Monat, trage ihn trotzdem ein. Der Server weist die VHS darauf hin.

Förderprüfung (nur Programme aus dem Katalog):
- "passend": fachlicher Bezug und alle bekannten Pflichtbedingungen sind erfüllt.
- "pruefen": fachlich passend, aber Pflichtbedingungen sind offen (Angabe fehlt), keine bekannte Abweichung.
- "aehnlich": eine dokumentierte, realistisch veränderbare Bedingung weicht ab (z. B. späterer Projektbeginn, höheres Budget, zusätzlicher Partner). Nenne die Änderung in "anpassung".
- Schließe aus und liste NICHT: falsche Förderregion (foerdergebiet passt nicht zum Bundesland), ungeeigneter Träger und alle Programme mit verfuegbarkeit.verfuegbar = false (abgelaufene Frist oder kein Aufruf). Nenne solche Programme höchstens als Hinweis mit dem Grund.
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

const currentMonth = () => today().slice(0, 7);
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const formatMonth = (ym: string) => `${MONATE[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Antwort, wenn der Projektbeginn vor dem aktuellen Monat liegt. Der Start wird verworfen. */
function pastStartResponse(profile: Profile, start: string): ChatResponse {
  return {
    reply:
      `Der angegebene Projektbeginn (${formatMonth(start)}) liegt in der Vergangenheit. ` +
      "Der Förderfinder sucht nur Programme, für die Sie sich jetzt noch bewerben können. Viele Programme fördern bereits begonnene Vorhaben nicht. " +
      `Wann soll das Projekt oder ein neuer Durchgang frühestens starten (ab ${formatMonth(currentMonth())})?`,
    profile: { ...profile, start: null, startOffen: false },
  };
}

function historyInput(history: HistoryEntry[]) {
  return history.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, content: text }));
}

function toMatches(treffer: z.infer<typeof messageOutputSchema>["treffer"]): Match[] {
  const seen = new Set<string>();
  const matches: Match[] = [];
  for (const t of treffer) {
    const programme = getProgramme(t.programmeId);
    if (!programme || seen.has(programme.id) || !availability(programme).verfuegbar) continue;
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
        baseRules(),
        SEARCH_RULES,
        selected ? selectedRules(selected) : "",
        `\nBisheriges Projektprofil:\n${JSON.stringify(profile)}`,
        extra,
        `\nKatalog:\n${JSON.stringify(catalogForSearch())}`,
      ].join("\n"),
      input: messages,
    });

  let output = await ask(input.profile);
  if (output.profile.start && output.profile.start < currentMonth()) {
    return pastStartResponse(output.profile, output.profile.start);
  }
  // Absicherung: Eine bewertungsrelevante Korrektur muss die Trefferliste neu bewerten.
  if (!output.neueSuche && searchCriteriaChanged(input.profile, output.profile)) {
    output = await ask(
      output.profile,
      "\nDas Projektprofil oben enthält bereits die Änderungen aus der letzten Nachricht. Führe jetzt eine neue Suche durch (neueSuche = true), nenne kurz die Auswirkung und beantworte die Nachricht.",
    );
    output.neueSuche = true;
    if (output.profile.start && output.profile.start < currentMonth()) {
      return pastStartResponse(output.profile, output.profile.start);
    }
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
    baseRules(),
    selectedRules(programme),
    `\nBestätigtes Projektprofil:\n${JSON.stringify(input.profile)}`,
    CHECKLIST_TASK,
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
    reply: renderChecklist(programme, input.profile, output),
    profile: input.profile,
    selectedProgramme: { id: programme.id, titel: programme.titel },
  };
}
