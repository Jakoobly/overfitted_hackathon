import catalogFile from "../../../data/json/foerderprogramme.json";
import type { CatalogEntry } from "@/lib/chat/contract";

export type Programme = (typeof catalogFile.programme)[number];

const programmes: Programme[] = catalogFile.programme;
const byId = new Map(programmes.map((p) => [p.id, p]));

export function getProgramme(id: string): Programme | undefined {
  return byId.get(id);
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Ob man sich laut Katalog noch bewerben kann. Unbekannte Fristen gelten als offen. */
export function availability(programme: Programme, date = today()): { verfuegbar: boolean; grund: string | null } {
  if (programme.frist.status === "kein_aufruf") return { verfuegbar: false, grund: "derzeit kein Förderaufruf" };
  if (programme.frist.status === "datum" && programme.frist.datum && programme.frist.datum < date) {
    return { verfuegbar: false, grund: `Antragsfrist am ${programme.frist.datum} abgelaufen` };
  }
  return { verfuegbar: true, grund: null };
}

/** Alle Einträge für die Anzeige, wenn die KI nicht erreichbar ist. */
export function catalogEntries(): CatalogEntry[] {
  return programmes.map((p) => ({
    id: p.id,
    titel: p.titel,
    foerdergeber: p.foerdergeber ?? null,
    ebene: p.ebene ?? null,
    foerdergebiet: p.foerdergebiet ?? null,
    fachbereiche: p.fachbereiche ?? [],
    kurzbeschreibung: p.kurzbeschreibung ?? null,
    frist: { status: p.frist.status, datum: p.frist.datum ?? null },
    url: p.links.programmwebsite ?? null,
  }));
}

/** Katalog ohne Kontakt- und Herkunftsangaben, als Kontext für die Suche. */
export function catalogForSearch() {
  return programmes.map((p) => {
    const entry: Partial<Programme> & { programmwebsite: string | null; verfuegbarkeit: ReturnType<typeof availability> } = {
      ...p,
      programmwebsite: p.links.programmwebsite ?? null,
      verfuegbarkeit: availability(p),
    };
    delete entry.kontakt;
    delete entry.quellen;
    delete entry.links;
    return entry;
  });
}
