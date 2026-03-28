/* ========================================
   SCHATZSUCHE — GPS Treasure Hunt for Kids
   Full Application Logic
   ======================================== */

// ===== STATE MANAGEMENT =====
const state = {
  currentScreen: 'home',
  theme: 'pirates',
  players: [{ name: '' }],
  treasureCount: 3,
  areas: [], // saved areas
  selectedAreaIndex: -1,
  // Game state
  currentPlayerIndex: 0,
  treasures: [],
  foundTreasures: [],
  startTime: 0,
  elapsed: 0,
  timerInterval: null,
  results: [],
  gpsWatchId: null,
  userPosition: null,
  gpsAccuracy: null,
  nearestTreasureDistance: Infinity,
  // Area editor state
  editingArea: null,
  editorCorners: [],
  editorMap: null,
  editorMarkers: [],
  editorPolygon: null,
  // Game map
  gameMap: null,
  gameUserMarker: null,
  gameAreaPolygon: null,
};

// ===== THEMES =====
const THEMES = [
  { id: 'pirates', name: 'Piraten', icon: '🏴‍☠️', bg: '#1a1a2e' },
  { id: 'jungle', name: 'Dschungel', icon: '🌴', bg: '#1b2d1b' },
  { id: 'space', name: 'Weltraum', icon: '🚀', bg: '#0d0d2b' },
  { id: 'underwater', name: 'Unterwasser', icon: '🐙', bg: '#0a1628' },
  { id: 'dino', name: 'Dinosaurier', icon: '🦕', bg: '#2d1b00' },
];

const THEME_TREASURES = {
  pirates: { emoji: '💰', name: 'Goldschatz', namePlural: 'Goldschätze', found: '🏴‍☠️', hint_cold: 'Brrr... eiskalt!', hint_warm: 'Es wird wärmer!', hint_hot: 'Heiß! Fast da!', hint_very_hot: 'HIER GRABEN!', collect: 'Schatz einsammeln!' },
  jungle: { emoji: '💎', name: 'Edelstein', namePlural: 'Edelsteine', found: '🦜', hint_cold: 'Der Dschungel schweigt...', hint_warm: 'Die Vögel singen lauter!', hint_hot: 'So nah! Die Tiere zeigen den Weg!', hint_very_hot: 'GEFUNDEN! Greif zu!', collect: 'Edelstein aufheben!' },
  space: { emoji: '⭐', name: 'Stern', namePlural: 'Sterne', found: '👽', hint_cold: 'Stille im All...', hint_warm: 'Signale werden stärker!', hint_hot: 'Starke Strahlung! Ganz nah!', hint_very_hot: 'STERN ENTDECKT!', collect: 'Stern einsammeln!' },
  underwater: { emoji: '🐚', name: 'Muschel', namePlural: 'Muscheln', found: '🧜', hint_cold: 'Tiefes, kaltes Wasser...', hint_warm: 'Blasen steigen auf!', hint_hot: 'Es glitzert in der Tiefe!', hint_very_hot: 'DA! Eine magische Muschel!', collect: 'Muschel tauchen!' },
  dino: { emoji: '🦴', name: 'Dino-Knochen', namePlural: 'Dino-Knochen', found: '🦖', hint_cold: 'Keine Spuren hier...', hint_warm: 'Fußabdrücke im Boden!', hint_hot: 'Der Boden bebt! Ganz nah!', hint_very_hot: 'AUSGEGRABEN!', collect: 'Knochen ausgraben!' },
};

const PLAYER_COLORS = ['#e94560', '#4ecdc4', '#f5a623', '#7c4dff', '#00e676', '#ff80ab', '#536dfe', '#ffab00'];

// ===== AUDIO =====
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch (type) {
      case 'click':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'success':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'treasure':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.15);
        osc.frequency.linearRampToValueAtTime(1318, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.setValueAtTime(0.25, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        // Additional sparkle
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 1760;
        gain2.gain.setValueAtTime(0.1, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.6);
        break;
      case 'beep-cold':
        osc.frequency.value = 300;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'beep-warm':
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'beep-hot':
        osc.frequency.value = 900;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'victory':
        const notes = [523, 659, 784, 1046, 784, 1046];
        notes.forEach((freq, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g);
          g.connect(audioCtx.destination);
          o.type = 'sine';
          o.frequency.value = freq;
          const t = now + i * 0.15;
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          o.start(t);
          o.stop(t + 0.3);
        });
        break;
    }
  } catch (e) { /* audio failed silently */ }
}

// ===== GPS HELPERS =====
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const a1 = lat1 * Math.PI / 180;
  const a2 = lat2 * Math.PI / 180;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function isPointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function getPolygonBounds(corners) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  corners.forEach(c => {
    minLat = Math.min(minLat, c[0]);
    maxLat = Math.max(maxLat, c[0]);
    minLng = Math.min(minLng, c[1]);
    maxLng = Math.max(maxLng, c[1]);
  });
  return { minLat, maxLat, minLng, maxLng };
}

