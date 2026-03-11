INSERT INTO storage.buckets (id, name, public) VALUES ('agent-images', 'agent-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Allow public read on agent-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'agent-images');
CREATE POLICY "Allow public insert on agent-images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'agent-images');
CREATE POLICY "Allow public update on agent-images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'agent-images');
CREATE POLICY "Allow public delete on agent-images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'agent-images');
