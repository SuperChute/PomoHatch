// src/sfx.js
const sounds = {
  pomo:   new Audio('/sfx/pomo-complete.mp3'),
  crack:  new Audio('/sfx/crack.mp3'),
  hatch:  new Audio('/sfx/hatch.mp3'),
  evolve: new Audio('/sfx/evolve.mp3'),
};

Object.values(sounds).forEach(a => {
  a.preload = 'auto';
  a.volume = 0.9;
  a.loop = false;
});

// token system to avoid pausing a sound whose .play() hasn't settled yet
const tokens = new Map(); // key -> Symbol()
const newToken = (key) => { const t = Symbol(); tokens.set(key, t); return t; };
const isCurrent = (key, t) => tokens.get(key) === t;

let unlocked = false;
export async function warmup() {
  if (unlocked) return;
  unlocked = true;
  for (const a of Object.values(sounds)) {
    try {
      a.muted = true;
      await a.play().catch(()=>{});  // start
      a.pause();                     // now it’s safe to pause
      a.currentTime = 0;
      a.muted = false;
    } catch {}
  }
}

export async function play(key) {
  const a = sounds[key]; if (!a) return;
  const t = newToken(key);
  try {
    a.loop = false;
    a.currentTime = 0;
    await a.play();
    // if someone called stop() meanwhile, bail
    if (!isCurrent(key, t)) {
      a.pause(); a.currentTime = 0;
    }
  } catch {}
}

export async function loop(key) {
  const a = sounds[key]; if (!a) return;
  const t = newToken(key);
  try {
    a.pause(); a.currentTime = 0;
    a.loop = true;
    await a.play();
    // if a newer command superseded this loop, stop it
    if (!isCurrent(key, t)) {
      a.loop = false; a.pause(); a.currentTime = 0;
    }
  } catch {}
}

export function stop(key) {
  const a = sounds[key]; if (!a) return;
  newToken(key);           // invalidate any pending play/loop
  a.loop = false;
  a.pause();
  a.currentTime = 0;
}

export function stopAll() {
  for (const key of Object.keys(sounds)) stop(key);
}

export const sfx = { warmup, play, loop, stop, stopAll };
