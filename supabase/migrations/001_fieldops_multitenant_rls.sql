-- =============================================================================
-- FIELDOPS MULTI-TENANT FTTH & WMS BLUEPRINT — O(1) ROW-LEVEL SECURITY SCHEMA
-- =============================================================================
-- Architectural Pattern:
--   To avoid expensive multi-table JOINs inside PostgreSQL RLS policies,
--   `tenant_id` is denormalized across every operational table (`profiles`,
--   `work_orders`, `inventory_items`, `audit_logs`) and resolved in O(1) via
--   an indexed STABLE security-definer helper or JWT claim.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.fieldops_role AS ENUM ('tenant_admin', 'dispatcher', 'field_tech');

-- 1. TABLE: tenants (Root Organization)
CREATE TABLE IF NOT EXISTS public.tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLE: profiles (Multi-Role Operational Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID                 PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       UUID                 NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role            public.fieldops_role NOT NULL DEFAULT 'field_tech',
  full_name       TEXT                 NOT NULL,
  abac_permissions JSONB               NOT NULL DEFAULT '{"can_move_orders": true, "can_assign_stock": false}'::JSONB,
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_abac_gin ON public.profiles USING GIN (abac_permissions);

-- 3. TABLE: work_orders (Dynamic Kanban Cards + GPS + Signature)
CREATE TABLE IF NOT EXISTS public.work_orders (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_tech_id   UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  phase              VARCHAR(35) NOT NULL DEFAULT 'SALES_INTAKE',
  subscriber_name    TEXT        NOT NULL,
  technical_payload  JSONB       NOT NULL DEFAULT '{}'::JSONB, -- NAP GPS, Premises GPS, Optical dBm, Assigned Serials
  evidence_urls      TEXT[]      NOT NULL DEFAULT '{}',
  signature_svg      TEXT        NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_phase ON public.work_orders (tenant_id, phase);
CREATE INDEX IF NOT EXISTS idx_work_orders_payload_gin ON public.work_orders USING GIN (technical_payload);

-- 4. TABLE: inventory_items (Serialized GPON ONUs / Routers WMS)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  custodian_tech_id  UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  model_name         TEXT        NOT NULL,
  gpon_serial        VARCHAR(20) NOT NULL,
  mac_address        VARCHAR(17) NOT NULL,
  custody_state      VARCHAR(30) NOT NULL DEFAULT 'CENTRAL_WAREHOUSE',
  hardware_metadata  JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, gpon_serial)
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_state ON public.inventory_items (tenant_id, custody_state);
CREATE INDEX IF NOT EXISTS idx_inventory_metadata_gin ON public.inventory_items USING GIN (hardware_metadata);

-- 5. TABLE: audit_logs (Immutable Chronological Traceability)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id    UUID        NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id   UUID        NOT NULL,
  action      VARCHAR(50) NOT NULL,
  diff_jsonb  JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs (tenant_id, created_at DESC);

-- =============================================================================
-- O(1) MULTI-TENANT ROW-LEVEL SECURITY (ZERO-JOIN POLICIES)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::UUID,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_profiles"
  ON public.profiles FOR ALL
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_work_orders"
  ON public.work_orders FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_inventory_items"
  ON public.inventory_items FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());
