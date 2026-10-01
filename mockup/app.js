/* =====================================================================
   CRAFTING MOCKUP — Body / Arms / modules

   UI wording: the hull is the BODY (plural Bodies), the pylons are ARMS.
   (in code arms are still called "pylon" / 'pyl')

   A BODY exposes sockets of three sizes:
     P1  red triangle    (smallest)
     P2  green square
     P3  blue circle     (largest)

   What a socket of size N accepts (same size only):
     - a MODULE of size N
     - an ARM of input size N
         Extension  N > N            one output socket, same size (Body sockets only)
         Split      N > 2 x (N-1)    two smaller output sockets  (N >= 2)
   Arm outputs are sockets too, so arms can be chained.

   Module types: Primary weapons (Gatling, Laser), Secondary weapons
   (Rocket Launcher, S. Matter Shooter), Engines, Body.
   ===================================================================== */

const SIZE = {
  1: { n:1, label:'P1', name:'Small',  color:'#e5484d', shape:'tri'  },
  2: { n:2, label:'P2', name:'Medium', color:'#4fd06a', shape:'sq'   },
  3: { n:3, label:'P3', name:'Large',  color:'#3aa0ff', shape:'circ' },
};
const SIZE_ORDER = [1,2,3];   // small sockets first, large at the bottom

// app version: bumped on every commit (the CI build number is shown next to it)
const APP_VERSION = '7.0';

const KIND = {
  primary:   { cls:'pri', label:'Primary Weapons',   short:'Primary' },
  secondary: { cls:'sec', label:'Secondary Weapons', short:'Secondary' },
  engine:    { cls:'eng', label:'Engines',           short:'Engines' },
};
const TAB_ORDER = ['pylon','primary','secondary','engine'];
const TAB_LABEL = { pylon:'Arms', primary:'Primary', secondary:'Secondary', engine:'Engines' };
const TAB_CLS   = { pylon:'pyl', primary:'pri', secondary:'sec', engine:'eng' };

// module rarity: lv 1..7, each with its colour
// default rarity colours LV1..LV7. The next line is rewritten by scripts/devserver.py when you press
// "SAVE AS DEFAULT" in the RARITY menu: keep it on ONE line, keep the marker.
const RARITY_DEFAULT = ['#7d8792','#4fb46a','#3c9fe0','#8b6cf0','#e65ec4','#ff8a3d','#ffd23f'];   // @rarity-defaults
// colour presets (name -> 7 colours). Also rewritten by "SAVE AS DEFAULT": one line, keep the marker.
const RARITY_PRESETS = {"Classic":["#9a6a3c","#a3a9b0","#4fcf5f","#4cc4ff","#ff8c1a","#ff3fc8","#ffcf3a"],"Spectrum":["#7d8792","#4fb46a","#3c9fe0","#8b6cf0","#e65ec4","#ff8a3d","#ffd23f"]};   // @rarity-presets
const RARITY_PRESETS_KEY = 'crafting.rarity.presets';   // per-browser presets, merged over the ones above
const RARITY_KEY = 'crafting.rarity';   // per-browser working copy (edited in the RARITY menu)
const RARITY = {};
(function(){
  let own = null;
  try{ own = JSON.parse(localStorage.getItem(RARITY_KEY)); }catch(e){}
  for(let i = 1; i <= 7; i++){
    const c = Array.isArray(own) && /^#[0-9a-f]{6}$/i.test(own[i-1]) ? own[i-1] : RARITY_DEFAULT[i-1];
    RARITY[i] = { label:'LV'+i, color:c };
  }
})();
const rarCol = it => RARITY[it?.lv]?.color || '';
// rarity is shown by colour only: row tint, icon stripe, or this small swatch
const rarSquare = it => it?.lv ? `<span class="rdot" style="--rc:${rarCol(it)}"></span>` : '';
// "rarityTag" experiment: a filled tag in the rarity colour with the level ("LV5"): the level is
// readable without relying on colour (earlier tries: 1-7 pips looked like a charge, a gem was colour-only)
const rarTag = it => it?.lv ? `<span class="rtag" style="--rc:${rarCol(it)}" title="Rarity ${it.lv} / 7">LV${it.lv}</span>` : '';
const rarDot = it => flag('rarityTag') ? rarTag(it) : rarSquare(it);
// icon block + LV tag for a mounted module, same look as a socket-list row (leftRow) — also used in the details card
// header. Relies on the ancestor (.slot / .ch) setting --rc: .vtag is a sibling of .ic, not a descendant, so it needs
// the colour to come from further up to reach both of them
function modIcTag(it, extra=''){
  if(!it) return '';
  return `<div class="ic">${ico(it.fam)}${flag('rarityTag') && !FLAGS.vertTag.on ? rarTag(it) : ''}${extra}</div>${flag('rarityTag') && FLAGS.vertTag.on ? `<span class="vtag">LV${it.lv}</span>` : ''}`;
}

// WEAPON params:  ammo type, power consumption, heat generation (primary only),
//                 ammo magazine size (secondary only: primaries have infinite ammo),
//                 dps, damage, fire rate (shots/s), accuracy (%)
// ENGINE params:  power consumption, base speed increment, boost charge consumption
// lv = rarity. `fam` = weapon family
const FAMILY = {
  gatling: { label:'Gatling',           ammo:'Kinetic' },
  laser:   { label:'Laser',             ammo:'Energy' },
  rocket:  { label:'Rocket Launcher',   ammo:'Explosive' },
  smatter: { label:'S. Matter Shooter', ammo:'Sonic Matter' },
  engine:  { label:'Engine' },
};
// value (credits) grows with socket size and rarity
const RAR_MULT = [1, 1.5, 2.2, 3.2, 4.6, 6.5, 9];
const worth = (size, lv) => Math.round(size*140*RAR_MULT[lv-1]/10)*10;
const W = (id,name,kind,fam,size,lv,o) => ({ id, name, kind, fam, size, lv, ammo:FAMILY[fam].ammo, ...o, dps:Math.round(o.dmg*o.rate), value:worth(size,lv) });
const E = (id,name,size,lv,o) => ({ id, name, kind:'engine', fam:'engine', size, lv, ...o, value:worth(size,lv) });
const MODS = Object.fromEntries([
  // ---- primary weapons (infinite ammo, generate heat)
  W('gatBuzz',   'Buzz Gatling',      'primary','gatling',1,1,{ power:1, heat:4,  dmg:6,   rate:8,   acc:62 }),
  W('gatHornet', 'Hornet Gatling',    'primary','gatling',1,3,{ power:1, heat:5,  dmg:8,   rate:9,   acc:66 }),
  W('gatWarden', 'Warden Gatling',    'primary','gatling',2,2,{ power:2, heat:8,  dmg:11,  rate:9,   acc:64 }),
  W('gatReaper', 'Reaper Gatling',    'primary','gatling',2,5,{ power:3, heat:10, dmg:14,  rate:11,  acc:70 }),
  W('gatTitan',  'Titan Gatling',     'primary','gatling',3,4,{ power:5, heat:15, dmg:22,  rate:10,  acc:65 }),
  W('gatMael',   'Maelstrom Gatling', 'primary','gatling',3,7,{ power:6, heat:18, dmg:28,  rate:12,  acc:72 }),
  W('lasSpark',  'Spark Laser',       'primary','laser',  1,2,{ power:2, heat:6,  dmg:30,  rate:2,   acc:90 }),
  W('lasLance',  'Lance Laser',       'primary','laser',  2,3,{ power:3, heat:12, dmg:55,  rate:2,   acc:92 }),
  W('lasPrism',  'Prism Laser',       'primary','laser',  2,6,{ power:4, heat:14, dmg:80,  rate:2.2, acc:95 }),
  W('lasSun',    'Sunspear Laser',    'primary','laser',  3,5,{ power:6, heat:22, dmg:140, rate:1.8, acc:94 }),
  // ---- secondary weapons (magazine, no heat)
  W('rktDart',   'Dart Rocket Launcher',  'secondary','rocket', 1,1,{ power:2, mag:8,  dmg:60,  rate:1,   acc:75 }),
  W('rktHydra',  'Hydra Rocket Launcher', 'secondary','rocket', 2,4,{ power:3, mag:12, dmg:90,  rate:1.4, acc:78 }),
  W('rktSiege',  'Siege Rocket Launcher', 'secondary','rocket', 3,6,{ power:5, mag:16, dmg:180, rate:1.2, acc:80 }),
  W('smtMote',   'Mote S. Matter Shooter','secondary','smatter',1,2,{ power:2, mag:4,  dmg:120, rate:.5,  acc:85 }),
  W('smtWisp',   'Wisp S. Matter Shooter','secondary','smatter',2,3,{ power:4, mag:6,  dmg:200, rate:.6,  acc:88 }),
  W('smtVoid',   'Void S. Matter Shooter','secondary','smatter',3,7,{ power:7, mag:8,  dmg:420, rate:.6,  acc:90 }),
  // ---- engines
  E('engTrickle', 'Trickle Engine',  1,1,{ power:1, speed:14,  boostUse:6 }),
  E('engDash',    'Dash Engine',     1,3,{ power:1, speed:24,  boostUse:9 }),    // faster, thirstier boost
  E('engGlide',   'Glide Engine',    1,5,{ power:2, speed:34,  boostUse:3 }),    // fastest P1, frugal boost, more power
  E('engSpeeder', 'Speeder Engine',  2,2,{ power:1, speed:40,  boostUse:10 }),
  E('engIon',     'Ion Engine',      2,4,{ power:2, speed:62,  boostUse:9 }),
  E('engSurge',   'Surge Engine',    2,5,{ power:2, speed:55,  boostUse:5 }),
  E('engBehemoth','Behemoth Engine', 3,3,{ power:3, speed:95,  boostUse:16 }),
  E('engNova',    'Nova Engine',     3,6,{ power:4, speed:130, boostUse:12 }),
].map(m => [m.id, m]));
// ARMS (code: pylons): `size` is the input socket size. Arms are unlimited: no cargo quantity
const PYLONS = {
  ext1:   { id:'ext1',   name:'Extension Arm P1',    type:'ext',   size:1 },
  ext2:   { id:'ext2',   name:'Extension Arm P2',    type:'ext',   size:2 },
  ext3:   { id:'ext3',   name:'Extension Arm P3',    type:'ext',   size:3 },
  split2: { id:'split2', name:'Split Arm P2', type:'split', size:2 },
  split3: { id:'split3', name:'Split Arm P3', type:'split', size:3 },
};
const ITEMS = { ...PYLONS, ...MODS };
const ITEM_ORDER = Object.keys(ITEMS);
const isPylon = id => !!PYLONS[id];
const outputsOf = P => P.type==='ext' ? [P.size] : [P.size-1, P.size-1];

// BODIES. Params: integrity, shield power, generator power, heatsink (heatCap = max heat it holds,
// heatCool = heat it sheds per second when not firing), boost charge, sockets.
// Each one defines its sockets (position + outward direction, model space),
// its power budget, its base stats and a 3D look.
// Rules: no sockets on the rear of the hull; sockets keep clear of each other in front view.
// A .glb dropped on the scene becomes a new body built from its sock_p<size>_<n> nodes.
const BODIES = {
  zephyros: {
    id:'zephyros', name:'ZEPHYROS', value:1900, tag:'MIXED', integrity:22000, shield:14000, generator:26, heatCap:400, heatCool:60, boost:100,
    cam:13.6, plat:1,
    look:{ r:[1.5,1.1,2.9], color:0xb98a3e },
    sockets:[
      { id:'b0', size:3, pos:[-1.5,-0.35, 0.6], dir:[-1,-.12, .1] },
      { id:'b1', size:3, pos:[ 1.5,-0.35, 0.6], dir:[ 1,-.12, .1] },
      { id:'b2', size:2, pos:[-1.05, 0.85, 0.1], dir:[-.55, 1, .1] },
      { id:'b3', size:2, pos:[ 1.05, 0.85, 0.1], dir:[ .55, 1, .1] },
      { id:'b4', size:2, pos:[ 0.0, 1.15, 0.2], dir:[0, 1, .1] },
      { id:'b7', size:1, pos:[ 0.0,-1.25, 0.4], dir:[0,-1, .2] },
    ],
  },
  // light scout: four small sockets only
  needle: {
    id:'needle', name:'NEEDLE', value:800, tag:'LIGHT', integrity:9000, shield:6000, generator:12, heatCap:220, heatCool:45, boost:140,
    cam:8.6, plat:.8,
    look:{ r:[.8,.6,2.6], color:0x8fa6b8 },
    sockets:[
      { id:'b0', size:1, pos:[-0.85, 0.0, 0.5], dir:[-1, 0, .15] },
      { id:'b1', size:1, pos:[ 0.85, 0.0, 0.5], dir:[ 1, 0, .15] },
      { id:'b2', size:1, pos:[ 0.0, 0.65, 0.8], dir:[0, 1, .1] },
      { id:'b3', size:1, pos:[ 0.0,-0.65, 0.8], dir:[0,-1, .1] },
    ],
  },
  // heavy hauler: six large sockets
  colossus: {
    id:'colossus', name:'COLOSSUS', value:4200, tag:'HEAVY', integrity:42000, shield:30000, generator:40, heatCap:700, heatCool:80, boost:70,
    cam:16.5, plat:1.3,
    look:{ r:[2.3,1.7,3.6], color:0x8a4a3a },
    sockets:[
      { id:'b0', size:3, pos:[-2.35, 0.0, 0.4], dir:[-1, 0, .1] },
      { id:'b1', size:3, pos:[ 2.35, 0.0, 0.4], dir:[ 1, 0, .1] },
      { id:'b2', size:3, pos:[-1.4, 1.3, 0.3], dir:[-.6, 1, .1] },
      { id:'b3', size:3, pos:[ 1.4, 1.3, 0.3], dir:[ .6, 1, .1] },
      { id:'b4', size:3, pos:[-1.4,-1.3, 0.3], dir:[-.6,-1, .1] },
      { id:'b5', size:3, pos:[ 1.4,-1.3, 0.3], dir:[ .6,-1, .1] },
    ],
  },
  // mixed gunship: one big dorsal socket, two medium flanks, two small at the nose
  kestrel: {
    id:'kestrel', name:'KESTREL', value:1500, tag:'MIXED', integrity:15000, shield:12000, generator:20, heatCap:320, heatCool:55, boost:110,
    cam:13.8, plat:.95,
    look:{ r:[1.3,.9,2.6], color:0x6c8a62 },
    sockets:[
      { id:'b0', size:3, pos:[ 0.0, 0.95, 0.3], dir:[0, 1, .1] },
      { id:'b1', size:2, pos:[-1.3,-0.1, 0.5], dir:[-1, 0, .1] },
      { id:'b2', size:2, pos:[ 1.3,-0.1, 0.5], dir:[ 1, 0, .1] },
      { id:'b3', size:1, pos:[-0.4,-0.5, 2.0], dir:[-.3,-.2, 1] },
      { id:'b4', size:1, pos:[ 0.4,-0.5, 2.0], dir:[ .3,-.2, 1] },
    ],
  },
};
/* ---------- integrated modules: every Body has 2 integrated primary weapons + 1 integrated engine ----------
   They are part of the Body: they cannot be changed, are never in cargo, draw no power and are not counted in
   the loadout quality; their value is included in the Body base value. They give the base damage, heat, speed
   and boost use of the ship.
   Each hull comes in 3 variants that differ in weapons AND rarity of the integrated parts (stats follow the level,
   so a rare variant of a weak hull can beat the poor variant of the next hull — a "second life" for weak hulls):
     RUSTED  level = tier      2 gatlings
     RANGER  level = tier + 1  laser + gatling   (keeps the plain hull id, so older saves land here)
     ELITE   level = tier + 3  2 lasers                                                             */
