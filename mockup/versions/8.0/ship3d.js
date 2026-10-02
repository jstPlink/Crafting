/* =====================================================================
   3D SHIP VIEW  (three.js r147, classic script — works from file://)

   Globals used from app.js: S, LY, PV, BODY, SIZE, ITEM, layout(),
   renderAll(), toast(), $

   MAIN BODIES: the catalogue lives in app.js (BODIES). Each body is either procedural
   (look.r = hull radii, look.color) or a dropped .glb (body.model3d).

   SOCKET CONTRACT for real main-body models (.glb):
     add an Empty/node per socket named  sock_p<size>_<n>
       sock_p3_1, sock_p3_2 …   large  (blue circle)
       sock_p2_1 …              medium (green square)
       sock_p1_1 …              small  (red triangle)
     The node's local +Z axis is the direction pylons grow out of the socket.
   Pylons, extensions, splits and modules are generated on top of those
   sockets, so the model only has to describe the bare main body.
   ===================================================================== */
let SHIP_W = 920, SHIP_H = 468;          // follows #shipbox (full stage in view mode)
const TARGET = new THREE.Vector3(0, .5, -.3);

const PYL_R = { 1:.07, 2:.11, 3:.17 };       // strut radius by socket size
const MOD_SCALE = { 1:.55, 2:.85, 3:1.3 };   // module size by socket size
const SPR_SIZE = { 1:.55, 2:.8, 3:1.1 };     // socket marker size
const KIND_COL = { primary:0xe2685b, secondary:0xd8b25a, engine:0x3d8ff0 };   // red / yellow / blue by module type
const OUTLINE = { sel:0xf4623a, hov:0xe9edf0 };
const MOD_R = { 1:.3, 2:.45, 3:.7 };          // rough module radius, to place the size badge beside it

const V = { ready:false, cur:{ yaw:.75, pitch:.34, d:13.2 }, pan:new THREE.Vector3(), panCur:new THREE.Vector3(), look:new THREE.Vector3(), tex:{}, raycaster:new THREE.Raycaster(), tmp:new THREE.Vector3(),
            pickers:[], anchor:{}, spr:{}, modG:{}, flames:[], customN:0 };

/* ---------- helpers ---------- */
const stdMat = (color, metal=.35, rough=.45, extra={}) => new THREE.MeshStandardMaterial({ color, metalness:metal, roughness:rough, ...extra });
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

function ringTexture(shape, color, dashed, filled=false){
  const key = shape+color+dashed+filled; if(V.tex[key]) return V.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 10; g.lineJoin = 'round';
  if(dashed) g.setLineDash([16,10]);
  g.beginPath();
  if(shape==='tri'){ g.moveTo(64,14); g.lineTo(116,106); g.lineTo(12,106); g.closePath(); }
  else if(shape==='sq'){ g.rect(20,20,88,88); }
  else { g.arc(64,64,48,0,Math.PI*2); }
  if(filled){ g.fillStyle = color; g.fill(); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return V.tex[key] = t;
}
function makeSprite(tex){
  const m = new THREE.SpriteMaterial({ map:tex, alphaTest:.5, transparent:false, depthTest:false, depthWrite:false });
  const sp = new THREE.Sprite(m); sp.renderOrder = 10; return sp;
}
function strut(a, b, r, mat){
  const A = v3(a), B = v3(b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r*.85, r, d.length(), 12), mat);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return m;
}

