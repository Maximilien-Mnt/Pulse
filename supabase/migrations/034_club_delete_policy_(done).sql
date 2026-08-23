-- Allow club creators to delete their clubs
CREATE POLICY "clubs_delete_creator"
ON public.clubs FOR DELETE TO authenticated
USING (created_by = auth.uid());
