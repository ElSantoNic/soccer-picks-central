import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EMAIL = (Deno.env.get("ADMIN_ALLOWED_EMAIL") ?? "").trim().toLowerCase();

// Constant-time string comparison to prevent timing attacks on the setup secret.
// Iterates the full length regardless of input length to avoid leaking length info.
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const { email, newPassword, setupSecret } = payload ?? {};

    if (
      typeof email !== "string" ||
      typeof newPassword !== "string" ||
      typeof setupSecret !== "string"
    ) {
      return json(400, { error: "Missing or invalid fields" });
    }

    const expected = Deno.env.get("ADMIN_PASSWORD_SETUP_SECRET");
    const emailNorm = email.trim().toLowerCase();

    // Generic 401 for both bad secret and disallowed email so callers cannot
    // distinguish which check failed.
    if (
      !expected ||
      !ALLOWED_EMAIL ||
      !timingSafeEqual(setupSecret, expected) ||
      emailNorm !== ALLOWED_EMAIL
    ) {
      console.warn("admin-set-password: unauthorized attempt", {
        ip: req.headers.get("x-forwarded-for") ?? "unknown",
      });
      return json(401, { error: "Unauthorized" });
    }

    // Stronger password policy.
    if (
      newPassword.length < 12 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return json(400, {
        error:
          "Password must be at least 12 characters and contain a letter and a number",
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;

    let user = list.users.find((u) => u.email?.toLowerCase() === ALLOWED_EMAIL);

    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ALLOWED_EMAIL,
        password: newPassword,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      user = created.user;
    } else {
      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        email_confirm: true,
      });
      if (updErr) throw updErr;
    }

    // Do not leak admin user id.
    return json(200, { success: true });
  } catch (err: any) {
    console.error("admin-set-password error:", err);
    return json(500, { error: "Internal error" });
  }
});
