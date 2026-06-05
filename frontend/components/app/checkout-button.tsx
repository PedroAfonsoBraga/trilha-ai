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

  const handleCheckout = async () => {
    setLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=/planos`);
      return;
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (res.status === 401) {
      router.push(`/login?next=/planos`);
      return;
    }

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`mt-8 block w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
        variant === "primary"
          ? "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          : "border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      }`}
    >
      {loading ? "Redirecionando..." : label}
    </button>
  );
}
