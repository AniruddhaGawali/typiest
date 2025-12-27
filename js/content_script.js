var MOUSE_VISITED_CLASSNAME = 'crx_mouse_visited';

var prevDOM = null;
var prevClicked = null;
var typingStartTime = null;
var originalText = '';
var statsCard = null;
var statsPosition = 'bottom';
var isEnabled = false;

function parseRGB(color) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function blendTowardWhite([r, g, b], t = 0.5) {
  const nr = Math.round(r + (255 - r) * t);
  const ng = Math.round(g + (255 - g) * t);
  const nb = Math.round(b + (255 - b) * t);
  return `rgba(${nr}, ${ng}, ${nb}, ${t})`;
}

function createStatsCard() {
  if (statsCard) return statsCard;

  statsCard = document.createElement('div');
  statsCard.classList.add('typist-stats-card');
  statsCard.innerHTML = `
    <div class="typist-stats-content">
      <div class="typist-stat">
        <span class="typist-stat-value" id="typist-wpm">0</span>
        <span class="typist-stat-label">WPM</span>
      </div>
      <div class="typist-stat">
        <span class="typist-stat-value" id="typist-accuracy">100</span>
        <span class="typist-stat-label">Accuracy %</span>
      </div>
      <div class="typist-stat">
        <span class="typist-stat-value" id="typist-time">0</span>
        <span class="typist-stat-label">Time (s)</span>
      </div>
      <button class="typist-position-toggle" id="typist-toggle-position" title="Toggle position">
        ↕
      </button>
    </div>
  `;

  document.body.appendChild(statsCard);
  updateStatsPosition();

  const toggleBtn = statsCard.querySelector('#typist-toggle-position');
  toggleBtn.addEventListener('click', toggleStatsPosition);

  return statsCard;
}

function toggleStatsPosition() {
  statsPosition = statsPosition === 'bottom' ? 'top' : 'bottom';
  updateStatsPosition();
}

function updateStatsPosition() {
  if (!statsCard) return;

  statsCard.classList.remove('typist-stats-top', 'typist-stats-bottom');
  statsCard.classList.add(`typist-stats-${statsPosition}`);
}

function updateStatsCard(wpm, accuracy, time) {
  if (!statsCard) createStatsCard();

  const wpmEl = statsCard.querySelector('#typist-wpm');
  const accEl = statsCard.querySelector('#typist-accuracy');
  const timeEl = statsCard.querySelector('#typist-time');

  wpmEl.textContent = wpm;
  accEl.textContent = accuracy;
  timeEl.textContent = time;
}

function showStatsCard() {
  if (!statsCard) createStatsCard();
  statsCard.classList.add('typist-stats-visible');
}

function hideStatsCard() {
  if (statsCard) {
    statsCard.classList.remove('typist-stats-visible');
  }
}

function calculateStats(typed, original) {
  const timeElapsed = (Date.now() - typingStartTime) / 1000;
  const minutes = timeElapsed / 60;

  let correctChars = 0;
  const minLen = Math.min(typed.length, original.length);
  for (let i = 0; i < minLen; i++) {
    if (typed[i] === original[i]) {
      correctChars++;
    }
  }

  const wordsTyped = typed.length / 5;
  const wpm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;

  const accuracy =
    typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

  return { wpm, accuracy, time: Math.round(timeElapsed) };
}

function renderComparison(typed, original, container) {
  container.innerHTML = '';

  for (let i = 0; i < typed.length; i++) {
    const span = document.createElement('span');

    span.textContent = typed[i];

    if (typed[i] === original[i]) {
      span.classList.add('typist-correct');
    } else {
      span.classList.add('typist-error');
    }

    container.appendChild(span);
  }

  for (let i = typed.length; i < original.length; i++) {
    const span = document.createElement('span');
    span.textContent = original[i];
    span.classList.add('typist-pending');
    container.appendChild(span);
  }
}

