/* =====================================================================
   VERSION MENU & FEATURES MENU

   Shared by every version: the root index.html and every frozen snapshot
   (versions/<v>/index.html) load this file, so you can always switch back.
   Click the build label (top right, under the credits) to open it.

   Two buttons, each with its own window (opening one closes the other):
   - VERSION (the version label, under the credits): lists window.CRAFTING_VERSIONS (versions.js, written by
       scripts/snapshot.py). LATEST = the working copy at the site root, others = frozen snapshots
       in versions/<v>/. Every version keeps its own saved builds.
   - FEATURES (button just left of it): optional, only when the version has features. A version can expose window.craftingExperiments =
       { items: () => [{ id, label, desc, on, since }], toggle: id => {} }
     and each item shows up as a switch, tagged with the version that added it (`since`).

   Globals read: APP_VERSION (app.js), window.CRAFTING_VERSIONS (versions.js)
   ===================================================================== */
(function(){
  const stage = document.getElementById('stage'), label = document.getElementById('build');
  if(!stage || !label) return;

  const cur = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?';
  const nums = v => String(v).split('.').map(n => +n || 0);
  const newestFirst = (a, b) => { const x = nums(a.version), y = nums(b.version); for(let i = 0; i < 3; i++) if(x[i] !== y[i]) return y[i] - x[i]; return 0; };
  const list = (window.CRAFTING_VERSIONS || []).slice().sort(newestFirst);
  const snap = location.pathname.match(/^(.*?)\/versions\/[^/]+\/(?:index\.html)?$/);   // are we inside a snapshot?
  const root = snap ? snap[1] + '/' : location.pathname.replace(/[^/]*$/, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  const css = document.createElement('style');
  css.textContent = `
    /* the version button: !important because older versions style #build as a tiny grey label */
    #stage #build,#stage #featbtn{cursor:pointer;pointer-events:auto;font-size:20px!important;font-weight:700;letter-spacing:.08em!important;color:#dfe5ea!important;
      padding:7px 16px;background:rgba(10,12,15,.75);border:1px solid #4a4f55}
    #stage #build::after,#stage #featbtn::after{content:" ▾";color:var(--accent-2)}
    #stage #build:hover,#stage #build.open,#stage #featbtn:hover,#stage #featbtn.open{border-color:var(--accent-2)}
    #stage #featbtn{position:absolute;z-index:5;font-family:inherit;line-height:normal}
    /* two separate windows, each under its own button */
    .vwinp{position:absolute;top:160px;z-index:60;display:none;max-height:820px;overflow-y:auto;background:#0a0c0f;border:1px solid var(--accent);
      font-size:17px;letter-spacing:.03em;color:#dfe5ea;scrollbar-width:thin;scrollbar-color:#3a3f46 transparent}
    .vwinp.show{display:block}
    #verpanel{right:80px;width:430px}
    #featpanel{width:560px}
    .vwinp .since{font-size:12px;font-weight:700;letter-spacing:.08em;color:#9aa3ab;border:1px solid #3a3f46;padding:1px 6px;margin-left:8px;vertical-align:3px}
    .vwinp h4{font-size:15px;letter-spacing:.14em;color:var(--dim);padding:12px 16px 6px;font-weight:600}
    .vwinp .vrow{display:flex;align-items:center;gap:12px;padding:9px 16px;border-top:1px solid #16181b;cursor:pointer}
    .vwinp .vrow:hover{background:#171a1e}
    .vwinp .vrow.cur{background:#211914;cursor:default}
    .vwinp .vmain{flex:1;min-width:0}
    .vwinp .vmain b{font-size:20px;letter-spacing:.05em}
    .vwinp .vmain small{display:block;font-size:15px;color:var(--dim);letter-spacing:.02em;line-height:1.3;margin-top:2px}
    .vwinp .vtag{font-size:13px;font-weight:700;letter-spacing:.12em;padding:2px 8px;background:#1f3d29;color:var(--good)}
    .vwinp .sw{flex:none;width:52px;text-align:center;font-size:14px;font-weight:700;letter-spacing:.1em;padding:3px 0;background:#22262b;color:var(--dim)}
    .vwinp .sw.on{background:#1f3d29;color:var(--good)}
    .vwinp .vfoot{padding:10px 16px;font-size:14px;color:var(--dim);border-top:1px solid #16181b}`;
  document.head.appendChild(css);

  const mk = (tag, id, cls) => { const el = document.createElement(tag); el.id = id; if(cls) el.className = cls; stage.appendChild(el); return el; };
  const verPanel = mk('div', 'verpanel', 'vwinp');
  const ex = window.craftingExperiments;                 // older versions have no features: no button, no window
  const featBtn = ex ? mk('button', 'featbtn') : null;
  const featPanel = ex ? mk('div', 'featpanel', 'vwinp') : null;
  if(featBtn) featBtn.textContent = 'FEATURES';

  // the FEATURES button sits just left of the version button, same row; its window hangs under it
  function place(){
    if(!featBtn) return;
    const right = parseFloat(getComputedStyle(label).right) || 80;
    featBtn.style.top = label.offsetTop + 'px';
    featBtn.style.right = (right + label.offsetWidth + 10) + 'px';
    featPanel.style.right = featBtn.style.right;
  }

  function renderVersions(){
    let v = `<h4>VERSION · YOU ARE ON v${esc(cur)}</h4>`;
    v += `<div class="vrow ${snap ? '' : 'cur'}" data-root><div class="vmain"><b>LATEST</b><small>Working copy: always the newest version</small></div>${snap ? '' : '<span class="vtag">HERE</span>'}</div>`;
    for(const e of list){
      const here = !!snap && e.version === cur;
      v += `<div class="vrow ${here ? 'cur' : ''}" data-go="${esc(e.version)}"><div class="vmain"><b>v${esc(e.version)}</b><small>${esc(e.date || '')}${e.notes ? ' · ' + esc(e.notes) : ''}</small></div>`
        + (here ? '<span class="vtag">HERE</span>' : '') + `</div>`;
    }
    if(!list.length) v += '<div class="vfoot">No frozen versions yet.</div>';
    v += '<div class="vfoot">Saved builds are kept separately for every version.</div>';
    verPanel.innerHTML = v;
  }
  function renderFeatures(){
    let f = `<h4>FEATURES · SWITCH ON / OFF</h4>`;
    for(const it of ex.items()) f += `<div class="vrow" data-exp="${esc(it.id)}"><div class="vmain"><b>${esc(it.label)}</b>${it.since ? `<span class="since" title="Added in v${esc(it.since)}">v${esc(it.since)}</span>` : ''}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</div><span class="sw ${it.on ? 'on' : ''}">${it.on ? 'ON' : 'OFF'}</span></div>`;
    featPanel.innerHTML = f;
  }

  function go(v){ location.href = root + 'versions/' + v + '/index.html'; }
  for(const p of [verPanel, featPanel]) if(p){
    p.addEventListener('click', e => {
      e.stopPropagation();
      const t = e.target;
      const x = t.closest('[data-exp]'); if(x){ ex.toggle(x.dataset.exp); renderFeatures(); return; }
      if(t.closest('[data-root]')){ if(snap) location.href = root + 'index.html'; return; }
      const g = t.closest('[data-go]'); if(g && !g.classList.contains('cur')) go(g.dataset.go);
    });
    p.addEventListener('pointerdown', e => e.stopPropagation());
  }

  // one window at a time: opening one closes the other
  const open = which => {
    verPanel.classList.toggle('show', which==='ver'); label.classList.toggle('open', which==='ver');
    if(featPanel){ featPanel.classList.toggle('show', which==='feat'); featBtn.classList.toggle('open', which==='feat'); }
  };
  label.title = 'Versions';
  label.addEventListener('click', e => { e.stopPropagation(); renderVersions(); open(verPanel.classList.contains('show') ? null : 'ver'); });
  if(featBtn){
    featBtn.title = 'Features: switch parts of the UI on / off';
    featBtn.addEventListener('click', e => { e.stopPropagation(); place(); renderFeatures(); open(featPanel.classList.contains('show') ? null : 'feat'); });
    featBtn.addEventListener('pointerdown', e => e.stopPropagation());
  }
  document.addEventListener('click', e => { if(!verPanel.contains(e.target) && !featPanel?.contains(e.target)) open(null); });
  place(); setTimeout(place, 300); document.fonts?.ready.then(place);   // the label width depends on the web font
})();
