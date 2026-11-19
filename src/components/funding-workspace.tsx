"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Message = {
  role: "assistant" | "user";
  text: string;
};

const greeting: Message = {
  role: "assistant",
  text: "Was planen Sie? Beschreiben Sie kurz Ihre Projektidee, die Zielgruppe und den Standort Ihrer VHS.",
};

const exampleMessages: Message[] = [
  greeting,
  {
    role: "user",
    text: "Unsere VHS in Baden-Württemberg plant einen Kurs zur digitalen Grundbildung für Erwachsene. Wir möchten im September 2027 starten.",
  },
  {
    role: "assistant",
    text: "Im Beispielkatalog kommen zwei Programme infrage. Für „Lernorte digital“ müsste der Kurs im November starten.",
  },
];

const exampleProgrammes = [
  {
    id: "digital-im-alltag",
    title: "Digital im Alltag",
    status: "Passend nach Datenlage",
    kind: "fit",
    description: "Unterstützt Kurse zur digitalen Grundbildung für Erwachsene.",
  },
  {
    id: "lernorte-digital",
    title: "Lernorte digital",
    status: "Ähnlich",
    kind: "near",
    description: "Kommt infrage, wenn der Kurs ab November 2027 beginnt.",
  },
];

export function FundingWorkspace() {
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [draft, setDraft] = useState("");
  const [showExample, setShowExample] = useState(false);
  const conversation = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const log = conversation.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  function loadExample() {
    setShowExample(true);
    setMessages(exampleMessages);
    input.current?.focus();
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setDraft("");
    input.current?.focus();
  }

  return (
    <div className="workspace">
      <div className="wrap">
        <p className="preview-note">Vorschau mit fiktiven Förderdaten. Live-Antworten sind noch nicht verfügbar.</p>
        <div className="workspace-columns">
          <section className="panel chat" id="beratung" tabIndex={-1} aria-labelledby="chat-title">
            <header className="panel-header">
              <h2 id="chat-title">Ihr Projekt</h2>
              <button className="example-button" type="button" onClick={loadExample}>
                Beispiel laden
              </button>
            </header>
            <div className="conversation" ref={conversation} role="log" aria-label="Chatverlauf">
              {messages.map(({ role, text }, index) => (
                <div className={`message message--${role}`} key={index}>
                  <p className="speaker">{role === "assistant" ? "Förderfinder" : "Sie"}</p>
                  <p className="bubble">{text}</p>
                </div>
              ))}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <label className="visually-hidden" htmlFor="project-message">Ihre Nachricht</label>
              <textarea
                ref={input}
                id="project-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                placeholder="Beschreiben Sie Ihre Projektidee …"
                required
              />
              <button className="send-button" type="submit" disabled={!draft.trim()}>Senden</button>
            </form>
          </section>
          <section className="panel" aria-labelledby="matches-title">
            <header className="panel-header">
              <h2 id="matches-title">Förderprogramme</h2>
            </header>
            <div className="matches" aria-live="polite">
              {showExample ? (
                <>
                  <p className="match-summary">Zwei Treffer für das Beispielprojekt</p>
                  {exampleProgrammes.map(({ id, title, status, kind, description }) => (
                    <article className={`programme programme--${kind}`} key={id}>
                      <p className="programme-status">{status}</p>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </article>
                  ))}
                </>
              ) : (
                <p className="match-summary">Laden Sie das Beispiel, um die Trefferansicht kennenzulernen.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
