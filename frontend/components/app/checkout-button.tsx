"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CheckoutButtonProps {
  priceId: string;
  label: string;
  variant: "primary" | "outline";
}

export default function CheckoutButton({ priceId, label, variant }: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=/#pricing`);
      return;
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (res.status === 401) {
      router.push(`/login?next=/#pricing`);
      return;
    }

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
      setError(data.error || "Erro ao iniciar checkout. Tente novamente.");
    }
  };

  return (
    <div>
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`mt-8 block w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          : "border border-input text-foreground hover:bg-muted disabled:opacity-50"
      }`}
    >
      {loading ? "Redirecionando..." : label}
    </button>
    {error && (
      <p className="mt-2 text-center text-xs text-destructive">{error}</p>
    )}
    </div>
  );
}