function generateTreasuresInArea(corners, count) {
  const bounds = getPolygonBounds(corners);
  const treasures = [];
  let attempts = 0;
  while (treasures.length < count && attempts < 1000) {
    const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
    const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
    if (isPointInPolygon([lat, lng], corners)) {
      // Min distance between treasures: 5m
      const tooClose = treasures.some(t => getDistance(lat, lng, t.lat, t.lng) < 5);
      if (!tooClose) {
        treasures.push({ lat, lng, found: false });
      }
    }
    attempts++;
  }
  return treasures;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters) {
  if (meters < 1) return '< 1m';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ===== CONFETTI =====
function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#ffd700', '#e94560', '#4ecdc4', '#f5a623', '#7c4dff', '#00e676', '#ff80ab'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
}

// ===== AREA STORAGE (in-memory with URL hash backup) =====
function saveAreas() {
  // We cannot use localStorage in sandboxed iframes.
  // Areas are kept in memory during the session.
  // For persistence, we could use a server endpoint, but for now memory is fine.
}

function loadAreas() {
  // Return empty — areas created this session only
  return [];
}

// ===== SCREEN RENDERING =====
function showScreen(screenId) {
  state.currentScreen = screenId;
  render();
}

function render() {
  const app = document.getElementById('app');
  document.body.setAttribute('data-theme', state.theme);

  // For screens with maps, destroy map before re-rendering
  if (state.currentScreen === 'area-editor' && state.editorMap) {
    state.editorMap.remove();
    state.editorMap = null;
    state.editorMarkers = [];
  }
  if (state.currentScreen === 'game' && state.gameMap) {
    state.gameMap.remove();
    state.gameMap = null;
  }

  switch (state.currentScreen) {
    case 'home': app.innerHTML = renderHome(); break;
    case 'setup': app.innerHTML = renderSetup(); break;
    case 'areas': app.innerHTML = renderAreas(); break;
    case 'area-editor': app.innerHTML = renderAreaEditor(); break;
    case 'pre-game': app.innerHTML = renderPreGame(); break;
    case 'game': app.innerHTML = renderGame(); break;
    case 'player-done': app.innerHTML = renderPlayerDone(); break;
    case 'results': app.innerHTML = renderResults(); break;
  }

  // Re-init maps if needed
  if (state.currentScreen === 'area-editor') {
    setTimeout(() => initEditorMap(), 100);
  }
  if (state.currentScreen === 'game') {
    setTimeout(() => initGameMap(), 100);
  }
}