function onTypingInput(e) {
  const textarea = e.target;
  const typed = textarea.value;

  if (!typingStartTime && typed.length > 0) {
    typingStartTime = Date.now();
    showStatsCard();
  }

  const overlay = textarea.parentElement.querySelector('.typist-overlay');
  if (overlay) {
    renderComparison(typed, originalText, overlay);
  }

  if (typed.length > 0) {
    const stats = calculateStats(typed, originalText);
    updateStatsCard(stats.wpm, stats.accuracy, stats.time);
  }

  if (typed.length === originalText.length) {
    const stats = calculateStats(typed, originalText);

    if (statsCard) {
      statsCard.classList.add('typist-stats-completed');
      setTimeout(() => {
        statsCard.classList.remove('typist-stats-completed');
      }, 2000);
    }
  }
}

function onMatchMouseDown(e) {
  if (!isEnabled) return;

  if (e.currentTarget != prevClicked) {
    const target = e.currentTarget;

    if (prevClicked) {
      const old = prevClicked.querySelector('.typist-input');
      const oldOverlay = prevClicked.querySelector('.typist-overlay');
      if (old) old.remove();
      if (oldOverlay) oldOverlay.remove();
      prevClicked.classList.remove('typist-parent', 'typist-dim');
      prevClicked.style.removeProperty('--typist-original-color');
      prevClicked.style.removeProperty('--typist-dim-color');
    }

    typingStartTime = null;
    originalText = target.innerText.trim();

    updateStatsCard(0, 100, 0);
    showStatsCard();

    target.classList.add('typist-parent');

    const computed = window.getComputedStyle(target).color;
    const rgb = parseRGB(computed);
    const lighter = rgb ? blendTowardWhite(rgb, 0.55) : computed;

    target.style.setProperty('--typist-original-color', computed);
    target.style.setProperty('--typist-dim-color', lighter);
    target.classList.add('typist-dim');

    const overlay = document.createElement('div');
    overlay.classList.add('typist-overlay');
    renderComparison('', originalText, overlay);

    const newInput = document.createElement('textarea');
    newInput.classList.add('typist-input');
    newInput.name = 'dynamicInput';

    newInput.style.color = 'transparent';
    newInput.style.caretColor = computed;

    newInput.addEventListener('input', onTypingInput);

    target.appendChild(overlay);
    target.appendChild(newInput);
    prevClicked = target;

    newInput.focus();
  }
}

function onMouseMove(e) {
  if (!isEnabled) return;

  let srcElement = e.target;
  if (!(srcElement instanceof Element)) return;

  const match = srcElement.closest('p');

  if (match) {
    console.log('Mouse moved', srcElement);
    if (match !== prevDOM) {
      if (prevDOM) {
        prevDOM.classList.remove(MOUSE_VISITED_CLASSNAME);
        prevDOM.removeEventListener('mousedown', onMatchMouseDown);
      }
      match.classList.add(MOUSE_VISITED_CLASSNAME);
      prevDOM = match;
      match.addEventListener('mousedown', onMatchMouseDown);
    }
  }
}

function cleanupTypist() {
  if (prevDOM) {
    prevDOM.classList.remove(MOUSE_VISITED_CLASSNAME);
    prevDOM.removeEventListener('mousedown', onMatchMouseDown);
    prevDOM = null;
  }

  if (prevClicked) {
    const old = prevClicked.querySelector('.typist-input');
    const oldOverlay = prevClicked.querySelector('.typist-overlay');
    if (old) old.remove();
    if (oldOverlay) oldOverlay.remove();
    prevClicked.classList.remove('typist-parent', 'typist-dim');
    prevClicked.style.removeProperty('--typist-original-color');
    prevClicked.style.removeProperty('--typist-dim-color');
    prevClicked = null;
  }

  hideStatsCard();

  typingStartTime = null;
  originalText = '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_TYPIST') {
    isEnabled = message.enabled;

    if (!isEnabled) {
      cleanupTypist();
    }
  }
});

document.addEventListener('mousemove', onMouseMove, false);