/* ---------- procedural main bodies ---------- */
function buildHull(body){
  const g = new THREE.Group();
  const [rx,ry,rz] = body.look.r;
  const main = stdMat(body.look.color,.4,.4);
  const dark = stdMat(0x22272d,.5,.5), steel = stdMat(0x59616b,.5,.45);
  const glass = stdMat(new THREE.Color(body.look.color).multiplyScalar(.55).getHex(),.5,.3);
  const cyan = new THREE.MeshBasicMaterial({ color:0x35e0d0 });

  const hull = new THREE.Mesh(new THREE.SphereGeometry(1,40,24), main); hull.scale.set(rx,ry,rz); g.add(hull);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1,24,16), dark); belly.scale.set(.73*rx,.55*ry,.69*rz); belly.position.set(0,-.55*ry,.03*rz); g.add(belly);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.5,24,16), glass); cockpit.scale.set(.8*rx,.73*ry,.62*rz); cockpit.position.set(0,.68*ry,.41*rz); g.add(cockpit);
  for(const sx of [-1,1]){
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.31*rz), cyan); strip.position.set(sx*.53*rx,.45*ry,.45*rz); strip.rotation.y = sx*-.25; g.add(strip);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.1,.64*ry,.45*rz), steel); fin.position.set(sx*.9*rx,-.09*ry,-.17*rz); fin.rotation.z = sx*.3; g.add(fin);
  }
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.2*rx,.82*ry,.38*rz), dark); rear.position.set(0,.09*ry,-.9*rz); g.add(rear);

  // a base plate + coloured rim under every socket
  const zAxis = new THREE.Vector3(0,0,1);
  for(const s of body.sockets){
    const r = SPR_SIZE[s.size]*.42, dir = v3(s.dir).normalize();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,.12,20).rotateX(Math.PI/2), dark);
    plate.position.copy(v3(s.pos)); plate.quaternion.setFromUnitVectors(zAxis, dir); g.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,28), stdMat(SIZE[s.size].color, .1, .85));   // lit and matte, not glowing: it must not be mistaken for the 3D markers
    rim.position.copy(v3(s.pos)).addScaledVector(dir,.07); rim.quaternion.copy(plate.quaternion); rim.userData.rimOf = s.id; g.add(rim);
  }
  return g;
}

/* ---------- modules ---------- */
function buildModule(kind, size, style){
  const g = new THREE.Group();
  const tint = style==='good' ? 0x2f9e4d : style==='bad' ? 0xc23a3a : style==='rem' ? 0x5a3030 : KIND_COL[kind];
  const lit = style!=='normal';
  const m = stdMat(tint,.4,.4, lit ? { emissive:tint, emissiveIntensity:.45 } : {});
  const dark = stdMat(0x1b1f24,.4,.5);
  const cyl = (r1,r2,len,mat) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,16), mat); c.rotation.x = Math.PI/2; return c; };
  if(kind==='primary'){
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.36,.36,.55), m));
    const b = cyl(.07,.09,1.3,m); b.position.z = .85; g.add(b);
    const t = cyl(.11,.11,.14,dark); t.position.z = 1.5; g.add(t);
  }else if(kind==='secondary'){
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.24,16,12), m));
    for(const sx of [-1,1]){ const t = cyl(.13,.13,.9,m); t.position.set(sx*.17,0,.45); g.add(t); const c = cyl(.15,.15,.08,dark); c.position.set(sx*.17,0,.92); g.add(c); }
  }else{
    const body = cyl(.36,.4,.8,m); body.position.z = -.1; g.add(body);
    const noz = cyl(.42,.3,.22,dark); noz.position.z = .4; g.add(noz);
    const glowCol = style==='normal' ? 0x9fd4ff : tint;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.27,20), new THREE.MeshBasicMaterial({ color:glowCol })); glow.position.z = .52; glow.userData.noOutline = true; g.add(glow);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.24,1.1,16), new THREE.MeshBasicMaterial({ color: style==='normal' ? 0x5fb0ff : tint }));
    flame.rotation.x = Math.PI/2; flame.position.z = 1.08; flame.userData.noOutline = true; g.add(flame); V.flames.push(flame);
  }
  g.scale.setScalar(MOD_SCALE[size]);
  // weapons fire forward, engines exhaust backward — whatever the socket direction
  if(kind==='engine') g.rotation.y = Math.PI;
  return g;
}

/* ---------- outline (selected / hovered part) ----------
   inverted hull: every mesh gets a back-face twin pushed out along its normals */