const BODY_TIER = { needle:1, kestrel:2, zephyros:3, colossus:4 };
// where the integrated parts sit on each hull (weapons at the nose, engine at the back)
const INTEG_POS = {
  zephyros: { w:[[-0.4,-0.55,2.3],[0.4,-0.55,2.3]], e:[0,0.1,-3.0], size:2 },
  needle:   { w:[[-0.32,-0.25,2.2],[0.32,-0.25,2.2]], e:[0,0.05,-2.65], size:1 },
  colossus: { w:[[-0.8,-0.6,3.25],[0.8,-0.6,3.25]], e:[0,0.15,-3.7], size:3 },
  kestrel:  { w:[[-0.75,0.3,1.75],[0.75,0.3,1.75]], e:[0,0.1,-2.7], size:2 },
};
// integrated weapon / engine stats by level L (1..7)
const INTEG_GUN = {
  laser:   L => ({ name:`Keel Laser Mk${L}`,   o:{ power:0, heat:2+2*L, dmg:16+11*L, rate:1.8,        acc:Math.min(98, 84+2*L) } }),
  gatling: L => ({ name:`Keel Gatling Mk${L}`, o:{ power:0, heat:1+2*L, dmg:3+2*L,   rate:7+L*.5,     acc:58+2*L } }),
};
const INTEG_VARIANTS = [
  { name:'RUSTED', suffix:'_rs', dLv:0, guns:['gatling','gatling'] },
  { name:'RANGER', suffix:'',    dLv:1, guns:['laser','gatling'] },
  { name:'ELITE',  suffix:'_el', dLv:3, guns:['laser','laser'] },
];
for(const base of Object.keys(BODY_TIER)){
  const b = BODIES[base], t = BODY_TIER[base], P = INTEG_POS[base];
  for(const v of INTEG_VARIANTS){
    const id = base + v.suffix, L = Math.min(7, t + v.dLv);
    const guns = v.guns.map((fam,i) => { const g = INTEG_GUN[fam](L); return W(`${id}_g${i}`, g.name, 'primary', fam, P.size, L, g.o); });
    const engine = E(`${id}_core`, `Core Drive Mk${L}`, P.size, L, { power:0, speed:16+11*L, boostUse:Math.round(3+.6*L) });
    const integrated = [{ key:'w1', mod:guns[0], pos:P.w[0] }, { key:'w2', mod:guns[1], pos:P.w[1] }, { key:'eng', mod:engine, pos:P.e }];
    BODIES[id] = { ...b, id, name:`${b.name} ${v.name}`, hull:b.name, variant:v.name, integLv:L, integrated,
                   value: b.value + integrated.reduce((a,g) => a + g.mod.value, 0) };   // integrated worth is in the base value
  }
}
const BODY_LIST = Object.keys(BODY_TIER).flatMap(base => INTEG_VARIANTS.map(v => base + v.suffix));   // re-ordered by quality in boot()
const BODIES_IN_GAME = 20;                                           // main bodies that exist in the game
// placeholder LOCKED ships (8, so that 12 + 8 = BODIES_IN_GAME): clones of existing hulls under other names. They can be browsed
// but not built on; boot() interleaves them with the unlocked ones to try the experience of scrolling a mixed list.
const UNKNOWN_NAMES = ['VANTAGE','OBSIDIAN','HALCYON','TEMPEST','BASTION','WRAITH','SOVEREIGN','LEVIATHAN'];
const UNKNOWN_LIST = UNKNOWN_NAMES.map((name,i) => {
  const base = BODIES[Object.keys(BODY_TIER)[i%4] + '_el'], id = 'unknown' + (i+1);
  BODIES[id] = { ...base, id, name, hull:base.hull, variant:'UNKNOWN', unknown:true };
  return id;
});
const unlockedBodies = () => BODY_LIST.filter(id => !BODIES[id].unknown && BODIES[id].tag!=='CUSTOM').length;
// building is refused on a locked ship
// a locked ship does not give its name away
const shipName = b => b.unknown ? '?????' : b.name;
const unknownShip = () => { if(BODY.unknown){ toast('UNKNOWN SHIP · NOTHING TO BUILD ON','bad'); return true; } return false; };
let BODY = BODIES.zephyros;
const M = id => ({ t:'mod', id }), P = id => ({ t:'pyl', id });

// CARGO: fixed number of slots; identical modules stack up to STACK per slot
const CARGO_SLOTS = 25, STACK = 14;
const cargoSlots = C => Object.keys(MODS).reduce((a,id) => a + Math.ceil((C[id]||0)/STACK), 0);

// starting build of each Body (target of "Reset build"); Bodies not listed start empty
const DEFAULT_ATT = {
  zephyros: {
    b0:P('split3'), 'b0.0':M('gatWarden'), 'b0.1':M('gatWarden'),
    b1:P('ext3'),
    b2:M('engSpeeder'), b3:M('engSpeeder'),
    b4:P('split2'), 'b4.0':M('lasSpark'),
  },
};

const S = {
  // socket id -> attachment. child sockets are '<parent>.<i>'
  att: { ...DEFAULT_ATT.zephyros },
  hist: {},              // "undoRedo" experiment: per Body { u:[{att,label}], r:[...] } — session only, not saved
  intro: false,          // "intro" experiment: first-time guide open
  builds: {},            // saved loadout of every body that is not the active one
  // modules only (arms are unlimited). A full stack of every module, counting the ones mounted above
  cargo: Object.fromEntries(Object.keys(MODS).map(id => [id, STACK - ({ gatWarden:2, engSpeeder:2, lasSpark:1 }[id]||0)])),
  sel: 'b0',
  tab: 'primary',
  focus: 'slots',        // 'slots' | 'cargo' | 'body'
  picker: false, pickIdx: 0,
  cargoIdx: 0,
  listMode: 'tree',      // left list view: 'tree' | 'fill' | 'type' | 'rarity' | 'power' (experiment listModes)
  sort: 'stat',          // cargo ordering: 'stat' | 'rarity' | 'power' (experiment keyStats)
  hoverCargo: null, hoverSlot: null, hoverRemove: null,
  inputPref: 'gamepad',  // 'gamepad' | 'keyboard' | 'auto'
  device: 'gamepad',
  flash: null, flashT: 0,
  scale: 1,
  rot: { yaw:.75, pitch:.34, d:13.2 },
};
const homeRot = () => ({ yaw:.75, pitch:.34, d:BODY.cam });   // camera close to the ship

/* ---------- experiments: features switchable from the version menu (switcher.js) ----------
   Each flag guards ONE UX change, so it can be compared with the old behaviour.
   State is kept per version in localStorage. */
// promoted to standard behaviour: no longer switchable, always on
const ALWAYS_ON = { bigText:true, overview:true, slideCargo:true, bodyButton:true };
// switches phrased as "Hide …": the underlying feature is the opposite of the switch
const HIDDEN_BY = { undoRedo:'hideUndo', shipQuality:'hideQuality', typeShape:'hideTypeShape', socketLabels:'hideSocketLabels' };
// `since` = version that added the feature (shown next to it in the features window of the version menu)
const FLAGS = {
  keyStats:     { since:'4.3', label:'Key stat on rows', desc:'DPS / speed on every part, delta vs mounted, BEST tag, cargo sorting', on:true },
  typeShape:    { since:'5.0', label:'Type by row shape', desc:'No type colour on icons: the left end of a module row is pointed (primary), round (secondary) or notched (engine)', on:true },
  rarityTag:    { since:'5.0', label:'Rarity tag',       desc:'Rarity as a coloured LV1-LV7 tag before the name; neutral rows, tint kept for selection', on:true },
  rarityFade:   { since:'5.0', label:'Rarity fade',      desc:'Rarity colour fading from under the name to the right, leaving the stats readable', on:true },
  blockedReason:{ since:'5.0', label:'Why it won\'t fit', desc:'NO POWER (+n over) / CARGO FULL always shown on rows that cannot be mounted', on:true },
  hideUndo:     { since:'5.0', label:'Hide undo / redo', desc:'Hides undo / redo (L3 / R3, Ctrl+Z / Ctrl+Y) and Reset build on the Body row (X). Turn off to use them', on:true },
  intro:        { since:'5.0', label:'First-time guide', desc:'Short how-it-works screen on first open; reopen from GUIDE in the bottom bar (short press Start, or H)', on:true },
  socketLinks:  { since:'6.0', label:'Socket link lines', desc:'Every socket of the 3D model is joined by a line to its row in the socket list (selected: orange, hovered: white)', on:true },
  socketLabels: { since:'5.0', label:'3D socket labels', desc:'Every mounted part and free socket is labelled in the 3D view, linked to the list on hover / click', on:true },
  compactCard:  { since:'5.0', label:'Compact info card', desc:'Narrower info card anchored at the bottom, stats in two columns with short labels', on:true },
  stackBadge:   { since:'5.0', label:'Stack count on icon', desc:'Cargo quantity shown as a small count on the icon corner, not among the stats', on:true },
  maxRatings:   { since:'5.0', label:'Rated vs max',     desc:'Primary / secondary DPS, ship value and max speed coloured by how close they are to the best build in the game', on:true },
  hideQuality:  { since:'5.0', label:'Hide loadout quality', desc:'Hides the LOADOUT QUALITY block (average LV + one rarity tile per mounted module). Turn off to show it', on:true },
  hideTypeShape:{ since:'7.0', label:'Hide type-by-shape', desc:'Keeps every row icon a plain square, regardless of module type. Turn off to bring back the pointed / round / notched shapes', on:true },
  hideSocketLabels:{ since:'7.0', label:'Hide 3D socket labels', desc:'No per-part tags floating in the 3D view. Turn off to bring them back', on:true },
  vertTag:      { since:'6.0', label:'Vertical LV tag', desc:'Socket list rows: the LV tag is a narrow vertical strip to the right of the module icon, instead of under the icon', on:true },
  listModes:    { since:'5.0', label:'Socket list views', desc:'Left list as tree, filled / empty, by type, by rarity or by power (tabs, or X tap like the cargo); hold X to unequip', on:true },
};
// saves and switches are stored under the version key; 5.0 was published as 0.5.0 and keeps that key
const STORE_VER = { '5.0':'0.5.0' }[APP_VERSION] || APP_VERSION;
const FLAGS_KEY = 'crafting.flags.' + STORE_VER;
const flag = id => ALWAYS_ON[id] || (HIDDEN_BY[id] ? !FLAGS[HIDDEN_BY[id]].on : FLAGS[id].on);
function loadFlags(){
  try{ const d = JSON.parse(localStorage.getItem(FLAGS_KEY)); for(const id in FLAGS) if(typeof d?.[id]==='boolean') FLAGS[id].on = d[id]; }catch(e){}
}
function applyFlags(){
  $('#stage').classList.toggle('ux-big', flag('bigText'));
  $('#stage').classList.toggle('ux-ov', flag('overview'));
  $('#stage').classList.toggle('ux-rar', flag('rarityTag'));
  $('#stage').classList.toggle('ux-card', flag('compactCard'));
  $('#stage').classList.toggle('ux-tshape', flag('typeShape'));
  $('#stage').classList.toggle('ux-slide', flag('slideCargo'));
  $('#stage').classList.toggle('ux-rfade', flag('rarityFade'));
  $('#stage').classList.toggle('ux-vtag', FLAGS.vertTag.on);
  window.resizeShip?.();                                  // layout flags change the 3D view size
  $('#stage').classList.toggle('ux-block', flag('blockedReason'));
}
// DIFF menu (switcher.js): live editing of the diff colours and thresholds, per-browser copy, "save as default" into this file
window.craftingDiff = {
  get: () => ({ ...DIFF }),
  defaults: () => ({ ...DIFF_DEFAULT }),
  set(k, v){
    DIFF[k] = v;
    try{ localStorage.setItem(DIFF_KEY, JSON.stringify(DIFF)); }catch(e){}
    renderAll();
  },
  reset(){
    Object.assign(DIFF, DIFF_DEFAULT);
    try{ localStorage.removeItem(DIFF_KEY); }catch(e){}
    renderAll();
  },
  async saveDefault(){
    const r = await fetch('save-diff', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(DIFF) });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    Object.assign(DIFF_DEFAULT, DIFF);
    try{ localStorage.removeItem(DIFF_KEY); }catch(e){}
  },
};
// RARITY menu (switcher.js): live colour editing, per-browser copy, and "save as default" into this file (dev server only)
window.craftingRarity = {
  colors: () => [1,2,3,4,5,6,7].map(i => RARITY[i].color),
  defaults: () => RARITY_DEFAULT.slice(),
  presets(){
    const all = { ...RARITY_PRESETS, ...this._own() };
    for(const k of Object.keys(all)) if(all[k] === null) delete all[k];   // null = deleted in this browser
    return all;
  },
  _store(own){ try{ localStorage.setItem(RARITY_PRESETS_KEY, JSON.stringify(own)); }catch(e){} },
  _own(){ try{ return JSON.parse(localStorage.getItem(RARITY_PRESETS_KEY)) || {}; }catch(e){ return {}; } },
  savePreset(name){ const o = this._own(); o[name] = this.colors(); this._store(o); },
  deletePreset(name){ const o = this._own(); o[name] = null; this._store(o); },
  applyPreset(name){ const c = this.presets()[name]; if(c) c.forEach((x, k) => this.set(k+1, x, true)); renderAll(); },
  set(i, c, quiet){
    RARITY[i].color = c;
    try{ localStorage.setItem(RARITY_KEY, JSON.stringify(this.colors())); }catch(e){}
    if(!quiet) renderAll();
  },
  reset(){
    RARITY_DEFAULT.forEach((c, k) => { RARITY[k+1].color = c; });
    try{ localStorage.removeItem(RARITY_KEY); }catch(e){}
    renderAll();
  },
  async saveDefault(){
    const presets = this.presets();
    const r = await fetch('save-rarity', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ colors:this.colors(), presets }) });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    this.colors().forEach((c, k) => { RARITY_DEFAULT[k] = c; });
    for(const k of Object.keys(RARITY_PRESETS)) delete RARITY_PRESETS[k];
    Object.assign(RARITY_PRESETS, presets);
    try{ localStorage.removeItem(RARITY_KEY); localStorage.removeItem(RARITY_PRESETS_KEY); }catch(e){}
  },
};

window.craftingExperiments = {
  items: () => Object.entries(FLAGS).map(([id,f]) => ({ id, label:f.label, desc:f.desc, on:f.on, since:f.since })),
  toggle(id){
    const f = FLAGS[id]; if(!f) return;
    f.on = !f.on;
    try{ localStorage.setItem(FLAGS_KEY, JSON.stringify(Object.fromEntries(Object.entries(FLAGS).map(([k,v]) => [k,v.on])))); }catch(e){}
    applyFlags();
    S.hoverCargo = S.hoverRemove = null;
    renderAll();
  },
};

/* =====================================================================
   HELPERS
   ===================================================================== */
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('en-US');
const sgn = n => (n>0?'+':n<0?'−':'') + fmt(Math.abs(n));
const mv = (m,k) => (m && m[k]) || 0;
const dev = () => S.inputPref==='auto' ? S.device : S.inputPref;
// with mouse and keyboard nothing is selected (only hover shows); with a gamepad one block is always in focus.
// S.lastInput = the device that really produced the last input ('pad' | 'kbm'), whatever the glyph preference says
const noSel = () => S.lastInput!=='pad';
function setLastInput(v){ if(S.lastInput!==v){ S.lastInput = v; renderAll(); } }
const ITEM = id => ITEMS[id];

