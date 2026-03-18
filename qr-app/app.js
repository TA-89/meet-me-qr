/* ═══════════════════════════════════════════════════════════
   QR-APP · app.js
   ═══════════════════════════════════════════════════════════ */


/* ╔══════════════════════════════════════════════════════╗
   ║  ⚙️  KONFIGURATION – hier anpassen                   ║
   ╚══════════════════════════════════════════════════════╝ */

// Dein Instagram-Username (ohne @).
// Leer lassen ('') → Instagram-Bereich ausgeblendet.
const INSTAGRAM_USER = '';

// Deine WhatsApp-Nummer (mit Ländervorwahl).
// Wird für "Absenden" (Kontakt) + "Anstossen-Foto" verwendet.
// Leer lassen ('') → Button wird ausgeblendet.
const WHATSAPP_NUMMER = '+41792422034';

// Deine E-Mail als Fallback (nur wenn kein WhatsApp gesetzt).
const MEINE_EMAIL = '';        // z.B. 'tobi@beispiel.com'

/* ╚══════════════════════════════════════════════════════╝ */


const TOTAL = 8;

const state = {
  gender:              null,
  chips:               [],   // alle ausgewählten Chips (alle Gruppen)
  personalityResult:   '',
  personalityConfirmed: null,
  personalityAdd:      '',
  freetext:            '',
  contactType:         null,
  name:                '',
  phone:               '',
};


/* ── INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupInstagram();
  setupDrinkButton();
  goTo(1, true);

  const ta = document.getElementById('freetext');
  if (ta) {
    ta.addEventListener('focus', () => {
      setTimeout(() => ta.scrollIntoView({ behavior: 'smooth', block: 'center' }), 320);
    });
  }
});


/* ── KONFIGURATION: INSTAGRAM ───────────────────────────── */
function setupInstagram() {
  if (!INSTAGRAM_USER) return;
  show('instaBlock');
  const link = document.getElementById('instaLink');
  link.href        = 'https://instagram.com/' + INSTAGRAM_USER;
  link.textContent = '↗ @' + INSTAGRAM_USER;
}

/* ── KONFIGURATION: DRINK-BUTTON ────────────────────────── */
function setupDrinkButton() {
  const btn = document.getElementById('drinkBtn');
  if (!btn) return;
  if (!WHATSAPP_NUMMER && !MEINE_EMAIL) {
    // Kein Kontakt konfiguriert → Button durch Hinweistext ersetzen
    btn.textContent = '🥂 Per WhatsApp (Nummer in app.js eintragen)';
    btn.classList.add('btn-ghost');
    btn.classList.remove('btn-fill');
  }
}


/* ── SCREEN-NAVIGATION ──────────────────────────────────── */
let _currentScreen = 0;

function goTo(n, instant) {
  const prev = document.querySelector('.screen.active');
  if (prev && !instant) {
    prev.classList.add('leaving');
    prev.classList.remove('active');
    setTimeout(() => prev.classList.remove('leaving'), 320);
  } else if (prev) {
    prev.classList.remove('active');
  }
  setTimeout(() => {
    const next = document.getElementById('s' + n);
    if (!next) return;
    next.classList.add('active');
    next.scrollTop = 0;
    _currentScreen = n;
    updateProgress(n);
  }, instant ? 0 : 80);
}

function updateProgress(n) {
  const track = document.getElementById('progressTrack');
  const fill  = document.getElementById('progressFill');
  if (n === 1) {
    track.classList.remove('visible');
  } else {
    track.classList.add('visible');
    fill.style.width = ((n - 1) / (TOTAL - 1) * 100) + '%';
  }
}


/* ── SCREEN 2: GENDER ───────────────────────────────────── */
function selectGender(type) {
  state.gender = type;
  hide('s2-main');
  if (type === 'female')  { show('s2-female-photo'); return; }
  if (type === 'male')    { show('s2-male');   return; }
  if (type === 'other')   { show('s2-other');  return; }
}

function showS2Nein() {
  hide('s2-female-photo');
  show('s2-female-nein');
}


/* ── SCREEN 5: CHIPS (ohne Limit) ──────────────────────── */
function toggleChip(btn) {
  btn.classList.toggle('selected');
  // State aktualisieren: alle selektierten Chips aus allen Gruppen
  state.chips = [...document.querySelectorAll('.chip.selected')]
    .map(c => c.textContent.trim());
}