// ===== HOME SCREEN =====
function renderHome() {
  const t = THEMES.find(t => t.id === state.theme);
  return `
    <div class="screen active screen-padded section-gap" style="justify-content: center; align-items: center;">
      <div class="animate-float" style="font-size: 5rem;">${t.icon}</div>
      <h1 class="title-xl">Schatzsuche</h1>
      <p class="subtitle">Finde die versteckten Schätze!</p>

      <div class="theme-grid" style="width: 100%; max-width: 400px; margin-top: var(--space-4);">
        ${THEMES.map(theme => `
          <div class="theme-card ${state.theme === theme.id ? 'selected' : ''}"
               style="background: ${theme.bg};"
               onclick="selectTheme('${theme.id}')">
            <span class="theme-icon">${theme.icon}</span>
            <span class="theme-label">${theme.name}</span>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-3); width: 100%; max-width: 400px; margin-top: var(--space-4);">
        <button class="btn btn-primary btn-lg btn-full" onclick="goToSetup()">
          🎮 Neues Spiel
        </button>
        <button class="btn btn-secondary btn-full" onclick="goToAreas()">
          📍 Spielbereiche
        </button>
      </div>
    </div>
  `;
}

// ===== SETUP SCREEN =====
function renderSetup() {
  const hasArea = state.areas.length > 0;
  const selectedArea = state.selectedAreaIndex >= 0 ? state.areas[state.selectedAreaIndex] : null;

  return `
    <div class="screen active screen-padded section-gap">
      <div class="flex-between">
        <button class="btn btn-ghost" onclick="goHome()">← Zurück</button>
        <h2 class="title-md">Neues Spiel</h2>
        <div style="width: 80px;"></div>
      </div>

      <div class="scroll-y section-gap" style="padding-bottom: var(--space-8);">
        <!-- Area Selection -->
        <div class="card section-gap gap-sm">
          <span class="label">📍 Spielbereich</span>
          ${hasArea ? `
            <div class="area-list">
              ${state.areas.map((area, i) => `
                <div class="area-card ${state.selectedAreaIndex === i ? 'selected' : ''}" onclick="selectArea(${i})">
                  <span class="area-icon">📍</span>
                  <div class="area-info">
                    <div class="area-name">${area.name}</div>
                    <div class="area-meta">${area.corners.length} Ecken</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-ghost" onclick="goToAreas()" style="align-self: flex-start;">+ Neuen Bereich erstellen</button>
          ` : `
            <div class="empty-state" style="padding: var(--space-6);">
              <span class="empty-icon">📍</span>
              <p style="color: var(--text-secondary);">Erstelle zuerst einen Spielbereich</p>
              <button class="btn btn-primary" onclick="goToAreas()">Bereich erstellen</button>
            </div>
          `}
        </div>

        <!-- Treasure Count -->
        <div class="card section-gap gap-sm">
          <span class="label">${THEME_TREASURES[state.theme].emoji} Anzahl Schätze</span>
          <div class="stepper">
            <button class="stepper-btn" onclick="changeTreasureCount(-1)">−</button>
            <span class="stepper-value">${state.treasureCount}</span>
            <button class="stepper-btn" onclick="changeTreasureCount(1)">+</button>
          </div>
        </div>

        <!-- Players -->
        <div class="card section-gap gap-sm">
          <span class="label">👥 Spieler</span>
          <div class="player-list">
            ${state.players.map((p, i) => `
              <div class="player-row">
                <div class="player-avatar" style="background: ${PLAYER_COLORS[i % PLAYER_COLORS.length]};">
                  ${i + 1}
                </div>
                <input class="input" type="text" placeholder="Name Spieler ${i + 1}"
                       value="${p.name}" onchange="updatePlayerName(${i}, this.value)"
                       onfocus="initAudio()">
                ${state.players.length > 1 ? `
                  <button class="player-remove" onclick="removePlayer(${i})">✕</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
          ${state.players.length < 8 ? `
            <button class="btn btn-ghost" onclick="addPlayer()" style="align-self: flex-start;">+ Spieler hinzufügen</button>
          ` : ''}
        </div>
      </div>

      <!-- Start Button -->
      <button class="btn btn-primary btn-lg btn-full ${!hasArea || state.selectedAreaIndex < 0 || state.players.some(p => !p.name.trim()) ? 'disabled' : ''}"
              onclick="startGame()"
              ${!hasArea || state.selectedAreaIndex < 0 || state.players.some(p => !p.name.trim()) ? 'disabled' : ''}>
        🎯 Spiel starten!
      </button>
    </div>
  `;
}

// ===== AREAS SCREEN =====
function renderAreas() {
  return `
    <div class="screen active screen-padded section-gap">
      <div class="flex-between">
        <button class="btn btn-ghost" onclick="goHome()">← Zurück</button>
        <h2 class="title-md">Spielbereiche</h2>
        <div style="width: 80px;"></div>
      </div>

      <div class="scroll-y section-gap">
        ${state.areas.length > 0 ? `
          <div class="area-list">
            ${state.areas.map((area, i) => `
              <div class="area-card">
                <span class="area-icon">📍</span>
                <div class="area-info">
                  <div class="area-name">${area.name}</div>
                  <div class="area-meta">${area.corners.length} Ecken</div>
                </div>
                <div class="area-actions">
                  <button class="btn btn-ghost" onclick="editArea(${i})" style="font-size: 1.2rem;">✏️</button>
                  <button class="btn btn-ghost" onclick="deleteArea(${i})" style="font-size: 1.2rem; color: var(--danger);">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <span class="empty-icon">🗺️</span>
            <p class="title-md">Noch keine Bereiche</p>
            <p style="color: var(--text-secondary);">Erstelle einen Bereich, in dem die Schätze versteckt werden.</p>
          </div>
        `}
      </div>

      <button class="btn btn-primary btn-lg btn-full" onclick="createNewArea()">
        + Neuen Bereich erstellen
      </button>
    </div>
  `;
}

// ===== AREA EDITOR =====
function renderAreaEditor() {
  const corners = state.editorCorners;
  const isNew = state.editingArea === null;
  const areaName = isNew ? '' : state.areas[state.editingArea].name;

  return `
    <div class="screen active" style="padding: 0; display: flex; flex-direction: column;">
      <div style="padding: var(--space-3); padding-top: calc(env(safe-area-inset-top, 0px) + var(--space-3)); background: var(--bg-secondary); z-index: 10;">
        <div class="flex-between" style="margin-bottom: var(--space-3);">
          <button class="btn btn-ghost" onclick="cancelAreaEditor()">← Abbrechen</button>
          <h3 class="title-md">${isNew ? 'Neuer Bereich' : 'Bereich bearbeiten'}</h3>
          <div style="width: 80px;"></div>
        </div>
        <div class="area-name-input-wrap">
          <input class="input" id="area-name-input" type="text" placeholder="Name des Bereichs (z.B. Garten)"
                 value="${areaName}" onfocus="initAudio()">
        </div>
        <div style="margin-top: var(--space-2); display: flex; justify-content: space-between; align-items: center;">
          <span class="gps-status">
            <span class="gps-dot ${state.userPosition ? 'active' : ''}" id="gps-dot"></span>
            <span id="gps-text">${state.userPosition ? 'GPS aktiv' : 'GPS wird gesucht...'}</span>
          </span>
          <span id="corner-count" style="font-size: 0.85rem; color: var(--text-secondary);">${corners.length} Ecken</span>
        </div>
      </div>

      <div class="map-container flex-1" id="editor-map-container">
        <div id="editor-map" style="width: 100%; height: 100%;"></div>
      </div>

      <div class="editor-bottom-bar" style="padding: var(--space-3); padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-3)); background: var(--bg-secondary); display: flex; gap: var(--space-3); z-index: 10;">
        <button class="btn btn-secondary flex-1" onclick="addCornerAtPosition()">
          📌 Ecke setzen
        </button>
        ${corners.length > 0 ? `
          <button class="btn btn-ghost" onclick="removeLastCorner()" style="color: var(--danger);">
            ↩️ Rückgängig
          </button>
        ` : ''}
        ${corners.length >= 3 ? `
          <button class="btn btn-primary flex-1" onclick="saveArea()">
            ✅ Speichern
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ===== PRE-GAME =====
function renderPreGame() {
  const player = state.players[state.currentPlayerIndex];
  const color = PLAYER_COLORS[state.currentPlayerIndex % PLAYER_COLORS.length];
  const theme = THEME_TREASURES[state.theme];

  return `
    <div class="screen active screen-padded" style="justify-content: center; align-items: center; gap: var(--space-6);">
      <div class="animate-float" style="font-size: 4rem;">${theme.emoji}</div>
      <div class="player-avatar" style="width: 80px; height: 80px; font-size: 2.5rem; background: ${color};">
        ${state.currentPlayerIndex + 1}
      </div>
      <h2 class="title-lg">${player.name}</h2>
      <p class="subtitle">Finde ${state.treasureCount} ${state.treasureCount === 1 ? theme.name : theme.namePlural}!</p>
      <p style="color: var(--text-secondary); text-align: center; font-size: 0.9rem;">
        Spieler ${state.currentPlayerIndex + 1} von ${state.players.length}
      </p>
      <button class="btn btn-primary btn-lg" onclick="startPlayerRound()">
        🏁 Los geht's!
      </button>
    </div>
  `;
}

// ===== GAME SCREEN =====
function renderGame() {
  const player = state.players[state.currentPlayerIndex];
  const color = PLAYER_COLORS[state.currentPlayerIndex % PLAYER_COLORS.length];
  const theme = THEME_TREASURES[state.theme];
  const foundCount = state.foundTreasures.length;
  const total = state.treasureCount;
  const nearest = getNearestUnfoundTreasure();
  const dist = nearest ? nearest.distance : Infinity;
  const heatLevel = getHeatLevel(dist);

  return `
    <div class="screen active" style="padding: 0;">
      <!-- Map -->
      <div id="game-map" style="width: 100%; height: 100%;"></div>

      <!-- HUD -->
      <div class="game-hud">
        <div class="hud-top">
          <div class="hud-player-info" style="border-left: 4px solid ${color};">
            <span class="hud-player-name">${player.name}</span>
          </div>
          <div class="hud-timer" id="game-timer">${formatTime(state.elapsed)}</div>
          <div class="hud-treasures">
            ${theme.emoji} ${foundCount}/${total}
          </div>
        </div>

        <!-- Compass at bottom -->
        <div style="flex: 1;"></div>

        ${nearest ? `
          <div class="compass-container" id="compass-container">
            <div class="compass-outer ${heatLevel}" id="compass-outer">
              <div class="compass-arrow-wrap" id="compass-arrow" style="transform: rotate(${nearest.bearing}deg);">
                <svg viewBox="0 0 100 100" class="compass-arrow-svg">
                  <polygon points="50,8 62,55 50,48 38,55" fill="var(--treasure-color)" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
                  <polygon points="50,92 62,55 50,62 38,55" fill="var(--text-secondary)" opacity="0.4" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
                  <circle cx="50" cy="55" r="6" fill="var(--bg-card)" stroke="var(--treasure-color)" stroke-width="2"/>
                </svg>
              </div>
              ${heatLevel === 'very-hot' ? `<div class="compass-treasure-icon">${theme.emoji}</div>` : ''}
            </div>
            <div class="compass-info">
              <div class="compass-distance" id="compass-distance">${formatDistance(dist)}</div>
              <div class="compass-hint" id="compass-hint" style="color: var(--${heatLevel === 'cold' ? 'cold' : heatLevel === 'warm' ? 'warm' : heatLevel === 'hot' ? 'hot' : 'treasure'}-color);">
                ${theme['hint_' + heatLevel.replace('-', '_')]}
              </div>
            </div>
          </div>
          ${dist < 5 ? `
            <div class="collect-btn-wrap">
              <button class="collect-btn" onclick="collectTreasure(${nearest.index})">${theme.collect}</button>
            </div>
          ` : ''}
        ` : ''}
      </div>

      <!-- Pause/Quit Button -->
      <button class="btn btn-icon btn-ghost back-btn" onclick="quitGame()" style="background: var(--bg-card); box-shadow: var(--shadow-md);">
        ✕
      </button>
    </div>
  `;
}

// ===== PLAYER DONE =====
function renderPlayerDone() {
  const player = state.players[state.currentPlayerIndex];
  const color = PLAYER_COLORS[state.currentPlayerIndex % PLAYER_COLORS.length];
  const time = state.elapsed;
  const isLast = state.currentPlayerIndex >= state.players.length - 1;

  return `
    <div class="screen active screen-padded" style="justify-content: center; align-items: center; gap: var(--space-6);">
      <div class="animate-bounce-in" style="font-size: 5rem;">${THEME_TREASURES[state.theme].found}</div>
      <h2 class="title-lg">Super gemacht!</h2>
      <div class="player-avatar" style="width: 60px; height: 60px; font-size: 1.8rem; background: ${color};">
        ${state.currentPlayerIndex + 1}
      </div>
      <p class="title-md">${player.name}</p>
      <div class="card" style="text-align: center;">
        <p class="label">Deine Zeit</p>
        <p style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums;">
          ${formatTime(time)}
        </p>
      </div>
      <button class="btn btn-primary btn-lg" onclick="nextPlayer()">
        ${isLast ? '🏆 Ergebnisse anzeigen' : `▶️ Nächster Spieler`}
      </button>
    </div>
  `;
}

// ===== RESULTS =====
function renderResults() {
  const sorted = [...state.results].sort((a, b) => a.time - b.time);
  const medals = ['🥇', '🥈', '🥉'];

  return `
    <div class="screen active screen-padded section-gap" style="justify-content: center;">
      <h2 class="title-xl">🏆 Ergebnis</h2>

      ${sorted.length >= 2 ? `
        <div class="results-podium">
          ${sorted.length >= 2 ? `
            <div class="podium-place animate-slide-in" style="animation-delay: 0.2s;">
              <span class="podium-rank">🥈</span>
              <span class="podium-name">${sorted[1].name}</span>
              <span class="podium-time">${formatTime(sorted[1].time)}</span>
              <div class="podium-bar second"></div>
            </div>
          ` : ''}
          <div class="podium-place animate-slide-in" style="animation-delay: 0.1s;">
            <span class="podium-rank">🥇</span>
            <span class="podium-name">${sorted[0].name}</span>
            <span class="podium-time">${formatTime(sorted[0].time)}</span>
            <div class="podium-bar first"></div>
          </div>
          ${sorted.length >= 3 ? `
            <div class="podium-place animate-slide-in" style="animation-delay: 0.3s;">
              <span class="podium-rank">🥉</span>
              <span class="podium-name">${sorted[2].name}</span>
              <span class="podium-time">${formatTime(sorted[2].time)}</span>
              <div class="podium-bar third"></div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="result-list">
        ${sorted.map((r, i) => `
          <div class="result-row animate-slide-in" style="animation-delay: ${i * 0.1}s;">
            <span class="result-rank">${i < 3 ? medals[i] : (i + 1) + '.'}</span>
            <span class="result-name">${r.name}</span>
            <span class="result-time">${formatTime(r.time)}</span>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
        <button class="btn btn-primary btn-lg btn-full" onclick="rematch()">🔄 Nochmal spielen</button>
        <button class="btn btn-secondary btn-full" onclick="goHome()">🏠 Hauptmenü</button>
      </div>
    </div>
  `;
}

// ===== GAME LOGIC =====
function getHeatLevel(distance) {
  if (distance <= 5) return 'very-hot';
  if (distance <= 15) return 'hot';
  if (distance <= 40) return 'warm';
  return 'cold';
}

function getDirectionEmoji(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return '⬆️';
  if (bearing >= 22.5 && bearing < 67.5) return '↗️';
  if (bearing >= 67.5 && bearing < 112.5) return '➡️';
  if (bearing >= 112.5 && bearing < 157.5) return '↘️';
  if (bearing >= 157.5 && bearing < 202.5) return '⬇️';
  if (bearing >= 202.5 && bearing < 247.5) return '↙️';
  if (bearing >= 247.5 && bearing < 292.5) return '⬅️';
  return '↖️';
}

function getNearestUnfoundTreasure() {
  if (!state.userPosition) return null;
  let nearest = null;
  let minDist = Infinity;
  state.treasures.forEach((t, i) => {
    if (t.found) return;
    const d = getDistance(state.userPosition.lat, state.userPosition.lng, t.lat, t.lng);
    if (d < minDist) {
      minDist = d;
      const b = getBearing(state.userPosition.lat, state.userPosition.lng, t.lat, t.lng);
      nearest = { index: i, distance: d, bearing: b, lat: t.lat, lng: t.lng };
    }
  });
  return nearest;
}

let lastBeepTime = 0;
let lastHeatLevel = '';

function updateGameUI() {
  if (state.currentScreen !== 'game') return;

  const timerEl = document.getElementById('game-timer');
  if (timerEl) timerEl.textContent = formatTime(state.elapsed);

  const nearest = getNearestUnfoundTreasure();
  if (!nearest) return;

  const heatLevel = getHeatLevel(nearest.distance);

  // Play beep based on heat level
  const now = Date.now();
  let beepInterval;
  switch (heatLevel) {
    case 'very-hot': beepInterval = 300; break;
    case 'hot': beepInterval = 800; break;
    case 'warm': beepInterval = 2000; break;
    default: beepInterval = 5000;
  }

  if (now - lastBeepTime > beepInterval) {
    if (heatLevel === 'very-hot') playSound('beep-hot');
    else if (heatLevel === 'hot') playSound('beep-hot');
    else if (heatLevel === 'warm') playSound('beep-warm');
    else playSound('beep-cold');
    lastBeepTime = now;
  }

  // Smoothly update compass arrow rotation
  const arrowEl = document.getElementById('compass-arrow');
  if (arrowEl && nearest) {
    arrowEl.style.transform = `rotate(${nearest.bearing}deg)`;
  }

  // Update compass outer ring heat class
  const compassOuter = document.getElementById('compass-outer');
  if (compassOuter) {
    compassOuter.className = 'compass-outer ' + heatLevel;
  }

  // Update distance display
  const distEl = document.getElementById('compass-distance');
  if (distEl && nearest) distEl.textContent = formatDistance(nearest.distance);

  // Update hint text and collect button when heat level changes
  if (heatLevel !== lastHeatLevel) {
    lastHeatLevel = heatLevel;
    const theme = THEME_TREASURES[state.theme];
    
    const hintEl = document.getElementById('compass-hint');
    if (hintEl) {
      hintEl.textContent = theme['hint_' + heatLevel.replace('-', '_')];
      const colorVar = heatLevel === 'cold' ? 'cold' : heatLevel === 'warm' ? 'warm' : heatLevel === 'hot' ? 'hot' : 'treasure';
      hintEl.style.color = `var(--${colorVar}-color)`;
    }
    
    // Handle collect button
    let collectWrap = document.querySelector('.collect-btn-wrap');
    if (nearest.distance < 5 && !collectWrap) {
      collectWrap = document.createElement('div');
      collectWrap.className = 'collect-btn-wrap';
      collectWrap.innerHTML = `<button class="collect-btn" onclick="collectTreasure(${nearest.index})">${theme.collect}</button>`;
      document.querySelector('.game-hud').appendChild(collectWrap);
    } else if (nearest.distance >= 5 && collectWrap) {
      collectWrap.remove();
    }
  }
}

// ===== SATELLITE MAP STYLE =====
// Google satellite tiles with 4 parallel servers for fast loading.
// Source maxzoom 21 — Google serves tiles up to ~21 in populated areas (Europe).
// Map maxZoom 22 allows MapLibre to overzoom if needed.
const SATELLITE_STYLE = {
  version: 8,
  name: 'Satellite',
  sources: {
    'satellite': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      maxzoom: 21
    }
  },
  layers: [
    {
      id: 'satellite-tiles',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 23
    }
  ]
};

// ===== MAP INITIALIZATION =====
function initEditorMap() {
  const container = document.getElementById('editor-map');
  if (!container || state.editorMap) return;

  const center = state.userPosition
    ? [state.userPosition.lng, state.userPosition.lat]
    : [16.3738, 48.2082]; // Vienna default

  state.editorMap = new maplibregl.Map({
    container: 'editor-map',
    style: SATELLITE_STYLE,
    center: center,
    zoom: 21,
    maxZoom: 22,
    attributionControl: false,
  });

  state.editorMap.on('load', () => {
    // Add polygon source
    state.editorMap.addSource('area-polygon', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }
    });
    state.editorMap.addLayer({
      id: 'area-fill',
      type: 'fill',
      source: 'area-polygon',
      paint: { 'fill-color': '#ffff00', 'fill-opacity': 0.15 }
    });
    state.editorMap.addLayer({
      id: 'area-outline',
      type: 'line',
      source: 'area-polygon',
      paint: { 'line-color': '#ffff00', 'line-width': 3 }
    });

    // Draw existing corners
    updateEditorPolygon();
    state.editorCorners.forEach((c, i) => addEditorMarker(c, i));

    // User location
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    state.editorMap.addControl(geolocate);
    setTimeout(() => geolocate.trigger(), 500);
  });

  // Tap to add corner
  state.editorMap.on('click', (e) => {
    const corner = [e.lngLat.lat, e.lngLat.lng];
    state.editorCorners.push(corner);
    addEditorMarker(corner, state.editorCorners.length - 1);
    updateEditorPolygon();
    // Update UI without destroying map
    updateEditorUI();
  });
}

function updateEditorUI() {
  // Update corner count
  const countSpan = document.querySelector('[data-corner-count]');
  // Update bottom bar without destroying map
  const bottomBar = document.querySelector('.editor-bottom-bar');
  if (bottomBar) {
    const corners = state.editorCorners;
    bottomBar.innerHTML = `
      <button class="btn btn-secondary flex-1" onclick="addCornerAtPosition()">
        \u{1F4CC} Ecke setzen
      </button>
      ${corners.length > 0 ? `
        <button class="btn btn-ghost" onclick="removeLastCorner()" style="color: var(--danger);">
          \u21A9\uFE0F R\u00FCckg\u00E4ngig
        </button>
      ` : ''}
      ${corners.length >= 3 ? `
        <button class="btn btn-primary flex-1" onclick="saveArea()">
          \u2705 Speichern
        </button>
      ` : ''}
    `;
  }
  // Update corner count text
  const cornerCountEl = document.getElementById('corner-count');
  if (cornerCountEl) cornerCountEl.textContent = state.editorCorners.length + ' Ecken';
}

function addEditorMarker(corner, index) {
  if (!state.editorMap) return;
  const el = document.createElement('div');
  el.className = 'corner-marker';

  const marker = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([corner[1], corner[0]])
    .addTo(state.editorMap);

  marker.on('dragend', () => {
    const lngLat = marker.getLngLat();
    state.editorCorners[index] = [lngLat.lat, lngLat.lng];
    updateEditorPolygon();
  });

  state.editorMarkers.push(marker);
}

function updateEditorPolygon() {
  if (!state.editorMap || !state.editorMap.getSource('area-polygon')) return;
  const coords = state.editorCorners.map(c => [c[1], c[0]]);
  if (coords.length >= 3) {
    coords.push(coords[0]); // Close polygon
  }
  state.editorMap.getSource('area-polygon').setData({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: coords.length >= 3 ? [coords] : [[]] }
  });
}

function initGameMap() {
  const container = document.getElementById('game-map');
  if (!container || state.gameMap) return;

  const area = state.areas[state.selectedAreaIndex];
  const bounds = getPolygonBounds(area.corners);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;

  // Calculate the LngLatBounds for fitBounds
  const mapBounds = new maplibregl.LngLatBounds(
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat]
  );

  state.gameMap = new maplibregl.Map({
    container: 'game-map',
    style: SATELLITE_STYLE,
    center: [centerLng, centerLat],
    zoom: 21,
    maxZoom: 22,
    attributionControl: false,
  });

  state.gameMap.on('load', () => {
    // Area polygon
    const coords = area.corners.map(c => [c[1], c[0]]);
    coords.push(coords[0]);
    state.gameMap.addSource('game-area', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }
    });
    state.gameMap.addLayer({
      id: 'game-area-fill',
      type: 'fill',
      source: 'game-area',
      paint: { 'fill-color': '#ffff00', 'fill-opacity': 0.12 }
    });
    state.gameMap.addLayer({
      id: 'game-area-outline',
      type: 'line',
      source: 'game-area',
      paint: { 'line-color': '#ffff00', 'line-width': 3, 'line-dasharray': [3, 2] }
    });

    // Show found treasures
    state.treasures.forEach((t, i) => {
      if (t.found) {
        const el = document.createElement('div');
        el.style.fontSize = '1.5rem';
        el.textContent = THEME_TREASURES[state.theme].emoji;
        el.style.opacity = '0.4';
        new maplibregl.Marker({ element: el })
          .setLngLat([t.lng, t.lat])
          .addTo(state.gameMap);
      }
    });

    // Geolocate
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    state.gameMap.addControl(geolocate);
    setTimeout(() => geolocate.trigger(), 300);
  });
}

