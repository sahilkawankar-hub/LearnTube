import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };

    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

interface UsePlayerOptions {
  youtubeVideoId: string;
  startSeconds: number;
  endSeconds: number;
}

export interface UsePlayerReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentTime: number;
  isPlaying: boolean;
  isReady: boolean;
  seekTo: (seconds: number) => void;
  play: () => void;
}

export function usePlayer({
  youtubeVideoId,
  startSeconds,
  endSeconds,
}: UsePlayerOptions): UsePlayerReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(startSeconds);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Reset state when switching lessons
  useEffect(() => {
    setCurrentTime(startSeconds);
    setIsPlaying(false);
    setIsReady(false);
  }, [youtubeVideoId, startSeconds, endSeconds]);

  // Load YouTube IFrame API once and create/destroy player instance
  useEffect(() => {
    let isCancelled = false;
    let instance: YTPlayerInstance | null = null;

    loadYouTubeIframeAPI().then(() => {
      if (isCancelled || !containerRef.current || !window.YT?.Player) return;

      // Create a fresh child element so YT.Player never removes React's containerRef node
      containerRef.current.innerHTML = '';
      const mountNode = document.createElement('div');
      containerRef.current.appendChild(mountNode);

      instance = new window.YT.Player(mountNode, {
        videoId: youtubeVideoId,
        playerVars: {
          start: startSeconds,
          end: endSeconds,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (isCancelled) return;
            playerRef.current = event.target;
            setIsReady(true);
            const initialTime = event.target.getCurrentTime?.() || startSeconds;
            setCurrentTime(initialTime >= startSeconds ? initialTime : startSeconds);
          },
          onStateChange: (event) => {
            if (isCancelled) return;
            const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
            const nowPlaying = event.data === playingState;
            setIsPlaying(nowPlaying);

            const t = event.target.getCurrentTime?.();
            if (typeof t === 'number' && !Number.isNaN(t)) {
              setCurrentTime(t);
              if (endSeconds > 0 && t >= endSeconds && nowPlaying) {
                event.target.pauseVideo?.();
                setIsPlaying(false);
              }
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      setIsPlaying(false);
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch {
          // Ignore destroy errors if iframe already detached
        }
      }
      playerRef.current = null;
    };
  }, [youtubeVideoId, startSeconds, endSeconds]);

  // Poll currentTime every 500ms ONLY while video is playing
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      const t = player.getCurrentTime();
      if (typeof t === 'number' && !Number.isNaN(t)) {
        setCurrentTime(t);
        if (endSeconds > 0 && t >= endSeconds) {
          player.pauseVideo?.();
          setIsPlaying(false);
        }
      }
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, endSeconds]);

  const seekTo = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    setCurrentTime(safeSeconds);
    const player = playerRef.current;
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(safeSeconds, true);
    }
  }, []);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (player && typeof player.playVideo === 'function') {
      player.playVideo();
    }
  }, []);

  return {
    containerRef,
    currentTime,
    isPlaying,
    isReady,
    seekTo,
    play,
  };
}
