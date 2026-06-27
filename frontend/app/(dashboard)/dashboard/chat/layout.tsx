import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatShell from "./chat-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function ChatLayout({
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
  const accessToken = session?.access_token || "";

  return (
    <ChatShell accessToken={accessToken} apiUrl={API_URL}>
      {children}
    </ChatShell>
  );
}
