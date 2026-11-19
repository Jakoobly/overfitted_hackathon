// Gemeinsamer Vertrag für POST /api/chat. Oberfläche und Server verwenden dieselben Typen.
// Beispiele: docs/api-chat.md
import { z } from "zod";

const partnerFlag = z.boolean().nullable();

/** Projektprofil nach Rafaels Mockup. `null` bedeutet unbekannt. */
export const profileSchema = z.strictObject({
  vorhaben: z.string().describe("Ein Satz zum Vorhaben, leer wenn unbekannt"),
  themen: z.array(z.string()).describe("z. B. digital, grundbildung, integration, sprachen, gesundheit, beruf, europa, kultur"),
  zielgruppen: z.array(z.string()).describe("z. B. erwachsene, jugendliche, eltern, migranten, gefluechtete, arbeitslose"),
  bundesland: z.string().nullable(),
  traeger: z.enum(["kommunal", "verein", "gmbh"]).nullable(),
  groesse: z.enum(["klein", "mittel", "gross"]).nullable(),
  budget: z.number().nonnegative().nullable().describe("Gesamtbudget in Euro"),
  eigenanteil: z.number().min(0).max(100).nullable().describe("Eigenanteil in Prozent"),
  start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().describe("Projektbeginn als YYYY-MM"),
  startOffen: z.boolean().describe("true, wenn die VHS den Start ausdrücklich noch nicht kennt"),
  partner: z.strictObject({
    international: partnerFlag,
    startchancen: partnerFlag,
    krankenkasse: partnerFlag,
    kommune: partnerFlag,
    azav: partnerFlag,
  }),
});
export type Profile = z.infer<typeof profileSchema>;

export const emptyProfile = (): Profile => ({
  vorhaben: "",
  themen: [],
  zielgruppen: [],
  bundesland: null,
  traeger: null,
  groesse: null,
  budget: null,
  eigenanteil: null,
  start: null,
  startOffen: false,
  partner: { international: null, startchancen: null, krankenkasse: null, kommune: null, azav: null },
});

export const matchStatusSchema = z.enum(["passend", "pruefen", "aehnlich"]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const matchStatusLabel: Record<MatchStatus, string> = {
  passend: "Passend nach Datenlage",
  pruefen: "Noch zu prüfen",
  aehnlich: "Ähnlich",
};

export type Match = {
  programmeId: string;
  titel: string;
  status: MatchStatus;
  begruendung: string;
  offenePunkte: string[];
  /** Planbare Änderung bei Status „aehnlich“, sonst null. */
  anpassung: string | null;
  url: string | null;
};

export type ApplicationValue = string | number | null;

/** Stand des Antragsinterviews. Der Browser hält ihn und schickt ihn mit jeder Nachricht zurück. */
export const applicationStateSchema = z.strictObject({
  programmeId: z.string().min(1),
  schritt: z.number().int().min(0),
  gesamt: z.number().int().min(1),
  antworten: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.null()])),
});
export type ApplicationState = z.infer<typeof applicationStateSchema>;

const historyEntry = z.strictObject({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(8000),
});
export type HistoryEntry = z.infer<typeof historyEntry>;

export const chatRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("message"),
    message: z.string().trim().min(1).max(4000),
    history: z.array(historyEntry).max(60).default([]),
    profile: profileSchema.default(emptyProfile),
    selectedProgrammeId: z.string().nullable().default(null),
    /** Gesetzt, solange das Antragsinterview läuft. */
    application: applicationStateSchema.nullable().default(null),
  }),
  z.strictObject({
    action: z.literal("startApplication"),
    programmeId: z.string().min(1),
    history: z.array(historyEntry).max(60).default([]),
    profile: profileSchema.default(emptyProfile),
  }),
  z.strictObject({
    action: z.literal("selectProgramme"),
    programmeId: z.string().min(1),
    history: z.array(historyEntry).max(60).default([]),
    profile: profileSchema.default(emptyProfile),
  }),
]);
export type ChatRequest = z.input<typeof chatRequestSchema>;

export type ChatResponse = {
  reply: string;
  profile: Profile;
  /** Nur gesetzt, wenn eine neue Suche lief. Leeres Array = keine Treffer. */
  matches?: Match[];
  /** Nur bei selectProgramme gesetzt. */
  selectedProgramme?: { id: string; titel: string };
  /** Antragsinterview: neuer Stand, null = beendet. Fehlt das Feld, bleibt der Stand unverändert. */
  application?: ApplicationState | null;
};

export type ChatError = { error: string };

/** Katalogeintrag für die Anzeige ohne KI-Bewertung. */
export type CatalogEntry = {
  id: string;
  titel: string;
  foerdergeber: string | null;
  ebene: string | null;
  foerdergebiet: string | null;
  fachbereiche: string[];
  kurzbeschreibung: string | null;
  frist: { status: string; datum: string | null };
  url: string | null;
};

/**
 * Antwort mit HTTP 503, wenn die KI-Anbindung gestört ist.
 * `reply` als Chatnachricht anzeigen und `catalog` statt der Treffer listen.
 */
export type ChatUnavailable = ChatError & {
  code: "KI_NICHT_ERREICHBAR";
  reply: string;
  profile: Profile;
  catalog: CatalogEntry[];
};
