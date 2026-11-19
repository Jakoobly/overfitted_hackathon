# VHS-Förderfinder – Hackathon-Spezifikation

**Stand:** 19. November 2026 · **Status:** Vorschlag für Team und Praxispartner

## Ziel

Mitarbeitende einer Volkshochschule (VHS) beschreiben eine Projektidee im Chat. Der Förderfinder zeigt geeignete Programme aus dem bereitgestellten Excel-Katalog, erklärt die Übereinstimmung und führt zu den nächsten Schritten. Liegt ein fachlich ähnliches Programm knapp außerhalb der Projektplanung, zeigt die Anwendung eine konkrete, realistische Anpassung und die Voraussetzung, die sich dadurch erfüllen ließe.

Die Anwendung berücksichtigt Unterschiede zwischen VHS über konkrete Eckdaten wie Standort, Trägerform, verfügbare Eigenmittel und vorhandene Partner. Die Angabe klein, mittel oder groß kann den Kontext ergänzen. Sie beeinflusst die Förderfähigkeit nur, wenn das Programm dafür ein ausdrücklich dokumentiertes Kriterium nennt.

## Ablauf im MVP

1. **Projekt beschreiben.** Eine deutschsprachige Web-App nimmt Freitext entgegen, etwa zu Vorhaben, Zielgruppe, Standort, Budget und geplantem Start.
2. **Eckdaten klären.** Der Chat zeigt die erkannten Angaben zur Kontrolle. Fehlt eine Angabe, die das Ergebnis beeinflusst, stellt er eine gezielte Rückfrage. Die VHS kann Angaben korrigieren und die Suche erneut ausführen.
3. **Förderprogramme vergleichen.** Die App zeigt bis zu drei Ergebnisse mit Titel, Fördergeber, Begründung, offenen oder abweichenden Bedingungen, Frist und Quelle, soweit im Katalog vorhanden.
4. **Projektanpassung prüfen.** Bei einem ähnlichen Programm zeigt die App, welche planbare Änderung helfen könnte, etwa einen späteren Projektbeginn. Die VHS entscheidet, ob sie die Änderung übernimmt. Danach kann sie das Projekt erneut prüfen.
5. **Antrag vorbereiten.** Zu jedem Ergebnis stehen die nächsten Schritte. Die VHS prüft die offenen Bedingungen in der Förderquelle, sammelt die dort genannten Unterlagen und gelangt über den vorhandenen Link zur offiziellen Programm- oder Antragsseite. Fehlende Quellen oder Unterlagen sind als offen gekennzeichnet.

Der MVP verwendet einen vorbereiteten Katalog und einen Chat im Browser. Live-Recherche, Nutzerkonten, gespeicherte Verläufe, Antragserstellung und Antragseinreichung kommen für den Hackathon in den späteren Umfang.

## Excel-Import und Datenmodell

Die Excel-Datei der Praxispartner ist die Grundlage. Tabellenblatt, Spaltennamen und Werte prüfen wir nach Erhalt. Der Import liest das vereinbarte Blatt lokal aus `data/raw/`, prüft Pflichtfelder und doppelte IDs, normalisiert Datums- und Zahlenwerte und meldet fehlerhafte Zeilen mit Zeilennummer. Der Demo-Server liest den erzeugten JSON-Katalog. Für den Start vor Dateilieferung dient ein klar gekennzeichneter, fiktiver Katalog mit demselben Schema. Originaldaten und Ableitungen kommen nur bei entsprechender Freigabe ins Repository.

| Feldgruppe | Vorgeschlagenes Zielschema |
| --- | --- |
| Identität | Stabile Programm-ID, Titel und Fördergeber. ID und Titel sind Pflichtfelder. |
| Fachlicher Bezug | Kurzbeschreibung, Themen und Zielgruppen |
| Förderbedingungen | Fördergebiet, antragsberechtigte Träger, belegte Größenkriterien, Förderbetrag oder Förderquote, erforderliche Eigenmittel und Partnerschaften |
| Termine | Antragsfrist und Bedingungen zum Projektbeginn |
| Antrag und Herkunft | Offizielle URL, genannte Unterlagen, Datenstand und Excel-Referenz aus Blatt und Zeile |

