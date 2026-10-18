# Deploy Vercel + SteinHQ

Proyek ini tidak menggunakan Google Apps Script atau Google Cloud. Vercel
menyajikan halaman siswa/guru dan bertindak sebagai proxy aman ke SteinHQ.
SteinHQ kemudian terhubung ke Google Sheet Anda.

## Persiapan SteinHQ

1. Masuk ke SteinHQ dan buat API dari Google Sheet Anda.
2. Pastikan tab yang dipakai bernama `DataSiswa` (atau catat nama lainnya).
3. Baris pertama tab harus berisi header berikut, persis sama:

   ```text
   Email | Nama | Kelas | Status | Nilai Hidrostatis | Nilai Pascal | Nilai Archimedes | Diperbarui
   ```

4. Aktifkan Basic Authentication di SteinHQ bila tersedia dan catat username
   serta password-nya. Jangan taruh kredensial itu pada `index.html`.

URL SteinHQ yang dipakai proyek ini sudah disetel ke:

```text
https://api.steinhq.com/v1/storages/6ad38b9d92b1163e975592e3
```

## Environment Variables Vercel

Pada Vercel > Project > Settings > Environment Variables, isi untuk
**Production**:

| Nama | Wajib | Nilai |
| --- | --- | --- |
| `STEIN_API_URL` | Ya | URL storage SteinHQ di atas |
| `STEIN_SHEET_NAME` | Ya | `DataSiswa` atau nama tab Anda |
| `STEIN_TEACHER_SHEET_NAME` | Ya | `guru` atau nama tab kredensial guru Anda |
| `STEIN_USERNAME` | Jika Basic Auth aktif | Username SteinHQ |
| `STEIN_PASSWORD` | Jika Basic Auth aktif | Password SteinHQ |

Setelah mengisi atau mengubah variable, lakukan redeploy. Variable baru hanya
berlaku pada deployment baru.

## Menjalankan secara lokal

1. Pastikan Node.js versi 18 atau lebih baru tersedia. Salin `.env.example`
   menjadi `.env`, lalu isi nilainya sesuai konfigurasi
   SteinHQ yang dipakai untuk pengembangan. File `.env` tidak akan masuk Git.
2. Jalankan `npm install` (cukup sekali setelah clone atau perubahan dependensi).
3. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Server lokal ini menjalankan halaman dan endpoint `/api/*` bersama-sama,
sehingga penyimpanan siswa dan login guru dapat diuji sebelum deploy. Hindari
membuka `index.html` langsung dari file explorer karena endpoint API tidak
akan tersedia.

## Halaman aplikasi

- `/` atau `index.html` — halaman siswa.
- `/guru.html` — halaman login dan rekap nilai guru.
- `/api/health` — pemeriksaan konfigurasi dasar, tanpa menampilkan rahasia.

Tombol **Masuk sebagai Guru** pada halaman siswa membuka `/guru.html`.
Tambahkan tab `guru` pada spreadsheet dengan header `Username | Password`; setiap
baris setelahnya adalah satu akun guru. Kombinasi tersebut diverifikasi di
Vercel dan tidak disimpan di JavaScript frontend.

## Uji

1. Buka `https://domain-anda.vercel.app/api/health`; pastikan nilai
   `teacherSheetName` cocok dengan nama tab kredensial guru.
2. Buka halaman siswa di mode incognito, isi identitas, lalu selesaikan kuis.
3. Buka `/guru.html`, masukkan `Username` dan `Password` dari tab `guru`, dan
   periksa nilai muncul.
4. Bila data tidak muncul, cek nama tab dan header Google Sheet di atas, lalu
   buka Vercel > Logs untuk melihat `student API error` atau `teacher API error`.

Jangan membagikan URL editor Google Sheet, password guru, atau kredensial
SteinHQ kepada siswa.
