// TEMPORARY — runs the same logic as process-memo but signed-in as the memo owner via service role.
// Reads memo, gets user_id, then forwards a POST to process-memo with a fresh user JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const memoId = url.searchParams.get("memo_id")!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. fetch the memo to get user_id
  const { data: memo, error: memoErr } = await admin
    .from("memos").select("user_id").eq("id", memoId).single();
  if (memoErr || !memo) {
    return new Response(JSON.stringify({ step: "fetch-memo", error: memoErr?.message ?? "not found" }), { status: 500 });
  }

  // 2. fetch user email from auth
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(memo.user_id);
  if (userErr || !userData?.user?.email) {
    return new Response(JSON.stringify({ step: "get-user", error: userErr?.message ?? "no email" }), { status: 500 });
  }

  // 3. generate a magic link to grab an access token (or sign-in via admin)
  // Simpler: use generateLink type=magiclink and parse — but we actually need a session token.
  // Easiest path: use admin.signInWithPassword? No password. Use createUser/impersonate via signInWithIdToken? Not available.
  // Use generateLink("magiclink") returns a hashed token + a properties.action_link. We can call /verify to exchange.
  // Even simpler: forward the call by calling process-memo logic ourselves, signing a request with a one-shot session.
  //
  // Workaround: use admin.auth.admin.generateLink to mint a recovery link and exchange it server-side.

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkErr || !linkData) {
    return new Response(JSON.stringify({ step: "generate-link", error: linkErr?.message }), { status: 500 });
  }

  // The action_link is like https://<project>.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=...
  // Hitting it returns a redirect with a fragment containing access_token. We follow it manually.
  const actionLink = linkData.properties?.action_link;
  if (!actionLink) {
    return new Response(JSON.stringify({ step: "no-link", linkData }), { status: 500 });
  }

  const verifyResp = await fetch(actionLink, { redirect: "manual" });
  const location = verifyResp.headers.get("location") || "";
  const fragment = location.split("#")[1] || "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  if (!accessToken) {
    return new Response(JSON.stringify({ step: "exchange", verifyStatus: verifyResp.status, location }), { status: 500 });
  }

  // 4. Now call process-memo with this access_token
  const startMs = Date.now();
  const pmResp = await fetch(`${supabaseUrl}/functions/v1/process-memo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
    },
    body: JSON.stringify({ memo_id: memoId, mode: "voice" }),
  });
  const elapsedMs = Date.now() - startMs;
  const pmText = await pmResp.text();

  return new Response(JSON.stringify({
    process_memo_status: pmResp.status,
    process_memo_elapsed_ms: elapsedMs,
    process_memo_body: pmText.slice(0, 5000),
  }), { headers: { "content-type": "application/json" } });
});
