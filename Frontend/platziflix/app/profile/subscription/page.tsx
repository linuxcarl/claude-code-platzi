"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptions as subsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Subscription, Payment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login?redirect=/profile/subscription"); return; }
    if (user) {
      Promise.all([subsApi.current(), subsApi.paymentHistory()])
        .then(([sub, pays]) => {
          setSubscription(sub);
          setPayments(pays);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleCancel = async () => {
    if (!confirm("¿Seguro que quieres cancelar tu suscripción?")) return;
    setCanceling(true);
    try {
      await subsApi.cancel();
      toast.success("Suscripción cancelada");
      const sub = await subsApi.current();
      setSubscription(sub);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setCanceling(false);
    }
  };

  const statusColor: Record<string, string> = {
    active: "#4ade80",
    canceled: "#f87171",
    past_due: "#fbbf24",
    expired: "#6b7280",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <CreditCard className="w-6 h-6" /> Mi suscripción
      </h1>

      {loading ? (
        <div className="h-40 rounded-xl" style={{ background: "var(--card)" }} />
      ) : !subscription ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-4">No tienes una suscripción activa</p>
          <Link href="/plans">
            <Button style={{ background: "#e50914" }} className="hover:opacity-90">
              Ver planes
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className="rounded-xl p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{subscription.plan.name}</h2>
                <p className="text-gray-400 text-sm">{subscription.plan.description}</p>
              </div>
              <Badge style={{ background: `${statusColor[subscription.status]}22`, color: statusColor[subscription.status] }}>
                {subscription.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500">Facturación</p>
                <p className="text-white font-medium">
                  {subscription.billing_cycle === "monthly" ? "Mensual" : "Anual"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Precio</p>
                <p className="text-white font-medium">
                  ${subscription.billing_cycle === "monthly"
                    ? subscription.plan.monthly_price
                    : subscription.plan.annual_price}/{subscription.billing_cycle === "monthly" ? "mes" : "año"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Inicio período</p>
                <p className="text-white">{new Date(subscription.current_period_start).toLocaleDateString("es")}</p>
              </div>
              <div>
                <p className="text-gray-500">Fin período</p>
                <p className="text-white">{new Date(subscription.current_period_end).toLocaleDateString("es")}</p>
              </div>
            </div>
            {subscription.status === "active" && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={canceling}
                style={{ border: "1px solid #f87171", color: "#f87171" }}
              >
                {canceling ? "Cancelando..." : "Cancelar suscripción"}
              </Button>
            )}
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h2 className="text-lg font-semibold mb-4">Historial de pagos</h2>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-white">Pago #{p.id.slice(0, 8)}</p>
                      <p className="text-gray-500">{new Date(p.paid_at || p.created_at).toLocaleDateString("es")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${p.amount} {p.currency}</p>
                      <p className="text-green-400 flex items-center gap-1 justify-end">
                        <CheckCircle className="w-3 h-3" /> {p.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
