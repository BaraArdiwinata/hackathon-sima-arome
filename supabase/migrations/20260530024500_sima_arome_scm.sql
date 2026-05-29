-- ═══════════════════════════════════════════════════════════
-- Sima Arôme Supply Chain Management — Database Migration
-- ═══════════════════════════════════════════════════════════
-- Description: Complete initial schema with RLS, triggers, indexes, and constraints.
-- Author: Antigravity AI
-- Date: 2026-05-30
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Create Core Tables ──────────────────────────────────

-- Table: roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- Table: users
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    fullname VARCHAR(50) NOT NULL,
    phone_number VARCHAR(10) NOT NULL,
    gender INTEGER NOT NULL, -- 1: Laki-laki, 2: Perempuan
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table: suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    phone_number VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: product_suppliers
CREATE TABLE public.product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    unit VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: offers
CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_supplier_id UUID NOT NULL REFERENCES public.product_suppliers(id) ON DELETE CASCADE,
    price BIGINT NOT NULL,
    quality BIGINT NOT NULL, -- Skala 1-100
    lead_time BIGINT NOT NULL -- Dalam satuan hari
);

-- Table: cold_storage_logs
CREATE TABLE public.cold_storage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(50) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    alert_triggered BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: warehouses
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.cold_storage_logs(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,
    location BIGINT NOT NULL, -- Koordinat Surabaya disimulasikan
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: raw_materials
CREATE TABLE public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
    batch_code VARCHAR(100) NOT NULL UNIQUE,
    material_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING_QC', 'QC_ACCEPTED', 'QC_REJECTED', 'IN_PRODUCTION')),
    total_price BIGINT NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    received_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(255) NOT NULL,
    categories VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL
);

-- Table: product_stocks
CREATE TABLE public.product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL DEFAULT 0
);

-- Table: productions
CREATE TABLE public.productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    products_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL,
    planned_quantity BIGINT NOT NULL,
    actual_quantity BIGINT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    lot_number VARCHAR(100) UNIQUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: recipe
CREATE TABLE public.recipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    products_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: phase
CREATE TABLE public.phase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- Compounding, Maceration, Filtering, Bottling, dll
    description VARCHAR(255) NOT NULL
);

-- Table: productions_phase
CREATE TABLE public.productions_phase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.phase(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    note TEXT NOT NULL
);

-- Table: quality_control
CREATE TABLE public.quality_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID UNIQUE REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
    production_id UUID UNIQUE REFERENCES public.productions(id) ON DELETE RESTRICT,
    checked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    qc_status VARCHAR(50) NOT NULL CHECK (qc_status IN ('PASSED', 'FAILED', 'PENDING')),
    qc_notes TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: productions_materials
CREATE TABLE public.productions_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
    production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
    quantity_used BIGINT NOT NULL
);

-- Table: audit_trails
CREATE TABLE public.audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    old_data TEXT,
    new_data TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ── 2. Add Relational Constraints ─────────────────────────

-- DBML Ref: "recipe"."id" < "recipe"."raw_material_id"
-- (The inline foreign keys satisfy the logical relations between recipe, products, and raw_materials)

-- Add 1-to-1 constraint for cold_storage_logs pointing back to warehouses if needed
ALTER TABLE public.cold_storage_logs ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;


-- ── 3. Enable Row Level Security (RLS) ─────────────────────

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_storage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions_phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trails ENABLE ROW LEVEL SECURITY;


-- ── 4. RLS Policies ───────────────────────────────────────

-- Standard Enterprise Access Policies:
-- 1. Unauthenticated (anon) has NO ACCESS.
-- 2. Authenticated users can READ all data.
-- 3. Authenticated users can write/modify data.
-- (Permissions are checked and enforced at DaaS / Next.js proxy route layers, 
-- but RLS blocks direct client-side leaks from anonymous users).

CREATE POLICY "Allow authenticated read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.roles FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.users FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.suppliers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.product_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.product_suppliers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.offers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.cold_storage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.cold_storage_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.warehouses FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.raw_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.raw_materials FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.products FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.product_stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.product_stocks FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.productions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.productions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.recipe FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.recipe FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.phase FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.phase FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.productions_phase FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.productions_phase FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.quality_control FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.quality_control FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.productions_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.productions_materials FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.audit_trails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.audit_trails FOR ALL TO authenticated USING (true);


-- ── 5. Indexes for Performance ────────────────────────────

-- Index Foreign Key columns to maximize join and search speed
CREATE INDEX idx_users_role_id ON public.users(role_id);
CREATE INDEX idx_offers_supplier_id ON public.offers(supplier_id);
CREATE INDEX idx_offers_product_supplier_id ON public.offers(product_supplier_id);
CREATE INDEX idx_warehouses_log_id ON public.warehouses(log_id);
CREATE INDEX idx_raw_materials_warehouse_id ON public.raw_materials(warehouse_id);
CREATE INDEX idx_raw_materials_offer_id ON public.raw_materials(offer_id);
CREATE INDEX idx_raw_materials_received_by ON public.raw_materials(received_by);
CREATE INDEX idx_product_stocks_product_id ON public.product_stocks(product_id);
CREATE INDEX idx_product_stocks_warehouse_id ON public.product_stocks(warehouse_id);
CREATE INDEX idx_productions_products_id ON public.productions(products_id);
CREATE INDEX idx_productions_created_by ON public.productions(created_by);
CREATE INDEX idx_recipe_products_id ON public.recipe(products_id);
CREATE INDEX idx_recipe_raw_material_id ON public.recipe(raw_material_id);
CREATE INDEX idx_productions_phase_production_id ON public.productions_phase(production_id);
CREATE INDEX idx_productions_phase_phase_id ON public.productions_phase(phase_id);
CREATE INDEX idx_quality_control_raw_material_id ON public.quality_control(raw_material_id);
CREATE INDEX idx_quality_control_production_id ON public.quality_control(production_id);
CREATE INDEX idx_quality_control_checked_by ON public.quality_control(checked_by);
CREATE INDEX idx_productions_materials_raw_material_id ON public.productions_materials(raw_material_id);
CREATE INDEX idx_productions_materials_production_id ON public.productions_materials(production_id);
CREATE INDEX idx_audit_trails_user_id ON public.audit_trails(user_id);


-- ── 6. Auto-Update Triggers ───────────────────────────────

-- Function to dynamically update "updated_at" timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users & raw_materials
CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_update_raw_materials_timestamp
    BEFORE UPDATE ON public.raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- ── 7. Grants ─────────────────────────────────────────────

-- Grant select, insert, update, delete permissions to authenticated role and full postgres access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