const I = {
  kin:   '<path d="M2 3h12L8 14z"/>',
  exp:   '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  nrg:   '<path d="M9.5 1L3 9h4l-1 6 7-8.5H9z"/>',
  eng:   '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2" /><path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.4"/>',
  hull:  '<path d="M8 1l6 3.5v7L8 15l-6-3.5v-7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 6l3 2 3-2M8 8v4" stroke="currentColor" stroke-width="1.2" fill="none"/>',
  shield:'<path d="M8 1l6 2v5c0 3-3 5-6 7-3-2-6-4-6-7V3z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  value: '<path d="M8 1l7 7-7 7-7-7z"/>',
  power: '<rect x="4" y="4" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 1v3M10 1v3M6 12v3M10 12v3M1 6h3M1 10h3M12 6h3M12 10h3" stroke="currentColor" stroke-width="1.3"/>',
  primary:   '<path d="M8 1l3 4v9H5V5z" fill="currentColor"/><path d="M3 15h10" stroke="currentColor" stroke-width="1.5"/>',
  secondary: '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><path d="M8 1v2.6M8 12.4V15M1 8h2.6M12.4 8H15M3 3l1.8 1.8M11.2 11.2L13 13M13 3l-1.8 1.8M4.8 11.2L3 13" stroke="currentColor" stroke-width="1.6"/>',
  engine:    '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/><path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" stroke-width="1.4"/>',
  pylon:     '<path d="M8 15V7M8 7L3 2M8 7l5-5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="7" r="1.8" fill="currentColor"/>',
  sockets:   '<path d="M8 2l5 9H3zM2 14h5M9 14h5" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  x:     '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.4" fill="none"/>',
  lock:  '<rect x="3" y="7" width="10" height="8" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  swap:  '<path d="M2 5.5h11M10 2.5l3 3-3 3M14 10.5H3M6 7.5l-3 3 3 3" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  // module families
  gatling: '<rect x="1" y="4.5" width="4.5" height="7" rx="1"/><path d="M5.5 5.5h9M5.5 8h9M5.5 10.5h9" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 4.5v7" stroke="currentColor" stroke-width="1.2"/>',
  laser:   '<path d="M1 5h5l2.5 3L6 11H1z"/><path d="M8.5 8H15" stroke="currentColor" stroke-width="2.2"/><path d="M11 5l1.2 1.4M11 11l1.2-1.4M14 4.5l-.8 1.5M14 11.5l-.8-1.5" stroke="currentColor" stroke-width="1.1"/>',
  rocket:  '<path d="M14.5 1.5c-4.2.2-7 2.3-8.8 6.2l2.6 2.6c3.9-1.8 6-4.6 6.2-8.8z"/><path d="M5.7 7.7L2.2 8.5l1.6-2.8 3.3-.8zM8.3 10.3l-.8 3.5 2.8-1.6.8-3.3z"/><path d="M4.6 11.4L1.5 14.5" stroke="currentColor" stroke-width="1.6"/><circle cx="10.6" cy="5.4" r="1.2" fill="#000" fill-opacity=".45"/>',
  smatter: '<circle cx="8" cy="8" r="2.6"/><circle cx="8.00" cy="2.40" r="1.25"/><circle cx="12.38" cy="4.51" r="1.25"/><circle cx="13.46" cy="9.25" r="1.25"/><circle cx="10.43" cy="13.05" r="1.25"/><circle cx="5.57" cy="13.05" r="1.25"/><circle cx="2.54" cy="9.25" r="1.25"/><circle cx="3.62" cy="4.51" r="1.25"/>',
  engine:  '<rect x="5.5" y="1" width="5" height="3"/><path d="M6.2 4.5h3.6l2.8 5H3.4z"/><path d="M4.5 10.5h7L8 15.5z" fill-opacity=".7"/><path d="M6.5 10.5h3L8 13.5z" fill="#fff" fill-opacity=".6"/>',
  heat:  '<path d="M8 1c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/>',
  dps:   '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1v4M8 11v4M1 8h4M11 8h4" stroke="currentColor" stroke-width="1.6"/>',
  dmg:   '<path d="M8 1l1.8 4.2L14 4l-2.2 4L15 11l-4.4-.4L8 15l-1.6-4.4L2 11l3.2-3L2 4l4.2 1.2z"/>',
  rate:  '<path d="M2 4h8M2 8h11M2 12h8" stroke="currentColor" stroke-width="2" fill="none"/>',
  acc:   '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1"/>',
  ammo:  '<path d="M6 15V7c0-3 2-6 2-6s2 3 2 6v8z"/>',
  mag:   '<path d="M3 2h10v3H3zM3 6.5h10v3H3zM3 11h10v3H3z"/>',
  speed: '<path d="M2 3l5 5-5 5M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none"/>',
  boost: '<path d="M8 1l5 7h-3v7H6V8H3z"/>',
};
const ico = (n,cls='') => `<svg class="${cls}" viewBox="0 0 16 16" fill="currentColor">${I[n]}</svg>`;

// socket shape glyph: triangle / square / circle in the size colour
function sg(n, px=14, mode='solid'){
  const { color, shape } = SIZE[n];
  const body = shape==='tri' ? '<path d="M8 2L14.5 13.5H1.5Z"/>' : shape==='sq' ? '<rect x="2.5" y="2.5" width="11" height="11"/>' : '<circle cx="8" cy="8" r="6"/>';
  return `<svg class="sg" width="${px}" height="${px}" viewBox="0 0 16 16" fill="${mode==='solid'?color:'none'}" stroke="${color}" stroke-width="1.8"${mode==='dash'?' stroke-dasharray="3 2"':''}>${body}</svg>`;
}

const STAT_META = {
  // modules
  ammo:     { label:'Ammo Type',                icon:'ammo',   better:'neutral', text:true },
  power:    { label:'Power Consumption',        icon:'power',  better:'low' },
  heat:     { label:'Heat Generation',          icon:'heat',   better:'low',  unit:'/s' },
  mag:      { label:'Ammo Magazine Size',       icon:'mag',    better:'high' },
  dps:      { label:'DPS',                      icon:'dps',    better:'high' },
  dmg:      { label:'Damage',                   icon:'dmg',    better:'high' },
  rate:     { label:'Fire Rate',                icon:'rate',   better:'high', unit:'/s', dec:1 },
  acc:      { label:'Accuracy',                 icon:'acc',    better:'high', unit:'%' },
  speed:    { label:'Base Speed Increment',     icon:'speed',  better:'high', unit:' m/s' },
  boostUse: { label:'Boost Charge Consumption', icon:'boost',  better:'low',  unit:'/s' },
  // ship totals
  priDps:   { label:'Primary DPS',              icon:'dps',    better:'high' },
  secDps:   { label:'Secondary DPS',            icon:'dps',    better:'high' },
  fireTime: { label:'Fire Time',                icon:'heat',   better:'high', unit:'s', dec:1 },
  maxSpeed: { label:'Max Speed',                icon:'speed',  better:'high', unit:' m/s' },
  boostTime:{ label:'Boost Duration',           icon:'boost',  better:'high', unit:'s', dec:1 },
};
const MOD_KEYS = { primary:['ammo','power','heat','dps','dmg','rate','acc'],
                   secondary:['ammo','power','mag','dps','dmg','rate','acc'],
                   engine:['power','speed','boostUse'] };
const KEY_ORDER = ['ammo','power','heat','mag','dps','dmg','rate','acc','speed','boostUse'];
const modKeys = (...its) => KEY_ORDER.filter(k => its.some(it => it && MOD_KEYS[it.kind]?.includes(k)));
const fmtStat = (k,v) => { const m = STAT_META[k]; if(m?.text) return v||'—';
  return (m?.dec && v%1 ? v.toFixed(m.dec) : fmt(v)) + (m?.unit||''); };
const sgnStat = (k,d) => { const m = STAT_META[k]; return (d>0?'+':'−') + (m?.dec && d%1 ? Math.abs(d).toFixed(m.dec) : fmt(Math.abs(d))); };
// diff colours come in steps, by how much the value changes relative to the old one (`rel`). Thresholds (t1, t2, in %) and
// the five colours live in DIFF: edit them live from the DIFF menu; SAVE AS DEFAULT rewrites the next line (keep it on ONE line)
const DIFF_DEFAULT = {"t1":20,"t2":40,"low":"#ffffff","worseMid":"#ff7c5c","betterMid":"#5df11e","worseHigh":"#ff5a5a","betterHigh":"#00ff62"};   // @diff-defaults
const DIFF_KEY = 'crafting.diff';   // per-browser working copy
const DIFF = { ...DIFF_DEFAULT };
try{ Object.assign(DIFF, JSON.parse(localStorage.getItem(DIFF_KEY)) || {}); }catch(e){}
//   below t1 `low` (white) · below t2 yellow (worse) / green (better) · t2 and more red (worse) / blue (better)
// dgrad: text colour (card cells); dgradSd: text + tinted background (ship data badges)
function dmix(cls, rel){
  if(cls!=='up' && cls!=='dn') return null;
  const a = Math.abs(isFinite(rel) ? rel : 1) * 100, up = cls==='up';
  const col = a < DIFF.t1 ? DIFF.low : a < DIFF.t2 ? (up ? DIFF.betterMid : DIFF.worseMid) : (up ? DIFF.betterHigh : DIFF.worseHigh);
  return { col, tint: a < DIFF.t1 ? 8 : 24 };
}
const dgrad = (cls, rel) => { const m = dmix(cls, rel); return m ? ` style="color:${m.col}"` : ''; };
const dgradSd = (cls, rel) => { const m = dmix(cls, rel); return m ? ` style="color:${m.col};background:color-mix(in srgb,${m.col} ${m.tint}%,#22262b)"` : ''; };
function dcls(k,d){
  if(!d) return 'nt';
  const b = STAT_META[k]?.better;
  if(b==='neutral') return 'nt';
  if(b==='low') return d>0 ? 'dn' : 'up';   // costs (power, heat…) going up are red, not yellow
  return d>0 ? 'up' : 'dn';
}

/* =====================================================================
   SOCKET TREE
   ===================================================================== */
const vadd = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const vmul = (a,k) => [a[0]*k,a[1]*k,a[2]*k];
const vlen = a => Math.hypot(a[0],a[1],a[2]);
const vnorm = a => { const l = vlen(a)||1; return [a[0]/l,a[1]/l,a[2]/l]; };
const vcross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

const EXT_LEN = { 1:.95, 2:1.5, 3:2.2 };
const STEM    = { 2:1.0, 3:1.5 };
const SPREAD  = { 2:.75, 3:1.1 };

// Seen from the front (looking along +Z) no two module positions may line up:
// a weapon sitting behind another one would shoot it. Children are pushed sideways
// in the XY plane until they clear every other socket that could hold a module.
const CLEAR = { 1:.3, 2:.45, 3:.66 };
function stagger(pos, size, placed, att, side){
  const p = pos.slice();
  for(let it=0; it<30; it++){
    let moved = false;
    for(const o of placed){
      if(att[o.id]?.t==='pyl') continue;                  // a pylon holds no module
      const dx = p[0]-o.pos[0], dy = p[1]-o.pos[1], dist = Math.hypot(dx,dy), min = CLEAR[size]+CLEAR[o.size]+.12;
      if(dist >= min) continue;
      let ux = dx, uy = dy;
      if(dist < 1e-3){ ux = side[0]; uy = side[1]; if(Math.hypot(ux,uy) < 1e-3){ ux = 1; uy = 0; } }
      const l = Math.hypot(ux,uy) || 1, push = min - dist;
      p[0] += ux/l*push; p[1] += uy/l*push; moved = true;
    }
    if(!moved) break;
  }
  return p;
}
// direction a split fans out in: vertical for horizontal pylons (so the two children are
// staggered in the front view), horizontal for pylons growing up/down
const sideOf = d => Math.abs(d[1])>.85 ? [1,0,0] : vnorm([-d[1]*d[0], 1-d[1]*d[1], -d[1]*d[2]]);

// raw geometry of a pylon plugged into `sock`: the sockets it exposes (before staggering)
function spawn(sock, p){
  const d = vnorm(sock.dir), o = sock.pos, side = sideOf(d);
  if(p.type==='ext') return { joint:null, kids:[{ size:p.size, pos:vadd(o, vmul(d, EXT_LEN[p.size])), dir:d, side }] };
  const f = vadd(o, vmul(d, STEM[p.size])), w = SPREAD[p.size];
  const mk = k => ({ size:p.size-1, pos:vadd(vadd(f, vmul(d, w*.9)), vmul(side, k*w)), dir:vnorm(vadd(d, vmul(side, k*.55))), side });
  return { joint:f, kids:[mk(-1), mk(1)] };
}

// flatten body sockets + everything the pylons expose (depth-first)
function layout(att, body = BODY){
  const list = [], byId = {}, count = {1:0,2:0,3:0};
  const roots = body.sockets.map(b => { count[b.size]++; return { id:b.id, size:b.size, pos:b.pos, dir:b.dir, depth:0, parent:null, idx:count[b.size] }; });
  const placed = [...roots];
  const add = s => {
    list.push(s); byId[s.id] = s;
    const a = att[s.id];
    if(a && a.t==='pyl' && PYLONS[a.id] && PYLONS[a.id].size===s.size){
      const p = PYLONS[a.id], g = spawn(s,p);
      s.pylon = p; s.joint = g.joint;
      s.kids = g.kids.map((k,i) => {
        const kid = { id:`${s.id}.${i}`, size:k.size, pos:k.pos, dir:k.dir, depth:s.depth+1, parent:s.id, idx:i+1 };
        kid.pos = stagger(kid.pos, kid.size, placed, att, k.side);
        placed.push(kid); return kid;
      });
      s.segs = p.type==='ext' ? [[s.pos, s.kids[0].pos]] : [[s.pos,g.joint],[g.joint,s.kids[0].pos],[g.joint,s.kids[1].pos]];
      s.kids.forEach(add);
    }
  };
  roots.forEach(add);
  return { list, byId };
}
const inTree = (id, root) => id===root || id.startsWith(root+'.');
const sockName = s => `${SIZE[s.size].label} socket`;

// display groups of the left panel. 'tree' = sections by Body socket size, each with its subtree.
// The other views ("listModes" experiment) are flat lists regrouped by what is mounted.
const LIST_MODES = ['tree','fill','type','rarity','power'];
const LIST_LABEL = { tree:'TREE', fill:'FILLED', type:'TYPE', rarity:'RARITY', power:'POWER' };
function listGroups(L, att = S.att){
  const tree = [];
  for(const n of SIZE_ORDER){
    const roots = L.list.filter(s => !s.parent && s.size===n);
    if(roots.length) tree.push({ key:'P'+n, title:`${sg(n,16)}${SIZE[n].label} · ${SIZE[n].name.toUpperCase()} SOCKETS`, rows:L.list.filter(s => roots.some(r => inTree(s.id,r.id))), tree:true });
  }
  const mode = flag('listModes') ? S.listMode : 'tree';
  if(mode==='tree') return tree;
  const order = tree.flatMap(g => g.rows);                          // tree order = tie-break everywhere
  const itOf = s => att[s.id] ? ITEM(att[s.id].id) : null;
  const mods = order.filter(s => att[s.id]?.t==='mod'), arms = order.filter(s => att[s.id]?.t==='pyl'), empty = order.filter(s => !att[s.id]);
  const tail = [{ key:'empty', title:`${sg(1,14,'dash')}EMPTY SOCKETS`, rows:empty }];   // arms only appear in the tree view
  let groups;
  if(mode==='fill') groups = [{ key:'full', title:'MOUNTED', rows:mods }, { key:'empty', title:'EMPTY SOCKETS', rows:empty }];
  else if(mode==='type') groups = [['primary','PRIMARY WEAPONS'],['secondary','SECONDARY WEAPONS'],['engine','ENGINES']]
      .map(([k,t]) => ({ key:k, title:`${ico(k)}${t}`, rows:mods.filter(s => itOf(s).kind===k) })).concat(tail);
  else if(mode==='rarity') groups = [7,6,5,4,3,2,1].map(lv => ({ key:'lv'+lv, title:'', rows:mods.filter(s => itOf(s).lv===lv) })).concat(tail);
  else groups = [{ key:'pow', title:`${ico('power')}POWER USE`, right:`${mods.reduce((a,s) => a+itOf(s).power, 0)} / ${BODY.generator}`,
      rows:[...mods].sort((a,b) => itOf(b).power - itOf(a).power) }].concat(tail);
  return groups.filter(g => g.rows.length).map(g => ({ ...g, right: g.right ?? String(g.rows.length) }));
}
// navigation order of the left panel = display order
const navOrder = L => listGroups(L).flatMap(g => g.rows.map(s => s.id));
function cycleListMode(dir){
  if(!flag('listModes')) return;
  S.listMode = LIST_MODES[(LIST_MODES.indexOf(S.listMode)+dir+LIST_MODES.length) % LIST_MODES.length];
  renderAll(); $('.slot.sel')?.scrollIntoView({ block:'nearest' });
}

