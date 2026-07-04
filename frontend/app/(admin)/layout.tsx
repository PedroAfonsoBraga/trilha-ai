import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Verifica se é admin (evita que sub-páginas esqueçam a verificação)
  let isAdmin = false;
  try {
    const res = await fetch(`${API_URL}/api/admin/check`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      isAdmin = data.admin === true;
    }
  } catch {
    // fallback
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
