/**
 * ============================================================
 *  DFA CHAT MODERATION ENGINE
 *  Academic Finite Automata Simulation — Vanilla JS
 * ============================================================
 *
 *  ARCHITECTURE OVERVIEW
 *  ---------------------
 *  The system models a 4-state DFA to process every message:
 *
 *    States:
 *      q0 → START     : Machine is idle, awaiting input
 *      q1 → SCAN      : Input received, normalization + feature extraction running
 *      q2 → CLASSIFY  : Score accumulation + decision engine active
 *      q3 → ACCEPT    : Final classification emitted (accepting state)
 *
 *    Transitions:
 *      δ(q0, message)          → q1   (message received)
 *      δ(q1, normalizedInput)  → q2   (features extracted)
 *      δ(q2, scoreResult)      → q3   (verdict computed)
 *      δ(q3, reset)            → q0   (system reset for next message)
 *
 *    Accepting State:  q3
 *    Non-Accepting:    q0, q1, q2
 *
 *  Each module (offensive, spam, url) implements its own
 *  sub-DFA or DFA-inspired regex pattern matching.
 * ============================================================
 */

'use strict';

/* ============================================================
   MODULE 1 — NORMALIZER (DFA-based character substitution)
   ============================================================
   Implements a character-level transducer (a DFA with output).
   Each character σ ∈ Σ maps to a canonical form.

   DFA Transducer for symbol normalization:
     Input alphabet  Σ = ASCII characters
     Output alphabet Γ = lowercase a–z + space
     Transitions:
       δ('@')  → 'a'    (leet: @ looks like 'a')
       δ('4')  → 'a'    (leet: 4 looks like 'A')
       δ('3')  → 'e'    (leet: 3 looks like 'E')
       δ('1')  → 'i'    (leet: 1 looks like 'I' or 'l')
       δ('0')  → 'o'    (leet: 0 looks like 'O')
       δ('5')  → 's'    (leet: 5 looks like 'S')
       δ('$')  → 's'    (leet: $ looks like 'S')
       δ('!')  → 'i'    (leet: ! looks like 'I')
       δ('+')  → 't'    (leet: + can represent 'T')
       δ(other letter) → lowercase(letter)
   Post-transduction:
       Consecutive duplicate chars compressed → single char
       (handles "heeeeello" → "helo", "loooool" → "lol")
 ============================================================ */

/**
 * SYMBOL MAP — leet/obfuscation character table
 * @type {Object.<string, string>}
 */
const SYMBOL_MAP = {
  '@': 'a', '4': 'a', '3': 'e', '1': 'i',
  '0': 'o', '5': 's', '$': 's', '!': 'i',
  '+': 't', '7': 't', '8': 'b', '6': 'g',
  '(': 'c', ')': 'o', '*': 'a', '^': 'a',
  '%': 'o', '&': 'a', '#': 'h',
};

/**
 * normalizeText()
 * Runs the DFA transducer over input string.
 * q0 = reading, q1 = mapped, q2 = compressed (all internal states).
 *
 * @param {string} input
 * @returns {string} normalized lowercase string with repeated chars collapsed
 */
function normalizeText(input) {
  // Pass 1 — DFA transducer: map each symbol to canonical char
  let mapped = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i].toLowerCase();
    mapped += (SYMBOL_MAP[ch] !== undefined) ? SYMBOL_MAP[ch] : ch;
  }

  // Pass 2 — Repeated character compression
  // DFA states: q0 (no char seen), q1 (reading run of same char)
  // Transition: stay in q1 while input[i] === lastChar, else emit + q0
  let compressed = '';
  let lastChar = '';
  let runLen = 0;
  for (let i = 0; i < mapped.length; i++) {
    if (mapped[i] === lastChar) {
      runLen++;
      // Allow max 1 repeat to preserve intentional doubles (e.g. "football")
      if (runLen <= 2) compressed += mapped[i];
    } else {
      compressed += mapped[i];
      lastChar = mapped[i];
      runLen = 1;
    }
  }

  return compressed;
}

/* ============================================================
   MODULE 2 — OFFENSIVE CONTENT DETECTOR (DFA Word Matching)
   ============================================================
   Implements substring DFA pattern matching over normalized text.

   Conceptual DFA per banned word w = w1 w2 ... wn:
     States: q0, q1, ..., qn  (n+1 states per word)
     Transitions:
       δ(qi, w_{i+1}) → q_{i+1}   (partial match advances)
       δ(qi, other)   → q0        (mismatch resets)
     Accepting state: qn (full word matched)

   In practice, we run all patterns against the normalized
   string using indexOf (equivalent to running parallel DFAs).
 ============================================================ */

