"use client";

import Link from "next/link";
import Image from "next/image";
import { Lock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VideoListItem } from "@/lib/types";

interface Props {
  video: VideoListItem;
  userProgress?: number; // 0-100 percentage
}

export default function VideoCard({ video, userProgress }: Props) {
  return (
    <Link href={`/videos/${video.slug}`} className="group block">
      <div
        className="rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105"
        style={{
          background: "var(--card)",
          border: "1px solid transparent",
          backgroundClip: "padding-box",
          boxShadow: "0 0 0 1px transparent",
          transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "#2563eb";
          el.style.boxShadow = "0 0 0 1px #2563eb, 0 0 20px rgba(37,99,235,0.35), 0 8px 24px rgba(37,99,235,0.2)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "transparent";
          el.style.boxShadow = "0 0 0 1px transparent";
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-800 overflow-hidden">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "var(--secondary)" }}
            >
              <Play className="w-10 h-10 text-gray-500" />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>

          {/* Lock badge for premium */}
          {!video.is_free && (
            <div className="absolute top-2 right-2">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ background: "rgba(37,99,235,0.9)" }}
              >
                <Lock className="w-3 h-3" />
                Premium
              </div>
            </div>
          )}

          {/* Free badge */}
          {video.is_free && (
            <div className="absolute top-2 left-2">
              <div
                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ background: "rgba(22,163,74,0.9)" }}
              >
                Gratis
              </div>
            </div>
          )}

          {/* Progress bar */}
          {userProgress !== undefined && userProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
              <div
                className="h-full"
                style={{ width: `${Math.min(userProgress, 100)}%`, background: "#2563eb" }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">{video.title}</h3>
          {video.category && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {video.category.name}
            </p>
          )}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                  style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
