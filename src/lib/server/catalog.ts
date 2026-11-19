import catalogFile from "../../../data/json/foerderprogramme.json";

export type Programme = (typeof catalogFile.programme)[number];

const programmes: Programme[] = catalogFile.programme;
const byId = new Map(programmes.map((p) => [p.id, p]));

export function getProgramme(id: string): Programme | undefined {
  return byId.get(id);
}

/** Katalog ohne Kontakt- und Herkunftsangaben, als Kontext für die Suche. */
export function catalogForSearch() {
  return programmes.map((p) => {
    const entry: Partial<Programme> & { programmwebsite: string | null } = { ...p, programmwebsite: p.links.programmwebsite ?? null };
    delete entry.kontakt;
    delete entry.quellen;
    delete entry.links;
    return entry;
  });
}