/* ---------- loadout maths ---------- */
function calc(att){
  const L = layout(att);
  const t = { power:0, heat:0, speed:0, boostUse:0, priDps:0, secDps:0, value:BODY.value||0, lvs:[], mq:[],
              sock:{1:{free:0,total:0},2:{free:0,total:0},3:{free:0,total:0}} };
  for(const s of L.list){
    t.sock[s.size].total++;
    const a = att[s.id];
    if(!a){ t.sock[s.size].free++; continue; }
    if(a.t!=='mod') continue;
    const it = ITEM(a.id);
    t.power += it.power; t.value += it.value; t.heat += mv(it,'heat'); t.speed += mv(it,'speed'); t.boostUse += mv(it,'boostUse');
    t.lvs.push(it.lv); t.mq.push({ lv:it.lv, size:it.size });
    if(it.kind==='primary') t.priDps += it.dps;
    if(it.kind==='secondary') t.secDps += it.dps;
  }
  for(const g of BODY.integrated||[]){                      // integrated: no power, not in the loadout quality
    const m = g.mod;
    t.heat += mv(m,'heat'); t.speed += mv(m,'speed'); t.boostUse += mv(m,'boostUse');
    if(m.kind==='primary') t.priDps += m.dps;
    if(m.kind==='secondary') t.secDps += m.dps;
  }
  // heat is progressive: firing always ends in overheat, the build decides how soon.
  // fireTime = seconds of sustained fire of all primaries from cold; coolTime = seconds to shed a full heatsink
  t.fireTime = t.heat ? BODY.heatCap / t.heat : Infinity;
  t.coolTime = BODY.heatCap / BODY.heatCool;
  t.gear = t.lvs.length ? t.lvs.reduce((a,v) => a+v, 0) / t.lvs.length : 0;   // average rarity of mounted modules
  t.maxSpeed = t.speed;                                        // base speed comes from the integrated engine
  t.boostTime = t.boostUse ? BODY.boost / t.boostUse : 0;     // seconds of boost from a full charge
  return t;
}
// put `item` (or nothing) on a socket; whatever hung there goes back to cargo
function attachTo(att, cargo, sid, item){
  const A = { ...att }, C = { ...cargo }, ret = [];
  for(const k of Object.keys(A)) if(inTree(k,sid)){ ret.push(A[k].id); if(!isPylon(A[k].id)) C[A[k].id] = (C[A[k].id]||0)+1; delete A[k]; }
  if(item){ A[sid] = { t:isPylon(item)?'pyl':'mod', id:item }; if(!isPylon(item)) C[item] = (C[item]||0)-1; }
  return { att:A, cargo:C, ret };
}
function makePreview(sid, to){
  const r = attachTo(S.att, S.cargo, sid, to), t1 = calc(r.att);
  return { sid, to, att:r.att, ret:r.ret, t1, fits:t1.power <= BODY.generator, room:cargoSlots(r.cargo) <= CARGO_SLOTS };
}

let LY = layout(S.att), T0 = calc(S.att), PV = null;

const selSock = () => LY.byId[S.sel];
// an extension arm only goes on a Body socket: on an arm output it would allow endless arm chains
const canMount = (id, sock) => !(PYLONS[id]?.type==='ext' && sock?.parent);
// the one number that tells parts of a category apart at a glance: DPS for weapons, speed for engines
const KEYSTAT = { primary:'dps', secondary:'dps', engine:'speed' };
const statOf = it => mv(it, KEYSTAT[it.kind]);
const SORT_FN = {
  stat:   (a,b) => statOf(b)-statOf(a) || b.lv-a.lv,
  rarity: (a,b) => b.lv-a.lv || statOf(b)-statOf(a),
  power:  (a,b) => a.power-b.power || statOf(b)-statOf(a),
};
const SORT_ORDER = ['stat','rarity','power'];
const sortLabel = () => S.sort==='stat' ? (S.tab==='engine' ? 'SPEED' : 'DPS') + ' ↓' : S.sort==='rarity' ? 'RARITY ↓' : 'POWER ↑';
function cargoItems(size = selSock().size, tab = S.tab){
  if(holdsParts(S.sel)) return [];                       // locked arm: see holdsParts
  const list = ITEM_ORDER.filter(id => (isPylon(id) || (S.cargo[id]||0)>0) && ITEMS[id].size===size && canMount(id, selSock()) &&
    (tab==='pylon' ? isPylon(id) : (!isPylon(id) && ITEMS[id].kind===tab))).map(id => ITEMS[id]);
  return flag('keyStats') && tab!=='pylon' ? list.sort(SORT_FN[S.sort]) : list;
}
const cargoList = () => cargoItems();
// Only END parts can be changed: an arm that still holds parts on its outputs is locked
// (no replace, no unequip) until those parts are removed. "Remove all" still clears everything.
const holdsParts = sid => Object.keys(S.att).some(k => k.startsWith(sid+'.'));
const partsOn = sid => Object.keys(S.att).filter(k => k.startsWith(sid+'.')).length;
function ensureTab(){
  if(cargoItems().length) return;
  const t = TAB_ORDER.find(k => cargoItems(selSock().size, k).length);
  if(t) S.tab = t;
}
function computePreview(){
  if(S.hoverRemove && LY.byId[S.hoverRemove] && S.att[S.hoverRemove]) return makePreview(S.hoverRemove, null);
  const list = cargoList();
  const id = S.hoverCargo ?? (S.focus==='cargo' && !noSel() ? list[S.cargoIdx]?.id : null);
  if(id) return makePreview(S.sel, id);
  // hovering a mounted module (its row in the list, or the part itself in the 3D view), outside
  // the cargo picker: it can be removed, so preview that removal in the info panel below
  if(S.focus!=='cargo' && S.hoverSlot && S.att[S.hoverSlot]?.t==='mod') return makePreview(S.hoverSlot, null);
  return null;
}
const hasRoom = (sid, id) => cargoSlots(attachTo(S.att, S.cargo, sid, id).cargo) <= CARGO_SLOTS;
const wouldFit = (sid, id) => calc(attachTo(S.att, S.cargo, sid, id).att).power <= BODY.generator;

/* =====================================================================
   GLYPHS (gamepad / keyboard)
   ===================================================================== */
const dpadSvg = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z"/></svg>';
function glyph(n){
  if(dev()==='gamepad'){
    switch(n){
      case 'A': return '<i class="gp a">A</i>';
      case 'B': return '<i class="gp b">B</i>';
      case 'X': return '<i class="gp x">X</i>';
      case 'Y': return '<i class="gp y">Y</i>';
      case 'dpad': return `<i class="gp">${dpadSvg}</i>`;
      case 'LT': return '<i class="gp pill">LT</i>';
      case 'RT': return '<i class="gp pill">RT</i>';
      case 'LB': return '<i class="gp pill">LB</i>';
      case 'RB': return '<i class="gp pill">RB</i>';
      case 'RS': return '<i class="gp rs">R</i>';
      case 'START': return '<i class="gp pill">≡</i>';
      case 'VIEW': return '<i class="gp pill">⧉</i>';
      case 'LS': return '<i class="gp rs">L</i>';
      case 'SORT': return '<i class="gp rs">L3</i>';   // sort now lives on L3, not X (freed for a plain, immediate unequip)
      case 'L3': return '<i class="gp rs">L3</i>';
      case 'DL': return '<i class="gp pill">◀</i>';
      case 'GUIDE': return '<i class="gp pill">≡</i>';
      case 'DR': return '<i class="gp pill">▶</i>';
      case 'R3': return '<i class="gp rs">R3</i>';
    }
  }else{
    const k = { A:'Enter', B:'Bksp', X:'Del', Y:'R', dpad:'↑ ↓', LT:'⇧ Tab', RT:'Tab', LB:'Q', RB:'E', RS:'Drag', START:'Esc', VIEW:'V', LS:'R-Drag', SORT:'O', L3:'^Z', R3:'^Y', DL:'←', DR:'→', GUIDE:'H' }[n];
    return `<i class="key">${k}</i>`;
  }
}

/* =====================================================================
   RENDER
   ===================================================================== */
function renderTop(){
  const segs = (n,on,c)=>Array.from({length:n},(_,i)=>`<i class="${i<on?'on '+c:''}"></i>`).join('');
  $('#top').innerHTML = `
    <div class="hud">
      <div class="emblem"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#9aa3ab" stroke-width="2"><circle cx="22" cy="22" r="16"/><path d="M22 8v28M10 16l12 6 12-6M10 28l12-6 12 6"/></svg></div>
      <div class="hud-bars">
        <div class="hud-bar"><b>21,980</b><div class="segs">${segs(22,21,'g')}</div></div>
        <div class="hud-bar"><b>14,000</b><div class="segs">${segs(22,22,'b')}</div></div>
        <div class="hud-speed">0 m/s</div>
      </div>
      <div class="hud-lv">30</div>
    </div>
    <div class="station-wrap"><div class="station">MARIANAN STATION</div></div>
    <div class="tabs">
      ${glyph('LB')}
      <span class="tab">MAINTENANCE</span><span class="tab">RAIDER LOG</span><span class="tab">INVENTORY</span><span class="tab">TRADING</span><span class="tab act">CRAFTING</span>
      ${glyph('RB')}
    </div>
    <div class="credits">121,834 CR</div>`;
}

// short name (family dropped: it is already on the icon) — used by the 3D labels; the left list shows full names
// ("Mote S. Matter Shooter" -> "Mote"); arms keep only their kind (outputs are shown as glyphs)
const shortName = it => isPylon(it.id) ? (it.type==='ext' ? 'Extension Arm' : 'Split Arm')
  : it.name.endsWith(' '+FAMILY[it.fam].label) ? it.name.slice(0, -FAMILY[it.fam].label.length-1) : it.name;

function leftRow(s, up=1, statKey=null){
  const a = S.att[s.id], it = a ? ITEM(a.id) : null, isSel = S.sel===s.id && S.intSel==null && !noSel();
  const kcls = !it ? 'free' : a.t==='pyl' ? 'pyl' : KIND[it.kind].cls;
  const cls = ['slot', kcls, isSel?'sel':'', isSel&&S.focus==='slots'?'focus':'', S.hoverSlot===s.id?'hov':'', S.flash===s.id?'flash':'',
               s.depth?'child':'',
               PV&&PV.sid===s.id ? (PV.to?'pv-add':'pv-rem') : ''].join(' ');
  const icon = !it ? sg(s.size,20,'dash') : ico(a.t==='pyl' ? 'pylon' : it.fam);
  const full = it ? it.name : flag('overview') ? 'Empty' : '';
  const name = full;
  const rc = it && a.t==='mod' ? rarCol(it) : '';
  return `<div class="${cls}${rc?' rar':''}" data-slot="${s.id}" style="--d:${s.depth};--up:${up}${rc?`;--rc:${rc}`:''}">
    ${rc ? modIcTag(it) : `<div class="ic">${icon}</div>`}
    <div class="nm" title="${full}"><span class="nmx"><span class="nmt">${name}</span></span></div>
    ${statKey==='power' && it && a.t==='mod' ? `<span class="pwn" title="Power used">${it.power}</span>` : ''}
  </div>`;
}

// integrated module row: same look as a mounted module, but not selectable (no data-slot)
function integRow(m, idx){
  const isSel = S.intSel===idx && !noSel();
  return `<div class="slot ${KIND[m.kind].cls} rar integ${isSel?' sel':''}${isSel&&S.focus==='slots'?' focus':''}" data-int="${idx}" style="--d:0;--rc:${rarCol(m)}" title="${m.name} · integrated in the Body: cannot be changed">
    ${modIcTag(m)}
    <div class="nm"><span class="nmx"><span class="nmt">${m.name}</span></span></div>
  </div>`;
}

function renderLeft(){
  const keep = $('#left .lp-body')?.scrollTop || 0;
  // the Body panel sits near the top: ‹ NAME › and the position of this Body among all the Bodies of the game.
  // No dedicated arrow buttons any more: the shortcut glyph itself is the button (mouse-clickable
  // regardless of device); it shows whichever key actually switches ship in the current focus
  // (LT/RT in focus 'slots', left/right in focus 'body'), and hides while cargo is open (there
  // LT/RT means something else: category).
  const trig = S.focus!=='cargo';
  const bodyFoc = S.focus==='body';
  $('#shipPanel').innerHTML = `<div class="head bodyhead ${bodyFoc?'focus':''}">
      ${trig ? `<button class="bstep" data-bstep="-1" title="Previous ship">${bodyFoc?glyph('DL'):glyph('LT')}</button>` : '<span class="bstep-sp"></span>'}
      <div class="bsw-mid"><span class="bname"><span class="bn-t">${shipName(BODY)}</span></span><small>${BODY_LIST.indexOf(BODY.id)+1} / ${BODIES_IN_GAME}</small></div>
      ${trig ? `<button class="bstep" data-bstep="1" title="Next ship">${bodyFoc?glyph('DR'):glyph('RT')}</button>` : '<span class="bstep-sp"></span>'}
    </div>`;
  marquee('#shipPanel .bname');   // a Body name that does not fit scrolls back and forth
  stage.classList.toggle('body-unknown', !!BODY.unknown);   // an unknown ship: no 3D labels, no details card
  // the socket panel is only about sockets and mounted modules; it floats over the 3D view
  // (it no longer shares a column with the ship data). Not collapsible: it's always fully shown.
  let html = `
    <div class="lp-head"><div class="nm">SOCKETS</div>
      ${flag('listModes') && !BODY.unknown ? `<button class="lmcycle" data-lmcycle title="Change the view of the list (tree · filled · type · rarity · power)"><small>VIEW</small>${LIST_LABEL[S.listMode]}${S.focus==='slots' ? glyph('SORT') : ''}</button>` : ''}
    </div>
    <div class="lp-body">`;
  if(BODY.unknown){
    html += `<div class="cg-empty">UNKNOWN SHIP<br><span class="cg-sub">Nothing is known about this ship yet, only that it has a slot in the list.</span></div>`;
  }
  for(const g of BODY.unknown ? [] : listGroups(LY)){
    if(g.title && !g.tree) html += `<div class="sec-title"><span class="st-l">${g.title}</span><span>${g.right}</span></div>`;   // the rarity view has no group labels: the order says it; the tree view has none either (socket size is on the icon)
    if(g.tree){
      // rows between a child and its pylon: the tree line runs all the way up to the pylon row
      const at = Object.fromEntries(g.rows.map((s,i) => [s.id,i]));
      for(const s of g.rows) html += leftRow(s, s.parent ? at[s.id]-at[s.parent] : 1);
    }else for(const s of g.rows) html += leftRow({ ...s, depth:0 }, 1, S.listMode==='power' ? 'power' : null);   // flat views: no indentation
  }
  if(!BODY.unknown && BODY.integrated?.length){   // integrated modules close the list
    html += `<div class="sec-title integ-t"><span class="st-l">${ico('lock')}INTEGRATED</span></div>`;
    BODY.integrated.forEach((g, i) => { html += integRow(g.mod, i); });
  }
  html += `</div>`;
  $('#left').innerHTML = html;
  marquee('#left .slot .nmx');
  const b = $('#left .lp-body'); if(b) b.scrollTop = keep;
}
// names are never cut: a box whose text does not fit scrolls it back and forth
function marquee(sel){
  for(const box of document.querySelectorAll(sel)){
    const txt = box.firstElementChild, over = txt ? txt.scrollWidth - box.clientWidth : 0;
    box.classList.toggle('scroll', over > 0); box.style.setProperty('--over', Math.max(0, over) + 'px');
  }
}

function skCell(n, t, nn){
  const d = nn.sock[n].free - t.sock[n].free;
  return `<div class="wc sk">${sg(n,20)}<span class="v">${nn.sock[n].free}<i>/${nn.sock[n].total}</i></span>${d?`<span class="d ${d>0?'up':'nt'}">${sgn(d)}</span>`:''}</div>`;
}
function statCell(icon,label,val,delta,k,rated=null){
  const c = dcls(k,delta), v = k==='boostTime' && !val ? '—' : fmtStat(k,val).replace(/\s?([a-z/%]+)$/i, '<small>$1</small>');
  return `<div class="st ${rated?'rated-bg':''}" ${rated?rated.attrs:''}><div class="si">${ico(icon)}</div><div><div class="sl">${label}</div><div class="sv ${delta?c:''}">${v}</div></div><div class="sd ${c} ${delta?'':'off'}">${delta?sgnStat(k,delta):''}</div></div>`;
}
function wcell(cls,icon,val,delta,tip=''){
  const c = delta ? (delta>0?'up':'dn') : '';
  return `<div class="wc ${cls}" title="${tip}">${ico(icon)}<span class="v ${val?'':'zero'} ${c}">${val}</span>${delta?`<span class="d ${c}">${sgn(delta)}</span>`:''}</div>`;
}

