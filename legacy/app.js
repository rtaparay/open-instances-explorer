const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:n<10?4:2,maximumFractionDigits:n<10?4:2})+'/hr';
const money0=n=>'$'+n.toLocaleString('en-US',{maximumFractionDigits:2})+'/mo';
const LBL={t:"Instance type",v:"vCPUs",m:"Memory",sto:"Storage",net:"Network",a:"Arch",gpu:"GPU",cfg:"Configuration",famlabel:"Family",hr:"Hourly",mo:"Monthly"};
const NUMK=new Set(['v','m','hr','mo']);
const CATORDER=['general','compute','memory','storage','accel'];
const SVCICON={
  ec2:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  rds:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  elasticache:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  opensearch:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  redshift:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V8"/>',
  mq:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
};

/* Precios On-Demand us-east-1 (Linux). Modelo lineal de AWS: precio = base(.large de la familia) × factor de tamaño. */
const NORM={nano:0.0625,micro:0.125,small:0.25,medium:0.5,large:1,xlarge:2,'2xlarge':4,'3xlarge':6,'4xlarge':8,'6xlarge':12,'8xlarge':16,'9xlarge':18,'12xlarge':24,'16xlarge':32,'18xlarge':36,'24xlarge':48,'32xlarge':64,'48xlarge':96};
const FAMILY_LARGE={
  t2:0.0928,t3:0.0832,t3a:0.0752,t4g:0.0672,
  m4:0.10,m5:0.096,m5a:0.086,m5ad:0.103,m5d:0.113,m5n:0.119,m5dn:0.136,m5zn:0.1652,m6i:0.096,m6id:0.11859,m6a:0.0864,m6idn:0.11867,m6g:0.077,m6gd:0.0904,m7i:0.1008,m7g:0.0816,m7a:0.11592,
  c4:0.10,c5:0.085,c5a:0.077,c5ad:0.086,c5d:0.096,c5n:0.108,c6i:0.085,c6id:0.1008,c6a:0.0765,c6in:0.1134,c6g:0.068,c6gd:0.0768,c6gn:0.0864,c7i:0.08925,c7a:0.09146,c7g:0.0725,c7gd:0.087,c7gn:0.0998,
  r4:0.133,r5:0.126,r5a:0.113,r5ad:0.131,r5d:0.144,r5n:0.149,r5dn:0.167,r5b:0.149,r6i:0.126,r6id:0.1512,r6a:0.1134,r6idn:0.1659,r6in:0.14751,r6g:0.1008,r6gd:0.1152,r7i:0.1323,r7a:0.15295,r7g:0.1071,r7gd:0.12243,z1d:0.186,x2idn:0.2084,
  i3:0.156,i3en:0.226,i4i:0.1716
};
function sizeTok(t){return t.split('.').slice(1).join('.');}
function applyPrices(){
  const ec2=DB.services.find(s=>s.id==='ec2'); if(!ec2)return;
  ec2.instances.forEach(d=>{
    const base=FAMILY_LARGE[d.fam], f=NORM[sizeTok(d.t)];
    if(base!=null && f!=null && d.t.indexOf('-flex')<0){ d.hr=Math.round(base*f*10000)/10000; d.mo=Math.round(d.hr*730*100)/100; }
    else { d.hr=null; d.mo=null; }
  });
}
let DB=null, CATLBL={}, view='home', activeSvc=null, famFilter=null, sortKey='t', sortDir=1;
let fV=0,fM=0,fMo=Infinity, filterOpen=false, currentRegion='us-east-1';
const REGIONS=[
  ['us-east-1','US East (N. Virginia)'],['us-east-2','US East (Ohio)'],['us-west-1','US West (N. California)'],['us-west-2','US West (Oregon)'],
  ['af-south-1','Africa (Cape Town)'],
  ['ap-east-1','Asia Pacific (Hong Kong)'],['ap-south-1','Asia Pacific (Mumbai)'],['ap-south-2','Asia Pacific (Hyderabad)'],
  ['ap-southeast-1','Asia Pacific (Singapore)'],['ap-southeast-2','Asia Pacific (Sydney)'],['ap-southeast-3','Asia Pacific (Jakarta)'],['ap-southeast-4','Asia Pacific (Melbourne)'],
  ['ap-northeast-1','Asia Pacific (Tokyo)'],['ap-northeast-2','Asia Pacific (Seoul)'],['ap-northeast-3','Asia Pacific (Osaka)'],
  ['ca-central-1','Canada (Central)'],['ca-west-1','Canada West (Calgary)'],
  ['eu-central-1','Europe (Frankfurt)'],['eu-central-2','Europe (Zurich)'],['eu-west-1','Europe (Ireland)'],['eu-west-2','Europe (London)'],['eu-west-3','Europe (Paris)'],
  ['eu-north-1','Europe (Stockholm)'],['eu-south-1','Europe (Milan)'],['eu-south-2','Europe (Spain)'],
  ['il-central-1','Israel (Tel Aviv)'],['me-south-1','Middle East (Bahrain)'],['me-central-1','Middle East (UAE)'],
  ['sa-east-1','South America (São Paulo)'],
];
function initRegion(){
  const sel=$('#region'); if(!sel)return;
  sel.innerHTML=REGIONS.map(([c,n])=>`<option value="${c}">${esc(n)} · ${c}</option>`).join('');
  sel.value=currentRegion;
  sel.addEventListener('change',()=>{ currentRegion=sel.value; });
}
function svcById(id){return DB.services.find(s=>s.id===id);}
function totalTypes(){return DB.services.reduce((a,s)=>a+s.instances.length,0);}
function allFamilies(){const set=new Set();DB.services.forEach(s=>s.instances.forEach(d=>set.add(s.id+':'+d.fam)));return set.size;}