/**
 * Banned word list (post-normalization patterns)
 * These are matched against the normalized (de-leet-ified) text.
 */
/* ============================================================
   MODULE 2 — OFFENSIVE CONTENT DETECTOR (FIXED)
   ============================================================ */

/**
 * CENSOR FUNCTION (FEATURE #2)
 * Masks middle characters based on word length
 */
function censorWord(word) {
  const len = word.length;

  if (len <= 2) return word;

  const first = word[0];
  const last = word[len - 1];

  if (len <= 4) {
    return first + '*'.repeat(len - 2) + last;
  }

  return first + '*'.repeat(len - 2) + last;
}

/**
 * FIXED BANNED WORD LIST (removed syntax error)
 */
const BANNED_WORDS = [
  'kill', 'murder', 'stab', 'shoot', 'bomb', 'explode',
  'slaughter', 'massacre', 'assassinate',

  'hate', 'racist', 'sexist', 'faggot', 'nigger', 'retard',

  'idiot', 'moron', 'stupid', 'dumbass', 'scum',
  'freak', 'psycho',

  'fuck', 'shit', 'bitch', 'bastard', 'crap', 'damn', 'hell'
];

/**
 * OFFENSIVE DETECTOR (FIXED)
 * - no substring matching
 * - punctuation-safe
 * - censorship enabled
 */
function detectOffensive(normalized, original) {
  const reasons = [];
  let score = 0;

  for (const banned of BANNED_WORDS) {

    // Create SAFE pattern:
    // - no substring matches
    // - no fake matches from normalization artifacts
    const pattern = new RegExp(
      `(^|[^a-z])${banned}([^a-z]|$)`,
      'i'
    );

    if (pattern.test(original)) {
      const censored = censorWord(banned);

      score += 70;
      reasons.push({
        text: `Offensive word detected: "${censored}"`,
        severity: 'high',
        points: 70
      });
    }
  }

  return { score, reasons };
}
/* ============================================================
   MODULE 3 — SPAM DETECTOR (Multi-Feature DFA Analysis)
   ============================================================
   Five sub-DFAs, each scanning for a spam feature:

   3a. Uppercase DFA
       States: q0 (normal), q1 (uppercase run)
       Transition: δ(q0, UPPER) → q1; δ(q1, UPPER) → q1 (extend run)
       Accept: ratio of uppercase chars > threshold

   3b. Repeated Punctuation DFA
       States: q0 (no punct), q1 (punct seen), q2 (repeated punct)
       Transition: δ(q0, PUNCT) → q1; δ(q1, SAME_PUNCT) → q2
       Accept: q2 (3+ same punctuation in a row)

   3c. Repeated Word DFA
       Input: token stream (words array)
       States: q0 (no word), q1 (word seen once), q2 (word repeated)
       Accept: q2 (same word appears 3+ times)

   3d. Spam Keyword DFA
       Pattern match over multi-word phrases (bigrams/trigrams)
       Accept: any known spam phrase found

   3e. Repeated Char DFA
       Already handled by compressor — if compressed form still has
       doubled chars that are suspicious, flag it.
 ============================================================ */

/** Spam keyword phrases (post-normalization) */
const SPAM_KEYWORDS = [
  'free money', 'click now', 'click here', 'urgent',
  'limited offer', 'act now', 'winner', 'you won',
  'claim your', 'verify account', 'bank account',
  'password', 'send money', 'wire transfer', 'gift card',
  'make money fast', 'work from home', 'earn cash',
  'amazing deal', 'risk free', 'guaranteed',
  'no credit', 'double your', '100 percent',
  'subscribe now', 'unsubscribe', 'click below',
  'prize', 'lottery', 'jackpot', 'casino',
  'discount', 'coupon', 'promo code', 'buy now',
  'congratulations', 'selected', 'chosen',
];

/**
 * detectSpam()
 * @param {string} normalized
 * @param {string} original
 * @returns {{ score: number, reasons: Array }}
 */
