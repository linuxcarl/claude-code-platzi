import VideoCard from "./VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import type { VideoListItem } from "@/lib/types";

interface Props {
  videos: VideoListItem[];
  loading?: boolean;
  progressMap?: Record<string, number>;
}

export default function VideoGrid({ videos, loading, progressMap }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        No se encontraron videos
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          userProgress={progressMap?.[video.id]}
        />
      ))}
    </div>
  );
}
