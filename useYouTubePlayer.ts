import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerOptions {
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onEnd?: () => void;
}

export function useYouTubePlayer(options: UseYouTubePlayerOptions) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            optionsRef.current.onReady?.();
          },
          onStateChange: (event: any) => {
            optionsRef.current.onStateChange?.(event.data);
            if (event.data === window.YT.PlayerState.ENDED) {
              optionsRef.current.onEnd?.();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const loadVideo = useCallback((videoId: string) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
    }
  }, []);

  const play = useCallback(() => {
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current?.pauseVideo) {
      playerRef.current.pauseVideo();
    }
  }, []);

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current?.getCurrentTime) {
      return playerRef.current.getCurrentTime() || 0;
    }
    return 0;
  }, []);

  const getDuration = useCallback((): number => {
    if (playerRef.current?.getDuration) {
      return playerRef.current.getDuration() || 0;
    }
    return 0;
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true);
    }
  }, []);

  return {
    containerRef,
    isReady,
    loadVideo,
    play,
    pause,
    getCurrentTime,
    getDuration,
    seekTo,
  };
}