// ===== EVENT HANDLERS =====
function selectTheme(id) {
  initAudio();
  playSound('click');
  state.theme = id;
  render();
}

function goToSetup() {
  initAudio();
  playSound('click');
  showScreen('setup');
}

function goToAreas() {
  initAudio();
  playSound('click');
  showScreen('areas');
}

function goHome() {
  initAudio();
  playSound('click');
  stopGpsWatch();
  clearGameState();
  showScreen('home');
}

function selectArea(index) {
  initAudio();
  playSound('click');
  state.selectedAreaIndex = index;
  render();
}

function changeTreasureCount(delta) {
  initAudio();
  playSound('click');
  state.treasureCount = Math.max(1, Math.min(20, state.treasureCount + delta));
  render();
}

function addPlayer() {
  initAudio();
  playSound('click');
  state.players.push({ name: '' });
  render();
}

function removePlayer(index) {
  initAudio();
  playSound('click');
  state.players.splice(index, 1);
  render();
}

function updatePlayerName(index, name) {
  state.players[index].name = name;
}

// Area Editor
function createNewArea() {
  initAudio();
  playSound('click');
  state.editingArea = null;
  state.editorCorners = [];
  state.editorMap = null;
  state.editorMarkers = [];
  startGpsWatch();
  showScreen('area-editor');
}

