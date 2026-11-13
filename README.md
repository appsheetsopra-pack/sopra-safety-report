# SOPRA Safety Report HSE — Premium GitHub Pages

**Tanpa Cloudflare, tanpa Google Apps Script, dan tanpa login di halaman website.** Website menggunakan Google Forms yang di-embed untuk input (respons otomatis tersimpan di Google Sheets), dan dapat membaca CSV agregat publik Google Sheets untuk dashboard.

## Apa yang sudah berfungsi?
- Website responsif dengan Beranda, Pelaporan K3 (4 kategori), Inspeksi APD & Area (8 checklist), dan Dashboard HSE (kartu KPI, donat, diagram kategori, departemen).
- Menu navigasi, kategori cepat, iframe Form, dashboard, dan tombol Perbarui data aktif.
- **Form belum bisa menerima respons sampai kamu mengisi URL Google Forms di `config.js`.** Form yang kosong menampilkan instruksi, bukan berpura-pura menyimpan data.
- **Dashboard belum menampilkan angka asli sampai kamu menyiapkan tab REKAP_PUBLIK dan mengisi `summaryCsvUrl`.** Nol merupakan nilai awal, bukan statistik perusahaan.

## 1. Buat formulir Google
Buka https://forms.google.com, buat 5 formulir:
1. Kecelakaan Kerja
2. Near Miss
3. Unsafe Condition
4. Unsafe Action
5. Inspeksi APD & Area

**Kolom laporan K3**: nama pelapor, NPK, jabatan, shift, departemen, area, tanggal kejadian, jam kejadian, jenis bahaya/cedera, tingkat risiko, kronologi, tindakan awal. Untuk Kecelakaan Kerja tambahkan nama korban dan lost workdays.

**Kolom inspeksi**: Nama inspektor, NPK, jabatan, shift, departemen, area, tanggal inspeksi, jenis inspeksi. Buat masing-masing checklist sebagai pilihan ganda `Aman`, `Tidak Aman`, atau `N/A`:

- APD-01 — APD sesuai risiko pekerjaan
- APD-02 — Safety shoes digunakan di area wajib
- APD-03 — Helm keselamatan digunakan di area wajib
- APD-04 — Kondisi APD layak dan bersih
- HK-01 — Area kerja terjaga kebersihannya
- HK-02 — Material tersusun rapi dan aman
- HK-03 — Jalur pejalan kaki, forklift, dan evakuasi bebas hambatan
- HK-04 — Lantai tidak licin dan bebas tumpahan

Tambahkan kolom **catatan temuan / tindakan awal** di akhir. Jika ingin catatan wajib saat memilih Tidak Aman, gunakan pengaturan bagian/percabangan Google Forms; catatan satu kolom umum juga bisa digunakan sebagai opsi lebih sederhana.

Di Google Form, buka Jawaban → ikon spreadsheet → pilih spreadsheet baru atau spreadsheet yang sudah ada. Pastikan pengaturan form mengizinkan responden tanpa login jika kebijakan perusahaan mengizinkan. **Pertanyaan upload file di Google Forms akan meminta login**; gunakan tautan foto privat jika diperlukan.

## 2. Masukkan alamat Google Forms
Buka `config.js`, isi URL `https://docs.google.com/forms/d/e/.../viewform` untuk setiap kategori pada objek `forms`. Link dapat disalin melalui tombol Kirim/Publikasikan atau lihat tautan untuk responden. Hindari alamat editor forms.

## 3. Agar dashboard membaca Google Sheets secara otomatis

Gunakan satu spreadsheet berisi kelima tab respons. Buat tab khusus **REKAP_PUBLIK** dengan hanya 3 kolom `group`, `key`, `value`.

Contoh isian (isi `value` dengan rumus COUNT atau COUNTIF berdasarkan sheet respons sebenarnya):

```csv
group,key,value
Kategori,Kecelakaan Kerja,0
Kategori,Near Miss,0
Kategori,Unsafe Condition,0
Kategori,Unsafe Action,0
Kategori,Inspeksi,0
Departemen,Produksi,0
Departemen,Warehouse,0
Departemen,QC,0
Departemen,Maintenance,0
Info,Periode,2026
Info,Diperbarui,Rekap otomatis dari Google Sheets
```

Rumus **contoh** yang dipakai pada kolom nilai: `=COUNTA('Form Responses 1'!A2:A)` jika kolom A berisi timestamp respon. Ganti nama sheet sesuai tab respons sebenarnya. Untuk departemen: `=COUNTIF('Form Responses 1'!E2:E,"Produksi")` jika kolom E memang berisi Departemen. Jika ingin menjumlah 4 jenis laporan, gunakan penjumlahan beberapa `COUNTIF` dari tab terkait. Angka tidak dihitung dari contoh nol tersebut.

PENTING: Google Sheets **Publish to web** bisa mengekspos informasi yang dipublikasikan. Untuk keamanan, **jangan publikasikan tab jawaban, nama, NPK, korban, atau detail laporan**. Idealnya buat **spreadsheet rekap terpisah** yang hanya berisi jumlah agregat tanpa data personal; isi nilainya menggunakan IMPORTRANGE yang diotorisasi dan rumus agregasi, lalu publikasikan hanya file rekap tersebut. Jika kebijakan kantor melarang penerbitan data, jangan gunakan fitur dashboard live publik; gunakan mode manual atau backend internal yang diotorisasi.

Pada spreadsheet rekap publik: `File` → `Share` → `Publish to web` → pilih **sheet REKAP_PUBLIK** → format **Comma-separated values (CSV)** → Publish. Salin URL CSV tersebut ke `dashboard.summaryCsvUrl` di `config.js`. Dashboard akan mencoba memuat data otomatis ketika dibuka, dan menyediakan tombol Refresh.

Perlu diingat: publish CSV tidak menjamin pembaruan seketika dan browser dapat menahan cache; tombol Perbarui data dapat membantu mengambil versi terbaru.

## 4. Upload website ke GitHub Pages
1. Buka https://github.com dan buat repository `sopra-safety-report` dengan visibilitas Public.
2. Upload isi ZIP (file-file `index.html`, `style.css`, `app.js`, `config.js`) langsung ke root repository, bukan folder pembungkusnya.
3. Settings → Pages → `Deploy from a branch` → `main` dan `/ (root)` → Save.
4. Buka `https://USERNAME.github.io/sopra-safety-report/` (ganti USERNAME).
5. Bagikan URL ke karyawan melalui WhatsApp atau QR Code.

## Catatan keamanan dan keterbatasan
- GitHub Pages dapat dilihat publik; tanpa login, website **tidak dapat dibatasi hanya untuk karyawan kantor**. Link yang tersebar dapat diakses orang luar.
- Spreadsheet respons harus tetap privat. Tidak ada rahasia atau API key dalam repository publik.
- Saat form terisi, **Google Forms** yang menyimpan data dan memberikan konfirmasi, bukan website GitHub.
- Dashboard CSV adalah data publik teragregasi, **bukan akses langsung ke Google Sheets privat**.
- Untuk inspeksi, daftar 8 checklist yang tampil di atas form hanyalah ringkasan. Pengguna mengisi dan mengirim jawaban melalui Google Form di bawahnya.
- Jika Google Forms meminta login karena pengaturan Workspace, GitHub Pages tidak dapat menghapus persyaratan itu.
- Browser Chrome normal dapat membuka halaman GitHub Pages tanpa Incognito, tetapi akses ke Google Form tetap tunduk pada konfigurasi Google.
