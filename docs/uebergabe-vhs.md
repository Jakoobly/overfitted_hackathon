# Übergabe an die VHS

## Förderfinder lokal starten

Im Repo-Ordner `npm ci` ausführen, den Langdock-Zugang in `.env.local` einrichten und mit `npm run dev` starten. Unter `http://localhost:3000` die Projektidee, Zielgruppe und den Standort der VHS in den Chat eingeben und **Senden** wählen. Das startet die Suche im importierten Förderkatalog. „Antrag vorbereiten“ fügt die Checkliste für das ausgewählte Programm zum Chat hinzu. Für den Funktionstest „Welche Unterlagen brauchen wir?“ eingeben und prüfen, ob sich die Antwort auf das ausgewählte Programm bezieht. Falls mehrere Treffer vorliegen, ein anderes Programm wählen und die Frage wiederholen.

Im Chat sendet **Enter** die Nachricht. **Umschalt+Enter** fügt einen Zeilenumbruch ein. Die Nachricht erscheint sofort im Verlauf. Darunter steht „Der Förderfinder antwortet …“, bis die Antwort eintrifft. Der Verlauf wächst bis zu einer vom Browserfenster abhängigen Maximalhöhe. Danach scrollen die Nachrichten innerhalb des Chatfensters oberhalb des Eingabefelds. Schlägt der Versand fehl, steht der Text wieder im Eingabefeld.

### Nur offene Programme und künftige Projekte

Der Förderfinder sucht nur Programme, für die man sich laut Katalog jetzt noch bewerben kann. Programme mit `frist.status = "kein_aufruf"` oder einer Frist vor dem heutigen Datum zeigt der Server nie als Treffer an, auch wenn das Modell sie vorschlägt (Stand 19. November 2026: „Gemeinsam engagiert in BW V“, Frist 01.10.2026, und „Wandel der Arbeit“, kein Aufruf). Programme mit unbekannter Frist gelten als offen. Liegt der genannte Projektbeginn vor dem aktuellen Monat, z. B. „letztes Jahr“, verwirft der Server den Start, zeigt keine Treffer und fragt nach einem künftigen Starttermin. Die Eckdaten-Ansicht lässt nur Monate ab dem aktuellen Monat zu.

### Antragsangaben erfassen

Nach „Antrag vorbereiten“ fragt der Chat über „Angaben für den Antrag erfassen“ die Antragsangaben Frage für Frage ab. Für die ESF-Fachkursförderung stammen die 14 Fragen aus dem Antragsvordruck (Stand November 2026), mit Prüfung von 8 bis 160 Unterrichtseinheiten, höchstens 6.000 Euro Kursgebühr und Kursbeginn in der Förderrunde 01.09.2026 bis 31.08.2027. Am Ende berechnet der Chat den Zuschuss (45 %) und warnt unter 10.000 Euro. Für alle anderen Programme gibt es 10 allgemeine Fragen. Falsche Formate fragt der Server mit Beispiel erneut ab. Die Angaben werden nur im Browser gehalten und nicht gespeichert. Chatantworten sind auf etwa 60 Wörter begrenzt, ausführlicher nur auf Nachfrage.

### Automatische Prüfungen

- `npm test` prüft ohne Langdock-Schlüssel die Chat-Route gegen ein simuliertes Langdock: Antwortformat, Treffer nur aus dem Katalog, Anfrage an Langdock (`gpt-5.1`, `store: false`), Fehler 400/404, den Ersatzweg mit HTTP 503 und Katalogliste sowie die Neubewertung nach einer Korrektur. Außerdem prüft es, dass der Katalog dem Import entspricht. Läuft auch in der CI.
- `npm run smoke:chat` spielt bei laufender App (`npm run dev`, oder `SMOKE_URL=<App-URL>`) den Demo-Ablauf live mit dem echten Schlüssel durch: Projektbeschreibung mit Rückfrage, „Antrag vorbereiten“, Frage nach den Unterlagen und Korrektur des Standorts auf Bayern. Verbraucht Tokens, deshalb nur vor Demo oder Übergabe ausführen. Am 19. November 2026 zweimal vollständig bestanden. Die Treffer schwanken zwischen den Läufen (z. B. nach der Korrektur auf Bayern einmal keine, einmal drei bundesweite Programme). Bei einem Fehlschlag die ausgegebenen Antworten lesen und den Lauf wiederholen.

## Projekteckdaten korrigieren

Über den Förderprogrammen stehen Vorhaben, Zielgruppe, Bundesland, Budget und Projektstart. Fehlende Angaben erscheinen als „Noch offen“. **Bearbeiten** öffnet das Formular. **Abbrechen** verwirft den Entwurf. **Erneut prüfen** sendet die geänderten Eckdaten mit dem übrigen Projektprofil an den Förderfinder.

Sobald die API eine neue Trefferliste liefert, übernimmt die Oberfläche die Eckdaten, aktualisiert die Treffer und hebt die Programmauswahl auf. Der bisherige Chatverlauf bleibt sichtbar. Liefert die API einen Fehler oder keine neue Trefferliste, bleibt das Formular mit dem Entwurf zur Wiederholung geöffnet. Eine leere Trefferliste gilt als abgeschlossene Prüfung ohne Treffer.

