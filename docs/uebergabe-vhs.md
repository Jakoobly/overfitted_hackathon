# Übergabe an die VHS

## Förderfinder lokal starten

Im Repo-Ordner `npm ci` ausführen, den Langdock-Zugang in `.env.local` einrichten und mit `npm run dev` starten. Unter `http://localhost:3000` die Projektidee, Zielgruppe und den Standort der VHS in den Chat eingeben und **Senden** wählen. Das startet die Suche im importierten Förderkatalog. „Antrag vorbereiten“ fügt die Checkliste für das ausgewählte Programm zum Chat hinzu. Für den Funktionstest „Welche Unterlagen brauchen wir?“ eingeben und prüfen, ob sich die Antwort auf das ausgewählte Programm bezieht. Falls mehrere Treffer vorliegen, ein anderes Programm wählen und die Frage wiederholen.

Im Chat sendet **Enter** die Nachricht. **Umschalt+Enter** fügt einen Zeilenumbruch ein. Die Nachricht erscheint sofort im Verlauf. Darunter steht „Der Förderfinder antwortet …“, bis die Antwort eintrifft. Der Verlauf wächst bis zu einer vom Browserfenster abhängigen Maximalhöhe. Danach scrollen die Nachrichten innerhalb des Chatfensters oberhalb des Eingabefelds. Schlägt der Versand fehl, steht der Text wieder im Eingabefeld.

### Nur offene Programme und künftige Projekte

Der Förderfinder sucht nur Programme, für die man sich laut Katalog jetzt noch bewerben kann. Programme mit `frist.status = "kein_aufruf"` oder einer Frist vor dem heutigen Datum zeigt der Server nie als Treffer an, auch wenn das Modell sie vorschlägt (Stand 19. November 2026: „Gemeinsam engagiert in BW V“, Frist 01.10.2026, und „Wandel der Arbeit“, kein Aufruf). Programme mit unbekannter Frist gelten als offen. Liegt der genannte Projektbeginn vor dem aktuellen Monat, z. B. „letztes Jahr“, verwirft der Server den Start, zeigt keine Treffer und fragt nach einem künftigen Starttermin. Die Eckdaten-Ansicht lässt nur Monate ab dem aktuellen Monat zu.

### Antragsangaben erfassen

Nach „Antrag vorbereiten“ fragt der Chat über den Button „Antrag erfassen“ über dem Eingabefeld die Antragsangaben Frage für Frage ab. Während der Erfassung stehen dort „Überspringen“, „Zurück“ und „Abbrechen“ als fertige Antworten bereit. Für die ESF-Fachkursförderung stammen die 14 Fragen aus dem Antragsvordruck (Stand November 2026), mit Prüfung von 8 bis 160 Unterrichtseinheiten, höchstens 6.000 Euro Kursgebühr und Kursbeginn in der Förderrunde 01.09.2026 bis 31.08.2027. Am Ende berechnet der Chat den Zuschuss (45 %) und warnt unter 10.000 Euro. Für alle anderen Programme gibt es 10 allgemeine Fragen. Falsche Formate fragt der Server mit Beispiel erneut ab. Die Angaben werden nur im Browser gehalten und nicht gespeichert. Chatantworten sind auf etwa 60 Wörter begrenzt, ausführlicher nur auf Nachfrage.

### Schutz vor Missbrauch

`POST /api/chat` nimmt nur Anfragen von der eigenen Seite an (403 sonst). Weitere Seiten, etwa bei einer Einbettung, trägt man in `CHAT_ALLOWED_ORIGINS` ein. Pro IP sind 20 Anfragen pro Minute erlaubt, danach kommt 429 mit Wartezeit, die der Chat anzeigt. Anfragen über 100 KB, mehr als 20 Verlaufseinträge oder Einträge über 2.000 Zeichen werden abgelehnt, die Oberfläche kürzt den Verlauf vorher. Einschränkungen: Das Limit zählt im Arbeitsspeicher je Serverinstanz und ist auf Vercel mit mehreren Instanzen nur ungefähr. Skripte können den Origin-Header fälschen, für sie greift nur das Limit pro IP. Für einen dauerhaften öffentlichen Betrieb zusätzlich ein Ausgabenlimit für den Schlüssel im Langdock-Workspace setzen.

