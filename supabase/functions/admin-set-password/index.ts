import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EMAIL = (Deno.env.get("ADMIN_ALLOWED_EMAIL") ?? "").trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword, setupSecret } = await req.json();

    if (!email || !newPassword || !setupSecret) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("ADMIN_PASSWORD_SETUP_SECRET");
    if (!expected || setupSecret !== expected) {
      return new Response(JSON.stringify({ error: "Invalid setup secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_EMAIL || email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      return new Response(JSON.stringify({ error: "Email not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find user by email
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;

    let user = list.users.find((u) => u.email?.toLowerCase() === ALLOWED_EMAIL);

    if (!user) {
      // Create the user with the password
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

    return new Response(JSON.stringify({ success: true, userId: user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-set-password error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
