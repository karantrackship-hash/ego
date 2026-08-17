/* ══ AUTHOR SETTINGS ═════════════════════════════════════════════ */
const BG_VIDEO = 'public/loop.mp4';
const BG_IMAGE = 'BG_IMAGE.png';
const MAX_WAIT = 6000;

const PLAYLIST = [
  '12 Saal (Baarah Saal) Bilal Saeed',
'Faasle Aditya Rikhari',
'All For You',
'Kya Chahiye AUR',
'Tu Hai Kahan AUR',
'Chaand Baaliyan Brave Wrd (possibly)',
'Broken Soul DEVEL (possibly)',
'Mental Trauma DEVEL (possibly)',
'Door Aa Gaye',
'Dooriyan KALAMKAR',
'Dooriyan Dino James',
'EMIWAY X SWAALINA',
'Farak DIVINE',
'God Bless You Vijay DK',
'Gumaan Young Stunners',
'Hit Em Up',
'Kaale Ghere BELLA',
'Long Time No See',
'No One Manikk',
'Its Okay to Cry MC INSANE',
'Leave Me MC INSANE',
'Painful Weather MC INSANE',
'Window Shayari MC INSANE',
'Naseeb FEARLESS',
'Gandhi SHAGGY',
'The Me Who I Lost',
'Tum Mein Zamaana',
];
const SHARE_HOURS = 24;
const SHUFFLE = true, LOOP = true;

const $ = s => document.querySelector(s);
const KEY = 'f-playlist';

const b64 = {
  enc: o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
              .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec: s => JSON.parse(new TextDecoder().decode(
              Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)))),
};

let playlist = [...PLAYLIST];
let currentIndex = 0;
let linkExpiry = null, expired = false;

try {
  const s = new URLSearchParams(location.search).get('s');
  if (s) {
    const d = b64.dec(s);
    if (d.e && Date.now() > d.e) expired = true;
    else if (Array.isArray(d.p) && d.p.length > 0) { playlist = d.p; linkExpiry = d.e || null; }
  } else {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) playlist = parsed;
      } catch (e) { }
    }
  }
} catch (e) { }

let audio, ready = false, seeking = false;

const bg = $('#bg'), bgv = $('#bgv');
const conn = navigator.connection;

const holdVideo = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ||
  !!(conn && (conn.saveData || /^(2g|slow-2g)$/.test(conn.effectiveType || '')));

let bgDone = false, started = false;
const markBg = () => { bgDone = true; maybeStart(); };

if (BG_IMAGE) bg.src = BG_IMAGE; else bg.style.display = 'none';

const nudgeVideo = () => { if (bgv.src && bgv.paused) bgv.play().catch(() => {}); };

function loadVideo() {
  if (!BG_VIDEO || bgv.src || holdVideo()) return;
  bgv.src = BG_VIDEO;
  nudgeVideo();
}

if (BG_VIDEO && !holdVideo()) {
  loadVideo();
  bgv.addEventListener('canplaythrough', markBg, { once: true });
  bgv.addEventListener('error', markBg, { once: true });
} else if (BG_IMAGE) {
  bg.complete ? markBg()
              : (bg.addEventListener('load', markBg, { once: true }),
                 bg.addEventListener('error', markBg, { once: true }));
} else markBg();

if (conn) conn.addEventListener('change', loadVideo);

bgv.addEventListener('canplay', () => { bgv.classList.add('live'); nudgeVideo(); });
bgv.addEventListener('loadeddata', nudgeVideo);
bgv.addEventListener('error', () => bgv.classList.remove('live'));

document.addEventListener('visibilitychange', () => { if (!document.hidden) nudgeVideo(); });
addEventListener('pointerdown', nudgeVideo, { passive: true });

$('#eq').innerHTML = [.9,.55,1.2,.7,1].map(d =>
  `<i style="--d:${d}s;animation-delay:-${d}s"></i>`).join('');

audio = $('#audio');

function loadTrack(index) {
  if (index >= playlist.length) {
    if (LOOP) {
      currentIndex = 0;
    } else {
      return;
    }
  }
  audio.src = playlist[currentIndex];
  setTitle(playlist[currentIndex].replace('.mp3', ''));
  $('#art').src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ffb02e" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%230b0b0d" font-size="40" font-weight="bold"%3E🎵%3C/text%3E%3C/svg%3E';
}

function onReady() {
  ready = true;
  loadTrack(currentIndex);
  $('#deck').classList.add('ready');
  maybeStart();
}

onReady();

audio.addEventListener('loadedmetadata', () => {
  ready = true;
  $('#deck').classList.add('ready');
  maybeStart();
});

audio.addEventListener('play', () => {
  document.body.classList.add('playing');
  $('#play-i').innerHTML = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>';
  $('#play').title = 'Pause';
});

audio.addEventListener('pause', () => {
  document.body.classList.remove('playing');
  $('#play-i').innerHTML = '<path d="M7 4.5v15L20 12z"/>';
  $('#play').title = 'Play';
});

audio.addEventListener('ended', () => {
  if (LOOP || currentIndex < playlist.length - 1) {
    currentIndex = (currentIndex + 1) % playlist.length;
    loadTrack(currentIndex);
    audio.play();
  }
});

function setTitle(text) {
  const t = $('#title');
  t.classList.remove('scroll');
  t.style.transform = '';
  t.textContent = text;
  requestAnimationFrame(() => {
    const over = t.scrollWidth - $('#screen').clientWidth + 14;
    if (over > 0) {
      t.style.setProperty('--shift', `-${over}px`);
      t.style.setProperty('--dur', `${Math.max(8, over / 22)}s`);
      t.classList.add('scroll');
    }
  });
}

