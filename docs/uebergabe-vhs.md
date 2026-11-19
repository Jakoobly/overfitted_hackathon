# Übergabe an die VHS

## Förderfinder lokal starten

Im Repo-Ordner `npm ci` ausführen, den Langdock-Zugang in `.env.local` einrichten und mit `npm run dev` starten. Unter `http://localhost:3000` eine Projektidee eingeben oder „Beispiel laden“ wählen. Beides startet eine Suche im importierten Förderkatalog. „Antrag vorbereiten“ fügt die Checkliste für das ausgewählte Programm zum Chat hinzu. Für den Funktionstest „Welche Unterlagen brauchen wir?“ eingeben und prüfen, ob sich die Antwort auf das ausgewählte Programm bezieht. Falls mehrere Treffer vorliegen, ein anderes Programm wählen und die Frage wiederholen.

## Langdock-Zugang

**Der Demo-Schlüssel ist nur für den Hackathon am 19. November 2026 vorgesehen. Er läuft am 20. November 2026 ab.** Für weitere Tests und den Betrieb stellt die zuständige Person im VHS-Langdock-Workspace einen neuen Workspace-Schlüssel mit Berechtigung für die Completion API bereit.

Am 19. November 2026 wurde `gpt-5.1` mit dem Demo-Schlüssel geprüft. Im lokalen Browser-Test führten eine freie Projektbeschreibung und „Beispiel laden“ zu Katalogtreffern und einer gezielten Rückfrage. Nach „Antrag vorbereiten“ erschienen Checklisten im Chat. Die freie Unterlagenfrage bezog sich vor und nach dem Programmwechsel auf den jeweils ausgewählten Treffer. Bei fehlenden Katalogangaben verwies der Chat an die Förderstelle oder die Programmwebsite. [API-Vertrag und Beispiele](api-chat.md)

Treffer und Checkliste erzeugt das Sprachmodell aus dem Katalog. Ist der KI-Zugang gestört (Schlüssel fehlt oder abgelaufen, Langdock nicht erreichbar), meldet der Chat ein Problem mit der Anbindung (HTTP 503) und zeigt alle Programme aus dem Katalog ohne Bewertung. Am 19. November 2026 mit einem ungültigen Schlüssel an der Route geprüft. Im Browser-Test wertete das Modell bei der ESF-Fachkursförderung „erwerbsfähig“ einmal als erfüllt, obwohl die Projekteingabe nur „Erwachsene“ nannte. Die Fördervoraussetzungen sind fachlich zu bestätigen. [Technische Entscheidung](decisions.md)

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