/* ── SCREEN 5: PERSÖNLICHKEITS-AUSWERTUNG ──────────────── */

// Keyword → Punkte pro Persönlichkeitstyp
const PMAP = {
  'humorvoll':           { funny: 3 },
  'kleines Chaos':       { funny: 2, wild: 1 },
  'spontan':             { wild: 3 },
  'tiefgründig':         { deep: 3 },
  'ruhig':               { cozy: 3 },
  'gute Gespräche':      { deep: 2 },
  'Abenteuer':           { wild: 3 },
  'gemütliche Abende':   { cozy: 3 },
  'zusammen erleben':    { wild: 2 },
  'einfach schauen':     { cozy: 2 },
  'etwas Echtes':        { deep: 3 },
  'schauen, was passiert': { cozy: 2 },
  'jemanden zum Lachen': { funny: 3 },
  'vielleicht genau sowas': { funny: 2, wild: 1 },
  'offen und direkt':    { direct: 3 },
  'erst beobachten':     { deep: 1, cozy: 1 },
  'kommt auf den Vibe':  { wild: 2 },
  'schnell da':          { direct: 2 },
  'lass mich überraschen': { wild: 3 },
  'echter Moment':       { deep: 3 },
  'zusammen lachen':     { funny: 3 },
  'Blick, der bleibt':   { deep: 2, direct: 1 },
  'tiefe Gespräche':     { deep: 3 },
  'gute Energie':        { wild: 1, funny: 1 },
};

const PDESC = {
  funny:  'Du bist die, bei der man automatisch anfängt zu lachen – und das ist wirklich das Schönste.',
  deep:   'Du bist die, mit der Gespräche anfangen und einfach nicht mehr aufhören.',
  wild:   'Du bist die, der man einfach folgen will – egal wohin das führt.',
  cozy:   'Du bist die, in deren Nähe man einfach ankommen und durchatmen kann.',
  direct: 'Du bist die, die weiss, was sie will – und das auch ausstrahlt.',
};

function evaluatePersonality() {
  const scores = { funny: 0, deep: 0, wild: 0, cozy: 0, direct: 0 };
  state.chips.forEach(chip => {
    Object.entries(PMAP).forEach(([key, pts]) => {
      if (chip.includes(key) || key.includes(chip.split(' ')[0])) {
        Object.entries(pts).forEach(([type, val]) => { scores[type] += val; });
      }
    });
  });
  const top = Object.entries(scores).sort(([,a],[,b]) => b - a)[0];
  if (!top || top[1] === 0) {
    return 'Du bist eine Mischung aus allem, was das Leben interessant macht.';
  }
  return PDESC[top[0]] || 'Du bist jemand, den man unbedingt besser kennenlernen sollte.';
}

function showPersonalityResult() {
  // Chips-State finalisieren
  state.chips = [...document.querySelectorAll('.chip.selected')]
    .map(c => c.textContent.trim());

  const result = evaluatePersonality();
  state.personalityResult = result;

  document.getElementById('personalityText').textContent = result;

  hide('s5-questions');
  show('s5-result');

  // Scroll nach oben
  document.getElementById('s5').scrollTop = 0;
}

function confirmPersonality(answer, btn) {
  state.personalityConfirmed = answer;

  // Buttons markieren
  document.querySelectorAll('#personalityConfirmOptions .option-btn')
    .forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Textfeld-Label je nach Antwort
  const label = document.getElementById('addFieldLabel');
  if (answer === 'yes') {
    label.textContent = 'Was würdest du noch ergänzen?';
  } else {
    label.textContent = "Was passt nicht ganz? Schreib's einfach hin.";
  }

  show('personalityAddField');
  show('s5Next');

  setTimeout(() => {
    document.getElementById('s5').scrollTo({ top: 99999, behavior: 'smooth' });
  }, 130);
}


/* ── SCREEN 6: FREITEXT ─────────────────────────────────── */
function saveText() {
  state.freetext = document.getElementById('freetext').value;
}


/* ── SCREEN 7: KONTAKT ──────────────────────────────────── */
function selectContact(type, btn) {
  state.contactType = type;

  document.querySelectorAll('#contactCards .option-btn')
    .forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  ['cr-number', 'cr-direct', 'cr-unsure'].forEach(hide);
  show('cr-' + type);
  show('s7Next');

  setTimeout(() => {
    document.getElementById('s7').scrollTo({ top: 99999, behavior: 'smooth' });
  }, 130);
}

