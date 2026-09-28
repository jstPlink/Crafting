# Crafting — riferimento tecnico e funzionale

Documento unico che descrive **come funziona tutta l'app**. Va letto prima di toccare il codice e va
**aggiornato quando cambia qualcosa che descrive** (vedi "Quando aggiornare" in fondo).
Le funzioni sono citate per nome, non per riga: i numeri di riga cambiano.

## 1. Cos'è

Un mockup della schermata "Crafting" di un gioco spaziale (stazione "Marianan Station"): il giocatore
sceglie un **Body** (scafo), monta **Arms** (bracci) e **moduli** (armi, motori) sui suoi socket, e
vede in tempo reale statistiche, potenza, calore e valore della nave. È pensata per **gamepad**, con
tastiera e mouse come alternative. Non c'è backend: tutto vive nel browser.

- Stack: HTML + CSS + JavaScript vanilla, **nessun build step**, nessun framework.
- 3D: three.js r147 (`mockup/vendor/three.min.js`, `GLTFLoader.js`), script classici (funziona anche da `file://`).
- Render UI: stringhe HTML assegnate con `innerHTML` (niente virtual DOM).
- Persistenza: `localStorage`, chiave `crafting.save.v1`.
- Lingua dell'interfaccia: inglese. Terminologia: lo scafo si chiama **Body**, i bracci si chiamano **Arms**, ma **nel codice sono ancora `pylon` / `PYLONS` / `'pyl'`**.

## 2. File del repository

| Percorso | Contenuto |
|---|---|
| `mockup/index.html` | Markup dei contenitori vuoti + **tutto il CSS** (nel tag `<style>`) + caricamento script e `boot()` |
| `mockup/app.js` | Dati (catalogo, body), stato, calcoli, rendering UI, azioni, input mouse/tastiera/gamepad, salvataggio, boot |
| `mockup/ship3d.js` | Vista 3D three.js: scafo procedurale, moduli, outline, camera, picking, caricamento `.glb` |
| `mockup/switcher.js` | Due pulsanti in alto a destra, ognuno con la sua finestra: **versione** (elenco versioni) e **FEATURES** (interruttori). Condiviso da tutte le versioni |
| `mockup/versions.js` | Manifest delle versioni congelate (`window.CRAFTING_VERSIONS`), scritto da `scripts/snapshot.py` |
| `mockup/versions/<v>/` | **Snapshot congelati** (`index.html`, `app.js`, `ship3d.js`) di ogni versione rilasciata. Non si modificano a mano |
| `scripts/snapshot.py` | Congela la copia di lavoro come nuova versione |
| `mockup/vendor/` | `three.min.js` e `GLTFLoader.js` (non modificare) |
| `Dockerfile`, `docker/nginx.conf`, `docker-compose.yml` | Deploy: nginx serve `mockup/` |
| `.github/workflows/docker.yml` | CI: build multi-arch e push su `ghcr.io/jstplink/crafting` |
| `.claude/launch.json` | Dev server: `python scripts/devserver.py 6480` (nome config: `mockup`) |
| `scripts/devserver.py` | Come `python -m http.server` su `mockup/`, ma con `Cache-Control: no-store`, così il browser non tiene script / `versions.js` vecchi |
| `docs/APP.md` | Questo file |

Ordine di caricamento in `index.html`: `three.min.js` → `GLTFLoader.js` → `app.js` → `ship3d.js` → `boot()` → `versions.js` → `switcher.js`.
`app.js` e `ship3d.js` condividono **variabili globali** (nessun modulo ES): `ship3d.js` usa `S`, `LY`, `PV`,
`BODY`, `SIZE`, `ITEM`, `layout()`, `renderAll()`, `toast()`, `$`; `app.js` chiama `initShip`, `renderShip`,
`pickSlot`, `setShipCursor`, `window.setShipBody/resizeShip/panShip/resetPan`.

## 3. Come si esegue

- Dev: preview `mockup` (porta 6480), oppure aprire `mockup/index.html` da `file://`.
- Debug URL: `?model=<url.glb>` carica un body personalizzato.
- Docker: `docker compose up -d --build` → `http://localhost:6480`. In produzione l'immagine viene da `ghcr.io/jstplink/crafting:latest`.
- `version.json` è generato dal Dockerfile (versione CI `1.0.<run>`, sha, data). In locale non esiste. La scritta build mostra solo `v<APP_VERSION>`; i dettagli CI (build, sha, data) sono nel tooltip (`title`) quando `version.json` esiste. Il pulsante versione (stessa scritta) apre il menu versioni (§3b).
- **Versione app**: `APP_VERSION` in `app.js` (oggi `6.0`) va incrementata a ogni versione e la versione va congelata con `scripts/snapshot.py` (§3b).
- nginx serve html/js con `no-cache` e `vendor/` con cache di 7 giorni.
- **Cache-busting** (Dockerfile): a ogni build ogni `src="….js"` locale di **ogni** `index.html` (radice e `versions/<v>/`) riceve `?v=<sha>`, così né browser né CDN mischiano script vecchi con html nuovo. Gli script nuovi che si aggiungono a un `index.html` sono coperti in automatico (purché locali e senza `?`).

## 3b. Versioning: provare versioni diverse dall'app

Obiettivo: poter aprire **qualsiasi versione passata** dell'app e confrontarne il "feeling", restando nell'app.

