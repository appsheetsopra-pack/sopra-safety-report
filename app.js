(() => {
  'use strict';
  const CFG = window.SOPRA_CONFIG || {};
  const COLORS = {'Kecelakaan Kerja':'#e05766','Near Miss':'#e4a14b','Unsafe Condition':'#4c83d9','Unsafe Action':'#9d79cf','Inspeksi':'#0e9387'};
  const CATEGORY_NAMES = Object.keys(COLORS);
  const TITLES = {home:'Beranda',report:'Pelaporan K3',inspection:'Inspeksi APD',dashboard:'Dashboard HSE'};
  let liveDash=null, liveState='unconfigured', lastFetch=0;
  const $ = (id) => document.getElementById(id);
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeNumber = x => Number.isFinite(Number(x)) ? Math.max(0,Number(x)) : 0;
  function formURL(input) {
    if (!input) return '';
    try { const u = new URL(input); if(u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || !u.pathname.includes('/forms/')) return ''; u.searchParams.set('embedded','true'); return u.toString(); } catch {return '';}
  }
  function formFrame(url,kind) {
    const safeURL=formURL(url);
    if(!safeURL) return `<div class="form-empty"><span class="empty-icon">⚙</span><h3>Formulir ${escapeHTML(kind)} belum dihubungkan</h3><p>Admin perlu membuat Google Form, menghubungkannya ke Google Sheets, lalu mengisi URL formulir pada <code>config.js</code>.</p><a href="https://forms.google.com" target="_blank" rel="noopener noreferrer">Buka Google Forms ↗</a></div>`;
    return `<div class="embed-meta"><span class="ready-dot"></span> Formulir siap digunakan <a target="_blank" rel="noopener noreferrer" href="${escapeHTML(safeURL)}">Buka di tab baru ↗</a></div><iframe class="form-embed" title="${escapeHTML(kind)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="${escapeHTML(safeURL)}">Memuat formulir…</iframe>`;
  }
  function renderReport() { const category=$('report-category').value; $('report-form-wrap').innerHTML=formFrame(CFG.forms?.[category],category); }
  function renderInspection() { $('inspection-form-wrap').innerHTML=formFrame(CFG.forms?.inspection,'Inspeksi APD'); }
  const CHECKS=[['APD-01','APD sesuai risiko pekerjaan'],['APD-02','Safety shoes digunakan di area wajib'],['APD-03','Helm keselamatan digunakan di area wajib'],['APD-04','Kondisi APD layak dan bersih'],['HK-01','Area kerja terjaga kebersihannya'],['HK-02','Material tersusun rapi dan aman'],['HK-03','Jalur pejalan kaki, forklift, dan evakuasi bebas hambatan'],['HK-04','Lantai tidak licin dan bebas tumpahan']];
  $('checklist-preview').innerHTML=CHECKS.map(([code,label])=>`<div class="checklist-item"><span class="checklist-code">${code}</span><span>${escapeHTML(label)}</span></div>`).join('');
  function parseCSV(input){
    const out=[];let line=[],val='',quoted=false;
    for(let i=0;i<input.length;i++){
      const ch=input[i];
      if(ch==='"') {if(quoted&&input[i+1]==='"'){val+='"';i++;}else quoted=!quoted;}
      else if(ch===','&&!quoted){line.push(val);val='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&input[i+1]==='\n')i++;line.push(val);if(line.some(x=>x.trim()))out.push(line);line=[];val='';}
      else val+=ch;
    }
    line.push(val);if(line.some(x=>x.trim()))out.push(line);
    return out;
  }
  async function refreshDashboard(force=false){
    const url=CFG.dashboard?.summaryCsvUrl;
    if(!url){liveState='unconfigured';renderDashboard();return;}
    if(!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url)){liveState='invalid';renderDashboard();return;}
    if(!force&&Date.now()-lastFetch<60000)return;
    lastFetch=Date.now();liveState='loading';renderDashboard();
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const csv=parseCSV(await response.text());
      const counts={},departments={};let period='',updatedAt='';
      for(let i=1;i<csv.length;i++){
        const [group,key,raw]=csv[i].map(x=>String(x||'').trim());
        if(group==='Kategori')counts[key]=normalizeNumber(raw);
        else if(group==='Departemen')departments[key]=normalizeNumber(raw);
        else if(group==='Info'&&key==='Periode')period=raw;
        else if(group==='Info'&&key==='Diperbarui')updatedAt=raw;
      }
      if(!Object.keys(counts).length)throw Error('Format CSV tidak cocok.');
      liveDash={counts,departments,period,updatedAt};liveState='connected';
    }catch(err){liveState='error';console.error('Gagal memuat rekap agregat:',err);}
    renderDashboard();
  }
  function show(page) {
    if (!TITLES[page]) return;
    for(const el of document.querySelectorAll('.page')) el.classList.toggle('hidden',el.id!==page);
    for(const btn of document.querySelectorAll('.nav-link')) btn.classList.toggle('active',btn.dataset.page===page);
    $('page-title').textContent=TITLES[page];
    if(page==='report')renderReport();
    if(page==='inspection')renderInspection();
    if(page==='dashboard'){renderDashboard();refreshDashboard();}
    window.scrollTo({top:0,behavior:'instant'});
  }
  function renderDashboard() {
    const dash=liveDash||CFG.dashboard||{}, counts=dash.counts||{}, departments=dash.departments||{};
    const entries=CATEGORY_NAMES.map(name=>({name,value:normalizeNumber(counts[name]),color:COLORS[name]}));
    const total=entries.reduce((a,b)=>a+b.value,0);
    const incidentCount=entries.filter(e=>e.name!=='Inspeksi').reduce((a,b)=>a+b.value,0);
    const hasData=Boolean(dash.updatedAt);
    const notice=$('dashboard-notice');
    notice.className='notice'+(liveState==='connected'?' success':liveState==='error'||liveState==='invalid'?' warning':'');
    notice.innerHTML=liveState==='connected'?`<strong>Terhubung ke rekap Google Sheets.</strong> ${escapeHTML(dash.updatedAt||'Data agregat terbaru tersedia')}. Gunakan Perbarui data untuk mengecek perubahan.`:
      liveState==='loading'?'<strong>Mengambil data...</strong> Menghubungkan ke rekap Google Sheets.':
      liveState==='error'?'<strong>Gagal mengambil rekap.</strong> Periksa tautan publik, izin penerbitan CSV, dan koneksi internet. Angka di bawah merupakan data cadangan dari konfigurasi.':
      liveState==='invalid'?'<strong>URL CSV tidak valid.</strong> Gunakan link publish CSV Google Sheets.':
      hasData?`<strong>Data ringkasan manual.</strong> Diperbarui ${escapeHTML(dash.updatedAt)}. Tidak tersinkron otomatis.`:
      '<strong>Dashboard belum tersambung.</strong> Setelah admin mengisi URL rekap agregat di <code>config.js</code>, angka akan dimuat dari Google Sheets. Saat ini semua angka kosong.';
    $('dashboard-period').textContent=dash.period||'';
    const kpis=[['Laporan K3',incidentCount,'#103447'],['Kecelakaan Kerja',entries[0].value,COLORS['Kecelakaan Kerja']],['Near Miss',entries[1].value,COLORS['Near Miss']],['Unsafe Condition',entries[2].value,COLORS['Unsafe Condition']],['Unsafe Action',entries[3].value,COLORS['Unsafe Action']],['Inspeksi',entries[4].value,COLORS['Inspeksi']]];
    $('kpis').innerHTML=kpis.map(([label,value,color])=>`<div class="kpi" style="--kpi:${color}"><small>${escapeHTML(label)}</small><strong>${value.toLocaleString('id-ID')}</strong></div>`).join('');
    let cursor=0; const segments=[];
    for(const e of entries) { if(e.value<=0||total===0)continue;let next=cursor+e.value/total*100;segments.push(`${e.color} ${cursor}% ${next}%`);cursor=next; }
    $('donut').style.background=segments.length?`conic-gradient(${segments.join(',')})`:'#eaf0f4';
    $('donut-total').textContent=total.toLocaleString('id-ID');
    $('legend').innerHTML=entries.map(e=>`<div class="legend-item"><span class="dot" style="background:${e.color}"></span><span>${escapeHTML(e.name)}</span><b>${e.value}</b></div>`).join('');
    function barRows(vals,max,colorDefault) {return vals.map(e=>`<div class="bar-item"><div class="bar-caption"><span>${escapeHTML(e.name)}</span><b>${e.value.toLocaleString('id-ID')}</b></div><div class="bar-track"><div class="bar-fill" style="background:${e.color||colorDefault};width:${max?e.value/max*100:0}%"></div></div></div>`).join('');}
    $('category-bars').innerHTML=barRows(entries,Math.max(1,...entries.map(e=>e.value)),'#0e9387');
    const depRows=Object.entries(departments).map(([name,n])=>({name,value:normalizeNumber(n)}));
    $('department-bars').innerHTML=depRows.length?barRows(depRows,Math.max(1,...depRows.map(e=>e.value)),'#0e9387'):'<p class="muted">Belum ada rekap departemen.</p>';
  }
  document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.category){$('report-category').value=btn.dataset.category;}show(btn.dataset.goto);}));
  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.page)));
  $('report-category').addEventListener('change',renderReport);
  $('refresh-dashboard').addEventListener('click',()=>refreshDashboard(true));
  renderDashboard();
  show('home');
})();
