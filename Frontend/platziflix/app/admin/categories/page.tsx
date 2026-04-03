"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { admin as adminApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminCategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) { router.push("/"); return; }
    if (user?.role === "admin") loadCategories();
  }, [user, authLoading]); // eslint-disable-line

  const loadCategories = async () => {
    setLoading(true);
    try {
      const result = await adminApi.categories.list();
      setCategories(result);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminApi.categories.update(editing.id, { name: form.name, description: form.description || undefined });
        toast.success("Categoría actualizada");
      } else {
        await adminApi.categories.create({ name: form.name, description: form.description || undefined });
        toast.success("Categoría creada");
      }
      setShowModal(false);
      loadCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await adminApi.categories.delete(id);
      toast.success("Categoría eliminada");
      loadCategories();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Button onClick={openCreate} style={{ background: "#2563eb" }} className="hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" /> Nueva categoría
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--secondary)" }}>
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Slug</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Descripción</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-4 rounded" style={{ background: "var(--secondary)" }} />
                  </td>
                </tr>
              ))
            ) : categories.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }} className="hover:bg-white/5">
                <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-400">{c.slug}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{c.description || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:text-white text-gray-400">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:text-red-400 text-gray-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent style={{ background: "var(--card)", border: "1px solid var(--border)", color: "white" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label className="text-gray-300 mb-1 block">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} style={{ background: "#2563eb" }} className="hover:opacity-90 flex-1">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}
                style={{ border: "1px solid var(--border)", color: "white" }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