Am 19. November 2026 in Chrome geprüft. Mit dem Demo-Beispiel und Langdock verschwand die ESF-Fachkursförderung Baden-Württemberg nach dem Wechsel auf Bayern. Der Chatverlauf blieb sichtbar und die Programmauswahl wurde aufgehoben. Abbrechen, Wiederholen nach HTTP 503 und nach einer Antwort ohne Trefferliste sowie die Anzeige einer leeren Trefferliste wurden lokal geprüft.

## Langdock-Zugang

**Der Demo-Schlüssel ist nur für den Hackathon am 19. November 2026 vorgesehen. Er läuft am 20. November 2026 ab.** Für weitere Tests und den Betrieb stellt die zuständige Person im VHS-Langdock-Workspace einen neuen Workspace-Schlüssel mit Berechtigung für die Completion API bereit.

Am 19. November 2026 wurde `gpt-5.1` mit dem Demo-Schlüssel geprüft. Im lokalen Browser-Test führten eine freie Projektbeschreibung und das damalige Demo-Beispiel zu Katalogtreffern und einer gezielten Rückfrage. Nach „Antrag vorbereiten“ erschienen Checklisten im Chat. Die freie Unterlagenfrage bezog sich vor und nach dem Programmwechsel auf den jeweils ausgewählten Treffer. Bei fehlenden Katalogangaben verwies der Chat an die Förderstelle oder die Programmwebsite. Für die ESF-Fachkursförderung Baden-Württemberg nannte er nach der Ergänzung die belegten Antragsunterlagen. [API-Vertrag und Beispiele](api-chat.md)

## Antragsunterlagen ergänzen

Die Programmdokumente in `raw/` nennen keine Antragsunterlagen. Belegte Unterlagen stehen deshalb je Programm-ID in `data/ergaenzungen/unterlagen.json`, gegliedert nach Einreichung, Antrag, Bereithalten und Pflichten nach der Bewilligung, jeweils mit Quellen-URL und Stand. `npm run import:catalog` übernimmt sie in `data/json/foerderprogramme.json`. Eine unbekannte ID bricht den Import mit Fehlermeldung ab. Aktuell gepflegt: ESF-Fachkursförderung Baden-Württemberg (Antragsvordruck Stand November 2026, Merkblatt Stand September 2026). Vor jeder neuen Förderrunde mit den Vordrucken auf esf-bw.de abgleichen.

Treffer und Checkliste erzeugt das Sprachmodell aus dem Katalog. Ist der KI-Zugang gestört (Schlüssel fehlt oder abgelaufen, Langdock nicht erreichbar), meldet der Chat ein Problem mit der Anbindung (HTTP 503) und zeigt alle Programme aus dem Katalog ohne Bewertung. Am 19. November 2026 mit einem ungültigen Schlüssel an Route und Oberfläche geprüft. Die Antragscheckliste nach „Antrag vorbereiten“ setzt Unterlagen, Einreichung, Frist, Programmwebsite und Quellen direkt aus dem Katalog ein. Als erfüllt zeigt sie nur Voraussetzungen, für die das Modell einen tatsächlich im Projektprofil stehenden Wert nennt. Alles andere steht unter „Noch zu klären“. Ob der Wert die Voraussetzung inhaltlich trägt, entscheidet weiterhin das Modell. Am 19. November 2026 wertete es bei der ESF-Fachkursförderung den Standort der VHS als Beleg für den Wohnort der Teilnehmenden und die Größe „klein“ als Beleg für die Mindestfördersumme. Die Fördervoraussetzungen sind deshalb fachlich zu bestätigen. [Technische Entscheidung](decisions.md)

### Schlüssel ersetzen

1. Für die lokale Entwicklung bei Bedarf `.env.example` nach `.env.local` kopieren und dort `LANGDOCK_API_KEY` ersetzen. Für eine bereitgestellte App denselben Wert im Bereich für serverseitige Umgebungsvariablen des Hostings aktualisieren.
2. Für die Langdock-EU-Cloud `LANGDOCK_BASE_URL=https://api.langdock.com/openai/eu/v1` verwenden. `LANGDOCK_MODEL=gpt-5.1` setzen, sofern die Modell-ID für den neuen Schlüssel in der gewählten Region verfügbar ist. Die verfügbaren IDs liefert `GET /models` relativ zur konfigurierten Basis-URL.
3. Den lokalen Server neu starten oder beim Hosting eine neue Bereitstellung auslösen, damit die App den neuen Schlüssel übernimmt. Den API-Kurztest mit dem neuen Schlüssel wiederholen.

Der echte Schlüssel gehört in `.env.local` oder in die serverseitigen Secrets des Hostings. Git ignoriert `.env.local`.

### API-Kurztest in PowerShell

Im Repo-Ordner nach `npm ci` ausführen. Erwartete Antwort ist `Langdock OK`.

```powershell
@'
import OpenAI from "openai";
const apiKey = process.env.LANGDOCK_API_KEY;
const baseURL = process.env.LANGDOCK_BASE_URL;
const model = process.env.LANGDOCK_MODEL;
if (!apiKey || !baseURL || !model) throw new Error("Langdock-Konfiguration fehlt.");
const client = new OpenAI({ apiKey, baseURL, maxRetries: 0, timeout: 20_000 });
const response = await client.responses.create({
  model,
  input: "Antworte nur mit: Langdock OK",
  store: false,
});
if (response.output_text?.trim() !== "Langdock OK") {
  throw new Error("Unerwartete Antwort im Langdock-Test.");
}
console.log("Langdock OK");
'@ | node --env-file=.env.local --input-type=module
```

[Langdock Responses API](https://docs.langdock.com/en/developer/completion-api/openai-responses)
