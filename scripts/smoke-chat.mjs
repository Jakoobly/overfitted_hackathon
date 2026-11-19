// Live-Prüfung des Demo-Ablaufs gegen eine laufende App mit echtem Langdock-Schlüssel.
//
//   npm run dev            (in einem zweiten Terminal)
//   npm run smoke:chat     (optional: SMOKE_URL=https://… npm run smoke:chat)
//
// Verbraucht Langdock-Tokens und läuft deshalb nicht in der CI. Modellantworten schwanken;
// bei einem Fehlschlag die ausgegebenen Antworten lesen und den Lauf ggf. wiederholen.
import { readFileSync } from "node:fs";

const BASE = (process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const catalog = JSON.parse(readFileSync(new URL("../data/json/foerderprogramme.json", import.meta.url), "utf8")).programme;
const ESF = "esf-fachkursfoerderung-baden-wuerttemberg";
const todayIso = new Date().toISOString().slice(0, 10);
const closed = new Set(catalog.filter((p) => p.frist.status === "kein_aufruf" || (p.frist.status === "datum" && p.frist.datum < todayIso)).map((p) => p.id));
const bwOnly = new Set(catalog.filter((p) => p.foerdergebiet === "Baden-Württemberg").map((p) => p.id));

const failures = [];
const check = (ok, text) => {
  console.log(`  ${ok ? "✔" : "✖"} ${text}`);
  if (!ok) failures.push(text);
  return ok;
};

let history = [];
let profile;
let selectedProgrammeId = null;

const words = (text) => text.split(/\s+/).filter(Boolean).length;
const short = (data) => check(words(data.reply ?? "") <= 90, `Antwort kurz (${words(data.reply ?? "")} Wörter, Ziel ≤ 60)`);

async function send(title, request, userText) {
  console.log(`\n▶ ${title}`);
  const started = Date.now();
  let response, data;
  try {
    response = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...request, history: history.slice(-20).map((m) => ({ ...m, text: m.text.slice(0, 2000) })), ...(profile ? { profile } : {}) }),
    });
    data = await response.json();
  } catch (error) {
    console.error(`\nApp unter ${BASE} nicht erreichbar (${error.message}). Läuft npm run dev?`);
    process.exit(2);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (response.status === 503) {
    console.error(`\n503 ${data.code}: Langdock nicht erreichbar. LANGDOCK_API_KEY und Server-Log prüfen.`);
    process.exit(2);
  }
  check(response.status === 200, `HTTP ${response.status} in ${seconds} s`);
  if (response.status !== 200) {
    console.log(`  ${JSON.stringify(data)}`);
    return data;
  }
  console.log(`  Antwort: ${data.reply.replace(/\n/g, "\n           ")}`);
  if (data.matches) {
    console.log(`  Treffer: ${data.matches.map((m) => `${m.titel} (${m.status})`).join("; ") || "keine"}`);
    check(!data.matches.some((m) => closed.has(m.programmeId)), "keine Programme mit abgelaufener Frist oder ohne Aufruf");
  }
  history = [...history, { role: "user", text: userText }, { role: "assistant", text: data.reply }];
  profile = data.profile;
  return data;
}

console.log(`Förderfinder-Smoke-Test gegen ${BASE}`);

// 1. Freie Projektbeschreibung -> Treffer und gezielte Rückfrage
const description = "Wir sind eine kleine VHS in Heilbronn, ein eingetragener Verein, und planen einen Kurs zur digitalen Grundbildung für Erwachsene: Smartphone, Online-Banking, sichere Passwörter. Budget rund 15.000 Euro.";
const first = await send("Projektbeschreibung", { action: "message", message: description }, description);
check(first.profile?.bundesland === "Baden-Württemberg", `Bundesland erkannt (${first.profile?.bundesland})`);
check(first.profile?.budget === 15000, `Budget erkannt (${first.profile?.budget})`);
check(Array.isArray(first.matches) && first.matches.length > 0, `Treffer geliefert (${first.matches?.length ?? 0})`);
check(first.matches?.every((m) => catalog.some((p) => p.id === m.programmeId)) ?? false, "alle Treffer stammen aus dem Katalog");
check(/\?/.test(first.reply ?? ""), "Antwort enthält eine Rückfrage");
short(first);