function editArea(index) {
  initAudio();
  playSound('click');
  state.editingArea = index;
  state.editorCorners = [...state.areas[index].corners];
  state.editorMap = null;
  state.editorMarkers = [];
  startGpsWatch();
  showScreen('area-editor');
}

function deleteArea(index) {
  initAudio();
  state.areas.splice(index, 1);
  if (state.selectedAreaIndex >= state.areas.length) {
    state.selectedAreaIndex = state.areas.length - 1;
  }
  saveAreas();
  render();
}

function cancelAreaEditor() {
  state.editorMap = null;
  state.editorMarkers = [];
  state.editorCorners = [];
  stopGpsWatch();
  showScreen('areas');
}

function addCornerAtPosition() {
  initAudio();
  playSound('click');
  if (!state.userPosition) {
    // If no GPS, add at map center
    if (state.editorMap) {
      const center = state.editorMap.getCenter();
      const corner = [center.lat, center.lng];
      state.editorCorners.push(corner);
      addEditorMarker(corner, state.editorCorners.length - 1);
      updateEditorPolygon();
      updateEditorUI();
    }
    return;
  }
  const corner = [state.userPosition.lat, state.userPosition.lng];
  state.editorCorners.push(corner);
  addEditorMarker(corner, state.editorCorners.length - 1);
  updateEditorPolygon();
  updateEditorUI();
  // Pan map to user position
  if (state.editorMap) {
    state.editorMap.panTo([state.userPosition.lng, state.userPosition.lat]);
  }
}

