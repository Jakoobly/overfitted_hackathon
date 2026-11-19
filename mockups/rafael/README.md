# Mockup: vhs-Förderfinder

Klickbarer Frontend-Entwurf in reinem HTML, CSS und JavaScript, ohne Build und ohne Abhängigkeiten. Grundlage ist die Spezifikation in [`docs/vhs-foerderfinder.md`](../../docs/vhs-foerderfinder.md).

## Starten

`index.html` im Browser öffnen, zum Beispiel per Doppelklick oder mit `python3 -m http.server` in diesem Ordner.

## Inhalt

| Datei | Zweck |
| --- | --- |
| `index.html` | Seitenaufbau: Chat oder Formular, erkannte Eckdaten, Ergebniskarten |
| `styles.css` | Gestaltung nach DVV-Styleguide: vhs Blau `#002855`, vhs Gelb `#FAB90F`, Arial. Das Logo ist ein Platzhalter. |
| `app.js` | Simulierte KI-Extraktion über Schlüsselwörter, Rückfragen, Förderprüfung und Darstellung |
| `catalog.js` | 24 Programme aus den Dokumenten in `raw/`. Die Felder `themen`, `zielgruppen` und `regeln` wurden für das Mockup manuell strukturiert. |

## Demo-Ablauf

1. Beispiel „Digitale Grundbildung (BW)“ wählen. Der Chat fragt nach dem Projektbeginn.
2. „März 2027“ wählen. ESF Plus BW wird „Ähnlich“ und schlägt einen Start im September 2027 vor.
3. Die Anpassung übernehmen. Das Programm wird „Passend nach Datenlage“.
4. Unter „Bearbeiten“ als Standort Bayern setzen. Die Landesprogramme aus Baden-Württemberg scheiden aus.
5. Der Formularmodus oben rechts zeigt den Ersatzweg für einen KI-Ausfall.

## Grenzen

- Die Extraktion arbeitet mit regulären Ausdrücken, nicht mit einer KI. Im Zielsystem übernimmt das `POST /api/chat`.
- Fristen stehen nur für wenige Programme im Katalog. Fehlende Fristen erscheinen als Hinweis „in der Quelle prüfen“.
- Den Zeitbedarf beim ESF-Frühjahrsaufruf (Start ab Juli 2027) nimmt das Mockup an. Er ist mit der Förderstelle abzustimmen.