// 2. Antrag vorbereiten (ESF-Fachkurse, falls getroffen, sonst erster Treffer)
const chosen = first.matches?.find((m) => m.programmeId === ESF) ?? first.matches?.[0];
if (chosen) {
  const selection = await send(`Antrag vorbereiten: ${chosen.titel}`, { action: "selectProgramme", programmeId: chosen.programmeId }, `Ich möchte den Antrag für „${chosen.titel}“ vorbereiten.`);
  check(selection.selectedProgramme?.id === chosen.programmeId, "Programm ausgewählt");
  check((selection.reply ?? "").includes(chosen.titel.split(" ")[0]), "Checkliste nennt das Programm");
  const met = (selection.reply ?? "").match(/Laut Ihrem Projektprofil erfüllt:\n([\s\S]*?)(\n\n|$)/)?.[1] ?? "";
  check(met !== "", "Checkliste trennt erfüllte von offenen Voraussetzungen");
  check(!/erwerbs/i.test(met), "Erwerbsstatus nicht als erfüllt gewertet (steht nicht im Profil)");
  if (chosen.programmeId === ESF) check(/ELAN/.test(selection.reply ?? ""), "Checkliste enthält die Einreichung über ELAN aus dem Katalog");
  check(words(selection.reply ?? "") <= 220, `Checkliste kompakt (${words(selection.reply ?? "")} Wörter)`);
  selectedProgrammeId = selection.selectedProgramme?.id ?? null;

  // 3. Freie Frage nach den Unterlagen
  const question = "Welche Unterlagen brauchen wir für den Antrag?";
  const docs = await send("Frage nach den Unterlagen", { action: "message", message: question, selectedProgrammeId }, question);
  if (selectedProgrammeId === ESF) {
    const markers = ["ELAN", "Anlage 1", "Unterschrift und Bestätigungen", "Identifikation des Antragstellers", "Kursbeschreibung"];
    const found = markers.filter((m) => (docs.reply ?? "").includes(m));
    check(found.length >= 2, `nennt belegte Antragsunterlagen aus dem Katalog (${found.join(", ") || "keine"})`);
  } else {
    check(/Förderstelle/.test(docs.reply ?? ""), "verweist mangels Katalogangaben an die Förderstelle");
  }
}

// 3b. Antragsinterview: Frage, falsches Format, Zwischenfrage, Abbruch
if (selectedProgrammeId) {
  const started = await send("Antragsangaben erfassen", { action: "startApplication", programmeId: selectedProgrammeId }, "Angaben für den Antrag erfassen");
  check(started.application?.schritt === 0 && /Frage 1\//.test(started.reply ?? ""), "Interview startet mit Frage 1");
  let application = started.application;
  const reply1 = await send("Antwort auf Frage 1", { action: "message", message: "Volkshochschule Heilbronn e. V.", selectedProgrammeId, application }, "Volkshochschule Heilbronn e. V.");
  check(reply1.application?.schritt === 1, "Antwort übernommen, Frage 2 folgt");
  application = reply1.application;
  const wrongAnswer = selectedProgrammeId === ESF ? "Kirchbrunnenstraße" : "Maria";
  const wrong = await send("Antwort im falschen Format", { action: "message", message: wrongAnswer, selectedProgrammeId, application }, wrongAnswer);
  check(wrong.application?.schritt === 1 && /Das passt noch nicht/.test(wrong.reply ?? ""), "falsches Format wird mit Hinweis erneut abgefragt");
  const aside = "Wofür brauchen Sie diese Angabe?";
  const asideReply = await send("Zwischenfrage während der Erfassung", { action: "message", message: aside, selectedProgrammeId, application }, aside);
  check(/Zurück zur Erfassung – Frage 2\//.test(asideReply.reply ?? ""), "Zwischenfrage beantwortet, Frage 2 wiederholt");
  const cancelled = await send("Erfassung abbrechen", { action: "message", message: "abbrechen", selectedProgrammeId, application }, "abbrechen");
  check(cancelled.application === null, "Erfassung abgebrochen");
}

// 4. Frei formulierte Korrektur ändert die Bewertung
const correction = "Korrektur: Unsere VHS liegt in Bayern, nicht in Baden-Württemberg.";
const corrected = await send("Korrektur des Standorts", { action: "message", message: correction, selectedProgrammeId }, correction);
check(corrected.profile?.bundesland === "Bayern", `Bundesland korrigiert (${corrected.profile?.bundesland})`);
check(Array.isArray(corrected.matches), "neue Suche ausgelöst");
check(!(corrected.matches ?? []).some((m) => bwOnly.has(m.programmeId)), "keine reinen Baden-Württemberg-Programme mehr");

// 5. Projektbeginn in der Vergangenheit wird nicht akzeptiert
const past = "Der Kurs ist übrigens schon letztes Jahr im März gestartet.";
const pastReply = await send("Projektbeginn in der Vergangenheit", { action: "message", message: past, selectedProgrammeId }, past);
check(/Vergangenheit/.test(pastReply.reply ?? ""), "weist auf den vergangenen Projektbeginn hin");
check(!pastReply.profile?.start || pastReply.profile.start >= todayIso.slice(0, 7), `kein vergangener Start im Profil (${pastReply.profile?.start})`);
check(pastReply.matches === undefined, "keine Treffer für ein bereits begonnenes Projekt");

console.log(failures.length ? `\n✖ ${failures.length} Prüfung(en) fehlgeschlagen` : "\n✔ Demo-Ablauf vollständig");
process.exit(failures.length ? 1 : 0);
