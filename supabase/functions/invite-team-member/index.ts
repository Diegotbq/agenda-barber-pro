// Deploy with: supabase functions deploy invite-team-member
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return response({ error: "Function secrets are not configured." }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Authentication required." }, 401);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "Invalid session." }, 401);

  let body: { barbershopId?: string; email?: string; fullName?: string; role?: string };
  try { body = await req.json(); } catch { return response({ error: "Invalid JSON body." }, 400); }

  const barbershopId = String(body.barbershopId || "");
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const role = String(body.role || "barber");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barbershopId)) {
    return response({ error: "Invalid barbershop." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: "Enter a valid e-mail." }, 400);
  if (fullName.length < 2 || fullName.length > 80) return response({ error: "Name must contain 2 to 80 characters." }, 400);
  if (!["barber", "receptionist", "admin"].includes(role)) return response({ error: "Invalid team role." }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership, error: memberError } = await admin
    .from("barbershop_members").select("role")
    .eq("barbershop_id", barbershopId).eq("user_id", authData.user.id).maybeSingle();
  if (memberError) return response({ error: "Could not verify your permissions." }, 500);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return response({ error: "Only the owner or an administrator can invite team members." }, 403);
  }
  if (role === "admin" && membership.role !== "owner") {
    return response({ error: "Only the owner can invite another administrator." }, 403);
  }

  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, invited_barbershop_id: barbershopId },
  });
  if (inviteError || !invitation.user) {
    return response({ error: inviteError?.message || "Could not send invitation." }, 400);
  }

  const { error: insertError } = await admin.from("barbershop_members").upsert({
    barbershop_id: barbershopId,
    user_id: invitation.user.id,
    role,
  }, { onConflict: "barbershop_id,user_id" });
  if (insertError) {
    console.error("Invite sent but membership insert failed", insertError.message);
    return response({ error: "The invitation email was sent, but the team link could not be saved. Contact support before retrying." }, 500);
  }

  return response({ invited: true, email, role });
});
