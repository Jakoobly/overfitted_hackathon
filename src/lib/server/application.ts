// Antragsinterview: feste Fragen je Programm, Formatprüfung im Server, Zusammenfassung am Ende.
// Das Modell wird nur für Rückfragen der VHS während des Interviews gebraucht.
import type { ApplicationState, ApplicationValue, ChatResponse, Profile } from "@/lib/chat/contract";
import { getProgramme, today, type Programme } from "./catalog";

type Answers = ApplicationState["antworten"];
type Check = { ok: true; value: ApplicationValue; hinweis?: string } | { ok: false; fehler: string };

type Question = {
  id: string;
  label: string;
  frage: string;
  beispiel: string;
  parse: (text: string, answers: Answers) => Check;
  /** Vorschlag aus den Eckdaten, mit „ja“ übernehmbar. */
  vorschlag?: (profile: Profile) => ApplicationValue | null;
  format?: (value: ApplicationValue) => string;
};

// ---------- Formate ----------

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const euro = { format: (n: number) => euroFormat.format(n).replace(/\u00a0/g, " ") };
const formatEuro = (v: ApplicationValue) => euro.format(Number(v));
const formatMonth = (v: ApplicationValue) => `${MONATE[Number(String(v).slice(5, 7)) - 1]} ${String(v).slice(0, 4)}`;
const formatDate = (v: ApplicationValue) => String(v).split("-").reverse().join(".");
const ok = (value: ApplicationValue, hinweis?: string): Check => ({ ok: true, value, hinweis });
const fail = (fehler: string): Check => ({ ok: false, fehler });

function text(min: number, max = 200, what = "Angabe") {
  return (t: string) => {
    if (t.length < min) return fail(`Die ${what} ist zu kurz.`);
    if (t.length > max) return fail(`Bitte höchstens ${max} Zeichen.`);
    return ok(t);
  };
}

const fullName = (t: string) =>
  t.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length >= 2 ? ok(t) : fail("Bitte Vor- und Nachnamen angeben.");

const email = (t: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? ok(t.toLowerCase()) : fail("Das ist keine gültige E-Mail-Adresse.");

const phone = (t: string) => {
  const digits = t.replace(/[\s()/.-]/g, "");
  return /^\+?\d{6,15}$/.test(digits) ? ok(t) : fail("Bitte eine Telefonnummer nur mit Ziffern, Leerzeichen, +, / oder - angeben.");
};

const address = (t: string) =>
  /\d/.test(t.split(",")[0] ?? "") && /\b\d{5}\b\s+\p{L}/u.test(t)
    ? ok(t)
    : fail("Bitte Straße mit Hausnummer sowie fünfstellige PLZ und Ort angeben.");

function parseNumber(t: string): number | null {
  const m = t.replace(/\s/g, "").match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(k|tsd|tausend)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, "") + (m[2] ? `.${m[2]}` : ""));
  return m[3] ? n * 1000 : n;
}

function integer(min: number, max: number, unit: string, rule?: string) {
  return (t: string) => {
    const n = parseNumber(t);
    if (n === null || !Number.isInteger(n)) return fail(`Bitte eine ganze Zahl (${unit}) angeben.`);
    if (n < min || n > max) return fail(rule ?? `Bitte eine Zahl zwischen ${min} und ${max} angeben.`);
    return ok(n);
  };
}

function amount(max = Infinity, rule?: string) {
  return (t: string) => {
    const n = parseNumber(t);
    if (n === null) return fail("Bitte einen Betrag in Euro angeben.");
    if (n < 0 || n > max) return fail(rule ?? "Der Betrag ist nicht zulässig.");
    return ok(n);
  };
}

function parseMonth(t: string): string | null {
  const s = t.toLowerCase();
  const iso = s.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const num = s.match(/\b(0?[1-9]|1[0-2])\s*[./]\s*(20\d{2})\b/);
  if (num) return `${num[2]}-${num[1].padStart(2, "0")}`;
  const idx = MONATE.findIndex((m) => s.includes(m.toLowerCase()) || s.includes(m.toLowerCase().slice(0, 3) + "."));
  const year = s.match(/\b(20\d{2})\b/);
  if (idx >= 0 && year) return `${year[1]}-${String(idx + 1).padStart(2, "0")}`;
  return null;
}

function month(notBefore?: (a: Answers) => string | null, label = "") {
  return (t: string, answers: Answers) => {
    const m = parseMonth(t);
    if (!m) return fail("Bitte Monat und Jahr angeben, z. B. „März 2027“ oder „03/2027“.");
    if (m < today().slice(0, 7)) return fail("Der Monat liegt in der Vergangenheit.");
    const min = notBefore?.(answers);
    if (min && m < min) return fail(`Der Monat darf nicht vor ${label} (${formatMonth(min)}) liegen.`);
    return ok(m);
  };
}

