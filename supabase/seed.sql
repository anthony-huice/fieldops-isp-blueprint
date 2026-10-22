-- =============================================================================
-- DEMO SEED DATA (100% FICTITIOUS — ZERO REAL PII)
-- =============================================================================

INSERT INTO public.tenants (id, name, slug)
VALUES
  ('aaaa1111-bbbb-2222-cccc-333333333333', 'FiberNet Demo ISP North', 'fibernet-demo-north'),
  ('dddd4444-eeee-5555-ffff-666666666666', 'OpticWave Demo ISP South', 'opticwave-demo-south')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.inventory_items (
  tenant_id, model_name, gpon_serial, mac_address, custody_state, hardware_metadata
)
VALUES
  ('aaaa1111-bbbb-2222-cccc-333333333333', 'Dual-Band Wi-Fi 6 GPON ONU X6', 'ZTEG1A2B3C4D', 'A0:B1:C2:D3:E4:F5', 'CENTRAL_WAREHOUSE', '{"ports_ge": 4, "pots": 1, "wifi_standard": "802.11ax"}'::JSONB),
  ('aaaa1111-bbbb-2222-cccc-333333333333', 'Dual-Band AC1200 GPON ONT', 'HWTC9F8E7D6C', '10:22:33:44:55:66', 'ASSIGNED_TO_TECH', '{"ports_ge": 4, "wifi_standard": "802.11ac"}'::JSONB)
ON CONFLICT (tenant_id, gpon_serial) DO NOTHING;