function renderSide(){
  const el=$('#side');
  el.innerHTML=DB.services.map(s=>{
    const open=view==='service'&&s.id===activeSvc;
    let tree='';
    if(open){
      const byCat={};
      s.instances.forEach(d=>{byCat[d.cat]=byCat[d.cat]||{};byCat[d.cat][d.fam]=(byCat[d.cat][d.fam]||0)+1;});
      const cats=CATORDER.filter(c=>byCat[c]);
      tree='<div class="fams">'+
        `<button class="fam-row" data-fam="" aria-current="${famFilter===null}"><span>Todas las familias</span><span class="cnt">${s.instances.length}</span></button>`+
        cats.map(c=>{
          const fams=Object.keys(byCat[c]).sort();
          return `<div class="cat-h">${esc(CATLBL[c]||c)}</div>`+fams.map(f=>
            `<button class="fam-row" data-fam="${esc(f)}" aria-current="${famFilter===f}"><span>${esc(f)}</span><span class="cnt">${byCat[c][f]}</span></button>`).join('');
        }).join('')+'</div>';
    }
    return `<div class="svc ${open?'open':''}">
      <button class="svc-btn" data-svc="${s.id}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVCICON[s.id]||''}</svg></span>${esc(s.name.replace('Amazon ','').replace(' Service',''))}<span class="ch">›</span></button>
      ${tree}</div>`;
  }).join('');
  el.querySelectorAll('.svc-btn').forEach(b=>b.addEventListener('click',()=>{
    if(view!=='service'||activeSvc!==b.dataset.svc){view='service';activeSvc=b.dataset.svc;famFilter=null;sortKey='t';sortDir=1;}
    renderSide();renderMain();
  }));
  el.querySelectorAll('.fam-row').forEach(b=>b.addEventListener('click',()=>{
    famFilter=b.dataset.fam||null;renderSide();renderBody();
  }));
}