### Automatische Prüfungen

- `npm test` prüft ohne Langdock-Schlüssel die Chat-Route gegen ein simuliertes Langdock: Antwortformat, Treffer nur aus dem Katalog, Anfrage an Langdock (`gpt-5.1`, `store: false`), Fehler 400/403/404/413/429, den Ersatzweg mit HTTP 503 und Katalogliste, die Neubewertung nach einer Korrektur sowie Prüfstand und freigegebene Angaben aus einer Test-Scraper-Datenbank. Außerdem prüft es, dass der Katalog dem Import entspricht, und die Abläufe der statischen Mockups in `mockups/`. Läuft auch in der CI, zusammen mit `npm run build`. Am 19. November 2026 lokal bestanden (39 Tests, alle grün; `npm run build` ebenfalls erfolgreich). Hinweis: Die Tests starten einen eigenen `next dev` und laufen nicht, solange im selben Ordner schon `npm run dev` läuft.
- `npm run smoke:chat` spielt bei laufender App (`npm run dev`, oder `SMOKE_URL=<App-URL>`) den Demo-Ablauf live mit dem echten Schlüssel durch: Projektbeschreibung mit Rückfrage, „Antrag vorbereiten“, Frage nach den Unterlagen und Korrektur des Standorts auf Bayern. Verbraucht Tokens, deshalb nur vor Demo oder Übergabe ausführen. Am 19. November 2026 zweimal vollständig bestanden. Die Treffer schwanken zwischen den Läufen (z. B. nach der Korrektur auf Bayern einmal keine, einmal drei bundesweite Programme). Bei einem Fehlschlag die ausgegebenen Antworten lesen und den Lauf wiederholen.

## Projekteckdaten korrigieren

Über den Förderprogrammen stehen Vorhaben, Zielgruppe, Bundesland, Budget und Projektstart. Fehlende Angaben erscheinen als „Noch offen“. **Bearbeiten** öffnet das Formular. **Abbrechen** verwirft den Entwurf. **Erneut prüfen** sendet die geänderten Eckdaten mit dem übrigen Projektprofil an den Förderfinder.

Sobald die API eine neue Trefferliste liefert, übernimmt die Oberfläche die Eckdaten, aktualisiert die Treffer und hebt die Programmauswahl auf. Der bisherige Chatverlauf bleibt sichtbar. Liefert die API einen Fehler oder keine neue Trefferliste, bleibt das Formular mit dem Entwurf zur Wiederholung geöffnet. Eine leere Trefferliste gilt als abgeschlossene Prüfung ohne Treffer.

Am 19. November 2026 in Chrome geprüft. Mit dem Demo-Beispiel und Langdock verschwand die ESF-Fachkursförderung Baden-Württemberg nach dem Wechsel auf Bayern. Der Chatverlauf blieb sichtbar und die Programmauswahl wurde aufgehoben. Abbrechen, Wiederholen nach HTTP 503 und nach einer Antwort ohne Trefferliste sowie die Anzeige einer leeren Trefferliste wurden lokal geprüft.

## Langdock-Zugang

**Der Demo-Schlüssel ist nur für den Hackathon am 19. November 2026 vorgesehen. Er läuft am 20. November 2026 ab.** Für weitere Tests und den Betrieb stellt die zuständige Person im VHS-Langdock-Workspace einen neuen Workspace-Schlüssel mit Berechtigung für die Completion API bereit.

Am 19. November 2026 wurde `gpt-5.1` mit dem Demo-Schlüssel geprüft. Im lokalen Browser-Test führten eine freie Projektbeschreibung und das damalige Demo-Beispiel zu Katalogtreffern und einer gezielten Rückfrage. Nach „Antrag vorbereiten“ erschienen Checklisten im Chat. Die freie Unterlagenfrage bezog sich vor und nach dem Programmwechsel auf den jeweils ausgewählten Treffer. Bei fehlenden Katalogangaben verwies der Chat an die Förderstelle oder die Programmwebsite. Für die ESF-Fachkursförderung Baden-Württemberg nannte er nach der Ergänzung die belegten Antragsunterlagen. [API-Vertrag und Beispiele](api-chat.md)

