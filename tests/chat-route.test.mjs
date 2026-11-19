// Prüft POST /api/chat gegen einen simulierten Langdock-Server. Läuft ohne echten Schlüssel.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const catalog = JSON.parse(readFileSync(new URL("../data/json/foerderprogramme.json", import.meta.url), "utf8")).programme;
const ESF = "esf-fachkursfoerderung-baden-wuerttemberg";
const IDEE = "idee-bw";

const profile = {
  vorhaben: "Kurs zur digitalen Grundbildung für Erwachsene",
  themen: ["digital"],
  zielgruppen: ["erwachsene"],
  bundesland: "Baden-Württemberg",
  traeger: "verein",
  groesse: "klein",
  budget: 15000,
  eigenanteil: null,
  start: null,
  startOffen: false,
  partner: { international: null, startchancen: null, krankenkasse: null, kommune: null, azav: null },
};

// ---------- Simuliertes Langdock ----------

function fakeLangdock() {
  const requests = [];
  let next = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      requests.push({ url: req.url, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
      const reply = next.length > 1 ? next.shift() : next[0];
      if (!reply || reply.drop) return req.socket.destroy();
      const body = reply.status === 200 ? responseBody(reply.text) : { error: { message: "fake error" } };
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });
  return {
    requests,
    /** Nächste Antwort(en): { status, text } oder { drop: true } für einen Verbindungsabbruch. */
    respond(...replies) {
      next = replies;
      requests.length = 0;
    },
    listen: () => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port))),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function responseBody(text) {
  return {
    id: "resp_test",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-5.1",
    output: [{
      id: "msg_test",
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text, annotations: [] }],
    }],
  };
}

const modelJson = (value) => ({ status: 200, text: JSON.stringify(value) });

// ---------- Scraper-Datenbank als Testdaten ----------

const FIXTURE_DIR = mkdtempSync(join(tmpdir(), "foerderfinder-db-"));
const FIXTURE_DB = join(FIXTURE_DIR, "database.sqlite");
const CLOSED_BY_PAGE = "creative-europe";

/** Kleine Datenbank im Schema von scripts/scrape-sources.mjs. */
function writeFixtureDb() {
  const db = new DatabaseSync(FIXTURE_DB);
  db.exec(`
    CREATE TABLE quellen (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, programm_id TEXT NOT NULL, typ TEXT NOT NULL, aktiv INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE abrufe (id INTEGER PRIMARY KEY, quelle_id INTEGER NOT NULL, zeitpunkt TEXT NOT NULL, ergebnis TEXT NOT NULL,
      http_status INTEGER, content_type TEXT, etag TEXT, last_modified TEXT, text_hash TEXT, text TEXT, hinweis TEXT);
    CREATE TABLE extraktionen (id INTEGER PRIMARY KEY, abruf_id INTEGER NOT NULL, programm_id TEXT NOT NULL, zeitpunkt TEXT NOT NULL,
      modell TEXT NOT NULL, daten TEXT NOT NULL, belege_geprueft INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'neu');
  `);
  const source = db.prepare("INSERT INTO quellen (url, programm_id, typ) VALUES (?, ?, 'programmseite')");
  const fetch = db.prepare("INSERT INTO abrufe (quelle_id, zeitpunkt, ergebnis) VALUES (?, ?, ?)");
  const extraction = db.prepare("INSERT INTO extraktionen (abruf_id, programm_id, zeitpunkt, modell, daten, belege_geprueft, status) VALUES (?, ?, ?, 'test', ?, ?, ?)");
  const facts = (frist, offen) => JSON.stringify({
    frist: { status: frist, datum: null, beleg: "Zitat" },
    aufruf: { offen, titel: null, beleg: "Zitat" },
    foerderbetrag: { minEur: null, maxEur: 60000, beleg: "Zitat" },
    unterlagen: { liste: ["Antragsformular"], beleg: "Zitat" },
  });

  source.run("https://example.org/esf", ESF); // 1
  fetch.run(1, "2026-11-01T08:00:00.000Z", "neu");
  fetch.run(1, "2026-11-18T08:00:00.000Z", "geaendert");
  fetch.run(1, "2026-11-19T08:00:00.000Z", "fehler"); // zählt nicht als Prüfung
  source.run("https://example.org/idee", IDEE); // 2
  fetch.run(2, "2026-11-19T09:00:00.000Z", "neu"); // abruf 4
  extraction.run(4, IDEE, "2026-11-19T09:01:00.000Z", facts("kein_aufruf", false), 1, "neu"); // ungeprüft: ignorieren
  source.run("https://example.org/creative", CLOSED_BY_PAGE); // 3
  fetch.run(3, "2026-11-19T10:00:00.000Z", "neu"); // abruf 5
  extraction.run(5, CLOSED_BY_PAGE, "2026-11-19T10:01:00.000Z", facts("unbekannt", false), 1, "geprueft");
  db.close();
}