function removeLastCorner() {
  initAudio();
  playSound('click');
  if (state.editorCorners.length > 0) {
    state.editorCorners.pop();
    const marker = state.editorMarkers.pop();
    if (marker) marker.remove();
    updateEditorPolygon();
    updateEditorUI();
  }
}

function saveArea() {
  initAudio();
  playSound('success');
  const nameInput = document.getElementById('area-name-input');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    nameInput.style.borderColor = 'var(--danger)';
    nameInput.placeholder = 'Bitte einen Namen eingeben!';
    return;
  }
  if (state.editorCorners.length < 3) return;

  const area = {
    name: name,
    corners: [...state.editorCorners],
    created: Date.now(),
  };

  if (state.editingArea !== null) {
    state.areas[state.editingArea] = area;
  } else {
    state.areas.push(area);
    state.selectedAreaIndex = state.areas.length - 1;
  }

  saveAreas();
  state.editorMap = null;
  state.editorMarkers = [];
  stopGpsWatch();
  showScreen('areas');
}

// Game
function startGame() {
  initAudio();
  playSound('success');
  if (state.selectedAreaIndex < 0) return;
  if (state.players.some(p => !p.name.trim())) return;

  state.currentPlayerIndex = 0;
  state.results = [];

  // Generate treasures
  const area = state.areas[state.selectedAreaIndex];
  state.treasures = generateTreasuresInArea(area.corners, state.treasureCount);

  if (state.treasures.length < state.treasureCount) {
    // Area might be too small — warn
    state.treasureCount = state.treasures.length;
  }

  showScreen('pre-game');
}

