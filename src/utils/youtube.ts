export interface ParsedYouTubeResource {
  type: 'VIDEO' | 'PLAYLIST';
  id: string;
}

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Parses a YouTube URL string and extracts either a single VIDEO ID or a PLAYLIST ID.
 * Supports:
 * - https://www.youtube.com/watch?v=ID (ignores extra params like &t=, &si=, &feature=)
 * - https://youtu.be/ID
 * - https://www.youtube.com/playlist?list=ID
 *
 * Returns null if the input is not a valid YouTube video or playlist URL.
 */
export function parseYouTubeUrl(input: string): ParsedYouTubeResource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.)/i, '').toLowerCase();

  if (host === 'youtu.be') {
    const pathId = url.pathname.replace(/^\/+/, '').split('/')[0];
    if (pathId && YOUTUBE_VIDEO_ID_REGEX.test(pathId)) {
      return { type: 'VIDEO', id: pathId };
    }
    return null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const path = url.pathname.replace(/\/+$/, '');

    if (path === '/playlist') {
      const listId = url.searchParams.get('list');
      if (listId && /^[a-zA-Z0-9_-]{6,64}$/.test(listId)) {
        return { type: 'PLAYLIST', id: listId };
      }
      return null;
    }

    if (path === '/watch') {
      const videoId = url.searchParams.get('v');
      if (videoId && YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
        return { type: 'VIDEO', id: videoId };
      }
      const listId = url.searchParams.get('list');
      if (listId && /^[a-zA-Z0-9_-]{6,64}$/.test(listId)) {
        return { type: 'PLAYLIST', id: listId };
      }
      return null;
    }

    if (path.startsWith('/embed/') || path.startsWith('/shorts/')) {
      const segments = path.split('/').filter(Boolean);
      const videoId = segments[1];
      if (videoId && YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
        return { type: 'VIDEO', id: videoId };
      }
    }
  }

  return null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getCanonicalYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
