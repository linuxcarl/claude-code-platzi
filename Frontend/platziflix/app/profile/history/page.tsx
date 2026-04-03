"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { progress as progressApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ProgressWithVideo } from "@/lib/types";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import { Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<ProgressWithVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login?redirect=/profile/history"); return; }
    if (user) {
      progressApi.list()
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const progressMap = Object.fromEntries(
    history.map((h) => [
      h.video.id,
      h.total_seconds ? Math.floor((h.watched_seconds / h.total_seconds) * 100) : 0,
    ])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Clock className="w-6 h-6" /> Historial de reproducción
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No has visto ningún video aún</p>
          <Link href="/videos">
            <Button style={{ background: "#2563eb" }} className="hover:opacity-90 mt-4">
              Explorar videos
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {history.map((h, i) => (
            <VideoCard key={`${h.video.id}-${i}`} video={h.video} userProgress={progressMap[h.video.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
