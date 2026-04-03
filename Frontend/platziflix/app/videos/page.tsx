"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { videos as videosApi, categories as categoriesApi, tags as tagsApi } from "@/lib/api";
import type { VideoListItem, Category, Tag, PaginatedResponse } from "@/lib/types";
import VideoGrid from "@/components/video/VideoGrid";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<PaginatedResponse<VideoListItem> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPage = Number(searchParams.get("page") || "1");
  const categorySlug = searchParams.get("category_slug") || "";
  const tagSlug = searchParams.get("tag_slug") || "";
  const search = searchParams.get("search") || "";
  const sort = (searchParams.get("sort") || "newest") as "newest" | "oldest" | "popular";
  const isFree = searchParams.get("is_free");

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/videos?${params}`);
  };

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await videosApi.list({
        category_slug: categorySlug || undefined,
        tag_slug: tagSlug || undefined,
        search: search || undefined,
        is_free: isFree === "true" ? true : isFree === "false" ? false : undefined,
        sort,
        page: currentPage,
        page_size: 20,
      });
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, tagSlug, search, isFree, sort, currentPage]);

  useEffect(() => {
    categoriesApi.list()
      .then((d) => setCategories(Array.isArray(d) ? d : (d as unknown as { items: Category[] }).items ?? []))
      .catch(console.error);
    tagsApi.list()
      .then((d) => setTags(Array.isArray(d) ? d : (d as unknown as { items: Tag[] }).items ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/videos?${params}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Catálogo de videos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category filter */}
        <select
          value={categorySlug}
          onChange={(e) => updateParam("category_slug", e.target.value || null)}
          className="px-3 py-1.5 rounded text-sm text-white"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="px-3 py-1.5 rounded text-sm text-white"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="popular">Más vistos</option>
        </select>

        {/* Free filter */}
        <button
          onClick={() => updateParam("is_free", isFree === "true" ? null : "true")}
          className="px-3 py-1.5 rounded text-sm transition-colors"
          style={{
            background: isFree === "true" ? "#e50914" : "var(--card)",
            border: "1px solid var(--border)",
            color: "white",
          }}
        >
          Solo gratis
        </button>

        {/* Tag pills */}
        {tags.slice(0, 8).map((tag) => (
          <button
            key={tag.slug}
            onClick={() => updateParam("tag_slug", tagSlug === tag.slug ? null : tag.slug)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              background: tagSlug === tag.slug ? "#e50914" : "var(--card)",
              border: "1px solid var(--border)",
              color: "white",
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Search info */}
      {search && (
        <p className="text-gray-400 text-sm mb-4">
          Resultados para: <span className="text-white font-medium">&quot;{search}&quot;</span>
          {data && <span> ({data.total} videos)</span>}
        </p>
      )}

      <VideoGrid videos={data?.items || []} loading={loading} />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400">
            Página {currentPage} de {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= data.pages}
            onClick={() => setPage(currentPage + 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><div className="text-gray-400">Cargando...</div></div>}>
      <CatalogContent />
    </Suspense>
  );
}