const outlineMats = {};
function outlineMat(color, thick){
  const key = color+'_'+thick;
  return outlineMats[key] || (outlineMats[key] = new THREE.ShaderMaterial({
    uniforms:{ color:{ value:new THREE.Color(color) }, thick:{ value:thick } },
    vertexShader:'uniform float thick; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal*thick, 1.0); }',
    fragmentShader:'uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }',
    side:THREE.BackSide,
  }));
}
function addOutline(obj, color, thick){
  const meshes = []; obj.traverse(o => { if(o.isMesh && !o.userData.noOutline && !o.userData.outline) meshes.push(o); });
  for(const m of meshes){ const o = new THREE.Mesh(m.geometry, outlineMat(color, thick)); o.userData.outline = true; m.add(o); }
}

/* ---------- init ---------- */
function initShip(){
  const box = $('#shipbox');
  const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  renderer.setClearColor(0x0c0f12, 1);
  box.insertBefore(renderer.domElement, box.firstChild);
  V.renderer = renderer;
  const scene = V.scene = new THREE.Scene();
  const camera = V.camera = new THREE.PerspectiveCamera(40, SHIP_W/SHIP_H, .1, 100);

  scene.add(new THREE.AmbientLight(0x8a96aa, .7));
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a1a12, .6));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.9); key.position.set(5,9,7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf4623a, 1.6); rim.position.set(-7,3,-7); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x4aa0ff, .8); fill.position.set(-8,2,6); scene.add(fill);

  // docking platform
  const floorY = -3.0;
  const floorG = V.floorG = new THREE.Group(); scene.add(floorG);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.12,72), stdMat(0x12171d,.3,.7)); floor.position.y = floorY; floorG.add(floor);
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(4.95,.05,8,120), new THREE.MeshBasicMaterial({ color:0x2f7a43 })); ringG.rotation.x = Math.PI/2; ringG.position.y = floorY+.08; floorG.add(ringG);
  const ringO = new THREE.Mesh(new THREE.TorusGeometry(3.9,.04,8,120), new THREE.MeshBasicMaterial({ color:0x8a4230 })); ringO.rotation.x = Math.PI/2; ringO.position.y = floorY+.08; floorG.add(ringO);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0,48), new THREE.MeshBasicMaterial({ color:0x0a0c0e })); shadow.rotation.x = -Math.PI/2; shadow.position.y = floorY+.07; floorG.add(shadow);

  const shipRoot = V.shipRoot = new THREE.Group(); scene.add(shipRoot);
  V.hull = BODY.model3d || buildHull(BODY); shipRoot.add(V.hull);
  V.dyn = new THREE.Group(); shipRoot.add(V.dyn);   // pylons, modules, markers: rebuilt on every change

  V.ready = true;
  resizeShip();
  setShipBody();

  // drag & drop a .glb main body
  const stg = $('#stage');
  stg.addEventListener('dragover', e => e.preventDefault());
  stg.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0]; if(!f) return;
    if(!/\.(glb|gltf)$/i.test(f.name)){ toast('DROP A .GLB FILE','bad'); return; }
    loadShipModel(URL.createObjectURL(f), f.name);
  });
  const q = new URLSearchParams(location.search).get('model');
  if(q) loadShipModel(q, q);

  requestAnimationFrame(animateShip);
}
function resizeShip(){
  if(!V.ready) return;
  const box = $('#shipbox');
  SHIP_W = box.offsetWidth || SHIP_W; SHIP_H = box.offsetHeight || SHIP_H;
  V.camera.aspect = SHIP_W/SHIP_H;
  // tall view with the info card over its lower part: render a window shifted down so the ship sits higher
  const lift = !S.view && SHIP_H > 700 ? Math.round(SHIP_H * .1) : 0;
  if(lift) V.camera.setViewOffset(SHIP_W, SHIP_H, 0, lift, SHIP_W, SHIP_H); else V.camera.clearViewOffset();
  V.camera.updateProjectionMatrix();
  V.renderer.setPixelRatio(Math.min(2.5, (devicePixelRatio||1) * (S.scale||1)));
  V.renderer.setSize(SHIP_W, SHIP_H, false);
}
window.resizeShip = resizeShip;
// view-mode panning: moves the orbit target in the camera plane (dx,dy in stage pixels)
function panShip(dx, dy){
  if(!V.ready) return;
  const c = V.camera, k = V.cur.d * .0011;
  const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
  V.pan.addScaledVector(right, -dx*k).addScaledVector(up, dy*k).clampLength(0, 9);
}
window.panShip = panShip;
window.resetPan = () => V.pan.set(0,0,0);
function setShipCursor(c){ const cv = V.renderer?.domElement; if(cv) cv.style.cursor = c; }

