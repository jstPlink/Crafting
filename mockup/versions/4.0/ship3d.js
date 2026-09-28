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
const MOD_COL = 0x8f98a3;                     // one metal for every module: the type is told by the shape
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
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,28), new THREE.MeshBasicMaterial({ color:SIZE[s.size].color }));
    rim.position.copy(v3(s.pos)).addScaledVector(dir,.07); rim.quaternion.copy(plate.quaternion); g.add(rim);
  }
  return g;
}

/* ---------- modules ---------- */
function buildModule(kind, size, style){
  const g = new THREE.Group();
  const tint = style==='good' ? 0x2f9e4d : style==='bad' ? 0xc23a3a : style==='rem' ? 0x5a3030 : MOD_COL;
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
  const camera = V.camera = new THREE.PerspectiveCamera(36, SHIP_W/SHIP_H, .1, 100);

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
  V.camera.aspect = SHIP_W/SHIP_H; V.camera.updateProjectionMatrix();
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
  BODIES[id] = { id, name:label, tag:'CUSTOM', value:1500, integrity:20000, shield:10000, generator:26, heatsink:40, boost:100,
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

    const sel = S.sel===s.id, hov = S.hoverSlot===s.id;
    const oCol = !S.view && (sel ? OUTLINE.sel : hov ? OUTLINE.hov : null);
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

    const pick = new THREE.Mesh(new THREE.SphereGeometry(SPR_SIZE[s.size]*.6,10,8), new THREE.MeshBasicMaterial({ visible:false }));
    pick.position.copy(v3(s.pos)); pick.userData.sid = s.id; V.dyn.add(pick); V.pickers.push(pick);
  }

  // tags
  const fill = (el, id) => {
    const s = id && disp.byId[id];
    if(!s){ el.style.display='none'; el.dataset.slot=''; return; }
    const at = att[id], it = at ? ITEM(at.id) : null;
    el.dataset.slot = id;
    el.innerHTML = `<small>${SIZE[s.size].label} SOCKET</small><b>${it ? rarDot(it) + it.name.toUpperCase() : 'EMPTY'}</b>`;
    el.style.display = 'block';
  };
  fill($('#tagSel'), S.sel);
  fill($('#tagHov'), S.hoverSlot && S.hoverSlot!==S.sel ? S.hoverSlot : null);
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
  placeTag($('#tagSel')); placeTag($('#tagHov'));
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
