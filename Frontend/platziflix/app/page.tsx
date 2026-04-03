"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { videos as videosApi, categories as categoriesApi } from "@/lib/api";
import type { VideoListItem, Category } from "@/lib/types";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play } from "lucide-react";

export default function HomePage() {
  const [featured, setFeatured] = useState<VideoListItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [videosByCategory, setVideosByCategory] = useState<Record<string, VideoListItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [catsRaw, freeVideos] = await Promise.all([
          categoriesApi.list(),
          videosApi.list({ is_free: true, page_size: 1 }),
        ]);
        // Guard: API may return paginated object or plain array
        const catsData: Category[] = Array.isArray(catsRaw)
          ? catsRaw
          : (catsRaw as unknown as { items: Category[] }).items ?? [];
        setCategories(catsData);
        if (freeVideos.items.length > 0) setFeatured(freeVideos.items[0]);

        const byCategory: Record<string, VideoListItem[]> = {};
        await Promise.all(
          catsData.map(async (cat) => {
            const result = await videosApi.list({ category_slug: cat.slug, page_size: 8 });
            if (result.items.length > 0) byCategory[cat.slug] = result.items;
          })
        );
        setVideosByCategory(byCategory);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative h-[60vh] flex items-end pb-12 px-8 md:px-16"
        style={{
          background: "linear-gradient(to bottom, #1a1a2e 0%, #141414 100%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="text-9xl font-black text-white">PLATZIFLIX</div>
        </div>
        <div className="relative max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Aprende con los mejores
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            Cursos de tecnología, programación y diseño para impulsar tu carrera
          </p>
          <div className="flex gap-3">
            {featured ? (
              <Link href={`/videos/${featured.slug}`}>
                <Button style={{ background: "#e50914" }} className="hover:opacity-90 gap-2">
                  <Play className="w-4 h-4 fill-white" />
                  Ver ahora gratis
                </Button>
              </Link>
            ) : null}
            <Link href="/videos">
              <Button variant="outline" style={{ border: "1px solid var(--border)", color: "white" }}>
                Ver catálogo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Category rows */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          (Array.isArray(categories) ? categories : [])
            .filter((cat) => videosByCategory[cat.slug]?.length > 0)
            .map((cat) => (
              <section key={cat.slug}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white text-xl font-bold">{cat.name}</h2>
                  <Link
                    href={`/videos?category_slug=${cat.slug}`}
                    className="flex items-center gap-1 text-sm hover:text-white transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Ver todos <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(videosByCategory[cat.slug] || []).map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