/* ---------- model loading ---------- */
function loadShipModel(url, name){
  new THREE.GLTFLoader().load(url, gltf => setHull(gltf.scene, name), undefined, () => toast('MODEL LOAD FAILED','bad'));
}
// swap the 3D hull / platform to the active body (called when the selector changes body)
function setShipBody(){
  if(!V.ready) return;
  V.shipRoot.remove(V.hull);
  V.hull = BODY.model3d || buildHull(BODY);
  V.shipRoot.add(V.hull);
  const ry = BODY.look ? BODY.look.r[1] : 1.1;
  V.floorG.scale.set(BODY.plat||1, 1, BODY.plat||1);
  V.floorG.position.y = 3.0 - (ry + 1.9);
}
window.setShipBody = setShipBody;

// a dropped .glb becomes a new main body in the selector
function setHull(obj, name){
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  obj.position.sub(ctr);
  const k = 6 / Math.max(size.x,size.y,size.z);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.scale.setScalar(k);
  V.shipRoot.add(wrap); V.shipRoot.updateMatrixWorld(true);

  const found = [];
  obj.traverse(n => {
    const m = /^sock(?:et)?[_\- ]?p([123])[_\- ]?(\d+)/i.exec(n.name || ''); if(!m) return;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    n.getWorldPosition(wp); n.getWorldQuaternion(wq);
    V.shipRoot.worldToLocal(wp);
    const dir = new THREE.Vector3(0,0,1).applyQuaternion(wq);
    found.push({ size:+m[1], n:+m[2], pos:[wp.x,wp.y,wp.z], dir:[dir.x,dir.y,dir.z] });
  });
  V.shipRoot.remove(wrap);
  if(!found.length){ toast('NO sock_p* NODES FOUND · MODEL IGNORED','bad'); return; }

  found.sort((a,b) => b.size-a.size || a.n-b.n);
  const id = 'custom' + (++V.customN);
  const label = (name || id).split(/[\\/]/).pop().replace(/\.(glb|gltf)$/i,'').replace(/[_-]+/g,' ').toUpperCase();
  BODIES[id] = { id, name:label, tag:'CUSTOM', value:1500, integrity:20000, shield:10000, generator:26, heatCap:400, heatCool:60, boost:100,
    cam:13, plat:1.1, look:{ r:[size.x*k/2, size.y*k/2, size.z*k/2], color:0x777777 },
    sockets: found.map((f,i) => ({ id:'b'+i, size:f.size, pos:f.pos, dir:f.dir })), model3d:wrap };
  BODY_LIST.push(id);
  switchBody(id);
  const c = n => found.filter(f=>f.size===n).length;
  toast(`${label} ADDED · ${found.length} SOCKETS (P3×${c(3)} P2×${c(2)} P1×${c(1)})`);
}

