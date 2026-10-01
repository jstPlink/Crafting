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
    #stage #build,#stage #featbtn,#stage #rarbtn,#stage #diffbtn{cursor:pointer;pointer-events:auto;font-size:20px!important;font-weight:700;letter-spacing:.08em!important;color:#dfe5ea!important;
      padding:7px 16px;background:rgba(10,12,15,.75);border:1px solid #4a4f55}
    #stage #build::after,#stage #featbtn::after,#stage #rarbtn::after,#stage #diffbtn::after{content:" ▾";color:var(--accent-2)}
    #stage #build:hover,#stage #build.open,#stage #featbtn:hover,#stage #featbtn.open,#stage #rarbtn:hover,#stage #diffbtn:hover,#stage #rarbtn.open,#stage #diffbtn.open{border-color:var(--accent-2)}
    #stage #featbtn,#stage #rarbtn,#stage #diffbtn{position:absolute;z-index:5;font-family:inherit;line-height:normal}
    /* two separate windows, each under its own button */
    .vwinp{position:absolute;top:160px;z-index:60;display:none;max-height:820px;overflow-y:auto;background:#0a0c0f;border:1px solid var(--accent);
      font-size:17px;letter-spacing:.03em;color:#dfe5ea;scrollbar-width:thin;scrollbar-color:#3a3f46 transparent}
    .vwinp.show{display:block}
    #verpanel{right:80px;width:430px}
    #featpanel{width:560px}
    #rarpanel{width:460px}
    #diffpanel{width:460px}
    .vwinp .nrow{display:flex;align-items:center;gap:14px;padding:9px 16px;border-top:1px solid #16181b}
    .vwinp .nrow span{flex:1;font-size:16px}
    .vwinp .nrow input[type=number]{width:72px;height:30px;background:#0f1115;color:#fff;border:1px solid #4a4f55;font:inherit;font-size:17px;padding:0 6px;text-align:right}
    .vwinp .rrow{display:flex;align-items:center;gap:14px;padding:9px 16px;border-top:1px solid #16181b}
    .vwinp .rrow b{flex:none;width:52px;text-align:center;font-size:15px;letter-spacing:.06em;padding:2px 0;color:#0a0c0f}
    .vwinp .rrow input[type=color]{width:64px;height:30px;padding:0;border:1px solid #4a4f55;background:none;cursor:pointer}
    .vwinp .rrow code{font-size:15px;color:var(--dim)}
    .vwinp .prow{display:flex;align-items:center;gap:12px;padding:8px 16px;border-top:1px solid #16181b;cursor:pointer}
    .vwinp .prow:hover{background:#171a1e}.vwinp .prow.cur{background:#211914}
    .vwinp .prow .pn{flex:1;font-size:17px;font-weight:700;letter-spacing:.05em}
    .vwinp .pch{display:flex;gap:2px}.vwinp .pch i{width:16px;height:22px}
    .vwinp .pdel{background:none;border:0;color:#8a939b;font-size:16px;cursor:pointer;padding:2px 6px}.vwinp .pdel:hover{color:#ff6b6b}
    .vwinp .racts{display:flex;gap:10px;padding:12px 16px;border-top:1px solid #16181b}
    .vwinp .racts button{flex:1;font-family:inherit;font-size:15px;font-weight:700;letter-spacing:.08em;padding:8px 0;background:#22262b;color:#dfe5ea;border:1px solid #4a4f55;cursor:pointer}
    .vwinp .racts button:hover{border-color:var(--accent-2)}
    .vwinp .racts button.pri{background:var(--accent);border-color:var(--accent);color:#fff}
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
  const rar = window.craftingRarity;                      // rarity colours: dropdown next to FEATURES
  const rarBtn = rar ? mk('button', 'rarbtn') : null;
  const rarPanel = rar ? mk('div', 'rarpanel', 'vwinp') : null;
  if(rarBtn) rarBtn.textContent = 'RARITY';
  const dif = window.craftingDiff;                        // diff colours and thresholds: dropdown next to RARITY
  const difBtn = dif ? mk('button', 'diffbtn') : null;
  const difPanel = dif ? mk('div', 'diffpanel', 'vwinp') : null;
  if(difBtn) difBtn.textContent = 'DIFF';

  // the FEATURES button sits just left of the version button, same row; its window hangs under it
  function place(){
    if(!featBtn) return;
    const right = parseFloat(getComputedStyle(label).right) || 80;
    featBtn.style.top = label.offsetTop + 'px';
    featBtn.style.right = (right + label.offsetWidth + 10) + 'px';
    featPanel.style.right = featBtn.style.right;
    if(rarBtn){
      rarBtn.style.top = label.offsetTop + 'px';
      rarBtn.style.right = (right + label.offsetWidth + 10 + featBtn.offsetWidth + 10) + 'px';
      rarPanel.style.right = rarBtn.style.right;
      if(difBtn){
        difBtn.style.top = label.offsetTop + 'px';
        difBtn.style.right = (right + label.offsetWidth + 10 + featBtn.offsetWidth + 10 + rarBtn.offsetWidth + 10) + 'px';
        difPanel.style.right = difBtn.style.right;
      }
    }
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

  function renderRarity(msg){
    const cur = rar.colors(), def = rar.defaults();
    let h = `<h4>RARITY COLOURS · LV1 → LV7</h4>`;
    cur.forEach((c, i) => { h += `<div class="rrow"><b style="background:${c}">LV${i+1}</b><input type="color" data-rar="${i+1}" value="${c}"><code>${c}${c !== def[i] ? ' · edited' : ''}</code></div>`; });
    const pr = rar.presets();
    h += `<h4>PRESETS</h4>`;
    for(const [n, cs] of Object.entries(pr)){
      const on = cs.every((c, i) => c.toLowerCase() === cur[i].toLowerCase());
      h += `<div class="prow ${on ? 'cur' : ''}" data-preset="${esc(n)}"><span class="pn">${esc(n)}</span><span class="pch">${cs.map(c => `<i style="background:${c}"></i>`).join('')}</span><button class="pdel" data-pdel="${esc(n)}" title="Delete preset">✕</button></div>`;
    }
    h += `<div class="racts"><button data-psave>SAVE CURRENT AS PRESET…</button></div>`;
    h += `<div class="racts"><button data-rreset>RESET</button><button class="pri" data-rsave>SAVE AS DEFAULT</button></div>`;
    h += `<div class="vfoot">${esc(msg || 'Changes apply live and stay in this browser. SAVE AS DEFAULT writes them into the app code (local dev server only) so everyone who opens it gets them.')}</div>`;
    rarPanel.innerHTML = h;
  }
  if(rarPanel){
    // colour picker: update live without rebuilding the panel (it would close the native picker)
    rarPanel.addEventListener('input', e => {
      const i = e.target.dataset?.rar; if(!i) return;
      rar.set(+i, e.target.value);
      const row = e.target.closest('.rrow'); row.querySelector('b').style.background = e.target.value;
      row.querySelector('code').textContent = e.target.value + (e.target.value !== rar.defaults()[i-1] ? ' · edited' : '');
    });
    rarPanel.addEventListener('click', async e => {
      e.stopPropagation();
      const pd = e.target.closest('[data-pdel]');
      if(pd){ rar.deletePreset(pd.dataset.pdel); renderRarity('Preset deleted (SAVE AS DEFAULT makes it permanent).'); return; }
      const pa = e.target.closest('[data-preset]');
      if(pa){ rar.applyPreset(pa.dataset.preset); renderRarity('Preset applied.'); return; }
      if(e.target.closest('[data-psave]')){
        const n = (prompt('Preset name') || '').trim().slice(0, 24);
        if(n){ rar.savePreset(n); renderRarity('Preset "' + n + '" saved in this browser (SAVE AS DEFAULT writes it into the app).'); }
        return;
      }
      if(e.target.closest('[data-rreset]')){ rar.reset(); renderRarity('Back to the saved defaults.'); }
      else if(e.target.closest('[data-rsave]')){
        try{ await rar.saveDefault(); renderRarity('Saved: these colours are now the app defaults (written to app.js). Commit to keep them.'); }
        catch(err){ renderRarity('Could not save (' + err.message + '). Saving only works on the local dev server.'); }
      }
    });
    rarPanel.addEventListener('pointerdown', e => e.stopPropagation());
  }

  function renderDiff(msg){
    const d = dif.get(), def = dif.defaults();
    const rows = [['low','Below T1 (barely changed)'],['betterMid','T1 – T2 · better'],['worseMid','T1 – T2 · worse'],['betterHigh','T2 and more · better'],['worseHigh','T2 and more · worse']];
    let h = `<h4>DIFF COLOURS · BY SIZE OF THE CHANGE</h4>`;
    h += `<div class="nrow"><span>T1 · up to this % of change stays <b>${esc(d.low)}</b></span><input type="number" min="0" max="99" step="1" data-dnum="t1" value="${d.t1}"></div>`;
    h += `<div class="nrow"><span>T2 · up to this % the middle colours apply</span><input type="number" min="1" max="100" step="1" data-dnum="t2" value="${d.t2}"></div>`;
    for(const [k, name] of rows) h += `<div class="rrow"><b style="background:${d[k]};width:auto;padding:2px 10px;flex:1;text-align:left;letter-spacing:.02em">${esc(name)}</b><input type="color" data-dcol="${k}" value="${d[k]}"><code>${d[k]}${d[k] !== def[k] ? ' · edited' : ''}</code></div>`;
    h += `<div class="racts"><button data-dreset>RESET</button><button class="pri" data-dsave>SAVE AS DEFAULT</button></div>`;
    h += `<div class="vfoot">${esc(msg || 'Changes apply live and stay in this browser. SAVE AS DEFAULT writes them into the app code (local dev server only).')}</div>`;
    difPanel.innerHTML = h;
  }
  if(difPanel){
    difPanel.addEventListener('input', e => {
      const t = e.target;
      if(t.dataset?.dcol){ dif.set(t.dataset.dcol, t.value); const row = t.closest('.rrow'); row.querySelector('b').style.background = t.value; row.querySelector('code').textContent = t.value + (t.value !== dif.defaults()[t.dataset.dcol] ? ' · edited' : ''); }
      else if(t.dataset?.dnum){
        const v = Math.max(0, Math.min(100, +t.value)), o = dif.get();
        const k = t.dataset.dnum;
        if(isFinite(v) && (k === 't1' ? v < o.t2 : v > o.t1)) dif.set(k, v);
      }
    });
    difPanel.addEventListener('click', async e => {
      e.stopPropagation();
      if(e.target.closest('[data-dreset]')){ dif.reset(); renderDiff('Back to the saved defaults.'); }
      else if(e.target.closest('[data-dsave]')){
        try{ await dif.saveDefault(); renderDiff('Saved: these colours and thresholds are now the app defaults (written to app.js). Commit to keep them.'); }
        catch(err){ renderDiff('Could not save (' + err.message + '). Saving only works on the local dev server.'); }
      }
    });
    difPanel.addEventListener('pointerdown', e => e.stopPropagation());
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
    if(rarPanel){ rarPanel.classList.toggle('show', which==='rar'); rarBtn.classList.toggle('open', which==='rar'); }
    if(difPanel){ difPanel.classList.toggle('show', which==='diff'); difBtn.classList.toggle('open', which==='diff'); }
  };
  label.title = 'Versions';
  label.addEventListener('click', e => { e.stopPropagation(); renderVersions(); open(verPanel.classList.contains('show') ? null : 'ver'); });
  if(featBtn){
    featBtn.title = 'Features: switch parts of the UI on / off';
    featBtn.addEventListener('click', e => { e.stopPropagation(); place(); renderFeatures(); open(featPanel.classList.contains('show') ? null : 'feat'); });
    featBtn.addEventListener('pointerdown', e => e.stopPropagation());
  }
  if(rarBtn){
    rarBtn.title = 'Rarity colours';
    rarBtn.addEventListener('click', e => { e.stopPropagation(); place(); renderRarity(); open(rarPanel.classList.contains('show') ? null : 'rar'); });
    rarBtn.addEventListener('pointerdown', e => e.stopPropagation());
  }
  if(difBtn){
    difBtn.title = 'Diff colours and thresholds';
    difBtn.addEventListener('click', e => { e.stopPropagation(); place(); renderDiff(); open(difPanel.classList.contains('show') ? null : 'diff'); });
    difBtn.addEventListener('pointerdown', e => e.stopPropagation());
  }
  document.addEventListener('click', e => { if(rarPanel?.contains(e.target) || difPanel?.contains(e.target)) return; if(!verPanel.contains(e.target) && !featPanel?.contains(e.target)) open(null); });
  place(); setTimeout(place, 300); document.fonts?.ready.then(place);   // the label width depends on the web font
})();
