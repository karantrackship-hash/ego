import { useState, useEffect, useRef, useCallback } from 'react';
import { tracks, type Track } from './data/tracks';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';

/* ── Helpers ─────────────────────────────────────────────────── */

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const bumperTexts = [
  'बुरी नज़र वाले तेरा मुँह काला',
  'Horn OK Please',
  'ट्रक वाला',
  'Use Dipper at Night',
  'मेरा भारत महान',
  'OK TATA',
  'माँ का आशीर्वाद',
];

const backgrounds = ['/images/bg1.jpg', '/images/bg2.jpg', '/images/bg3.jpg'];

/* ── Main Component ──────────────────────────────────────────── */

export default function App() {
  // State
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [isShuffled, setIsShuffled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [bumperIdx, setBumperIdx] = useState(0);
  const [titleSwap, setTitleSwap] = useState(false);
  const [clock, setClock] = useState('');
  const [scrubbing, setScrubbing] = useState(false);

  const seekRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const orderRef = useRef(order);
  posRef.current = pos;
  orderRef.current = order;

  // Build order
  useEffect(() => {
    const seq = Array.from({ length: tracks.length }, (_, i) => i);
    setOrder(isShuffled ? shuffleArray(seq) : seq);
  }, [isShuffled]);

  const currentTrack: Track | undefined = order.length > 0 ? tracks[order[pos]] : undefined;

  // YouTube player
  const yt = useYouTubePlayer({
    onReady: () => {},
    onStateChange: (state) => {
      if (state === 1) setIsPlaying(true); // PLAYING
      if (state === 2) setIsPlaying(false); // PAUSED
    },
    onEnd: () => {
      goNext();
    },
  });

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Progress polling
  useEffect(() => {
    let raf: number;
    const pollAt = { time: 0, at: 0, duration: 0 };
    let pollInterval: ReturnType<typeof setInterval>;

    const sample = () => {
      pollAt.time = yt.getCurrentTime();
      pollAt.duration = yt.getDuration();
      pollAt.at = performance.now();
    };

    const paint = () => {
      raf = requestAnimationFrame(paint);
      if (scrubbing || pollAt.duration === 0) return;
      const drift = isPlaying ? (performance.now() - pollAt.at) / 1000 : 0;
      const cur = Math.min(pollAt.duration, pollAt.time + drift);
      const frac = Math.min(1, Math.max(0, cur / pollAt.duration));
      setProgress(frac);
      setCurrentTime(cur);
      setDuration(pollAt.duration);
    };

    pollInterval = setInterval(sample, 250);
    raf = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(pollInterval);
    };
  }, [yt, isPlaying, scrubbing]);

  // Bumper text rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setBumperIdx((i) => (i + 1) % bumperTexts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Scroll active playlist item into view
  useEffect(() => {
    if (showPlaylist && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pos, showPlaylist]);

  // Navigation
  const go = useCallback(
    (newPos: number) => {
      const n = orderRef.current.length;
      if (n === 0) return;
      const p = ((newPos % n) + n) % n;
      setPos(p);
      setTitleSwap(true);
      setTimeout(() => setTitleSwap(false), 400);
      setBgIndex((b) => (b + 1) % backgrounds.length);
      setStarted(true);
      yt.loadVideo(tracks[orderRef.current[p]].id);
    },
    [yt]
  );

  const goNext = useCallback(() => {
    go(posRef.current + 1);
  }, [go]);

  const goPrev = useCallback(() => {
    go(posRef.current - 1);
  }, [go]);

  const togglePlay = useCallback(() => {
    if (!yt.isReady) return;
    if (isPlaying) {
      yt.pause();
    } else {
      if (!started) {
        setStarted(true);
        yt.loadVideo(tracks[orderRef.current[posRef.current]].id);
      } else {
        yt.play();
      }
    }
  }, [yt, isPlaying, started]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((s) => !s);
  }, []);

  // Seeking
  const handleSeekDown = useCallback(
    (e: React.PointerEvent) => {
      if (!seekRef.current) return;
      setScrubbing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const rect = seekRef.current.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setProgress(frac);
      setCurrentTime(yt.getDuration() * frac);
    },
    [yt]
  );

  const handleSeekMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbing || !seekRef.current) return;
      const rect = seekRef.current.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setProgress(frac);
      setCurrentTime(yt.getDuration() * frac);
    },
    [scrubbing, yt]
  );

  const handleSeekUp = useCallback(
    (e: React.PointerEvent) => {
      if (!seekRef.current) return;
      const rect = seekRef.current.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      yt.seekTo(yt.getDuration() * frac);
      setScrubbing(false);
    },
    [yt]
  );

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, goNext, goPrev]);

  const trackCount = tracks.length;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background layers */}
      {backgrounds.map((bg, i) => (
        <div
          key={bg}
          className={`bg-layer ${i === bgIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${bg})` }}
        />
      ))}
      <div className="bg-overlay" />

      {/* Hidden YouTube player */}
      <div
        style={{
          position: 'fixed',
          top: -10,
          left: -10,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <div ref={yt.containerRef} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-full text-white">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              className="horn-btn text-3xl select-none cursor-pointer"
              title="Horn!"
              onClick={() => {
                // horn honk effect
              }}
            >
              📯
            </button>
            <div>
              <h1 className="truck-logo text-xl sm:text-2xl font-bold text-amber-400 leading-tight tracking-wide">
                ट्रक वाला
              </h1>
              <p className="text-[10px] sm:text-xs text-amber-200/60 tracking-widest uppercase">
                Horn OK Please
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <span className="hidden sm:inline">{trackCount} tracks</span>
            <span className="font-mono text-xs">{clock}</span>
          </div>
        </header>

        {/* Bumper text */}
        <div className="text-center px-4 py-2">
          <p
            className="bumper-text text-lg sm:text-xl font-bold text-amber-300/80 font-hindi"
            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
          >
            {bumperTexts[bumperIdx]}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Player section */}
        <div className="glass rounded-t-3xl sm:rounded-t-[2rem] px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
          {/* Disc + Track Info */}
          <div className="flex items-center gap-5 sm:gap-8 mb-6">
            {/* Spinning Disc */}
            <div
              className={`disc ${started ? 'spinning' : ''} ${!isPlaying && started ? 'paused' : ''}`}
            >
              {currentTrack?.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title + ' artwork'}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-800 to-red-900" />
              )}
              <div className="disc-inner" />
              <div className="disc-center" />
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-lg sm:text-2xl font-bold truncate ${titleSwap ? 'title-swap' : ''}`}
              >
                {currentTrack?.title || 'Loading the cassette…'}
              </p>
              <p className="text-sm sm:text-base text-white/60 truncate mt-1">
                {currentTrack?.artist || ''}
              </p>
              {currentTrack?.album && (
                <p className="text-xs text-white/30 truncate mt-1">
                  {currentTrack.album}
                </p>
              )}
            </div>
          </div>

          {/* Seek bar */}
          <div className="mb-3">
            <div
              ref={seekRef}
              className="seek-bar"
              role="slider"
              aria-label="Seek"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              onPointerDown={handleSeekDown}
              onPointerMove={handleSeekMove}
              onPointerUp={handleSeekUp}
            >
              <div
                className="seek-fill"
                style={{ transform: `scaleX(${progress})` }}
              />
              <div
                className="seek-knob"
                style={{
                  transform: `translate(-50%, -50%) translateX(${
                    seekRef.current
                      ? progress * seekRef.current.clientWidth
                      : progress * 300
                  }px)`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/40 mt-1 font-mono">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
            {/* Shuffle */}
            <button
              className={`control-btn w-10 h-10 ${
                isShuffled ? 'text-amber-400 border-amber-400/30' : ''
              }`}
              onClick={toggleShuffle}
              title={isShuffled ? 'Shuffle on' : 'Shuffle off'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            {/* Prev */}
            <button className="control-btn w-11 h-11" onClick={goPrev} title="Previous">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              className="control-btn play-btn w-14 h-14"
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button className="control-btn w-11 h-11" onClick={goNext} title="Next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Playlist toggle */}
            <button
              className={`control-btn w-10 h-10 ${
                showPlaylist ? 'text-amber-400 border-amber-400/30' : ''
              }`}
              onClick={() => setShowPlaylist(!showPlaylist)}
              title="Playlist"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {/* Playlist */}
          <div className={`playlist rounded-xl ${showPlaylist ? 'open' : ''}`}>
            <div className="bg-black/30 rounded-xl">
              {order.map((trackIdx, i) => {
                const t = tracks[trackIdx];
                const isActive = i === pos;
                return (
                  <div
                    key={`${trackIdx}-${i}`}
                    ref={isActive ? activeItemRef : undefined}
                    className={`playlist-item ${isActive ? 'active' : ''}`}
                    onClick={() => go(i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-6 text-right font-mono">
                        {i + 1}
                      </span>
                      <img
                        src={t.cover}
                        alt=""
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm truncate ${
                            isActive ? 'text-amber-400 font-semibold' : 'text-white/90'
                          }`}
                        >
                          {t.title}
                        </p>
                        <p className="text-xs text-white/40 truncate">{t.artist}</p>
                      </div>
                      <span className="text-xs text-white/25 font-mono flex-shrink-0">
                        {fmt(t.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer tagline */}
          <p className="text-center text-[10px] text-white/20 mt-4 tracking-widest">
            HIGHWAY BANGERS OFF THE BACK OF AN INDIAN TRUCK
          </p>
        </div>
      </div>
    </div>
  );
}
