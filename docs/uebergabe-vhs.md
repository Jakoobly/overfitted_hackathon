# Übergabe an die VHS

## Langdock-Zugang

**Der Demo-Schlüssel ist nur für den Hackathon am 19. November 2026 vorgesehen. Er läuft am 20. November 2026 ab.** Für weitere Tests und den Betrieb stellt die zuständige Person im VHS-Langdock-Workspace einen neuen Workspace-Schlüssel mit Berechtigung für die Completion API bereit.

Am 19. November 2026 hat der Langdock-EU-Endpunkt mit `gpt-5.1` auf eine fiktive Testnachricht mit `Langdock OK` geantwortet. Damit sind Schlüssel, Endpunkt und Modellzugriff für den Demo-Schlüssel geprüft. Die strukturierte Ausgabe für das Projektprofil und der vollständige Ablauf im Förderfinder stehen noch zur Abnahme aus.

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