function renderRight(){
  const keep = $('.cg-list')?.scrollTop || 0;
  const t = T0, n = PV ? PV.t1 : T0;
  const over = n.power > BODY.generator;

  const pd = n.power - t.power;
  // heat: firing always ends in overheat; what matters is how long you can fire and how long you then wait
  const secs = v => !isFinite(v) ? '∞' : `${v >= 100 ? Math.round(v) : v.toFixed(1)}<small>s</small>`;
  const fd = isFinite(n.fireTime) && isFinite(t.fireTime) ? n.fireTime - t.fireTime : (n.fireTime===t.fireTime ? 0 : NaN);
  const fdTxt = !fd ? '' : isNaN(fd) ? (isFinite(n.fireTime) ? '−∞' : '+∞') : (fd>0?'+':'−') + Math.abs(fd).toFixed(1) + 's';
  const fdCls = isNaN(fd) ? (isFinite(n.fireTime) ? 'dn' : 'up') : fd>0 ? 'up' : 'dn';
  // always render the badge (hidden, not omitted, when there's nothing to show): an omitted element
  // is shorter than one with the same font/padding as the value next to it, so appearing/disappearing
  // deltas used to change the row's height. See STAT_META / .sd.off convention used elsewhere.
  // `old` = the value the figure has now: it is shown next to the new one (dimmed, "old – new") while previewing
  const dl = (cls, txt, rel, old) => `<span class="sd ${txt?cls:'off'}"${txt ? dgradSd(cls, rel) + ` data-old="${old||''}"` : ''}>${txt||'+0'}</span>`;
  const oldSecs = v => !isFinite(v) ? '∞' : (v >= 100 ? Math.round(v) : v.toFixed(1)) + 's';
  const rated = flag('maxRatings');

  // ship data column, on the right: 3 groups — value on its own, then defences + power, then damage and speed
  const ov = `<div class="ov">
    <div class="lp-head"><div class="nm">SHIP DATA</div></div>
    <div class="ov-body">
      <div class="dpsblock">
        <div class="ovgrid c1">
          ${ovRow('value','SHIP VALUE', fmt(n.value), dl(dcls('value', n.value-t.value), n.value!==t.value ? sgn(n.value-t.value) : '', (n.value-t.value)/(t.value||1), fmt(t.value)), rated ? rate(n.value, gameMax('value')) : null, true)}
        </div>
      </div>
      <div class="dpsblock">
        <div class="ovgrid c1">
          ${lineRow('shield','SHIELD',BODY.shield,0,'', rated ? rate(BODY.shield, gameMax('shield')) : null, true)}
          ${lineRow('hull','INTEGRITY',BODY.integrity,0,'', rated ? rate(BODY.integrity, gameMax('integrity')) : null, true)}
          <div class="ovc pw" title="Power used / generator"><span class="rl">Power</span><span class="ric">${ico('power')}</span>${powerTicks(t.power, n.power, over ? 'dn' : dcls('power',pd))}</div>
        </div>
        ${flag('shipQuality') ? qualityRow(t, n) : ''}
      </div>
      <div class="dpsblock">   <!-- damage and ship speed -->
        <div class="ovgrid c1">
          ${ovRow('heat','FIRE TIME', secs(n.fireTime), dl(fdCls, fdTxt, isFinite(fd) ? fd/(t.fireTime||1) : 1, oldSecs(t.fireTime)), null, true)}
          ${dpsRow('PRIMARY DPS','priDps',t,n,true)}${dpsRow('SECONDARY DPS','secDps',t,n,true)}
          ${lineRow('speed','MAX SPEED',n.maxSpeed,n.maxSpeed-t.maxSpeed,'maxSpeed', rated ? rate(n.maxSpeed, gameMax('speed')) : null, true)}
          ${lineRow('boost','BOOST DURATION',n.boostTime,n.boostTime-t.boostTime,'boostTime', null, true)}
        </div>
      </div>
    </div></div>`;

  // ---- cargo (filtered by the size of the selected socket)
  ensureTab();
  const sock = selSock(), list = cargoList();
  if(S.cargoIdx>=list.length) S.cargoIdx = Math.max(0,list.length-1);
  const curA = S.att[S.sel], curIt = curA ? ITEM(curA.id) : null;
  const cats = TAB_ORDER.map(k=>{
    return `<div class="cat ${TAB_CLS[k]} ${k===S.tab?'act':''}" data-tab="${k}">${TAB_LABEL[k].toUpperCase()}</div>`;
  }).join('');
  // "keyStats" experiment: key stat + delta vs the mounted module on every row, BEST tag on the top upgrade
  const keys = flag('keyStats'), mounted = curA?.t==='mod' ? curIt : null;
  const info = list.map(m => { const pyl = isPylon(m.id), room = hasRoom(S.sel,m.id); return { m, pyl, room, fits: room && (pyl || wouldFit(S.sel,m.id)) }; });
  const overBy = id => calc(attachTo(S.att, S.cargo, S.sel, id).att).power - BODY.generator;   // power points missing
  const cands = keys ? info.filter(x => !x.pyl && x.fits) : [];
  const top = cands.length>1 ? Math.max(...cands.map(x => statOf(x.m))) : null;
  const bestOk = top!==null && (!mounted || mounted.kind!==cands[0].m.kind || top>statOf(mounted));
  const rows = info.map(({ m, pyl, room, fits }, i)=>{
    const focus = S.focus==='cargo' && i===S.cargoIdx && !noSel(), hov = S.hoverCargo===m.id;
    const label = !room ? 'CARGO FULL' : !fits ? 'NO POWER' : (curIt?'':'EQUIP');   // a replacement needs no word: the A glyph says it
    // "blockedReason" experiment: a row that cannot be mounted always says why, even without focus / hover
    const why = flag('blockedReason') && !fits ? (!room ? 'CARGO FULL' : `NO POWER <b>+${overBy(m.id)}</b>`) : '';
    const two = keys && !pyl;
    let sub = '';
    if(two){
      // the row shows the stat the list is sorted by: power when sorting by power, the key stat otherwise
      const byPow = S.sort==='power', k = byPow ? 'power' : KEYSTAT[m.kind];
      const d = mounted && (byPow || mounted.kind===m.kind) ? m[k]-mounted[k] : null;
      const dc = d ? dcls(k,d) : 'nt', dst = d ? dgradSd(dc, d/(Math.abs(mounted[k])||1)) : '';
      const dh = '';
      const best = !byPow && bestOk && fits && statOf(m)===top ? `<span class="best" title="Highest ${STAT_META[k].label} among the parts you can mount here">BEST</span>` : '';
      sub = `<div class="sub"><span>${byPow?'POWER':k==='dps'?'DPS':'SPEED'} ${dst ? `<span class="ov">${mounted[k]}</span><span class="ovd">–</span>` : ''}<b${dst ? ` class="dv"${dst}` : ''}>${m[k]}</b></span>${best}</div>`;
    }
    const qty = !pyl && flag('stackBadge') ? `<span class="qty" title="In cargo">×${S.cargo[m.id]}</span>` : '';
    return `<div class="cg-row slot ${two?'two':''} ${pyl?'pyl':KIND[m.kind].cls+' rar'} ${focus?'sel':''} ${hov?'hov':''} ${fits?'':'nopow'}" data-item="${m.id}" data-i="${i}"${pyl?'':` style="--rc:${rarCol(m)}"`}>
      ${pyl ? `<div class="ic">${ico('pylon')}</div>` : modIcTag(m, qty)}
      <div class="mid"><div class="nm" title="${m.name}"><span class="nmx"><span class="nmt">${m.name}</span></span></div>${sub}</div>
      <div class="act">${why ? `<span class="why" title="${!room?'No free cargo slot for the parts that would come back':'Power needed above the Body generator'}">${why}</span>` : focus||hov?label:''}${focus?glyph('A'):''}</div>
    </div>`;
  }).join('') || (holdsParts(S.sel) ? `<div class="cg-empty locked">${ico('lock')}<br>THIS ARM HOLDS ${partsOn(S.sel)} PART${partsOn(S.sel)>1?'S':''}<br><span class="cg-sub">Only end parts can be replaced or removed: remove the parts on this arm first</span></div>`
     : `<div class="cg-empty">NO ${TAB_LABEL[S.tab].toUpperCase()} FOR A ${SIZE[sock.size].label} SOCKET IN CARGO<br><span class="cg-sub">Try another tab, or craft / loot new parts</span></div>`);
  const sortBtn = keys && S.tab!=='pylon' ? `<button class="cg-back" data-sort title="Change the ordering of this list">${glyph('SORT')}<span>SORT · ${sortLabel()}</span></button>` : '';

  // no "TARGET · socket" line any more: back button and sort button share one row
  const cg = `<div class="cg">
    <div class="head">CARGO<small>${cargoSlots(S.cargo)} / ${CARGO_SLOTS} SLOTS</small></div>
    <div class="cg-bar">${flag('slideCargo') ? `<button class="cg-back" data-act="b">${glyph('B')}<span>BACK</span></button>` : '<span></span>'}${sortBtn}</div>
    <div class="cats">${glyph('LT')}${cats}${glyph('RT')}</div>
    <div class="cg-list">${rows}</div>
  </div>`;

  if(flag('slideCargo')){                                 // cargo lives in its own panel, open only while choosing a part
    $('#right').innerHTML = ov;
    $('#cargoPanel').innerHTML = cg;
    $('#cargoPanel').classList.toggle('open', S.focus==='cargo');
    // #cargoPanel sits at the same fixed spot as #left (CSS): it slides over the socket list
    // whether or not that panel is collapsed, while the Body switcher and overview stay visible at the bottom
  }else{ $('#right').innerHTML = ov + cg; $('#cargoPanel').innerHTML = ''; $('#cargoPanel').classList.remove('open'); }
  const l = $('.cg-list'); if(l) l.scrollTop = keep;
  marquee('#cargoPanel .cg-row .nmx');
  if(BODY.unknown) for(const c of document.querySelectorAll('#right .ovc')){   // nothing is known about this ship: no figures at all
    if(c.querySelector('b')) c.querySelector('b').textContent = '—'; if(c.querySelector('.dslot')) c.querySelector('.dslot').innerHTML = ''; c.querySelector('.ptick')?.remove(); c.classList.remove('rated-bg'); c.removeAttribute('style'); c.querySelector('.lvt')?.remove();
  }
}

/* ---------- "maxRatings" experiment: how close the build is to the best this Body can reach ----------
   Exact optimum over every legal build of the current Body with unlimited copies of any catalogue module:
   best(size, root)[p] = highest total with at most p power in a socket of that size, taking the max of
     empty (0) · any module of that size (metric, costs its power) · Extension arm (root sockets only, 0 power,
     same size, child is not a root) · Split arm (size >= 2, 0 power, two children of size-1).
   The Body total is the "at most p" convolution of its root sockets, read at p = generator. Memoised per Body. */
const MAX_CACHE = {};
function bestBuild(metric, body = BODY){
  const key = body.id+'|'+metric, G = body.generator; if(MAX_CACHE[key]!=null) return MAX_CACHE[key];
  const val = m => metric==='value' ? m.value : metric==='speed' ? (m.kind==='engine' ? m.speed : 0)
    : metric==='priDps' ? (m.kind==='primary' ? m.dps : 0) : (m.kind==='secondary' ? m.dps : 0);
  const conv = (a,b) => a.map((_,p) => { let v = 0; for(let i=0;i<=p;i++) v = Math.max(v, a[i]+b[p-i]); return v; });
  const memo = {};
  const best = (size, root) => {
    const k = size+(root?'r':'c'); if(memo[k]) return memo[k];
    const r = Array(G+1).fill(0);
    for(const m of Object.values(MODS)) if(m.size===size && val(m)>0) for(let p=m.power;p<=G;p++) r[p] = Math.max(r[p], val(m));
    for(let p=1;p<=G;p++) r[p] = Math.max(r[p], r[p-1]);
    if(root){ const e = best(size,false); for(let p=0;p<=G;p++) r[p] = Math.max(r[p], e[p]); }
    if(size>=2){ const c = best(size-1,false), sp = conv(c,c); for(let p=0;p<=G;p++) r[p] = Math.max(r[p], sp[p]); }
    return memo[k] = r;
  };
  let tot = Array(G+1).fill(0);
  for(const s of body.sockets) tot = conv(tot, best(s.size, true));
  const integ = metric==='value' ? 0 : (body.integrated||[]).reduce((a,g) => a + val(g.mod), 0);   // value: already in body.value
  return MAX_CACHE[key] = tot[G] + integ + (metric==='value' ? (body.value||0) : 0);
}
// the rating scale is global: the best any Body in the game data can reach (custom .glb bodies excluded)
// shield / integrity are plain Body constants (the loadout can't change them), so their "max" is just the
// best value among the Bodies in the game, not a bestBuild() search
const BODY_CONST = { shield:1, integrity:1 };
const gameMax = metric => Math.max(...BODY_LIST.filter(id => BODIES[id].tag!=='CUSTOM' && !BODIES[id].unknown)
  .map(id => BODY_CONST[metric] ? BODIES[id][metric] : bestBuild(metric, BODIES[id])));
// rating of a value against the game max: colour of the rarity band it falls into (LV1 brown … LV7 gold)
function rate(cur, max){
  const r = max ? Math.min(1, cur/max) : 0, band = Math.min(7, Math.floor(r*7)+1);
  return { band, c:RARITY[band].color, attrs:`style="--rc:${RARITY[band].color}" title="${Math.round(r*100)}% of the best build in the game (${fmt(max)})"` };
}
function ratedBar(cur, max){
  const r = max ? Math.min(1, cur/max) : 0, band = Math.min(7, Math.floor(r*7)+1), c = RARITY[band].color;
  return `<div class="rated" style="--rc:${c}" title="${Math.round(r*100)}% of the best build in the game (${fmt(max)})"><i style="width:${(r*100).toFixed(1)}%"></i></div><span class="ratedp" style="color:${c}">${Math.round(r*100)}% OF MAX</span>`;
}
// overview line: icon + label on the left, the change in a fixed slot right before the value, value flush right
// cell=true: compact two-per-line version (label above, change on the left and value on the right below it); `extra` goes under the value line
// the only stat drawn as ticks: one per generator point, white = used, dim = free; while previewing, the ticks
// that change are coloured green / red (advantage / disadvantage) and blink
function powerTicks(cur, next, cls){
  const G = BODY.generator, lo = Math.min(cur, next), hi = Math.min(Math.max(cur, next), G);
  let h = '';
  for(let i = 0; i < G; i++) h += `<i class="${i < lo ? 'on' : i >= lo && i < hi ? 'df ' + cls : ''}"></i>`;
  return `<div class="ptick">${h}</div>`;
}
const camel = t => String(t).toLowerCase().split(' ').map(w => w==='dps' ? 'DPS' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');   // "FIRE TIME" -> "Fire Time", "PRIMARY DPS" -> "Primary DPS"
function ovRow(icon, label, val, delta='', rated=null, cell=false, extra=''){
  label = camel(label);
  // the change is no longer a +/- badge: the new value itself takes its colour and tint (style carried by the badge markup)
  const dm = /<span class="sd ([a-z]+)"( style="[^"]*")?/.exec(delta || '');
  const dvs = dm && dm[1]!=='off' && dm[1]!=='nt' && dm[2] ? ` class="dv"${dm[2]}` : '';
  const om = /data-old="([^"]*)"/.exec(delta || '');
  const dold = dvs && om && om[1] ? `<span class="ov">${om[1]}</span><span class="ovd">–</span>` : '';
  const at = `${rated?'rated-bg':''}" ${rated?rated.attrs:''}`;
  return cell
    ? `<div class="ovc ${at}><span class="rl">${label}</span><div class="cv"><div class="dslot">${dold}</div><b${dvs}>${val}</b></div>${extra}${rated?`<span class="lvt" title="Level of this value: LV1 (lowest) to LV7 (the best in the game)">LV${rated.band}</span>`:''}<span class="ric">${ico(icon)}</span></div>`
    : `<div class="dpsrow ${at}><div class="dh"><span class="rl">${ico(icon)}${label}</span><div class="dslot">${delta}</div><b>${val}</b></div></div>`;
}
function lineRow(icon, label, val, delta, k, rated=null, cell=false){
  const v = k==='boostTime' && !val ? '—' : fmtStat(k,val).replace(/\s?([a-z/%]+)$/i, '<small>$1</small>');
  const old = val - delta;
  return ovRow(icon, label, v, delta ? `<span class="sd ${dcls(k,delta)}"${dgradSd(dcls(k,delta), delta/(Math.abs(old)||1))} data-old="${k==='boostTime' && !old ? '—' : fmtStat(k,old)}">${sgnStat(k,delta)}</span>` : '', rated, cell);
}
function dpsRow(label, key, t, n, cell=false){
  const d = n[key]-t[key];
  return ovRow('dps', label, fmt(n[key]), d ? `<span class="sd ${d>0?'up':'dn'}"${dgradSd(d>0?'up':'dn', d/(t[key]||1))} data-old="${fmt(t[key])}">${sgn(d)}</span>` : '', flag('maxRatings') ? rate(n[key], gameMax(key)) : null, cell);
}