function parseDate(t: string): string | null {
  const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const de = t.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : de ? [de[3], de[2], de[1]] : null;
  if (!parts) return null;
  const [y, m, d] = parts;
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const check = new Date(`${date}T00:00:00Z`);
  return check.toISOString().slice(0, 10) === date ? date : null;
}

function date(rule: (d: string, a: Answers) => string | null) {
  return (t: string, answers: Answers) => {
    const d = parseDate(t);
    if (!d) return fail("Bitte ein gültiges Datum im Format TT.MM.JJJJ angeben.");
    if (d < today()) return fail("Das Datum liegt in der Vergangenheit.");
    const error = rule(d, answers);
    return error ? fail(error) : ok(d);
  };
}

function choice(options: Record<string, RegExp>, hint: string) {
  return (t: string) => {
    const hit = Object.entries(options).find(([, re]) => re.test(t.toLowerCase()));
    return hit ? ok(hit[0]) : fail(hint);
  };
}

// ---------- Fragen ----------

const contact: Question[] = [
  { id: "ansprechperson", label: "Ansprechperson", frage: "Wer ist Ansprechperson für den Antrag (Vor- und Nachname)?", beispiel: "Maria Muster", parse: fullName },
  { id: "telefon", label: "Telefon", frage: "Unter welcher Telefonnummer ist die Ansprechperson erreichbar?", beispiel: "07131 123456", parse: phone },
  { id: "email", label: "E-Mail", frage: "Welche E-Mail-Adresse hat die Ansprechperson?", beispiel: "maria.muster@vhs-beispiel.de", parse: email },
];

const generic: Question[] = [
  { id: "traeger", label: "Antragsteller", frage: "Wie lautet der vollständige Name des Antragstellers (Träger der VHS)?", beispiel: "Volkshochschule Heilbronn e. V.", parse: text(5, 150, "Bezeichnung") },
  ...contact,
  { id: "projekttitel", label: "Projekttitel", frage: "Wie soll das Projekt heißen?", beispiel: "Digital fit im Alltag", parse: text(5, 120, "Bezeichnung") },
  { id: "projektbeginn", label: "Projektbeginn", frage: "Wann beginnt das Projekt (Monat und Jahr)?", beispiel: "März 2027", parse: month(), vorschlag: (p) => p.start, format: formatMonth },
  { id: "projektende", label: "Projektende", frage: "Wann endet das Projekt (Monat und Jahr)?", beispiel: "Dezember 2027", parse: month((a) => (a.projektbeginn as string) ?? null, "dem Projektbeginn"), format: formatMonth },
  { id: "teilnehmende", label: "Teilnehmende", frage: "Wie viele Teilnehmende erwarten Sie insgesamt?", beispiel: "60", parse: integer(1, 100000, "Personen") },
  { id: "gesamtkosten", label: "Gesamtkosten", frage: "Wie hoch sind die geplanten Gesamtkosten in Euro?", beispiel: "15.000", parse: amount(), vorschlag: (p) => p.budget, format: formatEuro },
  {
    id: "eigenmittel",
    label: "Eigenmittel",
    frage: "Wie viel Euro bringen Sie als Eigenmittel ein?",
    beispiel: "1.500",
    parse: (t, a) => amount(Number(a.gesamtkosten ?? Infinity), "Die Eigenmittel dürfen die Gesamtkosten nicht übersteigen.")(t),
    format: formatEuro,
  },
];

// ESF-Fachkursförderung: Felder aus dem Antragsvordruck (Stand November 2026), Tabellenblätter „Antrag“ und „Anlage 1“.
const ESF_ROUND = { von: "2026-09-01", bis: "2027-08-31" };
const ESF_RATE = 0.45;
const ESF_MIN_GRANT = 10000;