function buildSummary() {
  const lines = [];

  // Chip-Auswahl pro Gruppe
  const groups = [
    { id: 'q1', label: 'Was passt zu ihr' },
    { id: 'q2', label: 'Worauf sie Lust hat' },
    { id: 'q3', label: 'Was sie sucht' },
    { id: 'q4', label: 'Beim Kennenlernen' },
    { id: 'q5', label: 'Was den Funken zündet' },
  ];

  groups.forEach(g => {
    const selected = [...document.querySelectorAll('#' + g.id + ' .chip.selected')]
      .map(c => c.textContent.trim());
    if (selected.length > 0) {
      lines.push('▸ ' + g.label + ': ' + selected.join(', '));
    }
  });

  // Persönlichkeitstyp
  if (state.personalityResult) {
    lines.push('\n💬 Persönlichkeit:\n"' + state.personalityResult + '"');
  }

  // Ergänzung zum Persönlichkeitstyp
  const addText = document.getElementById('personalityAdd')?.value.trim();
  if (addText) {
    lines.push('→ Ergänzung: ' + addText);
  }

  // Freitext
  const freetext = document.getElementById('freetext')?.value.trim();
  if (freetext) {
    lines.push('\n✍️ Warum wir uns kennenlernen sollten:\n"' + freetext + '"');
  }

  return lines.join('\n');
}

function submitContact() {
  const name  = document.getElementById('nameInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();
  state.name  = name;
  state.phone = phone;

  const summary = buildSummary();

  const msg =
    `Hey Tobi! 👋\n` +
    `\nJemand hat deinen QR-Code durchgeklickt 😄\n` +
    `\n👤 Name: ${name || '–'}` +
    `\n📱 Nummer: ${phone || '–'}` +
    (summary ? `\n\n──────────────\n${summary}` : '');

  if (WHATSAPP_NUMMER) {
    window.open(
      'https://wa.me/' + WHATSAPP_NUMMER.replace(/\D/g, '') +
      '?text=' + encodeURIComponent(msg),
      '_blank'
    );
  } else if (MEINE_EMAIL) {
    const subject = encodeURIComponent('QR-Code: ' + (name || 'Jemand') + ' möchte sich vorstellen');
    window.location.href = 'mailto:' + MEINE_EMAIL +
      '?subject=' + subject + '&body=' + encodeURIComponent(msg);
  }

  goTo(8);
}


/* ── SCREEN 7: WEITER-BUTTON (alle Kontakttypen) ────────── */
function proceedFromContact() {
  // Nummer-Fall: Daten wurden bereits via submitContact() gesendet
  if (state.contactType === 'number') {
    goTo(8);
    return;
  }

  // Direkt / Unsicher: Zusammenfassung per WhatsApp senden (ohne Kontaktdaten)
  const summary = buildSummary();
  const label = state.contactType === 'direct'
    ? '😄 Sie spricht dich lieber direkt an.'
    : '🤔 Sie ist sich noch nicht sicher.';

  const msg =
    `Hey Tobi! 👋\n` +
    `\nJemand hat deinen QR-Code durchgeklickt.\n` +
    `\n${label}` +
    (summary ? `\n\n──────────────\n${summary}` : '');

  if (WHATSAPP_NUMMER) {
    window.open(
      'https://wa.me/' + WHATSAPP_NUMMER.replace(/\D/g, '') +
      '?text=' + encodeURIComponent(msg),
      '_blank'
    );
  } else if (MEINE_EMAIL) {
    const subject = encodeURIComponent('QR-Code: Jemand war neugierig');
    window.location.href = 'mailto:' + MEINE_EMAIL +
      '?subject=' + subject + '&body=' + encodeURIComponent(msg);
  }

  goTo(8);
}


/* ── SCREEN 8: ABSCHLUSS ────────────────────────────────── */
function sendDrinkPhoto() {
  if (WHATSAPP_NUMMER) {
    const name = state.name ? state.name : 'ich';
    const msg  = 'Hey Tobi! Ich stosse mit dir an 🥂\n– ' + name;
    window.open(
      'https://wa.me/' + WHATSAPP_NUMMER.replace(/\D/g, '') +
      '?text=' + encodeURIComponent(msg),
      '_blank'
    );
  }
  showThanks();
}

function showThanks() {
  hide('s8-main');
  show('s8-thanks');
  document.getElementById('s8').scrollTop = 0;
}


/* ── HILFSFUNKTIONEN ────────────────────────────────────── */
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden');    }
