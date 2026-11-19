# Robert · KI und API

Setze `POST /api/chat` in `src/app/api/chat/` und die Langdock-Anbindung in `src/lib/server/` um. Verwende die serverseitige Langdock-Konfiguration mit dem bereits geprüften Modell `gpt-5.1`.

- Stimme in den ersten zehn Minuten mit Jakob und Rafael die Profilfelder ab. Stelle Beispielanfragen und -antworten für die Aktionen `message` und `selectProgramme` früh auf `main` bereit.
- Die Route verarbeitet Nachricht, Gesprächsverlauf, Projektprofil und gegebenenfalls die ausgewählte Programm-ID. Sie liefert `reply`, `profile` und bei einer neuen Suche `matches`. Prüfe Änderungen am Profil mit Zod.
- Binde Rafaels Förderprüfung an. Lade nach der Programmauswahl den passenden Katalogeintrag, damit der Chat freie Fragen zu Voraussetzungen und Unterlagen beantworten kann.

**Abnahme:** Eine frei formulierte Projektbeschreibung löst eine gezielte Rückfrage aus. Nach der Programmauswahl beantwortet der Chat eine freie Frage nach den Unterlagen aus dem Katalog. Prüfe und pushe den kleinsten funktionierenden Stand vor dem ersten gemeinsamen Check-in nach 50 Minuten.