/* ---------- state -> scene ---------- */
function clearDyn(){
  for(const c of [...V.dyn.children]){
    V.dyn.remove(c);
    c.traverse(o => { o.geometry?.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m => m?.dispose()); });
  }
  V.pickers = []; V.anchor = {}; V.spr = {}; V.modG = {}; V.flames = [];
}
function renderShip(){
  if(!V.ready) return;
  clearDyn();
  V.shipRoot.visible = !BODY.unknown;   // an unknown ship leaves the 3D scene empty (just the dock)
  if(BODY.unknown){ V.links = []; const lk = $('#links'); if(lk) lk.innerHTML = ''; return; }
  const withPv = PV && PV.to;
  const att = withPv ? PV.att : S.att;
  const disp = withPv ? layout(PV.att) : LY;
  V.disp = disp; V.att = att;

  const ghost = new Set(), rem = new Set(); let gstyle = 'good';
  if(PV){
    if(PV.to){ gstyle = PV.fits ? 'good' : 'bad'; disp.list.forEach(s => { if(s.id===PV.sid || s.id.startsWith(PV.sid+'.')) ghost.add(s.id); }); }
    else LY.list.forEach(s => { if(s.id===PV.sid || s.id.startsWith(PV.sid+'.')) rem.add(s.id); });
  }
  const styleOf = id => ghost.has(id) ? gstyle : rem.has(id) ? 'rem' : 'normal';
  const steel = stdMat(0x59616b,.5,.45), knob = stdMat(0x22272d,.5,.5);
  const pylMat = st => st==='normal' ? steel : stdMat(st==='good'?0x2f9e4d:st==='bad'?0xc23a3a:0x5a3030,.4,.4,{ emissive:st==='good'?0x2f9e4d:st==='bad'?0xc23a3a:0x5a3030, emissiveIntensity:.4 });

  for(const s of disp.list){
    const a = att[s.id], st = styleOf(s.id);
    const an = new THREE.Object3D(); an.position.copy(v3(s.pos)); V.dyn.add(an); V.anchor[s.id] = an;

    const sel = S.sel===s.id && S.intSel==null && !noSel(), hov = S.hoverSlot===s.id;
    const oCol = !S.view && (sel ? OUTLINE.sel : hov && !s.pylon ? OUTLINE.hov : null);   // arms: never a hover highlight
    if(s.pylon){                                   // struts
      const mat = pylMat(st), r = PYL_R[s.size], ag = new THREE.Group();
      s.segs.forEach(([p,q]) => ag.add(strut(p,q,r,mat)));
      const base = new THREE.Mesh(new THREE.SphereGeometry(r*1.7,14,10), knob); base.position.copy(v3(s.pos)); ag.add(base);
      if(s.joint){ const j = new THREE.Mesh(new THREE.SphereGeometry(r*1.5,14,10), knob); j.position.copy(v3(s.joint)); ag.add(j); }
      if(oCol!=null) addOutline(ag, oCol, .05);
      V.dyn.add(ag);
    }
    if(a && a.t==='mod'){                          // module
      const it = ITEM(a.id), mg = buildModule(it.kind, s.size, st);
      mg.position.copy(v3(s.pos)); V.dyn.add(mg); V.modG[s.id] = mg;
      if(oCol!=null) addOutline(mg, oCol, .07/MOD_SCALE[s.size]);
    }

    // socket marker (free sockets only): dashed triangle / square / circle in the size colour.
    // Mounted modules and arms get no marker: selection / hover outline the part itself.
    const occupied = !!a;
    if(!S.view && !occupied){                        // no markers in view mode
      let col = SIZE[s.size].color, dashed = !a;
      if(ghost.has(s.id) && !occupied){ col = gstyle==='good' ? '#63e07a' : '#ff5a5a'; dashed = true; }
      else if(sel){ col = '#f4623a'; } else if(hov){ col = '#ffffff'; }
      const sp = makeSprite(ringTexture(SIZE[s.size].shape, col, dashed));
      sp.position.copy(v3(s.pos)); sp.userData.base = SPR_SIZE[s.size] * (occupied ? 1.7 : 1);
      sp.scale.setScalar(sp.userData.base); V.dyn.add(sp); V.spr[s.id] = sp;
    }

    if(!s.pylon){                                  // arms cannot be picked in 3D (select them from the list)
      const pick = new THREE.Mesh(new THREE.SphereGeometry(SPR_SIZE[s.size]*.6,10,8), new THREE.MeshBasicMaterial({ visible:false }));
      pick.position.copy(v3(s.pos)); pick.userData.sid = s.id; V.dyn.add(pick); V.pickers.push(pick);
    }
  }

  // coloured socket rims on the hull: hidden where an arm is mounted
  V.hull.traverse(o => { if(o.userData.rimOf) o.visible = att[o.userData.rimOf]?.t !== 'pyl'; });

  // integrated modules: fixed on the hull, never interactive
  for(const g of BODY.integrated||[]){
    const mg = buildModule(g.mod.kind, g.mod.size, 'normal'); mg.position.copy(v3(g.pos)); V.dyn.add(mg);
  }

  // tags
  const fill = (el, id) => {
    const s = id && disp.byId[id];
    if(!s){ el.style.display='none'; el.dataset.slot=''; return; }
    const at = att[id], it = at ? ITEM(at.id) : null;
    el.dataset.slot = id;
    el.innerHTML = `<b>${it ? rarDot(it) + it.name.toUpperCase() : 'EMPTY'}</b>`;
    el.style.display = 'block';
  };
  fill($('#tagSel'), S.intSel!=null || noSel() || disp.byId[S.sel]?.pylon ? null : S.sel);   // a selected arm shows only its outline
  // with the socket labels on, hover highlights the small label instead of opening a second big tag
  const labelsOn = !S.view && typeof flag==='function' && flag('socketLabels');
  fill($('#tagHov'), !labelsOn && S.hoverSlot && S.hoverSlot!==S.sel ? S.hoverSlot : null);
  buildLabels(disp, att); buildLinks(disp);
}