function startPlayerRound() {
  initAudio();
  playSound('click');

  // Reset treasures for this player
  state.treasures.forEach(t => t.found = false);
  state.foundTreasures = [];
  state.elapsed = 0;
  state.gameMap = null;
  lastHeatLevel = '';
  lastBeepTime = 0;

  startGpsWatch();
  startTimer();
  showScreen('game');
}

function startTimer() {
  state.startTime = Date.now();
  state.elapsed = 0;
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.elapsed = (Date.now() - state.startTime) / 1000;
    updateGameUI();
  }, 250);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function collectTreasure(index) {
  initAudio();
  playSound('treasure');
  state.treasures[index].found = true;
  state.foundTreasures.push(index);

  // Show found treasure on map
  if (state.gameMap) {
    const t = state.treasures[index];
    const el = document.createElement('div');
    el.style.fontSize = '2rem';
    el.textContent = THEME_TREASURES[state.theme].emoji;
    el.style.animation = 'bounceIn 0.5s var(--ease-bounce)';
    new maplibregl.Marker({ element: el })
      .setLngLat([t.lng, t.lat])
      .addTo(state.gameMap);
  }

  showConfetti();

  // Check if all found
  const allFound = state.treasures.every(t => t.found);
  if (allFound) {
    setTimeout(() => {
      playSound('victory');
      stopTimer();
      stopGpsWatch();
      state.results.push({
        name: state.players[state.currentPlayerIndex].name,
        time: state.elapsed,
        playerIndex: state.currentPlayerIndex,
      });
      state.gameMap = null;
      showScreen('player-done');
    }, 1500);
  } else {
    // Update treasure count without re-render
    lastHeatLevel = ''; // Force heat update
    setTimeout(() => {
      const treasureCountEl = document.querySelector('.hud-treasures');
      if (treasureCountEl) {
        const theme = THEME_TREASURES[state.theme];
        treasureCountEl.innerHTML = `${theme.emoji} ${state.foundTreasures.length}/${state.treasureCount}`;
      }
      // Remove collect button
      const collectWrap = document.querySelector('.collect-btn-wrap');
      if (collectWrap) collectWrap.remove();
    }, 800);
  }
}

