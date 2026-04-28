// Temporary debug function — generates a signed URL for a given audio-temp path.
// DELETE after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return new Response("missing path", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.storage
    .from("audio-temp")
    .createSignedUrl(path, 3600);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
});