const esfFachkurse: Question[] = [
  { id: "traeger", label: "Antragsteller", frage: "Wie lautet der Name des Antragstellers (Weiterbildungsträger)?", beispiel: "Volkshochschule Heilbronn e. V.", parse: text(5, 150, "Bezeichnung") },
  { id: "anschrift", label: "Anschrift", frage: "Wie lautet die Anschrift des Trägers (Straße, Hausnummer, PLZ, Ort)?", beispiel: "Kirchbrunnenstraße 12, 74072 Heilbronn", parse: address },
  {
    id: "rechtsform",
    label: "Rechtsform",
    frage: "Ist der Träger des öffentlichen oder des privaten Rechts?",
    beispiel: "privat",
    parse: choice({ "öffentliches Recht": /öffentlich|oeffentlich|kommun/, "privates Recht": /privat|verein|e\.\s?v|gmbh/ }, "Bitte „öffentlich“ oder „privat“ angeben."),
  },
  {
    id: "jahreAmMarkt",
    label: "Jahre am Markt",
    frage: "Seit wie vielen Jahren bieten Sie berufliche Weiterbildung an?",
    beispiel: "12",
    parse: (t) => {
      const r = integer(0, 200, "Jahre")(t);
      if (r.ok && Number(r.value) < 3) return ok(r.value, "Antragsberechtigt sind laut Antragsvordruck nur Träger mit mindestens 3 Jahren am Markt.");
      return r;
    },
  },
  ...contact,
  { id: "kursbezeichnung", label: "Kursbezeichnung", frage: "Wie heißt der Fachkurs? Der thematische Schwerpunkt muss erkennbar sein.", beispiel: "Digitale Kompetenzen im Büroalltag", parse: text(8, 150, "Kursbezeichnung") },
  { id: "anzahlKurse", label: "Anzahl Kurse", frage: "Wie viele Kurse dieser Art planen Sie in der Förderrunde?", beispiel: "4", parse: integer(1, 500, "Kurse") },
  {
    id: "unterrichtseinheiten",
    label: "Unterrichtseinheiten je Kurs",
    frage: "Wie viele Unterrichtseinheiten (je mind. 45 Minuten) hat ein Kurs?",
    beispiel: "24",
    parse: integer(8, 160, "Unterrichtseinheiten", "Gefördert werden Fachkurse mit 8 bis 160 Unterrichtseinheiten."),
  },
  { id: "teilnehmende", label: "Förderfähige Teilnehmende insgesamt", frage: "Wie viele förderfähige Teilnehmende erwarten Sie über alle Kurse insgesamt?", beispiel: "48", parse: integer(1, 100000, "Personen") },
  {
    id: "gebuehr",
    label: "Teilnahmegebühr je Kurs",
    frage: "Wie hoch ist die Teilnahmegebühr pro Person und Kurs in Euro (ohne Mehrwertsteuer)?",
    beispiel: "450",
    parse: amount(6000, "Die Kursgebühr darf höchstens 6.000 Euro ohne Mehrwertsteuer betragen."),
    format: formatEuro,
  },
  {
    id: "ersterKurstag",
    label: "Erster Kurstag",
    frage: "An welchem Tag beginnt der erste Kurs (TT.MM.JJJJ)?",
    beispiel: "14.09.2026",
    parse: date((d) => (d < ESF_ROUND.von || d > ESF_ROUND.bis ? "Die aktuelle Förderrunde umfasst Kursbeginne vom 01.09.2026 bis 31.08.2027." : null)),
    format: formatDate,
  },
  {
    id: "letzterKurstag",
    label: "Letzter Kurstag",
    frage: "Wann ist voraussichtlich der letzte Kurstag (TT.MM.JJJJ)?",
    beispiel: "30.06.2027",
    parse: date((d, a) => (a.ersterKurstag && d < String(a.ersterKurstag) ? "Der letzte Kurstag darf nicht vor dem ersten liegen." : null)),
    format: formatDate,
  },
];

const QUESTION_SETS: Record<string, Question[]> = {
  "esf-fachkursfoerderung-baden-wuerttemberg": esfFachkurse,
};

export const questionsFor = (programmeId: string) => QUESTION_SETS[programmeId] ?? generic;

// ---------- Ablauf ----------

const SKIP = /^(überspringen|ueberspringen|weiß nicht|weiss nicht|später|spaeter|unbekannt|-)$/i;
const BACK = /^zurück$|^zurueck$/i;
const CANCEL = /^(abbrechen|stopp|stop|beenden)$/i;
const ACCEPT = /^(ja|j|ok|okay|passt|stimmt|übernehmen|uebernehmen)\b/i;

function questionText(q: Question, nr: number, total: number, profile: Profile) {
  const suggestion = q.vorschlag?.(profile);
  const hint = suggestion != null ? ` Laut Ihren Eckdaten: ${(q.format ?? String)(suggestion)} – mit „ja“ übernehmen.` : "";
  return `Frage ${nr}/${total}: ${q.frage}${hint}`;
}

const HELP = "(„überspringen“, „zurück“ oder „abbrechen“ sind jederzeit möglich.)";

export class UnknownApplicationError extends Error {}

