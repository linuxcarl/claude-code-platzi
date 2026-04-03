"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { admin as adminApi, categories as catsApi } from "@/lib/api";
import Link from "next/link";
import { Film, Users, FolderOpen, ChevronRight } from "lucide-react";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ videos: 0, users: 0, categories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user?.role === "admin") {
      Promise.all([
        adminApi.videos.list({ page_size: 1 }),
        adminApi.users.list({ page_size: 1 }),
        catsApi.list(),
      ])
        .then(([vids, usrs, cats]) => {
          setStats({ videos: vids.total, users: usrs.total, categories: cats.length });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const cards = [
    { label: "Videos", value: stats.videos, icon: Film, href: "/admin/videos", color: "#e50914" },
    { label: "Usuarios", value: stats.users, icon: Users, href: "/admin/users", color: "#3b82f6" },
    { label: "Categorías", value: stats.categories, icon: FolderOpen, href: "/admin/categories", color: "#10b981" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Panel de administración</h1>
      <p className="text-gray-400 mb-8">Gestiona el contenido de Platziflix</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl p-6 flex items-center justify-between hover:opacity-90 transition-opacity"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-gray-400 text-sm mb-1">{label}</p>
              <p className="text-3xl font-black" style={{ color }}>
                {loading ? "—" : value}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon className="w-8 h-8" style={{ color, opacity: 0.6 }} />
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </Link>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: "/admin/videos", label: "Gestionar videos" },
            { href: "/admin/categories", label: "Gestionar categorías" },
            { href: "/admin/users", label: "Gestionar usuarios" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded text-sm text-center hover:text-white transition-colors"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
