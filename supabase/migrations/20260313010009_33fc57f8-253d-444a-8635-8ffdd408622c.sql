
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token text NOT NULL UNIQUE,
  ip_address text,
  label text NOT NULL DEFAULT 'Unknown Device',
  is_revoked boolean NOT NULL DEFAULT false,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on trusted_devices"
  ON public.trusted_devices
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