Leere oder mehrdeutige Angaben bleiben unbekannt. Der Import unterscheidet ausdrücklich dokumentierte Fälle wie eine laufende Ausschreibung von einem fehlenden Fristwert. Bedingungen, die zunächst nur als Freitext vorliegen, werden bei Bedarf manuell für die Demo-Kandidaten strukturiert und mit der Excel-Zeile belegt.

## Matching und Rolle der KI

- **KI für die Projekteingabe.** Ein schlanker Server-Wrapper extrahiert aus dem Chat ein Projektprofil mit Thema, Zielgruppe, Region, Trägerform, Budget, Eigenmitteln, ggf. Partnern und Projektbeginn. Die Ausgabe folgt einem Schema und wird serverseitig geprüft. Fehlende Angaben bleiben unbekannt. Eine Korrektur der VHS hat Vorrang.
- **Code für die Förderprüfung.** Für den kleinen Demo-Katalog prüft der Server strukturierte Bedingungen pro Programm und sortiert nach Themen- und Zielgruppenbezug. Standort, Trägerform, Fristen und weitere belegte Voraussetzungen können einen Treffer ausschließen. Jedes geprüfte Kriterium ist erfüllt, offen oder abweichend.
- **Verständliche Ergebnisse.** *Passend nach Datenlage* setzt fachlichen Bezug und erfüllte erfasste Pflichtbedingungen voraus. *Noch zu prüfen* kennzeichnet fachlich passende Programme mit offenen Pflichtbedingungen und ohne bekannte Abweichung. *Ähnlich* kommt bei einer dokumentierten, realistisch veränderbaren Projektbedingung infrage. Die Anwendung nennt die nötige Anpassung und alle übrigen offenen Punkte. Ein ungeeigneter Träger, eine falsche Förderregion oder eine abgelaufene Antragsfrist scheiden für das laufende Programm aus. Bei null Treffern zeigt die Anwendung die wesentlichen Gründe und, falls sinnvoll, eine Rückfrage.
- **Begründungen aus dem Katalog.** Treffertexte und nächste Schritte lassen sich für den MVP aus Vorlagen erzeugen. Namen, Fristen, Beträge und URLs stammen aus dem Katalog. Ergebnisse sind eine Orientierung für die Prüfung bei der Förderstelle. Bei einem Ausfall der KI können die relevanten Eckdaten über einen einfachen Formularmodus eingegeben werden und durchlaufen dieselbe Förderprüfung.

## Technikvorschlag

