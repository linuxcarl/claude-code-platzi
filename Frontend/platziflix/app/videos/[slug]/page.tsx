"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { videos as videosApi, favorites as favoritesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VideoDetail } from "@/lib/types";
import VideoPlayer from "@/components/video/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Lock, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function VideoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const v = await videosApi.get(slug);
        setVideo(v);
        setIsFav(v.is_favorited ?? false);
        setLocked(false);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setLocked(true);
        } else if (err instanceof ApiError && err.status === 404) {
          router.push("/videos");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  const toggleFavorite = async () => {
    if (!user) { router.push(`/login?redirect=/videos/${slug}`); return; }
    if (!video) return;
    setFavLoading(true);
    try {
      if (isFav) {
        await favoritesApi.remove(video.id);
        setIsFav(false);
        toast.success("Eliminado de favoritos");
      } else {
        await favoritesApi.add(video.id);
        setIsFav(true);
        toast.success("Agregado a favoritos");
      }
    } catch {
      toast.error("Error al actualizar favoritos");
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="w-full aspect-video rounded-lg mb-6" style={{ background: "var(--card)" }} />
        <Skeleton className="h-8 w-2/3 mb-3" style={{ background: "var(--card)" }} />
        <Skeleton className="h-4 w-full mb-2" style={{ background: "var(--card)" }} />
        <Skeleton className="h-4 w-3/4" style={{ background: "var(--card)" }} />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: "var(--card)" }}
        >
          <Lock className="w-10 h-10" style={{ color: "#e50914" }} />
        </div>
        <h2 className="text-2xl font-bold mb-3">Contenido Premium</h2>
        <p className="text-gray-400 mb-6">
          Este video requiere una suscripción activa para verlo.
        </p>
        <Link href="/plans">
          <Button style={{ background: "#e50914" }} className="hover:opacity-90">
            Ver planes de suscripción
          </Button>
        </Link>
      </div>
    );
  }

  if (!video) return null;

  const progressPct =
    video.user_progress && video.user_progress.duration_seconds
      ? Math.floor((video.user_progress.position_seconds / video.user_progress.duration_seconds) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Player */}
      <VideoPlayer
        videoUrl={video.video_url}
        hlsUrl={video.hls_url}
        videoId={video.id}
        initialPosition={video.user_progress?.position_seconds || 0}
      />

      {/* Meta */}
      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-white flex-1">{video.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            disabled={favLoading}
            className="shrink-0"
          >
            <Heart
              className="w-5 h-5"
              style={{ color: isFav ? "#e50914" : "gray", fill: isFav ? "#e50914" : "none" }}
            />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          {video.category && (
            <Link href={`/videos?category_slug=${video.category.slug}`}>
              <Badge
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                {video.category.name}
              </Badge>
            </Link>
          )}
          {video.is_free ? (
            <Badge style={{ background: "rgba(22,163,74,0.2)", color: "#4ade80" }}>Gratis</Badge>
          ) : (
            <Badge style={{ background: "rgba(229,9,20,0.2)", color: "#f87171" }}>Premium</Badge>
          )}
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Eye className="w-4 h-4" /> {video.view_count} vistas
          </span>
        </div>

        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {video.tags.map((tag) => (
              <Link key={tag.id} href={`/videos?tag_slug=${tag.slug}`}>
                <Badge
                  variant="outline"
                  style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}
                >
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {progressPct > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1 rounded bg-gray-700">
              <div className="h-full rounded" style={{ width: `${progressPct}%`, background: "#e50914" }} />
            </div>
          </div>
        )}

        {video.description && (
          <p className="mt-4 text-gray-400 leading-relaxed">{video.description}</p>
        )}
      </div>
    </div>
  );
}
