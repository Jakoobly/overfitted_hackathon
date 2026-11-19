# `POST /api/chat`

Typen: [`src/lib/chat/contract.ts`](../src/lib/chat/contract.ts). Der Browser hält Verlauf, Profil und Programmauswahl und schickt sie bei jeder Anfrage mit. Antwortzeit live etwa 5–10 Sekunden.

Treffer, Rückfragen und Checkliste erzeugt das Modell über Langdock (`gpt-5.1`, Responses API, `store: false`) aus dem Katalog `data/catalog/foerderprogramme.json`. Der Server prüft Anfrage, Profil und Modellausgabe mit Zod und verwirft Treffer-IDs, die nicht im Katalog stehen.

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

## Fehler

Antwort `{ "error": "<kurze Meldung auf Deutsch>" }`, direkt anzeigbar.

| Status | Fall |
| --- | --- |
| 400 | Ungültiges JSON oder Anfrage passt nicht zum Vertrag |
| 404 | `programmeId` nicht im Katalog |
| 500 | `LANGDOCK_API_KEY` fehlt auf dem Server |
| 502 | Langdock nicht erreichbar oder ungültige Modellausgabe |
