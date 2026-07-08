import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error } = await supabase.rpc("refresh_all_user_stats");
  if (error) {
    // Fallback : recalcul manuel si la RPC n'existe pas encore
    const { data: profiles } = await supabase.from("profiles").select("id");
    for (const p of profiles ?? []) {
      const uid = p.id;
      const [{ count: postsCount }, { count: followersCount }, { count: followingCount }, { count: clubsCount }, { count: eventsCount }] =
        await Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", uid),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", uid),
          supabase.from("clubs").select("*", { count: "exact", head: true }).eq("created_by", uid),
          supabase.from("events").select("*", { count: "exact", head: true }).eq("created_by", uid),
        ]);

      const { data: userPosts } = await supabase.from("posts").select("id").eq("author_id", uid);
      const postIds = (userPosts ?? []).map((x) => x.id);
      let totalLikes = 0;
      let totalComments = 0;
      if (postIds.length) {
        const [{ count: lc }, { count: cc }] = await Promise.all([
          supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", postIds),
          supabase.from("post_comments").select("*", { count: "exact", head: true }).in("post_id", postIds),
        ]);
        totalLikes = lc ?? 0;
        totalComments = cc ?? 0;
      }

      await supabase.from("user_stats").upsert({
        user_id: uid,
        posts_count: postsCount ?? 0,
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0,
        clubs_created_count: clubsCount ?? 0,
        events_created_count: eventsCount ?? 0,
        total_likes_received: totalLikes,
        total_comments_received: totalComments,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
