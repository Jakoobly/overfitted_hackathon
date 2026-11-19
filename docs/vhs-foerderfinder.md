# VHS-Förderfinder – Hackathon-Spezifikation

**Stand:** 19. November 2026 · **Status:** Vorschlag für Team und Praxispartner

## Ziel

Mitarbeitende einer Volkshochschule (VHS) beschreiben ihre Projektidee im Chat und erhalten passende oder ähnliche Förderprogramme aus dem bereitgestellten Katalog. Sie wählen einen Treffer aus, um den Antrag vorzubereiten. Der Chatbot erklärt dafür, welche Voraussetzungen gelten, welche Unterlagen sie brauchen und was sie als Nächstes tun können. Liegt ein ähnliches Programm knapp außerhalb der Projektplanung, zeigt die Anwendung, welche kleine Änderung helfen könnte.

Die Anwendung berücksichtigt Unterschiede zwischen VHS über konkrete Eckdaten wie Standort, Trägerform, verfügbare Eigenmittel und vorhandene Partner. Die Angabe klein, mittel oder groß kann den Kontext ergänzen. Sie beeinflusst die Förderfähigkeit nur, wenn das Programm dafür ein ausdrücklich dokumentiertes Kriterium nennt.

## Ablauf im MVP

1. **Förderfinder starten und Projekt beschreiben.** Der Button „Förderfinder starten“ auf `vhs-bw.de` führt direkt zur deutschsprachigen Web-App. Dort gibt die VHS ihr Vorhaben im Chat ein, etwa mit Zielgruppe, Standort, Budget und geplantem Start.
2. **Eckdaten klären.** Der Chat zeigt die erkannten Angaben zur Kontrolle. Fehlt eine Angabe, die das Ergebnis beeinflusst, stellt er eine gezielte Rückfrage. Die VHS kann Angaben in der Eckdaten-Ansicht korrigieren oder ergänzen und die Suche erneut ausführen.
3. **Förderprogramme vergleichen.** Die App zeigt bis zu drei Ergebnisse mit Titel, Fördergeber, Begründung, offenen oder abweichenden Bedingungen, Frist und Quelle, soweit im Katalog vorhanden.
4. **Projektanpassung prüfen.** Bei einem ähnlichen Programm zeigt die App, welche planbare Änderung helfen könnte, etwa einen späteren Projektbeginn. Die VHS entscheidet, ob sie die Änderung übernimmt. Danach kann sie das Projekt erneut prüfen.
5. **Förderprogramm auswählen.** Über „Antrag vorbereiten“ auf einer Trefferkarte wählt die VHS das Programm aus, das sie weiterverfolgen möchte. Der Chat nennt das ausgewählte Programm und führt die Unterhaltung dazu weiter.
6. **Antragscheckliste im Chat erhalten.** Der Chatbot erklärt die Voraussetzungen, die benötigten Unterlagen, die bekannte Antragsfrist und den nächsten konkreten Schritt. Er zeigt, welche Voraussetzungen das bestätigte Projektprofil bereits erfüllt und welche Punkte noch zu klären sind. Die VHS kann Rückfragen stellen oder in der Trefferliste ein anderes Programm auswählen. Der Chat verlinkt die offizielle Programm- oder Antragsseite, soweit bekannt. Fehlende Angaben kennzeichnet er als „bei der Förderstelle prüfen“.

Der MVP ist ein KI-Chat mit vorbereitetem Förderkatalog. Die VHS kann während der Suche und nach der Programmauswahl jederzeit frei schreiben. Der Bot bezieht seine Antworten auf die laufende Unterhaltung. Live-Recherche, Nutzerkonten, dauerhaft gespeicherte Verläufe, Antragserstellung und Antragseinreichung kommen für den Hackathon in den späteren Umfang.

