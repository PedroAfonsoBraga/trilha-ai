import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./onboarding-form";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const profile = await res.json();
        if (profile.perfil) {
          redirect("/dashboard");
        }
      }
    } catch {
      // proceed to onboarding
    }
  }

  return <OnboardingForm />;
}
