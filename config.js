/* KONFIGURASI ADMIN. Jangan menaruh kata sandi, NPK, email, token atau API key di sini. */
window.SOPRA_CONFIG = {
  forms: {
    "Kecelakaan Kerja": "",
    "Near Miss": "",
    "Unsafe Condition": "",
    "Unsafe Action": "",
    inspection: ""
  },
  dashboard: {
    // URL publik hasil File > Share > Publish to web > pilih sheet REKAP_PUBLIK > CSV.
    // HANYA publikasikan sheet berisi JUMLAH, jangan tab jawaban yang memuat data pelapor.
    summaryCsvUrl: "",
    period: "Belum ada periode data",
    updatedAt: "",
    counts: {"Kecelakaan Kerja":0,"Near Miss":0,"Unsafe Condition":0,"Unsafe Action":0,"Inspeksi":0},
    departments: {}
  }
};