Beim Wechsel von `vhs-bw.de` zum Förderfinder sollen Besucherinnen und Besucher das VHS-Angebot wiedererkennen. Der [DVV-Styleguide](DVV_Styleguide_M%C3%A4rz%202023.pdf) und die Verbandswebsite sind die Referenz für Logo, Farbpalette, Typografie, Kopfbereich und Bedienelemente. Das gilt auch für Chat und Ergebniskarten. Die App bietet einen sichtbaren Link zurück zur Verbandswebsite.

## Excel-Import und Datenmodell

Die Excel-Datei und die ergänzenden Programmdokumente liegen unter `raw/`. Der Import liest das vereinbarte Excel-Blatt, prüft Pflichtfelder und doppelte IDs, normalisiert Datums- und Zahlenwerte und meldet fehlerhafte Zeilen mit Zeilennummer. Für die Demo-Kandidaten können Angaben zum Antrag aus den Programmdokumenten mit Quellenverweis ergänzt werden. Der Demo-Server liest den erzeugten JSON-Katalog. Für Entwicklung und Demo lässt sich auch ein klar gekennzeichneter, fiktiver Katalog mit demselben Schema verwenden. Weitere Originaldaten und Ableitungen kommen nur bei entsprechender Freigabe ins Repository.

| Feldgruppe | Vorgeschlagenes Zielschema |
| --- | --- |
| Identität | Stabile Programm-ID, Titel und Fördergeber. ID und Titel sind Pflichtfelder. |
| Fachlicher Bezug | Kurzbeschreibung, Themen und Zielgruppen |
| Förderbedingungen | Fördergebiet, antragsberechtigte Träger, belegte Größenkriterien, Förderbetrag oder Förderquote, erforderliche Eigenmittel und Partnerschaften |
| Termine | Antragsfrist und Bedingungen zum Projektbeginn |
| Antrag und Herkunft | Offizielle Programm- oder Antrags-URL, genannte Unterlagen und Antragsschritte, Datenstand und Fundstelle aus Excel oder Programmdokument |

Leere oder mehrdeutige Angaben bleiben unbekannt. Der Import unterscheidet ausdrücklich dokumentierte Fälle wie eine laufende Ausschreibung von einem fehlenden Fristwert. Bedingungen, die zunächst nur als Freitext vorliegen, werden bei Bedarf manuell für die Demo-Kandidaten strukturiert und mit der Excel-Zeile belegt.

## Matching und Rolle der KI

- **KI für den laufenden Dialog.** Ein schlanker Server-Wrapper ruft das Sprachmodell für freie Chatnachrichten auf. Das Modell ordnet die Nachricht im bisherigen Gespräch ein und extrahiert Änderungen am Projektprofil mit Thema, Zielgruppe, Region, Trägerform, Budget, Eigenmitteln, ggf. Partnern und Projektbeginn. Die Ausgabe folgt einem Schema und wird serverseitig geprüft. Fehlende Angaben bleiben unbekannt. Eine Korrektur der VHS hat Vorrang.
- **Code für die Förderprüfung.** Für den kleinen Demo-Katalog prüft der Server strukturierte Bedingungen pro Programm und sortiert nach Themen- und Zielgruppenbezug. Standort, Trägerform, Fristen und weitere belegte Voraussetzungen können einen Treffer ausschließen. Jedes geprüfte Kriterium ist erfüllt, offen oder abweichend.
- **Verständliche Ergebnisse.** *Passend nach Datenlage* setzt fachlichen Bezug und erfüllte erfasste Pflichtbedingungen voraus. *Noch zu prüfen* kennzeichnet fachlich passende Programme mit offenen Pflichtbedingungen und ohne bekannte Abweichung. *Ähnlich* kommt bei einer dokumentierten, realistisch veränderbaren Projektbedingung infrage. Die Anwendung nennt die nötige Anpassung und alle übrigen offenen Punkte. Ein ungeeigneter Träger, eine falsche Förderregion oder eine abgelaufene Antragsfrist scheiden für das laufende Programm aus. Bei null Treffern zeigt die Anwendung die wesentlichen Gründe und, falls sinnvoll, eine Rückfrage.
- **Antworten auf Basis der Förderprüfung und des Katalogs.** Das Modell formuliert eine Antwort oder gezielte Rückfrage anhand der geprüften Ergebnisse. Nach der Programmauswahl erhält es für freie Rückfragen zusätzlich den serverseitig geladenen Katalogeintrag des ausgewählten Programms. Fristen, Unterlagen, Beträge und URLs stammen aus dem Katalog. Bei fehlenden Angaben verweist der Chat an die Förderstelle. Die erste Checkliste kann direkt aus den belegten Katalogdaten erzeugt werden.
- **Ersatzweg bei KI-Ausfall.** Die VHS kann die Eckdaten auch ohne KI direkt in der Eckdaten-Ansicht eintragen, über dieselbe Bearbeitung, mit der sie erkannte Angaben korrigiert. Die Angaben durchlaufen dieselbe Förderprüfung. Einen separaten Formularmodus gibt es nicht.

