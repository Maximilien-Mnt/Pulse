import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface UsePostCommentOptions {
  postId: string;
  initialCommentsCount: number;
  onCommentsChange?: (postId: string, commentsCount: number) => void;
}

export interface UsePostCommentResult {
  commentsCount: number;
  isPending: boolean;
  addComment: (body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

type AddRow = { comment_id: string; comments_count: number };
type DeleteRow = { post_id: string; comments_count: number };

export function usePostComment({
  postId,
  initialCommentsCount,
  onCommentsChange,
}: UsePostCommentOptions): UsePostCommentResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const mutatingRef = useRef(false);

  useEffect(() => {
    if (mutatingRef.current) return;
    setCommentsCount(initialCommentsCount);
  }, [initialCommentsCount]);

  const apply = useCallback(
    (count: number) => {
      const patch = (posts: any[]) =>
        posts.map((p) => (p?.id === postId ? { ...p, comments_count: Math.max(0, count) } : p));

      const updater = (old: any) => {
        if (!old) return old;
        if (Array.isArray(old.pages))
          return {
            ...old,
            pages: old.pages.map((page: any) => ({ ...page, items: patch(page.items) })),
          };
        if (Array.isArray(old)) return patch(old);
        return old;
      };

      queryClient.setQueriesData({ queryKey: ['feed'] }, updater);
      queryClient.setQueriesData({ queryKey: ['user-posts-with-author'] }, updater);
      queryClient.setQueriesData({ queryKey: ['user-posts'] }, updater);
      queryClient.setQueriesData({ queryKey: ['post', postId] }, (old: any) =>
        old ? { ...old, comments_count: Math.max(0, count) } : old
      );
    },
    [postId, queryClient]
  );

  const notify = useCallback(
    (count: number) => onCommentsChange?.(postId, count),
    [postId, onCommentsChange]
  );

  const add = useMutation({
    mutationFn: async (body: string): Promise<AddRow> => {
      if (!userId) throw new Error('User not authenticated');
      if (!body.trim()) throw new Error('Empty comment body');

      const { data, error } = await (supabase.rpc as any)('add_post_comment', {
        target_post_id: postId,
        comment_body: body.trim(),
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('add_post_comment returned no result');
      return row;
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['user-posts-with-author'] });
      await queryClient.cancelQueries({ queryKey: ['user-posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      await queryClient.cancelQueries({ queryKey: ['post-comments-count', postId] });

      const prev = commentsCount;
      const next = prev + 1;
      mutatingRef.current = true;
      setCommentsCount(next);
      apply(next);
      notify(next);
      return { prev };
    },

    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      const prev = (ctx as any).prev;
      setCommentsCount(prev);
      apply(prev);
      notify(prev);
    },

    onSuccess: (row) => {
      setCommentsCount(row.comments_count);
      apply(row.comments_count);
      notify(row.comments_count);
    },

    onSettled: () => {
      mutatingRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['user-posts-with-author'] });
      void queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      void queryClient.invalidateQueries({ queryKey: ['post-comments-count', postId] });
    },
  });

  const del = useMutation({
    mutationFn: async (commentId: string): Promise<DeleteRow> => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await (supabase.rpc as any)('delete_post_comment', {
        target_comment_id: commentId,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('delete_post_comment returned no result');
      return row;
    },

    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['user-posts-with-author'] });
      await queryClient.cancelQueries({ queryKey: ['user-posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      await queryClient.cancelQueries({ queryKey: ['user-posts-comments', postId] });
      await queryClient.cancelQueries({ queryKey: ['post-comments-count', postId] });

      const prev = commentsCount;
      const next = Math.max(0, prev - 1);
      mutatingRef.current = true;
      setCommentsCount(next);
      apply(next);

      queryClient.setQueriesData({ queryKey: ['comments', postId] }, (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c.id !== commentId) : old
      );
      queryClient.setQueriesData(
        { queryKey: ['user-posts-comments', postId] },
        (old: any) => (Array.isArray(old) ? old.filter((c: any) => c.id !== commentId) : old)
      );

      return { prev };
    },

    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      const prev = (ctx as any).prev;
      setCommentsCount(prev);
      apply(prev);
    },

    onSuccess: (row) => {
      setCommentsCount(row.comments_count);
      apply(row.comments_count);
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      void queryClient.invalidateQueries({ queryKey: ['user-posts-comments', postId] });
    },

    onSettled: () => {
      mutatingRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['user-posts-with-author'] });
      void queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      void queryClient.invalidateQueries({ queryKey: ['post-comments-count', postId] });
    },
  });

  const addComment = useCallback(
    async (body: string) => {
      await add.mutateAsync(body);
    },
    [add]
  );
  const deleteComment = useCallback(
    async (commentId: string) => {
      await del.mutateAsync(commentId);
    },
    [del]
  );

  return {
    commentsCount,
    isPending: add.isPending || del.isPending,
    addComment,
    deleteComment,
  };
}
