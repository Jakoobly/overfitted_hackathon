const conversation = document.querySelector('#conversation');
const exampleMessages = [...conversation.children].map(message => message.cloneNode(true));
const composer = document.querySelector('#composer');
const input = document.querySelector('#message');
const quickActions = document.querySelector('#quick-actions');
const startButtons = [...quickActions.querySelectorAll('[data-start]')];
const matchContent = document.querySelector('#match-content');
const programs = [...matchContent.querySelectorAll('.program')].map(card => ({
  card,
  title: document.getElementById(card.getAttribute('aria-labelledby')).textContent,
  regions: card.dataset.regions.split(' '),
  button: card.querySelector('.program-select')
}));
const matchCount = document.querySelector('#match-count');
const emptyMatches = document.querySelector('#empty-matches');
const region = document.querySelector('#project-region');
const startDate = document.querySelector('#start-date');
const chatContext = document.querySelector('#chat-context');
const contextProgram = document.querySelector('#context-program');
const secondProgram = document.querySelector('#program-two-card');
const secondStatus = document.querySelector('#second-status');
const secondReason = document.querySelector('#second-reason');
const originalStatus = secondStatus.cloneNode(true);
const originalReason = secondReason.cloneNode(true);
const helpDialog = document.querySelector('#help-dialog');
let selectedProgram = null;
let projectStart;

function addMessage(text, sender) {
  const message = document.createElement('div');
  message.className = `message message-${sender}`;
  const speaker = document.createElement('p');
  speaker.className = 'speaker';
  speaker.textContent = sender === 'user' ? 'Sie' : 'Förderfinder';
  const bubble = document.createElement('p');
  bubble.className = 'bubble';
  bubble.textContent = text;

  if (sender === 'assistant') {
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = 'vhs';
    const content = document.createElement('div');
    content.append(speaker, bubble);
    message.append(avatar, content);
  } else {
    message.append(speaker, bubble);
  }

  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
}

function setProgramContext(program) {
  if (selectedProgram) {
    selectedProgram.button.removeAttribute('aria-current');
    selectedProgram.button.textContent = 'Antrag vorbereiten';
  }
  selectedProgram = program;
  chatContext.hidden = !program;
  contextProgram.textContent = program?.title ?? '';
  if (program) {
    program.button.setAttribute('aria-current', 'true');
    program.button.textContent = 'Im Chat ausgewählt';
  }
}

function programDetail(program, field) {
  return program.card.querySelector(`[data-program-field="${field}"]`).textContent;
}

function nextStep(program) {
  if (program.card === secondProgram && projectStart !== 'november') {
    return 'Klären Sie zuerst, ob Ihr Kurs im November 2027 starten kann.';
  }
  return programDetail(program, 'next');
}

function answerProgramQuestion(program, question) {
  const name = `„${program.title}“`;
  if (/unterlag|dokument|nachweis|checkliste/i.test(question)) {
    return `${name} verlangt folgende Unterlagen. ${programDetail(program, 'documents')}`;
  }
  if (/voraussetz|wer darf|eigenanteil|eigenmittel|partner|gebiet|standort|beginn|start/i.test(question)) {
    return `Für ${name} gelten diese Voraussetzungen. ${programDetail(program, 'eligibility')} ${nextStep(program)}`;
  }
  if (/budget|finanz|kosten|fördersumme|förderfähig|honorar/i.test(question)) {
    return `Bei ${name} können folgende Ausgaben gefördert werden. ${programDetail(program, 'scope')}`;
  }
  if (/frist|einsendeschluss|bis wann/i.test(question)) {
    return `Für ${name} ist im Beispielkatalog keine Antragsfrist angegeben. ${nextStep(program)}`;
  }
  return `${name} empfiehlt diesen ersten Schritt. ${nextStep(program)} Im Demo-Chat können Sie auch nach Unterlagen, Voraussetzungen oder förderfähigen Kosten fragen.`;
}

