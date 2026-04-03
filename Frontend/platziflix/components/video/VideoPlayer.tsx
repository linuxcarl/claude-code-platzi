"use client";

import { useEffect, useRef, useState } from "react";
import { progress as progressApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Props {
  videoUrl: string | null;
  hlsUrl: string | null;
  videoId: string;
  initialPosition?: number;
  onProgressUpdate?: (seconds: number) => void;
}

export default function VideoPlayer({
  videoUrl,
  hlsUrl,
  videoId,
  initialPosition = 0,
  onProgressUpdate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState(0);

  const src = hlsUrl || videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hlsInstance: import("hls.js").default | null = null;

    const setupHls = async () => {
      if (src.includes(".m3u8")) {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsInstance.loadSource(src);
          hlsInstance.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        }
      } else {
        video.src = src;
      }

      video.currentTime = initialPosition;
    };

    setupHls();

    return () => {
      hlsInstance?.destroy();
    };
  }, [src, initialPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !user) return;

    const saveProgress = async () => {
      if (video.currentTime < 5) return;
      try {
        await progressApi.update({
          video_id: videoId,
          position_seconds: Math.floor(video.currentTime),
          duration_seconds: Math.floor(video.duration || 0),
        });
        onProgressUpdate?.(Math.floor(video.currentTime));
      } catch { /* ignore auth errors */ }
    };

    const onPlay = () => {
      intervalRef.current = setInterval(saveProgress, 30000);
    };
    const onPause = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveProgress();
    };
    const onEnded = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveProgress();
    };
    const onLoaded = () => setDuration(video.duration);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onLoaded);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [videoId, user, onProgressUpdate]);

  if (!src) {
    return (
      <div
        className="w-full aspect-video flex items-center justify-center rounded-lg"
        style={{ background: "var(--card)" }}
      >
        <p className="text-gray-500">Video no disponible</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      className="w-full aspect-video rounded-lg"
      style={{ background: "#000" }}
      playsInline
    />
  );
}
