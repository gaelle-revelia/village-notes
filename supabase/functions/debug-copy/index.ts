// TEMPORARY — copies an object inside a bucket using service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket")!;
  const from = url.searchParams.get("from")!;
  const to = url.searchParams.get("to")!;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.storage.from(bucket).copy(from, to);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
});
