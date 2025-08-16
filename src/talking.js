// JSON-driven sprite talk animation rendered inside the "mediaStrip" strip (above display-area).
// No fullscreen overlay; this renders inline so the game stays visible.

const container = document.getElementById('mediaStrip');

const configCache = new Map();

// requestAnimationFrame-based animation with accumulator for stable cadence
let rafId = null;
let lastTs = 0;
let accum = 0;
let isAnimating = false;

const state = {
  name: null,
  cfg: null,
  frame: 0,
  spriteEl: null
};

function clearTimer() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  isAnimating = false;
  accum = 0;
}

async function loadConfig(name) {
  if (configCache.has(name)) return configCache.get(name);
  const url = `./avatars/${name}/talk-animation.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load avatar config: ${url}`);
  const cfg = await res.json();

  // Normalize
  const normalized = {
    borderTop: Number(cfg.borderTop || 0),
    borderRight: Number(cfg.borderRight || 0),
    borderBottom: Number(cfg.borderBottom || 0),
    borderLeft: Number(cfg.borderLeft || 0),
    horizontalFrames: Math.max(1, Number(cfg.horizontalFrames || 1)),
    verticalFrames: Math.max(1, Number(cfg.verticalFrames || 1)),
    animationSpeed: Math.max(16, Number(cfg.animationSpeed || 100)), // ms per frame
    loop: cfg.loop !== false,
    imageInfo: {
      width: cfg.imageInfo?.width || null,
      height: cfg.imageInfo?.height || null,
      frameDimensions: {
        width: Number(cfg.imageInfo?.frameDimensions?.width || 300),
        height: Number(cfg.imageInfo?.frameDimensions?.height || 300),
      },
    },
    totalFrames: Number(cfg.totalFrames || (Number(cfg.horizontalFrames || 1) * Number(cfg.verticalFrames || 1))),
  };

  configCache.set(name, normalized);
  return normalized;
}

function computeBackgroundPosition(cfg, frame) {
  const cols = cfg.horizontalFrames;
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const x = cfg.borderLeft + col * cfg.imageInfo.frameDimensions.width;
  const y = cfg.borderTop + row * cfg.imageInfo.frameDimensions.height;
  return `-${x}px -${y}px`;
}

function ensureSpriteEl() {
  if (!container) return null;
  if (state.spriteEl && state.spriteEl.isConnected) return state.spriteEl;

  // Clear container to ensure single sprite
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'avatar-talk';
  // center inside media strip
  el.style.margin = '0 auto';
  el.style.display = 'block';
  el.style.backgroundRepeat = 'no-repeat';
  // Prefer smooth rendering by default; callers can opt into pixelated if they want retro look
  el.style.imageRendering = 'auto';
  el.style.userSelect = 'none';
  el.style.pointerEvents = 'none';
  container.appendChild(el);
  state.spriteEl = el;
  return el;
}

function applyFrame() {
  if (!state.cfg || !state.spriteEl) return;
  state.spriteEl.style.backgroundPosition = computeBackgroundPosition(state.cfg, state.frame);
}

function setFrameSizeAndImage(name) {
  const { frameDimensions, width: imgW, height: imgH } = state.cfg.imageInfo;
  state.spriteEl.style.width = `${frameDimensions.width}px`;
  state.spriteEl.style.height = `${frameDimensions.height}px`;
  state.spriteEl.style.backgroundImage = `url('./avatars/${name}/talk-animation.png')`;
  // If the JSON provides full image dimensions, set background-size so background-position math matches original sprite sheet.
  if (imgW && imgH) {
    state.spriteEl.style.backgroundSize = `${imgW}px ${imgH}px`;
  } else {
    state.spriteEl.style.backgroundSize = 'auto';
  }
}

async function ensureImageLoaded(name) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // don't block on errors
    img.src = `./avatars/${name}/talk-animation.png`;
  });
}

async function setupAvatar(name) {
  state.cfg = await loadConfig(name);
  state.name = name;
  state.frame = 0;
  ensureSpriteEl();
  setFrameSizeAndImage(name);
  await ensureImageLoaded(name);
  applyFrame();
}

export async function startAvatarTalk(name = 'tiger') {
  try {
    // Avoid stacking multiple animations for the same avatar
    if (isAnimating && state.name === name) {
      return;
    }
    clearTimer();
    await setupAvatar(name);

    const total = state.cfg.totalFrames;
    const speed = Math.max(16, Number(state.cfg.animationSpeed || 100)); // ms per frame
    isAnimating = true;
    // Always start speaking animation from frame 0 for consistent cadence
    state.frame = 0;
    applyFrame();
    lastTs = performance.now();
    accum = 0;

    const tick = (ts) => {
      if (!isAnimating) return;
      const delta = ts - lastTs;
      lastTs = ts;
      accum += delta;

      while (accum >= speed) {
        state.frame = (state.frame + 1) % total;
        accum -= speed;
      }
      applyFrame();

      if (!state.cfg.loop && state.frame === total - 1) {
        clearTimer();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  } catch (e) {
    console.error('startAvatarTalk error:', e);
  }
}

export async function setAvatarIdle(name = 'tiger') {
  try {
    // Stop any animation and show first frame (no ticking while paused)
    clearTimer();
    if (state.name !== name || !state.cfg || !state.spriteEl) {
      await setupAvatar(name);
    }
    state.frame = 0;
    applyFrame();
  } catch (e) {
    console.error('setAvatarIdle error:', e);
  }
}

export function hideAvatar() {
  clearTimer();
  if (container) container.innerHTML = '';
  state.spriteEl = null;
}

// No overlay text; keep API for compatibility
export function setSpeechText(_text = '') {}

export function disposeTalkingOverlay() {
  clearTimer();
  configCache.clear();
  state.name = null;
  state.cfg = null;
  state.frame = 0;
  if (container) container.innerHTML = '';
  state.spriteEl = null;
}