/* ---------- "shipQuality" experiment: how good the mounted modules are ---------- */
function qualityRow(t, n){
  const shape = size => { const sh = SIZE[size].shape; return `<svg viewBox="0 0 16 16">${sh==='tri' ? '<path d="M8 2.5L14 13H2Z"/>' : sh==='sq' ? '<rect x="3" y="3" width="10" height="10"/>' : '<circle cx="8" cy="8" r="5.5"/>'}</svg>`; };
  // one square per mounted module: rarity colour, with the shape of the socket it sits in; best first
  const segs = [...n.mq].sort((a,b) => b.lv-a.lv || b.size-a.size).map(m => `<i class="qt" style="--rc:${RARITY[m.lv].color}" title="LV${m.lv} · ${SIZE[m.size].label} socket">${shape(m.size)}</i>`).join('');
  const d = n.gear - t.gear;
  return `<div class="qrow" title="Average rarity of the mounted modules; one segment per module, best first">
    <div class="qhead"><span class="rl">LOADOUT QUALITY</span>
      <div class="dslot">${Math.abs(d) >= .05 ? `<span class="sd ${d>0?'up':'dn'}">${d>0?'+':'−'}${Math.abs(d).toFixed(1)}</span>` : ''}</div>
      <span class="qv">${n.lvs.length ? `<small>AVG LV <b>${n.gear.toFixed(1)}</b></small>` : '<small>NO MODULES</small>'}</span></div>
    <div class="qtiles">${segs}</div>
  </div>`;
}

/* ---------- compare card ---------- */
// "compactCard" experiment: stats as a two-column grid of short cells (label close to its value)
const CARD_SHORT = { ammo:'Ammo', power:'Power', heat:'Heat', mag:'Magazine', dps:'DPS', dmg:'Damage', rate:'Fire rate', acc:'Accuracy', speed:'Speed', boostUse:'Boost use' };
// a card cell: label + value. In a diff the NEW module's value carries the colour / tint of the change (no +/- number: it is in the tooltip)
const ccell = (icon, label, full, val, dl='', dcl='', rel=0) => {
  const st = dmix(dcl, rel) ? dgradSd(dcl, rel) : '';
  return `<div class="cst" title="${full}${dl && dl!=='=' ? ' · change ' + dl : ''}"><span class="cl">${icon}<span>${label}</span></span><span class="cv"><b${st ? ` class="dv"${st}` : ''}>${val}</b></span></div>`;
};
const cgrid = cells => `<div class="cgrid">${cells.join('')}</div>`;

function renderCard(){
  // without a preview this is the selected socket; with one (hovering a mounted part to preview
  // removing it, or a different row's ✕) it's whatever socket PV actually targets
  const sockId = PV ? PV.sid : S.sel;
  const sock = LY.byId[sockId] || selSock(), curA = S.att[sockId], cur = curA ? ITEM(curA.id) : null;
  // a window = header (same look as a socket-list row: icon, vertical LV tag, regular-weight name) + parameter rows.
  // `it`: the module (rarity fade, LV tag); an arm gets its icon and nothing else
  const head = it => {
    if(!it) return '';
    const mod = !isPylon(it.id);
    return `<div class="ch${mod?' rar':''}"${mod?` style="--rc:${rarCol(it)}"`:''}>${mod ? modIcTag(it) : `<div class="ic">${ico('pylon')}</div>`}<div class="cht">${it.name}</div></div>`;
  };
  const win = (inner, cls='', tag='') => `<div class="cw ${cls}">${tag ? `<div class="wtag">${tag}${tag==='REMOVE' ? glyph('X') : ''}</div>` : ''}${inner}</div>`;
  let html, mini = false, dual = false;
  if(S.intSel!=null && S.focus==='slots' && !PV && !BODY.unknown && !noSel() && BODY.integrated?.[S.intSel]){
    const m = BODY.integrated[S.intSel].mod;
    $('#card').classList.remove('collapsed', 'dual', 'mini');
    $('#card').innerHTML = win(head(m) + cgrid([ccell(ico(m.fam), 'Type', 'Module family', FAMILY[m.fam].label), ...modKeys(m).map(k => ccell(ico(STAT_META[k].icon), CARD_SHORT[k], STAT_META[k].label, fmtStat(k,m[k])))]), '', 'INTEGRATED');
    return;
  }
  const collapse = !BODY.unknown && !PV && (!cur || noSel());   // focus on an empty socket: nothing to say, the card folds away
  $('#card').classList.toggle('collapsed', collapse);
  if(collapse){ $('#card').innerHTML = ''; return; }
  if(BODY.unknown){
    html = win(`<div class="ch"><div class="cht">${shipName(BODY)}</div></div><div class="emptyc">Nothing is known about this ship yet.</div>`);
  }else if(!PV){
    if(curA.t==='pyl'){                                   // an arm: its kind and nothing else
      html = win(`<div class="ch"><div class="ic">${ico('pylon')}</div><div class="cht">${cur.type==='ext' ? 'Extension Arm' : 'Split Arm'}</div></div>`, 'mini');
      mini = true;
    }else{
      // the family ("Gatling", "Laser"…) is a parameter like any other, so it's a row here instead of part of the title
      html = win(head(cur) + cgrid([ccell(ico(cur.fam), 'Type', 'Module family', FAMILY[cur.fam].label), ...modKeys(cur).map(k => ccell(ico(STAT_META[k].icon), CARD_SHORT[k], STAT_META[k].label, fmtStat(k,cur[k])))]));
    }
  }else{
    const to = PV.to ? ITEM(PV.to) : null;
    const pylonCase = isPylon(PV.to||'') || (curA && curA.t==='pyl');
    const over = PV.t1.power - BODY.generator;
    // one row per parameter: old value, new value and the change (relative to the old value, for the colour gradient)
    let rows;
    if(!pylonCase){
      rows = (cur && to && cur.kind!==to.kind ? modKeys(to) : modKeys(cur,to)).map(k => {
        const has = it => it && MOD_KEYS[it.kind].includes(k), val = it => has(it) ? fmtStat(k,it[k]) : '—';
        let dl, dcl, rel = 0;
        if(STAT_META[k].text){ dl = has(cur)&&has(to)&&cur[k]===to[k] ? '=' : '≠'; dcl = 'nt'; }
        else { const o = mv(cur,k), d = mv(to,k)-o; dl = d ? sgnStat(k,d) : '='; dcl = d ? dcls(k,d) : 'nt'; rel = o ? d/Math.abs(o) : (d ? 1 : 0); }
        return { icon:ico(STAT_META[k].icon), label:CARD_SHORT[k], full:STAT_META[k].label, o:val(cur), n:val(to), dl, dcl, rel };
      });
    }else{
      const outs = it => it && isPylon(it.id) ? `<span class="outs">${outputsOf(it).map(n=>sg(n,14)).join('')}</span>` : '—';
      rows = [{ icon:ico('sockets'), label:'Outputs', full:'Output sockets of the arm', o:outs(cur), n:outs(to), dl:'', dcl:'nt', rel:0 }];
      for(const n of SIZE_ORDER){
        const d = PV.t1.sock[n].free - T0.sock[n].free;
        if(d) rows.push({ icon:sg(n,14), label:`Free ${SIZE[n].label}`, full:`Free ${SIZE[n].label} sockets`, o:T0.sock[n].free, n:PV.t1.sock[n].free, dl:sgn(d), dcl:d>0?'up':'nt', rel:d/(T0.sock[n].free||1) });
      }
    }
    const back = PV.ret.filter((id,i)=>!(i===0 && !pylonCase));
    const backTxt = back.length && pylonCase ? `<div class="retline">Returns to cargo: ${PV.ret.map(id=>ITEM(id).name).join(', ')}</div>` : '';
    const foot = !PV.room
      ? `<span>CARGO <b class="no">${CARGO_SLOTS} / ${CARGO_SLOTS}</b></span><span class="no">CARGO FULL · NO ROOM FOR RETURNED MODULES</span>`
      : (over>0 ? `<span class="no">NOT ENOUGH POWER · NEEDS ${over} MORE</span>` : '');
    const footHtml = foot ? `<div class="cf">${foot}</div>` : '';
    // old module on the left, new module on the right; a removal has only the old one (its change is the effect of removing it)
    const oldWin = cur ? win(head(cur) + cgrid(rows.map(r => ccell(r.icon, r.label, r.full, r.o, to ? '' : r.dl))) + (to ? '' : backTxt + footHtml), to ? 'old tag-cur' : 'old tag-rem', to ? 'CURRENT' : 'REMOVE') : '';
    const newWin = to ? win(head(to) + cgrid(rows.map(r => ccell(r.icon, r.label, r.full, r.n, r.dl, r.dcl, r.rel))) + backTxt + footHtml, 'new tag-new', 'NEW') : '';
    dual = !!(cur && to);
    html = oldWin + newWin;
  }
  $('#card').classList.toggle('dual', dual);
  $('#card').classList.toggle('mini', mini);
  $('#card').innerHTML = html;
}

/* ---------- bottom bar ---------- */
function renderBottom(){
  const d = dev(), curA = S.att[S.sel];
  const list = cargoList(), cm = list[S.cargoIdx];
  const room = cm ? hasRoom(S.sel, cm.id) : true;
  const fits = cm ? room && (isPylon(cm.id) || wouldFit(S.sel, cm.id)) : true;
  const H = (g,label,attrs='',cls='')=>`<div class="hint ${cls}" ${attrs}>${g}<span>${label}</span></div>`;
  let left = '';
  if(S.picker){
    left += H(glyph('dpad'),'Browse','data-act="none"');
    left += H(glyph('A'),'Select body','data-act="a"');
    left += H(glyph('B'),'Cancel','data-act="b"');
  }else if(S.focus==='body'){
    left += H(glyph('LT')+glyph('RT'), flag('bodyButton') ? 'Switch body' : 'Change body','data-act="none"');
    if(!flag('bodyButton')) left += H(glyph('A'),'Body list','data-act="a"');
    if(flag('undoRedo')) left += H(glyph('X'),'Reset build','data-act="x"');
  }else if(S.focus==='slots'){
    left += H(glyph('A'), curA?'Replace':'Choose part','data-act="a"', holdsParts(S.sel) || S.intSel!=null ?'off':'');
    left += H(glyph('X'),'Remove','data-act="x"', curA && !holdsParts(S.sel) && S.intSel==null ?'':'off');
    if(flag('listModes')) left += H(glyph('SORT'),'Sort','data-act="sort"');
    if(d==='gamepad') left += H(glyph('LT')+glyph('RT'),'Ship','data-act="none"');   // gamepad only (keyboard: Tab / Shift+Tab still work, without a hint)
  }else{
    left += H(glyph('A'), !cm ? 'Equip' : !room ? 'Cargo full' : !fits ? 'Not enough power' : curA?'Replace':'Equip','data-act="a"', (!cm||!fits)?'off':'');
    left += H(glyph('B'),'Back','data-act="b"');
    if(flag('keyStats') && S.tab!=='pylon') left += H(glyph('SORT'),'Sort','data-act="sort"');
  }
  if(!S.picker && flag('undoRedo')){
    const h = histOf();
    if(d==='gamepad')   // L3 now does Sort: on gamepad, undo is keyboard-only (Ctrl+Z); redo keeps R3
      left += `<div class="hint ${h.r.length?'':'off'}"><span class="hg" data-act="redo">${glyph('R3')}</span><span>Redo</span></div>`;
    else   // one hint for both: each glyph is its own click target
      left += `<div class="hint ${h.u.length||h.r.length?'':'off'}"><span class="hg ${h.u.length?'':'off'}" data-act="undo">${glyph('L3')}</span><span class="hg ${h.r.length?'':'off'}" data-act="redo">${glyph('R3')}</span><span>Undo / Redo</span></div>`;
  }
  const slide = flag('slideCargo'), inCargo = S.focus==='cargo';
  if(!S.picker && S.focus!=='body'){
    // with the slide-in cargo, categories only matter while it is open, and build-wide actions only while it is closed
    if(!slide || inCargo) left += H(d==='gamepad' ? glyph('LT')+glyph('RT') : glyph('RT'),'Category','data-act="cat"');   // keyboard: Tab (Shift+Tab goes back)
  }
  // Remove all: only when something is mounted, in the socket list and on the Body row (switching Body lands there)
  if(!S.picker && (!slide || !inCargo) && Object.keys(S.att).length) left += H(glyph('Y'),'Remove all','id="hAll" data-hold="all"','hold');
  left += H(glyph('RS'),'Rotate','data-act="none"');
  const pref = { gamepad:'GAMEPAD', keyboard:'KEYBOARD', auto:'AUTO' }[S.inputPref];
  $('#bottom').innerHTML = `<div class="hints">${left}</div>
    <div class="rightbar">
      <button class="inputpill" id="pill" title="Mockup only: switch the input hints">INPUT · ${pref}</button>
      ${flag('intro') ? H(glyph('GUIDE'),'Guide','data-act="guide" title="How crafting works"','guidehint') : ''}
      <div class="leave" id="hLeave" data-hold="leave">${glyph('START')}<span>HOLD TO LEAVE</span></div>
    </div>`;
}

/* ---------- local save: builds survive a page refresh ---------- */
// every version keeps its own save; a version that has none yet starts from the 0.4.0 one
const SAVE_KEY = 'crafting.save.' + STORE_VER, LEGACY_SAVE_KEY = 'crafting.save.v1';
let lastSave = '';
function saveLocal(){
  const builds = { ...S.builds, [BODY.id]: S.att };
  const data = JSON.stringify({ body:BODY.id, builds, cargo:S.cargo });
  if(data===lastSave) return;
  try{ localStorage.setItem(SAVE_KEY, data); lastSave = data; }catch(e){}
}
function loadLocal(){
  let d; try{ d = JSON.parse(localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY)); }catch(e){}
  if(!d || !d.builds) return;
  // drop anything the current catalogue no longer knows (renamed modules, custom .glb bodies)
  const okAtt = a => Object.fromEntries(Object.entries(a||{}).filter(([,v]) => v && ITEMS[v.id] && (v.t==='pyl')===isPylon(v.id)));
  const builds = {};
  // modules added to the catalogue after the save start with a full stack
  const cargo = Object.fromEntries(Object.keys(MODS).map(id => [id, Math.max(0, +(d.cargo?.[id] ?? STACK) || 0)]));
  for(const [id,a] of Object.entries(d.builds)){
    if(BODIES[id]) builds[id] = okAtt(a);
    else for(const v of Object.values(okAtt(a))) if(v.t==='mod') cargo[v.id] = (cargo[v.id]||0) + 1;   // Body gone: parts back to cargo
  }
  for(const [id,a] of Object.entries(builds)){
    const L = layout(a, BODIES[id]), keep = {};
    for(const [k,v] of Object.entries(a)){ if(L.byId[k]) keep[k] = v; else if(v.t==='mod') cargo[v.id] = (cargo[v.id]||0) + 1; }
    builds[id] = keep;
  }
  if(BODIES[d.body]) BODY = BODIES[d.body];
  S.att = builds[BODY.id] || {}; delete builds[BODY.id];
  S.builds = builds; S.cargo = cargo;
  S.sel = navOrder(layout(S.att))[0] || BODY.sockets[0].id;
}

function renderAll(){
  LY = layout(S.att); T0 = calc(S.att);
  saveLocal();
  if(!LY.byId[S.sel]) S.sel = navOrder(LY)[0] || BODY.sockets[0].id;
  PV = computePreview();
  renderLeft(); renderRight(); renderShip(); renderCard(); renderBottom(); renderPicker();
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
let toastT;
function toast(msg,kind=''){
  const el = $('#toast'); el.textContent = msg; el.className = 'show '+kind;
  clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove('show'),1800);
}
function flash(sid){ S.flash = sid; S.flashT = performance.now(); renderAll(); setTimeout(()=>{ if(S.flash===sid){ S.flash=null; renderAll(); } },900); }

