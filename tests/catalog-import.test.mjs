// Prüft den Katalog-Import mit den manuell ergänzten Antragsunterlagen.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPT = path.join(ROOT, "scripts/import-catalog.mjs");
const committed = JSON.parse(readFileSync(path.join(ROOT, "data/json/foerderprogramme.json"), "utf8"));
const ESF = "esf-fachkursfoerderung-baden-wuerttemberg";

const tmp = () => mkdtempSync(path.join(tmpdir(), "catalog-"));

test("the committed catalogue matches a fresh import", { timeout: 60_000 }, () => {
  const out = path.join(tmp(), "katalog.json");
  execFileSync(process.execPath, [SCRIPT], { env: { ...process.env, CATALOG_OUT: out }, stdio: "pipe" });
  const fresh = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(fresh.programme, committed.programme, "data/json/foerderprogramme.json bitte mit npm run import:catalog neu erzeugen");
});

test("the ESF Fachkurse entry carries the documented application documents with sources", () => {
  const esf = committed.programme.find((p) => p.id === ESF);
  assert.ok(esf.unterlagen, "unterlagen gesetzt");
  assert.match(esf.unterlagen.einreichung, /ELAN/);
  assert.ok(esf.unterlagen.antrag.some((u) => u.includes("Unterschrift und Bestätigungen")));
  assert.ok(esf.unterlagen.nachBewilligung.length > 0);
  const web = esf.quellen.filter((q) => q.typ === "web");
  assert.ok(web.length > 0 && web.every((q) => q.url.startsWith("https://www.esf-bw.de/") && q.stand));
  for (const p of committed.programme.filter((p) => p.id !== ESF)) assert.equal(p.unterlagen, null, p.id);
});

test("a supplement for an unknown programme ID aborts the import", { timeout: 60_000 }, () => {
  const dir = tmp();
  const ergaenzungen = path.join(dir, "unterlagen.json");
  writeFileSync(ergaenzungen, JSON.stringify({ programme: { "gibt-es-nicht": { antrag: ["x"], quellen: [] } } }));
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, CATALOG_OUT: path.join(dir, "katalog.json"), CATALOG_ERGAENZUNGEN: ergaenzungen },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unbekannte ID gibt-es-nicht/);
});
