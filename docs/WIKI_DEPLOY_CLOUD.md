# OPSI A: Deploy ke Cloud (Netlify + Supabase)

Ikuti langkah-langkah berikut secara berurutan untuk menjalankan Adimology di cloud menggunakan Netlify dan Supabase.

## A1. Setup Supabase

1. Buat akun dan project baru di [Supabase](https://supabase.com/)
2. Catat kredensial berikut dari **Integration > Data API**: `API URL` → catat untuk nanti di Netlify `NEXT_PUBLIC_SUPABASE_URL`
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/supabase01.png)
3. Catat kredensial berikut dari **Project Settings > API Keys > Legacy anon, service_role API keys**: `anon public` key → catat untuk nanti di Netlify `NEXT_PUBLIC_SUPABASE_ANON_KEY`
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/supabase02.png)


**PENTING: Persiapan Database (Wajib Sekali Saja)**
Agar migrasi otomatis dapat berjalan, Anda perlu menyiapkan infrastruktur pelacakan migrasi secara manual:
1. Buka folder **supabase** di repository ini, pilih file <a href="https://github.com/bhaktiutama/adimology/blob/main/supabase/000_init.sql" target="_blank">**000_init.sql**</a>, lalu salin (copy) seluruh teks yang ada di dalamnya.
2. Buka **SQL Editor** di Dashboard Supabase dan paste teks script tersebut.
3. Klik **Run**.
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/supabase03.png)
4. Setelah berhasil, migrasi database lainnya (`001_...` dst) akan dijalankan otomatis setiap kali build di Netlify.

## A2. Deploy ke Netlify

1. **Fork Repository**: Pastikan Anda sudah memiliki dan login ke akun GitHub Anda. Buka link repository [Adimology](https://github.com/bhaktiutama/adimology/) ini di GitHub, lalu klik tombol **Fork** di pojok kanan atas. Ini akan membuat salinan project ini di akun GitHub Anda sendiri agar Anda bisa menghubungkannya ke Netlify.
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/netlify01.png)
2. Jika sudah berhasil akan tampak seperti di bawah ini. Kedepannya klik Sync fork untuk mendapatkan update fitur terbaru.
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/netlify02.png)
3. Login ke [Netlify](https://www.netlify.com/) dan klik **Add new site > Import an existing project**
4. Pilih Github, akan ada pop up untuk login ke github, ikuti saja langkahnya
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/netlify03.png)
5. Pilih repository Adimology dari GitHub anda
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/netlify04.png)
6. Tambahkan **Environment Variables** di Netlify:
![Supabase Setup](https://raw.githubusercontent.com/bhaktiutama/adimology/main/public/netlify05.png)

   | Variable | Nilai | Wajib |
   |----------|-------|:-----:|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL dari Supabase langkah A1 no 2| ✅ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase langkah A1 no 3| ✅ |
   | `CRON_SECRET` | String acak untuk keamanan cron | ✅ |
   | `GEMINI_API_KEY` | API Key dari [Google AI Studio](https://aistudio.google.com/) | ✅ |
   | `STOCKBIT_USERNAME` | Username akun Stockbit Anda | ✅ |
   | `STOCKBIT_PASSWORD` | Password akun Stockbit Anda | ✅ |
   | `STOCKBIT_PLAYER_ID` | Player ID dari Stockbit* | ✅ |

   \* **Cara mendapatkan STOCKBIT_PLAYER_ID**:
   1. Login ke [Stockbit](https://stockbit.com/) di browser
   2. Buka Developer Tools (F12) → Application/Storage → **Cookies** → https://stockbit.com
   3. Cari cookie dengan nama `player_id` dan copy value-nya

7. Klik **Deploy site** dan tunggu hingga selesai
8. Catat URL Netlify Anda (contoh: `https://your-app.netlify.app`) akan digunakan untuk proses berikutnya 

## A3. Verifikasi Instalasi

1. Buka URL Netlify Anda
2. Cek indikator koneksi Stockbit di aplikasi - harus menunjukkan **Connected**
3. Jika status **Disconnected**, periksa environment variables `STOCKBIT_USERNAME`, `STOCKBIT_PASSWORD`, dan `STOCKBIT_PLAYER_ID` sudah benar
4. Coba analisis saham pertama Anda! 🎉

**Catatan**: Aplikasi sekarang menggunakan auto-login, tidak perlu lagi install Chrome Extension.

## A4. Checkpoint Troubleshooting Koneksi

Jika status di aplikasi masih **"Disconnected"** atau Token invalid, silakan lakukan [pemeriksaan poin-poin berikut](https://github.com/bhaktiutama/adimology/wiki/Checkpoint).

   