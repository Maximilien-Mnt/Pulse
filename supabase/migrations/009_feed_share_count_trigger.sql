-- Add trigger to update shares_count when a share is logged in feed_interactions

CREATE OR REPLACE FUNCTION public.adjust_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.action = 'share' THEN
    UPDATE public.posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_interactions_share_ai ON public.feed_interactions;

CREATE TRIGGER trg_feed_interactions_share_ai
AFTER INSERT ON public.feed_interactions
FOR EACH ROW
WHEN (NEW.action = 'share')
EXECUTE FUNCTION public.adjust_post_shares_count();
