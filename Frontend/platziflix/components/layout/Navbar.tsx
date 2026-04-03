"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/videos?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <nav
      style={{ background: "rgba(20,20,20,0.95)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold" style={{ color: "#e50914" }}>
          PLATZIFLIX
        </Link>

        <div className="hidden md:flex gap-4 text-sm text-gray-300">
          <Link href="/videos" className="hover:text-white transition-colors">Catálogo</Link>
          <Link href="/plans" className="hover:text-white transition-colors">Planes</Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar videos..."
              className="w-full pl-9 pr-3 py-1.5 rounded text-sm text-white"
              style={{ background: "var(--input)", border: "1px solid var(--border)" }}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-3">
          {!user ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" style={{ background: "#e50914" }} className="hover:opacity-90">
                  Registrarse
                </Button>
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback style={{ background: "#e50914", color: "white", fontSize: 12 }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm text-gray-300">{user.full_name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                className="w-48"
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="text-gray-200 hover:text-white cursor-pointer">
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/favorites" className="text-gray-200 hover:text-white cursor-pointer">
                    Mis favoritos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/history" className="text-gray-200 hover:text-white cursor-pointer">
                    Historial
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/subscription" className="text-gray-200 hover:text-white cursor-pointer">
                    Mi suscripción
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator style={{ background: "var(--border)" }} />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="text-yellow-400 hover:text-yellow-300 cursor-pointer">
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator style={{ background: "var(--border)" }} />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
