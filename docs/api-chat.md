# `POST /api/chat`

Typen: [`src/lib/chat/contract.ts`](../src/lib/chat/contract.ts). Der Browser hält Verlauf, Profil und Programmauswahl und schickt sie bei jeder Anfrage mit. Antwortzeit live etwa 5–10 Sekunden.

Treffer, Rückfragen und Checkliste erzeugt das Modell über Langdock (`gpt-5.1`, Responses API, `store: false`) aus dem Katalog `data/json/foerderprogramme.json`. Der Server prüft Anfrage, Profil und Modellausgabe mit Zod und verwirft Treffer-IDs, die nicht im Katalog stehen.

## Aktion `message`

Freie Nachricht. `history` enthält die bisherigen Nachrichten ohne die aktuelle. `profile` und `selectedProgrammeId` sind optional.

```json
{
  "action": "message",
  "message": "Wir sind eine kleine vhs in Heilbronn (eingetragener Verein) und planen einen Kurs zur digitalen Grundbildung für Erwachsene. Budget rund 15.000 Euro.",
  "history": [],
  "selectedProgrammeId": null
}
```

`profile` beim ersten Aufruf weglassen (nicht `null` senden). Danach immer das zuletzt erhaltene Profil mitschicken.

```json
{
  "reply": "Für Ihren Kurs zur digitalen Grundbildung … Sind Ihre Teilnehmenden überwiegend Erwerbstätige/erwerbsfähige Personen (relevant für ESF-Fachkursförderung)?",
  "profile": {
    "vorhaben": "Kurs zur digitalen Grundbildung für Erwachsene",
    "themen": ["digital"],
    "zielgruppen": ["erwachsene"],
    "bundesland": "Baden-Württemberg",
    "traeger": "verein",
    "groesse": "klein",
    "budget": 15000,
    "eigenanteil": null,
    "start": null,
    "startOffen": false,
    "partner": { "international": null, "startchancen": null, "krankenkasse": null, "kommune": null, "azav": null }
  },
  "matches": [
    {
      "programmeId": "esf-fachkursfoerderung-baden-wuerttemberg",
      "titel": "ESF-Fachkursförderung Baden-Württemberg",
      "status": "passend",
      "begruendung": "Digitale Grundbildung mit Berufsbezug kann als überbetrieblicher Fachkurs in BW gefördert werden.",
      "offenePunkte": ["Erwerbsstatus der Teilnehmenden", "aktuelle Ausschreibung und Antragsfristen"],
      "anpassung": null,
      "url": "https://www.esf-bw.de/projekte-und-programme-umsetzen/foerderbereich-wirtschaft/foerderprogramm-fachkurse"
    },
    {
      "programmeId": "idee-bw",
      "titel": "idee BW",
      "status": "pruefen",
      "begruendung": "Stärkung der Medienkompetenz in Baden-Württemberg ist Kernziel.",
      "offenePunkte": ["aktuelle Ausschreibungsrunde und Fristen"],
      "anpassung": null,
      "url": "https://www.medienfokus-bw.de/angebot/idee-bw/"
    }
  ]
}
```

- `matches` fehlt, wenn keine neue Suche lief, etwa bei einer Frage zum ausgewählten Programm. Dann die bisherige Trefferliste stehen lassen. Ein leeres Array bedeutet „keine Treffer“.
- `status`: `passend` = „Passend nach Datenlage“, `pruefen` = „Noch zu prüfen“, `aehnlich` = „Ähnlich“ (dann ist `anpassung` gesetzt). Labels: `matchStatusLabel` im Vertrag.
- Das zurückgegebene `profile` ersetzt das bisherige Profil im Browser. Direkte Korrekturen in der Eckdaten-Ansicht einfach im nächsten `profile` mitschicken.

## Aktion `selectProgramme`

„Antrag vorbereiten“ auf einer Trefferkarte.

```json
{
  "action": "selectProgramme",
  "programmeId": "esf-fachkursfoerderung-baden-wuerttemberg",
  "history": [],
  "profile": { "…": "aktuelles Profil" }
}
```

```json
{
  "reply": "Gewähltes Programm: ESF-Fachkursförderung Baden-Württemberg\n\nVoraussetzungen – noch zu klären:\n- …\n\nUnterlagen: bei der Förderstelle prüfen\nFrist: bei der Förderstelle prüfen\nProgrammwebsite: https://www.esf-bw.de/…\n\nKonkreter nächster Schritt:\n- …",
  "profile": { "…": "unverändert" },
  "selectedProgramme": { "id": "esf-fachkursfoerderung-baden-wuerttemberg", "titel": "ESF-Fachkursförderung Baden-Württemberg" }
}
```

