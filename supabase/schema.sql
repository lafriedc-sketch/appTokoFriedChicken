-- ==============================================================================
-- SKEMA DATABASE SUPABASE UNTUK LA FRIED CHICKEN POS & STORE MANAGEMENT
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE TABLES
-- Tabel Produk / Menu
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Ayam',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    icon_or_image_url TEXT,
    original_price NUMERIC(12, 2),
    discount_percent NUMERIC(5, 2),
    promo_items JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migration safety for existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_items JSONB;

-- Tabel Varian / Add-on Produk (Saus & Pelengkap)
CREATE TABLE IF NOT EXISTS product_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabel Master Bahan Baku (Inventory)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabel Log Pergerakan Bahan Baku & Belanja Masuk
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    change_qty NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'opname')),
    cost_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_source TEXT NOT NULL CHECK (payment_source IN ('drawer', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabel Log Batch Penggorengan Ayam & Sisa Etalase
CREATE TABLE IF NOT EXISTS frying_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fried_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    piece_count INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabel Transaksi Penjualan
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris')),
    cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cash_change NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    cashier_name TEXT DEFAULT 'Kasir',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migration safety for existing database
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cashier_name TEXT DEFAULT 'Kasir';

-- Tabel Detail Item Transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- Tabel Sesi Kas Laci (Drawer Management & Rekonsiliasi)
CREATE TABLE IF NOT EXISTS cash_drawers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    initial_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    actual_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_difference NUMERIC(12, 2),
    closed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Tabel Pengaturan Toko & QRIS
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'LA Fried Chicken',
    address TEXT DEFAULT 'Kios LA Fried Chicken',
    whatsapp_number TEXT DEFAULT '081234567890',
    receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungannya! Renyahnya bikin nagih 🍗🌸',
    qris_mode TEXT NOT NULL DEFAULT 'static' CHECK (qris_mode IN ('static', 'dynamic')),
    qris_static_image_url TEXT,
    admin_pin TEXT NOT NULL DEFAULT '1234',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Izinkan operasi SELECT, INSERT, UPDATE, dan DELETE untuk role 'anon' dan 'authenticated'
-- ==============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE frying_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anon full access products" ON products;
DROP POLICY IF EXISTS "Anon full access product_addons" ON product_addons;
DROP POLICY IF EXISTS "Anon full access inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Anon full access inventory_logs" ON inventory_logs;
DROP POLICY IF EXISTS "Anon full access frying_logs" ON frying_logs;
DROP POLICY IF EXISTS "Anon full access transactions" ON transactions;
DROP POLICY IF EXISTS "Anon full access transaction_items" ON transaction_items;
DROP POLICY IF EXISTS "Anon full access cash_drawers" ON cash_drawers;
DROP POLICY IF EXISTS "Anon full access store_settings" ON store_settings;

-- Create policies for anon
CREATE POLICY "Anon full access products" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access product_addons" ON product_addons FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access inventory_items" ON inventory_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access inventory_logs" ON inventory_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access frying_logs" ON frying_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access transaction_items" ON transaction_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access cash_drawers" ON cash_drawers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access store_settings" ON store_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create policies for authenticated as well
CREATE POLICY "Auth full access products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access product_addons" ON product_addons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access inventory_items" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access inventory_logs" ON inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access frying_logs" ON frying_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access transactions" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access transaction_items" ON transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access cash_drawers" ON cash_drawers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access store_settings" ON store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. SEED DATA DEFAULT (LA FRIED CHICKEN)
-- ==============================================================================

-- Default Store Settings
INSERT INTO store_settings (id, store_name, address, whatsapp_number, receipt_footer, qris_mode, qris_static_image_url, admin_pin)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'LA Fried Chicken',
    'Jl. Melati Rasa No. 88, Kios Sentra Kuliner',
    '081234567890',
    'Terima kasih telah berbelanja di LA Fried Chicken! Renyah, Gurih & Selalu Fresh 🍗🌸',
    'static',
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126590014ID.LINKAJA.WWW011893600911002233445502150000000000000005204581253033605802ID5916LA%20FRIED%20CHICKEN6007JAKARTA61051234062070703A0163041234',
    '1234'
) ON CONFLICT (id) DO NOTHING;

-- Default Products
INSERT INTO products (name, category, price, is_available, icon_or_image_url) VALUES
('Dada', 'Ayam', 11000, true, '🍗'),
('Paha Atas', 'Ayam', 11000, true, '🍗'),
('Paha Bawah', 'Ayam', 9000, true, '🍗'),
('Sayap', 'Ayam', 9000, true, '🍗'),
('Paket Nasi + Dada', 'Paket', 14000, true, '🍱'),
('Paket Hemat Paha Bawah', 'Paket', 12000, true, '🍱'),
('Promo Beli 2 Gratis 1 Sayap', 'Promo', 18000, true, '🔥'),
('Promo Combo Serbu (2 Ayam + Nasi + Es Teh)', 'Promo', 25000, true, '🎉'),
('Nasi', 'Makanan', 4000, true, '🍚'),
('Es Teh', 'Minuman', 3000, true, '🥤')
ON CONFLICT DO NOTHING;

-- Default Product Addons
INSERT INTO product_addons (name, price) VALUES
('Saus Keju', 2000),
('Sambal Geprek', 2000),
('Saus Pedas', 1000)
ON CONFLICT DO NOTHING;

-- Default Inventory Items
INSERT INTO inventory_items (name, unit, min_stock, current_stock) VALUES
('Ayam Mentah', 'potong', 20, 60),
('Minyak Goreng', 'liter', 5, 20),
('Tepung', 'kg', 5, 25),
('Bumbu Marinasi', 'pack', 2, 10),
('Beras', 'kg', 5, 30),
('Box Kertas Nasi', 'pcs', 30, 150),
('Cup Es Teh', 'pcs', 30, 150),
('Kantong Kresek', 'pack', 2, 15)
ON CONFLICT DO NOTHING;