/* ---------- "socketLabels" experiment: a small label on every mounted part and free socket ----------
   Same short text as the left list. The selected socket keeps the big tag; the hovered one is highlighted.
   Each frame: labels hidden behind the hull (raycast, every 4th frame) or overlapping a closer
   label / the big tags are hidden, so the view never turns into a wall of text. */
V.labels = [];
function buildLabels(disp, att){
  const box = $('#labels3d'); if(!box) return;
  V.labels = [];
  if(S.view || typeof flag!=='function' || !flag('socketLabels')){ box.innerHTML = ''; return; }
  const skip = new Set([S.sel]);
  let html = '';
  for(const s of disp.list){
    if(s.pylon || skip.has(s.id)) continue;                       // arms: their outputs are labelled instead
    const a = att[s.id], it = a ? ITEM(a.id) : null;
    html += `<div class="lab3d ${it?'':'free'} ${s.id===S.hoverSlot?'hov':''}" data-slot="${s.id}">${sg(s.size,12)}<span>${it ? shortName(it) : 'Empty'}</span></div>`;
  }
  box.innerHTML = html;
  V.labels = [...box.children].map(el => ({ el, id:el.dataset.slot, w:el.offsetWidth, h:el.offsetHeight, occ:false }));
  V.labelTick = 0;
}
function placeLabels(){
  if(!V.labels.length) return;
  const cam = V.camera.position, occTick = (V.labelTick = (V.labelTick+1) % 4) === 0;
  const pts = [];
  for(const L of V.labels){
    const an = V.anchor[L.id]; if(!an){ L.el.style.visibility = 'hidden'; continue; }
    an.getWorldPosition(V.tmp);
    if(occTick){                                                   // hidden behind the hull?
      const dir = V.tmp.clone().sub(cam), dist = dir.length();
      V.raycaster.set(cam, dir.normalize()); V.raycaster.far = dist - .3;
      L.occ = V.raycaster.intersectObject(V.hull, true).length > 0;
      V.raycaster.far = Infinity;
    }
    const p = V.tmp.clone().project(V.camera);
    if(L.occ || p.z > 1){ L.el.style.visibility = 'hidden'; continue; }
    pts.push({ L, x:(p.x*.5+.5)*SHIP_W, y:(-p.y*.5+.5)*SHIP_H - 16, z:p.z });
  }
  // the big tags win, then closer labels first
  const taken = [];
  for(const id of ['#tagSel','#tagHov']){
    const el = $(id); if(el.style.display==='none' || el.style.visibility==='hidden') continue;
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
    taken.push([x-w/2, y-h, x+w/2, y]);
  }
  pts.sort((a,b) => (b.L.id===S.hoverSlot) - (a.L.id===S.hoverSlot) || a.z - b.z);   // hovered first
  for(const q of pts){
    const r = [q.x - q.L.w/2 - 3, q.y - q.L.h - 3, q.x + q.L.w/2 + 3, q.y + 3];
    const hit = taken.some(t => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1]);
    if(hit || r[0] < 0 || r[2] > SHIP_W || r[1] < 0){ q.L.el.style.visibility = 'hidden'; continue; }
    taken.push(r);
    q.L.el.style.visibility = 'visible';
    q.L.el.style.transform = `translate(${Math.round(q.x - q.L.w/2)}px,${Math.round(q.y - q.L.h)}px)`;
  }
}

