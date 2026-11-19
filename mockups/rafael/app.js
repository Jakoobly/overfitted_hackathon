/* vhs-Förderfinder: Frontend-Mockup.
 * Die Extraktion simuliert die spätere KI mit Schlüsselwörtern. Die Förderprüfung folgt
 * der Spezifikation in docs/vhs-foerderfinder.md (erfüllt / offen / abweichend / Ausschluss).
 */
(function () {
  'use strict';

  // ---------- Vokabular ----------
  const THEMEN = {
    digital: ['Digitalisierung', /digital|smartphone|computer|internet|online|\bki\b|künstliche intelligenz|tablet|passw/],
    medien: ['Medienkompetenz', /medien|fake news|desinformation/],
    grundbildung: ['Grundbildung', /grundbildung|alphabetis|lesen und schreiben|rechnen/],
    integration: ['Integration', /integration|zugewander|geflüchtet|migrant|schutzsuchend|asyl/],
    sprachen: ['Sprachen', /sprachkurs|deutschkurs|deutsch lernen|fremdsprach/],
    gesundheit: ['Gesundheit', /gesundheit|bewegung|ernährung|prävention|stress|psychisch/],
    inklusion: ['Inklusion', /inklusi|behinderung|barrierefrei/],
    europa: ['Europa / International', /europ|international|erasmus|ausland|grenzüberschreitend/],
    kultur: ['Kultur – Gestalten', /kultur|kunst|theater|musik|kreativ/],
    politik: ['Politik – Gesellschaft', /politisch|politik/],
    demokratie: ['Demokratie', /demokrat|beteiligung|zusammenhalt/],
    jugend: ['Junge vhs', /jugend|junge menschen|schüler/],
    beruf: ['Arbeit – Beruf', /beruf|arbeitsmarkt|fachkräft|umschulung|qualifizierung|bewerbung/],
    eltern: ['Elternbildung', /eltern/],
    schule: ['vhs + Schule', /schule|startchancen/],
    nachhaltigkeit: ['Nachhaltigkeit', /nachhaltig|klima|umwelt|agenda 2030/],
    beratung: ['Weiterbildungsberatung', /beratung/],
    engagement: ['Engagement / Ehrenamt', /ehrenamt|engagement/],
    gleichstellung: ['Gleichstellung', /gleichstellung|gleichberechtig/],
    forschung: ['Forschung', /forschung|studie|evaluation/],
    personal: ['Personalentwicklung', /kursleit|job-shadowing|hospitation|fortbildung für/],
  };
  // Themenfeld-Farben laut DVV-Styleguide (Sekundärfarbe B)
  const THEMEN_FARBE = {
    sprachen: '--vhs-gelb-b', kultur: '--vhs-violett', beruf: '--vhs-rot-b', gesundheit: '--vhs-hellblau-b',
    politik: '--vhs-gruen-b', demokratie: '--vhs-gruen-b', nachhaltigkeit: '--vhs-gruen-b',
  };
  const ZIELGRUPPEN = {
    erwachsene: ['Erwachsene', /erwachsen|senior|ältere/],
    jugendliche: ['Jugendliche', /jugendlich|junge menschen|junge erwachsene|schüler/],
    kinder: ['Kinder', /kinder(?!betreuung)/],
    eltern: ['Eltern', /eltern/],
    gefluechtete: ['Geflüchtete', /geflüchtet|schutzsuchend|asyl/],
    migranten: ['Zugewanderte', /zugewander|migrant|migrationsgeschichte/],
    behinderung: ['Menschen mit Behinderung', /behinderung/],
    arbeitslose: ['Arbeitslose', /arbeitslos|arbeitsuchend|jobcenter/],
    beschaeftigte: ['Beschäftigte', /beschäftigte|erwerbstätig|arbeitnehm|betrieb/],
    frauen: ['Frauen', /frauen/],
    'vhs-personal': ['vhs-Personal', /kursleit/],
    multiplikatoren: ['Multiplikator*innen', /multiplikator|ehrenamtliche/],
    vulnerable: ['Benachteiligte Gruppen', /benachteiligt|vulnerab|armut|bildungsfern/],
  };
  const BUNDESLAENDER = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
    'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
    'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];
  const ORTE = [
    [/baden-württemberg|\bbw\b|stuttgart|karlsruhe|mannheim|freiburg|heidelberg|\bulm\b|heilbronn|pforzheim|reutlingen|tübingen|konstanz|esslingen|ludwigsburg|böblingen|ravensburg|offenburg/, 'Baden-Württemberg'],
    [/bayern|münchen|nürnberg|augsburg|regensburg|würzburg/, 'Bayern'],
    [/hessen|frankfurt|wiesbaden|kassel|darmstadt/, 'Hessen'],
    [/nordrhein-westfalen|\bnrw\b|köln|düsseldorf|dortmund|essen\b|münster/, 'Nordrhein-Westfalen'],
    [/rheinland-pfalz|mainz|trier|ludwigshafen/, 'Rheinland-Pfalz'],
    [/sachsen-anhalt|magdeburg|halle/, 'Sachsen-Anhalt'],
    [/sachsen|dresden|leipzig|chemnitz/, 'Sachsen'],
    [/niedersachsen|hannover|braunschweig|osnabrück/, 'Niedersachsen'],
    [/berlin/, 'Berlin'], [/hamburg/, 'Hamburg'], [/bremen/, 'Bremen'], [/brandenburg|potsdam/, 'Brandenburg'],
    [/thüringen|erfurt|jena/, 'Thüringen'], [/saarland|saarbrücken/, 'Saarland'],
    [/schleswig-holstein|kiel|lübeck/, 'Schleswig-Holstein'], [/mecklenburg|rostock|schwerin/, 'Mecklenburg-Vorpommern'],
  ];
  const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  const JAHRESZEIT = { frühjahr: '03', frühling: '03', anfang: '01', sommer: '06', mitte: '06', herbst: '09', ende: '11', winter: '12' };
  const PARTNER = {
    international: 'Internationale Partner',
    startchancen: 'Startchancen-Schule',
    krankenkasse: 'Krankenkasse / Kostenträger',
    kommune: 'Kommune',
    azav: 'AZAV-Zertifizierung',
  };
  const TRAEGER = { kommunal: 'Kommunal', verein: 'Eingetragener Verein', gmbh: 'gGmbH / GmbH' };
  const STATUS = {
    passend: { label: 'Passend nach Datenlage', rank: 0 },
    pruefen: { label: 'Noch zu prüfen', rank: 1 },
    aehnlich: { label: 'Ähnlich', rank: 2 },
    aus: { label: 'Ausgeschlossen', rank: 3 },
  };
  const ICONS = { erfuellt: '✓', offen: '?', abweichend: '↻', ausschluss: '✕', info: 'i' };

  const EXAMPLES = [
    'Wir sind eine kleine vhs in Baden-Württemberg (eingetragener Verein) und planen einen Kurs zur digitalen Grundbildung für Erwachsene: Smartphone, Online-Banking, sichere Passwörter. Budget rund 15.000 Euro, Eigenanteil 10 %.',
    'Unsere vhs in Mannheim möchte mit einer Startchancen-Schule ein Elterncafé und Grundbildungskurse für Eltern anbieten. Start Februar 2027, Budget ca. 14.000 €.',
    'Wir sind die vhs Augsburg in Bayern und möchten gemeinsam mit der Stadt einen Präventionskurs zu Bewegung und Ernährung für benachteiligte Familien anbieten. Budget 20.000 €, Start Mai 2027.',
  ];

  // ---------- Zustand ----------
  const emptyProfile = () => ({
    vorhaben: '', themen: [], zielgruppen: [], bundesland: null, traeger: null, groesse: null,
    budget: null, eigenanteil: null, start: null, startOffen: false,
    partner: { international: null, startchancen: null, krankenkasse: null, kommune: null, azav: null },
  });
  const state = { profile: emptyProfile(), sources: {}, asked: new Set(), pending: null, accepted: new Set(), lastResult: null };

  // ---------- Hilfsfunktionen ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtEuro = (n) => n.toLocaleString('de-DE') + ' €';
  const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return MONATE[+m - 1].replace(/^./, (c) => c.toUpperCase()) + ' ' + y; };
  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('de-DE');
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const region = (p) => (p.bundesland ? (p.bundesland === 'Baden-Württemberg' ? 'BW' : 'andere') : null);
  const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s);

  // ---------- Simulierte KI-Extraktion ----------
  function parseNumber(raw, unit) {
    let n = parseFloat(raw.replace(/\.(?=\d{3})/g, '').replace(/\s/g, '').replace(',', '.'));
    if (/tsd|tausend|^k$/.test(unit || '')) n *= 1000;
    if (/mio|million/.test(unit || '')) n *= 1e6;
    return Math.round(n);
  }

  function extract(text) {
    const t = text.toLowerCase();
    const found = {};

    const themen = Object.keys(THEMEN).filter((k) => THEMEN[k][1].test(t));
    if (themen.length) found.themen = themen;
    const zg = Object.keys(ZIELGRUPPEN).filter((k) => ZIELGRUPPEN[k][1].test(t));
    if (zg.length) found.zielgruppen = zg;

    for (const [re, land] of ORTE) if (re.test(t)) { found.bundesland = land; break; }

    if (/e\.\s?v\.|eingetragene[rn]? verein/.test(t)) found.traeger = 'verein';
    else if (/kommunal|eigenbetrieb|zweckverband/.test(t)) found.traeger = 'kommunal';
    else if (/g?gmbh/.test(t)) found.traeger = 'gmbh';

    const g = t.match(/\b(klein|mittel|groß)\w*\s+(vhs|volkshochschule)/);
    if (g) found.groesse = g[1];

    const eig = t.match(/eigen(?:anteil|mittel)\w*[^.\d%]{0,25}(\d{1,2}(?:,\d)?)\s*(?:%|prozent)/) || t.match(/(\d{1,2})\s*(?:%|prozent)\s*eigen/);
    if (eig) found.eigenanteil = parseFloat(eig[1].replace(',', '.'));
    else if (/keine eigen(mittel|anteil)/.test(t)) found.eigenanteil = 0;

    const money = [...t.matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?)\s*(tsd\.?|tausend|k|mio\.?|millionen)?\s*(?:€|euro\b|eur\b)/g)];
    const budgetHit = money.find((m) => !/eigen/.test(t.slice(Math.max(0, m.index - 25), m.index)));
    if (budgetHit) found.budget = parseNumber(budgetHit[1], budgetHit[2]);
    else if (state.pending === 'budget') {
      const n = t.match(/^\D*(\d[\d.]*)\D*$/);
      if (n) found.budget = parseNumber(n[1]);
    }

    let start = null;
    let m = t.match(new RegExp('(' + MONATE.join('|') + ')\\s*(20\\d\\d)'));
    if (m) start = m[2] + '-' + String(MONATE.indexOf(m[1]) + 1).padStart(2, '0');
    if (!start && (m = t.match(/\b(\d{1,2})\s*[./]\s*(20\d\d)\b/))) start = m[2] + '-' + m[1].padStart(2, '0');
    if (!start && (m = t.match(/(frühjahr|frühling|sommer|herbst|winter|anfang|mitte|ende)\s*(20\d\d)/))) start = m[2] + '-' + JAHRESZEIT[m[1]];
    if (!start && (m = t.match(/(?:ab|start|beginn|starten)\D{0,15}(20\d\d)/))) start = m[1] + '-01';
    if (start) found.start = start;
    else if (state.pending === 'start' && /weiß (ich )?(noch )?nicht|unklar|noch offen|offen/.test(t)) found.startOffen = true;

    const partner = {};
    if (/keine (internationalen|europäischen|ausländischen) partner/.test(t)) partner.international = false;
    else if (/(internationale|europäische|ausländische)\w* partner|partner\w* (in|aus) (anderen ländern|europa|dem ausland|frankreich|österreich|polen|italien|spanien|der schweiz)/.test(t)) partner.international = true;
    if (/startchancen/.test(t)) partner.startchancen = !/keine startchancen/.test(t);
    if (/krankenkasse|kostenträger|\baok\b/.test(t)) partner.krankenkasse = !/ohne (krankenkasse|kostenträger)|keine (krankenkasse|kostenträger)/.test(t);
    if (/(mit|und) (der |dem |unserer |unserem )?(stadt|kommune|gemeinde|landkreis)\b/.test(t)) partner.kommune = true;
    if (/azav/.test(t)) partner.azav = !/(nicht|ohne|keine) azav|azav[- ]?(zertifizierung )?(fehlt|nicht)/.test(t);
    if (Object.keys(partner).length) found.partner = partner;

    return found;
  }

  function merge(found, source) {
    const p = state.profile;
    for (const [k, v] of Object.entries(found)) {
      if (k === 'partner') {
        for (const [pk, pv] of Object.entries(v)) { p.partner[pk] = pv; state.sources['partner.' + pk] = source; }
      } else if (k === 'themen' || k === 'zielgruppen') {
        p[k] = [...new Set([...p[k], ...v])];
        state.sources[k] = source;
      } else {
        p[k] = v;
        state.sources[k] = source;
        if (k === 'start') p.startOffen = false;
      }
    }
  }

  // ---------- Förderprüfung ----------
  function evaluate(prog, p) {
    const r = prog.regeln;
    const themen = prog.themen.filter((x) => p.themen.includes(x));
    const zg = prog.zielgruppen.filter((x) => p.zielgruppen.includes(x));
    const score = themen.length * 3 + zg.length - (r.generic ? 1 : 0);
    const checks = [];
    const add = (state_, text, extra) => checks.push({ state: state_, text, ...extra });
    const reg = region(p);

    if (r.region === 'BW') {
      if (reg === 'BW') add('erfuellt', 'Förderregion Baden-Württemberg passt zum Standort.');
      else if (reg === 'andere') add('ausschluss', `Nur für Baden-Württemberg; Ihr Standort ist ${p.bundesland}.`);
      else add('offen', 'Programm gilt nur in Baden-Württemberg. Standort noch unbekannt.', { field: 'bundesland' });
    } else if (r.region === 'DE') add('erfuellt', 'Bundesweites Programm.');
    else add('erfuellt', 'EU-Programm, Antrag über die zuständige nationale Stelle.');

    if (r.budgetMin) {
      if (p.budget == null) add('offen', `Mindestfördersumme laut Katalog: ${fmtEuro(r.budgetMin)}. Budget noch unbekannt.`, { field: 'budget' });
      else if (p.budget < r.budgetMin) add('abweichend', `Geplantes Budget (${fmtEuro(p.budget)}) liegt unter dem Mindestumfang von ${fmtEuro(r.budgetMin)}.`, {
        adjust: { key: prog.id + ':budget', text: r.budgetMinHint || `Projektumfang auf mindestens ${fmtEuro(r.budgetMin)} planen.`, label: `Budget auf ${fmtEuro(r.budgetMin)} setzen`, apply: { budget: r.budgetMin } },
      });
      else add('erfuellt', `Budget erreicht die Mindestfördersumme (${fmtEuro(r.budgetMin)}).`);
    }
    if (r.budgetMax && p.budget != null) {
      if (p.budget > r.budgetMax) add('offen', `Förderung bis ${fmtEuro(r.budgetMax)}. Restfinanzierung von ${fmtEuro(p.budget - r.budgetMax)} klären.`);
      else add('erfuellt', `Budget liegt im Förderrahmen (bis ${fmtEuro(r.budgetMax)}).`);
    } else if (r.budgetMax) add('info', `Förderung laut Katalog bis ${fmtEuro(r.budgetMax)}.`);

    if (r.eigenanteilMin) {
      const need = r.eigenanteilMin > 1 ? `mindestens ${r.eigenanteilMin} %` : 'ein Eigenanteil (Höhe in der Quelle prüfen)';
      if (p.eigenanteil == null) add('offen', `Erforderlich ist ${need}. Eigenmittel noch unbekannt.`, { field: 'eigenanteil' });
      else if (p.eigenanteil < r.eigenanteilMin) add('abweichend', `Eigenanteil von ${p.eigenanteil} % reicht nicht, erforderlich ist ${need}.`, {
        adjust: { key: prog.id + ':eigen', text: `Eigenmittel auf ${r.eigenanteilMin} % der förderfähigen Kosten erhöhen.`, label: `Eigenanteil auf ${r.eigenanteilMin} % setzen`, apply: { eigenanteil: r.eigenanteilMin } },
      });
      else add('erfuellt', `Eigenanteil (${p.eigenanteil} %) erfüllt die Vorgabe.`);
    }

    if (r.partner) {
      const v = p.partner[r.partner];
      const P = {
        international: ['Internationale Partnereinrichtungen sind vorhanden.', 'Das Programm setzt Partnereinrichtungen aus anderen Ländern voraus.', 'Partnereinrichtung aus einem anderen europäischen Land für das Vorhaben gewinnen.'],
        azav: ['vhs und Kurs sind AZAV-zertifiziert.', 'Kurse und vhs müssen AZAV-zertifiziert sein.', 'AZAV-zertifizierten Kooperationspartner einbinden (laut Katalog möglich).'],
        krankenkasse: ['Kooperation mit Kostenträgern ist vorhanden.', 'In der Regel ist eine Kooperation mit Kostenträgern oder Leistungserbringern nötig.', 'Kooperation mit einer Krankenkasse oder einem Leistungserbringer aufbauen.'],
        kommune: ['Kommune ist als Partnerin beteiligt.', 'Antragsberechtigt sind vor allem Kommunen; die vhs ist meist Projektpartnerin.', 'Kommune als Antragstellerin oder Partnerin gewinnen.'],
        startchancen: ['Kooperation mit einer Startchancen-Schule ist vorhanden.', 'Nur mit einer am Projekt beteiligten Startchancen-Schule möglich.', null],
      }[r.partner];
      if (v === true) add('erfuellt', P[0]);
      else if (v === false && !P[2]) add('ausschluss', P[1]);
      else if (v === false) add('abweichend', P[1], { adjust: { key: prog.id + ':partner', text: P[2], label: 'Partner einplanen', apply: { partner: { [r.partner]: true } } } });
      else add('offen', P[1] + ' Angabe noch unbekannt.', { field: 'partner.' + r.partner });
    }

    if (r.noCall) add('ausschluss', r.noCall + '.');
    if (r.frist) {
      if (r.frist < todayIso()) add('ausschluss', `Antragsfrist am ${fmtDate(r.frist)} abgelaufen.`);
      else add('erfuellt', `Antragsfrist: ${fmtDate(r.frist)}.`);
    } else if (r.fristInfo) add('info', r.fristInfo + '.');
    else if (!r.noCall) add('info', 'Antragsfrist nicht im Katalog. Bitte in der Quelle prüfen.');

    if (r.laufzeit) {
      const [von, bis] = r.laufzeit;
      const zeitraum = von ? `${fmtMonth(von)} bis ${fmtMonth(bis)}` : `bis ${fmtMonth(bis)}`;
      if (!p.start) add('offen', `Förderzeitraum ${zeitraum}. Projektbeginn noch unbekannt.`, { field: 'start' });
      else if (p.start > bis) add('ausschluss', `Programm läuft nur ${zeitraum}; geplanter Start ${fmtMonth(p.start)}.`);
      else if (von && p.start < von) add('abweichend', `Förderzeitraum beginnt erst ${fmtMonth(von)}.`, {
        adjust: { key: prog.id + ':start', text: `Projektbeginn auf ${fmtMonth(von)} verschieben.`, label: `Start ${fmtMonth(von)} übernehmen`, apply: { start: von } },
      });
      else add('erfuellt', `Projektbeginn liegt im Förderzeitraum (${zeitraum}).`);
    }

    if (r.startRule === 'esf-fruehjahr') {
      const base = 'Regionale ESF-Aufrufe auf Landkreisebene erscheinen laut Katalog im Frühjahr.';
      if (!p.start) add('offen', base + ' Projektbeginn noch unbekannt.', { field: 'start' });
      else if (p.start < '2027-07') add('abweichend', `${base} Ein Start im ${fmtMonth(p.start)} lässt keine Zeit für Aufruf, Antrag und Bewilligung.`, {
        adjust: { key: prog.id + ':start', text: 'Projektbeginn auf September 2027 verschieben und im Frühjahrsaufruf 2027 beantragen. Den Zeitbedarf nimmt das Mockup an; bitte bei der Förderstelle bestätigen.', label: 'Start September 2027 übernehmen', apply: { start: '2027-09' } },
      });
      else add('erfuellt', 'Projektbeginn nach dem Frühjahrsaufruf eingeplant.');
    }

    const states = checks.map((c) => c.state);
    const status = states.includes('ausschluss') ? 'aus' : states.includes('abweichend') ? 'aehnlich' : states.includes('offen') ? 'pruefen' : 'passend';
    return { prog, score, themen, zg, checks, status };
  }

  function search() {
    const p = state.profile;
    const all = window.CATALOG.map((prog) => evaluate(prog, p)).filter((e) => e.themen.length > 0);
    all.sort((a, b) => b.score - a.score || STATUS[a.status].rank - STATUS[b.status].rank);
    const shown = all.filter((e) => e.status !== 'aus');
    return { top: shown.slice(0, 3), more: shown.slice(3), excluded: all.filter((e) => e.status === 'aus') };
  }

  // Gezielte Rückfrage, wenn eine fehlende Angabe ein Top-Ergebnis beeinflusst
  function nextQuestion(result) {
    const p = state.profile;
    if (!p.themen.length) return { field: 'themen', text: 'Worum geht es in Ihrem Vorhaben? Nennen Sie bitte das Thema, zum Beispiel Digitalisierung, Gesundheit oder Integration.', replies: ['Digitale Grundbildung', 'Gesundheitsprävention', 'Integration und Sprache'] };
    const fields = new Set(result.top.flatMap((e) => e.checks.filter((c) => c.state === 'offen' && c.field).map((c) => c.field)));
    if (!p.bundesland && !state.asked.has('bundesland')) return { field: 'bundesland', text: 'In welchem Bundesland liegt Ihre vhs? Einige Programme gelten nur in Baden-Württemberg.', replies: ['Baden-Württemberg', 'Bayern', 'Hessen'] };
    if (fields.has('start') && !p.startOffen && !state.asked.has('start')) return { field: 'start', text: 'Wann soll das Projekt starten? Für mindestens ein Programm hängt die Bewertung davon ab.', replies: ['März 2027', 'September 2027', 'Weiß ich noch nicht'] };
    if (fields.has('budget') && !state.asked.has('budget')) return { field: 'budget', text: 'Mit welchem Gesamtbudget planen Sie ungefähr?', replies: ['10.000 €', '50.000 €', '150.000 €'] };
    const pf = [...fields].find((f) => f.startsWith('partner.') && !state.asked.has(f));
    if (pf) {
      const key = pf.split('.')[1];
      const q = {
        international: 'Haben Sie Partnereinrichtungen in anderen europäischen Ländern?',
        startchancen: 'Kooperieren Sie mit einer Schule des Startchancen-Programms?',
        krankenkasse: 'Ist eine Krankenkasse oder ein anderer Kostenträger beteiligt?',
        kommune: 'Ist Ihre Kommune als Partnerin beteiligt?',
        azav: 'Sind Ihre vhs und der Kurs AZAV-zertifiziert?',
      }[key];
      return { field: pf, text: q, replies: ['Ja', 'Nein'] };
    }
    return null;
  }

  // ---------- Darstellung: Chat ----------
  function addMsg(role, text) {
    const div = document.createElement('div');
    const bubble = document.createElement('p');
    bubble.className = 'bubble';
    bubble.textContent = text;
    if (role === 'system') {
      div.className = 'message message-system';
      div.textContent = text;
    } else if (role === 'user') {
      div.className = 'message message-user';
      div.innerHTML = '<p class="speaker">Sie</p>';
      div.appendChild(bubble);
    } else {
      div.className = 'message message-assistant';
      div.innerHTML = '<span class="avatar" aria-hidden="true">vhs</span><div><p class="speaker">Förderfinder</p></div>';
      div.lastChild.appendChild(bubble);
    }
    $('#messages').appendChild(div);
    $('#messages').scrollTop = $('#messages').scrollHeight;
  }

  function setReplies(replies) {
    const box = $('#quickReplies');
    box.innerHTML = '';
    (replies || []).forEach((r) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip answer'; b.textContent = r;
      b.onclick = () => handleUser(r);
      box.appendChild(b);
    });
  }

  function handleUser(text) {
    text = text.trim();
    if (!text) return;
    addMsg('user', text);
    const pending = state.pending;
    const found = extract(text);
    if (pending && pending.startsWith('partner.') && /^(ja|nein)\b/i.test(text)) {
      found.partner = { ...(found.partner || {}), [pending.split('.')[1]]: /^ja/i.test(text) };
    }
    if (!state.profile.vorhaben && found.themen) state.profile.vorhaben = clip(text.split(/(?<=[.!?])\s/)[0], 140);
    merge(found, 'chat');
    runAndReply(Object.keys(found).length === 0);
  }

  function runAndReply(nothingFound) {
    const result = search();
    state.lastResult = result;
    renderProfile();
    renderResults(result);
    const q = nextQuestion(result);
    let text = '';
    if (nothingFound && state.profile.themen.length) text = 'Dazu konnte ich keine neue Angabe erkennen. Sie können die Eckdaten rechts auch direkt bearbeiten.\n';
    if (state.profile.themen.length) {
      const n = result.top.length + result.more.length;
      if (n === 0) text += `Im Katalog gibt es aktuell kein Programm, das zu den Angaben passt. ${result.excluded.length ? result.excluded.length + ' Programme mit Themenbezug scheiden aus; die Gründe stehen rechts.' : ''}`;
      else text += `${n} Programme haben fachlichen Bezug. Die drei relevantesten:\n` + result.top.map((e) => `• ${e.prog.title}: ${STATUS[e.status].label}`).join('\n');
    }
    if (q) {
      text += (text ? '\n\n' : '') + q.text;
      state.pending = q.field;
      state.asked.add(q.field);
      setReplies(q.replies);
    } else {
      state.pending = null;
      setReplies([]);
      if (result.top.length) text += '\n\nPrüfen Sie die Karten rechts. Bei „Ähnlich“ können Sie eine vorgeschlagene Anpassung übernehmen.';
    }
    addMsg('bot', text.trim());
  }

  // ---------- Darstellung: Profil ----------
  function profileRows() {
    const p = state.profile;
    const src = (k) => (state.sources[k] === 'manuell' ? '<span class="src">korrigiert</span>' : state.sources[k] === 'anpassung' ? '<span class="src">angepasst</span>' : '');
    const val = (v, k) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? '<dd class="unknown">unbekannt</dd>' : `<dd>${esc(v)}${src(k)}</dd>`);
    const partner = Object.entries(p.partner).filter(([, v]) => v != null).map(([k, v]) => (v ? '' : 'kein/e ') + PARTNER[k]).join(', ');
    return [
      ['Vorhaben', val(p.vorhaben, 'vorhaben')],
      ['Themen', val(p.themen.map((k) => THEMEN[k][0]).join(', '), 'themen')],
      ['Zielgruppe', val(p.zielgruppen.map((k) => ZIELGRUPPEN[k][0]).join(', '), 'zielgruppen')],
      ['Standort', val(p.bundesland, 'bundesland')],
      ['Trägerform', val(p.traeger && TRAEGER[p.traeger], 'traeger')],
      ['Größe (Kontext)', val(p.groesse, 'groesse')],
      ['Budget', val(p.budget != null ? fmtEuro(p.budget) : null, 'budget')],
      ['Eigenanteil', val(p.eigenanteil != null ? p.eigenanteil + ' %' : null, 'eigenanteil')],
      ['Partner / Zertifikate', val(partner, '')],
      ['Projektbeginn', val(p.start ? fmtMonth(p.start) : p.startOffen ? 'noch offen' : null, 'start')],
    ];
  }

  function renderProfile() {
    $('#profileList').innerHTML = profileRows().map(([k, v]) => `<div><dt>${k}</dt>${v}</div>`).join('');
  }

  // Formular für Profilkorrektur und Formularmodus
  function fieldsHtml(prefix) {
    const p = state.profile;
    const tri = (k) => {
      const v = p.partner[k];
      return `<div class="field"><label for="${prefix}-p-${k}">${PARTNER[k]}</label><select id="${prefix}-p-${k}" name="p-${k}">
        <option value="" ${v == null ? 'selected' : ''}>unbekannt</option><option value="1" ${v === true ? 'selected' : ''}>ja</option><option value="0" ${v === false ? 'selected' : ''}>nein</option></select></div>`;
    };
    const checks = (name, dict, sel) => `<div class="checks">${Object.entries(dict).map(([k, [l]]) => `<label><input type="checkbox" name="${name}" value="${k}" ${sel.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div>`;
    const opt = (o, v) => o.map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
    return `<div class="field-grid">
      <div class="field wide"><label for="${prefix}-vorhaben">Vorhaben</label><input id="${prefix}-vorhaben" name="vorhaben" value="${esc(p.vorhaben)}" placeholder="z. B. Kurs zur digitalen Grundbildung"></div>
      <div class="field wide"><label>Themen</label>${checks('themen', THEMEN, p.themen)}</div>
      <div class="field wide"><label>Zielgruppen</label>${checks('zielgruppen', ZIELGRUPPEN, p.zielgruppen)}</div>
      <div class="field"><label for="${prefix}-land">Standort (Bundesland)</label><select id="${prefix}-land" name="bundesland">${opt([['', 'unbekannt'], ...BUNDESLAENDER.map((b) => [b, b])], p.bundesland || '')}</select></div>
      <div class="field"><label for="${prefix}-traeger">Trägerform</label><select id="${prefix}-traeger" name="traeger">${opt([['', 'unbekannt'], ...Object.entries(TRAEGER)], p.traeger || '')}</select></div>
      <div class="field"><label for="${prefix}-groesse">Größe der vhs (nur Kontext)</label><select id="${prefix}-groesse" name="groesse">${opt([['', 'unbekannt'], ['klein', 'klein'], ['mittel', 'mittel'], ['groß', 'groß']], p.groesse || '')}</select></div>
      <div class="field"><label for="${prefix}-budget">Budget in €</label><input id="${prefix}-budget" name="budget" type="number" min="0" step="500" value="${p.budget ?? ''}"></div>
      <div class="field"><label for="${prefix}-eigen">Eigenanteil in %</label><input id="${prefix}-eigen" name="eigenanteil" type="number" min="0" max="100" value="${p.eigenanteil ?? ''}"></div>
      <div class="field"><label for="${prefix}-start">Projektbeginn</label><input id="${prefix}-start" name="start" type="month" value="${p.start ?? ''}"></div>
      ${Object.keys(PARTNER).map(tri).join('')}
    </div>`;
  }

  function readForm(form) {
    const fd = new FormData(form);
    const p = state.profile;
    const before = JSON.stringify(p);
    const num = (v) => (v === '' ? null : Number(v));
    p.vorhaben = fd.get('vorhaben').trim();
    p.themen = fd.getAll('themen');
    p.zielgruppen = fd.getAll('zielgruppen');
    p.bundesland = fd.get('bundesland') || null;
    p.traeger = fd.get('traeger') || null;
    p.groesse = fd.get('groesse') || null;
    p.budget = num(fd.get('budget'));
    p.eigenanteil = num(fd.get('eigenanteil'));
    p.start = fd.get('start') || null;
    for (const k of Object.keys(PARTNER)) { const v = fd.get('p-' + k); p.partner[k] = v === '' ? null : v === '1'; }
    const after = JSON.parse(before);
    // Geänderte Felder als manuelle Korrektur markieren (Vorrang vor der Extraktion)
    for (const k of Object.keys(p)) if (JSON.stringify(after[k]) !== JSON.stringify(p[k]) && k !== 'partner') state.sources[k] = 'manuell';
  }

  // ---------- Darstellung: Ergebnisse ----------
  function card(e) {
    const p = e.prog;
    const st = STATUS[e.status];
    const themeHtml = (k) => (THEMEN_FARBE[k] ? `<span class="theme-dot" style="background:var(${THEMEN_FARBE[k]})" aria-hidden="true"></span>` : ' ') + esc(THEMEN[k][0]);
    const reason = `Fachlicher Bezug:${e.themen.map(themeHtml).join(',')}` + (e.zg.length ? `; Zielgruppe: ${esc(e.zg.map((k) => ZIELGRUPPEN[k][0]).join(', '))}` : '') + '.';
    const frist = p.regeln.frist ? fmtDate(p.regeln.frist) : p.regeln.noCall ? 'kein offener Aufruf' : 'nicht im Katalog';
    const crit = e.checks.map((c) => `<li class="${c.state}"><span class="ico" aria-label="${c.state}">${ICONS[c.state]}</span><span>${esc(c.text)}</span></li>`).join('');
    const adjusts = e.checks.filter((c) => c.adjust).map((c) => {
      const done = state.accepted.has(c.adjust.key);
      return `<div class="adjust ${done ? 'accepted' : ''}"><p><b>Mögliche Anpassung:</b> ${esc(c.adjust.text)}</p>
        ${done ? '<p>Übernommen.</p>' : `<button type="button" class="send" data-adjust="${esc(c.adjust.key)}">${esc(c.adjust.label)}</button>`}</div>`;
    }).join('');
    const offen = e.checks.filter((c) => c.state === 'offen' || c.state === 'abweichend');
    const steps = [
      offen.length ? `Offene Bedingungen in der Förderquelle prüfen: ${offen.map((c) => esc(c.text.replace(/ (Angabe|Budget|Standort|Projektbeginn|Eigenmittel) noch unbekannt\./, ''))).join(' ')}` : 'Bedingungen in der Förderquelle bestätigen.',
      'Antragsunterlagen zusammenstellen. <span class="open-tag">offen</span> Der Katalog nennt keine Unterlagen; bitte auf der Programmseite prüfen.',
      p.kontakt ? `Ansprechperson im vhs-Verband kontaktieren: ${esc(p.kontakt.name)}, <a href="mailto:${esc(p.kontakt.email)}">${esc(p.kontakt.email)}</a>` : 'Ansprechperson <span class="open-tag">offen</span>',
      p.url ? `Zur offiziellen Programmseite: <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(new URL(p.url).hostname)}</a>` : 'Programmseite <span class="open-tag">Quelle fehlt</span>',
    ];
    return `<article class="card ${e.status}">
      <div class="card-top">
        <div class="card-title"><h3>${esc(p.title)}</h3><div class="giver">${esc(clip(p.foerdergeber, 120))}</div></div>
        <span class="badge ${e.status}">${st.label}</span>
      </div>
      <div class="facts">
        <span><b>Ebene:</b> ${esc(p.ebene || 'k. A.')}</span>
        <span><b>Förderung:</b> ${esc(clip(p.budget || 'nicht im Katalog', 90))}</span>
        <span><b>Frist:</b> ${esc(frist)}</span>
      </div>
      <p class="reason">${reason}</p>
      <ul class="criteria">${crit}</ul>
      ${adjusts}
      ${p.anmerkung ? `<p class="desc"><b>Hinweis aus dem Katalog:</b> ${esc(p.anmerkung)}</p>` : ''}
      <details><summary>Nächste Schritte</summary><ol class="next-steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol></details>
      <details><summary>Programmdetails</summary>
        <p class="desc">${esc(p.kurz)}</p>
        <p class="desc"><b>Projektbudget:</b> ${esc(p.budget || 'nicht im Katalog')}<br><b>Art der Förderung:</b> ${esc(p.art || 'nicht im Katalog')}<br><b>Fachbereich:</b> ${esc(p.fachbereich || 'k. A.')}<br><b>Quelle:</b> <code>${esc(p.quelle)}</code></p>
      </details>
      <div class="links">
        ${p.url ? `<a class="link-primary" href="${esc(p.url)}" target="_blank" rel="noopener">Programmseite ↗</a>` : ''}
        ${p.beispiele ? `<a class="link-secondary" href="${esc(p.beispiele)}" target="_blank" rel="noopener">Projektbeispiele</a>` : ''}
      </div>
    </article>`;
  }

  function renderResults(result) {
    const box = $('#results');
    if (!state.profile.themen.length) {
      box.innerHTML = '<div class="empty-state"><h2>Thema fehlt</h2><p>Ohne Thema kann der Förderfinder keinen fachlichen Bezug prüfen. Beschreiben Sie Ihr Vorhaben genauer oder wählen Sie Themen unter „Bearbeiten“.</p></div>';
      return;
    }
    let html = `<div class="results-head"><h2>Förderprogramme</h2><p>${window.CATALOG.length} Programme im Katalog · sortiert nach Themen- und Zielgruppenbezug</p></div>`;
    if (!result.top.length) {
      html += `<div class="empty-state"><h2>Keine passenden Programme</h2><p>${result.excluded.length ? 'Alle Programme mit Themenbezug scheiden aus. Die Gründe stehen unten.' : 'Kein Programm im Katalog hat Bezug zu den genannten Themen.'}</p></div>`;
    }
    html += result.top.map(card).join('');
    if (result.more.length) {
      html += `<details class="more"><summary>Weitere Programme mit Themenbezug (${result.more.length})</summary><ul>${result.more.map((e) => `<li><b>${esc(e.prog.title)}</b>: ${STATUS[e.status].label}</li>`).join('')}</ul></details>`;
    }
    if (result.excluded.length) {
      html += `<details class="more"><summary>Ausgeschlossen (${result.excluded.length})</summary><ul>${result.excluded.map((e) => `<li><b>${esc(e.prog.title)}</b>: ${e.checks.filter((c) => c.state === 'ausschluss').map((c) => esc(c.text)).join(' ')}</li>`).join('')}</ul></details>`;
    }
    box.innerHTML = html;
  }

  function applyAdjust(key) {
    const all = [...state.lastResult.top, ...state.lastResult.more];
    const c = all.flatMap((e) => e.checks).find((x) => x.adjust && x.adjust.key === key);
    if (!c) return;
    const a = c.adjust.apply;
    for (const [k, v] of Object.entries(a)) {
      if (k === 'partner') Object.entries(v).forEach(([pk, pv]) => { state.profile.partner[pk] = pv; state.sources['partner.' + pk] = 'anpassung'; });
      else { state.profile[k] = v; state.sources[k] = 'anpassung'; }
    }
    state.accepted.add(key);
    addMsg('system', 'Anpassung übernommen: ' + c.adjust.label);
    runAndReply(false);
  }

  // ---------- Ereignisse ----------
  $('#chatForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = $('#chatInput').value;
    $('#chatInput').value = '';
    handleUser(v);
  });
  $('#chatInput').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('#chatForm').requestSubmit(); }
  });
  document.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => {
    state.profile = emptyProfile(); state.sources = {}; state.asked = new Set(); state.accepted = new Set(); state.pending = null;
    $('#messages').innerHTML = '';
    addMsg('system', 'Neue Suche mit Beispieleingabe');
    handleUser(EXAMPLES[+b.dataset.example]);
  }));

  $('#results').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-adjust]');
    if (b) applyAdjust(b.dataset.adjust);
  });

  $('#editProfile').addEventListener('click', () => {
    $('#profileFields').innerHTML = fieldsHtml('edit');
    $('#profileEdit').hidden = false; $('#profileList').hidden = true; $('#editProfile').hidden = true;
  });
  const closeEdit = () => { $('#profileEdit').hidden = true; $('#profileList').hidden = false; $('#editProfile').hidden = false; };
  $('#cancelEdit').addEventListener('click', closeEdit);
  $('#profileEdit').addEventListener('submit', (ev) => {
    ev.preventDefault();
    readForm(ev.target);
    closeEdit();
    addMsg('system', 'Eckdaten korrigiert, Suche erneut ausgeführt');
    runAndReply(false);
  });

  document.querySelectorAll('.mode-switch button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.mode-switch button').forEach((x) => x.setAttribute('aria-selected', x === b));
    const form = b.dataset.mode === 'form';
    $('#chatView').hidden = form;
    $('#formView').hidden = !form;
    if (form) $('#formFields').innerHTML = fieldsHtml('form');
  }));
  $('#formView').addEventListener('submit', (ev) => {
    ev.preventDefault();
    readForm(ev.target);
    state.asked = new Set(['bundesland', 'start', 'budget', ...Object.keys(PARTNER).map((k) => 'partner.' + k)]);
    addMsg('system', 'Suche über den Formularmodus');
    runAndReply(false);
  });

  // Begrüßung
  addMsg('bot', 'Hallo! Beschreiben Sie Ihre Projektidee in ein paar Sätzen: Vorhaben, Zielgruppe, Standort, Budget und geplanter Start. Ich suche passende Förderprogramme aus dem Katalog des vhs-Verbands.');
  renderProfile();
})();
