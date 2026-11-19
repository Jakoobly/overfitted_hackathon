"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  emptyProfile,
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_TEXT,
  matchStatusLabel,
  profileSchema,
  type ApplicationState,
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

const requestError = "Der Förderfinder ist gerade nicht erreichbar. Bitte versuchen Sie es erneut.";
const recheckMessage = "Bitte prüfen Sie die Förderprogramme mit den aktualisierten Projekteckdaten erneut.";
const states = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
  "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz",
  "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];
const budgetFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const startFormat = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

const fristLabel: Record<string, string> = {
  laufend: "Laufende Antragstellung",
  kein_aufruf: "Derzeit kein Aufruf",
  unbekannt: "Frist bei der Förderstelle prüfen",
};

function formatFrist({ status, datum }: CatalogEntry["frist"]) {
  if (status === "datum" && datum) return `Frist: ${new Date(`${datum}T00:00:00`).toLocaleDateString("de-DE")}`;
  return fristLabel[status] ?? fristLabel.unbekannt;
}

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

/** „Programmseite geprüft am …“ aus der Scraper-Datenbank, leer ohne Datenbank. */
function SeitenstandHint({ stand }: { stand: Match["seitenstand"] }) {
  if (!stand) return null;
  return (
    <p className="programme-freshness">
      Programmseite geprüft am {dayFormat.format(new Date(stand.geprueftAm))}
      {stand.geaendertAm && <> · <strong>geändert am {dayFormat.format(new Date(stand.geaendertAm))}</strong></>}
    </p>
  );
}

