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
  einleitung: z.string().describe("Ein Satz, wofür das Programm zum Vorhaben passt"),
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
- "offen": alle übrigen Voraussetzungen aus dem Katalogeintrag, als kurze Prüffrage oder Aufgabe.
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

export function renderChecklist(programme: Programme, profile: Profile, output: ChecklistOutput): string {
  const backed = output.erfuellt.filter((e) => isBacked(profile, e.profilfeld, e.profilwert));
  const unbacked = output.erfuellt.filter((e) => !backed.includes(e)).map((e) => e.voraussetzung);
  const offen = [...output.offen, ...unbacked];

  const parts = [`Gewähltes Programm: ${programme.titel}`];
  const { verfuegbar, grund } = availability(programme);
  if (!verfuegbar) parts.push(`Achtung: Laut Katalog ist eine Bewerbung derzeit nicht möglich (${grund}). Bitte bei der Förderstelle nach dem nächsten Aufruf fragen.`);
  parts.push(output.einleitung);

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
  if (offen.length) parts.push(`Noch zu klären:\n${list(offen)}`);

  const u = programme.unterlagen;
  if (u) {
    parts.push(`Einreichung: ${u.einreichung}`);
    parts.push(`Unterlagen für den Antrag:\n${list(u.antrag)}`);
    if (u.bereithalten.length) parts.push(`Bereithalten:\n${list(u.bereithalten)}`);
    if (u.nachBewilligung.length) {
      parts.push(`Nach der Bewilligung folgen ${u.nachBewilligung.length} weitere Pflichten. Fragen Sie bei Bedarf im Chat danach.`);
    }
  } else {
    parts.push("Unterlagen: im Katalog nicht hinterlegt, bitte bei der Förderstelle prüfen.");
  }
  parts.push(`Frist: ${fristText(programme)}`);
  parts.push(`Nächster Schritt: ${output.naechsterSchritt}`);

  const sources = [
    programme.links.programmwebsite ? `Programmwebsite: ${programme.links.programmwebsite}` : null,
    ...(programme.quellen as { typ: string; titel?: string; stand?: string }[])
      .filter((q) => q.typ === "web" && q.titel && q.stand && !q.stand.startsWith("abgerufen"))
      .map((q) => `Quelle: ${q.titel} (Stand ${q.stand})`),
  ].filter(Boolean);
  if (sources.length) parts.push(sources.join("\n"));

  return parts.join("\n\n");
}