| Baustein | Empfehlung für den Hackathon |
| --- | --- |
| Web-App und Backend | **Next.js mit React und TypeScript**. Chat und Ergebniskarten nutzen dieselben Typen wie die serverseitige Route `POST /api/chat`. So genügt ein Projekt für Oberfläche und API. [Installation](https://nextjs.org/docs/app/getting-started/installation) · [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) |
| Excel | **SheetJS CE** in einem lokalen Node-Skript. Die Laufzeit verwendet den validierten JSON-Katalog. [Installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) · [Excel-Daten lesen](https://docs.sheetjs.com/docs/solutions/output/) |
| KI | **OpenAI Responses API mit Structured Outputs** für die Felder des Projektprofils. Modell und Schlüssel werden serverseitig konfiguriert. Für die Demo verwenden wir fiktive Projekteingaben. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) |
| Förderprüfung | **TypeScript-Funktionen über JSON**. Für den vorbereiteten Katalog genügen einfache Regeln und sortierbare Themenmerkmale. |
| Demo und Einbindung | **Vercel als Hosting-Option** mit eigener URL und serverseitigen Umgebungsvariablen. Lokal läuft die Demo ebenfalls. Für die VHS-Website ist ein Link der kleinste Integrationsschritt. Ein `iframe` kann ergänzt werden, wenn Ziel-CMS und Hosting die Einbettung erlauben. [Deployment](https://nextjs.org/docs/app/getting-started/deploying) · [Umgebungsvariablen](https://vercel.com/docs/environment-variables) |

**Schnittstelle für den ersten Durchlauf.** `POST /api/chat` erhält die neue Nachricht und das bisher vom Nutzer bestätigte Projektprofil. Die Route liefert das aktualisierte Profil, gegebenenfalls eine Rückfrage und eine Trefferliste. Jeder Treffer hat eine Programm-ID, einen Status, Gründe, offene Bedingungen sowie gegebenenfalls eine Projektanpassung und nächste Schritte. Der Browser hält den Sitzungsstand für die laufende Suche.

## Demo und Abnahme

Fiktives Szenario für die Vorbereitung. Eine kleine VHS in Baden-Württemberg plant einen Kurs zur digitalen Grundbildung für Erwachsene. Der Chat fragt nach dem geplanten Start, wenn dieser für einen Treffer ausschlaggebend ist. Mit dem vorbereiteten Katalog zeigt die Demo einen passenden Treffer und ein ähnliches Programm, dessen dokumentierte Startbedingung mit einem späteren Termin erfüllt werden könnte. Ein Programm mit unpassender Förderregion fällt heraus. Sobald die Praxispartnerdatei vorliegt, wählen wir ein belegbares Beispiel daraus oder kennzeichnen das fiktive Szenario in der Demo.

- Eine unvollständige Eingabe löst eine konkrete Rückfrage aus. Eine korrigierte Angabe verändert die Bewertung, wenn sie ein Förderkriterium betrifft.
- Fehlende Pflichtangaben und eindeutige Ausschlüsse führen zu den vorgesehenen Ergebnissen. Der Chat kann auch einen leeren Ergebnissatz verständlich anzeigen.
- Zu jedem angezeigten Programm stimmen die ausgegebenen Konditionen mit dem Demo-Katalog überein. Die VHS sieht mindestens einen nächsten Schritt und, soweit vorhanden, die Quelle.
- Der Kernablauf lässt sich lokal mit vorbereitetem Katalog und bei KI-Ausfall über den Formularmodus vorführen.

## Aufteilung im Dreierteam

| Verantwortliche Rolle | Erste Arbeitseinheit, ca. 45 Min. | Nächste Arbeitseinheit, ca. 45 Min. |
| --- | --- | --- |
| Oberfläche und Integration | Chat und Ergebniskarten mit Beispielantwort | API anbinden, Demo lokal und optional gehostet durchspielen |
| Kernlogik und Daten | Katalogschema, kleiner Beispieldatensatz und Förderprüfung | Excel-Spalten zuordnen, KI-Extraktion und Formularmodus integrieren |
| Praxispartner und Demo | Excel-Felder, Nutzungsfreigabe und erwartete Beispieltreffer klären | Demo und Abnahme prüfen, Übergabe mit der Anwendung abgleichen |

Vor dem ersten parallelen Arbeitsblock stimmen die drei Rollen Projektprofil, Trefferstatus und API-Antwort ab. [Hackathon-Zeitplan](hackathon-zeitplan.md)

## Übergabe an die VHS

Zum Abschluss liefert das Team `docs/uebergabe-vhs.md` als Betriebs- und Einbindungsanleitung. Das Dokument enthält die tatsächlich geprüften Schritte und Zuständigkeiten für:

- Lokalen Start und Bereitstellung mit Voraussetzungen, Befehlen, Konfigurationsnamen und einem kurzen Funktionstest.
- Aktualisierung des Excel-Katalogs mit Tabellenblatt, Spaltenzuordnung, Beispieldatensatz, Importbefehl und Umgang mit Fehlern.
- Website-Einbindung über einen Link und, sofern erprobt, ein `iframe`-Beispiel mit Voraussetzungen für das Ziel-CMS und Angaben zur mobilen Darstellung.
- Betrieb mit Ansprechperson für Datenpflege, Hosting und KI-Zugang. Dazu gehören der Umgang mit Chat-Eingaben, die Prüfung durch die VHS vor einer Veröffentlichung mit realen Daten und der Ablauf bei KI-Ausfall.

## Beim Praxispartner klären

- Welche Excel-Spalten sind verlässlich gepflegt, welche Bedingungen stehen nur im Freitext, und welche Beispieldaten dürfen für Demo oder Repository verwendet werden?
- Welche zwei Vorhaben und Programme eignen sich zur fachlichen Abnahme, und welche Unterschiede zwischen VHS ändern dabei tatsächlich die Förderprüfung?
- Wer pflegt nach der Übergabe die Förderliste, und welches CMS sowie welche Einbindung sind bei der VHS vorgesehen?