- **Radice del sito (`/`) = LATEST**: la copia di lavoro, sempre la versione più nuova. Si sviluppa qui.
- **`/versions/<v>/index.html` = snapshot congelato** di una versione rilasciata (immutabile). Le librerie `vendor/`, `versions.js` e `switcher.js` restano condivise alla radice (lo script riscrive i percorsi in `../../`).
- **Numerazione**: `major.minor` (**4.0, 4.2, 4.3, 5.0, 6.0**…). Le prime versioni erano state pubblicate come `0.4.0 … 0.5.0`: i **tag git storici** (`v0.4.0`, `v0.4.1`, `v0.4.2`, `v0.4.3`, `v0.5.0`) restano, con alias nel nuovo formato (`v4.0`, `v4.2`, `v4.3`, `v5.0`); dalla 6.0 i tag sono già nel nuovo formato (`v6.0`); quelle versioni **mantengono le vecchie chiavi di salvataggio** (`crafting.save.0.4.3`, `crafting.save.0.5.0`, `crafting.flags.0.4.3/5.0`; in `app.js` la mappa `STORE_VER`); la **6.0 usa chiavi nuove** `crafting.save.6.0` / `crafting.flags.6.0` (senza salvataggio proprio parte da `crafting.save.v1`, non da quello della 5.0).
- **Una versione nuova si inizia solo quando lo dice l'utente.** Fino ad allora ogni modifica entra nella versione corrente, che al commit si **ricongela** con `snapshot.py <v> --force`.
- **Menu in-app**: click sul **pulsante versione** in alto a destra, sotto i crediti (riquadro `v5.0 ▾`, stile in `switcher.js`, quindi identico in tutte le versioni). Apre la finestra **VERSION** (LATEST e ogni versione del manifest con data e note, per passare da una all'altra). Subito a sinistra c'è un **secondo pulsante, FEATURES ▾** (`#featbtn`, posizionato da `switcher.js` accanto al pulsante versione), che apre la sua finestra con gli interruttori (§3c), ognuno con la **versione in cui è stato aggiunto** (`since`). Una finestra alla volta: aprirne una chiude l'altra; click fuori le chiude. Le versioni senza `craftingExperiments` (4.0, 4.2) non hanno il pulsante FEATURES. Solo mouse (è uno strumento da mockup, come la pill INPUT). Il menu è dentro `#stage`, quindi sparisce in view mode.
- **Salvataggi separati per versione**: chiave `localStorage` = `saveKey` dell'entry nel manifest (default `crafting.save.<versione>`; 4.0 e 4.2 usano quella storica `crafting.save.v1`). Non c'è più un modo per copiare le build tra versioni dal menu (il pulsante COPY BUILD HERE è stato tolto).
- **Feature (flag)**: una versione può esporre `window.craftingExperiments = { items(), toggle(id) }` (`items` → `{id, label, desc, on, since}`); la finestra FEATURES mostra ogni voce come interruttore ON/OFF con il tag della versione di origine. Serve a combinare/confrontare singole funzioni **dentro la stessa versione** (gli snapshot servono invece a confrontare versioni intere).
- Le versioni congelate non hanno gli esperimenti nuovi (sono codice vecchio); hanno solo il menu, aggiunto dallo script.
- Se una versione non ha ancora un salvataggio proprio, `loadLocal` parte da quello storico `crafting.save.v1` (la 4.3 ha ereditato così la build della 4.2); da lì in poi scrive solo sulla propria chiave.

### Procedura di rilascio
**Versione nuova (solo quando lo chiede l'utente):**
1. Finire le modifiche in `mockup/` e impostare `APP_VERSION` (formato `major.minor`) in `mockup/app.js`.
2. Aggiornare questo documento **solo se serve** (§15) e aggiungere la riga della versione alla tabella "Versioni" se la versione è significativa.
3. `python scripts/snapshot.py <versione> --notes "<una riga>"` (fallisce se `APP_VERSION` non coincide o se lo snapshot esiste già).
4. Commit (incluse `mockup/versions/<v>/` e `mockup/versions.js`), poi `git tag v<versione>`, poi push.
**Commit dentro la versione corrente:** `python scripts/snapshot.py <versione corrente> --force` (tiene `saveKey` e note già nel manifest), commit, push; il tag non cambia.
- Non modificare mai a mano una cartella `versions/<v>/`. Se serve correggerla: `--force`, e dirlo nel commit. (Unica eccezione fatta: la rinumerazione `0.x.y → x.y`, che ha cambiato `APP_VERSION` e fissato le vecchie chiavi di salvataggio negli snapshot.)
- Se una nuova versione cambia il formato del salvataggio, `loadLocal` deve restare tollerante (scarta id sconosciuti) o gestire la migrazione.

### Versioni
| Versione | Note |
|---|---|
| 4.0 | Baseline (tag `v0.4.0` = commit `685adf4`): Body/Arms, parametri moduli, slot cargo, view mode. Salvataggio `crafting.save.v1` |
| 4.1 | Solo cache-busting nel Dockerfile (commit `ccb8dc9`). Nessuno snapshot: UI identica alla 4.0 |
| 4.2 | Colori per tipo di modulo di nuovo attivi (rosso primary, giallo secondary, blu engine), scritta build ridotta a `v<versione>`. Snapshot **retroattivo** dal commit `da61880`. Salvataggio `crafting.save.v1` |
| 5.0 | Grande passata UX + regole: rarità a targhetta LVn con sfumatura, tipo modulo dalla forma della riga, cargo a scomparsa e overview verticale, viste della lista socket, annulla/ripristina/reset, guida iniziale, etichette 3D, nuovo modello del calore (fire time / cooldown), solo le foglie si cambiano, DPS/valore/velocità valutati sul massimo del gioco, loadout quality, Body con moduli integrati in 3 varianti (Rusted / Ranger / Elite, 12 Body). Ogni intervento UX è un esperimento ON/OFF (§3c). Salvataggio `crafting.save.0.5.0` |
| 6.0 | Grande riordino del layout: **colonna sinistra unica** (pannello nave ‹ NOME › `n / 20` con LT/RT solo gamepad, overview compatto su 2 righe senza barra della potenza, lista socket con un solo pulsante di vista e blocco INTEGRATED collassabile), **card dei dettagli stretta (210px) sul bordo destro** con descrizione fittizia di 20 parole, vista 3D estesa a tutta la larghezza, cargo che copre solo la lista socket con BACK e SORT su una riga, diff dei costi (power/heat) in rosso, socket sullo scafo non più emissive, **lista di 20 navi con 8 sconosciute segnaposto** (nome `?????`, scena vuota). Non ci sono nuovi interruttori. Salvataggio `crafting.save.6.0` |
| 4.3 | Leggibilità: testo più grande e più contrasto, stat chiave su ogni riga + delta + BEST + ordinamento cargo, overview più chiara. Ogni intervento è un esperimento ON/OFF (§3c). Salvataggio `crafting.save.0.4.3` |

## 3c. Esperimenti (flag) della 4.3, della 5.0 e della 6.0

Interruttori nella finestra del pulsante **FEATURES** (in alto a destra, accanto al pulsante versione), tutti ON di default, salvati in `localStorage` (`crafting.flags.<versione>`), ognuno con `since` = versione che l'ha aggiunto.
**Promossi a comportamento standard (non più interruttori, sempre attivi, `ALWAYS_ON`)**: `bigText` "Readable text", `overview` "Clearer overview", `slideCargo` "Slide-in cargo", `bodyButton` "Body switcher" (dalla 6.0) — le loro righe qui sotto descrivono il comportamento, che ora c'è sempre.
Definiti in `app.js`: `FLAGS`, `flag(id)`, `loadFlags`, `applyFlags`, `window.craftingExperiments`. Con **tutti spenti l'app è uguale alla 4.2**.
I primi tre sono della 4.3; dalla 5.0 anche `rarityTag`, `typeShape`, `blockedReason`, `undoRedo`, `intro`, `socketLabels`, `compactCard`, `listModes`, `maxRatings`, `slideCargo`, `stackBadge`, `rarityFade`, `shipQuality` (tutti ON di default).

| Flag | Cosa cambia | Dove |
|---|---|---|
| `bigText` "Readable text" | Font più grandi (etichette maiuscole ≥ 15px, testo ≥ 16px) e `--dim` più chiaro (`#9aa3ab`) + testi molto spenti schiariti (`#8a939b`) | Solo CSS: blocco `#stage.ux-big …` in fondo a `index.html`. La classe `ux-big` è messa sullo stage da `applyFlags` |
| `keyStats` "Key stat on rows" | Riga slot: icona+valore della stat chiave (DPS armi, velocità motori), senza glifo taglia. Riga cargo a 2 linee: `×n · DPS/SPEED valore · ▲/▼ delta · BEST`. Chip `SORT · …` nella riga del pulsante "BACK TO SOCKETS" (`.cg-bar`). Ordinamento cargo | `KEYSTAT`, `statOf`, `SORT_FN`, `cargoItems`, `leftRow`, `renderRight`, `cycleSort`; CSS `.ks`, `.cg-row.two`, `.sub`, `.dlt`, `.best`, `.sortchip` |
| `typeShape` "Type by row shape" *(5.0)* | Il **tipo di modulo** non è più un colore sull'icona (sfondo neutro `--ic-bg`, tab attiva sottolineata in arancione): è la **forma dell'estremità sinistra della riga** (blocco icona `.ic`) nel pannello sinistro e nel cargo — primary = **a punta**, secondary = **arrotondata**, engine = **tacca a V**. Il blocco icona è ritagliato (`clip-path` / `border-radius`) e lo sfondo della riga parte dopo l'icona (`background-size` con `!important`, perché le regole di stato riscrivono lo shorthand `background`), così il ritaglio mostra il pannello; niente bordo sinistro né `box-shadow` di selezione sulle righe sagomate. Legenda nella guida (card MODULES). La targhetta LV resta rettangolare (la prima prova sagomava la targhetta: scartata). La vista 3D mantiene i colori per tipo | `applyFlags` (`ux-tshape`), guida in `renderIntro`; CSS `#stage.ux-tshape …`, `.tsh` |
| `rarityTag` "Rarity tag" *(5.0)* | Backlog 2+3. Rarità come **targhetta piena `LV1`…`LV7`** nel colore della rarità (testo scuro), **prima del nome** nelle righe slot/cargo, nel titolo della card e nel tag 3D (`rarDot` la usa quando il flag è ON): il livello si legge anche senza distinguere i colori. Righe **neutre**: niente sfumatura né striscia di rarità, lo sfondo colorato resta solo alla selezione. Storia: pallini 1–7 scartati (sembravano una carica), gemma colorata scartata (solo colore); la targhetta "LVn" è stata chiesta esplicitamente dall'utente | `rarTag`, `rarDot`, `leftRow`, righe cargo in `renderRight`; CSS `.rtag`, `#stage.ux-rar …` |
| `compactCard` "Compact info card" *(5.0)* | Card informativa più stretta (660px, `left:630`) e **ancorata in basso** (`bottom:112px`, cresce verso l'alto) invece che larga 780 sotto la nave; statistiche in **griglia a 2 colonne (a 1 colonna con `slideCargo`, vedi §7)** di celle corte (`ccell`: icona + etichetta breve `CARD_SHORT`, poi `vecchio → nuovo` e delta in colonna fissa da 50px), etichetta completa nel tooltip. Vale anche per gli arms (uscite e socket liberi) | `CARD_SHORT`, `ccell`, `cgrid`, `renderCard`; CSS `#stage.ux-card #card`, `.cgrid`, `.cst` |
| ~~`bodyButton`~~ "Body switcher" *(5.0, ora sempre attivo)* | Il Body si cambia dal **pannello sopra la lista socket** (`#shipPanel`, barra arancione `.head.bodyhead` scritta da `renderLeft`; niente titolo "SPACESHIP OVERVIEW" né "PREVIEW"): **‹ NOME ›** con **`n / 20`** a destra del nome, sulla stessa riga = posizione del Body nella lista (`BODY_LIST`) su `BODIES_IN_GAME`; non c'è più il conteggio dei Body sbloccati. Frecce cliccabili (`data-bstep`), ←/→ con focus `body` (si raggiunge salendo oltre il primo slot; la barra prende il bordo bianco). Il nome scorre se non entra (`marquee`). **Niente finestra di selezione**: A in focus body non fa nulla e `renderPicker` non viene aperto. Il pannello socket sotto ha solo il titolo "SOCKETS" | `renderLeft`, `act` (focus body), hint in `renderBottom`; CSS `#shipPanel`, `.bodyhead`, `.bsw`, `.bsw-mid` |
| `blockedReason` "Why it won't fit" *(5.0)* | Backlog 6. Le righe cargo non montabili mostrano **sempre** il motivo nella colonna azione: `NO POWER +n` (punti oltre il generatore, `overBy`) o `CARGO FULL`; icona e testo della riga attenuati | `why`/`overBy` in `renderRight`; CSS `#stage.ux-block …` |
| `hideUndo` **"Hide undo / redo"** *(5.0, ON = nascosto)* | **Nascosto di default**: con l'interruttore ON (default) annulla/ripristina e Reset build non ci sono; spegnendolo tornano. `flag('undoRedo')` = `!hideUndo` (`HIDDEN_BY`). Funzione: Backlog 11. **Annulla/ripristina** le modifiche alla build (L3/R3 del pad, `Ctrl+Z` / `Ctrl+Y` o `Ctrl+Shift+Z`, un solo suggerimento "Undo / Redo" in basso con i due glifi cliccabili). Cronologia **per Body**, max 30 passi, solo in sessione (non salvata); memorizza solo gli `att`, il cargo si aggiusta per **differenza** (`cargoFor`) e l'operazione viene rifiutata ("CAN'T UNDO · CARGO") se il cargo non copre. Registrano: equip, unequip, remove all, random build, reset. **Reset build** (X con focus sull'header del Body): torna a `DEFAULT_ATT[body]` (vuoto se non definito), saltando i moduli che mancano in cargo | `S.hist`, `record`, `histOf`, `cargoFor`, `stepHistory`, `resetBuild`, `DEFAULT_ATT`; hint in `renderBottom` |
| `intro` "First-time guide" *(5.0)* | Backlog 11. Schermata "CRAFTING · HOW IT WORKS" con 4 card (Body, Arms, Modules, Power & Heat) alla **prima apertura** (chiave globale `crafting.intro.seen`); si chiude con A/B/Enter/Esc/click. Si riapre da **GUIDE nella barra in basso** (accanto a HOLD TO LEAVE): **pressione breve di Start** (< 350 ms; tenuto resta "Hold to leave"), **H** da tastiera o click. `act('guide')` funziona da qualsiasi focus | `S.intro`, `openIntro`, `closeIntro`, `renderIntro`, `#intro`, hint `.guidehint`, rilascio di Start in `pollPad`; CSS `.in-*` |
| `socketLabels` "3D socket labels" *(5.0)* | Backlog 9. Etichetta piccola su **ogni modulo montato e socket libero** nella vista 3D (glifo taglia + nome breve, "Empty" tratteggiata); gli arms non hanno etichetta (le hanno le loro uscite). Il socket selezionato tiene il tag grande; quello in hover evidenzia la propria etichetta (il tag grande di hover non viene mostrato). Ogni frame: nascoste se dietro lo scafo (raycast su `V.hull` ogni 4 frame) o se si sovrappongono a un'etichetta più vicina o ai tag grandi (priorità: hover, poi distanza). Hover/click su un'etichetta = hover/selezione del socket. Assenti in view mode | `buildLabels`, `placeLabels`, `V.labels` (ship3d.js), `#labels3d`; in app.js il pointermove/click riconoscono `.lab3d`; CSS `.lab3d` |
| `listModes` "Socket list views" *(5.0)* | Viste della lista socket: **un solo pulsante** a destra del titolo "SOCKETS" (`.lmcycle` nella barra arancione, `data-lmcycle`, mostra `VIEW <modo>`, senza icona di ciclo; ogni click passa al modo successivo) e, come l'ordinamento del cargo, **X breve** (tastiera `X`/`O`) con focus slot cicla **TREE** (albero per taglia), **FILLED** (moduli montati / socket vuoti), **TYPE** (Primary, Secondary, Engines, poi Empty), **RARITY** (LV7…LV1 in ordine, **senza etichette di gruppo**: solo il titolo EMPTY SOCKETS per i vuoti), **POWER** (moduli per consumo decrescente con il power sulla riga e `usato / generatore` nel titolo, poi Empty). **Smontare** con focus slot diventa **X tenuto** (hold 900 ms, hint "Sort · hold: Unequip", `holdRelease` distingue tap/hold); `Delete` e il ✕ della riga smontano subito. Gli arms compaiono solo in TREE; le viste non-albero sono piatte. ↑/↓ seguono l'ordine mostrato (`navOrder` = `listGroups` appiattito). `S.listMode` non è salvato | `LIST_MODES`, `listGroups`, `navOrder`, `cycleListMode`, `act('sort')` (cargo o lista secondo il focus), `holdRelease`, `holdEls.unq`, `leftRow(s, up, statKey)`; CSS `.lmcycle` (`.lmodes`/`.lm` sono CSS morto) |
| `maxRatings` "Rated vs max" *(5.0)* | **PRIMARY DPS** e **SECONDARY DPS** in un blocco dedicato con numero grande, **SHIP VALUE** e **MAX SPEED**: il **numero è colorato** e ha dietro una **sfumatura** (come le righe dei moduli, `.rated-bg`) nel colore della fascia; niente barra, la **% è solo nel tooltip**. La fascia si calcola rispetto al **massimo del gioco**: la miglior build legale di **qualunque Body dei dati** (esclusi i `.glb` custom), con copie illimitate di qualsiasi modulo del catalogo (taglie, extension solo sui socket del Body, split, generatore) — `gameMax(metric)` = max su `BODY_LIST` di `bestBuild(metric, body)`. Oggi è COLOSSUS: 2048 / 1512 DPS, valore 26.880, velocità 804. Colore = fascia di rarità della percentuale (`floor(%·7)+1`: LV1 marrone … LV7 oro). Calcolo esatto con programmazione dinamica `bestBuild(metric)` (vedi commento nel codice), memorizzato per Body. Primario e secondario hanno ciascuno il proprio massimo | `bestBuild(metric, body)` (metriche `priDps`, `secDps`, `value`, `speed`), `gameMax`, `rate`, `dpsRow`, `statCell(…, rated)`, `valRow`; CSS `.dpsblock`, `.rated`, `.ratedp` |
| `slideCargo` "Slide-in cargo" *(5.0)* | Il cargo **non è più sempre a schermo**: vive in `#cargoPanel` (450×780, stessa posizione della lista socket) e **scorre da sinistra sopra la lista** solo in focus `cargo` (A su un socket, o click su una riga socket); si chiude con B, con "BACK TO SOCKETS" o cliccando fuori. Il cargo copre **solo la lista socket** (`#cargoPanel` prende top, altezza **e larghezza** di `#left`, calcolati a fine `renderRight`): restano visibili anche la card di confronto accanto, così pannello Body e overview (con i delta dell'anteprima) restano visibili. La colonna sinistra `#lcol` è larga 547 (nomi di Body fino a 16 caratteri; rientro albero 18px per livello); non c'è più una colonna destra: la vista 3D va da 597 a 1880 e la card dei dettagli sta sul bordo destro. **Attenzione**: a questa larghezza la riga a 5 celle dell'overview ha etichette a 13px e valori a 23px (`.ovgrid.c5`), altrimenti etichette e delta si sovrappongono; ricontrollare se la colonna si restringe. Se il nome del Body non entra nella riga ‹ › scorre avanti e indietro (`.bname.scroll`, `--over` calcolato in `renderLeft`). Il cargo a scomparsa resta largo 450 (sporge sulla vista 3D mentre è aperto). Nella barra in basso: "Category" solo col cargo aperto, "View mode" solo col cargo chiuso; **"Remove all" solo col cargo chiuso e solo se c'è almeno un pezzo montato**, sia col focus sugli slot sia sulla riga del Body (dove si finisce cambiando Body) | `renderRight` (split `#right` / `#cargoPanel`), click handler, `renderBottom`, `applyFlags` (`ux-slide` + `resizeShip`); CSS `#stage.ux-slide …`, `.cg-back` |
| `stackBadge` "Stack count on icon" *(5.0)* | Quantità in cargo come **numerino sull'angolo in basso a destra dell'icona** della riga cargo (`.qty`), tolta dalla linea dei parametri e dal nome | righe cargo in `renderRight`; CSS `.cg-row .ic .qty` |
| `rarityFade` "Rarity fade" *(5.0)* | Torna la **sfumatura nel colore della rarità** sulle righe slot/cargo, ma parte da sotto il nome e **svanisce a due terzi della riga** (0→36→66%, colore al 58% in partenza) così i dati a destra restano leggibili; hover/selezione hanno le loro varianti. Sovrascrive le righe neutre di `rarityTag` (la targhetta LV resta) | CSS `#stage.ux-rfade …` (classe da `applyFlags`) |
| `hideQuality` **"Hide loadout quality"** *(5.0, ON = nascosto)* | **Nascosto di default**: con l'interruttore ON (default) il blocco LOADOUT QUALITY non c'è; spegnendolo torna. `flag('shipQuality')` = `!hideQuality`. Funzione: **LOADOUT QUALITY** nello **stesso blocco di SHIP VALUE** (con `overview`): livello medio dei moduli montati (`t.gear`, "AVG LV 2.0") con delta in anteprima, e **un quadratino per modulo** nel colore della sua rarità con dentro la **forma del socket** in cui è montato (▲■●), dal migliore | `calc` (`t.lvs`, `t.mq`, `t.gear`), `qualityRow`; CSS `.qrow`, `.qtiles`, `.valrow.sum.grp` |
| `overview` "Clearer overview" | Potenza mostrata **una volta** (non più nell'header sinistro, che non la mostra: tolta anche dal footer della card, che dà solo il verdetto); blocco **SHIP VALUE** (con `shipQuality` insieme a LOADOUT QUALITY; il riepilogo FREE SOCKETS è stato tolto); slot vuoti chiamati "Empty"; leggera compattazione (`ux-ov`) per lasciare spazio al cargo | `renderRight`, `verdict/foot` in `renderCard`, `leftRow`; CSS `.valrow.sum`, `#stage.ux-ov …` |

Dettagli `keyStats`:
- **Delta** = stat del pezzo in cargo − stat del **modulo montato nel socket selezionato**, solo se dello stesso `kind`; `=` se uguale; nessun delta se il socket è vuoto o contiene un arm.
- **BEST** = pezzo con la stat più alta fra quelli **montabili** (rispetto a potenza e cargo), solo se ce ne sono ≥ 2 e batte l'eventuale modulo montato dello stesso tipo. Se il montato è già il migliore non compare nessun BEST.
- La riga cargo mostra la stat **per cui è ordinata**: con `power` mostra `POWER n` e il delta di potenza rispetto al modulo montato (qualsiasi tipo), senza BEST; altrimenti la stat chiave.
- **Ordinamenti** (`S.sort`, si cicla con il chip, tasto `O`, o **X** del pad in focus cargo): `stat` (stat chiave ↓, poi rarità), `rarity` (rarità ↓, poi stat), `power` (potenza ↑, poi stat). Non vale per la tab Arms. `S.sort` non viene salvato.

## 4. Modello di dominio

### 4.1 Taglie dei socket (`SIZE`, `SIZE_ORDER`)
| Taglia | Etichetta | Colore | Forma |
|---|---|---|---|
| 1 | P1 Small | rosso `#e5484d` | triangolo |
| 2 | P2 Medium | verde `#4fd06a` | quadrato |
| 3 | P3 Large | blu `#3aa0ff` | cerchio |

Un socket di taglia N accetta **solo** elementi di taglia N. `sg(n,px,mode)` disegna la forma SVG del socket.

### 4.2 Body (`BODIES`, `BODY_LIST`, variabile `BODY`)
Ogni body ha: `id, name, value, tag, integrity, shield, generator` (budget di potenza), heatsink = `heatCap` (calore massimo che contiene) + `heatCool` (calore smaltito al secondo quando non spara),
`boost` (carica boost), `cam` (distanza camera), `plat` (scala piattaforma), `look` (raggi e colore dello scafo procedurale),
`sockets[]` (`{id,size,pos,dir}` in spazio modello), opzionale `model3d` (gruppo three.js da `.glb`).
Scafi definiti: **ZEPHYROS** (6 socket: 2×P3, 3×P2, 1×P1 sotto; i due P1 sul muso sono stati tolti), misto, **NEEDLE** (4×P1, leggero), **COLOSSUS** (6×P3, pesante), **KESTREL** (5 socket, misto).
- **Moduli integrati**: ogni Body ha **sempre 2 armi primarie integrate + 1 engine integrato** (`body.integrated = [{key,mod,pos}]`). Fanno parte del Body: **non si cambiano, non sono nel cargo** (non stanno in `MODS`), **non consumano power**, **non contano nella loadout quality**; il loro valore è **dentro** `body.value`. Danno il **danno di base, il calore di base, la velocità di base e il consumo di boost di base** della nave (li somma `calc`). Le statistiche dipendono dal **livello** L (1–7) dei moduli integrati (`INTEG_GUN`, engine `Core Drive Mk<L>`: speed `16+11L`).
- **3 varianti per scafo** = 3 Body distinti (**12 in totale**), stessi socket/scafo, diversi per armi **e** rarità degli integrati (tier dello scafo `BODY_TIER`: Needle 1, Kestrel 2, Zephyros 3, Colossus 4):
  | Variante | id | Livello integrati | Armi integrate |
  |---|---|---|---|
  | **RUSTED** (scarsa) | scafo + `_rs` | tier | 2× Keel Gatling |
  | **RANGER** (standard) | scafo (id storico: i vecchi salvataggi finiscono qui) | tier + 1 | Keel Laser + Keel Gatling |
  | **ELITE** (rara) | scafo + `_el` | tier + 3 (max 7) | 2× Keel Laser |
  Poiché le statistiche seguono il livello, la variante rara di uno scafo debole supera quella scarsa dello scafo successivo (**"seconda vita"** degli scafi deboli: es. Needle Elite 216 DPS di base > Kestrel Rusted 112). Laser = più danno ma surriscaldano prima; gatling = fire time più lungo. Nome = `SCAFO VARIANTE` (max 16 caratteri). Generati in codice da `BODY_TIER`, `INTEG_POS` (posizioni sullo scafo), `INTEG_GUN`, `INTEG_VARIANTS`. I salvataggi di Body non più esistenti (es. le vecchie varianti `…B`) restituiscono i loro moduli al cargo.
- **Ordine dei Body** (`BODY_LIST`, frecce ‹ › e "n / N"): per **qualità intrinseca, dalla peggiore alla migliore**, ordinato in `boot()` con `bodyQuality = ½ · livello integrati / 7 + ½ · bestBuild('value', body) / gameMax('value')`: gli scafi si **mescolano** (Needle Rusted → Needle Ranger → Kestrel Rusted → Needle Elite → Kestrel Ranger → Zephyros Rusted → Zephyros Ranger → Kestrel Elite → Colossus Rusted → Zephyros Elite → Colossus Ranger → Colossus Elite); **tra questi 12 vengono poi inserite le 8 navi sconosciute segnaposto** (vedi sotto), per un totale di 20. I body `.glb` custom si aggiungono in fondo.
- `BODIES_IN_GAME = 20` è il totale mostrato nel contatore del selettore Body (`n / 20`, con n = posizione in `BODY_LIST`); `unlockedBodies()` (esclude le sconosciute e i custom) non è più mostrato in UI (resta nel picker morto).
- **Navi sconosciute (segnaposto)**: non sono bloccate, **non esistono ancora / non si conoscono**: si sa solo che quello slot c'è nella lista. `UNKNOWN_NAMES` / `UNKNOWN_LIST` creano 8 Body `unknown:true` (`unknown1…unknown8`, cloni di scafi ELITE, nomi interni VANTAGE, OBSIDIAN, HALCYON, TEMPEST, BASTION, WRAITH, SOVEREIGN, LEVIATHAN che **non si vedono mai**) così che 12 + 8 = 20. In `boot()`, dopo l'ordinamento per qualità, vengono **mescolate** ai 12 sbloccati con il pattern `UULULUULULUULULUULUL` (U nota, L sconosciuta), quindi ‹ › e LT/RT scorrono una lista mista. Una nave sconosciuta si può scorrere ma non usare e **non mostra niente**: nome `?????` (`shipName()`, anche nel toast; nessun lucchetto), **scena 3D vuota** (`renderShip` nasconde `V.shipRoot`: resta solo il dock, nessuna targa), tutte le celle dell'overview a `—` (post-elaborazione in fondo a `renderRight`), pannello SOCKETS con il messaggio "UNKNOWN SHIP", **card dei dettagli nascosta** (classe `body-unknown` sullo stage, messa da `renderLeft`). `unknownShip()` blocca (con toast "UNKNOWN SHIP · NOTHING TO BUILD ON") `equip`, `unequip`, `removeAll`, `resetBuild`, `randomBuild` e A sui socket. Sono **esclusi da `gameMax`** e hanno build vuota nel salvataggio. Sono un prototipo per provare la lista mista: non hanno dati propri.
- Regole di progettazione: niente socket sul retro dello scafo; i socket non devono sovrapporsi in vista frontale.
- Ogni body ha **la propria build**: `S.att` è quella del body attivo, `S.builds[bodyId]` le altre.

### 4.3 Arms (`PYLONS`) — bracci, illimitati (nessuna quantità in cargo)
| Tipo | Ingresso | Uscite (`outputsOf`) | Dove si monta |
|---|---|---|---|
| `ext` Extension | N | 1 socket di taglia N | **solo su socket del Body** (`canMount`), per evitare catene infinite |
| `split` Split | N ≥ 2 | 2 socket di taglia N−1 | su qualsiasi socket di taglia N |

Definiti: `ext1/2/3`, `split2` (P2 → 2×P1), `split3` (P3 → 2×P2). Le uscite di un arm sono socket a tutti gli effetti
(id `<padre>.<i>`), quindi gli split si concatenano. Gli arms **non consumano potenza e non hanno valore**.

### 4.4 Moduli (`MODS`) — limitati dal cargo
Costruiti con `W()` (armi) e `E()` (motori). Campi comuni: `id, name, kind, fam, size, lv, value`.
- `kind`: `primary` (munizioni infinite, generano `heat`), `secondary` (caricatore `mag`, niente calore), `engine`.
- `fam` (famiglia): `gatling`, `laser` (primary), `rocket`, `smatter` (secondary), `engine`. Determina icona e tipo di munizione (`FAMILY`).
- Armi: `power, dmg, rate, acc`, `dps = round(dmg*rate)` calcolato. Motori: `power, speed, boostUse`.
- `lv` 1..7 = rarità (`RARITY`: marrone, grigio, verde, azzurro, arancio, fucsia, oro).
- `value = worth(size, lv)` = `round(size*140*RAR_MULT[lv-1]/10)*10`.
- Parametri mostrati e ordine: `MOD_KEYS` / `KEY_ORDER`; metadati (etichetta, icona, "meglio alto/basso", unità) in `STAT_META`.

### 4.5 Cargo
- `CARGO_SLOTS = 25` slot, `STACK = 14` moduli identici per slot. `cargoSlots(C)` = somma di `ceil(qty/STACK)` per modulo.
- Stato iniziale: uno stack pieno di ogni modulo, meno quelli già montati nella build di default.
- Un modulo montato esce dal cargo; smontato (o sostituito, o rimosso con l'arm che lo regge) **torna** nel cargo. Se non c'è spazio l'operazione è **rifiutata** ("CARGO FULL").

## 5. Stato (`S`) e variabili globali

```
S.att        socketId -> { t:'mod'|'pyl', id }   build del body attivo (i figli hanno id '<padre>.<i>')
S.builds     bodyId -> att                        build salvate degli altri body
S.cargo      moduleId -> quantità
S.sel        socket selezionato
S.tab        categoria cargo: 'pylon'|'primary'|'secondary'|'engine'
S.focus      'slots' | 'cargo' | 'body'           dove sta il focus di navigazione
S.picker/pickIdx   selettore Body aperto / indice
S.cargoIdx   riga del cargo evidenziata
S.sort       ordinamento cargo: 'stat'|'rarity'|'power' (esperimento keyStats, non salvato)
S.hoverCargo / hoverSlot / hoverRemove   hover mouse (guidano anteprima e outline 3D)
S.inputPref  'gamepad'|'keyboard'|'auto'; S.device = dispositivo rilevato (per 'auto')
S.flash/flashT   animazione "appena montato"
S.view       vista a schermo intero (non è inizializzato in S: parte undefined = falso)
S.scale      fattore di scala dello stage
S.rot        {yaw,pitch,d} camera desiderata
BODY  body attivo   LY  layout corrente   T0  totali correnti   PV  anteprima corrente (o null)
```

## 6. Motore di calcolo

### 6.1 Layout dei socket — `layout(att)`
Appiattisce socket del body + tutte le uscite degli arms montati in `{ list, byId }` (depth-first).
Ogni socket: `id, size, pos, dir, depth, parent, idx` e, se ospita un arm, `pylon, joint, kids, segs` (segmenti 3D).
- `spawn(sock, arm)` calcola la geometria grezza (lunghezze `EXT_LEN`, `STEM`, `SPREAD`).
- `stagger()` sposta lateralmente i figli finché, **in vista frontale (asse Z)**, nessun socket-modulo cade dietro un altro (`CLEAR`).
- `sideOf()` decide la direzione di apertura dello split.
- `navOrder(L)`: ordine di navigazione = sezioni P3, P2, P1, ognuna con il proprio sottoalbero. Usato per su/giù.
- `inTree(id, root)`: `id` è `root` o un suo discendente (prefisso `root.`).

### 6.2 Totali — `calc(att)` → `t`
`power` (somma potenza moduli), `heat` (somma calore), `speed`, `boostUse`, `priDps`, `secDps`, `value` (= `BODY.value` + valore moduli),
`sock[1..3].{free,total}`, `maxSpeed = speed` (il body non ha velocità base: la danno i motori),
`boostTime = BODY.boost / boostUse` (0 se nessun consumo),
Tutti i totali includono i **moduli integrati** del Body (danno, calore, velocità, boost; niente power). `fireTime = BODY.heatCap / heat` (secondi di fuoco continuo di tutte le primarie partendo da freddo; `Infinity` senza primarie), `coolTime = BODY.heatCap / BODY.heatCool`.
`T0 = calc(S.att)` è la build corrente.

### 6.3 Regole di legalità
- **Potenza**: `fits` se `power <= BODY.generator` (moduli soltanto). Superarla blocca l'equip ("NOT ENOUGH POWER").
- **Calore**: **informativo, non bloccante**. La generazione è **progressiva**: sparando si va **sempre** in overheat, la build decide **dopo quanto** (`fireTime`) e quanto dura il raffreddamento (`coolTime`). Non esiste più il "carico %" né il "fuoco infinito".
- **Solo le foglie si cambiano**: un arm che regge pezzi sulle sue uscite (`holdsParts(sid)`) è **bloccato**: niente replace né unequip finché non si tolgono i pezzi (toast "REMOVE THE PARTS ON THIS ARM FIRST"). A sul socket bloccato non apre il cargo; il cargo mostra "THIS ARM HOLDS n PARTS" (`cargoItems` restituisce vuoto); la riga ha un lucchetto (`.lockq`) al posto del ✕; la card lo spiega. "Remove all", reset, undo/redo e random build lavorano sull'intera build e non sono toccati dalla regola.
- **Cargo**: dopo l'operazione `cargoSlots <= 25`, altrimenti "CARGO FULL".
- **Extension**: solo su socket radice (`canMount`).

### 6.4 Operazioni sulla build
- `attachTo(att, cargo, sid, item)`: **pura**. Rimuove tutto il sottoalbero di `sid` (i moduli tornano in cargo, gli arms spariscono; per la regola delle foglie in pratica il sottoalbero è vuoto, salvo "Remove all"), poi monta `item` (se dato, un modulo lo toglie dal cargo). Ritorna `{att,cargo,ret}`; `ret` = id restituiti.
- `makePreview(sid, to)` → `{sid,to,att,ret,t1,fits,room}`: simulazione senza modificare lo stato.
- `computePreview()` → `PV`: priorità a `hoverRemove` (passaggio sul ✕ di uno slot → anteprima rimozione), poi `hoverCargo`, poi la riga cargo evidenziata se `focus==='cargo'`; altrimenti `null`.
- `equip(id, sid)` esegue (con toast e `flash`); se monti un arm seleziona automaticamente il suo primo figlio `<sid>.0`.
- `unequip(sid)`, `removeAll()` (rifiutati se il cargo non basta), `switchBody(id)`.

## 7. Interfaccia (stage fisso 1920×1080)

`#stage` è 1920×1080 posizionato al centro e scalato con `transform: scale(...)` da `fit()` (`min(w/1920, h/1080)`). Tutto dentro è
in **coordinate assolute a 1920×1080**. Font: Rajdhani (Google Fonts) con fallback. Nessun test responsive: cambia solo la scala.

| Regione | Elemento | Posizione/dimensione | Funzione di render |
|---|---|---|---|
| Barra alta | `#top` | 0,0 · 1920×160 | `renderTop()` |
| Colonna sinistra | `#lcol` | 40,180 · **547**×780, flex verticale con gap 10: `#shipPanel` (barra arancione ‹ NOME › `n / 20`, §3c `bodyButton`) → `#right` (overview compatto, §7.3) → `#lrow` (occupa lo spazio che resta e contiene la lista socket `#left`, larga quanto la colonna) | `renderLeft()`, `renderRight()` |
| Pannello socket | `#left` | in `#lrow`, larga quanto la colonna (**547**), ≈ 500px di altezza · **solo socket e moduli montati** (titolo "SOCKETS") | `renderLeft()` |
| Vista nave | `#shipbox` | 490,168 · 920×468 (con `compactCard` alta **812**, fino alla barra dei comandi, e inquadratura alzata del 10% con `camera.setViewOffset` in `resizeShip` perché la card copre la parte bassa; con `slideCargo` **597→1880**, cioè dalla colonna sinistra al bordo destro: la card dei dettagli galleggia sul suo angolo in alto a destra, la nave è centrata su tutta la larghezza) | `renderShip()` (ship3d.js) |
| Card confronto | `#card` | 560,640 · 780 largo (con `slideCargo` + `compactCard`: **sul bordo destro dello schermo**, `left:1670`, `top:180`, **210** largo (titolo che va a capo, righe strette), alta quanto il contenuto (max 780, poi scorre); parametri in **una sola colonna** (`.cgrid` a 1 colonna con `slideCargo`)) | `renderCard()` |
| Overview | `#right` | 1410,180 · 470×780 senza `slideCargo`; con `slideCargo` (sempre) sta **dentro `#lcol`** tra il pannello Body e la lista socket, largo quanto la colonna, alto quanto il contenuto (≈ 260px): **solo overview compatto** | `renderRight()` |
| Cargo a scomparsa | `#cargoPanel` | 40,180 · 450×780, sopra la lista socket, solo con `slideCargo` e focus cargo | `renderRight()` |
| Selettore body | `#picker` | 510,180 · 880×780, sopra il centro | `renderPicker()` |
| Barra bassa | `#bottom` | in basso, 100 alto | `renderBottom()` |
| Toast | `#toast` | centro alto | `toast(msg, kind)` |
| Overlay uscita | `#leave-ov` | a tutto schermo | mostrato da `holdDone('leave')` |

`renderAll()` ricalcola `LY`, `T0`, `PV`, salva in locale, e richiama **tutti** i render. Ogni cambio di hover/selezione lo chiama.
Nota: `#top` e le tab "MAINTENANCE / RAIDER LOG / INVENTORY / TRADING" e l'HUD (21.980 / 14.000 / lv 30 / 121.834 CR) sono **decorazioni statiche** di contorno, non funzionano.

### 7.1 Barra alta (`renderTop`)
HUD finto (emblema, barre, velocità 0 m/s, livello), titolo stazione, tab con "CRAFTING" attiva, crediti. Glifi LB/RB decorativi.

### 7.2 Pannello sinistro (`renderLeft`, `leftRow`)
- **Header**: titolo "SOCKETS" (`lp-head`) con a destra il pulsante unico della vista (`.lmcycle`, §3c `listModes`). Il Body (nome e cambio nave) è nel pannello `#shipPanel` sopra questo (barra arancione ‹ NOME › `n / 20`, `renderLeft`).
- **Sezione INTEGRATED** in cima alla lista (prima di ogni vista): le 3 righe dei moduli integrati (`integRow`) con targhetta LV, nome, stat chiave e lucchetto; non hanno `data-slot`, quindi non si selezionano e la navigazione le salta. **È collassabile**: click sul titolo (`data-integ`, freccia ▾/▸) nasconde le righe (`S.integOpen`, aperto di default, non salvato; solo mouse).
- **Lista socket** divisa per sezioni P3/P2/P1 (`sec-title`). Ogni riga (`.slot`): icona (forma socket tratteggiata se vuoto, icona famiglia se modulo, icona arm se braccio), nome **completo e mai tagliato** (se non entra scorre avanti e indietro, `.nmx.scroll`, come il nome del Body; i nomi brevi restano solo nelle etichette 3D), stat chiave (flag `keyStats`), glifo taglia (non con `keyStats`), uscite se arm, glifo `A` se selezionato+focus, pulsante ✕ (`data-unq`) per smontare.
- Indentazione di 24px per livello (`--d`) e linee ad albero fino al braccio genitore (`--up`).
- Stati CSS: `sel`, `focus`, `hov`, `flash`, `pv-add` ("→ NEW"), `pv-rem` (barrato), `rar` (tinta rarità via `--rc`), `free` (vuoto, tratteggiato; con `overview` mostra "EMPTY"), `pyl`, `child`.

### 7.3 Overview (colonna sinistra, sotto il pannello Body)
**Overview** (`.ov` in `#right`, **compatto**, senza titolo né etichette di categoria; il selettore del Body è la barra sopra). Le statistiche stanno **affiancate su 2 righe** (`ovRow(…, cell=true)`, classe `.ovc` dentro `.ovgrid.c5` / `.ovgrid.c4`): **etichetta (senza icona, non c'è spazio) sopra; sotto, la variazione (delta) a sinistra, nello spazio libero, e il valore (26px) a destra sulla stessa riga**: niente riga riservata al delta, così l'overview è alto ≈ 150px. Con la colonna a 644px il delta entra sempre accanto al valore (controllato su tutti i Body e tutti i moduli in anteprima). La sfumatura di rarità delle celle valutate (`.rated-bg`) sale **dal basso verso l'alto fino in cima alla cella**, sotto il valore; **il testo dei valori non cambia colore** (bianco sempre, la fascia si legge solo dalla sfumatura). **Nessuna barra della potenza**: `POWER n / generator` è solo un numero (rosso se si eccede). Blocchi separati da una linea:
1. Riga di **4 celle** (la nave): `SHIP VALUE` · `POWER` · `INTEGRITY` · `SHIELD POWER` (integrità e scudo sono costanti del body). Con `shipQuality` sotto: LOADOUT QUALITY.
2. Riga di **5 celle** (attacco e velocità): `FIRE TIME` · `PRIMARY DPS` · `SECONDARY DPS` · `MAX SPEED` · `BOOST DURATION` (fire time in secondi, `∞` senza primarie, con delta in secondi). Il cooldown **non è più mostrato** (resta `coolTime` in `calc`). Nessun tooltip sul calore.
Attenzione: con la colonna a 560px il delta accanto al valore non ci stava nelle celle a 5 colonne (es. `−16.7s` + `14.0s`); se si restringe di nuovo la colonna va ricontrollato.
Con `maxRatings` valore, DPS e velocità hanno la sfumatura della fascia (`rate`), ma il numero resta bianco; i delta usano `dcls` (verde migliora / **rosso peggiora, anche per i costi in aumento come power e heat**: la classe gialla `wn` non è più assegnata da nessuno).
**Cargo** (`.cg`): titolo con `slot usati / 25`, **una sola riga `.cg-bar`** con il pulsante "BACK TO SOCKETS" a sinistra e a destra il pulsante di ordinamento `SORT · …` (con `keyStats`, non per gli arms); non c'è più la riga "TARGET · socket", 4 categorie (Arms, Primary, Secondary, Engines) con glifi LT/RT, lista.
- `cargoItems()` filtra per **taglia del socket selezionato**, categoria, disponibilità (`cargo>0`, arms sempre) e `canMount`.
- `ensureTab()` cambia categoria automaticamente se quella corrente è vuota per quel socket.
- Riga (senza `keyStats`): icona, nome, `×quantità` (solo moduli), taglia o uscite (arms). Con `keyStats` i moduli hanno 2 linee (nome / `×n`, stat, delta, BEST) e niente glifo taglia; etichetta azione visibile **solo con focus/hover**: `EQUIP`/`REPLACE`/`NO POWER`/`CARGO FULL`. Classe `nopow` se non ci sta.
- Click su una riga = **equipaggia subito** (non solo seleziona).

### 7.4 Card di confronto (`renderCard`)
- Senza anteprima: socket vuoto (invito a scegliere), arm montato (uscite e figli), oppure modulo montato (tabella dei parametri e, in fondo, una **descrizione fittizia di 20 parole**: `modDesc(m)` = frase della famiglia `DESC_FAM` (11 parole) + frase della rarità `DESC_LV` (9 parole); è testo segnaposto, da sostituire con quello vero).
- Con anteprima: tabella `INSTALLED | NEW | Δ` (per arms: uscite e socket liberi prima/dopo), riga "Returns to cargo", footer con verdetto (`READY TO EQUIP/REPLACE`, `NOT ENOUGH POWER · NEEDS n MORE`, `CARGO FULL…`, `GOES BACK TO CARGO`). Senza il flag `overview` il footer mostra anche la potenza `T0 ➜ nuova`.
- Se cambia il tipo di modulo (es. arma → motore) mostra solo i parametri del nuovo.
- L'intestazione della card (`head` in `renderCard`) mostra solo il titolo (nome / `VECCHIO ➜ NUOVO`): **non c'è più il chip "P1 SOCKET"** (il socket è già selezionato in lista). Con `slideCargo` lo sfondo è quello degli altri pannelli (`var(--panel)`).

### 7.5 Selettore Body (`renderPicker`)
Griglia 2 colonne di card (`.bcard`): nome, "IN USE", schema dall'alto dei socket (`schematic`), stats del body, conteggio socket per taglia, parti montate. Navigazione: ←→ ±1, ↑↓ ±2, A conferma, B/click fuori chiude.

### 7.6 Barra bassa (`renderBottom`)
Suggerimenti dei tasti **che cambiano col contesto** (picker / focus body / focus slot / focus cargo). In focus cargo, con `keyStats`, c'è anche **Sort** (X / `O`). Con `undoRedo`: "Undo / Redo" (L3 R3, glifi cliccabili, attenuati se la cronologia è vuota) e, in focus body, "Reset build" (X); con `intro`, in focus body, "Guide" (Y). La categoria da tastiera mostra solo `Tab`; la rotazione è "Rotate" per tutti. **Lo spazio è al limite**: in tastiera + focus cargo i suggerimenti arrivano a toccare la pill INPUT; ogni suggerimento nuovo va misurato (o compensato) in tutti i contesti e con entrambi i dispositivi. Sempre presenti: rotazione (RS), View mode, `INPUT · <pref>` (pill che cicla gamepad → keyboard → auto), **HOLD TO LEAVE** (START/Esc tenuto premuto 900 ms → overlay "UNDOCKING…"). "Remove all" (Y / R) è hold-to-confirm 900 ms (`HOLD_MS`, `holdStart/holdEnd/holdDone`, barra di avanzamento via `--p`).
`glyph(n)` restituisce il glifo gamepad o il tasto tastiera secondo `dev()`.

### 7.7 Debug / mockup-only
Il pulsante viola **DEBUG · RANDOM BUILD** (`#dbgRandom` → `randomBuild()`) monta una build casuale ma legale (fino a 20 tentativi). La pill INPUT e la scritta build `#build` (cliccabile: menu versioni/esperimenti, `switcher.js`) sono elementi del mockup, non del gioco.

## 8. Vista 3D (`ship3d.js`)

- `initShip()`: renderer WebGL (`preserveDrawingBuffer`), luci, piattaforma di attracco (`floorG`), `shipRoot` con `V.hull` (scafo) e `V.dyn` (parti dinamiche).
- `renderShip()`: **ricostruisce da zero** `V.dyn` a ogni chiamata (`clearDyn` libera geometrie/materiali). Se c'è un'anteprima con `PV.to` usa `PV.att`/`layout(PV.att)`: le parti nuove vengono disegnate "fantasma" (verde se `fits`, rosso altrimenti), quelle in rimozione in `rem`.
- Per ogni socket: puntoni degli arms (`strut`, sfere di giunzione), modulo (`buildModule` per `kind`: primary/secondary/engine, scala `MOD_SCALE[size]`), **marker** (sprite forma+colore) **solo sui socket liberi** e non in view mode, sfera invisibile per il picking (`V.pickers`).
- **Outline** (`addOutline`, hull invertito) sul socket selezionato (arancione) o in hover (bianco); assente in view mode.
- **Moduli integrati** disegnati sullo scafo alle posizioni `body.integrated[].pos` (armi sul muso, engine dietro), sempre stile normale: niente picking, tag, etichette o hover.
- **Anelli colorati dei socket** (bordo nel colore della taglia attorno alla piastra di ogni socket dello scafo, creati in `buildHull` con `userData.rimOf`): **nascosti dove è montato un arm** (in `renderShip`), visibili sotto i moduli e sui socket liberi. Il materiale è **lit e opaco** (`stdMat`, niente emissive né `MeshBasicMaterial`), così non si scambia per i marker 3D.
- **Arms non interattivi in 3D**: nessuna sfera di picking, nessun outline di hover, nessun tag; un arm selezionato dalla lista mostra **solo** l'outline arancione.
- **Tag** HTML (`#tagSel`, `#tagHov`) ancorati alla posizione proiettata del socket, con taglia e nome (`placeTag` ogni frame). Con il flag `socketLabels` il tag di hover non compare e si aggiungono le etichette piccole di `#labels3d` (`buildLabels` in `renderShip`, `placeLabels` ogni frame, vedi §3c).
- `animateShip()`: camera orbitale con smorzamento verso `S.rot` (yaw, pitch, distanza) + `V.pan` (solo view mode), leggera oscillazione della nave, pulsazione del marker selezionato, effetto "pop" dopo l'equip, fiamme dei motori animate.
- `pickSlot(e)`: raycast sui picker → id socket (usato da hover e click).
- Camera: `TARGET=(0,.5,-.3)`; distanza iniziale `homeRot()` = `BODY.cam × 1.3` (zoom out, così braccia e moduli restano inquadrati); limiti in `ROT()`: normale pitch −.25..1.1, dist 8..34; in view mode pitch ±1.45, dist 3..45.

### 8.1 Body personalizzati da `.glb`
Trascinando un `.glb/.gltf` sullo stage (o con `?model=`), `setHull` cerca i nodi chiamati `sock_p<size>_<n>` (regex tollerante: `socket_p2-1`, ecc.), il cui asse locale **+Z** è la direzione di uscita. Se ne trova, crea `BODIES['custom<N>']` (tag `CUSTOM`, valori di default: value 1500, integrity 20000, shield 10000, generator 26, heatCap 400, heatCool 60, boost 100), lo aggiunge a `BODY_LIST` e lo seleziona. Il modello è scalato a 6 unità sul lato maggiore. **I body custom non sopravvivono al reload** (il salvataggio scarta body sconosciuti).

## 9. Input

Le azioni logiche passano tutte da **`act(name)`**: `up down left right a b x sort catNext catPrev view undo redo guide`. `act` smista in base al contesto (guida aperta → view mode → picker → undo/redo → focus body → focus slot/cargo).

### 9.1 Flusso di navigazione
- **Focus `slots`** (default): ↑↓ cambiano socket nell'ordine della vista (`moveSel`, salendo oltre il primo si passa a `body`, dove ←/→ cambiano Body); **A** → passa al cargo (se vuoto, toast informativo; su un arm bloccato, toast); con `listModes` **X breve** cambia ordinamento della lista e **X tenuto** smonta, senza il flag X smonta (mai su un arm bloccato).
- **LT/RT (tastiera Shift+Tab / Tab)** hanno due usi: **con il cargo aperto cambiano categoria; altrimenti (focus `slots` o `body`) cambiano la nave** precedente / successiva (`act('catPrev'/'catNext')` → `stepBody`). I glifi LT / RT stanno ai due lati della barra ‹ NOME › (spariscono col cargo aperto) e c'è il suggerimento "Ship" nella barra bassa (focus slot): **entrambi solo quando l'input è gamepad**; da tastiera Tab / Shift+Tab funzionano ma senza glifi né suggerimento.
- **Focus `cargo`**: ↑↓ evidenziano una riga (→ anteprima live); **A** equipaggia; **B / ←** torna a `slots`; **LT/RT** cambiano categoria; **X** (pad) / `O` cambia l'ordinamento (con `keyStats`).
- **Focus `body`**: ←→ cambia body (la barra ‹ NOME › nel pannello Body si evidenzia), **A** non fa niente (niente selettore), **X** reset build (`undoRedo`), ↓ torna agli slot.
- Dopo un `equip` il focus torna a `slots`.

### 9.2 Tastiera
`↑/W ↓/S` naviga · `Enter/Space` = A · `Backspace` = B · `←/→` · `Del/X` smonta (in focus body: reset build) · `Tab / Shift+Tab` categoria (cargo aperto) o nave successiva / precedente · `O` ordinamento cargo · `V` view mode · `R` (tenuto) rimuovi tutto · `Ctrl+Z` / `Ctrl+Y` (o `Ctrl+Shift+Z`) annulla / ripristina · `H` guida · `Esc` (tenuto) lascia; in picker chiude; in view mode esce; con la guida aperta la chiude.
Nota: i tasti `Q/E` sono mostrati come glifi LB/RB ma **non sono associati a nulla**.

### 9.3 Gamepad (mapping standard, `pollPad` ogni frame)
A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 View=8 Start=9 D-pad 12–15. Stick sinistro Y = su/giù (con ripetizione a 90 ms dopo 380 ms). Stick destro = rotazione camera. In view mode: stick sinistro = pan, trigger = zoom, B/View = esci. LT/RT = categoria (cargo aperto) o nave precedente / successiva; Y (tenuto) = rimuovi tutto; Start (tenuto) = lascia, **Start breve (< 350 ms) = guida** (`intro`); **X in focus cargo = ordinamento del cargo**, **in focus slot breve = ordinamento della lista / tenuto = smonta** (`listModes`), in focus body = reset build; **L3 / R3 (click degli stick, 10/11) = annulla / ripristina** (non LB/RB: in gioco cambiano le tab in alto).
`inputPref='auto'` cambia i glifi in base all'ultimo dispositivo usato; `gamepadconnected` mostra un toast.

### 9.4 Mouse
- **Hover** riga cargo / riga slot / ✕ / socket nella vista 3D → aggiorna `S.hover*` → anteprima e outline (ogni cambio chiama `renderAll`).
- **Click** slot o socket 3D → seleziona (focus `slots`); con `slideCargo` il click su una riga socket apre anche il cargo, e un click fuori dal cargo aperto lo chiude; **click riga cargo → equipaggia**; ✕ smonta; tab categorie; chip `SORT` (`data-sort`); hint della barra bassa attivano l'azione corrispondente; header body apre selettore.
- **Vista 3D**: trascina = ruota (soglia 5px per distinguere dal click), rotella = zoom, doppio click = reset camera. Tasto destro/centrale/Shift+drag = pan (solo view mode).

### 9.5 View mode (`setView`)
Tasto `V` / View del pad / pulsante "EXIT VIEW MODE". `#shipbox` occupa tutto lo stage e **tutto il resto diventa `visibility:hidden`** (tranne scena e toast). Niente marker né tag. Al ritorno la camera torna alla posizione di `homeRot()`.

## 10. Persistenza (`saveLocal` / `loadLocal`)
- Salva a ogni `renderAll` (solo se il JSON è cambiato): `{ body, builds (tutte, inclusa la corrente), cargo }`.
- Chiave = `crafting.save.<APP_VERSION>` (una per versione). Se manca, si legge la storica `crafting.save.v1` (`LEGACY_SAVE_KEY`).
- Flag esperimenti: `crafting.flags.<STORE_VER>` (`STORE_VER` = `APP_VERSION`, tranne la 5.0 che tiene `0.5.0`; la 6.0 usa `6.0`).
- Non salva: selezione, categoria, ordinamento, camera, view mode, preferenza input.
- Al caricamento scarta id sconosciuti al catalogo attuale e allinea `t` arm/modulo; scarta anche i montaggi su **socket che non esistono più** (es. socket tolti da un Body: `layout(att, body)`), rimettendo i moduli in cargo; i moduli nuovi partono con uno stack pieno; se l'id body non esiste usa ZEPHYROS. Per azzerare: cancellare la chiave della versione da localStorage.

## 11. Boot (`boot()`)
`loadLocal` → `loadFlags` → `applyFlags` → camera `homeRot()` → scritta build → `renderTop` → `initShip` → `renderAll` → avvio `pollPad` → fetch di `version.json` per completare la scritta build.

## 12. Convenzioni CSS/UI da rispettare
- Colore dei **tipi di modulo** (dalla 4.2): primary rosso `--pri`, secondary giallo `--sec`, engine blu `--eng`, su icone delle righe (`.slot`, `.cg-row`), bordo della tab attiva e modelli 3D (`KIND_COL` in `ship3d.js`). Con il flag `typeShape` le icone diventano neutre e il tipo passa alla **forma dell'estremità sinistra della riga** (§3c); il 3D resta colorato. La 4.0/4.1 li teneva solo per icona: ora **taglia socket** (forma+colore), **rarità** (tinta riga) e **tipo modulo** convivono, quindi non aggiungere altri significati al colore.
- Rarità: con il flag `rarityTag` una **targhetta `LVn`** nel colore della rarità prima del nome e righe neutre; senza il flag tinta riga `--rc`, striscia sull'icona, `rdot`. Niente pallini/barrette (sembrano una carica) né solo colore (gemma, scartata).
- I delta nelle statistiche **non devono cambiare il layout**: usare slot a larghezza fissa (`dslot`) o badge assoluti (`.sd`), e `visibility:hidden` (`.sd.off`).
- **Tipografia** (regola dell'esperimento `bigText`): etichette MAIUSCOLE ≥ 15px, testo normale ≥ 16px, niente sotto i 14px per ciò che si legge. Testi secondari: `--dim`; i grigi ancora più spenti (`#5c…`, `#6b…`) hanno contrasto < 4.5:1 e vanno evitati per testo nuovo (usare `#8a939b` o più chiaro).
- **Ogni modifica UX confrontabile va dietro un flag** (§3c): il CSS nuovo si scopa con una classe sullo stage (`ux-big`, `ux-ov`) o si genera solo quando il flag è attivo, così con il flag spento resta il comportamento precedente.
- Il nome del body ha larghezza fissa (150px) così i pulsanti ‹ › non si spostano.
- Il CSS è stratificato (regole successive sovrascrivono le precedenti, es. `.slot`, `.cg-row`, `.st`, `.wc`): quando si modifica un componente cercare **tutte** le occorrenze del selettore.

## 13. Codice morto / stranezze note
- `skCell()`, `wcell()` e le classi `.wrow/.wc/.wc.sk` (vecchia griglia socket liberi/pot.) **non sono usate**; il riepilogo FREE SOCKETS non c'è più nell'overview: i socket liberi si vedono solo nell'anteprima degli arms.
- `ratedBar()` (vecchia barretta "% OF MAX") e `uptime` in `renderRight` (vecchia barra del ciclo di calore) non sono più usati: la valutazione usa `rate()` + `.rated-bg`, il calore due numeri.
- `renderPicker` / `#picker` (finestra di selezione Body) esistono ma non vengono mai aperti; `.lsort`, `.bodybtn`, `.guidebtn` (versioni intermedie del chip SORT, del pulsante CHANGE BODY e del "?") hanno CSS ma nessun markup.
- `statCell`, `.stats`/`.st` (vecchia griglia delle statistiche dell'overview), `.pw-row`, `.hnum`, `.valrow` non sono più usati (l'overview usa solo `ovRow`).
- `bigText`, `overview`, `slideCargo`, `bodyButton` non sono più in `FLAGS` ma il codice usa ancora `flag('…')`: rispondono sempre `true` tramite `ALWAYS_ON`. `flag('undoRedo')` / `flag('shipQuality')` sono l'opposto di `hideUndo` / `hideQuality` (`HIDDEN_BY`).
- `.slot .pwr` (potenza per slot) è definita in CSS ma non renderizzata.
- `S.view` non è dichiarato in `S`.
- `KIND.label` e `TAB_CLS` parzialmente ridondanti; `I.eng/kin/exp/nrg` sono icone non usate.
- Nel codice arm = "pylon". Nella UI: "Arm".

## 14. Ricette per le modifiche più comuni
- **Nuovo modulo**: aggiungere una riga in `MODS` con `W(...)` o `E(...)` (id univoco, famiglia esistente). Compare da solo in cargo (stack pieno) e nei salvataggi vecchi.
- **Nuova famiglia di armi**: aggiungere in `FAMILY`, un'icona in `I`, e (se serve) una forma in `buildModule` (ship3d.js).
- **Nuovo Body**: aggiungere in `BODIES` (socket con `pos` e `dir`) e il suo id in `BODY_LIST`. Verificare la regola "nessun socket dietro un altro in vista frontale".
- **Nuova statistica**: `STAT_META` (etichetta, icona, `better`, unità), poi `MOD_KEYS`/`KEY_ORDER` per i moduli o `calc()` + `renderRight()` per i totali.
- **Nuovo tipo di arm**: `PYLONS` + `outputsOf` + `spawn` (geometria) + eventuale regola in `canMount`.
- **Nuova azione da input**: aggiungere il caso in `act()`, la mappatura in tastiera (`keydown`) e gamepad (`pollPad`), il glifo in `glyph()` e il suggerimento in `renderBottom()`.
- **Nuovo esperimento (flag)**: voce in `FLAGS` (app.js), `flag('id')` nei punti di render, eventuale classe in `applyFlags` e CSS scopato; il menu la mostra da solo.
- **Costanti di bilanciamento**: `CARGO_SLOTS`, `STACK`, `RAR_MULT`, `HOLD_MS`.

## 15. Quando aggiornare questo documento
Non a ogni commit. Il criterio: **il testo di questo file, letto dopo la modifica, direbbe qualcosa di falso o mancherebbe di qualcosa che serve per lavorare sul codice?** Se sì, si aggiorna nello **stesso commit**; se no, si lascia stare.

**Aggiornare** quando cambia:
- una regola di gioco (potenza, cargo, calore, cosa si può montare dove) o la struttura del catalogo (nuovo tipo di modulo/arm/famiglia, nuova stat, nuovo campo);
- lo **stato** (`S`) o il flusso di `renderAll` / delle funzioni di render citate qui;
- il **layout**: regioni dello stage, pannelli aggiunti o tolti, cosa mostra una riga;
- gli **input** (tasti, mapping gamepad, nuove azioni in `act()`);
- il **salvataggio** (chiavi, formato, cosa viene salvato) o il **boot**;
- **deploy, versioning, script, file** del repository, esperimenti/flag (nuovo flag, o un flag che cambia comportamento);
- una convenzione da rispettare (§12), oppure quando si scopre/si rimuove codice morto o una stranezza (§13).

**Non serve** aggiornare per:
- ritocchi visivi (colori, spaziature, dimensioni di font) che non cambiano cosa mostra la UI né la regola in §12;
- bugfix che riportano il comportamento a quello già descritto;
- valori di bilanciamento o nuovi elementi di un catalogo già descritto (un'altra arma, un altro body): il catalogo vive nel codice, qui si spiega solo come è fatto;
- refactoring interni, rinomine di variabili non citate qui, commenti;
- numeri di riga (qui non ci sono di proposito).

Una nuova **versione** (`APP_VERSION` + snapshot) non obbliga da sola ad aggiornare il documento: serve solo la riga in "Versioni" quando la versione è significativa, il resto segue i criteri sopra.

## 16. Backlog UX (proposte ancora aperte)

Nasce da un'analisi di leggibilità dell'app. Da riprendere all'inizio di ogni nuova conversazione (vedi `CLAUDE.md`).
Convenzione: ogni intervento nuovo va dietro un flag (§3c) e si rilascia come versione nuova (§3b), così si può confrontare.

**Fatti (4.3):** 1 testo leggibile, 4 stat chiave sulle righe (+ delta, BEST, ordinamento), 5 overview più chiara.
**Fatti (5.0) (flag `rarityTag`, `blockedReason`, `undoRedo`, `intro`, `socketLabels`, §3c):** 2+3 rarità a targhetta LVn e righe neutre, 6 motivo "non si può" sempre visibile, 8 nomi mai tagliati (nome completo che scorre se non entra), 11 annulla/ripristina + reset build + guida alla prima apertura, 9 etichette 3D sui socket collegate alla lista.
**Scartato:** 10 (debug e pill INPUT restano: sono strumenti del mockup, non della versione finale).

| # | Intervento | Cosa cambierebbe | Note |
|---|---|---|---|
| 7 | Calore spiegato senza mouse | ~~Il tooltip "?" è solo hover~~ | **Scartato**: il tooltip è stato rimosso (il calore resta due numeri, FIRE TIME e COOLDOWN, senza spiegazione) |

Nessun punto aperto.

**Stato del lavoro (aggiornare a ogni sessione)**
- La **5.0 è completa e committata** (snapshot `versions/5.0`, tag `v5.0`; il tag storico `v0.5.0` punta alla prima pubblicazione). Contiene anche: rinumerazione delle versioni (`0.x.y` → `x.y`), pulsanti separati VERSION / FEATURES con tag `since`, niente COPY BUILD HERE, `bigText`/`overview`/`slideCargo` sempre attivi, `hideUndo`/`hideQuality` ON di default, dev server senza cache.
- Alias dei tag nel nuovo formato: `v4.0`→`685adf4`, `v4.2`→`da61880`, `v4.3`→`74a0cbc`, `v5.0`→ commit della 5.0. I tag `v0.x.y` restano.
- La **6.0 è completa** (snapshot `versions/6.0`, tag `v6.0`): riordino del layout descritto in "Versioni" (§3b) e nei paragrafi di §7. Sintesi delle scelte fatte durante la 6.0: tooltip e cooldown del calore rimossi; nessun titolo "SPACESHIP OVERVIEW"; overview a celle con etichetta / delta a sinistra / valore a destra (il numero non cambia colore, la fascia si legge dalla sfumatura dal basso); `bodyButton` promosso a comportamento fisso; navi sconosciute segnaposto (`UNKNOWN_LIST`) per provare una lista mista (vanno sostituite con navi vere quando esistono); le descrizioni dei moduli (`modDesc`) sono testo segnaposto.
- Layout attuale in breve: `#lcol` (547px) = pannello nave, overview, lista socket; `#shipbox` 597→1880; `#card` a `left:1670, top:180` (210px); `#cargoPanel` sopra la lista socket. Se si restringe `#lcol` va ricontrollata la riga a 5 celle dell'overview (§7.3).
- Backlog UX: nessun punto aperto.

**Pendenze tecniche**
- Tag git `v0.4.1` sul remoto punta al commit `61babe6` (mio, pre-merge) invece che a `ccb8dc9`. Correzione: `git push origin :refs/tags/v0.4.1 && git tag -f v0.4.1 ccb8dc9 && git push origin v0.4.1` (l'assistente non può farla: è bloccata come operazione distruttiva).
- Il cache-busting esteso del Dockerfile (a tutti gli `index.html`, comprese le versioni congelate) è stato provato solo come regex, non con un build Docker reale.
- Il tasto X del gamepad per l'ordinamento cargo non è stato provato con un controller reale.
