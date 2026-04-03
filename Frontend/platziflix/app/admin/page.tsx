"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { admin as adminApi } from "@/lib/api";
import Link from "next/link";
import { Film, Users, FolderOpen, CreditCard, DollarSign, ChevronRight } from "lucide-react";

interface Stats {
  total_videos: number;
  published_videos: number;
  total_users: number;
  total_categories: number;
  active_subscriptions: number;
  total_revenue: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user?.role === "admin") {
      adminApi.dashboard.stats()
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const cards = [
    { label: "Videos publicados", value: stats ? `${stats.published_videos} / ${stats.total_videos}` : "—", icon: Film, href: "/admin/videos", color: "#2563eb" },
    { label: "Usuarios", value: stats?.total_users ?? "—", icon: Users, href: "/admin/users", color: "#3b82f6" },
    { label: "Categorías", value: stats?.total_categories ?? "—", icon: FolderOpen, href: "/admin/categories", color: "#10b981" },
    { label: "Suscripciones activas", value: stats?.active_subscriptions ?? "—", icon: CreditCard, href: "/admin/users", color: "#f59e0b" },
    { label: "Ingresos totales", value: stats ? `$${stats.total_revenue.toFixed(2)}` : "—", icon: DollarSign, href: "/admin/users", color: "#8b5cf6" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Panel de administración</h1>
      <p className="text-gray-400 mb-8">Gestiona el contenido de Leaningfy</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl p-6 flex items-center justify-between hover:opacity-90 transition-opacity"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-gray-400 text-sm mb-1">{label}</p>
              <p className="text-2xl font-black" style={{ color }}>
                {loading ? "—" : value}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon className="w-7 h-7" style={{ color, opacity: 0.6 }} />
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
