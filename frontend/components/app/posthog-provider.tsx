"use client";

import { useEffect, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_API_KEY || "";

export default function PosthogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) {
      // Modo mock — sem Posthog configurado
      return;
    }

    // Import dinâmico para não quebrar se a lib falhar
    import("posthog-js").then((posthog) => {
      posthog.default.init(POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        capture_pageview: false,
        loaded: () => {
          if (process.env.NODE_ENV === "development") {
            console.log("[MOCK] Posthog inicializado em modo dev");
          }
        },
      });
    }).catch(() => {
      if (process.env.NODE_ENV === "development") {
        console.log("[MOCK] Posthog não disponível");
      }
    });
  }, []);

  // Captura pageview em cada rota
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    import("posthog-js").then((posthog) => {
      posthog.default.capture("$pageview", {
        $current_url: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""),
      });
    }).catch(() => {});
  }, [pathname, searchParams]);

  return <>{children}</>;
}