function detectSpam(normalized, original) {
  const reasons = [];
  let score = 0;

  // --- 3a. Uppercase Ratio DFA ---
  const letters = original.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 5) {
    const upperCount = (original.match(/[A-Z]/g) || []).length;
    const ratio = upperCount / letters.length;
    if (ratio > 0.7) {
      const pts = ratio > 0.9 ? 20 : 10;
      score += pts;
      reasons.push({ text: `Excessive uppercase: ${Math.round(ratio * 100)}% of letters`, severity: 'medium', points: pts });
    }
  }

  // --- 3b. Repeated Punctuation DFA ---
  // States: q0 → q1 (punct seen) → q2 (3+ in a row, accepting)
  const punctMatches = original.match(/([!?$#*@%&]{3,})/g);
  if (punctMatches) {
    score += 15;
    reasons.push({ text: `Repeated punctuation: "${punctMatches[0]}"`, severity: 'medium', points: 15 });
  }

  // --- 3c. Repeated Words DFA ---
  const tokens = normalized.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const wordFreq = {};
  for (const t of tokens) {
    wordFreq[t] = (wordFreq[t] || 0) + 1;
  }
  for (const [word, count] of Object.entries(wordFreq)) {
    if (count >= 3) {
      score += 15;
      reasons.push({ text: `Word repeated ${count}× : "${word}"`, severity: 'medium', points: 15 });
    }
  }

  // --- 3d. Spam Keyword DFA ---
  for (const phrase of SPAM_KEYWORDS) {
    if (normalized.includes(phrase)) {
      score += 25;
      reasons.push({ text: `Spam phrase: "${phrase}"`, severity: 'medium', points: 25 });
    }
  }

  // --- 3e. Repeated Characters (post-normalization) ---
  // If normalized still shows 3+ repeated chars (slipped through), flag it
  const repeatedChar = normalized.match(/(.)\1{2,}/g);
  if (repeatedChar) {
    score += 15;
    reasons.push({ text: `Repeated chars: "${repeatedChar[0]}"`, severity: 'low', points: 15 });
  }

  return { score, reasons };
}

/* ============================================================
   MODULE 4 — URL / LINK DETECTOR (Regex + DFA hybrid)
   ============================================================
   URL detection modeled as a DFA over character sequences:

   States:
     q0 → START
     q1 → PROTOCOL_SEEN   (http/https/www detected)
     q2 → DOMAIN_READING  (reading domain characters)
     q3 → TLD_SEEN        (accepting: .com/.net/etc. matched)
     q4 → SHORTLINK_SEEN  (accepting: known shortener detected)

   Transitions:
     δ(q0, 'http'|'https'|'www') → q1
     δ(q1, alphanum|'.')         → q2
     δ(q2, '.com'|'.net'|...)    → q3  (ACCEPT)
     δ(q0, 'bit.ly'|'t.me'|...) → q4  (ACCEPT)

   In implementation, we use compiled regex equivalents of
   these DFA transitions for O(n) matching.
 ============================================================ */

/**
 * URL detection patterns — each regex corresponds to a DFA
 * transition arc that reaches an accepting state.
 */
const URL_PATTERNS = [
  // Protocol-prefixed URLs → q1 → q2 → q3
  /https?:\/\/[^\s]+/gi,
  // www. prefix → q1 → q2 → q3
  /\bwww\.[a-z0-9\-]+\.[a-z]{2,}\b/gi,
  // Bare domain with known TLDs → q2 → q3
  /\b[a-z0-9\-]+\.(com|net|org|io|gg|ly|me|tv|co|uk|info|biz)\b/gi,
  // Known URL shorteners → q4 (direct accepting transition)
  /\b(bit\.ly|t\.me|tinyurl\.com|goo\.gl|ow\.ly|buff\.ly|is\.gd|rebrand\.ly|tr\.im)\b/gi,
];

/**
 * detectURLs()
 * @param {string} original  — use original (not normalized) to catch http://
 * @returns {{ score: number, reasons: Array }}
 */
function detectURLs(original) {
  const reasons = [];
  let score = 0;
  const found = new Set();

  for (const pattern of URL_PATTERNS) {
    const matches = original.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (!found.has(m)) {
          found.add(m);
          found.add(m);
let urlScore = 0;

for (const pattern of URL_PATTERNS) {
  const matches = original.match(pattern);

  if (matches) {
    for (const m of matches) {
      if (!found.has(m)) {
        found.add(m);

        const isShortener =
          /bit\.ly|t\.me|tinyurl|goo\.gl/.test(m);

        const isSuspiciousPath =
          /login|verify|update|secure|bank|password/i.test(m);

        let severity = 'low';
        let points = 5; 

        if (isShortener) {
          points = 25;
          severity = 'high';
        }

        if (isSuspiciousPath) {
          points += 25;
          severity = 'high';
        }

        urlScore += points;

        reasons.push({
          text: `URL detected: "${m.slice(0, 40)}"`,
          severity,
          points
        });
      }
    }
  }
}
          score += 40;
          reasons.push({ text: `URL/Link detected: "${m.slice(0, 40)}"`, severity: 'high', points: 40 });
        }
      }
    }
  }

  return { score, reasons };
}