/* ---------- link lines: every socket of the 3D model joined to its row in the socket list ----------
   An SVG overlay over the whole stage (#links). Built with renderShip (one path + one dot per socket), placed every
   frame: from the right edge of the row, a short horizontal stub, then a straight line to the socket in the 3D view.
   Hidden when the socket is behind the hull (raycast every 4th frame) or its row is scrolled out of the list;
   the selected socket is drawn strong (orange), the hovered one white, the others faint. While the cargo is open
   only the selected one stays (the list is under the cargo panel). */
V.links = [];
function buildLinks(disp){
  const svg = $('#links'); if(!svg) return;
  V.links = [];
  if(S.view || typeof flag!=='function' || !flag('socketLinks')){ svg.innerHTML = ''; return; }
  let html = '';
  for(const s of disp.list) html += `<path data-l="${s.id}"/><circle data-c="${s.id}" r="4.5"/>`;
  svg.innerHTML = html;
  V.links = disp.list.map(s => ({ id:s.id, row:document.querySelector(`#left [data-slot="${s.id}"]`),
    path:svg.querySelector(`[data-l="${s.id}"]`), dot:svg.querySelector(`[data-c="${s.id}"]`), occ:false }));
  V.linkTick = 0;
}
// sci-fi wiring: horizontal out of the row, a 45° chamfer, a vertical run, a 45° chamfer, horizontal into the socket
function linkPath(x0, y0, x1, y1, shift){
  const dy = y1 - y0, sy = dy < 0 ? -1 : 1, ay = Math.abs(dy);
  const xm = x0 + Math.max(28, Math.min(140, (x1 - x0)*.4)) + shift;          // where the vertical run sits
  const c = Math.max(0, Math.min(16, ay/2, x1 - xm));                          // chamfer size
  const f = n => n.toFixed(1);
  if(ay < 1 || c < 1) return `M${f(x0)} ${f(y0)}H${f(x1)}${ay < 1 ? '' : `V${f(y1)}`}`;
  return `M${f(x0)} ${f(y0)}H${f(xm - c)}L${f(xm)} ${f(y0 + sy*c)}V${f(y1 - sy*c)}L${f(xm + c)} ${f(y1)}H${f(x1)}`;
}
function placeLinks(){
  if(!V.links.length) return;
  const sr = $('#stage').getBoundingClientRect(), k = S.scale || 1, box = $('#shipbox');
  const list = $('#left .lp-body')?.getBoundingClientRect();
  const cam = V.camera.position, occTick = (V.linkTick = (V.linkTick+1) % 4) === 0;
  for(const L of V.links){
    const an = V.anchor[L.id], sel = S.sel===L.id && S.intSel==null && !noSel(), hov = S.hoverSlot===L.id;
    if(!sel && !hov){ L.path.setAttribute('class','off'); L.dot.setAttribute('class','off'); continue; }   // only the selected and the hovered socket are linked
    let show = !!an && !!L.row && !!list && (S.focus!=='cargo' || sel);
    let r = null;
    if(show){ r = L.row.getBoundingClientRect(); show = r.height > 0 && r.top >= list.top - 1 && r.bottom <= list.bottom + 1; }
    if(show){
      an.getWorldPosition(V.tmp);
      if(occTick){
        const dir = V.tmp.clone().sub(cam), dist = dir.length();
        V.raycaster.set(cam, dir.normalize()); V.raycaster.far = dist - .3;
        L.occ = V.raycaster.intersectObject(V.hull, true).length > 0;
        V.raycaster.far = Infinity;
      }
      const p = V.tmp.clone().project(V.camera);
      show = (!L.occ || sel || hov) && p.z <= 1;   // the selected / hovered socket is always linked, even on the far side of the hull
      if(show){
        const x1 = box.offsetLeft + (p.x*.5+.5)*SHIP_W, y1 = box.offsetTop + (-p.y*.5+.5)*SHIP_H;
        const x0 = (r.right - sr.left)/k, y0 = (r.top + r.height/2 - sr.top)/k;
        L.path.setAttribute('d', linkPath(x0, y0, x1, y1, hov && !sel ? 16 : 0));
        L.dot.setAttribute('cx', x1.toFixed(1)); L.dot.setAttribute('cy', y1.toFixed(1));
      }
    }
    const cls = show ? (sel ? 'sel' : hov ? 'hov' : '') : 'off';
    L.path.setAttribute('class', cls); L.dot.setAttribute('class', cls);
  }
}

