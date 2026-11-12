import { useEffect, useState } from 'react';
import { getYouTubeThumbnailUrl } from '../utils/youtube';

export interface VideoMetadataInfo {
  videoId: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

export interface UseVideoInfoReturn {
  status: 'idle' | 'loading' | 'ready' | 'error';
  info: VideoMetadataInfo | null;
  error: string | null;
}

interface YTPreFlightPlayer {
  destroy: () => void;
  getDuration?: () => number;
  getVideoData?: () => {
    title?: string;
    author?: string;
    video_id?: string;
  };
  mute?: () => void;
}

let ytScriptLoadPromise: Promise<void> | null = null;

function ensureYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytScriptLoadPromise) {
    return ytScriptLoadPromise;
  }

  ytScriptLoadPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      resolve();
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return ytScriptLoadPromise;
}

const EMBED_ERROR_MESSAGE =
  "We couldn't read this video. It may be private or blocked from embedding.";

/**
 * Loads a YouTube video in a hidden YouTube IFrame player to read its
 * title, channel name (author), and duration (getDuration).
 */
export function useVideoInfo(videoId: string | null): UseVideoInfoReturn {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [info, setInfo] = useState<VideoMetadataInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setStatus('idle');
      setInfo(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    let playerInstance: YTPreFlightPlayer | null = null;
    let pollInterval: number | null = null;
    let timeoutId: number | null = null;

    setStatus('loading');
    setInfo(null);
    setError(null);

    // Create a hidden offscreen mount element for the pre-flight YouTube IFrame player
    const hiddenHost = document.createElement('div');
    hiddenHost.style.position = 'fixed';
    hiddenHost.style.left = '-9999px';
    hiddenHost.style.top = '-9999px';
    hiddenHost.style.width = '1px';
    hiddenHost.style.height = '1px';
    hiddenHost.style.opacity = '0';
    hiddenHost.style.pointerEvents = 'none';
    hiddenHost.setAttribute('aria-hidden', 'true');

    const mountNode = document.createElement('div');
    hiddenHost.appendChild(mountNode);
    document.body.appendChild(hiddenHost);

    const cleanup = () => {
      if (pollInterval !== null) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        try {
          playerInstance.destroy();
        } catch {
          // Ignore destroy errors
        }
      }
      playerInstance = null;
      if (hiddenHost.parentNode) {
        hiddenHost.parentNode.removeChild(hiddenHost);
      }
    };

    const tryExtractMetadata = (target: YTPreFlightPlayer): boolean => {
      const duration = Math.round(target.getDuration?.() || 0);
      const data = target.getVideoData?.() || {};
      const title = (data.title || '').trim();
      const author = (data.author || '').trim();

      if (duration > 0 && title.length > 0) {
        if (!isCancelled) {
          setInfo({
            videoId,
            title,
            channelName: author || 'YouTube Creator',
            durationSeconds: duration,
            thumbnailUrl: getYouTubeThumbnailUrl(videoId),
          });
          setStatus('ready');
          setError(null);
        }
        cleanup();
        return true;
      }
      return false;
    };

    timeoutId = window.setTimeout(() => {
      if (!isCancelled) {
        setStatus('error');
        setError(EMBED_ERROR_MESSAGE);
        cleanup();
      }
    }, 10000);

    ensureYouTubeIframeAPI().then(() => {
      if (isCancelled || !window.YT?.Player) return;

      const YTPlayerCtor = window.YT.Player as unknown as new (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => YTPreFlightPlayer;

      playerInstance = new YTPlayerCtor(mountNode, {
        width: 200,
        height: 112,
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          mute: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: { target: YTPreFlightPlayer }) => {
            if (isCancelled) return;
            event.target.mute?.();
            if (tryExtractMetadata(event.target)) return;

            pollInterval = window.setInterval(() => {
              if (isCancelled) return;
              tryExtractMetadata(event.target);
            }, 250);
          },
          onStateChange: (event: { target: YTPreFlightPlayer }) => {
            if (isCancelled) return;
            tryExtractMetadata(event.target);
          },
          onError: () => {
            if (isCancelled) return;
            setStatus('error');
            setError(EMBED_ERROR_MESSAGE);
            cleanup();
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [videoId]);

  return { status, info, error };
}