// ---------- Next-Server ----------

async function startApp(env) {
  const port = 3400 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`next dev beendet:\n${log}`);
    try {
      await fetch(`${base}/api/chat`, { method: "GET" });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return {
    base,
    stop: () => new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      child.kill("SIGTERM");
    }),
  };
}

let ipCounter = 0;
/** Jede Anfrage bekommt eine eigene IP, damit das Rate-Limit nur im eigenen Test greift. */
async function chat(base, body, raw = false, headers = {}) {
  ipCounter += 1;
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.${ipCounter >> 8}.${ipCounter & 255}`, ...headers },
    body: raw ? body : JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, data: await response.json() };
}

function assertUnavailable(res, expectedProfile) {
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("retry-after"), "60");
  assert.equal(res.data.code, "KI_NICHT_ERREICHBAR");
  assert.match(res.data.reply, /Problem mit der Anbindung/);
  assert.equal(res.data.catalog.length, catalog.length);
  assert.ok(res.data.catalog.every((e) => e.id && e.titel && "url" in e && e.frist));
  if (expectedProfile) assert.deepEqual(res.data.profile, expectedProfile);
}

// ---------- Tests ----------

describe("POST /api/chat", { timeout: 180_000 }, () => {
  const langdock = fakeLangdock();
  let app;

  before(async () => {
    const port = await langdock.listen();
    writeFixtureDb();
    app = await startApp({
      LANGDOCK_API_KEY: "test-key",
      LANGDOCK_BASE_URL: `http://127.0.0.1:${port}`,
      LANGDOCK_MODEL: "gpt-5.1",
      CHAT_ALLOWED_ORIGINS: "https://www.vhs-bw.de",
      FOERDER_DB_FILE: FIXTURE_DB,
    });
  });
  after(async () => {
    await app?.stop();
    await langdock.close();
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  test("matches carry the page status from the scraper database", async () => {
    langdock.respond(modelJson({
      reply: "Treffer.",
      profile,
      neueSuche: true,
      treffer: [ESF, IDEE, CLOSED_BY_PAGE].map((id) => ({ programmeId: id, status: "pruefen", begruendung: "x", offenePunkte: [], anpassung: null })),
    }));
    const res = await chat(app.base, { action: "message", message: "Suche.", profile });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.matches.map((m) => m.programmeId), [ESF, IDEE], "reviewed page closes the programme");
    const [esf, idee] = res.data.matches;
    assert.deepEqual(esf.seitenstand, { geprueftAm: "2026-11-18T08:00:00.000Z", geaendertAm: "2026-11-18T08:00:00.000Z" });
    assert.deepEqual(idee.seitenstand, { geprueftAm: "2026-11-19T09:00:00.000Z", geaendertAm: null });

    const instructions = langdock.requests[0].body.instructions;
    assert.match(instructions, /"verfuegbarkeit":\{"verfuegbar":false,"grund":"laut Programmseite derzeit kein offener Aufruf"\}/);
    assert.match(instructions, /"programmseite":\{"abgerufenAm":"2026-11-19".*"maxEur":60000/);
    assert.equal(instructions.match(/"programmseite":/g).length, 1, "unreviewed extractions stay out");
  });

  test("a message returns reply, profile and enriched matches", async () => {
    langdock.respond(modelJson({
      reply: "Wann soll das Projekt starten?",
      profile,
      neueSuche: true,
      treffer: [
        { programmeId: ESF, status: "passend", begruendung: "Passt.", offenePunkte: [], anpassung: "wird verworfen" },
        { programmeId: "erfunden", status: "passend", begruendung: "Gibt es nicht.", offenePunkte: [], anpassung: null },
        { programmeId: ESF, status: "pruefen", begruendung: "Doppelt.", offenePunkte: [], anpassung: null },
        { programmeId: IDEE, status: "aehnlich", begruendung: "Fast.", offenePunkte: ["Frist"], anpassung: "Später starten." },
        { programmeId: "interreg", status: "pruefen", begruendung: "Drei.", offenePunkte: [], anpassung: null },
        { programmeId: "horizon-europe", status: "pruefen", begruendung: "Vier.", offenePunkte: [], anpassung: null },
      ],
    }));
    const res = await chat(app.base, {
      action: "message",
      message: "Wir planen einen Kurs zur digitalen Grundbildung.",
      history: [{ role: "assistant", text: "Was planen Sie?" }],
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.reply, "Wann soll das Projekt starten?");
    assert.deepEqual(res.data.profile, profile);
    assert.deepEqual(res.data.matches.map((m) => m.programmeId), [ESF, IDEE, "interreg"]);
    const [esf, idee] = res.data.matches;
    assert.equal(esf.titel, catalog.find((p) => p.id === ESF).titel);
    assert.match(esf.url, /^https:\/\/www\.esf-bw\.de\//);
    assert.equal(esf.anpassung, null, "anpassung only for status aehnlich");
    assert.equal(idee.anpassung, "Später starten.");
  });

  test("the Langdock request carries model, schema, history, profile and catalogue", async () => {
    langdock.respond(modelJson({ reply: "ok", profile, neueSuche: false, treffer: [] }));
    await chat(app.base, {
      action: "message",
      message: "Zweite Nachricht",
      history: [{ role: "user", text: "Erste Nachricht" }, { role: "assistant", text: "Antwort" }],
      profile,
    });

    assert.equal(langdock.requests.length, 1);
    const { url, auth, body } = langdock.requests[0];
    assert.equal(url, "/responses");
    assert.equal(auth, "Bearer test-key");
    assert.equal(body.model, "gpt-5.1");
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.$schema, undefined);
    assert.deepEqual(body.input.map((m) => [m.role, m.content]), [
      ["user", "Erste Nachricht"],
      ["assistant", "Antwort"],
      ["user", "Zweite Nachricht"],
    ]);
    assert.ok(body.instructions.includes(JSON.stringify(profile)), "profile in instructions");
    assert.ok(body.instructions.includes(ESF) && body.instructions.includes(IDEE), "catalogue in instructions");
    assert.ok(!body.instructions.includes("hat das Programm"), "no selected programme");
  });

  test("without a new search the response has no matches", async () => {
    langdock.respond(modelJson({ reply: "Antwort", profile, neueSuche: false, treffer: [{ programmeId: ESF, status: "passend", begruendung: "x", offenePunkte: [], anpassung: null }] }));
    const res = await chat(app.base, { action: "message", message: "Danke", profile });
    assert.equal(res.status, 200);
    assert.equal("matches" in res.data, false);
  });

  test("a relevant correction without a new search triggers one follow-up search", async () => {
    const bayern = { ...profile, bundesland: "Bayern" };
    langdock.respond(
      modelJson({ reply: "Notiert.", profile: bayern, neueSuche: false, treffer: [] }),
      modelJson({ reply: "Neue Suche für Bayern.", profile: bayern, neueSuche: true, treffer: [{ programmeId: "esf-bundesprogramm", status: "pruefen", begruendung: "Bundesweit.", offenePunkte: [], anpassung: null }] }),
    );
    const res = await chat(app.base, { action: "message", message: "Wir sind in Bayern.", profile, selectedProgrammeId: ESF });
    assert.equal(res.status, 200);
    assert.equal(langdock.requests.length, 2);
    assert.ok(langdock.requests[1].body.instructions.includes(JSON.stringify(bayern)), "second call uses the corrected profile");
    assert.equal(res.data.reply, "Neue Suche für Bayern.");
    assert.equal(res.data.profile.bundesland, "Bayern");
    assert.deepEqual(res.data.matches.map((m) => m.programmeId), ["esf-bundesprogramm"]);
  });

  test("a project start in the past is rejected with a question for a new start", async () => {
    langdock.respond(modelJson({
      reply: "Passt alles.",
      profile: { ...profile, start: "2025-03" },
      neueSuche: true,
      treffer: [{ programmeId: ESF, status: "passend", begruendung: "Passt.", offenePunkte: [], anpassung: null }],
    }));
    const res = await chat(app.base, { action: "message", message: "Der Kurs ist letztes Jahr im März gestartet.", profile });
    assert.equal(res.status, 200);
    assert.match(res.data.reply, /Projektbeginn \(März 2025\) liegt in der Vergangenheit/);
    assert.match(res.data.reply, /Wann soll das Projekt .* frühestens starten/);
    assert.doesNotMatch(res.data.reply, /Passt alles/);
    assert.equal(res.data.profile.start, null);
    assert.equal("matches" in res.data, false);
  });

  test("a start in the current month or later is accepted", async () => {
    const nextYear = `${new Date().getUTCFullYear() + 1}-03`;
    langdock.respond(modelJson({ reply: "Gut.", profile: { ...profile, start: nextYear }, neueSuche: true, treffer: [] }));
    const res = await chat(app.base, { action: "message", message: "Start nächsten März.", profile });
    assert.equal(res.data.reply, "Gut.");
    assert.equal(res.data.profile.start, nextYear);
  });

  test("programmes without an open call are never returned as matches", async () => {
    const closed = catalog.filter((p) => p.frist.status === "kein_aufruf" || (p.frist.status === "datum" && p.frist.datum < new Date().toISOString().slice(0, 10)));
    assert.ok(closed.length > 0, "catalogue has closed programmes");
    langdock.respond(modelJson({
      reply: "Treffer.",
      profile,
      neueSuche: true,
      treffer: [...closed, { id: "esf-bundesprogramm" }].map((p) => ({ programmeId: p.id, status: "passend", begruendung: "x", offenePunkte: [], anpassung: null })),
    }));
    const res = await chat(app.base, { action: "message", message: "Suche.", profile });
    assert.deepEqual(res.data.matches.map((m) => m.programmeId), ["esf-bundesprogramm"]);
    const sentCatalogue = langdock.requests[0].body.instructions;
    assert.match(sentCatalogue, /"verfuegbarkeit":\{"verfuegbar":false,"grund":"derzeit kein Förderaufruf"\}/);
  });

  test("regional programmes are dropped for a different federal state", async () => {
    const bayern = { ...profile, bundesland: "Bayern" };
    langdock.respond(modelJson({
      reply: "Treffer.",
      profile: bayern,
      neueSuche: true,
      treffer: [ESF, IDEE, "esf-bundesprogramm"].map((id) => ({ programmeId: id, status: "pruefen", begruendung: "x", offenePunkte: [], anpassung: null })),
    }));
    const res = await chat(app.base, { action: "message", message: "Wir sind in Bayern.", profile: bayern });
    assert.deepEqual(res.data.matches.map((m) => m.programmeId), ["esf-bundesprogramm"]);
  });

  test("an irrelevant profile change does not trigger a second call", async () => {
    langdock.respond(modelJson({ reply: "Danke.", profile: { ...profile, vorhaben: "Neuer Titel" }, neueSuche: false, treffer: [] }));
    const res = await chat(app.base, { action: "message", message: "Nenne es Neuer Titel.", profile });
    assert.equal(res.status, 200);
    assert.equal(langdock.requests.length, 1);
    assert.equal("matches" in res.data, false);
  });

  test("a follow-up question includes the selected catalogue entry with its documents", async () => {
    langdock.respond(modelJson({ reply: "Über ELAN.", profile, neueSuche: false, treffer: [] }));
    const res = await chat(app.base, { action: "message", message: "Welche Unterlagen brauchen wir?", profile, selectedProgrammeId: ESF });
    assert.equal(res.status, 200);
    const { instructions } = langdock.requests[0].body;
    assert.match(instructions, /hat das Programm "ESF-Fachkursförderung Baden-Württemberg"/);
    assert.match(instructions, /Unterschrift und Bestätigungen/);
  });

  const checklist = (erfuellt, offen = ["Kursumfang 8 bis 160 Unterrichtseinheiten?"]) => modelJson({
    einleitung: "Das Programm bezuschusst berufliche Fachkurse.",
    erfuellt,
    offen,
    naechsterSchritt: "Antragsvordruck herunterladen.",
  });

  test("selectProgramme returns the checklist and the selected programme", async () => {
    langdock.respond(checklist([]));
    const res = await chat(app.base, { action: "selectProgramme", programmeId: ESF, profile });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.profile, profile);
    assert.deepEqual(res.data.selectedProgramme, { id: ESF, titel: catalog.find((p) => p.id === ESF).titel });
    assert.match(langdock.requests[0].body.instructions, /Antragscheckliste/);
    assert.match(res.data.reply, /^Gewähltes Programm: ESF-Fachkursförderung Baden-Württemberg/);
    assert.match(res.data.reply, /Nächster Schritt: Antragsvordruck herunterladen\./);
  });

  test("the checklist keeps only requirements backed by the profile", async () => {
    langdock.respond(checklist([
      { voraussetzung: "Förderregion Baden-Württemberg", profilfeld: "bundesland", profilwert: "Baden-Württemberg" },
      { voraussetzung: "Antrag durch einen Verein", profilfeld: "traeger", profilwert: "verein" },
      { voraussetzung: "Budget im Förderrahmen", profilfeld: "budget", profilwert: "15.000 €" },
      { voraussetzung: "Teilnehmende sind erwerbstätig", profilfeld: "zielgruppen", profilwert: "erwerbstätige" },
      { voraussetzung: "Projektbeginn ab September 2026", profilfeld: "start", profilwert: "2026-09" },
      { voraussetzung: "AZAV-zertifiziert", profilfeld: "partner.azav", profilwert: "ja" },
      { voraussetzung: "Eigenanteil von 10 %", profilfeld: "eigenanteil", profilwert: "10" },
    ]));
    const { data } = await chat(app.base, { action: "selectProgramme", programmeId: ESF, profile });
    const [, met, open] = data.reply.match(/Laut Ihrem Projektprofil erfüllt:\n([\s\S]*?)\n\nNoch zu klären:\n([\s\S]*?)\n\n/);
    assert.match(met, /Förderregion Baden-Württemberg \(Bundesland: Baden-Württemberg\)/);
    assert.match(met, /Antrag durch einen Verein/);
    assert.match(met, /Budget im Förderrahmen/);
    for (const unbacked of ["erwerbstätig", "Projektbeginn", "AZAV", "Eigenanteil"]) {
      assert.doesNotMatch(met, new RegExp(unbacked), `${unbacked} must not count as met`);
    }
    // 5 offene Punkte: Kursumfang + 4 unbelegte, gezeigt werden 3
    assert.match(open, /Kursumfang/);
    assert.match(open, /erwerbstätig/);
    assert.match(open, /und 2 weitere – fragen Sie nach Details/);
  });

  test("a requirement backed by several profile fields is listed once", async () => {
    langdock.respond(checklist([
      { voraussetzung: "Medienkompetenz in Baden-Württemberg.", profilfeld: "bundesland", profilwert: "Baden-Württemberg" },
      { voraussetzung: "Medienkompetenz in Baden-Württemberg", profilfeld: "themen", profilwert: "digital" },
    ]));
    const { data } = await chat(app.base, { action: "selectProgramme", programmeId: IDEE, profile });
    assert.equal(data.reply.match(/Medienkompetenz in Baden-Württemberg/g).length, 1);
    assert.match(data.reply, /Medienkompetenz in Baden-Württemberg \(Bundesland: Baden-Württemberg; Thema: digital\)/);
  });

  test("the checklist takes documents, deadline and sources from the catalogue", async () => {
    langdock.respond(checklist([]));
    const { data } = await chat(app.base, { action: "selectProgramme", programmeId: ESF, profile });
    const esf = catalog.find((p) => p.id === ESF);
    assert.match(data.reply, /Unterlagen:\n- Ausgefüllter Antragsvordruck\n- Tabellenblatt „Unterschrift und Bestätigungen“\n/);
    assert.ok(data.reply.includes("Antrag rechtzeitig vor Kursbeginn über das Antragsportal ELAN (https://elan.esf-bw.de) bei der L-Bank einreichen."));
    assert.ok(!data.reply.includes(esf.unterlagen.antrag[0]), "long form only on request");
    assert.match(data.reply, /Frist: bei der Förderstelle prüfen/);
    assert.ok(data.reply.includes(`Programmseite: ${esf.links.programmwebsite}`));
    assert.match(data.reply, /Quellen: .*Merkblatt Förderprogramm Fachkurse \(Stand September 2026\)/);
    assert.match(data.reply, /Mit „Antrag erfassen“/);
  });

  test("without catalogue documents the checklist points to the funding body", async () => {
    langdock.respond(checklist([]));
    const { data } = await chat(app.base, { action: "selectProgramme", programmeId: IDEE, profile });
    assert.match(data.reply, /Unterlagen: im Katalog nicht hinterlegt, bitte bei der Förderstelle prüfen\./);
    assert.doesNotMatch(data.reply, /ELAN|Quellen:/);
  });

  describe("application interview", () => {
    const start = (programmeId = ESF, p = profile) => chat(app.base, { action: "startApplication", programmeId, profile: p });
    const answer = (application, message, p = profile) => chat(app.base, { action: "message", message, profile: p, application });

    test("starts with question 1 without calling Langdock", async () => {
      langdock.respond(modelJson({ reply: "darf nicht kommen" }));
      const res = await start();
      assert.equal(res.status, 200);
      assert.deepEqual(res.data.application, { programmeId: ESF, schritt: 0, gesamt: 14, antworten: {} });
      assert.match(res.data.reply, /Frage 1\/14: Wie lautet der Name des Antragstellers/);
      assert.equal(langdock.requests.length, 0);
    });

    test("walks through all ESF questions, re-asks on wrong formats and sums up", async () => {
      langdock.respond(modelJson({ reply: "darf nicht kommen" }));
      let state = (await start()).data.application;
      const steps = [
        ["Volkshochschule Heilbronn e. V.", "Frage 2/14"],
        ["Kirchbrunnenstraße", "fünfstellige PLZ"],
        ["Kirchbrunnenstraße 12, 74072 Heilbronn", "Frage 3/14"],
        ["weiß ich nicht genau", "„öffentlich“ oder „privat“"],
        ["Wir sind ein eingetragener Verein", "Frage 4/14"],
        ["seit 30 Jahren", "Frage 5/14"],
        ["Maria", "Vor- und Nachnamen"],
        ["Maria Muster", "Frage 6/14"],
        ["0713l-abc", "Telefonnummer"],
        ["07131 123456", "Frage 7/14"],
        ["maria.muster(at)vhs.de", "keine gültige E-Mail"],
        ["maria.muster@vhs-heilbronn.de", "Frage 8/14"],
        ["Digitale Kompetenzen im Büroalltag", "Frage 9/14"],
        ["vier", "ganze Zahl"],
        ["4", "Frage 10/14"],
        ["200", "8 bis 160 Unterrichtseinheiten"],
        ["24 UE", "Frage 11/14"],
        ["48", "Frage 12/14"],
        ["7.000 €", "höchstens 6.000 Euro"],
        ["450 Euro", "Frage 13/14"],
        ["01.01.2026", "Vergangenheit"],
        ["31.02.2027", "gültiges Datum"],
        ["01.09.2027", "01.09.2026 bis 31.08.2027"],
        ["11.01.2027", "Frage 14/14"],
        ["01.01.2027", "nicht vor dem ersten"],
      ];
      for (const [message, expected] of steps) {
        const res = await answer(state, message);
        assert.equal(res.status, 200, message);
        assert.ok(res.data.reply.includes(expected), `${message} -> ${res.data.reply}`);
        state = res.data.application;
      }
      const done = await answer(state, "30.06.2027");
      assert.equal(done.data.application, null);
      const summary = done.data.reply;
      for (const line of ["- Anschrift: Kirchbrunnenstraße 12, 74072 Heilbronn", "- Rechtsform: privates Recht", "- Unterrichtseinheiten je Kurs: 24", "- Teilnahmegebühr je Kurs: 450,00 €", "- Erster Kurstag: 11.01.2027", "- Letzter Kurstag: 30.06.2027"]) {
        assert.ok(summary.includes(line), line);
      }
      assert.match(summary, /202,50 € je Teilnahme, insgesamt 9\.720,00 €/);
      assert.match(summary, /unter 10\.000,00 € werden grundsätzlich nicht bewilligt/);
      assert.equal(langdock.requests.length, 0, "answers are checked without the model");
    });

    test("supports skip, back and cancel", async () => {
      let state = (await start()).data.application;
      let res = await answer(state, "überspringen");
      assert.match(res.data.reply, /Übersprungen.*Frage 2\/14/s);
      assert.equal(res.data.application.antworten.traeger, null);
      res = await answer(res.data.application, "zurück");
      assert.match(res.data.reply, /Frage 1\/14/);
      res = await answer(res.data.application, "abbrechen");
      assert.equal(res.data.application, null);
      assert.match(res.data.reply, /abgebrochen/);
    });

    test("generic programmes use profile suggestions that can be accepted with yes", async () => {
      const nextYear = `${new Date().getUTCFullYear() + 1}-03`;
      const withStart = { ...profile, start: nextYear };
      let res = await start(IDEE, withStart);
      assert.equal(res.data.application.gesamt, 10);
      let state = res.data.application;
      for (const a of ["Volkshochschule Heilbronn e. V.", "Maria Muster", "07131 123456", "maria@vhs.de", "Digital fit im Alltag"]) {
        state = (await answer(state, a, withStart)).data.application;
      }
      res = await answer(state, "ja", withStart);
      assert.equal(res.data.application.antworten.projektbeginn, nextYear);
      assert.match(res.data.reply, /Frage 7\/10/);
      res = await answer(res.data.application, "Februar " + (new Date().getUTCFullYear() + 1), withStart);
      assert.match(res.data.reply, /nicht vor dem Projektbeginn/);
    });

    test("a question during the interview is answered by the model and the open question repeated", async () => {
      langdock.respond(modelJson({ reply: "Eine UE dauert mindestens 45 Minuten.", profile, neueSuche: false, treffer: [] }));
      const state = { programmeId: ESF, schritt: 9, gesamt: 14, antworten: {} };
      const res = await answer(state, "Was ist eine Unterrichtseinheit?");
      assert.equal(res.status, 200);
      assert.equal(langdock.requests.length, 1);
      assert.match(langdock.requests[0].body.instructions, /hat das Programm "ESF-Fachkursförderung/);
      assert.match(res.data.reply, /^Eine UE dauert mindestens 45 Minuten\.\n\nZurück zur Erfassung – Frage 10\/14/);
      assert.equal("application" in res.data, false, "state stays unchanged in the browser");
    });

    test("an unknown programme cannot be started", async () => {
      const res = await start("gibt-es-nicht");
      assert.equal(res.status, 404);
    });
  });

  test("selectProgramme with an unknown ID returns 404 without calling Langdock", async () => {
    langdock.respond(modelJson({ reply: "darf nicht kommen" }));
    const res = await chat(app.base, { action: "selectProgramme", programmeId: "gibt-es-nicht" });
    assert.equal(res.status, 404);
    assert.match(res.data.error, /nicht im Katalog/);
    assert.equal(langdock.requests.length, 0);
  });

  test("invalid requests return 400 without calling Langdock", async () => {
    langdock.respond(modelJson({ reply: "darf nicht kommen" }));
    const invalid = [
      ["kein JSON", "{kaputt", true],
      ["unbekannte Aktion", { action: "loeschen" }],
      ["leere Nachricht", { action: "message", message: "   " }],
      ["zu lange Nachricht", { action: "message", message: "x".repeat(4001) }],
      ["Start im falschen Format", { action: "message", message: "Hallo", profile: { ...profile, start: "März 2027" } }],
      ["Eigenanteil über 100 %", { action: "message", message: "Hallo", profile: { ...profile, eigenanteil: 150 } }],
      ["unbekanntes Profilfeld", { action: "message", message: "Hallo", profile: { ...profile, foo: 1 } }],
    ];
    for (const [name, body, raw] of invalid) {
      const res = await chat(app.base, body, raw);
      assert.equal(res.status, 400, name);
      assert.equal(typeof res.data.error, "string", name);
    }
    assert.equal(langdock.requests.length, 0);
  });

  describe("abuse protection", () => {
    test("oversized history, answers and bodies are rejected without calling Langdock", async () => {
      langdock.respond(modelJson({ reply: "ok", profile, neueSuche: false, treffer: [] }));
      const entry = (text) => ({ role: "user", text });
      const cases = [
        ["Verlaufseintrag über 2.000 Zeichen", { action: "message", message: "Hallo", history: [entry("x".repeat(2001))] }, 400],
        ["mehr als 20 Verlaufseinträge", { action: "message", message: "Hallo", history: Array.from({ length: 21 }, () => entry("x")) }, 400],
        ["mehr als 30 Antworten im Interview", {
          action: "message",
          message: "Hallo",
          application: { programmeId: ESF, schritt: 0, gesamt: 14, antworten: Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`f${i}`, "x"])) },
        }, 400],
        ["Anfrage über 100 KB", { action: "message", message: "Hallo", profile: { ...profile, vorhaben: "x".repeat(100_001) } }, 413],
      ];
      for (const [name, body, status] of cases) {
        const res = await chat(app.base, body);
        assert.equal(res.status, status, name);
      }
      const atLimit = await chat(app.base, { action: "message", message: "Hallo", history: Array.from({ length: 20 }, () => entry("y".repeat(2000))), profile });
      assert.equal(atLimit.status, 200, "20 entries with 2,000 characters are allowed");
      assert.equal(langdock.requests.length, 1);
    });

    test("requests from foreign websites are rejected, own and allowed origins pass", async () => {
      langdock.respond(modelJson({ reply: "ok", profile, neueSuche: false, treffer: [] }));
      const body = { action: "message", message: "Hallo", profile };
      const foreign = await chat(app.base, body, false, { origin: "https://evil.example" });
      assert.equal(foreign.status, 403);
      assert.match(foreign.data.error, /nur über den Förderfinder/);
      assert.equal(langdock.requests.length, 0);
      assert.equal((await chat(app.base, body, false, { origin: app.base })).status, 200);
      assert.equal((await chat(app.base, body, false, { origin: "https://www.vhs-bw.de" })).status, 200);
    });

    test("more than 20 requests per minute from one IP get 429", async () => {
      const ip = { "x-forwarded-for": "198.51.100.20" };
      for (let i = 1; i <= 20; i++) {
        assert.equal((await chat(app.base, { action: "kaputt" }, false, ip)).status, 400, `request ${i}`);
      }
      const limited = await chat(app.base, { action: "kaputt" }, false, ip);
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get("retry-after")) > 0);
      assert.match(limited.data.error, /Zu viele Anfragen/);
      assert.equal((await chat(app.base, { action: "kaputt" })).status, 400, "other IPs are not affected");
    });
  });

  describe("AI outage returns 503 with the catalogue", () => {
    const cases = [
      ["Langdock rejects the key (401)", [{ status: 401 }]],
      ["Langdock server error (500)", [{ status: 500 }]],
      ["connection dropped", [{ drop: true }]],
      ["model returns invalid JSON", [{ status: 200, text: "kein json" }]],
      ["model returns an invalid profile", [modelJson({ reply: "x", profile: { ...profile, eigenanteil: 150 }, neueSuche: false, treffer: [] })]],
    ];
    for (const [name, replies] of cases) {
      test(name, async () => {
        langdock.respond(...replies);
        assertUnavailable(await chat(app.base, { action: "message", message: "Hallo", profile }), profile);
      });
    }

    test("also for selectProgramme", async () => {
      langdock.respond({ status: 500 });
      assertUnavailable(await chat(app.base, { action: "selectProgramme", programmeId: ESF, profile }), profile);
    });
  });
});

describe("POST /api/chat without an API key", { timeout: 180_000 }, () => {
  const langdock = fakeLangdock();
  let app;

  before(async () => {
    const port = await langdock.listen();
    // Leerer Schlüssel überschreibt einen Wert aus .env.local
    // Ohne Datenbankdatei (wie auf Vercel) gilt nur der Katalog.
    app = await startApp({ LANGDOCK_API_KEY: "", LANGDOCK_BASE_URL: `http://127.0.0.1:${port}`, FOERDER_DB_FILE: "data/gibt-es-nicht.sqlite" });
  });
  after(async () => {
    await app?.stop();
    await langdock.close();
  });

  test("returns 503 with the catalogue and never calls Langdock", async () => {
    langdock.respond(modelJson({ reply: "darf nicht kommen" }));
    const res = await chat(app.base, { action: "message", message: "Hallo" });
    assertUnavailable(res);
    assert.ok(res.data.catalog.every((e) => e.seitenstand === null), "no page status without database");
    assert.equal(langdock.requests.length, 0);
  });
});
