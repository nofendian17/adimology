# OPSI B: Instalasi Lokal (PC + Supabase)

Ikuti langkah-langkah berikut secara berurutan:

## B1. Setup Supabase

> ⚠️ Langkah ini **sama dengan Opsi A**. Jika sudah setup Supabase, lanjut ke B2.

1. Buat akun dan project baru di [Supabase](https://supabase.com/)
2. Catat kredensial berikut dari **Project Settings > Data API**:
   - `Project URL` → untuk `NEXT_PUBLIC_SUPABASE_URL`
3. Catat kredensial berikut dari **Project Settings > API Keys > Legacy anon, service_role API keys**:
   - `anon public` key → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **PENTING: Persiapan Database (Wajib Sekali Saja)**
> Lakukan langkah yang sama seperti di **Opsi A (A1: Langkah 1-4)** dengan menjalankan `supabase/000_init.sql` di SQL Editor Supabase.
> 
> Setelah infrastruktur siap, Anda bisa menjalankan migrasi database lainnya secara otomatis dengan perintah:
> ```bash
> npm run migrate
> ```

## B2. Clone & Install

1. Clone repository:
   ```bash
   git clone https://github.com/username/adimology.git
   cd adimology
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Salin file environment:
   ```bash
   cp .env.local.example .env.local
   ```

4. Edit `.env.local` dan isi variabel berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   GEMINI_API_KEY=AIzaSy...
   STOCKBIT_USERNAME=your_stockbit_username
   STOCKBIT_PASSWORD=your_stockbit_password
   STOCKBIT_PLAYER_ID=your_player_id
   ```

   | Variable | Nilai | Wajib |
   |----------|-------|:-----:|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL dari Supabase | ✅ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase | ✅ |
   | `GEMINI_API_KEY` | API Key dari [Google AI Studio](https://aistudio.google.com/) | ✅ |
   | `STOCKBIT_USERNAME` | Username akun Stockbit Anda | ✅ |
   | `STOCKBIT_PASSWORD` | Password akun Stockbit Anda | ✅ |
   | `STOCKBIT_PLAYER_ID` | Player ID dari Stockbit* | ✅ |

   \* **Cara mendapatkan STOCKBIT_PLAYER_ID**:
   1. Login ke [Stockbit](https://stockbit.com/) di browser
   2. Buka Developer Tools (F12) → Application/Storage → **Cookies** → https://stockbit.com
   3. Cari cookie dengan nama `player_id` dan copy value-nya

   **Catatan**: `STOCKBIT_USERNAME`, `STOCKBIT_PASSWORD`, dan `STOCKBIT_PLAYER_ID` **wajib** diisi untuk auto-login. Tidak lagi memerlukan Chrome Extension.

## B3. Jalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

## B3.5. Menjalankan Netlify Functions Lokal (Wajib untuk AI)

Fitur analisis AI (Story Analysis) menggunakan Netlify Functions. Untuk menjalankannya secara lokal:

1. Install Netlify CLI secara global:
   ```bash
   npm install -g netlify-cli
   ```

2. Jalankan Netlify Functions pada port 8888 (buka terminal baru):
   ```bash
   netlify functions:serve --port 8888
   ```

3. Validasi bahwa function berikut berhasil dimuat di terminal:
   - `analyze-watchlist`
   - `analyze-watchlist-background`
   - `analyze-story-background`

   > **Note**: Biarkan terminal ini tetap berjalan berdampingan dengan terminal aplikasi utama (`npm run dev`).

## B4. Verifikasi Instalasi

1. Pastikan aplikasi berjalan (`npm run dev`)
2. Buka [http://localhost:3000](http://localhost:3000)
3. Cek indikator koneksi Stockbit - harus menunjukkan **Connected**
4. Jika status **Disconnected**, periksa environment variables `STOCKBIT_USERNAME`, `STOCKBIT_PASSWORD`, dan `STOCKBIT_PLAYER_ID` sudah benar
5. Coba analisis saham pertama Anda! 🎉

**Catatan**: Aplikasi sekarang menggunakan auto-login, tidak perlu lagi install Chrome Extension.
