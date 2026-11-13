# SOPRA Safety Report HSE — Form Asli di GitHub Pages

## Penting
Semua input ada LANGSUNG di website GitHub: Kecelakaan Kerja, Near Miss, Unsafe Condition, Unsafe Action, dan Inspeksi APD 8 butir. Tidak menggunakan Google Forms maupun Google Docs. Google Sheets hanya database.

GitHub Pages sendiri hanya hosting statis. Agar pengiriman benar-benar tersimpan dan dashboard membaca data asli, tersedia `Code.gs` sebagai backend API menggunakan Google Apps Script (bukan hosting UI). Tidak memakai Cloudflare. Tanpa backend, tombol kirim akan memberi peringatan dan tidak menyimpan data.

## A. Ganti file website di GitHub
1. Buka https://github.com/appsheetsopra-pack/sopra-safety-report
2. Upload/replace `index.html`, `style.css`, `app.js`, `config.js`, `README.md` di root branch main. Jangan upload `Code.gs` ke repository publik apabila kelak memuat konfigurasi rahasia (saat ini cuma placeholder).
3. GitHub Pages sebelumnya sudah diaktifkan (main/root). Buka https://appsheetsopra-pack.github.io/sopra-safety-report/

## B. Hubungkan ke Google Sheets
1. Buka Google Sheets database SOPRA. Salin ID spreadsheet dari URL antara `/d/` dan `/edit`.
2. Buka https://script.google.com/ lalu New project. Ini backend API saja, bukan website.
3. Tempel isi `Code.gs`, ganti `PASTE_SPREADSHEET_ID_DI_SINI` dengan ID yang benar.
4. Jalankan `setupSOPRA` sekali dari editor dan berikan izin ke akun pemilik spreadsheet. Ini membuat tiga tab: `LAPORAN_HSE`, `INSPEKSI`, `DETAIL_INSPEKSI` bila belum ada. Jika tab sudah ada, urutan kolom HARUS cocok dengan HEADERS; untuk keamanan gunakan spreadsheet khusus baru atau sesuaikan header. JANGAN menimpa basis data lama.
5. Deploy > New deployment > Web app. Execute as: Me, Who has access: Anyone. Klik Deploy, salin URL yang berakhir `/exec`.
6. Di GitHub edit `config.js` dan isi `endpoint` dengan URL tadi. Commit changes.
7. Buka website; isi satu laporan uji dan satu inspeksi uji. Cek Google Sheets untuk memastikan keduanya masuk. Cek Dashboard dan klik Perbarui.

## Batasan penting
- Form web tidak bisa membaca respons POST cross-origin ke Apps Script secara langsung. Pesan setelah submit berarti *permintaan dikirim*, BUKAN bukti data tersimpan. Pastikan di Google Sheets. Bila perlu jaminan penerimaan dan status sukses yang akurat, perlu backend dengan CORS yang benar; Apps Script tidak mendukung semua pola CORS umum.
- Tanpa login, setiap orang yang punya link dapat mengirim data. Gunakan pengawasan data, pembatasan input, pembersihan spam; untuk penggunaan produksi resmi disarankan validasi dan proteksi tambahan.
- Bukti foto memakai URL saja, bukan upload file dari website.
- Google Sheets mempunyai batas performa dan kuota Apps Script; arsitektur gratis ini cocok untuk pilot, bukan jaminan produksi skala besar.
- Dashboard publik hanya angka agregat, tidak menampilkan data pelapor.
- Jangan menaruh password, service account key, OAuth token, atau spreadsheet berisi data pribadi ke repository GitHub publik.
- Data laporan yang dikirim ke Sheets melalui Apps Script akan diakses sesuai izin akun yang men-deploy.
