# Project Phases: Sima Arôme Supply Chain Management

Dokumen ini melacak kemajuan pengembangan sistem Sima Arôme Supply Chain Management menggunakan metodologi Phased Development. Setiap fase wajib diselesaikan dan divalidasi sebelum memulai fase berikutnya.

---

## Ringkasan Kemajuan (Progress Summary)

| Phase | Nama Fase | Fokus | Status | Target Selesai |
| :---: | :--- | :--- | :---: | :---: |
| **0** | **Foundation** | Penginstalan dasar, konfigurasi Auth, infrastruktur testing, integrasi Mantine Theme. | **COMPLETED** | 2026-05-29 |
| **1** | **Data Foundation** | Migrasi database PostgreSQL di Supabase, RLS policies, konfigurasi DaaS collections, Next.js Auth API routes. | **COMPLETED** | 2026-05-30 |
| **2** | **Core UI** | Halaman utama dashboard, visualisasi menu navigasi berbasis peran (RBAC), formulir CRUD pemasok, gudang, resep, pengguna. | PENDING | - |
| **3** | **Business Logic & UVP** | Engine perhitungan kuantitatif AHP Procurement, IoT cuaca cold storage simulation, Production Phase timeline. | PENDING | - |
| **4** | **Relations & QC** | Alur integrasi stok barang jadi & resep bahan baku, audit trails, modul Raw QC & Product QC. | PENDING | - |
| **5** | **Polish & Delivery** | Penanganan error menyeluruh, E2E Testing, optimasi performa Core Web Vitals, deploi ke AWS Amplify. | PENDING | - |

---

## Rincian Fase & Kriteria Keluar (Phase Exit Criteria)

### 🟢 PHASE 0: FOUNDATION (Selesai)
*   **Fokus**: Bootstrapping Next.js, inisialisasi Mantine Theme, konfigurasi ESLint/Prettier, instalasi library dasar UI, dan penyiapan berkas pelacakan.
*   **Daftar Tugas (Tasks)**:
    *   [x] Verifikasi versi minimum prerequisites (Node.js v24, pnpm v10, Git).
    *   [x] Bootstrapping Next.js & Buildpad UI menggunakan CLI bootstrap.
    *   [x] Penyelarasan versi Mantine dates, dropzone, dan tiptap (v8.x).
    *   [x] Kustomisasi global design tokens (`design-tokens.css`) sejalan dengan warna & font Sima Arôme.
    *   [x] Penyesuaian `lib/theme.ts` dengan font display Cormorant Garamond & Montserrat.
    *   [x] Refaktorisasi `DaaSProviderWrapper` menggunakan pola penonton aktif `onAuthStateChange`.
    *   [x] Konfigurasi file `.env.local` dengan kredensial Supabase + DaaS.
    *   [x] Setup Playwright (`playwright.config.ts`) dan Smoke Test halaman login.
*   **Exit Gate**:
    - [x] Aplikasi Next.js berjalan tanpa error kompilasi (`npm run dev`).
    - [x] Font premium Cormorant Garamond, Montserrat, dan Inter ter-render sempurna di peramban.

---

### 🟢 PHASE 1: DATA FOUNDATION (Selesai)
*   **Fokus**: DDL database relasional, migrasi schema, DaaS collection setup, RLS policies, dan proxy API route otentikasi.
*   **Daftar Tugas (Tasks)**:
    *   [x] Eksekusi script DDL migrasi di database Supabase (20260530024500_sima_arome_scm.sql dibuat).
    *   [x] Pendaftaran koleksi dan field data di panel admin DaaS.
    *   [x] Konfigurasi izin akses RLS (Row Level Security) per tabel.
    *   [x] Implementasi Next.js proxy API `/api/auth/login` dan `/api/auth/logout` (dengan pembersihan cookie daas_resource_uri).
*   **Exit Gate**:
    - [x] Seluruh tabel terbuat dengan relasi foreign key yang benar di PostgreSQL.
    - [x] Pengujian API auth proxy menghasilkan status sukses (200) dengan cookie JWT HttpOnly.

---

