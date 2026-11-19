"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  matchStatusLabel,
  type ChatError,
  type ChatRequest,
  type CatalogEntry,
  type ChatResponse,
  type ChatUnavailable,
  type HistoryEntry,
  type Match,
  type Profile,
} from "@/lib/chat/contract";

const greeting: HistoryEntry = {
  role: "assistant",
  text: "Was planen Sie? Beschreiben Sie kurz Ihre Projektidee, die Zielgruppe und den Standort Ihrer VHS.",
};

const exampleMessage = "Unsere kleine VHS in Heilbronn ist ein eingetragener Verein und plant einen Kurs zur digitalen Grundbildung für Erwachsene. Das Budget beträgt rund 15.000 Euro.";
const requestError = "Der Förderfinder ist gerade nicht erreichbar. Bitte versuchen Sie es erneut.";

const fristLabel: Record<string, string> = {
  laufend: "Laufende Antragstellung",
  kein_aufruf: "Derzeit kein Aufruf",
  unbekannt: "Frist bei der Förderstelle prüfen",
};

function formatFrist({ status, datum }: CatalogEntry["frist"]) {
  if (status === "datum" && datum) return `Frist: ${new Date(`${datum}T00:00:00`).toLocaleDateString("de-DE")}`;
  return fristLabel[status] ?? fristLabel.unbekannt;
}

