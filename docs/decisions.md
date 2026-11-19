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
