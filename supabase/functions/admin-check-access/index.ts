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

    const { data: adminRow } = await admin
      .from("admin_users")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!adminRow) return json(403, { error: "Forbidden" });

    const payload = await req.json().catch(() => null);
    const identifier = String(payload?.identifier ?? "").trim();
    if (!identifier) return json(400, { error: "identifier is required" });

    let targetUser: { id: string; email: string | null } | null = null;

    if (UUID_RE.test(identifier)) {
      const { data, error } = await admin.auth.admin.getUserById(identifier);
      if (error || !data.user) return json(404, { error: "User not found", identifier });
      targetUser = { id: data.user.id, email: data.user.email ?? null };
    } else {
      const email = identifier.toLowerCase();
      // listUsers paginated; scan up to 10 pages of 200.
      for (let page = 1; page <= 10 && !targetUser; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const match = data.users.find((u) => u.email?.toLowerCase() === email);
        if (match) targetUser = { id: match.id, email: match.email ?? null };
        if (data.users.length < 200) break;
      }
      if (!targetUser) return json(404, { error: "User not found", identifier });
    }

    const { data: targetAdmin } = await admin
      .from("admin_users")
      .select("id, created_at")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    return json(200, {
      user_id: targetUser.id,
      email: targetUser.email,
      is_admin: !!targetAdmin,
      granted_at: targetAdmin?.created_at ?? null,
    });
  } catch (err) {
    console.error("admin-check-access error:", err);
    return json(500, { error: "Internal error" });
  }
});