/* ============================================================
   MODULE 5 — DECISION ENGINE
   ============================================================
   Aggregates scores from all module outputs.
   Implements weighted classification with defined thresholds.

   Classification DFA:
     States: q0 (SAFE), q1 (SUSPICIOUS), q2 (BLOCKED)
     Input: total score S ∈ ℤ+

     Transitions (score-based):
       δ(q0,  S ∈ [0,29])  → q0   (SAFE — accepting)
       δ(q0,  S ∈ [30,69]) → q1   (SUSPICIOUS — accepting)
       δ(q0,  S ≥ 70)      → q2   (BLOCKED — accepting)

     All states are accepting (every message gets classified).
     The accepting state determines the final verdict.
 ============================================================ */

/**
 * classifyScore()
 * @param {number} score
 * @returns {'safe'|'suspicious'|'blocked'}
 */
function classifyScore(score) {
  if (score >= 70) return 'blocked';
  if (score >= 30) return 'suspicious';
  return 'safe';
}

/**
 * analyzeMessage()
 * Main orchestrator — runs all modules and aggregates results.
 * @param {string} rawInput
 * @returns {{ classification, score, reasons, normalized, moduleScores }}
 */
function analyzeMessage(rawInput) {
  // DFA Transition: q0 → q1 (SCAN phase begins)
  const normalized = normalizeText(rawInput);

  // DFA Transition: q1 → q2 (CLASSIFY phase — run all modules)
  const offensiveResult = detectOffensive(normalized, rawInput);
  const spamResult      = detectSpam(normalized, rawInput);
  const urlResult       = detectURLs(rawInput);

  // Aggregate — cap individual module contributions to prevent
  // absurdly high scores from repetition (max 140 per module)
  const offScore = Math.min(offensiveResult.score, 140);
  const spamScore = Math.min(spamResult.score, 80);
  const urlScore  = Math.min(urlResult.score, 80);
  const totalScore = offScore + spamScore + urlScore;

  const allReasons = [
    ...offensiveResult.reasons,
    ...spamResult.reasons,
    ...urlResult.reasons,
  ];

  // DFA Transition: q2 → q3 (ACCEPT — verdict emitted)
  const classification = classifyScore(totalScore);

  return {
    classification,
    score: totalScore,
    reasons: allReasons,
    normalized,
    moduleScores: {
      'Offensive': offScore,
      'Spam':      spamScore,
      'URL/Link':  urlScore,
    },
  };
}

/* ============================================================
   UI CONTROLLER
   Manages DOM updates and DFA state animation
 ============================================================ */

/** State references */
const history = [];

/** DFA node animation sequence */
function animateDFA(classification) {
  const nodes = ['node-q0', 'node-q1', 'node-q2', 'node-q3'];
  const labels = [
    'Awaiting input…',
    'Normalizing & scanning input…',
    'Running classification engine…',
    `Verdict: ${classification.toUpperCase()}`
  ];
  const doneClass = `done-${classification}`;

  // Reset all nodes
  nodes.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'dfa-node';
  });

  // Animate through states with delays
  nodes.forEach((id, idx) => {
    setTimeout(() => {
      // Deactivate previous
      if (idx > 0) {
        const prev = document.getElementById(nodes[idx - 1]);
        prev.classList.remove('active');
        if (idx === nodes.length - 1) {
          // All previous nodes get done class
          for (let i = 0; i < idx; i++) {
            document.getElementById(nodes[i]).classList.add(doneClass);
          }
        } else {
          prev.classList.add(doneClass);
        }
      }

      const el = document.getElementById(id);
      el.classList.add('active');

      const transLabel = document.getElementById('dfa-transition');
      transLabel.textContent = labels[idx];

      // Final state styling
      if (idx === nodes.length - 1) {
        setTimeout(() => {
          el.classList.remove('active');
          el.classList.add(doneClass);
        }, 600);
      }
    }, idx * 500);
  });
}

