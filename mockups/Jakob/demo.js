const conversation = document.querySelector('#conversation');
const exampleMessages = [...conversation.children].map(message => message.cloneNode(true));
const composer = document.querySelector('#composer');
const input = document.querySelector('#message');
const quickActions = document.querySelector('#quick-actions');
const startButtons = [...quickActions.querySelectorAll('[data-start]')];
const matchContent = document.querySelector('#match-content');
const matchCount = document.querySelector('#match-count');
const emptyMatches = document.querySelector('#empty-matches');
const startDate = document.querySelector('#start-date');
const secondProgram = document.querySelector('#program-two-card');
const secondStatus = document.querySelector('#second-status');
const secondReason = document.querySelector('#second-reason');
const originalStatus = secondStatus.cloneNode(true);
const originalReason = secondReason.cloneNode(true);
const helpDialog = document.querySelector('#help-dialog');

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

function updateMatches(start) {
  const november = start === 'november';
  const hasSecondMatch = start !== 'september';
  matchContent.hidden = false;
  emptyMatches.hidden = true;
  startDate.textContent = november ? 'Start November 2027' : 'Start September 2027';
  matchCount.textContent = hasSecondMatch ? '2 Treffer für Ihr Beispielprojekt' : '1 Treffer für Ihr Beispielprojekt';
  secondProgram.hidden = !hasSecondMatch;
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
}

startButtons.forEach(button => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const start = button.dataset.start;
    startButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    addMessage(button.textContent.trim() + '.', 'user');
    updateMatches(start);
    const reply = start === 'november'
      ? 'Mit dem späteren Termin passen beide Beispielprogramme. In den Details finden Sie die nächsten Schritte.'
      : 'Mit Start im September bleibt „Digital im Alltag“ als passendes Beispielprogramm übrig.';
    addMessage(reply, 'assistant');
  });
});

composer.addEventListener('submit', event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, 'user');
  addMessage('Für eigene Nachrichten zeigt dieser Entwurf den Chat. Laden Sie das Beispiel, um den Ablauf mit Fördertreffern auszuprobieren.', 'assistant');
  input.value = '';
  input.focus();
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
  startButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  matchContent.querySelectorAll('details').forEach(details => { details.open = false; });
  updateMatches();
});

document.querySelector('#show-help').addEventListener('click', () => helpDialog.showModal());
