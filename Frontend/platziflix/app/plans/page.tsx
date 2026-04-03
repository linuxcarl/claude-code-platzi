"use client";

import { useEffect, useState } from "react";
import { subscriptions as subsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SubscriptionPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState<SubscriptionPlan | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    subsApi.plans()
      .then((d) => setPlans(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!user) { router.push("/login?redirect=/plans"); return; }
    setCheckout(plan);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Elige tu plan</h1>
        <p className="text-gray-400">Accede a todo el contenido que necesitas para crecer</p>

        <div
          className="inline-flex rounded-lg p-1 mt-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setBilling("monthly")}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: billing === "monthly" ? "#e50914" : "transparent", color: "white" }}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling("annual")}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: billing === "annual" ? "#e50914" : "transparent", color: "white" }}
          >
            Anual (2 meses gratis)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" style={{ background: "var(--card)" }} />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={plan.id}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--card)",
                border: idx === 1 ? "2px solid #e50914" : "1px solid var(--border)",
              }}
            >
              {idx === 1 && (
                <div
                  className="text-xs font-bold px-2 py-0.5 rounded mb-3 self-start"
                  style={{ background: "#e50914", color: "white" }}
                >
                  MÁS POPULAR
                </div>
              )}
              <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
              <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-black">
                  ${billing === "monthly" ? plan.monthly_price : (plan.annual_price / 12).toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm">/mes</span>
                {billing === "annual" && (
                  <p className="text-xs text-green-400 mt-0.5">
                    ${plan.annual_price}/año · Ahorras ${((plan.monthly_price * 12) - plan.annual_price).toFixed(2)}
                  </p>
                )}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {(plan.features ?? []).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan)}
                className="w-full hover:opacity-90"
                style={{ background: idx === 1 ? "#e50914" : "var(--secondary)", color: "white" }}
              >
                Suscribirse
              </Button>
            </div>
          ))}
        </div>
      )}

      {checkout && (
        <CheckoutForm
          plan={checkout}
          billingCycle={billing}
          open={!!checkout}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); router.push("/profile/subscription"); }}
        />
      )}
    </div>
  );
}
