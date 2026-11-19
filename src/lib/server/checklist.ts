// Antragscheckliste: Das Modell ordnet die Voraussetzungen ein, der Server prüft die Belege
// gegen das Projektprofil und setzt Unterlagen, Frist, Link und Quelle aus dem Katalog ein.
import { z } from "zod";
import type { Profile } from "@/lib/chat/contract";
import { availability, type Programme } from "./catalog";

const PROFILE_FIELDS = [
  "themen",
  "zielgruppen",
  "bundesland",
  "traeger",
  "groesse",
  "budget",
  "eigenanteil",
  "start",
  "partner.international",
  "partner.startchancen",
  "partner.krankenkasse",
  "partner.kommune",
  "partner.azav",
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

const FIELD_LABEL: Record<ProfileField, string> = {
  themen: "Thema",
  zielgruppen: "Zielgruppe",
  bundesland: "Bundesland",
  traeger: "Träger",
  groesse: "Größe",
  budget: "Budget",
  eigenanteil: "Eigenanteil",
  start: "Projektbeginn",
  "partner.international": "internationale Partner",
  "partner.startchancen": "Startchancen-Schule",
  "partner.krankenkasse": "Krankenkasse",
  "partner.kommune": "Kommune",
  "partner.azav": "AZAV-Zertifizierung",
};

export const checklistOutputSchema = z.strictObject({
  einleitung: z.string().describe("Ein kurzer Satz, wofür das Programm zum Vorhaben passt (wird derzeit nicht angezeigt)"),
  erfuellt: z
    .array(
      z.strictObject({
        voraussetzung: z.string().describe("Voraussetzung aus dem Katalogeintrag"),
        profilfeld: z.enum(PROFILE_FIELDS).describe("Profilfeld, das die Voraussetzung belegt"),
        profilwert: z.string().describe("Der Wert genau so, wie er im Profil steht"),
      }),
    )
    .describe("Nur Voraussetzungen, die sich unmittelbar aus einem gesetzten Profilwert ergeben"),
  offen: z.array(z.string()).describe("Voraussetzungen aus dem Katalogeintrag, die das Profil nicht belegt"),
  naechsterSchritt: z.string().describe("Genau ein konkreter nächster Schritt, ein Satz mit höchstens 25 Wörtern"),
});
export type ChecklistOutput = z.infer<typeof checklistOutputSchema>;

export const CHECKLIST_TASK = `
Erstelle jetzt die Antragscheckliste als strukturierte Daten:
- "erfuellt": nur Voraussetzungen aus dem Katalogeintrag, die sich unmittelbar aus einem gesetzten Wert im Projektprofil ergeben. Gib das Profilfeld und den Wert genau so an, wie er im Profil steht. Beispiel: bundesland "Baden-Württemberg" belegt "Förderregion Baden-Württemberg". Gegenbeispiele: zielgruppen "erwachsene" belegt NICHT "erwerbstätige Teilnehmende"; bundesland ist der Standort der VHS und belegt NICHT den Wohn- oder Arbeitsort der Teilnehmenden.
- "offen": die übrigen Voraussetzungen aus dem Katalogeintrag, wichtigste zuerst, jeweils als kurze Prüffrage mit höchstens 12 Wörtern.
- Unterlagen, Frist und Programmwebsite fügt der Server aus dem Katalog an. Nenne sie nicht.`;

const norm = (value: string) => value.toLocaleLowerCase("de").replace(/\s+/g, " ").trim();

function profileValue(profile: Profile, field: ProfileField): unknown {
  if (field.startsWith("partner.")) return profile.partner[field.slice("partner.".length) as keyof Profile["partner"]];
  return profile[field as Exclude<ProfileField, `partner.${string}`>];
}

/** true, wenn der angegebene Wert tatsächlich im Profil steht. */
export function isBacked(profile: Profile, field: ProfileField, claimed: string): boolean {
  const actual = profileValue(profile, field);
  if (actual === null || actual === undefined || actual === "" || actual === false) return false;
  if (actual === true) return true;
  if (typeof actual === "number") return Number(claimed.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) === actual;
  if (Array.isArray(actual)) return actual.some((item) => norm(claimed).includes(norm(String(item))));
  return norm(claimed).includes(norm(String(actual)));
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

function fristText(programme: Programme) {
  const { frist } = programme;
  switch (frist.status) {
    case "datum":
      if (!frist.datum) return "bei der Förderstelle prüfen";
      return `Antragsfrist ${formatDate(frist.datum)}${availability(programme).verfuegbar ? "" : " (abgelaufen)"}`;
    case "laufend":
      return "laufende Antragstellung";
    case "kein_aufruf":
      return "derzeit kein Förderaufruf laut Katalog";
    default:
      return "bei der Förderstelle prüfen";
  }
}

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

const MAX_OPEN = 3;

/** Kurzform eines Katalogpunkts: alles vor der ersten Erläuterung. */
export function shortItem(item: string) {
  const cut = [" (", ", ", " – ", " mit ", " zur "].map((sep) => item.indexOf(sep)).filter((i) => i > 0);
  return cut.length ? item.slice(0, Math.min(...cut)) : item;
}

const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

export function renderChecklist(programme: Programme, profile: Profile, output: ChecklistOutput): string {
  const backed = output.erfuellt.filter((e) => isBacked(profile, e.profilfeld, e.profilwert));
  const unbacked = output.erfuellt.filter((e) => !backed.includes(e)).map((e) => e.voraussetzung);
  const offen = [...output.offen, ...unbacked];

  const parts = [`Gewähltes Programm: ${programme.titel}`];
  const { verfuegbar, grund } = availability(programme);
  if (!verfuegbar) parts.push(`Achtung: Bewerbung laut Katalog derzeit nicht möglich (${grund}).`);

  // Dieselbe Voraussetzung mit mehreren Belegen nur einmal aufführen
  const evidence = new Map<string, string[]>();
  for (const e of backed) {
    const key = e.voraussetzung.trim().replace(/\.$/, "");
    evidence.set(key, [...(evidence.get(key) ?? []), `${FIELD_LABEL[e.profilfeld]}: ${e.profilwert}`]);
  }
  parts.push(
    "Laut Ihrem Projektprofil erfüllt:\n" +
      (evidence.size
        ? list([...evidence].map(([requirement, proofs]) => `${requirement} (${proofs.join("; ")})`))
        : "- noch keine Voraussetzung durch das Profil belegt"),
  );
  if (offen.length) {
    const more = offen.length > MAX_OPEN ? `\n- und ${offen.length - MAX_OPEN} weitere – fragen Sie nach Details` : "";
    parts.push(`Noch zu klären:\n${list(offen.slice(0, MAX_OPEN))}${more}`);
  }

  const u = programme.unterlagen;
  parts.push(
    u
      ? `Unterlagen:\n${list(u.antrag.map(shortItem))}\n${firstSentence(u.einreichung)}`
      : "Unterlagen: im Katalog nicht hinterlegt, bitte bei der Förderstelle prüfen.",
  );
  parts.push(`Frist: ${fristText(programme)}\nNächster Schritt: ${output.naechsterSchritt}`);

  const sources = (programme.quellen as { typ: string; titel?: string; stand?: string }[])
    .filter((q) => q.typ === "web" && q.titel && q.stand && !q.stand.startsWith("abgerufen"))
    .map((q) => `${q.titel!.split(",")[0]} (Stand ${q.stand})`);
  parts.push(
    [
      programme.links.programmwebsite ? `Programmseite: ${programme.links.programmwebsite}` : null,
      sources.length ? `Quellen: ${sources.join("; ")}` : null,
      "Mit „Antrag erfassen“ unter dem Chat gehen wir den Antrag Frage für Frage durch.",
    ].filter(Boolean).join("\n"),
  );

  return parts.join("\n\n");
}