## Programmseiten aktuell halten (Scraper-Datenbank)

`npm run scrape` ruft die offiziellen Programmseiten ab und legt beim ersten Lauf selbst `data/database.sqlite` an. Die Datei liegt im Repository, damit das Team denselben Stand und dieselben Prüfentscheidungen teilt; die SQLite-Hilfsdateien (`-wal`, `-shm`) ignoriert Git. Vor einem Commit `npm run scrape` beenden, damit alle Änderungen in der Hauptdatei stehen. Da die Datei binär ist, lassen sich parallele Änderungen nicht zusammenführen: Scraper-Läufe und Prüfungen im Team absprechen. Der Server liest diese Datei live, höchstens eine Minute verzögert, ohne Neustart:

- Jede Programmkarte zeigt „Programmseite geprüft am …“, nach einer erkannten Änderung zusätzlich „geändert am …“.
- Nur Extraktionen, die ein Mensch freigegeben hat und deren Zitate wörtlich im Seitentext stehen, fließen in die Suche ein. Sie können ein Programm schließen (kein offener Aufruf, Frist abgelaufen), aber nie öffnen. Ablauf: `npm run scrape -- --extract` (braucht den Langdock-Schlüssel, verbraucht Tokens), dann `npm run scrape -- --report --details` lesen, dann `npm run review -- <ID> geprueft` oder `npm run review -- <ID> verworfen`. `npm run review` ohne Argumente listet offene Extraktionen.
- Ohne Datei (z. B. wenn sie beim Deployment nicht mit ausgeliefert wird) zeigt die App keine Hinweise und nutzt nur den Katalog. Für einen anderen Ort `FOERDER_DB_FILE` setzen (relativ zum App-Ordner oder absolut).
- `SCRAPER_CONTACT` in `.env.local` mit einer Team- oder VHS-Adresse setzen, damit Seitenbetreiber das Team erreichen.

Stand der Datenbank im Repository (19. November 2026, letzter Lauf gegen 15:14 Uhr): 37 Seiten für alle 24 Programme. Gesperrt: beide CERV-Seiten auf kontaktstelle-cerv.de (robots.txt antwortet mit HTTP 500). Fehler: eine der beiden Wegweiserkurs-Seiten auf vhs-bw.de lieferte eine Fehlerseite. Extraktionen sind gelaufen, **aber noch keine ist freigegeben**: 48 warten auf Prüfung (bei 11 steht mindestens ein Zitat nicht wörtlich im Seitentext), 7 sind verworfen. Bis zur ersten Freigabe zeigt die App nur den Prüfstand, die Suche nutzt nur den Katalog. Im Browser lokal geprüft: 23 von 24 Karten mit Prüfstand (CERV ohne, weil gesperrt), Trefferansicht mit echtem Langdock.

Nicht geprüft: Betrieb mit Datenbank auf einem Hosting. Der Server liest die Datei zur Laufzeit über das Dateisystem und nicht per `import`. Auf Vercel muss sie deshalb ausdrücklich mit ausgeliefert werden (z. B. über `outputFileTracingIncludes` in einer `next.config`), sonst greift der Ausweg „ohne Datei“.

## Förderkatalog aus Excel aktualisieren

Quelle ist `raw/AG Fördermittelguide_Basisbericht.xlsx`, erstes Tabellenblatt (derzeit `Sheet1`, 21 Datenzeilen), plus je Programm ein Word-Dokument in `raw/` (24 Dokumente). Die Dokumente sind die neueren Fassungen und haben Vorrang, Excel füllt Lücken.

1. Die neue Excel-Datei unter demselben Namen in `raw/` ablegen. Diese Spaltenüberschriften müssen in Zeile 1 stehen, sonst bricht der Import mit „Excel: Spalten fehlen: …“ ab: `Name`, `E-Mail`, `Programm-/Fachbereich`, `Förderprogramm`, `Fördergeber`, `Zuordnung Fördergeb` (Land, Bund, Europa oder Andere), `Kurzbeschreibung des Programms (max. 1000 Zeichen):`, `Projektbudget für Antragsteller*innen:`, `Art der Förderung:`, `Link zu weiterführender Programmwebsite:`, `Link zu Projektbeispielen:`, `Sonstige Anmerkungen`.
2. `npm run import:catalog` ausführen. Das schreibt `data/json/foerderprogramme.json` neu und gibt Warnungen zu leeren oder mehrdeutigen Werten aus. Leere Werte bleiben `null`, jede Angabe behält ihre Herkunft (Excel-Zeile oder Dokument).
3. `npm test` ausführen (prüft, dass der Katalog dem Import entspricht), dann committen. Der Katalog wird beim Build fest eingebunden: `npm run dev` übernimmt ihn sofort, eine bereitgestellte App braucht eine neue Bereitstellung.