/** Render the result panel */
function renderResult(result, rawInput) {
  const { classification, score, reasons, normalized, moduleScores } = result;

  // Show result output, hide idle
  document.getElementById('result-idle').classList.add('hidden');
  const output = document.getElementById('result-output');
  output.classList.remove('hidden');

  // Verdict badge
  const badge = document.getElementById('verdict-badge');
  badge.className = `verdict-badge ${classification}`;
  const icons = { safe: '✅', suspicious: '⚠️', blocked: '⛔' };
  document.getElementById('verdict-icon').textContent = icons[classification];
  document.getElementById('verdict-text').textContent = classification.toUpperCase();

  // Score bar
  const cappedPct = Math.min(score, 100);
  const fill = document.getElementById('score-bar-fill');
  document.getElementById('score-value').textContent = score;
  fill.style.width = '0%';
  fill.className = `score-bar-fill ${classification}`;
  setTimeout(() => { fill.style.width = cappedPct + '%'; }, 50);

  // Issues list
  const list = document.getElementById('issues-list');
  const noIssues = document.getElementById('no-issues');
  list.innerHTML = '';

  if (reasons.length === 0) {
    noIssues.classList.remove('hidden');
  } else {
    noIssues.classList.add('hidden');
    reasons.forEach(r => {
      const li = document.createElement('li');
      li.className = `issue-item ${r.severity}`;
      li.innerHTML = `
        <span>${r.text}</span>
        <span class="issue-score">+${r.points}</span>
      `;
      list.appendChild(li);
    });
  }

  // Normalized text
  document.getElementById('norm-text').textContent = normalized || '(empty)';

  // Module breakdown
  const grid = document.getElementById('breakdown-grid');
  grid.innerHTML = '';
  for (const [module, pts] of Object.entries(moduleScores)) {
    const card = document.createElement('div');
    card.className = 'breakdown-card';
    card.innerHTML = `
      <div class="breakdown-module">${module}</div>
      <div class="breakdown-score ${pts > 0 ? 'has-score' : ''}">+${pts}</div>
    `;
    grid.appendChild(card);
  }

  // Total card
  const totalCard = document.createElement('div');
  totalCard.className = 'breakdown-card';
  totalCard.style.borderColor = classification === 'blocked' ? 'var(--danger)' :
                                  classification === 'suspicious' ? 'var(--warn)' : 'var(--safe)';
  totalCard.innerHTML = `
    <div class="breakdown-module">Total Score</div>
    <div class="breakdown-score has-score">${score}</div>
  `;
  grid.appendChild(totalCard);
}

/** Add bubble to chat window */
function addChatBubble(text, classification) {
  const win = document.getElementById('chat-window');
  const placeholder = document.getElementById('chat-placeholder');
  if (placeholder) placeholder.remove();

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'flex-end';

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${classification}`;
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'chat-bubble-meta';
  const icons = { safe: '✅ Safe', suspicious: '⚠️ Suspicious', blocked: '⛔ Blocked' };
  meta.textContent = icons[classification];

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  win.appendChild(wrap);
  win.scrollTop = win.scrollHeight;
}

/** Add to history panel */
function addHistoryItem(rawInput, result) {
  const { classification, score } = result;
  history.unshift({ rawInput, result });

  const panel = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-dot ${classification}"></div>
    <div class="history-msg">${rawInput}</div>
    <span class="history-verdict ${classification}">${classification.toUpperCase()}</span>
    <span class="history-score">${score}</span>
  `;
  panel.insertBefore(item, panel.firstChild);
}

/* ============================================================
   EVENT LISTENERS
 ============================================================ */

document.getElementById('btn-analyze').addEventListener('click', () => {
  const input = document.getElementById('msg-input').value.trim();
  if (!input) return;

  // Animate DFA through states
  const result = analyzeMessage(input);
  animateDFA(result.classification);

  // Stagger UI updates to sync with DFA animation (4 × 500ms = 2000ms)
  setTimeout(() => {
    addChatBubble(input, result.classification);
    renderResult(result, input);
    addHistoryItem(input, result);
    document.getElementById('msg-input').value = '';
  }, 2100);
});

/** Allow Enter key to submit (Shift+Enter for new line) */
document.getElementById('msg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('btn-analyze').click();
  }
});

/** Clear textarea and reset result panel */
document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('msg-input').value = '';
  document.getElementById('result-idle').classList.remove('hidden');
  document.getElementById('result-output').classList.add('hidden');

  // Reset DFA nodes
  ['node-q0','node-q1','node-q2','node-q3'].forEach(id => {
    document.getElementById(id).className = 'dfa-node';
  });
  document.getElementById('dfa-transition').textContent = 'Awaiting input…';
});

/** Clear history */
document.getElementById('btn-clear-history').addEventListener('click', () => {
  const panel = document.getElementById('history-list');
  panel.innerHTML = '<div class="history-empty" id="history-empty">No history yet. Analyze a message to begin.</div>';
  history.length = 0;
});

/** Live character count hint on textarea */
document.getElementById('msg-input').addEventListener('input', function() {
  this.style.borderColor = this.value.length > 0 ? 'var(--accent-dim)' : '';
});
