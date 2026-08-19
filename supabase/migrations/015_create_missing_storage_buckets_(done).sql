-- Create missing storage buckets (events, clubs) + policies
-- These were declared in 002_v2.sql but never applied to the live DB.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('clubs', 'clubs', true),
  ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- clubs bucket policies
CREATE POLICY "Clubs read"
ON storage.objects FOR SELECT
USING (bucket_id = 'clubs');

CREATE POLICY "Clubs upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clubs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Clubs update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clubs' AND owner = auth.uid());

-- events bucket policies
CREATE POLICY "Events read"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Events upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'events' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Events update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'events' AND owner = auth.uid());