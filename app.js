
(() => {
  'use strict';

  const CFG = window.SOPRA_CONFIG || {};

  const CATS = [
    'Kecelakaan Kerja',
    'Near Miss',
    'Unsafe Condition',
    'Unsafe Action',
    'Inspeksi'
  ];

  const COLORS = [
    '#e05766',
    '#e4a14b',
    '#4c83d9',
    '#9d79cf',
    '#0e9387'
  ];

  const DEPTS = [
    'Warehouse', 'HR', 'GA', 'HSE', 'Visual',
    'QC', 'QA', 'Produksi', 'Maintenance',
    'GO', 'PPC', 'Purchasing', 'Logistik',
    'Utility', 'Management', 'Lainnya'
  ];

  const CHECKS = [
    ['APD-01', 'Penggunaan APD sesuai risiko pekerjaan'],
    ['APD-02', 'Penggunaan safety shoes di area wajib'],
    ['APD-03', 'Penggunaan helm keselamatan di area wajib'],
    ['APD-04', 'Kondisi APD layak dan bersih'],
    ['HK-01', 'Area kerja terjaga kebersihannya'],
    ['HK-02', 'Material tersusun rapi dan aman'],
    ['HK-03', 'Jalur pejalan kaki, forklift, dan evakuasi bebas hambatan'],
    ['HK-04', 'Lantai tidak licin dan bebas tumpahan']
  ];

  const $ = id => document.getElementById(id);

  const esc = s => String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  let dashboard = {
    counts: {},
    departments: {},
    recent: []
  };

  let dashboardErr = 'Belum terhubung ke database Google Sheets.';

  // Pilihan departemen
  document.querySelectorAll('select.department').forEach(sel => {
    sel.innerHTML =
      '<option value="">Pilih departemen</option>' +
      DEPTS.map(d => `<option>${d}</option>`).join('');
  });

  // Tanggal hari ini
  const now = new Date();

  const localISO = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  document.querySelectorAll('input[type=date]').forEach(el => {
    el.value = localISO;
  });

  // Membuat 8 pertanyaan inspeksi
  $('inspection-checks').innerHTML = CHECKS.map(([code, question], i) => `
    <div class="inspection-item">
      <h4>
        <span>${code}</span>
        ${esc(question)} *
      </h4>

      <div class="options-row">
        ${['Ya', 'Tidak', 'N/A'].map(answer => `
          <label>
            <input
              type="radio"
              name="check_${i}"
              value="${answer}"
              required
            >
            ${answer}
          </label>
        `).join('')}
      </div>

      <label class="check-note">
        Keterangan (wajib jika Tidak)
        <input
          type="text"
          name="note_${i}"
          maxlength="350"
          placeholder="Deskripsikan temuan atau tindakan"
        >
      </label>
    </div>
  `).join('');

  // Menghitung checklist terisi
  function updateProgress() {
    let count = 0;

    CHECKS.forEach((_, i) => {
      const checked = document.querySelector(
        `#inspection-form input[name=check_${i}]:checked`
      );

      if (checked) count++;

      const note = document.querySelector(
        `#inspection-form input[name=note_${i}]`
      );

      note.required = !!checked && checked.value === 'Tidak';
    });

    $('inspection-progress').textContent =
      `${count} dari 8 terisi`;
  }

  $('inspection-form').addEventListener(
    'change',
    updateProgress
  );

  $('inspection-form').addEventListener('reset', () => {
    setTimeout(updateProgress, 0);
  });

  // Kolom khusus kecelakaan kerja
  function updateCat() {
    const isAccident =
      $('report-category').value === 'Kecelakaan Kerja';

    document.querySelectorAll('.accident-only').forEach(el => {
      el.classList.toggle('hidden', !isAccident);
    });
  }

  $('report-category').addEventListener('change', updateCat);
  updateCat();

  // Navigasi halaman
  function show(page) {
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('hidden', el.id !== page);
    });

    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle(
        'active',
        btn.dataset.page === page
      );
    });

    $('page-title').textContent = ({
      home: 'Beranda',
      report: 'Pelaporan K3',
      inspection: 'Inspeksi APD',
      dashboard: 'Dashboard HSE'
    })[page] || page;

    if (page === 'dashboard') {
      loadDashboard();
    }

    window.scrollTo(0, 0);
  }

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      show(btn.dataset.page);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category) {
        $('report-category').value = btn.dataset.category;
        updateCat();
      }

      show(btn.dataset.goto);
    });
  });

  // Mengambil nilai form
  function serial(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  // Pilih foto dan tampilkan pratinjau
  function initPhoto(inputId, previewId) {
    const input = $(inputId);
    const preview = $(previewId);

    if (!input || !preview) return;

    input.addEventListener('change', () => {
      preview.replaceChildren();

      const file = input.files?.[0];
      if (!file) return;

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      if (!allowedTypes.includes(file.type)) {
        input.value = '';
        preview.textContent =
          'Pilih file gambar JPG, PNG, atau WebP.';
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        input.value = '';
        preview.textContent =
          'Ukuran foto maksimal 3 MB.';
        return;
      }

      const img = document.createElement('img');
      const objectURL = URL.createObjectURL(file);

      img.src = objectURL;
      img.alt = 'Pratinjau foto bukti';

      img.style.cssText = `
        max-width: 220px;
        max-height: 170px;
        object-fit: contain;
        border-radius: 12px;
        margin-top: 8px;
        border: 1px solid #cbd9df;
      `;

      img.onload = () => {
        URL.revokeObjectURL(objectURL);
      };

      preview.appendChild(img);

      const note = document.createElement('p');
      note.textContent =
        `Foto terpilih: ${file.name}. ` +
        'Belum tersimpan online.';

      preview.appendChild(note);
    });
  }

  initPhoto('report-photo', 'report-photo-preview');

  initPhoto(
    'inspection-photo',
    'inspection-photo-preview'
  );

  // Pengiriman ke backend
  function submitData(type, form, statusId) {
    const status = $(statusId);

    if (
      !CFG.endpoint ||
      !/^https:\/\/script\.google\.com\/macros\/s\//.test(
        CFG.endpoint
      )
    ) {
      status.textContent =
        'Backend belum dihubungkan. ' +
        'Admin perlu mengisi URL Google Sheets ' +
        'pada config.js.';
      return;
    }

    const photo = form.querySelector('input[type=file]');

    // Jangan mengklaim foto tersimpan bila upload belum ada
    if (photo?.files?.length) {
      status.textContent =
        'Foto sudah dipilih, tetapi upload otomatis ' +
        'belum dihubungkan ke penyimpanan online. ' +
        'Kosongkan foto atau aktifkan backend upload dahulu.';
      return;
    }

    if (!form.reportValidity()) return;

    const payload = serial(form);
    payload.type = type;

    if (type === 'inspection') {
      payload.checks = CHECKS.map(
        ([code, question], i) => ({
          code,
          question,
          result: payload[`check_${i}`],
          note: payload[`note_${i}`] || ''
        })
      );

      const missing = payload.checks.find(
        item =>
          item.result === 'Tidak' &&
          !item.note.trim()
      );

      if (missing) {
        status.textContent =
          `Keterangan wajib diisi untuk ${missing.code}.`;
        return;
      }
    }

    // Pengiriman menggunakan form POST tersembunyi.
    // Respons lintas domain tidak dapat diverifikasi di sini.
    const hiddenForm = document.createElement('form');

    hiddenForm.method = 'POST';
    hiddenForm.action = CFG.endpoint;
    hiddenForm.target = 'submission-target';
    hiddenForm.style.display = 'none';

    const field = document.createElement('input');

    field.type = 'hidden';
    field.name = 'payload';
    field.value = JSON.stringify(payload);

    hiddenForm.appendChild(field);
    document.body.appendChild(hiddenForm);

    try {
      hiddenForm.submit();

      status.textContent =
        'Permintaan sudah dikirim. ' +
        'Periksa Google Sheets untuk memastikan ' +
        'laporan benar-benar tersimpan.';

      setTimeout(loadDashboard, 3000);

    } catch (err) {
      status.textContent =
        'Pengiriman gagal: ' + err.message;

    } finally {
      hiddenForm.remove();
    }
  }

  // Form laporan K3
  $('report-form').addEventListener('submit', e => {
    e.preventDefault();

    submitData(
      'report',
      e.currentTarget,
      'report-status'
    );
  });

  // Form inspeksi
  $('inspection-form').addEventListener('submit', e => {
    e.preventDefault();

    updateProgress();

    submitData(
      'inspection',
      e.currentTarget,
      'inspection-status'
    );
  });

  // Menerima ringkasan dashboard dari backend
  window.SOPRA_dashboardCallback = data => {
    if (data && data.ok) {
      dashboard = data;
      dashboardErr = '';
    } else {
      dashboardErr =
        'Backend menolak permintaan data dashboard.';
    }

    renderDashboard();
  };

  function loadDashboard() {
    if (!CFG.endpoint) {
      dashboardErr =
        'Backend belum dihubungkan. Isi endpoint pada config.js.';

      renderDashboard();
      return;
    }

    const old = $('jsonp-dashboard');
    if (old) old.remove();

    const script = document.createElement('script');

    script.id = 'jsonp-dashboard';

    script.src =
      CFG.endpoint +
      (CFG.endpoint.includes('?') ? '&' : '?') +
      'action=dashboard' +
      '&callback=SOPRA_dashboardCallback' +
      '&_=' + Date.now();

    script.onerror = () => {
      dashboardErr =
        'Gagal membaca data dashboard dari backend.';

      renderDashboard();
    };

    document.body.appendChild(script);
  }

  function renderDashboard() {
    const counts = dashboard.counts || {};
    const departments = dashboard.departments || {};

    const values = CATS.map(name =>
      Math.max(0, Number(counts[name]) || 0)
    );

    const total = values.reduce(
      (sum, value) => sum + value,
      0
    );

    const reports = total - values[4];

    $('dashboard-notice').textContent =
      dashboardErr ||
      'Data ringkasan dibaca dari spreadsheet.';

    $('dashboard-notice').className =
      'notice' + (!dashboardErr ? ' success' : '');

    $('dashboard-period').textContent =
      dashboard.updatedAt || '';

    const kpis = [
      ['Laporan K3', reports, '#103447'],
      ...CATS.map(
        (name, i) => [name, values[i], COLORS[i]]
      )
    ];

    $('kpis').innerHTML = kpis.map(([name, value, color]) => `
      <div class="kpi" style="--kpi:${color}">
        <small>${esc(name)}</small>
        <strong>${value.toLocaleString('id-ID')}</strong>
      </div>
    `).join('');

    // Grafik donat
    let position = 0;
    const gradient = [];

    values.forEach((value, i) => {
      const end =
        position + (total ? value / total * 100 : 0);

      if (end > position) {
        gradient.push(
          `${COLORS[i]} ${position}% ${end}%`
        );
      }

      position = end;
    });

    $('donut').style.background = gradient.length
      ? 'conic-gradient(' + gradient.join(',') + ')'
      : '#edf2f5';

    $('donut-total').textContent = total;

    $('legend').innerHTML = CATS.map((name, i) => `
      <div class="legend-item">
        <span
          class="dot"
          style="background:${COLORS[i]}"
        ></span>
        <span>${esc(name)}</span>
        <b>${values[i]}</b>
      </div>
    `).join('');

    // Grafik batang
    const bars = (rows, max) => rows.map(
      ([name, number, color]) => `
        <div class="bar-item">
          <div class="bar-caption">
            <span>${esc(name)}</span>
            <b>${number}</b>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              style="
                width:${max ? number / max * 100 : 0}%;
                background:${color || '#0e9387'}
              "
            ></div>
          </div>
        </div>
      `
    ).join('');

    $('category-bars').innerHTML = bars(
      CATS.map(
        (name, i) => [name, values[i], COLORS[i]]
      ),
      Math.max(1, ...values)
    );

    const deptRows = Object.entries(departments).map(
      ([name, value]) => [name, Number(value) || 0]
    );

    $('department-bars').innerHTML = deptRows.length
      ? bars(
          deptRows,
          Math.max(1, ...deptRows.map(row => row[1]))
        )
      : '<p class="muted">Belum ada data departemen.</p>';
  }

  $('refresh-dashboard').addEventListener(
    'click',
    loadDashboard
  );

  renderDashboard();
  show('home');
})();
