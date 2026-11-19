# Technical decisions

Record only decisions that help teammates understand the implementation. Copy the template below for each decision; replace placeholders when an actual decision is made.

## YYYY-MM-DD — Short decision title

- **Decision:** TBD — what we chose.
- **Reason:** TBD — why it fits the challenge and our time constraints.
- **Alternatives:** TBD — what else we considered and why we did not choose it.

## 2026-11-19 — Förderprüfung über das Sprachmodell

- **Decision:** `POST /api/chat` lässt Profil-Extraktion, Treffer mit Status, Rückfrage und Antragscheckliste vollständig vom Modell (`gpt-5.1` über Langdock Responses API, strukturierte Ausgabe) erzeugen. Das Modell erhält den ganzen JSON-Katalog im Prompt. Der Server prüft Anfrage, Profil und Ausgabe mit Zod und verwirft unbekannte Programm-IDs. Es gibt keine regelbasierte Förderprüfung in `src/lib/funding/`.
- **Reason:** Schnellster Weg zum durchgängigen Demo-Ablauf. Der Katalog (24 Programme, ca. 50 KB) passt in den Kontext, und viele Bedingungen liegen nur als Freitext vor.
- **Alternatives:** Deterministische Regeln pro Programm wie im Mockup von Rafael. Zurückgestellt, weil die Bedingungen erst strukturiert werden müssten. Nachteil der Entscheidung: Bewertungen sind nicht vollständig reproduzierbar, und ohne KI gibt es keine Bewertung. Als Ersatzweg liefert die Route dann HTTP 503 mit einer Störungsmeldung für den Chat und allen Katalogeinträgen zur Anzeige.

## 2026-11-19 — Programmseiten über eine Scraper-Datenbank, live gelesen

- **Decision:** `scripts/scrape-sources.mjs` speichert Abrufe und Extraktionsvorschläge in `data/database.sqlite`. Die Datei liegt im Repository, damit das Team denselben Stand und dieselben Prüfentscheidungen teilt. Die App liest sie zur Laufzeit read-only (`src/lib/server/scraper-db.ts`, Cache eine Minute): Prüfstand für jede Programmkarte, und nur von einem Menschen freigegebene Extraktionen mit wörtlich belegten Zitaten gehen in die Suche ein. Sie können ein Programm schließen, aber nie öffnen. Fehlt die Datei, gilt nur der Katalog.
- **Reason:** Aktualität sichtbar machen, ohne ungeprüfte KI-Extraktionen in die Förderprüfung zu lassen. Live lesen statt in den Katalog übernehmen spart einen weiteren Importschritt.
- **Alternatives:** Freigegebene Angaben per Skript in `foerderprogramme.json` übernehmen. Robuster für ein Hosting ohne Dateizugriff, aber ein zusätzlicher manueller Schritt. Nachteil der Entscheidung: Die Binärdatei lässt sich nicht zusammenführen, und beim Hosting muss sie mit ausgeliefert werden.

## 2026-11-19 — Antragsinterview ohne Modell

- **Decision:** Die Fragen nach „Antrag erfassen“ und ihre Formatprüfung liegen fest im Server (`src/lib/server/application.ts`). Das Modell beantwortet nur Zwischenfragen, die mit „?“ enden.
- **Reason:** Antragsangaben müssen vollständig und im richtigen Format vorliegen. Feste Fragen aus dem ESF-Antragsvordruck sind reproduzierbar und kosten keine Tokens.
- **Alternatives:** Freies Interview durch das Modell. Verworfen, weil Vollständigkeit und Formate nicht verlässlich wären.