### ⚪ PHASE 2: CORE UI (Belum Dimulai)
*   **Fokus**: Halaman list/detail data, layout sidebar interaktif berbasis RBAC, formulir CRUD relasional.
*   **Daftar Tugas (Tasks)**:
    *   [ ] Layout dashboard dengan sidebar responsif dan proteksi menu navigasi.
    *   [ ] CRUD Suppliers & Offers menggunakan `CollectionList` dan `VTable` BuildPad.
    *   [ ] CRUD Warehouses & Product Stocks.
    *   [ ] CRUD Products & Recipes formula.
    *   [ ] CRUD User management untuk Super Admin.
*   **Exit Gate**:
    - [ ] Halaman navigasi berjalan mulus tanpa kebocoran hak akses menu.
    - [ ] CRUD berjalan sempurna menyimpan data ke backend DaaS.

---

### ⚪ PHASE 3: BUSINESS LOGIC & UVP (Belum Dimulai)
*   **Fokus**: Implementasi algoritma AHP, pemantauan cuaca IoT cold storage, dan pelacakan silsilah produksi parfum.
*   **Daftar Tugas (Tasks)**:
    *   [ ] Implementasi `lib/ahpEngine.ts` untuk normalisasi, bobot kriteria, dan ranking vendor.
    *   [ ] Integrasi radar chart untuk performa penawaran supplier di modul Procurement.
    *   [ ] API Endpoint IoT cold storage `/api/iot` terintegrasi dengan Open-Meteo API.
    *   [ ] Komponen visual alarm/warning berkedip merah saat suhu cold storage melebihi 5°C.
    *   [ ] Alur phase tracking stepper untuk Compounding -> Maceration -> Filtering -> Bottling.
*   **Exit Gate**:
    - [ ] Perhitungan AHP terbukti presisi dengan tingkat inkonsistensi matriks CR < 0.1.
    - [ ] Alarm cold storage berbunyi di peramban ketika API simulasi mendeteksi suhu anomali.

---

### ⚪ PHASE 4: RELATIONS & QC (Belum Dimulai)
*   **Fokus**: Pengurangan bahan baku otomatis, kendali mutu (QC) multi-fase, dan pencatatan audit trails.
*   **Daftar Tugas (Tasks)**:
    *   [ ] Logika pemotongan otomatis stok bahan baku gudang sejalan dengan resep produk akhir ketika status produksi menjadi COMPLETED.
    *   [ ] Pintu validasi QC Raw Material: status PENDING_QC berpindah ke QC_ACCEPTED atau QC_REJECTED.
    *   [ ] Pintu validasi QC Product Jadi: lot_number berstatus PASSED atau FAILED.
    *   [ ] Query rekursif visual genealogy tree traceability untuk melacak bahan baku asal berdasarkan lot number.
    *   [ ] Trigger log audit trails PostgreSQL otomatis mencatat perubahan old/new data ke tabel `audit_trails`.
*   **Exit Gate**:
    - [ ] Transaksi resep terpotong dengan akurasi 100% pada stok gudang tanpa silent failure.
    - [ ] Struktur silsilah traceability ter-render utuh dan dapat diklik dari antarmuka.

---

### ⚪ PHASE 5: POLISH & DELIVERY (Belum Dimulai)
*   **Fokus**: Penanganan error terpusat, pengujian Playwright E2E, optimasi kecepatan, dan integrasi CI/CD AWS Amplify.
*   **Daftar Tugas (Tasks)**:
    *   [ ] Penanganan error terpusat (Error Boundary React) dan notifikasi visual Mantine.
    *   [ ] Penulisan skenario Playwright E2E untuk memvalidasi alur bisnis utama.
    *   [ ] Optimasi Core Web Vitals (LCP, FID, CLS) dan optimasi ukuran bundel JS.
    *   [ ] Penyusunan dokumentasi akhir sistem dan changelog.
    *   [ ] Deploi ke lingkungan AWS Amplify sejalan dengan berkas `amplify.yml`.
*   **Exit Gate**:
    - [ ] 100% skenario Playwright E2E sukses tanpa kendala.
    - [ ] Deploi build AWS Amplify berhasil dan dapat diakses publik.
