(()=>{'use strict';
const CFG=window.SOPRA_CONFIG||{};
const CATS=['Kecelakaan Kerja','Near Miss','Unsafe Condition','Unsafe Action','Inspeksi'];
const COLORS=['#e05766','#e4a14b','#4c83d9','#9d79cf','#0e9387'];
const DEPTS=['Warehouse','HR','GA','HSE','Visual','QC','QA','Produksi','Maintenance','GO','PPC','Purchasing','Logistik','Utility','Management','Lainnya'];
const CHECKS=[['APD-01','Penggunaan APD sesuai risiko pekerjaan'],['APD-02','Penggunaan safety shoes di area wajib'],['APD-03','Penggunaan helm keselamatan di area wajib'],['APD-04','Kondisi APD layak dan bersih'],['HK-01','Area kerja terjaga kebersihannya'],['HK-02','Material tersusun rapi dan aman'],['HK-03','Jalur pejalan kaki, forklift, dan evakuasi bebas hambatan'],['HK-04','Lantai tidak licin dan bebas tumpahan']];
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dashboard={counts:{},departments:{},recent:[]}, dashboardErr='Belum terhubung ke database Google Sheets.';
document.querySelectorAll('select.department').forEach(sel=>{sel.innerHTML='<option value="">Pilih departemen</option>'+DEPTS.map(d=>`<option>${d}</option>`).join('')});
const now=new Date();const localISO=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
document.querySelectorAll('input[type=date]').forEach(e=>e.value=localISO);
$('inspection-checks').innerHTML=CHECKS.map(([code,q],i)=>`<div class="inspection-item"><h4><span>${code}</span> ${esc(q)} *</h4><div class="options-row">${['Aman','Tidak Aman','N/A'].map(a=>`<label><input type="radio" name="check_${i}" value="${a}" required>${a}</label>`).join('')}</div><label class="check-note">Keterangan (wajib jika Tidak Aman)<input type="text" name="note_${i}" maxlength="350" placeholder="Deskripsikan temuan atau tindakan"></label></div>`).join('');
function updateProgress(){let n=0;CHECKS.forEach((_,i)=>{const r=document.querySelector(`#inspection-form input[name=check_${i}]:checked`);if(r)n++;const inp=document.querySelector(`#inspection-form input[name=note_${i}]`);inp.required=!!r&&r.value==='Tidak Aman'});$('inspection-progress').textContent=`${n} dari 8 terisi`}
$('inspection-form').addEventListener('change',updateProgress);$('inspection-form').addEventListener('reset',()=>setTimeout(updateProgress,0));
function updateCat(){document.querySelectorAll('.accident-only').forEach(el=>el.classList.toggle('hidden',$('report-category').value!=='Kecelakaan Kerja'))} $('report-category').addEventListener('change',updateCat);updateCat();
function show(page){document.querySelectorAll('.page').forEach(el=>el.classList.toggle('hidden',el.id!==page));document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('page-title').textContent=({home:'Beranda',report:'Pelaporan K3',inspection:'Inspeksi APD',dashboard:'Dashboard HSE'})[page]||page;if(page==='dashboard')loadDashboard();window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.category){$('report-category').value=b.dataset.category;updateCat()}show(b.dataset.goto)}));
function serial(form){return Object.fromEntries(new FormData(form).entries())}
function submitData(type,form,statusId){const box=$(statusId);if(!CFG.endpoint||!/^https:\/\/script\.google\.com\/macros\/s\//.test(CFG.endpoint)){box.textContent='Belum bisa mengirim: admin harus mengisi URL backend Google Sheets pada config.js.';return}
  if(!form.reportValidity())return;
  const payload=serial(form);payload.type=type;
  if(type==='inspection'){
    payload.checks=CHECKS.map(([code,question],i)=>({code,question,result:payload[`check_${i}`],note:payload[`note_${i}`]||''}));
    const missing=payload.checks.find(c=>c.result==='Tidak Aman'&&!c.note.trim());if(missing){box.textContent=`Keterangan wajib diisi untuk ${missing.code} yang Tidak Aman.`;return;}
  }
  // POST HTML FORM biasa. Tidak menggunakan fetch lintas domain yang rawan CORS.
  // Respons iframe lintas domain tidak dapat dibaca: UI tidak boleh mengklaim sukses sebelum diverifikasi.
  const shadow=document.createElement('form');shadow.method='POST';shadow.action=CFG.endpoint;shadow.target='submission-target';shadow.style.display='none';
  const field=document.createElement('input');field.type='hidden';field.name='payload';field.value=JSON.stringify(payload);shadow.appendChild(field);document.body.appendChild(shadow);
  try{shadow.submit();box.textContent='Permintaan pengiriman telah dikirim. Periksa Google Sheets untuk memastikan data benar-benar tersimpan. Jangan mengirim ulang sebelum memeriksa.';setTimeout(loadDashboard,3000)}catch(err){box.textContent='Tidak dapat mengirim data: '+err.message}finally{shadow.remove()}
}
$('report-form').addEventListener('submit',e=>{e.preventDefault();submitData('report',e.currentTarget,'report-status')});
$('inspection-form').addEventListener('submit',e=>{e.preventDefault();updateProgress();submitData('inspection',e.currentTarget,'inspection-status')});
window.SOPRA_dashboardCallback=data=>{if(data&&data.ok){dashboard=data;dashboardErr='';renderDashboard()}else{dashboardErr='Backend menolak permintaan data dashboard.';renderDashboard()}};
function loadDashboard(){if(!CFG.endpoint){dashboardErr='Backend belum dihubungkan. Isi endpoint pada config.js.';renderDashboard();return}const old=$('jsonp-dashboard');if(old)old.remove();const tag=document.createElement('script');tag.id='jsonp-dashboard';tag.src=CFG.endpoint+(CFG.endpoint.includes('?')?'&':'?')+'action=dashboard&callback=SOPRA_dashboardCallback&_='+Date.now();tag.onerror=()=>{dashboardErr='Gagal membaca data dashboard dari backend.';renderDashboard()};document.body.appendChild(tag)}
function renderDashboard(){const counts=dashboard.counts||{},departments=dashboard.departments||{};const vals=CATS.map(n=>Math.max(0,Number(counts[n])||0));const total=vals.reduce((a,b)=>a+b,0), reports=total-vals[4];$('dashboard-notice').textContent=dashboardErr||'Data ringkasan dibaca langsung dari spreadsheet (data pelapor tidak ditampilkan).';$('dashboard-notice').className='notice'+(!dashboardErr?' success':'');$('dashboard-period').textContent=dashboard.updatedAt||'';
  const kpis=[['Laporan K3',reports,'#103447'],...CATS.map((n,i)=>[n,vals[i],COLORS[i]])];$('kpis').innerHTML=kpis.map(([n,v,c])=>`<div class="kpi" style="--kpi:${c}"><small>${esc(n)}</small><strong>${v.toLocaleString('id-ID')}</strong></div>`).join('');
  let pos=0,grad=[];vals.forEach((v,i)=>{const end=pos+(total?v/total*100:0);if(end>pos)grad.push(`${COLORS[i]} ${pos}% ${end}%`);pos=end});$('donut').style.background=grad.length?'conic-gradient('+grad.join(',')+')':'#edf2f5';$('donut-total').textContent=total;$('legend').innerHTML=CATS.map((n,i)=>`<div class="legend-item"><span class="dot" style="background:${COLORS[i]}"></span><span>${esc(n)}</span><b>${vals[i]}</b></div>`).join('');
  const bars=(rows,max)=>rows.map(([name,num,color])=>`<div class="bar-item"><div class="bar-caption"><span>${esc(name)}</span><b>${num}</b></div><div class="bar-track"><div class="bar-fill" style="width:${max?num/max*100:0}%;background:${color||'#0e9387'}"></div></div></div>`).join('');$('category-bars').innerHTML=bars(CATS.map((n,i)=>[n,vals[i],COLORS[i]]),Math.max(1,...vals));const ds=Object.entries(departments).map(([n,v])=>[n,Number(v)||0]);$('department-bars').innerHTML=ds.length?bars(ds,Math.max(1,...ds.map(x=>x[1]))):'<p class="muted">Belum ada data departemen.</p>';
}
$('refresh-dashboard').addEventListener('click',loadDashboard);renderDashboard();show('home');
})();