function placeTag(el){
  const id = el.dataset.slot; if(!id || el.style.display==='none') return;
  const an = V.anchor[id]; if(!an){ el.style.visibility='hidden'; return; }
  an.getWorldPosition(V.tmp); V.tmp.project(V.camera);
  if(V.tmp.z>1){ el.style.visibility='hidden'; return; }
  el.style.visibility='visible';
  el.style.left = ((V.tmp.x*.5+.5)*SHIP_W)+'px';
  el.style.top  = ((-V.tmp.y*.5+.5)*SHIP_H - 26)+'px';
}

function animateShip(now){
  requestAnimationFrame(animateShip);
  const t = now/1000, r = S.rot, c = V.cur;
  c.yaw += (r.yaw-c.yaw)*.14; c.pitch += (r.pitch-c.pitch)*.14; c.d += (r.d-c.d)*.14;
  V.panCur.lerp(V.pan, .18);
  const cp = Math.cos(c.pitch), tg = V.look.copy(TARGET).add(V.panCur);
  V.camera.position.set(tg.x + Math.sin(c.yaw)*cp*c.d, tg.y + Math.sin(c.pitch)*c.d, tg.z + Math.cos(c.yaw)*cp*c.d);
  V.camera.lookAt(tg);
  V.shipRoot.position.y = Math.sin(t*.9)*.08;

  const flashT = S.flash ? (performance.now()-S.flashT)/900 : 2;
  const popOf = id => (S.flash===id && flashT<1) ? 1 + (1-flashT)*.5 : 1;
  for(const id in V.spr){
    const sp = V.spr[id];
    sp.scale.setScalar(sp.userData.base * (S.sel===id ? 1 + Math.sin(t*5)*.1 : 1) * popOf(id));
  }
  for(const id in V.modG) V.modG[id].scale.setScalar(MOD_SCALE[V.disp.byId[id].size] * popOf(id));
  V.flames.forEach((f,i) => f.scale.set(1,.75+.25*Math.sin(t*38+i),1));
  placeTag($('#tagSel')); placeTag($('#tagHov')); placeLabels(); placeLinks();
  V.renderer.render(V.scene, V.camera);
}

/* ---------- picking ---------- */
function pickSlot(e){
  if(!V.ready) return null;
  const rect = V.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  V.raycaster.setFromCamera(ndc, V.camera);
  const hits = V.raycaster.intersectObjects(V.pickers, false);
  return hits.length ? hits[0].object.userData.sid : null;
}