export function FundingWorkspace() {
  const [messages, setMessages] = useState<HistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [profile, setProfile] = useState<Profile>();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<ChatResponse["selectedProgramme"]>();
  /** Laufendes Antragsinterview, null = keins. */
  const [application, setApplication] = useState<ApplicationState | null>(null);
  const [pendingTurn, setPendingTurn] = useState<{ message: HistoryEntry; recheck: boolean } | null>(null);
  const [error, setError] = useState("");
  /** Katalog ohne Bewertung, solange die KI-Anbindung gestört ist. */
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const editProfileButton = useRef<HTMLButtonElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const pending = pendingTurn !== null;
  const visibleMessages = [greeting, ...messages];
  if (pendingTurn) visibleMessages.push(pendingTurn.message);

  useEffect(() => {
    const log = conversation.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pendingTurn]);

  useEffect(() => {
    if (editingProfile) projectInput.current?.focus();
  }, [editingProfile]);

  async function runTurn(request: ChatRequest, userText: string, recheck?: Profile) {
    if (pending) return false;
    const userMessage: HistoryEntry = { role: "user", text: userText };
    setPendingTurn({ message: userMessage, recheck: Boolean(recheck) });
    setError("");
    const showError = recheck ? setProfileError : setError;
    if (!recheck) input.current?.focus();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          history: messages.slice(-MAX_HISTORY_ENTRIES).map((m) => ({ ...m, text: m.text.slice(0, MAX_HISTORY_TEXT) })),
          profile: recheck ?? profile,
        } satisfies ChatRequest),
      });
      const data: ChatResponse | ChatUnavailable | ChatError = await response.json();
      if (!recheck && "code" in data && data.code === "KI_NICHT_ERREICHBAR") {
        setMessages((current) => [
          ...current,
          userMessage,
          { role: "assistant", text: data.reply },
        ]);
        setCatalog(data.catalog);
        return true;
      }
      if ("error" in data) {
        showError(data.error);
        return false;
      }
      if (!response.ok) {
        showError(requestError);
        return false;
      }
      if (recheck && !Array.isArray(data.matches)) {
        showError("Es liegt keine neue Bewertung vor. Bitte versuchen Sie es erneut.");
        return false;
      }

      setMessages((current) => [
        ...current,
        userMessage,
        { role: "assistant", text: data.reply },
      ]);
      setProfile(recheck ?? data.profile);
      setCatalog(null);
      if (data.application !== undefined) setApplication(data.application);
      else if (recheck || data.selectedProgramme) setApplication(null);
      if (data.matches !== undefined) setMatches(data.matches);
      if (recheck) setSelectedProgramme(undefined);
      else if (data.selectedProgramme) setSelectedProgramme(data.selectedProgramme);
      return true;
    } catch {
      showError(requestError);
      return false;
    } finally {
      setPendingTurn(null);
    }
  }

  function closeProfileForm() {
    setEditingProfile(false);
    requestAnimationFrame(() => editProfileButton.current?.focus());
  }

  async function recheckProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProfileError("");
    const fields = new FormData(event.currentTarget);
    const current = profile ?? emptyProfile();
    const budget = String(fields.get("budget")).trim();
    const start = String(fields.get("start")).trim() || null;
    const targetGroups = String(fields.get("zielgruppen"));
    const updated = profileSchema.safeParse({
      ...current,
      vorhaben: String(fields.get("vorhaben")).trim(),
      zielgruppen: targetGroups === current.zielgruppen.join(", ")
        ? current.zielgruppen
        : targetGroups.split(",").map((group) => group.trim()).filter(Boolean),
      bundesland: fields.get("bundesland") || null,
      budget: budget ? Number(budget) : null,
      start,
      startOffen: start === null && current.startOffen,
    });
    if (!updated.success) {
      setProfileError("Bitte prüfen Sie die eingegebenen Projekteckdaten.");
      return;
    }
    const state = updated.data.bundesland;
    const userText = state && states.includes(state)
      ? `Das Bundesland des Vorhabens ist ${state}. ${recheckMessage}`
      : recheckMessage;
    const checked = await runTurn({
      action: "message",
      message: `${userText} Verwenden Sie das mitgesendete Profil als verbindliche Grundlage, auch bei offenen Angaben oder Widersprüchen zum bisherigen Chatverlauf. Berücksichtigen Sie die regionalen Fördervoraussetzungen aus dem Katalog. Führen Sie eine neue Suche durch (neueSuche = true).`,
      selectedProgrammeId: null,
    }, userText, updated.data);
    if (checked) closeProfileForm();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    const sent = await runTurn({
      action: "message",
      message: text,
      selectedProgrammeId: selectedProgramme?.id ?? null,
      application,
    }, text);
    if (!sent) setDraft(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!event.repeat && !pending && draft.trim()) event.currentTarget.form?.requestSubmit();
  }

  /** Vorgefertigter Prompt: startet die Antragserfassung für das ausgewählte Programm. */
  function startApplication() {
    if (!selectedProgramme || pending) return;
    void runTurn({ action: "startApplication", programmeId: selectedProgramme.id }, "Antrag erfassen");
  }

  /** Vorgefertigte Antwort während der Erfassung, z. B. „überspringen“. */
  function sendQuickReply(event: MouseEvent<HTMLButtonElement>) {
    const text = event.currentTarget.dataset.reply;
    if (!text || !application || pending) return;
    void runTurn({ action: "message", message: text, selectedProgrammeId: selectedProgramme?.id ?? null, application }, text);
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
          </header>
          {selectedProgramme && (
            <div className="chat-context">
              <p>Im Chat ausgewählt <strong>{selectedProgramme.titel}</strong></p>
              {application && (
                <p className="application-progress" role="status">
                  Antrag erfassen: Frage {Math.min(application.schritt + 1, application.gesamt)} von {application.gesamt}
                </p>
              )}
            </div>
          )}
          <div className="conversation" ref={conversation} role="log" aria-label="Chatverlauf">
            {visibleMessages.map(({ role, text }, index) => (
              <div className={`message message--${role}`} key={index}>
                <p className="speaker">{role === "assistant" ? "Förderfinder" : "Sie"}</p>
                <p className="bubble">{text}</p>
              </div>
            ))}
            {pending && !pendingTurn.recheck && <p className="match-summary" role="status">Der Förderfinder antwortet …</p>}
          </div>
          {error && <p className="chat-error" role="alert">{error}</p>}
          {selectedProgramme && (
            <div className="quick-replies" aria-label="Vorschläge">
              {application ? (
                ["Überspringen", "Zurück", "Abbrechen"].map((label) => (
                  <button className="quick-reply" type="button" key={label} data-reply={label} disabled={pending} onClick={sendQuickReply}>
                    {label}
                  </button>
                ))
              ) : (
                <button className="quick-reply quick-reply--primary" type="button" disabled={pending} onClick={startApplication}>
                  Antrag erfassen
                </button>
              )}
            </div>
          )}
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
              placeholder={application ? "Ihre Antwort … (oder eine Frage mit „?“)" : selectedProgramme ? "Zum ausgewählten Förderprogramm fragen …" : "Beschreiben Sie Ihre Projektidee …"}
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
          <section className="project-details" aria-labelledby="project-details-title">
            <div className="project-details-heading">
              <h3 id="project-details-title">Projekteckdaten</h3>
              {!editingProfile && (
                <button
                  className="edit-button"
                  type="button"
                  ref={editProfileButton}
                  disabled={pending}
                  onClick={() => {
                    setProfileError("");
                    setEditingProfile(true);
                  }}
                >
                  Bearbeiten
                </button>
              )}
            </div>
            {editingProfile ? (
              <form onSubmit={recheckProfile}>
                <fieldset className="project-details-grid" disabled={pending}>
                  <label className="project-details-wide">
                    Vorhaben
                    <input name="vorhaben" ref={projectInput} defaultValue={profile?.vorhaben} />
                  </label>
                  <div className="project-details-wide">
                    <label>
                      Zielgruppe
                      <input name="zielgruppen" defaultValue={profile?.zielgruppen.join(", ")} aria-describedby="target-group-hint" />
                    </label>
                    <span id="target-group-hint">Mehrere Zielgruppen mit Komma trennen.</span>
                  </div>
                  <label>
                    Bundesland
                    <select name="bundesland" defaultValue={profile?.bundesland ?? ""}>
                      <option value="">Noch offen</option>
                      {profile?.bundesland && !states.includes(profile.bundesland) && (
                        <option value={profile.bundesland}>{profile.bundesland}</option>
                      )}
                      {states.map((state) => <option key={state}>{state}</option>)}
                    </select>
                  </label>
                  <label>
                    Budget in Euro
                    <input name="budget" type="number" min="0" step="any" defaultValue={profile?.budget ?? ""} />
                  </label>
                  <label>
                    Projektstart
                    <input name="start" type="month" placeholder="JJJJ-MM" min={new Date().toISOString().slice(0, 7)} defaultValue={profile?.start ?? ""} />
                  </label>
                </fieldset>
                {profileError && <p className="chat-error profile-error" role="alert">{profileError}</p>}
                {pendingTurn?.recheck && <p className="match-summary" role="status">Förderprogramme werden erneut geprüft …</p>}
                <div className="project-details-actions">
                  <button className="send-button" type="submit" disabled={pending}>Erneut prüfen</button>
                  <button className="programme-action" type="button" disabled={pending} onClick={closeProfileForm}>
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <dl className="project-details-grid">
                <div className="project-details-wide">
                  <dt>Vorhaben</dt>
                  <dd>{profile?.vorhaben.trim() || "Noch offen"}</dd>
                </div>
                <div className="project-details-wide">
                  <dt>Zielgruppe</dt>
                  <dd>{profile?.zielgruppen.filter((group) => group.trim()).join(", ") || "Noch offen"}</dd>
                </div>
                <div>
                  <dt>Bundesland</dt>
                  <dd>{profile?.bundesland?.trim() || "Noch offen"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{profile?.budget != null ? budgetFormat.format(profile.budget) : "Noch offen"}</dd>
                </div>
                <div>
                  <dt>Projektstart</dt>
                  <dd>{profile?.start ? startFormat.format(new Date(`${profile.start}-01T00:00:00Z`)) : "Noch offen"}</dd>
                </div>
              </dl>
            )}
          </section>
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
                    <SeitenstandHint stand={entry.seitenstand} />
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
                      <SeitenstandHint stand={match.seitenstand} />
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
