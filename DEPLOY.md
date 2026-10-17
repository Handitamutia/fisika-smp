# Deploy tanpa Google Apps Script

Proyek ini memakai **Vercel** sebagai hosting dan API serverless. API Vercel
berbicara ke Google Sheets API menggunakan service account; browser siswa tidak
pernah menerima kunci Google. Ini adalah pilihan yang direkomendasikan karena
frontend dan API ada dalam satu domain.

## Struktur proyek

- `index.html` — halaman belajar yang dapat dibuka siswa.
- `api/student.js` — API serverless untuk membuat/memperbarui progres siswa.
- `config.js` — URL API; kosong untuk Vercel, diisi hanya bila memakai GitHub
  Pages sebagai hosting frontend.
- `.env.example` — daftar environment variable, tanpa rahasia asli.

## Persiapan Google Cloud (sekali saja)

1. Masuk ke [Google Cloud Console](https://console.cloud.google.com/), buat
   proyek baru, lalu aktifkan **Google Sheets API** di menu APIs & Services.
2. Buat **Service Account** pada IAM & Admin > Service Accounts.
3. Buat key jenis **JSON** untuk service account tersebut dan unduh. Jangan
   commit atau kirim file JSON ini lewat grup chat.
4. Buka spreadsheet Anda, klik **Share**, lalu tambahkan alamat `client_email`
   dari file JSON sebagai **Editor**. Spreadsheet boleh tetap *Restricted*;
   siswa tidak perlu dan tidak boleh memperoleh akses langsung.

## Deploy Vercel (disarankan)

1. Unggah folder proyek ke repositori GitHub pribadi atau publik tanpa file
   key JSON, kemudian impor repositori itu di [Vercel](https://vercel.com).
2. Di Vercel > Project > Settings > Environment Variables, masukkan:

   | Nama | Nilai |
   | --- | --- |
   | `GOOGLE_SHEETS_ID` | `19fkE92s-FRB7D_KrItZROGd9VLF9rdvc8KILRmrysVc` |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | seluruh isi file key JSON service account, satu nilai utuh |

   `ALLOWED_ORIGIN` tidak perlu diisi bila frontend juga berada di Vercel.
3. Deploy. Vercel memasang `api/student.js` otomatis sebagai endpoint
   `/api/student`; tidak ada konfigurasi Apps Script atau URL `/exec`.
4. Buka domain Vercel dari ponsel dan lakukan uji satu akun siswa.

Vercel Functions mendukung JavaScript pada folder `api`, dan environment
variable dipakai untuk data sensitif. Lihat dokumentasi resmi
[Vercel Functions](https://vercel.com/docs/functions) dan
[Vercel environment variables](https://vercel.com/docs/environment-variables).

## Opsi GitHub Pages

GitHub Pages hanya dapat menyajikan HTML/CSS/JavaScript statis; ia **tidak bisa
menjaga service-account key atau menjalankan API**. Maka jika ingin URL halaman
berasal dari GitHub Pages:

1. Deploy API/repo yang sama ke Vercel terlebih dahulu.
2. Isi `config.js` dengan domain Vercel, misalnya:

   ```js
   window.APP_CONFIG = { apiBaseUrl: 'https://fisika-smp.vercel.app' };
   ```

3. Di Vercel, tambahkan `ALLOWED_ORIGIN` dengan origin GitHub Pages Anda,
   contoh `https://namapengguna.github.io`, lalu redeploy.
4. Aktifkan GitHub Pages dari branch yang berisi `index.html`, `config.js`, dan
   aset halaman.

## Uji dan privasi

1. Buka halaman melalui mode incognito di ponsel.
2. Isi identitas uji dan simpan satu kuis; periksa baris pada `DataSiswa`.
3. Buka ulang dengan email sama; progres harus tetap ada.
4. Jangan membuat spreadsheet menjadi public. Guru melihat rekap langsung dari
   Google Sheets dengan akun yang memiliki izin.

Email pada aplikasi ini masih merupakan penanda progres, bukan login Google
terverifikasi. Nilai latihan dapat dimanipulasi lewat browser, jadi untuk ujian
resmi gunakan autentikasi siswa yang sebenarnya atau LMS/Classroom.