Danach jede weitere `message` mit `"selectedProgrammeId": "esf-fachkursfoerderung-baden-wuerttemberg"` senden, damit der Chat Fragen wie „Welche Unterlagen fehlen uns?“ aus diesem Katalogeintrag beantwortet. `reply` enthält Zeilenumbrüche und `- `-Listen, im Chat mit `white-space: pre-line` darstellen.

## Antragsinterview (`startApplication`)

Nach „Antrag vorbereiten“ startet der Button „Angaben für den Antrag erfassen“ das Interview. Fragen und Formatprüfung liegen fest im Server (`src/lib/server/application.ts`), ohne Modellaufruf: 14 Fragen für die ESF-Fachkursförderung aus dem Antragsvordruck, 10 allgemeine Fragen für alle anderen Programme.

```json
{ "action": "startApplication", "programmeId": "esf-fachkursfoerderung-baden-wuerttemberg", "profile": { "…": "…" } }
```

Antwort: `reply` mit Frage 1 und `application` = `{ "programmeId": "…", "schritt": 0, "gesamt": 14, "antworten": {} }`. Diesen Stand schickt der Browser bei jeder folgenden `message` als `application` mit und ersetzt ihn durch den zurückgegebenen Wert.

- Passt das Format nicht, bleibt `schritt` gleich und `reply` nennt Fehler, Beispiel und die Frage erneut.
- „überspringen“, „zurück“ und „abbrechen“ steuern den Ablauf. Bei Vorschlägen aus den Eckdaten übernimmt „ja“ den Wert.
- Endet die Nachricht mit „?“, beantwortet das Modell die Zwischenfrage und wiederholt die offene Frage. `application` fehlt dann in der Antwort, der Stand bleibt also unverändert.
- Nach der letzten Frage oder bei „abbrechen“ ist `application: null`, und `reply` enthält die Zusammenfassung.

## Fehler

Antwort `{ "error": "<kurze Meldung auf Deutsch>" }`, direkt anzeigbar.

| Status | Fall |
| --- | --- |
| 400 | Ungültiges JSON oder Anfrage passt nicht zum Vertrag, z. B. mehr als 20 Verlaufseinträge, ein Eintrag über 2.000 Zeichen oder mehr als 30 Interview-Antworten. Die Oberfläche kürzt den Verlauf vor dem Senden. |
| 403 | `Origin` gehört nicht zur eigenen Seite und steht nicht in `CHAT_ALLOWED_ORIGINS` |
| 404 | `programmeId` nicht im Katalog |
| 413 | Anfrage größer als 100 KB |
| 429 | Mehr als 20 Anfragen pro Minute von derselben IP, mit `Retry-After` in Sekunden |
| 503 | KI-Anbindung gestört, siehe unten |

## KI nicht erreichbar (503)

Fehlt der Schlüssel, ist Langdock nicht erreichbar, läuft der Aufruf in eine Zeitüberschreitung (45 s) oder ist die Modellausgabe ungültig, antwortet die Route für beide Aktionen mit `503` und `Retry-After: 60`. Typ: `ChatUnavailable`.

```json
{
  "error": "Die KI-Anbindung ist gerade gestört.",
  "code": "KI_NICHT_ERREICHBAR",
  "reply": "Es gibt aktuell ein Problem mit der Anbindung an unseren KI-Dienst (Fehler 503 – Dienst nicht verfügbar). Ich kann Ihre Nachricht deshalb gerade nicht auswerten. Daneben sehen Sie alle 24 Förderprogramme aus unserem Katalog. Bitte versuchen Sie es in ein paar Minuten noch einmal.",
  "profile": { "…": "unverändert aus der Anfrage" },
  "catalog": [
    {
      "id": "esf-fachkursfoerderung-baden-wuerttemberg",
      "titel": "ESF-Fachkursförderung Baden-Württemberg",
      "foerdergeber": "…",
      "ebene": "Europa",
      "foerdergebiet": "Baden-Württemberg",
      "fachbereiche": ["Arbeit – Beruf"],
      "kurzbeschreibung": "…",
      "frist": { "status": "unbekannt", "datum": null },
      "url": "https://www.esf-bw.de/…"
    }
  ]
}
```

Oberfläche: Bei `code === "KI_NICHT_ERREICHBAR"` `reply` als Chatnachricht anzeigen und `catalog` statt der Trefferkarten listen, ohne Status-Badge, weil nichts bewertet wurde. Die Nachricht der VHS bleibt im Verlauf, damit sie sie später erneut senden kann.