function rowsFor(s){
  const q=$('#gsearch').value.trim().toLowerCase();
  const qfEl=$('#qf');const qf=(qfEl?qfEl.value:'').trim().toLowerCase();
  let r=s.instances.filter(d=>{
    if(famFilter&&d.fam!==famFilter)return false;
    if((d.v||0)<fV||(d.m||0)<fM)return false;
    if(fMo!==Infinity&&(d.mo==null||d.mo>fMo))return false;
    const hay=(d.t+' '+(d.famlabel||'')+' '+(d.cfg||'')+' '+(d.a||'')).toLowerCase();
    if(q&&!hay.includes(q))return false;
    if(qf&&!hay.includes(qf))return false;
    return true;
  });
  const k=sortKey,dir=sortDir;
  r.sort((a,b)=>{let x=a[k],y=b[k];
    if(NUMK.has(k)){x=x==null?-1:x;y=y==null?-1:y;return (x-y)*dir;}
    x=(''+(x==null?'':x)).toLowerCase();y=(''+(y==null?'':y)).toLowerCase();return x<y?-dir:x>y?dir:0;});
  return r;
}
function cell(d,k){
  if(k==='t')return `<td class="it-name">${esc(d.t)}${d.gen===0?' <span class="prevtag">prev gen</span>':''}</td>`;
  if(k==='v')return `<td class="num">${d.v==null?'—':d.v}</td>`;
  if(k==='m')return `<td class="num">${d.m!=null?d.m+' GiB':'—'}</td>`;
  if(k==='sto')return `<td class="muted">${esc(d.sto||'—')}</td>`;
  if(k==='net')return `<td class="muted">${esc(d.net||'—')}</td>`;
  if(k==='a')return `<td class="arch">${esc(d.a||'—')}</td>`;
  if(k==='gpu')return `<td class="gpu">${d.gpu?esc(d.gpu):'<span class="muted">—</span>'}</td>`;
  if(k==='cfg')return `<td>${d.cfg?`<span class="cfg">${esc(d.cfg)}</span>`:'<span class="muted">—</span>'}</td>`;
  if(k==='famlabel')return `<td class="muted">${esc(d.famlabel||'—')}</td>`;
  if(k==='hr')return `<td class="num price">${d.hr!=null?money(d.hr):'<span class="muted">—</span>'}</td>`;
  if(k==='mo')return `<td class="num price" style="color:var(--muted)">${d.mo!=null?money0(d.mo):'<span class="muted">—</span>'}</td>`;
  return '<td></td>';
}
function renderBody(){
  if(view!=='service')return;
  const s=svcById(activeSvc);const list=rowsFor(s);const cols=s.cols;
  $('#tbody').innerHTML=list.length?list.map(d=>`<tr>${cols.map(k=>cell(d,k)).join('')}</tr>`).join('')
    :`<tr><td colspan="${cols.length}" class="empty">Sin resultados.</td></tr>`;
  $('#cnt').textContent=`${list.length.toLocaleString('en-US')} de ${s.instances.length.toLocaleString('en-US')} instancias`;
}
function renderMain(){
  if(view==='home'){renderHome();return;}
  const s=svcById(activeSvc);const cols=s.cols;
  const head=cols.map(k=>`<th class="${NUMK.has(k)?'num':''}" data-k="${k}">${esc(LBL[k])}${sortKey===k?`<span class="ar">${sortDir>0?'▲':'▼'}</span>`:''}</th>`).join('');
  $('#main').innerHTML=`
    <div class="main-h">
      <h2>${esc(s.name)}</h2>
      <span class="cnt" id="cnt"></span>
      <div class="qf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="qf" type="search" placeholder="Filtro rápido, ej. r7g…" autocomplete="off"></div>
    </div>
    <div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody id="tbody"></tbody></table></div>
    <div class="note"><b>Fuente.</b> Specs de EC2 desde <code>DescribeInstanceTypes</code> (moto, Apache-2.0). <b>Precios</b> On-Demand us-east-1 (Linux) calculados con el modelo lineal de AWS: precio base <code>.large</code> de la familia × factor de tamaño (large=1, xlarge=2, 2xlarge=4…). Cubre las familias estándar; familias sin base y los servicios gestionados (RDS, ElastiCache, OpenSearch, MQ, Redshift) muestran <code>—</code> hasta cruzar con el <b>AWS Price List</b> por servicio y región.</div>`;
  $('#qf').addEventListener('input',renderBody);
  $('#main').querySelectorAll('thead th').forEach(th=>th.addEventListener('click',()=>{
    const k=th.dataset.k; if(sortKey===k)sortDir*=-1; else{sortKey=k;sortDir=1;}
    $('#main').querySelectorAll('thead th').forEach(x=>{const kk=x.dataset.k;x.className=NUMK.has(kk)?'num':'';x.innerHTML=esc(LBL[kk])+(sortKey===kk?`<span class="ar">${sortDir>0?'▲':'▼'}</span>`:'');});
    renderBody();
  }));
  renderBody();
}
function renderHome(){
  const svcN=DB.services.length, tot=totalTypes(), fams=allFamilies();
  const icGear='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H11l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h3.4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/></svg>';
  const icCube='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>';
  const icLayers='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5z"/><path d="M2 12l10 5 10-5M2 16l10 5 10-5"/></svg>';
  const icSliders='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>';
  const icCompare='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M17 4v16M3 8h4M3 16h4M17 8h4M17 16h4"/></svg>';
  const icDb='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/></svg>';
  const stat=(ic,l,n,s)=>`<div class="stat"><div class="sh"><span>${l}</span><span class="ic">${ic}</span></div><div class="num">${n}</div><div class="s">${s}</div></div>`;
  const feat=(ic,h,p)=>`<div class="feat"><div class="fi">${ic}</div><h3>${h}</h3><p>${p}</p></div>`;
  $('#main').innerHTML=`
    <section class="hero">
      <span class="eyebrow">${icGear} Catálogo de specs y precios AWS</span>
      <h2>Cada tipo de instancia AWS, con specs y precio comparables.</h2>
      <p>Explora los tipos de instancia de seis servicios de AWS —EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ— organizados por familia. Encuentra la instancia adecuada, revisa su configuración y compárala por specs.</p>
    </section>
    <div class="stats">
      ${stat(icCube,'Tipos de instancia',tot.toLocaleString('en-US'),'en 6 servicios AWS')}
      ${stat(icDb,'Servicios',svcN,'EC2 · RDS · ElastiCache · OpenSearch · Redshift · MQ')}
      ${stat(icLayers,'Familias',fams,'agrupadas por categoría')}
      ${stat(icGear,'Fuente','moto','DescribeInstanceTypes · Apache-2.0')}
    </div>
    <div class="features">
      ${feat(icLayers,'Explora por servicio y familia','Los tipos de EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ, organizados por familia con sus especificaciones.')}
      ${feat(icSliders,'Filtra y ordena cada opción','Acota por vCPU, memoria y presupuesto mensual, y ordena por cualquier columna para hallar la instancia ideal.')}
      ${feat(icCompare,'Specs reales desde la API','Specs tomadas de DescribeInstanceTypes; precios referenciales listos para cruzar con el AWS Price List.')}
    </div>`;
}

