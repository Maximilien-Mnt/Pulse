-- Migration 010: Fix feed counts and apply triggers
-- This migration:
-- 1. Recalculates all post counts from actual data
-- 2. Recalculates all comment counts from actual data  
-- 3. Applies the share count trigger (in case 009 wasn't applied)

-- Step 1: Fix posts likes_count
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)::int 
  FROM public.post_likes pl 
  WHERE pl.post_id = p.id
);

-- Step 2: Fix posts comments_count
UPDATE public.posts p
SET comments_count = (
  SELECT COUNT(*)::int 
  FROM public.post_comments pc 
  WHERE pc.post_id = p.id
);

-- Step 3: Fix posts shares_count
UPDATE public.posts p
SET shares_count = (
  SELECT COUNT(*)::int 
  FROM public.feed_interactions fi 
  WHERE fi.post_id = p.id AND fi.action = 'share'
);

-- Step 4: Fix post_comments likes_count
UPDATE public.post_comments pc
SET likes_count = (
  SELECT COUNT(*)::int 
  FROM public.comment_likes cl 
  WHERE cl.comment_id = pc.id
);

-- Step 5: Create share count trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.adjust_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.action = 'share' THEN
    UPDATE public.posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the share trigger
DROP TRIGGER IF EXISTS trg_feed_interactions_share_ai ON public.feed_interactions;

CREATE TRIGGER trg_feed_interactions_share_ai
AFTER INSERT ON public.feed_interactions
FOR EACH ROW
WHEN (NEW.action = 'share')
EXECUTE FUNCTION public.adjust_post_shares_count();

-- Step 7: Verify triggers exist (optional - just for logging)
-- The following triggers should already exist from migration 001:
-- - trg_post_likes_ai, trg_post_likes_ad (post likes count)
-- - trg_post_comments_ai, trg_post_comments_ad (post comments count)
-- - trg_comment_likes_ai, trg_comment_likes_ad (comment likes count)
