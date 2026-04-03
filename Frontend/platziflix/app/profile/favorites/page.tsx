"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { favorites as favoritesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { FavoriteWithVideo } from "@/lib/types";
import VideoGrid from "@/components/video/VideoGrid";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteWithVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login?redirect=/profile/favorites"); return; }
    if (user) {
      favoritesApi.list()
        .then(setFavorites)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6" style={{ color: "#2563eb" }} /> Mis favoritos
      </h1>

      {loading ? (
        <VideoGrid videos={[]} loading />
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aún no tienes favoritos</p>
          <Link href="/videos" className="mt-4 block">
            <Button style={{ background: "#2563eb" }} className="hover:opacity-90 mt-3">
              Explorar videos
            </Button>
          </Link>
        </div>
      ) : (
        <VideoGrid videos={favorites.map((f) => f.video)} />
      )}
    </div>
  );
}