function updateMatches() {
  const november = projectStart === 'november';
  matchContent.hidden = false;
  emptyMatches.hidden = true;
  startDate.textContent = november ? 'Start November 2027' : 'Start September 2027';
  for (const {card, regions} of programs) {
    const matchesRegion = regions.includes('all') || regions.includes(region.value);
    card.hidden = !matchesRegion || (card === secondProgram && projectStart === 'september');
  }
  secondProgram.classList.toggle('program-fit', november);
  secondProgram.classList.toggle('program-near', !november);
  secondStatus.className = november ? 'status status-fit' : originalStatus.className;
  if (november) {
    secondStatus.textContent = '✓ Passend nach Datenlage';
    secondReason.textContent = 'Mit Kursstart im November erfüllt Ihr Projekt die Startbedingung.';
  } else {
    secondStatus.replaceChildren(...[...originalStatus.childNodes].map(node => node.cloneNode(true)));
    secondReason.replaceChildren(...[...originalReason.childNodes].map(node => node.cloneNode(true)));
  }
  const count = programs.filter(({card}) => !card.hidden).length;
  matchCount.textContent = `${count} Treffer für Ihr Beispielprojekt`;
  const removedProgram = selectedProgram?.card.hidden ? selectedProgram.title : '';
  if (removedProgram) setProgramContext(null);
  return {count, removedProgram};
}

for (const program of programs) {
  program.button.addEventListener('click', () => {
    if (selectedProgram !== program) {
      setProgramContext(program);
      addMessage(`Ich möchte den Antrag für „${program.title}“ vorbereiten.`, 'user');
      addMessage(`Wir besprechen jetzt „${program.title}“. ${nextStep(program)} Sie können hier nach den benötigten Unterlagen fragen.`, 'assistant');
    }
    input.focus();
  });
}

region.addEventListener('change', () => {
  const {count, removedProgram} = updateMatches();
  const location = region.selectedOptions[0].textContent;
  const contextNote = removedProgram ? ` „${removedProgram}“ entfällt und ist nicht mehr im Chat ausgewählt.` : '';
  addMessage(`Der Projektstandort ist jetzt ${location}. Die Liste zeigt ${count} Treffer.${contextNote}`, 'assistant');
});

startButtons.forEach(button => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    projectStart = button.dataset.start;
    startButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    addMessage(button.textContent.trim() + '.', 'user');
    const {count, removedProgram} = updateMatches();
    const reply = projectStart === 'november'
      ? `Mit dem späteren Termin erfüllt Ihr Projekt auch die Startbedingung für „Lernorte digital“. Die Trefferliste umfasst ${count} Programme.`
      : `„Lernorte digital“ entfällt bei einem Start im September. ${count} andere Treffer bleiben sichtbar.`;
    addMessage(removedProgram ? `${reply} Die Programmauswahl im Chat ist aufgehoben.` : reply, 'assistant');
  });
});

composer.addEventListener('submit', event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, 'user');
  input.value = '';
  input.focus();
  if (selectedProgram) {
    addMessage(answerProgramQuestion(selectedProgram, message), 'assistant');
    return;
  }
  addMessage('Für eigene Nachrichten zeigt dieser Entwurf den Chat. Laden Sie das Beispiel, um den Ablauf mit Fördertreffern auszuprobieren.', 'assistant');
  quickActions.hidden = true;
  matchContent.hidden = true;
  emptyMatches.hidden = false;
  matchCount.textContent = 'Beispielprojekt erforderlich';
});

document.querySelector('#load-example').addEventListener('click', () => {
  conversation.replaceChildren(...exampleMessages.map(message => message.cloneNode(true)));
  conversation.scrollTop = 0;
  input.value = '';
  quickActions.hidden = false;
  projectStart = undefined;
  region.value = 'bw';
  setProgramContext(null);
  startButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  matchContent.querySelectorAll('details').forEach(details => { details.open = false; });
  updateMatches();
});

document.querySelector('#show-help').addEventListener('click', () => helpDialog.showModal());
updateMatches();
