"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { users as usersApi, auth as authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { User, Heart, Clock, CreditCard } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  if (!user) {
    router.push("/login?redirect=/profile");
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updateMe({ full_name: fullName });
      await refreshUser();
      toast.success("Perfil actualizado");
    } catch {
      toast.error("Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast.error("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    setChangingPwd(true);
    try {
      await authApi.changePassword({ current_password: currentPwd, new_password: newPwd });
      toast.success("Contraseña actualizada");
      setCurrentPwd("");
      setNewPwd("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setChangingPwd(false);
    }
  };

  const quickLinks = [
    { href: "/profile/favorites", icon: Heart, label: "Mis favoritos" },
    { href: "/profile/history", icon: Clock, label: "Historial" },
    { href: "/profile/subscription", icon: CreditCard, label: "Suscripción" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <User className="w-6 h-6" /> Mi perfil
      </h1>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {quickLinks.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Profile form */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4">Información personal</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label className="text-gray-300 mb-1.5 block">Nombre completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-1.5 block">Email</Label>
            <Input
              value={user.email}
              disabled
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "gray" }}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            style={{ background: "#e50914" }}
            className="hover:opacity-90"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label className="text-gray-300 mb-1.5 block">Contraseña actual</Label>
            <Input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-1.5 block">Nueva contraseña</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
          <Button
            type="submit"
            disabled={changingPwd}
            variant="outline"
            style={{ border: "1px solid var(--border)", color: "white" }}
          >
            {changingPwd ? "Actualizando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