export function startApplication(programmeId: string, profile: Profile): ChatResponse {
  const programme = getProgramme(programmeId);
  if (!programme) throw new UnknownApplicationError(programmeId);
  const questions = questionsFor(programmeId);
  return {
    reply: `Wir erfassen jetzt die Angaben für „${programme.titel}“ – ${questions.length} Fragen. ${HELP}\n\n${questionText(questions[0], 1, questions.length, profile)}`,
    profile,
    application: { programmeId, schritt: 0, gesamt: questions.length, antworten: {} },
  };
}

/** Die aktuelle Frage, z. B. nach einer Zwischenfrage der VHS. */
export function currentQuestion(state: ApplicationState, profile: Profile) {
  const questions = questionsFor(state.programmeId);
  const step = Math.min(Math.max(state.schritt, 0), questions.length - 1);
  return questionText(questions[step], step + 1, questions.length, profile);
}

/** Sieht die Nachricht nach einer Frage an den Förderfinder aus statt nach einer Antwort? */
export const isQuestion = (message: string) => /\?\s*$/.test(message.trim());

export function answerStep(state: ApplicationState, message: string, profile: Profile): ChatResponse {
  const programme = getProgramme(state.programmeId);
  if (!programme) throw new UnknownApplicationError(state.programmeId);
  const questions = questionsFor(programme.id);
  const total = questions.length;
  const step = Math.min(Math.max(state.schritt, 0), total - 1);
  const q = questions[step];
  const t = message.trim();
  const answers = { ...state.antworten };
  const next = (schritt: number, prefix: string): ChatResponse =>
    schritt >= total
      ? { reply: summary(programme, questions, answers), profile, application: null }
      : {
          reply: `${prefix}${questionText(questions[schritt], schritt + 1, total, profile)}`,
          profile,
          application: { programmeId: programme.id, schritt, gesamt: total, antworten: answers },
        };

  if (CANCEL.test(t)) {
    return { reply: "Die Erfassung ist abgebrochen. Sie können sie jederzeit neu starten oder weiter Fragen stellen.", profile, application: null };
  }
  if (BACK.test(t)) return next(Math.max(step - 1, 0), "");
  if (SKIP.test(t)) {
    answers[q.id] = null;
    return next(step + 1, "Übersprungen, ich führe den Punkt als offen. ");
  }

  const suggestion = q.vorschlag?.(profile);
  const result: Check = suggestion != null && ACCEPT.test(t) ? ok(suggestion) : q.parse(t, answers);
  if (!result.ok) {
    return {
      reply: `Das passt noch nicht: ${result.fehler} Beispiel: „${q.beispiel}“.\n\n${questionText(q, step + 1, total, profile)}`,
      profile,
      application: { ...state, schritt: step, gesamt: total, antworten: answers },
    };
  }
  answers[q.id] = result.value;
  return next(step + 1, result.hinweis ? `Notiert. Hinweis: ${result.hinweis} ` : "Notiert. ");
}

function summary(programme: Programme, questions: Question[], answers: Answers) {
  const lines = questions.map((q) => {
    const v = answers[q.id];
    return `- ${q.label}: ${v === null || v === undefined ? "offen" : (q.format ?? String)(v)}`;
  });
  const open = questions.filter((q) => answers[q.id] === null || answers[q.id] === undefined).length;
  const parts = [`Ihre Angaben für „${programme.titel}“:\n${lines.join("\n")}`];

  if (programme.id === "esf-fachkursfoerderung-baden-wuerttemberg" && answers.gebuehr != null && answers.teilnehmende != null) {
    const each = Number(answers.gebuehr) * ESF_RATE;
    const total = each * Number(answers.teilnehmende);
    parts.push(
      `Zuschuss laut Antragsvordruck (45 % der Kursgebühr): ${euro.format(each)} je Teilnahme, insgesamt ${euro.format(total)}.` +
        (total < ESF_MIN_GRANT ? ` Achtung: Zuschüsse unter ${euro.format(ESF_MIN_GRANT)} werden grundsätzlich nicht bewilligt – weitere Kurse aufnehmen.` : ""),
    );
  }
  if (open) parts.push(`${open} Angabe(n) noch offen. Sie können die Erfassung neu starten, um sie zu ergänzen.`);
  parts.push(
    programme.unterlagen
      ? "Nächster Schritt: Antragsvordruck herunterladen, die Angaben übertragen und mit den Unterlagen aus der Checkliste einreichen."
      : "Nächster Schritt: Antragsformular bei der Förderstelle anfordern und die Angaben übertragen.",
  );
  return parts.join("\n\n");
}
