import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>
        <div className="mt-8 rounded-xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Bem-vindo, {user.email}!
          </p>
        </div>
      </div>
    </div>
  );
}
