# 🍗🌸 LA Fried Chicken - Smart POS & Store Management System

Aplikasi Web Responsif (Mobile-Friendly, Thumb-Friendly) untuk sistem kasir POS, kontrol stok etalase gorengan, inventaris bahan baku, kalkulator kembalian instan, rekonsiliasi kas laci, dashboard grafik laba harian, dan Halaman Admin CRUD untuk kios **LA Fried Chicken**.

---

## 🎨 Branding & Desain UI
- **Aesthetic**: Cute Pastel & Aesthetic Female-Friendly
- **Palet Warna**: Soft Pink Pastel (`#FDF2F4`), Rose Pink / Warm Coral (`#FB7185` / `#F43F5E`), White Card (`rounded-3xl`, soft shadow)
- **Ergonomi**: Tombol sentuh besar (tinggi 48px - 56px), mudah dioperasikan satu tangan (thumb-friendly).
- **Celebration FX**: Efek confetti partikel melayang bunga (`🌺`, `🌻`, `🌹`, `🌷`) dan ayam krispi (`🍗✨`) saat pembayaran sukses.

---

## 🚀 Fitur Utama & Modul

1. **Kasir POS Cepat & Modal Awal Laci (`/`)**:
   - Modal wajib kas awal (default Rp200.000) sebelum transaksi pertama.
   - Menu dinamis Supabase dengan filter kategori ayam, makanan, minuman, paket.
   - Pilihan varian saus & add-on dinamis.
   - Keranjang belanja interaktif dengan animasi bounce.
   - Kalkulator Kembalian Real-Time: tombol pecahan instan (Uang Pas, 10k, 20k, 50k, 100k), deteksi uang kurang.
   - Pratinjau struk mini 58mm, cetak thermal printer, dan bagikan nota via WhatsApp (`wa.me`).

2. **Kontrol Penggorengan & Etalase (`/frying`)**:
   - Catat batch penggorengan harian (jam goreng, jumlah potong, catatan).
   - Catatan ayam susut/afkir/rusak/gosong.
   - Form sisa etalase saat tutup kios.

3. **Inventaris Bahan Baku & Stok Opname (`/inventory`)**:
   - Status stok bahan baku dengan badge peringatan minimum stok.
   - Form belanja masuk dengan pilihan sumber dana (Laci Kasir vs Saldo Non-Tunai).
   - Form Stok Opname fisik tutup kios & kalkulasi otomatis pemakaian bahan.

4. **Tutup Kasir & Rekonsiliasi Kas Laci (`/drawer`)**:
   - Perhitungan otomatis Target Uang Laci: `Modal Awal + Penjualan Tunai - Belanja Tunai Laci`.
   - Input hitung fisik uang riil di laci saat closing.
   - Deteksi selisih otomatis: "Pas 🌸", "Lebih (+Rp...)", atau "Kurang (-Rp...)".
   - Isolasi modal kas awal dari perhitungan laba operasional.

5. **Dashboard Laporan & Grafik Harian (`/reports`)**:
   - 3 KPI Cards: Sales Kotor (Omzet), Biaya Belanja, dan Margin/Laba Bersih (%) highlight utama.
   - Filter cepat: Hari Ini, Kemarin, 7 Hari Terakhir, Semua.
   - Visualisasi Recharts:
     * Bar Chart Tren Harian: Omzet vs Biaya Belanja.
     * Line Chart: Tren pergerakan laba bersih harian.
   - Ranking menu paling laris & ekspor data transaksi ke file `.csv` (Excel).

6. **Admin Master Data CRUD & PIN Protection (`/admin`)**:
   - Terlindungi PIN keamanan (default: `1234`).
   - CRUD Menu Produk & toggle ketersediaan (Tersedia / Habis).
   - CRUD Varian Saus / Add-on.
   - CRUD Master Bahan Baku & batas minimum stok.
   - Konfigurasi Mode QRIS Hybrid:
     * Mode A: QRIS Statis (Barcode toko + konfirmasi kasir manual tanpa potongan).
     * Mode B: QRIS Dinamis (Payment Gateway API otomatis).
   - Edit profil toko & ganti PIN admin.

---

## 🛠️ Langkah Menjalankan Proyek

### 1. Eksekusi Skema Database di Supabase
Buka SQL Editor di Dashboard Supabase (`https://supabase.com/dashboard/project/ljluiywawztuztsfvklc/sql`), lalu salin dan jalankan seluruh isi file:
```
supabase/schema.sql
```
Skema ini sudah mencakup seluruh DDL tabel, Row Level Security (RLS) untuk `anon`, dan seed data bawaan menu/bahan kios.

### 2. Konfigurasi Lingkungan (`.env.local`)
File `.env.local` sudah dibuat dengan kredensial:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ljluiywawztuztsfvklc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_KnD4kkQKSjuDMbjUcfytzw_KOCPHP4W
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Akses di browser ponsel atau laptop melalui `http://localhost:3000`.

---

## 📦 Push ke Repositori GitHub
Untuk push ke repositori GitHub yang telah disiapkan:
```bash
git remote add origin https://github.com/lafriedc-sketch/appTokoFriedChicken.git
git add .
git commit -m "feat: inisialisasi aplikasi kasir pos la fried chicken fullstack"
git push -u origin main
```