export function FundingWorkspace() {
  const [messages, setMessages] = useState<HistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [profile, setProfile] = useState<Profile>();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<ChatResponse["selectedProgramme"]>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  /** Katalog ohne Bewertung, solange die KI-Anbindung gestört ist. */
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const log = conversation.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  async function runTurn(request: ChatRequest, userText: string, restart = false) {
    if (pending) return false;
    setPending(true);
    setError("");
    input.current?.focus();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          history: restart ? [] : messages.slice(-60),
          profile: restart ? undefined : profile,
        } satisfies ChatRequest),
      });
      const data: ChatResponse | ChatUnavailable | ChatError = await response.json();
      if ("code" in data && data.code === "KI_NICHT_ERREICHBAR") {
        setMessages((current) => [
          ...(restart ? [] : current),
          { role: "user", text: userText },
          { role: "assistant", text: data.reply },
        ]);
        setCatalog(data.catalog);
        return true;
      }
      if ("error" in data) {
        setError(data.error);
        return false;
      }
      if (!response.ok) {
        setError(requestError);
        return false;
      }

      setMessages((current) => [
        ...(restart ? [] : current),
        { role: "user", text: userText },
        { role: "assistant", text: data.reply },
      ]);
      setProfile(data.profile);
      setCatalog(null);
      if (restart || data.matches !== undefined) setMatches(data.matches ?? null);
      if (restart || data.selectedProgramme) setSelectedProgramme(data.selectedProgramme);
      return true;
    } catch {
      setError(requestError);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function loadExample() {
    if (await runTurn({ action: "message", message: exampleMessage }, exampleMessage, true)) {
      setDraft("");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const sent = await runTurn({
      action: "message",
      message: text,
      selectedProgrammeId: selectedProgramme?.id ?? null,
    }, text);
    if (sent) setDraft("");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!event.repeat && !pending && draft.trim()) event.currentTarget.form?.requestSubmit();
  }

  function selectProgramme(match: Match) {
    if (selectedProgramme?.id === match.programmeId) {
      input.current?.focus();
      return;
    }
    void runTurn(
      { action: "selectProgramme", programmeId: match.programmeId },
      `Ich möchte den Antrag für „${match.titel}“ vorbereiten.`,
    );
  }

  return (
    <div className="workspace">
      <div className="wrap workspace-columns">
        <section className="panel chat" id="beratung" tabIndex={-1} aria-labelledby="chat-title">
          <header className="panel-header">
            <h2 id="chat-title">Ihr Projekt</h2>
            <button className="example-button" type="button" onClick={loadExample} disabled={pending}>
              Beispiel laden
            </button>
          </header>
          {selectedProgramme && (
            <p className="chat-context">Im Chat ausgewählt <strong>{selectedProgramme.titel}</strong></p>
          )}
          <div className="conversation" ref={conversation} role="log" aria-label="Chatverlauf">
            {[greeting, ...messages].map(({ role, text }, index) => (
              <div className={`message message--${role}`} key={index}>
                <p className="speaker">{role === "assistant" ? "Förderfinder" : "Sie"}</p>
                <p className="bubble">{text}</p>
              </div>
            ))}
            {pending && <p className="match-summary" role="status">Der Förderfinder antwortet …</p>}
          </div>
          {error && <p className="chat-error" role="alert">{error}</p>}
          <form className="composer" onSubmit={sendMessage}>
            <label className="visually-hidden" htmlFor="project-message">Ihre Nachricht</label>
            <textarea
              ref={input}
              id="project-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={4000}
              placeholder={selectedProgramme ? "Zum ausgewählten Förderprogramm fragen …" : "Beschreiben Sie Ihre Projektidee …"}
              readOnly={pending}
              required
            />
            <button className="send-button" type="submit" disabled={pending || !draft.trim()}>Senden</button>
          </form>
        </section>
        <section className="panel" aria-labelledby="matches-title">
          <header className="panel-header">
            <h2 id="matches-title">Förderprogramme</h2>
          </header>
          <div className="matches" aria-live="polite">
            {catalog ? (
              <>
                <p className="match-summary catalog-notice" role="status">
                  Die KI-Bewertung ist gerade nicht verfügbar. Hier sehen Sie alle {catalog.length} Programme aus dem Katalog, ohne Prüfung Ihres Projekts.
                </p>
                {catalog.map((entry) => (
                  <article className="programme programme--katalog" key={entry.id}>
                    <p className="programme-status">
                      {[entry.ebene, entry.foerdergebiet].filter(Boolean).join(" · ") || "Förderprogramm"}
                    </p>
                    <h3>{entry.titel}</h3>
                    {entry.kurzbeschreibung && (
                      <details className="programme-details">
                        <summary>Beschreibung</summary>
                        <p>{entry.kurzbeschreibung}</p>
                      </details>
                    )}
                    <div className="programme-actions">
                      <span className="programme-description">{formatFrist(entry.frist)}</span>
                      {entry.url && /^https?:\/\//i.test(entry.url) && (
                        <a href={entry.url} target="_blank" rel="noreferrer">Programmseite ↗</a>
                      )}
                    </div>
                  </article>
                ))}
              </>
            ) : (
              <>
                {matches === null && <p className="match-summary">Beschreiben Sie Ihr Projekt, um Förderprogramme zu finden.</p>}
                {matches?.length === 0 && <p className="match-summary">Für dieses Projekt wurden keine passenden Programme gefunden.</p>}
                {matches && matches.length > 0 && <p className="match-summary">Fördervoraussetzungen bitte bei der Förderstelle bestätigen.</p>}
                {matches?.map((match) => {
                  const isSelected = selectedProgramme?.id === match.programmeId;
                  const titleId = `programme-${match.programmeId}`;
                  return (
                    <article className={`programme programme--${match.status}`} key={match.programmeId}>
                      <p className="programme-status">{matchStatusLabel[match.status]}</p>
                      <h3 id={titleId}>{match.titel}</h3>
                      <p className="programme-description">{match.begruendung}</p>
                      {match.anpassung && (
                        <p className="programme-description"><strong>Mögliche Anpassung:</strong> {match.anpassung}</p>
                      )}
                      {match.offenePunkte.length > 0 && (
                        <details className="programme-details">
                          <summary>Offene Punkte</summary>
                          <ul>{match.offenePunkte.map((point, index) => <li key={index}>{point}</li>)}</ul>
                        </details>
                      )}
                      <div className="programme-actions">
                        <button
                          className="programme-action"
                          type="button"
                          aria-describedby={titleId}
                          aria-current={isSelected || undefined}
                          disabled={pending}
                          onClick={() => selectProgramme(match)}
                        >
                          {isSelected ? "Im Chat ausgewählt" : "Antrag vorbereiten"}
                        </button>
                        {match.url && /^https?:\/\//i.test(match.url) && (
                          <a href={match.url} target="_blank" rel="noreferrer">Programmseite ↗</a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
