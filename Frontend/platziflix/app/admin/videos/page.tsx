"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { admin as adminApi, categories as catsApi } from "@/lib/api";
import type { VideoListItem, Category, PaginatedResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import FileUpload from "@/components/admin/FileUpload";

const STATUS_COLOR: Record<string, string> = {
  published: "#4ade80",
  draft: "#fbbf24",
  archived: "#6b7280",
};

export default function AdminVideosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<VideoListItem> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VideoListItem | null>(null);
  const [form, setForm] = useState({ title: "", description: "", video_url: "", thumbnail_url: "", is_free: false, category_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) { router.push("/"); return; }
    if (user?.role === "admin") {
      catsApi.list().then(setCategories).catch(console.error);
      loadVideos();
    }
  }, [user, authLoading, page]); // eslint-disable-line

  const loadVideos = async () => {
    setLoading(true);
    try {
      const result = await adminApi.videos.list({ page, page_size: 15 });
      setData(result);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", video_url: "", thumbnail_url: "", is_free: false, category_id: "" });
    setShowModal(true);
  };

  const openEdit = (v: VideoListItem) => {
    setEditing(v);
    setForm({ title: v.title, description: v.description || "", video_url: "", thumbnail_url: v.thumbnail_url || "", is_free: v.is_free, category_id: v.category?.id || "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminApi.videos.update(editing.id, {
          title: form.title,
          description: form.description || undefined,
          video_url: form.video_url || undefined,
          thumbnail_url: form.thumbnail_url || undefined,
          is_free: form.is_free,
          category_id: form.category_id || undefined,
        });
        toast.success("Video actualizado");
      } else {
        await adminApi.videos.create({
          title: form.title,
          description: form.description || undefined,
          video_url: form.video_url || undefined,
          thumbnail_url: form.thumbnail_url || undefined,
          is_free: form.is_free,
          category_id: form.category_id || undefined,
        });
        toast.success("Video creado");
      }
      setShowModal(false);
      loadVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await adminApi.videos.publish(id);
      toast.success("Video publicado");
      loadVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este video?")) return;
    try {
      await adminApi.videos.delete(id);
      toast.success("Video eliminado");
      loadVideos();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Button onClick={openCreate} style={{ background: "#e50914" }} className="hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" /> Nuevo video
        </Button>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: "var(--secondary)" }}>
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Título</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Tipo</th>
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
              data?.items.map((v) => (
                <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{v.title}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{v.category?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge style={{ background: `${STATUS_COLOR[v.status]}22`, color: STATUS_COLOR[v.status] }}>
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge style={{ background: v.is_free ? "#16a34a22" : "#e5091422", color: v.is_free ? "#4ade80" : "#f87171" }}>
                      {v.is_free ? "Gratis" : "Premium"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {v.status !== "published" && (
                        <button onClick={() => handlePublish(v.id)} title="Publicar" className="p-1.5 hover:text-green-400 text-gray-400">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(v)} title="Editar" className="p-1.5 hover:text-white text-gray-400">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(v.id)} title="Eliminar" className="p-1.5 hover:text-red-400 text-gray-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (data.pages ?? Math.ceil(data.total / 15)) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400">Página {page} de {(data.pages ?? Math.ceil(data.total / 15))}</span>
          <Button variant="outline" size="sm" disabled={page >= (data.pages ?? Math.ceil(data.total / 15))} onClick={() => setPage(page + 1)}
            style={{ border: "1px solid var(--border)", color: "white" }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent style={{ background: "var(--card)", border: "1px solid var(--border)", color: "white" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar video" : "Nuevo video"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label className="text-gray-300 mb-1 block">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">URL del video</Label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://..."
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
              {editing && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">O subir archivo:</p>
                  <FileUpload
                    videoId={editing.id}
                    onUploadComplete={(url) => setForm((f) => ({ ...f, video_url: url }))}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">URL miniatura</Label>
              <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://..."
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }} />
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Categoría</Label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded text-white"
                style={{ background: "var(--input)", border: "1px solid var(--border)" }}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_free" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
              <Label htmlFor="is_free" className="text-gray-300">Contenido gratuito</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} style={{ background: "#e50914" }} className="hover:opacity-90 flex-1">
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