setInterval(() => {
  if (!ready || seeking || !audio.duration) return;
  const dur = audio.duration;
  if (dur > 0) $('#fill').style.width = (audio.currentTime / dur) * 100 + '%';
}, 450);

$('#play').onclick = () => {
  audio.paused ? audio.play() : audio.pause();
};
$('#next').onclick = () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  audio.play();
};
$('#prev').onclick = () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentIndex);
    audio.play();
  }
};
const ICON_SOUND = '<path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>';
const ICON_MUTED = '<path d="M4 9v6h4l5 4V5L8 9H4zm15.5-1.1-1.4-1.4L15.7 9 13.3 6.5l-1.4 1.4L14.3 10l-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4L17.1 10z"/>';

let muted = false;

function setMuted(v) {
  muted = v;
  audio.muted = v;
  $('#mute-i').innerHTML = v ? ICON_MUTED : ICON_SOUND;
  $('#mute').title = v ? 'Unmute' : 'Mute';
  $('#mute').setAttribute('aria-label', v ? 'Unmute' : 'Mute');
}

$('#mute').onclick = () => setMuted(!muted);

const seek = e => {
  const r = $('#bar').getBoundingClientRect();
  const p = Math.min(1, Math.max(0, ((e.clientX ?? e.touches[0].clientX) - r.left) / r.width));
  $('#fill').style.width = p * 100 + '%';
  return p;
};
$('#bar').addEventListener('pointerdown', e => {
  if (!ready) return;
  seeking = true; seek(e); $('#bar').setPointerCapture(e.pointerId);
});
$('#bar').addEventListener('pointermove', e => { if (seeking) seek(e); });
$('#bar').addEventListener('pointerup', e => {
  if (!seeking) return;
  seeking = false;
  audio.currentTime = seek(e) * audio.duration;
});

addEventListener('keydown', e => {
  if (e.key === 'Escape') return closePanel();
  if (!ready || e.target.matches('input')) return;
  const k = { ' ': '#play', ArrowRight: '#next', ArrowLeft: '#prev', m: '#mute' }[e.key];
  if (k) { e.preventDefault(); $(k).click(); }
});

const panel = $('#panel'), gear = $('#gear'), field = $('#f-playlist'), err = $('#e-playlist');

function showErr(msg) { err.textContent = msg; err.classList.add('show'); field.classList.add('bad'); }
function clearErr() { err.classList.remove('show'); field.classList.remove('bad'); }
field.addEventListener('input', clearErr);

function relTime(ms) {
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h} hour${h > 1 ? 's' : ''}`;
  const m = Math.max(1, Math.round(ms / 60000));
  return `${m} minute${m > 1 ? 's' : ''}`;
}
function linkInfo() {
  $('#linkinfo').textContent = linkExpiry
    ? `You're on a shared link — it stops working in ${relTime(linkExpiry - Date.now())}.`
    : `Copied links last ${SHARE_HOURS} hours.`;
}

function openPanel() {
  field.value = playlist.join(','); clearErr();
  panel.classList.add('open');
  gear.setAttribute('aria-expanded', 'true');
}
function closePanel() {
  panel.classList.remove('open');
  gear.setAttribute('aria-expanded', 'false');
}
gear.onclick = () => panel.classList.contains('open') ? closePanel() : openPanel();
document.addEventListener('pointerdown', e => {
  if (panel.classList.contains('open') && !panel.contains(e.target) && !gear.contains(e.target))
    closePanel();
});

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

function readField() {
  const raw = field.value.trim();
  if (!raw) { showErr('Enter MP3 file names separated by commas.'); return null; }
  const files = raw.split(',').map(f => f.trim()).filter(f => f);
  if (files.length === 0) { showErr('Enter at least one MP3 file name.'); return null; }
  return files;
}

$('#save').onclick = () => {
  const files = readField();
  if (!files) return;
  playlist = files;
  currentIndex = 0;
  localStorage.setItem(KEY, JSON.stringify(files));
  closePanel();
  loadTrack(currentIndex);
  toast('Playlist updated');
};

$('#share').onclick = async () => {
  const files = readField();
  if (!files) return;
  const payload = { p: files, e: Date.now() + SHARE_HOURS * 3600000 };
  const url = location.origin + location.pathname + '?s=' + b64.enc(payload);
  try {
    await navigator.clipboard.writeText(url);
    toast(`Link copied — good for ${SHARE_HOURS} hours`);
  } catch (e) {
    prompt('Copy this link:', url);
  }
};

$('#reset').onclick = () => {
  localStorage.removeItem(KEY);
  playlist = [...PLAYLIST];
  currentIndex = 0;
  loadTrack(currentIndex);
  toast('Playlist reset to default');
};

function maybeStart(force) {
  if (started) return;
  if (!force && !(bgDone && ready)) return;
  started = true;
  $('#loader').classList.add('gone');
  nudgeVideo();
  [400, 1200, 3000].forEach(ms => setTimeout(nudgeVideo, ms));
  if (expired) setTimeout(() => toast('That link has expired — playing the house selection.'), 900);

  if (ready) startAudio();
  else {
    const t = setInterval(() => { if (ready) { clearInterval(t); startAudio(); } }, 150);
    setTimeout(() => clearInterval(t), 20000);
  }
}
setTimeout(() => maybeStart(true), MAX_WAIT);

function startAudio() {
  setMuted(false);
  audio.play().catch(() => {
    setMuted(true);
    audio.play();
  });
}