function applyFilterInputs(){
  fV=parseFloat($('#fv').value)||0; fM=parseFloat($('#fm').value)||0;
  fMo=parseFloat($('#fmo').value)||Infinity;
  updateFilterBtn(); renderBody();
}
function updateFilterBtn(){
  const active=(fV>0||fM>0||fMo!==Infinity);
  $('#filterBtn').classList.toggle('on',active||filterOpen);
}
function initTheme(){
  let s=null;try{s=localStorage.getItem('ie-theme');}catch(e){}
  if(s)document.documentElement.setAttribute('data-theme',s);icon();
  $('#themeBtn').addEventListener('click',()=>{const dark=getComputedStyle(document.documentElement).colorScheme.includes('dark');const n=dark?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('ie-theme',n);}catch(e){}icon();});
  function icon(){const dark=getComputedStyle(document.documentElement).colorScheme.includes('dark');$('#themeIcon').innerHTML=dark?'<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4"/>':'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>';}
}

initTheme();
initRegion();
fetch('services.json',{cache:'no-store'})
  .then(r=>{ if(!r.ok) throw new Error('services.json HTTP '+r.status); return r.json(); })
  .then(d=>{
    DB=d;
    CATLBL=DB.catlabels||{};
    applyPrices();
    renderSide();renderMain();
  })
  .catch(e=>{ $('#main').innerHTML='<div class="empty">No se pudo cargar el catálogo: '+esc(e.message)+'. Abre la página con un servidor local (python3 -m http.server), no con file://</div>'; });

$('#sideBtn').addEventListener('click',()=>$('.shell').classList.toggle('hide-side'));
$('#homeBtn').addEventListener('click',()=>{view='home';famFilter=null;renderSide();renderMain();});
$('#filterBtn').addEventListener('click',()=>{
  if(view!=='service'){view='service';activeSvc=activeSvc||'ec2';renderSide();renderMain();}
  filterOpen=!filterOpen; $('#filterpop').hidden=!filterOpen; updateFilterBtn();
});
['#fv','#fm','#fmo'].forEach(s=>$(s).addEventListener('input',applyFilterInputs));
$('#fclear').addEventListener('click',()=>{$('#fv').value='';$('#fm').value='';$('#fmo').value='';applyFilterInputs();});
$('#gsearch').addEventListener('input',()=>{ if(view!=='service'){view='service';activeSvc=activeSvc||'ec2';renderSide();renderMain();} else renderBody(); });
