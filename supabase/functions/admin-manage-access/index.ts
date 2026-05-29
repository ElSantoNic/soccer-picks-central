import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUser(admin: ReturnType<typeof createClient>, identifier: string) {
  if (UUID_RE.test(identifier)) {
    const { data, error } = await admin.auth.admin.getUserById(identifier);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }
  const email = identifier.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return { id: match.id, email: match.email ?? null };
    if (data.users.length < 200) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Missing token" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) return json(401, { error: "Unauthorized" });

    const callerId = userData.user.id;

    const { data: adminRow } = await admin
      .from("admin_users")
      .select("id")
      .eq("user_id", callerId)
      .maybeSingle();
    if (!adminRow) return json(403, { error: "Forbidden" });

    const payload = await req.json().catch(() => null);
    const action = String(payload?.action ?? "");

    if (action === "list") {
      const { data: rows, error } = await admin
        .from("admin_users")
        .select("user_id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const enriched = await Promise.all(
        (rows ?? []).map(async (r: { user_id: string; created_at: string }) => {
          const { data } = await admin.auth.admin.getUserById(r.user_id);
          return {
            user_id: r.user_id,
            email: data?.user?.email ?? null,
            created_at: r.created_at,
          };
        }),
      );
      return json(200, { admins: enriched });
    }

    const identifier = String(payload?.identifier ?? "").trim();
    if (!identifier) return json(400, { error: "identifier is required" });

    const target = await resolveUser(admin, identifier);
    if (!target) return json(404, { error: "User not found", identifier });

    if (action === "grant") {
      const { error } = await admin
        .from("admin_users")
        .upsert({ user_id: target.id }, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw error;
      return json(200, { ok: true, user_id: target.id, email: target.email });
    }

    if (action === "revoke") {
      if (target.id === callerId) {
        return json(400, { error: "You cannot revoke your own admin access" });
      }
      const { error } = await admin
        .from("admin_users")
        .delete()
        .eq("user_id", target.id);
      if (error) throw error;
      return json(200, { ok: true, user_id: target.id, email: target.email });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("admin-manage-access error:", err);
    return json(500, { error: (err as Error).message ?? "Internal error" });
  }
});