Neue Programme bekommen ihre Programmseite automatisch aus `Link zu weiterführender Programmwebsite:` und werden beim nächsten `npm run scrape` mit abgerufen.

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

## Bereitstellung und Einbindung in vhs-bw.de

**Stand 19. November 2026: Die App läuft nur lokal. Es gibt noch keine öffentliche App-URL und keinen Button auf vhs-bw.de.** Die Oberfläche ist an die Gestaltung von vhs-bw.de angelehnt (Navy, Gelb, Arial) und im Browser auf Desktop und Handybreite geprüft.

Für eine Bereitstellung (z. B. Vercel) als Next.js-App: `npm run build` muss durchlaufen (läuft in der CI), serverseitig `LANGDOCK_API_KEY`, `LANGDOCK_BASE_URL` und `LANGDOCK_MODEL` setzen, optional `CHAT_ALLOWED_ORIGINS` und `FOERDER_DB_FILE` (alle Namen in `.env.example`). Zur Scraper-Datenbank auf dem Hosting siehe oben.

Empfohlene Einbindung: Die Redaktion setzt auf der gewünschten WordPress-Seite einen Button „Förderfinder starten“, der im selben Tab auf die App-URL verlinkt. Die Kopfzeile der App verlinkt mit „Zur Verbandswebsite“ zurück auf vhs-bw.de. Offen und mit der VHS zu klären: finale App-URL (ggf. Subdomain wie `foerderfinder.vhs-bw.de`), Seite und Position des Buttons, wer den Link pflegt.

Eine Einbettung per `iframe` ist nicht vorbereitet. Dafür müsste die App einen `Content-Security-Policy: frame-ancestors`-Header für vhs-bw.de senden (derzeit nicht gesetzt), und `https://www.vhs-bw.de` gehört in `CHAT_ALLOWED_ORIGINS`. Details zu den Optionen: [Spezifikation](vhs-foerderfinder.md#einbindung-in-vhs-bwde).

## Zuständigkeiten im Hackathon-Team

| Bereich | Person |
| --- | --- |
| Oberfläche, Chat-Integration, Gestaltung | Jakob |
| Chat-Route, Langdock-Anbindung, Antragsinterview, Missbrauchsschutz | Robert |
| Excel-Import, Katalog, Scraper und Scraper-Datenbank | Rafael |

Für den Betrieb benennt die VHS noch Ansprechpersonen für Datenpflege (Katalog, Freigabe der Extraktionen), Hosting und den Langdock-Zugang.

## Bekannte Einschränkungen

- Der Demo-Schlüssel läuft am 20. November 2026 ab. Ohne neuen Schlüssel zeigt die App nur den Katalog ohne Bewertung (HTTP 503).
- Bewertungen und Antworten kommen vom Sprachmodell und schwanken zwischen Läufen. Fördervoraussetzungen sind fachlich bei der Förderstelle zu bestätigen. Darauf weist die App bei den Treffern hin.
- Belegte Antragsunterlagen sind bisher nur für die ESF-Fachkursförderung Baden-Württemberg gepflegt. Bei den anderen Programmen verweist die Checkliste auf die Förderstelle.
- Angaben von den Programmseiten fließen erst nach menschlicher Freigabe ein. Bisher ist keine Extraktion freigegeben.
- Gesprächsverlauf und Antragsangaben liegen nur im Browser und gehen beim Neuladen verloren.
- Das Anfrage-Limit zählt je Serverinstanz im Arbeitsspeicher (siehe „Schutz vor Missbrauch“).
- Die Scraper-Datenbank ist eine Binärdatei im Repository: parallele Änderungen lassen sich nicht zusammenführen.
