import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TccClient from "./tcc-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function TccDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const accessToken = session.access_token;

  let initialAnalysis = null;
  let initialReview = null;
  let initialReferences = null;

  try {
    const res = await fetch(`${API_URL}/api/documents/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const doc = await res.json();
      initialAnalysis = doc.metadata?.analise_estrutura || null;
      initialReview = doc.metadata?.revisao_qualidade || null;
      initialReferences = doc.metadata?.referencias_abnt || null;
    }
  } catch {
    // fallback
  }

  return (
    <TccClient
      docId={params.id}
      accessToken={accessToken}
      initialAnalysis={initialAnalysis}
      initialReview={initialReview}
      initialReferences={initialReferences}
    />
  );
}
