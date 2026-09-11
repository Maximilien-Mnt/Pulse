-- Feed cursor pagination support: composite index for
-- ORDER BY created_at DESC, id DESC with keyset predicate.
-- Additive, safe to apply; ordering semantics unchanged.
CREATE INDEX IF NOT EXISTS idx_posts_created_id_desc
  ON public.posts (created_at DESC, id DESC);