function selectSlot(id){ S.sel = id; S.intSel = null; S.cargoIdx = 0; S.hoverCargo = null; LY = layout(S.att); ensureTab(); }
function moveSel(dir){
  S.hoverCargo = S.hoverRemove = null;
  if(S.focus==='slots'){
    // the integrated modules close the list: they can be walked through (their info shows in the card) but never changed
    const ints = BODY.unknown ? [] : (BODY.integrated || []);
    if(S.intSel!=null){
      const j = S.intSel + dir;
      if(j < 0){ S.intSel = null; S.hoverSlot = S.sel; }      // back up to the last real socket
      else if(j < ints.length) S.intSel = j;
      renderAll(); $('.slot.sel')?.scrollIntoView({ block:'nearest' });
      return;
    }
    const order = navOrder(LY), i = order.indexOf(S.sel);
    if(dir>0 && i===order.length-1 && ints.length){ S.intSel = 0; S.hoverSlot = null; renderAll(); $('.slot.sel')?.scrollIntoView({ block:'nearest' }); return; }
    if(dir<0 && i<=0){ S.focus = 'body'; S.hoverSlot = null; renderAll(); return; }
    const j = Math.max(0,Math.min(order.length-1,i+dir));
    if(j!==i) selectSlot(order[j]);
    // keyboard/gamepad navigation counts as "hovering" the row you land on, same as the mouse: computePreview()
    // shows the removal preview for a mounted module under S.hoverSlot regardless of which device set it
    if(!noSel()) S.hoverSlot = S.sel;
  }else{
    const n = cargoList().length; if(!n) return;
    S.cargoIdx = Math.max(0,Math.min(n-1,S.cargoIdx+dir));
  }
  renderAll();
  if(S.focus==='cargo') $('.cg-row.sel')?.scrollIntoView({block:'nearest'});
  else $('.slot.sel')?.scrollIntoView({block:'nearest'});
}
function cycleSort(){
  if(!flag('keyStats') || S.tab==='pylon') return;
  S.sort = SORT_ORDER[(SORT_ORDER.indexOf(S.sort)+1) % SORT_ORDER.length];
  S.cargoIdx = 0; S.hoverCargo = null; renderAll();
}
function cycleCat(dir){
  const i = TAB_ORDER.indexOf(S.tab); S.tab = TAB_ORDER[(i+dir+TAB_ORDER.length)%TAB_ORDER.length];
  S.cargoIdx = 0; S.hoverCargo = null; renderAll();
}
function equip(id, sid=S.sel){
  if(unknownShip()) return;
  const it = ITEM(id); if(!it || !(isPylon(id) || S.cargo[id]>0) || !canMount(id, LY.byId[sid])) return;
  if(holdsParts(sid)){ toast('REMOVE THE PARTS ON THIS ARM FIRST','bad'); return; }
  const pre = makePreview(sid,id);
  if(!pre.fits){ toast('NOT ENOUGH POWER','bad'); return; }
  if(!pre.room){ toast('CARGO FULL','bad'); return; }
  record(`${it.name} ${S.att[sid] ? 'replaced ' + ITEM(S.att[sid].id).name : 'equipped'}`);
  const r = attachTo(S.att, S.cargo, sid, id);
  S.att = r.att; S.cargo = r.cargo;
  S.focus = 'slots'; S.hoverCargo = null; S.cargoIdx = 0;
  const extra = r.ret.length;
  if(isPylon(id)){
    const first = `${sid}.0`; LY = layout(S.att); if(LY.byId[first]) S.sel = first; ensureTab();
    toast(`${it.name.toUpperCase()} INSTALLED · ${outputsOf(it).length} OUTPUT SOCKET${outputsOf(it).length>1?'S':''}`);
  }else toast(`${it.name.toUpperCase()} EQUIPPED${extra?` · ${extra} RETURNED TO CARGO`:''}`);
  flash(sid);
}
function unequip(sid=S.sel){
  if(unknownShip()) return;
  const a = S.att[sid]; S.hoverRemove = null;
  if(!a){ toast('SOCKET ALREADY EMPTY','info'); renderAll(); return; }
  if(holdsParts(sid)){ toast('REMOVE THE PARTS ON THIS ARM FIRST','bad'); renderAll(); return; }
  const r = attachTo(S.att, S.cargo, sid, null);
  if(cargoSlots(r.cargo) > CARGO_SLOTS){ toast('CARGO FULL','bad'); renderAll(); return; }
  record(`${ITEM(a.id).name} removed`);
  S.att = r.att; S.cargo = r.cargo;
  toast(r.ret.length>1 ? `${r.ret.length} PARTS MOVED TO CARGO` : `${ITEM(a.id).name.toUpperCase()} MOVED TO CARGO`,'info');
  flash(sid);
}
/* ---------- "undoRedo" experiment: undo / redo of build changes, reset build ----------
   History is kept per Body and stores only the attachments. Cargo is never restored from a
   snapshot (it is shared by all Bodies): undo/redo moves the difference between the two builds
   in or out of cargo, and refuses if cargo cannot cover it. */
const HIST_MAX = 30;
const histOf = () => S.hist[BODY.id] || (S.hist[BODY.id] = { u:[], r:[] });
function record(label){
  if(!flag('undoRedo')) return;
  const h = histOf(); h.u.push({ att:S.att, label }); if(h.u.length > HIST_MAX) h.u.shift(); h.r = [];
}
// cargo after swapping the current build for `target`, or null if cargo cannot cover it
function cargoFor(target){
  const C = { ...S.cargo };
  for(const a of Object.values(S.att)) if(!isPylon(a.id)) C[a.id] = (C[a.id]||0)+1;
  for(const a of Object.values(target)) if(!isPylon(a.id)) C[a.id] = (C[a.id]||0)-1;
  return Object.values(C).some(v => v<0) || cargoSlots(C) > CARGO_SLOTS ? null : C;
}
function stepHistory(dir){                  // dir -1 = undo, +1 = redo
  if(!flag('undoRedo')) return;
  const h = histOf(), from = dir<0 ? h.u : h.r, to = dir<0 ? h.r : h.u, word = dir<0 ? 'UNDO' : 'REDO';
  const e = from[from.length-1];
  if(!e){ toast(`NOTHING TO ${word}`,'info'); return; }
  const C = cargoFor(e.att);
  if(!C){ toast(`CAN'T ${word} · CARGO`,'bad'); return; }
  from.pop(); to.push({ att:S.att, label:e.label });
  S.att = e.att; S.cargo = C; S.hoverCargo = S.hoverRemove = null;
  if(S.focus==='cargo') S.focus = 'slots';
  toast(`${word} · ${e.label.toUpperCase()}`,'info'); renderAll();
}
function resetBuild(){
  if(unknownShip()) return;
  // back to the Body's starting build; parts missing from cargo are left out
  const def = DEFAULT_ATT[BODY.id] || {}, C = { ...S.cargo }, att = {};
  for(const a of Object.values(S.att)) if(!isPylon(a.id)) C[a.id] = (C[a.id]||0)+1;
  for(const k of Object.keys(def).sort((x,y) => x.length-y.length)){
    const a = def[k], parent = k.includes('.') ? k.slice(0, k.lastIndexOf('.')) : null;
    if(parent && !att[parent]) continue;
    if(isPylon(a.id)) att[k] = a;
    else if(C[a.id] > 0){ att[k] = a; C[a.id]--; }
  }
  if(cargoSlots(C) > CARGO_SLOTS){ toast('CARGO FULL','bad'); return; }
  if(JSON.stringify(att)===JSON.stringify(S.att)){ toast('ALREADY THE STARTING BUILD','info'); return; }
  record('Reset build');
  S.att = att; S.cargo = C; S.focus = 'slots'; S.sel = navOrder(layout(att))[0] || BODY.sockets[0].id;
  toast(`${BODY.name} · STARTING BUILD RESTORED`,'info'); renderAll();
}

/* ---------- "intro" experiment: first-time guide ---------- */
const INTRO_KEY = 'crafting.intro.seen';
function openIntro(){ if(!flag('intro')) return; S.intro = true; renderIntro(); }
function closeIntro(){ S.intro = false; try{ localStorage.setItem(INTRO_KEY,'1'); }catch(e){} renderIntro(); }
function renderIntro(){
  const el = $('#intro'); if(!el) return;
  if(!S.intro){ el.classList.remove('show'); el.innerHTML = ''; return; }
  const card = (icon, title, body) => `<div class="in-card"><div class="in-ic">${icon}</div><b>${title}</b><p>${body}</p></div>`;
  el.innerHTML = `<div class="in-box">
    <div class="in-head">CRAFTING · HOW IT WORKS</div>
    <div class="in-grid">
      ${card(`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>`, 'BODY',
        `The core of your ship. It has 2 integrated weapons and 1 integrated engine that give its base damage and speed and cannot be changed. Its sockets come in three sizes: ${sg(1,16)} P1 · ${sg(2,16)} P2 · ${sg(3,16)} P3. A socket only takes parts of its own size.`)}
      ${card(ico('pylon'), 'ARMS',
        'Unlimited. An <b>Extension</b> (Body sockets only) moves a socket outward; a <b>Split</b> turns one socket into two smaller ones.')}
      ${card(ico('primary'), 'MODULES',
        `Weapons and engines come from cargo: 25 slots, up to 14 identical parts per slot. The coloured LV tag before a name shows its rarity (LV1 to LV7)${flag('typeShape') ? `. The left end of a row shows the type: <span class="tsh pri"></span>primary <span class="tsh sec"></span>secondary <span class="tsh eng"></span>engine` : ''}.`)}
      ${card(ico('power'), 'POWER &amp; HEAT',
        'Modules draw power from the Body generator and you cannot go over it. Primary weapons heat up and always overheat in the end: the Body heatsink decides how long you can fire and how fast you cool down.')}
    </div>
    <div class="in-foot"><span>Reopen this guide any time from <b>GUIDE</b> in the bottom bar (${glyph('GUIDE')}${dev()==='keyboard'?'':' short press'})</span>
      <button class="in-go" data-intro-close>${glyph('A')} START CRAFTING</button></div>
  </div>`;
  el.classList.add('show');
}

/* ---------- DEBUG (mockup only, not part of the game): random legal build ---------- */
// Walks the sockets breadth-first and fills each with an arm, a module or nothing, following
// the same rules as the player: socket size, extensions only on Body sockets, power budget,
// modules taken from cargo, cargo slot limit.
function randomBuild(){
  if(unknownShip()) return;
  const pick = a => a[Math.floor(Math.random()*a.length)];
  for(let attempt=0; attempt<20; attempt++){
    const C = { ...S.cargo };
    for(const k of Object.keys(S.att)) if(!isPylon(S.att[k].id)) C[S.att[k].id] = (C[S.att[k].id]||0)+1;
    let att = {};
    const queue = BODY.sockets.map(b => b.id);
    while(queue.length){
      const sid = queue.shift(), s = layout(att).byId[sid]; if(!s) continue;
      const arms = Object.values(PYLONS).filter(p => p.size===s.size && canMount(p.id, s));
      if(arms.length && Math.random() < (s.parent ? .25 : .4)){
        const p = pick(arms); att = { ...att, [sid]:P(p.id) };
        outputsOf(p).forEach((_,i) => queue.push(`${sid}.${i}`));
        continue;
      }
      const mods = Object.values(MODS).filter(m => m.size===s.size && C[m.id]>0 && calc({ ...att, [sid]:M(m.id) }).power <= BODY.generator);
      if(mods.length && Math.random() < .9){ const m = pick(mods); att = { ...att, [sid]:M(m.id) }; C[m.id]--; }
    }
    if(cargoSlots(C) > CARGO_SLOTS) continue;
    record('Random build');
    S.att = att; S.cargo = C; S.focus = 'slots'; S.sel = navOrder(layout(att))[0];
    toast(`DEBUG · RANDOM BUILD · ${Object.keys(att).length} PARTS`,'info'); renderAll();
    return;
  }
  toast('DEBUG · NO LEGAL RANDOM BUILD FOUND','bad');
}

function removeAll(){
  if(unknownShip()) return;
  const n = Object.keys(S.att).length, C = { ...S.cargo };
  for(const k of Object.keys(S.att)) if(!isPylon(S.att[k].id)) C[S.att[k].id] = (C[S.att[k].id]||0)+1;
  if(cargoSlots(C) > CARGO_SLOTS){ toast('CARGO FULL','bad'); return; }
  if(n) record('Remove all');
  S.cargo = C; S.att = {}; S.focus = 'slots'; S.sel = BODY.sockets[0].id;
  toast(n?`${n} PARTS MOVED TO CARGO`:'NOTHING TO REMOVE','info'); renderAll();
}
function act(name){
  S.hoverCargo = S.hoverRemove = null;
  if(S.intro){ if(name==='a' || name==='b') closeIntro(); return; }
  if(name==='view'){ setView(!S.view); return; }
  if(S.view){ if(name==='b') setView(false); return; }
  if(S.picker){
    ({ left:()=>pickMove(-1), right:()=>pickMove(1), up:()=>pickMove(-2), down:()=>pickMove(2), a:confirmPick, b:closePicker })[name]?.();
    return;
  }
  if(name==='undo' || name==='redo'){ stepHistory(name==='undo' ? -1 : 1); return; }
  if(name==='guide'){ openIntro(); return; }
  if(S.focus==='body'){
    ({ left:()=>stepBody(-1), right:()=>stepBody(1), catPrev:()=>stepBody(-1), catNext:()=>stepBody(1), down:()=>{ S.focus='slots'; renderAll(); }, a:()=>{ if(!flag('bodyButton')) openPicker(); },
       x:()=>{ if(flag('undoRedo')) resetBuild(); } })[name]?.();
    return;
  }
  switch(name){
    case 'up': moveSel(-1); break;
    case 'down': moveSel(1); break;
    case 'a':
      if(S.focus==='slots'){
        if(unknownShip()) return;
        if(S.intSel!=null){ toast('INTEGRATED · CANNOT BE CHANGED','info'); return; }
        if(holdsParts(S.sel)){ toast(`LOCKED · ${partsOn(S.sel)} PART${partsOn(S.sel)>1?'S':''} ON THIS ARM · REMOVE THEM FIRST`,'bad'); return; }
        if(!cargoList().length){ toast(`NOTHING FOR A ${SIZE[selSock().size].label} SOCKET IN THIS TAB`,'info'); return; }
        S.focus='cargo'; S.cargoIdx=0; renderAll();
      } else { const m = cargoList()[S.cargoIdx]; if(m) equip(m.id); }
      break;
    case 'b': if(S.focus==='cargo'){ S.focus='slots'; renderAll(); } break;
    case 'left': if(S.focus==='cargo'){ S.focus='slots'; renderAll(); } break;
    case 'x': if(S.intSel!=null){ toast('INTEGRATED · CANNOT BE CHANGED','info'); break; } unequip(S.sel); break;
    case 'sort': if(S.focus==='cargo') cycleSort(); else cycleListMode(1); break;   // same key sorts the list that has focus
    // LT / RT (Shift+Tab / Tab): categories while the cargo is open, otherwise they switch the ship
    case 'catNext': if(S.focus==='cargo') cycleCat(1); else stepBody(1); break;
    case 'catPrev': if(S.focus==='cargo') cycleCat(-1); else stepBody(-1); break;
  }
}

/* ---------- view mode: full-screen ship, no UI ---------- */
function setView(on){
  S.view = on; S.hoverSlot = S.hoverCargo = S.hoverRemove = null;
  stage.classList.toggle('viewmode', on);
  if(!on) window.resetPan?.();   // the camera itself stays where it is: view mode only hides the UI
  window.resizeShip?.(); renderAll();
}
const ROT = () => S.view ? { pmin:-1.45, pmax:1.45, dmin:3, dmax:45 } : { pmin:-.25, pmax:1.1, dmin:8, dmax:34 };
const clampRot = () => { const r = ROT(); S.rot.pitch = Math.max(r.pmin, Math.min(r.pmax, S.rot.pitch)); S.rot.d = Math.max(r.dmin, Math.min(r.dmax, S.rot.d)); };

/* ---------- Body selector ---------- */
function switchBody(id){
  if(!BODIES[id] || id===BODY.id) return;
  S.builds[BODY.id] = S.att;                 // every body keeps its own build
  BODY = BODIES[id]; S.att = S.builds[id] || {};
  S.cargoIdx = 0; S.hoverCargo = S.hoverSlot = S.hoverRemove = null; S.intSel = null;
  S.sel = navOrder(layout(S.att))[0];
  Object.assign(S.rot, homeRot());
  window.setShipBody?.();
  toast(shipName(BODY),'info');
  renderAll();
}
function stepBody(dir){ const i = BODY_LIST.indexOf(BODY.id); switchBody(BODY_LIST[(i+dir+BODY_LIST.length)%BODY_LIST.length]); }
function openPicker(){ S.picker = true; S.pickIdx = BODY_LIST.indexOf(BODY.id); renderAll(); }
function closePicker(){ S.picker = false; renderAll(); }
function pickMove(d){ S.pickIdx = Math.max(0,Math.min(BODY_LIST.length-1,S.pickIdx+d)); renderAll(); }
function confirmPick(){ const id = BODY_LIST[S.pickIdx]; S.picker = false; S.focus = 'slots'; if(id===BODY.id) renderAll(); else switchBody(id); }