## Technikvorschlag

| Baustein | Empfehlung für den Hackathon |
| --- | --- |
| Web-App und Backend | **Next.js mit React und TypeScript**. Chat und Ergebniskarten nutzen dieselben Typen wie die serverseitige Route `POST /api/chat`. So genügt ein Projekt für Oberfläche und API. [Installation](https://nextjs.org/docs/app/getting-started/installation) · [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) |
| Excel | **SheetJS CE** in einem lokalen Node-Skript. Die Laufzeit verwendet den validierten JSON-Katalog. [Installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) · [Excel-Daten lesen](https://docs.sheetjs.com/docs/solutions/output/) |
| KI | **Langdock Completion API** über den OpenAI-kompatiblen Responses-Endpunkt für freie Chatnachrichten und Antworten mit Katalogbezug. Das OpenAI SDK verwendet serverseitig den Langdock-Schlüssel und die Langdock-Basis-URL. Das im VHS-Workspace verfügbare Modell muss das strukturierte Ausgabeformat für Änderungen am Projektprofil unterstützen. Für die Demo verwenden wir fiktive Projekteingaben. [Langdock Responses API](https://docs.langdock.com/en/developer/completion-api/openai-responses) |
| Förderprüfung | **TypeScript-Funktionen über JSON**. Für den vorbereiteten Katalog genügen einfache Regeln und sortierbare Themenmerkmale. |
| Demo und Einbindung | **Vercel als Hosting-Option** mit eigener HTTPS-URL und serverseitigen Umgebungsvariablen. Der WordPress-Button auf `vhs-bw.de` verlinkt auf diese URL. Lokal läuft die Demo ebenfalls. [Deployment](https://nextjs.org/docs/app/getting-started/deploying) · [Umgebungsvariablen](https://vercel.com/docs/environment-variables) |

**Chatschnittstelle.** Bei jeder freien Nachricht erhält `POST /api/chat` die Nachricht, den bisherigen Gesprächskontext, das bestätigte Projektprofil und gegebenenfalls die ausgewählte Programm-ID. Die Route liefert eine Chatantwort, das aktualisierte Profil und bei einer neuen Förderprüfung die Trefferliste. Jeder Treffer hat eine Programm-ID, einen Status, Gründe, offene Bedingungen sowie gegebenenfalls eine Projektanpassung. Bei „Antrag vorbereiten“ sendet die Oberfläche die gewählte Programm-ID und das Profil an dieselbe Route. Der Server prüft die ID im Katalog und liefert die Checkliste als Chatantwort. Der Browser hält Verlauf, Profil und Programmauswahl für die laufende Sitzung. Nach einem Programmwechsel beziehen sich neue Antworten auf die aktuelle Auswahl.

**Langdock-Anbindung.** Für die Standard-EU-Cloud setzt der Server die SDK-Basis-URL auf `https://api.langdock.com/openai/eu/v1`. Mit einem Workspace-Schlüssel mit Completion-API-Berechtigung lassen sich nach Erhalt über `GET /openai/eu/v1/models` die verfügbaren Modell-IDs abrufen. Der Server übergibt den benötigten Gesprächskontext bei jedem Modellaufruf und setzt `store: false`. Ausgewähltes Modell und strukturierte Ausgabe werden beim ersten Live-Aufruf mit einer fiktiven Projekteingabe geprüft. [Langdock Responses API](https://docs.langdock.com/en/developer/completion-api/openai-responses)

## Demo und Abnahme

Fiktives Szenario für die Vorbereitung. Eine kleine VHS in Baden-Württemberg plant einen Kurs zur digitalen Grundbildung für Erwachsene. Der Chat fragt nach dem geplanten Start, wenn dieser für einen Treffer ausschlaggebend ist. Der Katalog liefert einen passenden Treffer und ein ähnliches Programm, dessen dokumentierte Startbedingung mit einem späteren Termin erfüllt werden könnte. Ein Programm mit unpassender Förderregion fällt heraus. Die VHS wählt den passenden Treffer aus und erhält im Chat die Checkliste für dieses Programm. Für die Demo wählen wir ein belegbares Beispiel aus den Praxispartnerdaten oder kennzeichnen das Szenario als fiktiv.

- Der Demo-Dialog funktioniert mit frei formulierten Nachrichten. Die VHS beschreibt ihr Projekt, beantwortet eine gezielte Rückfrage, wählt einen Treffer und fragt danach im selben Chat etwa „Welche Unterlagen fehlen uns für den Antrag?“. Eine frei formulierte Korrektur verändert die Bewertung, wenn sie ein Förderkriterium betrifft.
- Fehlende Pflichtangaben und eindeutige Ausschlüsse führen zu den vorgesehenen Ergebnissen. Der Chat kann auch einen leeren Ergebnissatz verständlich anzeigen.
- Die ausgegebenen Konditionen der Treffer stimmen mit dem Demo-Katalog überein. Nach „Antrag vorbereiten“ nennt der Chat das gewählte Programm, zeigt die belegten Voraussetzungen, Unterlagen und Fristen und nennt mindestens einen nächsten Schritt. Fehlende Angaben und die verfügbare Quelle sind erkennbar.
- Bei einem Programmwechsel beziehen sich die neue Checkliste und weitere Chatantworten auf die neue Auswahl.
- Der Kernablauf lässt sich lokal mit vorbereitetem Katalog und bei KI-Ausfall über die direkte Eingabe in der Eckdaten-Ansicht vorführen.
- Für die Website-Übergabe wird auf einer WordPress-Testseite geprüft, dass der Button den Förderfinder direkt öffnet, die App zur VHS-Gestaltung passt und der Rücklink funktioniert. Die Prüfung umfasst Desktop und Handy.

## Aufteilung im Dreierteam

| Verantwortliche Rolle | Erste Arbeitseinheit, ca. 45 Min. | Nächste Arbeitseinheit, ca. 45 Min. |
| --- | --- | --- |
| Oberfläche und Integration | Chat und Ergebniskarten mit Beispielantwort | API und Programmauswahl anbinden, Checkliste im Chat anzeigen |
| Kernlogik und Daten | Katalogschema, kleiner Beispieldatensatz und Förderprüfung | Excel-Spalten zuordnen, KI-Extraktion und Checkliste aus Katalogdaten integrieren |
| Praxispartner und Demo | Excel-Felder, Nutzungsfreigabe und erwartete Beispieltreffer klären | Demo und Abnahme prüfen, Übergabe mit der Anwendung abgleichen |

Vor dem ersten parallelen Arbeitsblock stimmen die drei Rollen Projektprofil, Trefferstatus und API-Antwort ab. [Hackathon-Zeitplan](hackathon-zeitplan.md)

## Einbindung in vhs-bw.de

Die Website `vhs-bw.de` läuft laut Projektabstimmung auf WordPress/PHP. Der Förderfinder wird als eigenständige Next.js-App über HTTPS bereitgestellt. Oberfläche, API und KI-Aufrufe laufen auf dem Hosting der App.

- **Standard für Demo und späteren Betrieb.** Die VHS-Redaktion setzt „Förderfinder starten“ als verlinkten Button im bestehenden WordPress-Seiteneditor. Empfohlen ist, direkt zur Chat-Ansicht im selben Tab zu navigieren. Ein normaler HTTPS-Link funktioniert auch in einem anderen WordPress-Seiteneditor als dem Blockeditor. [WordPress-Dokumentation zum Button-Block](https://wordpress.org/documentation/article/buttons-block/)
- **Option für die dauerhafte Adresse.** Die VHS kann eine eigene Subdomain wie `foerderfinder.vhs-bw.de` mit dem App-Hosting verbinden. Dafür braucht die zuständige IT Zugriff auf die DNS-Verwaltung und richtet die HTTPS-Adresse beim Hosting ein. Die Subdomain ist ein Vorschlag und noch nicht eingerichtet.
- **Option für einen Chat innerhalb der WordPress-Seite.** Bei Bedarf kann die VHS die App per `iframe` in einem HTML-Block einbinden. Dafür braucht die Redaktion die passende Berechtigung. Die App muss die WordPress-Domain über `Content-Security-Policy: frame-ancestors` erlauben und eine vorhandene `frame-src`-Regel auf der WordPress-Seite muss die App-Domain zulassen. Bei Wahl dieser Option sind Einbettung und mobile Darstellung separat zu testen. [WordPress-Dokumentation zum HTML-Block](https://wordpress.org/documentation/article/custom-html/) · [MDN zu `frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) · [MDN zu `frame-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src)

## Übergabe an die VHS

Zum Abschluss liefert das Team `docs/uebergabe-vhs.md` als Betriebs- und Einbindungsanleitung. Das Dokument enthält die tatsächlich geprüften Schritte und Zuständigkeiten für:

- Lokalen Start und Bereitstellung mit Voraussetzungen, Befehlen, Konfigurationsnamen und einem kurzen Funktionstest von der Projektidee über die Programmauswahl bis zur Antragscheckliste im Chat.
- Aktualisierung des Excel-Katalogs mit Tabellenblatt, Spaltenzuordnung, Beispieldatensatz, Importbefehl und Umgang mit Fehlern.
- Website-Einbindung mit finaler App-URL, WordPress-Seite und Position des Buttons, Button-Text und Schritten zum Einfügen oder Ändern des Links. Die Übergabe dokumentiert den Rücklink zur Verbandswebsite, die zuständigen Ansprechpersonen und den Funktionstest auf Desktop und Handy. Eine gewählte Subdomain oder Einbettung wird mit den tatsächlich verwendeten Einstellungen dokumentiert.
- Betrieb mit Ansprechperson für Datenpflege, Hosting und KI-Zugang. Dazu gehören der Umgang mit Chat-Eingaben, die Prüfung durch die VHS vor einer Veröffentlichung mit realen Daten und der Ablauf bei KI-Ausfall.

## Beim Praxispartner klären

- Welche Excel-Spalten sind verlässlich gepflegt, welche Bedingungen stehen nur im Freitext, und welche Beispieldaten dürfen für Demo oder Repository verwendet werden?
- Welche zwei Vorhaben und Programme eignen sich zur fachlichen Abnahme, und welche Unterschiede zwischen VHS ändern dabei tatsächlich die Förderprüfung?
- Wer pflegt nach der Übergabe die Förderliste? Wo auf `vhs-bw.de` soll der Button stehen, wer pflegt den Link und welche App-URL soll die VHS dauerhaft verwenden?