function nextPlayer() {
  initAudio();
  playSound('click');
  state.currentPlayerIndex++;

  if (state.currentPlayerIndex >= state.players.length) {
    // All players done
    showConfetti();
    showScreen('results');
  } else {
    // Re-generate treasure positions for fairness
    const area = state.areas[state.selectedAreaIndex];
    state.treasures = generateTreasuresInArea(area.corners, state.treasureCount);
    showScreen('pre-game');
  }
}

function quitGame() {
  initAudio();
  stopTimer();
  stopGpsWatch();
  clearGameState();
  showScreen('home');
}

function rematch() {
  initAudio();
  playSound('click');
  state.currentPlayerIndex = 0;
  state.results = [];
  const area = state.areas[state.selectedAreaIndex];
  state.treasures = generateTreasuresInArea(area.corners, state.treasureCount);
  showScreen('pre-game');
}

function clearGameState() {
  state.gameMap = null;
  state.editorMap = null;
  state.editorMarkers = [];
  state.editorCorners = [];
  stopTimer();
}

// ===== GPS WATCH =====
function startGpsWatch() {
  stopGpsWatch();
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return;
  }

  state.gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.userPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      state.gpsAccuracy = pos.coords.accuracy;

      // Update GPS status indicator
      const dot = document.getElementById('gps-dot');
      const text = document.getElementById('gps-text');
      if (dot) dot.classList.add('active');
      if (text) text.textContent = `GPS aktiv (±${Math.round(state.gpsAccuracy)}m)`;
    },
    (err) => {
      console.warn('GPS error:', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    }
  );
}

function stopGpsWatch() {
  if (state.gpsWatchId !== null) {
    navigator.geolocation.clearWatch(state.gpsWatchId);
    state.gpsWatchId = null;
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  state.areas = loadAreas();
  render();
});

// Expose functions to window for onclick handlers
window.selectTheme = selectTheme;
window.goToSetup = goToSetup;
window.goToAreas = goToAreas;
window.goHome = goHome;
window.selectArea = selectArea;
window.changeTreasureCount = changeTreasureCount;
window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.updatePlayerName = updatePlayerName;
window.createNewArea = createNewArea;
window.editArea = editArea;
window.deleteArea = deleteArea;
window.cancelAreaEditor = cancelAreaEditor;
window.addCornerAtPosition = addCornerAtPosition;
window.removeLastCorner = removeLastCorner;
window.saveArea = saveArea;
window.startGame = startGame;
window.startPlayerRound = startPlayerRound;
window.collectTreasure = collectTreasure;
window.nextPlayer = nextPlayer;
window.quitGame = quitGame;
window.rematch = rematch;
window.initAudio = initAudio;
