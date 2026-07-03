-- Broker connections table for linking to external forex trading platforms
CREATE TABLE IF NOT EXISTS broker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker text NOT NULL,
  status text NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('CONNECTED','DISCONNECTED','ERROR')),
  credentials jsonb NOT NULL DEFAULT '{}',
  account_id text,
  balance numeric(18,2),
  leverage text,
  server text,
  last_sync timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_broker_connections" ON broker_connections;
CREATE POLICY "anon_select_broker_connections" ON broker_connections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_broker_connections" ON broker_connections;
CREATE POLICY "anon_insert_broker_connections" ON broker_connections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_broker_connections" ON broker_connections;
CREATE POLICY "anon_update_broker_connections" ON broker_connections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_broker_connections" ON broker_connections;
CREATE POLICY "anon_delete_broker_connections" ON broker_connections FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_broker_connections_broker ON broker_connections(broker);
