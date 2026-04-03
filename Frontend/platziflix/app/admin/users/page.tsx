"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { admin as adminApi } from "@/lib/api";
import type { User, PaginatedResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) { router.push("/"); return; }
    if (user?.role === "admin") loadUsers();
  }, [user, authLoading, page]); // eslint-disable-line

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await adminApi.users.list({ page, page_size: 20 });
      setData(result);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const toggleRole = async (u: User) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await adminApi.users.update(u.id, { role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      loadUsers();
    } catch {
      toast.error("Error al actualizar rol");
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await adminApi.users.update(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? "Usuario desactivado" : "Usuario activado");
      loadUsers();
    } catch {
      toast.error("Error al actualizar usuario");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--secondary)" }}>
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Rol</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 rounded" style={{ background: "var(--secondary)" }} />
                  </td>
                </tr>
              ))
            ) : (
              data?.items.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge style={{
                      background: u.role === "admin" ? "#fbbf2422" : "#3b82f622",
                      color: u.role === "admin" ? "#fbbf24" : "#60a5fa"
                    }}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge style={{
                      background: u.is_active ? "#4ade8022" : "#6b728022",
                      color: u.is_active ? "#4ade80" : "#9ca3af"
                    }}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleRole(u)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                      >
                        {u.role === "admin" ? "→ User" : "→ Admin"}
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{
                          background: u.is_active ? "#f8717122" : "#4ade8022",
                          color: u.is_active ? "#f87171" : "#4ade80"
                        }}
                      >
                        {u.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