const bodyCounts = b => { const c = {1:0,2:0,3:0}; b.sockets.forEach(s => c[s.size]++); return c; };
// top-view schematic of a body's sockets
function schematic(b){
  const ext = Math.max(...b.sockets.map(s => Math.max(Math.abs(s.pos[0]),Math.abs(s.pos[2]))), b.look?.r[0]||1, 2)*1.25;
  const rx = b.look ? b.look.r[0] : ext*.5, rz = b.look ? b.look.r[2] : ext*.7;
  const shapes = b.sockets.map(s => {
    const r = ext*.075*(s.size===3?1.5:s.size===2?1.2:1), x = s.pos[0], y = -s.pos[2], c = SIZE[s.size].color;
    return SIZE[s.size].shape==='tri' ? `<path d="M${x} ${y-r}L${x+r*.95} ${y+r*.7}L${x-r*.95} ${y+r*.7}Z" fill="${c}"/>`
         : SIZE[s.size].shape==='sq'  ? `<rect x="${x-r*.8}" y="${y-r*.8}" width="${r*1.6}" height="${r*1.6}" fill="${c}"/>`
         : `<circle cx="${x}" cy="${y}" r="${r*.9}" fill="${c}"/>`;
  }).join('');
  return `<svg class="schem" viewBox="${-ext} ${-ext} ${2*ext} ${2*ext}"><ellipse cx="0" cy="0" rx="${rx}" ry="${rz}" fill="#171b20" stroke="#3a3f46" stroke-width="${ext*.02}"/>${shapes}</svg>`;
}
function renderPicker(){
  const el = $('#picker'); if(!el) return;
  if(!S.picker){ el.classList.remove('show'); el.innerHTML = ''; return; }
  const cards = BODY_LIST.map((id,i) => {
    const b = BODIES[id], c = bodyCounts(b), mounted = Object.keys(id===BODY.id ? S.att : (S.builds[id]||{})).length;
    return `<div class="bcard ${id===BODY.id?'cur':''} ${i===S.pickIdx?'sel':''}" data-bcard="${i}">
      <div class="bc-head"><b>${b.name}</b>${id===BODY.id?'<span class="bc-use">IN USE</span>':''}</div>
      <div class="bc-mid">${schematic(b)}
        <div class="bc-stats">
          <div><span>INTEGRITY</span><b>${fmt(b.integrity)}</b></div>
          <div><span>SHIELD</span><b>${fmt(b.shield)}</b></div>
          <div><span>GENERATOR POWER</span><b>${b.generator}</b></div>
          <div><span>HEAT CAPACITY</span><b>${b.heatCap}</b></div>
          <div><span>COOLING</span><b>${b.heatCool}/s</b></div>
          <div><span>BOOST CHARGE</span><b>${b.boost}</b></div>
          <div><span>VALUE</span><b>${fmt(b.value||0)}</b></div>
        </div></div>
      <div class="bc-foot"><span class="bc-cnt">${SIZE_ORDER.filter(n=>c[n]).map(n=>`${sg(n,16)}<b>×${c[n]}</b>`).join('')}</span><span class="bc-mnt">${mounted?`${mounted} parts mounted`:'empty build'}</span></div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="pk-head">SELECT BODY<small>${unlockedBodies()} / ${BODIES_IN_GAME} UNLOCKED</small></div><div class="pk-grid">${cards}</div>`;
  el.classList.add('show');
}

/* ---------- hold-to-confirm (leave / remove all) ---------- */
const HOLD_MS = 900, holds = {};
const holdEls = { leave:'#hLeave', all:'#hAll' };
// a hold that is released early counts as a tap: X in the socket list = tap sorts, hold unequips
function holdStart(id){
  if(holds[id]) return;
  holds[id] = { t0: performance.now(), done:false };
  (function tick(){
    const h = holds[id]; if(!h) return;
    const p = Math.min(1,(performance.now()-h.t0)/HOLD_MS);
    const el = $(holdEls[id]); if(el) el.style.setProperty('--p',p);
    if(p>=1 && !h.done){ h.done = true; holdDone(id); }
    if(!h.done) requestAnimationFrame(tick);
  })();
}
function holdEnd(id){
  if(!holds[id]) return; delete holds[id];
  const el = $(holdEls[id]); if(el) el.style.setProperty('--p',0);
}
function holdDone(id){
  const el = $(holdEls[id]); if(el) el.style.setProperty('--p',0);
  if(id==='all') removeAll();
  if(id==='leave') $('#leave-ov').classList.add('show');
  setTimeout(()=>delete holds[id],250);
}

/* =====================================================================
   INPUT — mouse
   ===================================================================== */
const stage = $('#stage');
stage.addEventListener('pointermove',e=>{
  if(S.lastInput!=='kbm') setLastInput('kbm');
  const row = e.target.closest?.('.cg-row'), sl = e.target.closest?.('[data-slot]'), un = e.target.closest?.('[data-unq]');
  const hc = row?.dataset.item || null, hr = un?.dataset.unq || null;
  let hs = sl?.dataset.slot || null;
  if(S.view) return;
  if(!drag && e.target.closest?.('#shipbox') && !e.target.closest?.('.lab3d')){ hs = pickSlot(e); setShipCursor(hs?'pointer':''); }
  const bcd = e.target.closest?.('[data-bcard]');
  if(S.picker && bcd && +bcd.dataset.bcard!==S.pickIdx){ S.pickIdx = +bcd.dataset.bcard; renderAll(); return; }
  if(S.picker) return;
  if(hc!==S.hoverCargo || hs!==S.hoverSlot || hr!==S.hoverRemove){
    S.hoverCargo=hc; S.hoverSlot=hs; S.hoverRemove=hr; renderAll();
  }
});
stage.addEventListener('pointerleave',()=>{ S.hoverCargo=S.hoverSlot=S.hoverRemove=null; renderAll(); });
stage.addEventListener('click',e=>{
  if(dragMoved) return;
  const t = e.target;
  if(t.closest('#leave-ov')){ $('#leave-ov').classList.remove('show'); return; }
  if(t.closest('#viewexit')){ setView(false); return; }
  if(S.intro){ if(t.closest('[data-intro-close]') || !t.closest('.in-box')) closeIntro(); return; }
  if(t.closest('[data-guide]')){ openIntro(); return; }
  if(flag('slideCargo') && S.focus==='cargo' && !t.closest('#cargoPanel') && !t.closest('#bottom')){ S.focus='slots'; renderAll(); return; }
  if(t.closest('[data-lmcycle]')){ S.focus = 'slots'; cycleListMode(1); return; }
    if(S.view) return;
  if(t.closest('#dbgRandom')){ randomBuild(); return; }
  if(t.closest('#pill')){ S.inputPref = { gamepad:'keyboard', keyboard:'auto', auto:'gamepad' }[S.inputPref]; renderTop(); renderAll(); return; }
  const bc = t.closest('[data-bcard]'); if(bc){ S.pickIdx = +bc.dataset.bcard; confirmPick(); return; }
  if(S.picker){ if(!t.closest('#picker')) closePicker(); return; }
  // a plain mouse click just switches ship: it doesn't move keyboard/gamepad focus onto the
  // switcher (that only happens by navigating there), so no focus outline appears on click
  const bs = t.closest('[data-bstep]'); if(bs){ stepBody(+bs.dataset.bstep); return; }
  if(t.closest('[data-bpick]')){ S.focus='body'; openPicker(); return; }
  const un = t.closest('[data-unq]'); if(un){ unequip(un.dataset.unq); return; }
  if(t.closest('[data-sort]')){ cycleSort(); return; }
  const lb = t.closest('.lab3d'); if(lb){ selectSlot(lb.dataset.slot); S.focus='slots'; renderAll(); return; }
  if(t.closest('#shipbox')){ const id = pickSlot(e); if(id){ selectSlot(id); S.focus='slots'; renderAll(); } return; }
  const ir = t.closest('[data-int]'); if(ir){ S.intSel = +ir.dataset.int; S.hoverSlot = null; S.focus = 'slots'; renderAll(); return; }
  const sl = t.closest('[data-slot]'); if(sl){ selectSlot(sl.dataset.slot); S.focus='slots'; if(flag('slideCargo') && !t.closest('#shipbox')) act('a'); else renderAll(); return; }
  const row = t.closest('.cg-row'); if(row){ S.focus='cargo'; S.cargoIdx=+row.dataset.i; equip(row.dataset.item); return; }
  const tab = t.closest('[data-tab]'); if(tab){ S.tab = tab.dataset.tab; S.cargoIdx = 0; renderAll(); return; }
  const h = t.closest('[data-act]'); if(h && h.dataset.act!=='none' && !h.classList.contains('off')){
    if(h.dataset.act==='cat') cycleCat(1); else act(h.dataset.act);
  }
});
stage.addEventListener('pointerdown',e=>{
  const h = e.target.closest('[data-hold]'); if(h) holdStart(h.dataset.hold);
});
addEventListener('pointerup',()=>{ holdEnd('all'); holdEnd('leave'); });

/* ship: drag = orbit, wheel = zoom, dblclick = reset.
   View mode also pans: right / middle drag, or shift + drag */
let drag=null, dragMoved=false;
$('#shipbox').addEventListener('pointerdown',e=>{
  if(e.target.closest('#viewexit')) return;
  const pan = S.view && (e.button===1 || e.button===2 || e.shiftKey);
  drag={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,yaw:S.rot.yaw,pitch:S.rot.pitch,pan}; dragMoved=false;
});
$('#shipbox').addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('pointermove',e=>{
  if(!drag) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>5) dragMoved=true;
  if(!dragMoved) return;
  if(drag.pan){ window.panShip?.((e.clientX-drag.lx)/S.scale, (e.clientY-drag.ly)/S.scale); drag.lx=e.clientX; drag.ly=e.clientY; }
  else { S.rot.yaw=drag.yaw-dx*.006; S.rot.pitch=drag.pitch+dy*.005; clampRot(); }
});
addEventListener('pointerup',()=>{ drag=null; setTimeout(()=>dragMoved=false,0); });
$('#shipbox').addEventListener('wheel',e=>{ e.preventDefault(); S.rot.d*=Math.exp(e.deltaY*.001); clampRot(); },{passive:false});
$('#shipbox').addEventListener('dblclick',()=>{ Object.assign(S.rot,homeRot()); window.resetPan?.(); });

/* =====================================================================
   INPUT — keyboard
   ===================================================================== */
addEventListener('keydown',e=>{
  if(e.repeat && !['ArrowUp','ArrowDown','w','s'].includes(e.key)) return;
  if(S.inputPref==='auto' && S.device!=='keyboard'){ S.device='keyboard'; renderTop(); renderBottom(); }
  setLastInput('kbm');
  const k = e.key;
  if(S.intro){ if(['Enter',' ','Escape','Backspace'].includes(k)){ e.preventDefault(); closeIntro(); } return; }
  if((e.ctrlKey||e.metaKey) && !S.view && (k==='z'||k==='Z'||k==='y'||k==='Y')){ e.preventDefault(); act(k.toLowerCase()==='y' || e.shiftKey ? 'redo' : 'undo'); return; }
  if((k==='h'||k==='H') && !S.view){ e.preventDefault(); openIntro(); return; }
  if(S.view){ if(k==='Escape'||k==='Backspace'){ e.preventDefault(); setView(false); } return; }
  const map = { ArrowUp:'up', w:'up', ArrowDown:'down', s:'down', Enter:'a', ' ':'a', Backspace:'b', ArrowLeft:'left', ArrowRight:'right',
                Delete:'x', x:'x', X:'x', o:'sort', O:'sort', Tab: e.shiftKey?'catPrev':'catNext' };
  if(map[k]){ e.preventDefault(); act(map[k]); return; }
  if(k==='r'||k==='R'){ holdStart('all'); }
  if(k==='Escape' && S.picker){ e.preventDefault(); closePicker(); return; }
  if(k==='Escape'){ e.preventDefault(); if($('#leave-ov').classList.contains('show')) $('#leave-ov').classList.remove('show'); else holdStart('leave'); }
});
addEventListener('keyup',e=>{
  if(e.key==='r'||e.key==='R') holdEnd('all');
  if(e.key==='Escape') holdEnd('leave');
});

/* =====================================================================
   INPUT — gamepad (standard mapping)
   ===================================================================== */
const gpPrev = {}; let gpRepeat = {};
function pollPad(){
  const pad = [...(navigator.getGamepads?.()||[])].find(Boolean);
  if(pad){
    const b = i => !!pad.buttons[i]?.pressed;
    const now = performance.now();
    const cur = { up:b(12)||pad.axes[1]<-.6, down:b(13)||pad.axes[1]>.6, left:b(14), right:b(15), a:b(0), b:b(1), x:b(2), y:b(3), lt:b(6), rt:b(7), lb:b(4), rb:b(5), start:b(9), view:b(8), l3:b(10), r3:b(11) };
    for(const k of Object.keys(cur)){
      const edge = cur[k] && !gpPrev[k];
      if(edge){
        gpRepeat[k] = now+380;
        if(S.inputPref==='auto' && S.device!=='gamepad'){ S.device='gamepad'; renderTop(); renderBottom(); }
        setLastInput('pad');
        if(S.view){ if(k==='b'||k==='view') setView(false); gpPrev[k]=cur[k]; continue; }
        if(S.intro){ if(k==='a'||k==='b') closeIntro(); gpPrev[k]=cur[k]; continue; }
        ({ up:()=>act('up'), down:()=>act('down'), left:()=>act('left'), right:()=>act('right'), a:()=>act('a'), b:()=>act('b'), x:()=>act('x'),
           lt:()=>act('catPrev'), rt:()=>act('catNext'), y:()=>holdStart('all'), start:()=>holdStart('leave'),
           l3:()=>act('sort'), r3:()=>act('redo') })[k]?.();
      }else if(cur[k] && (k==='up'||k==='down') && now>gpRepeat[k]){ gpRepeat[k]=now+90; act(k); }
      if(!cur[k] && gpPrev[k]){
        if(k==='y') holdEnd('all');
        if(k==='start'){ const h = holds.leave, tap = h && !h.done && performance.now()-h.t0 < 350; holdEnd('leave'); if(tap) act('guide'); }   // short press = guide, hold = leave
      }
      gpPrev[k]=cur[k];
    }
    const rx = pad.axes[2]||0, ry = pad.axes[3]||0;
    if(Math.abs(rx)>.2||Math.abs(ry)>.2){ S.rot.yaw-=rx*.05; S.rot.pitch+=ry*.04; clampRot(); }
    if(S.view){   // left stick = pan, triggers = zoom
      const lx = pad.axes[0]||0, ly = pad.axes[1]||0;
      if(Math.abs(lx)>.2||Math.abs(ly)>.2) window.panShip?.(-lx*14, -ly*14);
      const z = (pad.buttons[7]?.value||0) - (pad.buttons[6]?.value||0);
      if(Math.abs(z)>.05){ S.rot.d*=Math.exp(-z*.03); clampRot(); }
    }
  }
  requestAnimationFrame(pollPad);
}
addEventListener('gamepadconnected',()=>toast('GAMEPAD CONNECTED','info'));

/* =====================================================================
   BOOT
   ===================================================================== */
function fit(){ const s=Math.min(innerWidth/1920,innerHeight/1080); S.scale=s; stage.style.transform=`translate(-50%,-50%) scale(${s})`; window.resizeShip?.(); }
addEventListener('resize',fit); fit();

const bodyQuality = b => .5 * (b.integLv||0) / 7 + .5 * bestBuild('value', b) / gameMax('value');

function boot(){
  // Bodies ordered by intrinsic quality, worst to best, so ‹ › walk a progression ladder:
  // quality = ½ · integrated level / 7  +  ½ · best value the hull can reach / best value in the game.
  // Hulls mix: a rare variant of a weak hull sits above the poor variant of a stronger one.
  // Custom .glb bodies are appended later, at the end.
  BODY_LIST.sort((a,b) => bodyQuality(BODIES[a]) - bodyQuality(BODIES[b]));
  // then the locked placeholders are spread among them (U = unlocked, L = locked)
  { const U = [...BODY_LIST], L = [...UNKNOWN_LIST]; BODY_LIST.length = 0;
    for(const c of 'UULULUULULUULULUULUL') { const id = c==='U' ? U.shift() : L.shift(); if(id) BODY_LIST.push(id); } }
  loadLocal(); loadFlags(); applyFlags();
  Object.assign(S.rot, homeRot());
  $('#build').textContent = `v${APP_VERSION}`;
  renderTop(); initShip(); renderAll(); requestAnimationFrame(pollPad);
  let seen = false; try{ seen = !!localStorage.getItem(INTRO_KEY); }catch(e){}
  if(!seen) openIntro();
  fetch('version.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{
    $('#build').title = `build ${v.version} · ${v.sha} · ${v.date}`;   // CI details only on hover
  }).catch(()=>{});
}
