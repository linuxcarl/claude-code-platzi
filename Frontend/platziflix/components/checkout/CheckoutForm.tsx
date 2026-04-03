"use client";

import { useState } from "react";
import { subscriptions as subsApi } from "@/lib/api";
import type { SubscriptionPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Lock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  plan: SubscriptionPlan;
  billingCycle: "monthly" | "annual";
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutForm({ plan, billingCycle, open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  const price = billingCycle === "annual" ? plan.annual_price : plan.monthly_price;
  const label = billingCycle === "annual" ? "año" : "mes";

  const formatCard = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic mock validations
    const rawNumber = card.number.replace(/\s/g, "");
    if (rawNumber.length < 16) { toast.error("Número de tarjeta inválido"); return; }
    if (!card.expiry.includes("/")) { toast.error("Fecha de expiración inválida"); return; }
    if (card.cvc.length < 3) { toast.error("CVC inválido"); return; }

    setStep("processing");

    // Simulate payment processing delay
    await new Promise((r) => setTimeout(r, 1500));

    try {
      await subsApi.subscribe({ plan_id: plan.id, billing_cycle: billingCycle });
      setStep("success");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el pago");
      setStep("form");
    }
  };

  const handleClose = () => {
    if (step === "processing") return;
    setStep("form");
    setCard({ number: "", expiry: "", cvc: "", name: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "white" }}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: "#2563eb" }} />
            {step === "success" ? "¡Pago exitoso!" : "Completar suscripción"}
          </DialogTitle>
        </DialogHeader>

        {step === "success" ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-bold mb-2">¡Bienvenido a {plan.name}!</h3>
            <p className="text-gray-400 mb-6">
              Tu suscripción está activa. Ahora tienes acceso a todo el contenido.
            </p>
            <Button
              onClick={() => { handleClose(); onSuccess(); }}
              style={{ background: "#2563eb" }}
              className="hover:opacity-90 w-full"
            >
              Empezar a aprender
            </Button>
          </div>
        ) : step === "processing" ? (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin"
              style={{ borderColor: "#2563eb", borderTopColor: "transparent" }}
            />
            <p className="text-gray-400">Procesando pago...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plan summary */}
            <div
              className="rounded-lg p-3 flex justify-between items-center"
              style={{ background: "var(--secondary)" }}
            >
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-gray-400">Facturación {billingCycle === "annual" ? "anual" : "mensual"}</p>
              </div>
              <p className="text-xl font-black" style={{ color: "#2563eb" }}>
                ${price} <span className="text-sm text-gray-400">/{label}</span>
              </p>
            </div>

            {/* Mock card fields */}
            <div>
              <Label className="text-gray-300 mb-1 block">Nombre en la tarjeta</Label>
              <Input
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                placeholder="Juan García"
                required
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
              />
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Número de tarjeta</Label>
              <div className="relative">
                <Input
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                  placeholder="4242 4242 4242 4242"
                  required
                  style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white", paddingRight: "2.5rem" }}
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Usa 4242 4242 4242 4242 para test</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 mb-1 block">Vencimiento</Label>
                <Input
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                  placeholder="MM/AA"
                  required
                  style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">CVC</Label>
                <Input
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder="123"
                  required
                  style={{ background: "var(--input)", border: "1px solid var(--border)", color: "white" }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full hover:opacity-90 gap-2"
              style={{ background: "#2563eb" }}
            >
              <Lock className="w-4 h-4" />
              Pagar ${price}/{label}
            </Button>

            <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Pago seguro simulado — entorno de pruebas
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
