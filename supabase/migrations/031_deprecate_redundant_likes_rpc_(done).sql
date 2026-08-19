-- Migration 031: Deprecate redundant likes RPC functions
-- 
-- The increment_post_likes and decrement_post_likes functions from migration 028
-- are redundant because the database trigger `adjust_post_likes_count()` (from migration 001)
-- already handles likes count updates automatically.
--
-- This migration removes the redundant RPC functions and updates PostCard.tsx to rely
-- solely on the database trigger.

-- Drop the redundant RPC functions
DROP FUNCTION IF EXISTS public.increment_post_likes(uuid);
DROP FUNCTION IF EXISTS public.decrement_post_likes(uuid);

-- Note: The adjust_post_likes_count() trigger from migration 001 remains active
-- and continues to maintain likes_count automatically when post_likes records are
-- inserted or deleted.