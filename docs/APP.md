# Crafting — riferimento tecnico e funzionale

Documento unico che descrive **come funziona tutta l'app**. Va letto prima di toccare il codice e va
**aggiornato quando cambia qualcosa che descrive** (vedi "Quando aggiornare" in fondo).
Le funzioni sono citate per nome, non per riga: i numeri di riga cambiano.
**Descrive lo stato attuale della copia di lavoro (`mockup/`), non la cronologia di come ci si è arrivati.**
Quando qualcosa cambia di nuovo, questo file si aggiorna sul posto — non si aggiungono paragrafi "in questa
sessione è cambiato X" da qualche parte in fondo: quelli vanno riletti e integrati subito, poi cancellati.

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
| `mockup/switcher.js` | Tre pulsanti in alto a destra, ognuno con la sua finestra: **versione**, **FEATURES** (interruttori) e **RARITY** (colori rarità). Condiviso da tutte le versioni |
| `mockup/versions.js` | Manifest delle versioni congelate (`window.CRAFTING_VERSIONS`), scritto da `scripts/snapshot.py` |
| `mockup/versions/<v>/` | **Snapshot congelati** (`index.html`, `app.js`, `ship3d.js`) di ogni versione rilasciata. Non si modificano a mano |
| `scripts/snapshot.py` | Congela la copia di lavoro come nuova versione |
| `mockup/vendor/` | `three.min.js` e `GLTFLoader.js` (non modificare) |
| `Dockerfile`, `docker/nginx.conf`, `docker-compose.yml` | Deploy: nginx serve `mockup/` |
| `.github/workflows/docker.yml` | CI: build multi-arch e push su `ghcr.io/jstplink/crafting` |
| `.claude/launch.json` | Dev server: `python scripts/devserver.py 6480` (nome config: `mockup`) |
| `scripts/devserver.py` | Come `python -m http.server` su `mockup/`, ma con `Cache-Control: no-store`. In più `POST /save-rarity` (usato dal menu RARITY, §3b) che riscrive in `app.js` le righe `RARITY_DEFAULT` / `RARITY_PRESETS` |
| `docs/APP.md` | Questo file |

Ordine di caricamento in `index.html`: `three.min.js` → `GLTFLoader.js` → `app.js` → `ship3d.js` → `boot()` → `versions.js` → `switcher.js`.
`app.js` e `ship3d.js` condividono **variabili globali** (nessun modulo ES): `ship3d.js` usa `S`, `LY`, `PV`,
`BODY`, `SIZE`, `ITEM`, `layout()`, `renderAll()`, `toast()`, `$`; `app.js` chiama `initShip`, `renderShip`,
`pickSlot`, `setShipCursor`, `window.setShipBody/resizeShip/panShip/resetPan`.

## 3. Come si esegue

- Dev: preview `mockup` (porta 6480), oppure aprire `mockup/index.html` da `file://`.
- Debug URL: `?model=<url.glb>` carica un body personalizzato.
- Docker: `docker compose up -d --build` → `http://localhost:6480`. In produzione l'immagine viene da `ghcr.io/jstplink/crafting:latest`.
- `version.json` è generato dal Dockerfile (versione CI `1.0.<run>`, sha, data). In locale non esiste. La scritta build mostra solo `v<APP_VERSION>`; i dettagli CI sono nel tooltip quando `version.json` esiste. Il pulsante versione (stessa scritta) apre il menu versioni (§3b).
- **Versione app**: `APP_VERSION` in `app.js` (oggi `7.0`) va incrementata a ogni versione e la versione va congelata con `scripts/snapshot.py` (§3b).
- nginx serve html/js con `no-cache` e `vendor/` con cache di 7 giorni.
- **Cache-busting** (Dockerfile): a ogni build ogni `src="….js"` locale di **ogni** `index.html` (radice e `versions/<v>/`) riceve `?v=<sha>`, così né browser né CDN mischiano script vecchi con html nuovo. Gli script nuovi che si aggiungono a un `index.html` sono coperti in automatico (purché locali e senza `?`).

## 3b. Versioning: provare versioni diverse dall'app

Obiettivo: poter aprire **qualsiasi versione passata** dell'app e confrontarne il "feeling", restando nell'app.

- **Radice del sito (`/`) = LATEST**: la copia di lavoro, sempre la versione più nuova. Si sviluppa qui.
- **`/versions/<v>/index.html` = snapshot congelato** di una versione rilasciata (immutabile). Le librerie `vendor/`, `versions.js` e `switcher.js` restano condivise alla radice (lo script riscrive i percorsi in `../../`).
- **Numerazione**: `major.minor` (**4.0, 4.2, 4.3, 5.0, 6.0**…). Le prime versioni erano state pubblicate come `0.4.0 … 0.5.0`: i **tag git storici** (`v0.4.0`, `v0.4.1`, `v0.4.2`, `v0.4.3`, `v0.5.0`) restano, con alias nel nuovo formato (`v4.0`, `v4.2`, `v4.3`, `v5.0`); dalla 6.0 i tag sono già nel nuovo formato. Ogni versione mantiene la propria chiave di salvataggio/flag (`STORE_VER` in `app.js`; le versioni pubblicate come `0.x.y` tengono quella storica, es. `crafting.save.0.5.0`).
- **Una versione nuova si inizia solo quando lo dice l'utente.** Fino ad allora ogni modifica entra nella versione corrente, che al commit si **ricongela** con `snapshot.py <v> --force`: la riga della versione corrente in "Versioni" (sotto) descrive quindi **lo stato attuale della copia di lavoro**, non un punto fisso nel passato — la si aggiorna quando cambia qualcosa di rilevante, senza aspettare la versione nuova.
- **Menu in-app**, tre pulsanti in alto a destra (`switcher.js`, identico in tutte le versioni):
  - **versione** (`v6.0 ▾`): apre **VERSION**, l'elenco delle versioni del manifest con data e note, per passare da una all'altra.
  - **FEATURES ▾** (`#featbtn`): gli interruttori (§3c), ognuno con la versione in cui è stato aggiunto (`since`). Assente nelle versioni senza `craftingExperiments` (4.0, 4.2).
  - **RARITY ▾** (`#rarbtn`, solo se esiste `window.craftingRarity`): 7 selettori colore LV1–LV7, applicati **dal vivo** e salvati per browser (`localStorage` `crafting.rarity`); **PRESETS** (Classic, Spectrum, più quelli salvati per browser in `crafting.rarity.presets`) applicabili con un click, salvabili/cancellabili; **RESET** torna ai default del codice; **SAVE AS DEFAULT** scrive colori e preset dentro `app.js` tramite il dev server locale (`POST /save-rarity`, §2) — va **committato**, altrimenti resta solo nel browser di chi l'ha premuto; senza dev server mostra un errore.
  - Una finestra alla volta: aprirne una chiude le altre; click fuori le chiude. Solo mouse (è uno strumento da mockup, come la pill INPUT). Dentro `#stage`: sparisce in view mode, **tranne** in questa versione dove la barra alta resta visibile anche in view mode (§9.5).
- **Salvataggi separati per versione**: chiave `localStorage` = `saveKey` dell'entry nel manifest. Non c'è modo di copiare le build tra versioni dal menu.
- **Feature (flag)**: una versione può esporre `window.craftingExperiments = { items(), toggle(id) }` (`items` → `{id, label, desc, on, since}`); la finestra FEATURES mostra ogni voce come interruttore ON/OFF. Le versioni congelate non hanno gli esperimenti nuovi (sono codice vecchio); hanno solo il menu.
- Se una versione non ha ancora un salvataggio proprio, `loadLocal` parte da quello storico `crafting.save.v1`; da lì scrive solo sulla propria chiave.

### Procedura di rilascio
**Versione nuova (solo quando lo chiede l'utente):**
1. Finire le modifiche in `mockup/` e impostare `APP_VERSION` (formato `major.minor`) in `mockup/app.js`.
2. Aggiornare questo documento **solo se serve** (§15), inclusa la riga della versione appena chiusa in "Versioni" se significativa.
3. `python scripts/snapshot.py <versione> --notes "<una riga>"` (fallisce se `APP_VERSION` non coincide o se lo snapshot esiste già).
4. Commit (incluse `mockup/versions/<v>/` e `mockup/versions.js`), poi `git tag v<versione>`, poi push.
**Commit dentro la versione corrente:** `python scripts/snapshot.py <versione corrente> --force` (tiene `saveKey` e note già nel manifest), commit, push; il tag non cambia. Aggiornare comunque la riga della versione in "Versioni" se il cambiamento è rilevante: descrive lo stato attuale, non serve aspettare il rilascio.
- Non modificare mai a mano una cartella `versions/<v>/`: se serve correggerla, `--force` e dirlo nel commit.
- Se una nuova versione cambia il formato del salvataggio, `loadLocal` deve restare tollerante (scarta id sconosciuti) o gestire la migrazione.

### Versioni
| Versione | Note |
|---|---|
| 4.0 | Baseline (tag `v0.4.0` = commit `685adf4`): Body/Arms, parametri moduli, slot cargo, view mode. Salvataggio `crafting.save.v1` |
| 4.1 | Solo cache-busting nel Dockerfile (commit `ccb8dc9`). Nessuno snapshot: UI identica alla 4.0 |
| 4.2 | Colori per tipo di modulo di nuovo attivi (rosso primary, giallo secondary, blu engine), scritta build ridotta a `v<versione>`. Snapshot **retroattivo** dal commit `da61880`. Salvataggio `crafting.save.v1` |
| 7.0 | Nuova estetica (layout descritto in §7): testate unificate e allineate (sockets · nome nave · SHIP DATA) unite da linea sci-fi, SHIP DATA in 3 blocchi con POWER a tacchette che lampeggiano nel diff, moduli integrati come riga di 3 chip, niente tipo-colore / glifo A / ✕ / lock sulle righe, targhetta LV verticale (`vertTag`), card di confronto a righe con REMOVE come etichetta esterna, view mode che nasconde solo la UI, menu RARITY con preset (SAVE AS DEFAULT scrive in `app.js` dal dev server). Salvataggio `crafting.save.7.0` |
| 4.3 | Leggibilità: testo più grande e più contrasto, stat chiave su ogni riga + delta + BEST + ordinamento cargo, overview più chiara. Ogni intervento è un esperimento ON/OFF (§3c). Salvataggio `crafting.save.0.4.3` |
| 5.0 | Grande passata UX + regole: rarità a targhetta LVn con sfumatura, tipo modulo dalla forma della riga, cargo a scomparsa e overview verticale, viste della lista socket, annulla/ripristina/reset, guida iniziale, etichette 3D, nuovo modello del calore (fire time / cooldown), solo le foglie si cambiano, DPS/valore/velocità valutati sul massimo del gioco, loadout quality, Body con moduli integrati in 3 varianti (Rusted / Ranger / Elite, 12 Body). Ogni intervento UX è un esperimento ON/OFF (§3c). Salvataggio `crafting.save.0.5.0` |
| 6.0 | **Stato attuale della copia di lavoro** (dettagli in §7). Layout a **pannelli indipendenti**: selettore Body in una barra propria in alto (`#shipPanel`, niente frecce dedicate: i glifi dello shortcut sono anche i pulsanti); pannello socket in alto a sinistra, righe alleggerite (via stat chiave e glifi ridondanti), rarità come targhetta verticale `LVn` di fianco all'icona (`vertTag`); card dei dettagli **sotto** il pannello socket, stile a righe con divisori leggeri e icona+LV in testata; dati nave in colonna a destra, in 3 gruppi (valore · difese/power · attacco/velocità), potenza a tacchette (`powerTicks`), rarità applicata anche a SHIELD e INTEGRITY; vista 3D centrata su quasi tutto lo stage; tre testate unite da una linea arancio sci-fi; linea di collegamento 3D↔lista per il socket selezionato/in hover (`socketLinks`); menu **RARITY** per personalizzare i 7 colori con preset; lista di 20 navi, 12 note + 8 sconosciute segnaposto (nome `?????`, scena 3D vuota); view mode che nasconde solo la UI, camera invariata. Salvataggio `crafting.save.6.0` |

## 3c. Esperimenti (flag)

Interruttori nella finestra **FEATURES** (§3b), tutti ON di default, salvati in `localStorage` (`crafting.flags.<STORE_VER>`), ognuno con `since` = versione in cui è stato aggiunto. Definiti in `app.js`: `FLAGS`, `flag(id)`, `loadFlags`, `applyFlags`, `window.craftingExperiments`.
**Promossi a comportamento standard** (non più interruttori, sempre attivi, `ALWAYS_ON`): `bigText`, `overview`, `slideCargo`, `bodyButton` — le loro righe qui sotto descrivono il comportamento, che c'è sempre. Con **tutti gli altri spenti** l'app torna vicina alla 4.2.
Quattro flag sono **nascosti di default tramite un secondo flag `hideX`** (pattern `HIDDEN_BY`, §12: `undoRedo`→`hideUndo`, `shipQuality`→`hideQuality`, `typeShape`→`hideTypeShape`, `socketLabels`→`hideSocketLabels`): `flag('undoRedo')` ecc. leggono sempre l'opposto di `hideX.on`, il proprio `on:` non è più letto da nessuno.

| Flag | Cosa cambia | Dove |
|---|---|---|
| `bigText` "Readable text" | Font più grandi (etichette maiuscole ≥ 15px, testo ≥ 16px) e `--dim` più chiaro | Solo CSS: blocco `#stage.ux-big …`. Classe `ux-big` messa sullo stage da `applyFlags` |
| `keyStats` "Key stat on rows" | Nel pannello socket la stat chiave sulle righe non c'è più (tolta per fare spazio al nome): resta per il cargo, a 2 linee (`×n · DPS/SPEED valore · ▲/▼ delta · BEST`), col chip `SORT · …` accanto a "BACK TO SOCKETS" (`.cg-bar`) | `KEYSTAT`, `statOf`, `SORT_FN`, `cargoItems`, `leftRow`, `renderRight`, `cycleSort`; CSS `.cg-row.two`, `.sub`, `.dlt`, `.best`, `.sortchip` |
| `typeShape` "Type by row shape" *(di fatto spento, vedi `hideTypeShape`)* | Il **tipo di modulo** non è un colore sull'icona ma la **forma dell'estremità sinistra della riga** (`.ic`): primary a punta, secondary arrotondata, engine a V (`clip-path`/`border-radius`, sfondo della riga dopo l'icona). Legenda nella guida (card MODULES) solo se attivo. La targhetta LV resta rettangolare. La vista 3D mantiene i colori per tipo | `applyFlags` (`ux-tshape`), guida in `renderIntro`; CSS `#stage.ux-tshape …`, `.tsh` |
| `hideTypeShape` **"Hide type-by-shape"** *(ON = nascosto)* | Icone dei moduli sempre **quadrate** (`HIDDEN_BY`, §12) | `HIDDEN_BY`, `flag('typeShape')` |
| `rarityTag` "Rarity tag" | Rarità come **targhetta `LV1`…`LV7`** nel colore della rarità: nel titolo della card e nel tag 3D (`rarDot`). Nelle righe socket/cargo/integrated è **dentro il blocco icona** (`.ic`, sotto l'icona) oppure, con `vertTag` ON, una **striscia verticale** a fianco dell'icona (`.vtag`) — mai più prima del nome. Righe **neutre**: niente sfumatura, lo sfondo colorato resta solo alla selezione | `rarTag`, `rarDot`, `modIcTag`, `leftRow`; CSS `.rtag`, `.ic .rtag`, `.vtag` |
| `vertTag` "Vertical LV tag" | La targhetta di rarità è una **striscia verticale stretta `LVn`** a destra dell'icona (`.vtag`, testo ruotato) invece che sotto l'icona: più spazio per il nome. Usata anche nella **testata della card dei dettagli** (§7.5, stesso `modIcTag`). Spento: targhetta sotto l'icona come prima | `modIcTag`, `applyFlags` (`ux-vtag`); CSS `.vtag` |
| `compactCard` "Compact info card" | Card informativa compatta invece della tabella larga; statistiche in griglia di celle corte (`ccell`: icona + etichetta breve, poi valore, con delta in anteprima), etichetta completa nel tooltip. Posizione/dimensione esatte e stile: §7.5 (cambiati più volte, non duplicati qui) | `CARD_SHORT`, `ccell`, `cgrid`, `renderCard`; CSS `#stage.ux-card #card`, `.cgrid`, `.cst` |
| ~~`bodyButton`~~ "Body switcher" *(sempre attivo)* | Il Body si cambia dalla barra `#shipPanel` (§7.2): **‹ NOME › `n / 20`**, senza finestra di selezione (A in focus body non fa nulla, `renderPicker` non si apre più, §13) | `renderLeft`, `act`; CSS `#shipPanel`, `.bodyhead`, `.bstep` |
| `blockedReason` "Why it won't fit" | Le righe cargo non montabili mostrano **sempre** il motivo: `NO POWER +n` o `CARGO FULL`; icona e testo attenuati | `why`/`overBy` in `renderRight`; CSS `#stage.ux-block …` |
| `hideUndo` **"Hide undo / redo"** *(ON = nascosto)* | Nascosto di default (`HIDDEN_BY`, §12). Funzione: **annulla/ripristina**, cronologia **per Body** (max 30 passi, non salvata, solo `att`; il cargo si aggiusta per differenza, `cargoFor`). Registra equip, unequip, remove all, random build, reset. **Reset build** (X su focus Body) torna a `DEFAULT_ATT[body]`. Tastiera: `Ctrl+Z`/`Ctrl+Y`, sempre attivi indipendentemente dal flag. Gamepad: **solo R3 = redo** (L3 fa sort, §3c `listModes`/`keyStats`: non c'è più un pulsante gamepad per undo) | `S.hist`, `record`, `histOf`, `cargoFor`, `stepHistory`, `resetBuild`, `DEFAULT_ATT`; hint in `renderBottom` |
| `intro` "First-time guide" | Schermata "CRAFTING · HOW IT WORKS" (4 card) alla prima apertura (`crafting.intro.seen`); si riapre con **GUIDE** in basso (Start breve < 350 ms, `H`, o click); `act('guide')` da qualsiasi focus | `S.intro`, `openIntro`, `closeIntro`, `renderIntro`, `#intro` |
| `socketLabels` "3D socket labels" *(di fatto spento, vedi `hideSocketLabels`)* | Etichetta piccola su ogni modulo montato e socket libero nella vista 3D (glifo taglia + nome breve); nascoste se dietro lo scafo o se si sovrappongono a un'etichetta più vicina o ai tag grandi. Hover/click su un'etichetta = hover/selezione del socket. Assenti in view mode | `buildLabels`, `placeLabels`, `V.labels` (ship3d.js), `#labels3d`; CSS `.lab3d` |
| `hideSocketLabels` **"Hide 3D socket labels"** *(ON = nascosto)* | Nessuna etichetta fluttuante nella vista 3D (`HIDDEN_BY`, §12); i tag grandi `#tagSel`/`#tagHov` restano (§8) | `HIDDEN_BY`, `flag('socketLabels')` |
| `socketLinks` "Socket link lines" | **Linea di collegamento 3D↔lista**, solo per il socket **selezionato** (arancione, spessa, visibile anche dietro lo scafo) e quello in **hover** (bianca). Percorso "cablaggio sci-fi": orizzontale, smusso a 45°, verticale, smusso a 45°, orizzontale fino al socket, con un pallino sul socket 3D (`linkPath`). Assente se la riga è scrollata fuori vista, con cargo aperto (resta solo il selezionato), in view mode e per le navi sconosciute | `buildLinks`, `placeLinks`, `linkPath`, `V.links` (ship3d.js), `#links`; CSS `#links` |
| `listModes` "Socket list views" | Un pulsante a destra del titolo "SOCKETS" (`.lmcycle`, mostra `VIEW <modo>`) e, con focus slot, **L3** (gamepad) / **O** (tastiera) cicla **TREE**, **FILLED**, **TYPE**, **RARITY** (LV7…LV1, senza etichette di gruppo), **POWER** (con `usato / generatore` nel titolo). **X smonta subito** (non serve più tenerlo: da quando sort è su L3, X è di nuovo un tasto solo, come `Delete`/✕). Gli arms compaiono solo in TREE. ↑/↓ seguono l'ordine mostrato | `LIST_MODES`, `listGroups`, `navOrder`, `cycleListMode`, `act('sort')`; CSS `.lmcycle` |
| `maxRatings` "Rated vs max" | PRIMARY/SECONDARY DPS, SHIP VALUE, MAX SPEED **e ora anche SHIELD e INTEGRITY** hanno una **sfumatura** (`.rated-bg`) nel colore della fascia di rarità, calcolata rispetto al **massimo del gioco**: per value/DPS/speed è la miglior build legale di qualunque Body (`gameMax(metric)` = max su `BODY_LIST` di `bestBuild(metric, body)`, DP su taglie/extension/split/generatore, esclusi custom e navi sconosciute); per shield/integrity, che sono **costanti del Body** non del loadout, è semplicemente il valore più alto tra i Body (`BODY_CONST`, stessa `gameMax`). Colore = fascia (`floor(%·7)+1`). **Il numero resta bianco**, non cambia colore: solo la sfumatura indica la fascia | `bestBuild`, `gameMax`, `BODY_CONST`, `rate`, `dpsRow`, `lineRow(…, rated)`; CSS `.rated-bg` |
| `slideCargo` "Slide-in cargo" *(sempre attivo)* | Il cargo vive in `#cargoPanel` e scorre da sinistra sopra la lista socket solo in focus `cargo`; si chiude con B, "BACK TO SOCKETS" o click fuori. Posizione/dimensione esatte: §7.3. Nella barra bassa: "Category" solo col cargo aperto, "Remove all" solo chiuso e solo con almeno un pezzo montato | `renderRight`, `renderBottom`, `applyFlags`; CSS `#stage.ux-slide …`, `.cg-back` |
| `stackBadge` "Stack count on icon" | Quantità in cargo come numerino sull'angolo dell'icona (`.qty`), non nella riga dei parametri | righe cargo in `renderRight`; CSS `.cg-row .ic .qty` |
| `rarityFade` "Rarity fade" | Sfumatura nel colore della rarità sulle righe slot/cargo, da sotto il nome, svanisce a due terzi della riga | CSS `#stage.ux-rfade …` |
| `hideQuality` **"Hide loadout quality"** *(ON = nascosto)* | Nascosto di default (`HIDDEN_BY`, §12). Funzione: **LOADOUT QUALITY** nel blocco di SHIP VALUE: livello medio dei moduli montati (`t.gear`) con delta, un quadratino per modulo nel colore della rarità con la forma del socket | `calc` (`t.lvs`,`t.mq`,`t.gear`), `qualityRow`; CSS `.qrow`, `.qtiles` |
| `overview` "Clearer overview" *(sempre attivo)* | Potenza mostrata una volta sola; slot vuoti chiamati "Empty" | `renderRight`, `renderCard`, `leftRow` |

Dettagli `keyStats`:
- **Delta** = stat del pezzo in cargo − stat del **modulo montato nel socket selezionato**, solo se dello stesso `kind`; `=` se uguale; nessun delta se il socket è vuoto o contiene un arm.
- **BEST** = pezzo con la stat più alta fra quelli **montabili**, solo se ce ne sono ≥ 2 e batte l'eventuale modulo montato dello stesso tipo.
- La riga cargo mostra la stat **per cui è ordinata**: con `power` mostra `POWER n` e il delta rispetto al modulo montato (qualsiasi tipo), senza BEST; altrimenti la stat chiave.
- **Ordinamenti** (`S.sort`, chip/`O`/L3 in focus cargo): `stat` (stat chiave ↓, poi rarità), `rarity` (rarità ↓, poi stat), `power` (potenza ↑, poi stat). Non vale per Arms. Non salvato.

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
Scafi definiti: **ZEPHYROS** (6 socket: 2×P3, 3×P2, 1×P1), misto, **NEEDLE** (4×P1, leggero), **COLOSSUS** (6×P3, pesante), **KESTREL** (5 socket, misto).
- **Moduli integrati**: ogni Body ha **sempre 2 armi primarie integrate + 1 engine integrato** (`body.integrated = [{key,mod,pos}]`). Fanno parte del Body: **non si cambiano, non sono nel cargo** (non stanno in `MODS`), **non consumano power**, **non contano nella loadout quality**; il loro valore è **dentro** `body.value`. Danno il **danno di base, il calore di base, la velocità di base e il consumo di boost di base** della nave (li somma `calc`). Le statistiche dipendono dal **livello** L (1–7) dei moduli integrati (`INTEG_GUN`, engine `Core Drive Mk<L>`: speed `16+11L`).
- **3 varianti per scafo** = 3 Body distinti (**12 in totale**), stessi socket/scafo, diversi per armi **e** rarità degli integrati (tier dello scafo `BODY_TIER`: Needle 1, Kestrel 2, Zephyros 3, Colossus 4):
  | Variante | id | Livello integrati | Armi integrate |
  |---|---|---|---|
  | **RUSTED** (scarsa) | scafo + `_rs` | tier | 2× Keel Gatling |
  | **RANGER** (standard) | scafo (id storico: i vecchi salvataggi finiscono qui) | tier + 1 | Keel Laser + Keel Gatling |
  | **ELITE** (rara) | scafo + `_el` | tier + 3 (max 7) | 2× Keel Laser |
  Poiché le statistiche seguono il livello, la variante rara di uno scafo debole supera quella scarsa dello scafo successivo (**"seconda vita"** degli scafi deboli: es. Needle Elite 216 DPS di base > Kestrel Rusted 112). Laser = più danno ma surriscaldano prima; gatling = fire time più lungo. Nome = `SCAFO VARIANTE` (max 16 caratteri). Generati in codice da `BODY_TIER`, `INTEG_POS`, `INTEG_GUN`, `INTEG_VARIANTS`. I salvataggi di Body non più esistenti restituiscono i loro moduli al cargo.
- **Ordine dei Body** (`BODY_LIST`, frecce ‹ › e "n / N"): per **qualità intrinseca, dalla peggiore alla migliore**, ordinato in `boot()` con `bodyQuality = ½ · livello integrati / 7 + ½ · bestBuild('value', body) / gameMax('value')`: gli scafi si **mescolano** (Needle Rusted → Needle Ranger → Kestrel Rusted → Needle Elite → Kestrel Ranger → Zephyros Rusted → Zephyros Ranger → Kestrel Elite → Colossus Rusted → Zephyros Elite → Colossus Ranger → Colossus Elite); **tra questi 12 vengono poi inserite le 8 navi sconosciute segnaposto** (vedi sotto), per un totale di 20. I body `.glb` custom si aggiungono in fondo.
- `BODIES_IN_GAME = 20` è il totale mostrato nel contatore del selettore Body (`n / 20`); `unlockedBodies()` (esclude le sconosciute e i custom) non è più mostrato in UI.
- **Navi sconosciute (segnaposto)**: non sono bloccate, **non esistono ancora / non si conoscono**: si sa solo che quello slot c'è nella lista. `UNKNOWN_NAMES` / `UNKNOWN_LIST` creano 8 Body `unknown:true` (cloni di scafi ELITE, nomi interni che **non si vedono mai**) così che 12 + 8 = 20. In `boot()`, dopo l'ordinamento per qualità, vengono **mescolate** ai 12 noti col pattern `UULULUULULUULULUULUL`. Una nave sconosciuta si può scorrere ma non usare e **non mostra niente**: nome `?????` (`shipName()`), **scena 3D vuota** (`renderShip` nasconde `V.shipRoot`), tutte le celle dell'overview a `—`, pannello SOCKETS con "UNKNOWN SHIP", card dei dettagli nascosta (classe `body-unknown` sullo stage). `unknownShip()` blocca (con toast) equip/unequip/removeAll/resetBuild/randomBuild e A sui socket. Escluse da `gameMax`, build vuota nel salvataggio.
- Regole di progettazione: niente socket sul retro dello scafo; i socket non devono sovrapporsi in vista frontale.
- Ogni body ha **la propria build**: `S.att` è quella del body attivo, `S.builds[bodyId]` le altre.

### 4.3 Arms (`PYLONS`) — bracci, illimitati (nessuna quantità in cargo)
| Tipo | Ingresso | Uscite (`outputsOf`) | Dove si monta |
|---|---|---|---|
| `ext` Extension | N | 1 socket di taglia N | **solo su socket del Body** (`canMount`), per evitare catene infinite |
| `split` Split | N ≥ 2 | 2 socket di taglia N−1 | su qualsiasi socket di taglia N |

Definiti: `ext1/2/3`, `split2` (P2 → 2×P1), `split3` (P3 → 2×P2). Le uscite di un arm sono socket a tutti gli effetti
(id `<padre>.<i>`), quindi gli split si concatenano. Gli arms **non consumano potenza e non hanno valore**; non hanno rarità (`lv`).

### 4.4 Moduli (`MODS`) — limitati dal cargo
Costruiti con `W()` (armi) e `E()` (motori). Campi comuni: `id, name, kind, fam, size, lv, value`.
- `kind`: `primary` (munizioni infinite, generano `heat`), `secondary` (caricatore `mag`, niente calore), `engine`.
- `fam` (famiglia): `gatling`, `laser` (primary), `rocket`, `smatter` (secondary), `engine`. Determina icona e tipo di munizione (`FAMILY`).
- Armi: `power, dmg, rate, acc`, `dps = round(dmg*rate)` calcolato. Motori: `power, speed, boostUse`.
- `lv` 1..7 = rarità, colore in `RARITY` (§3b: personalizzabile dal menu RARITY, default in `RARITY_DEFAULT`).
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
S.picker/pickIdx   selettore Body aperto / indice (codice presente, mai raggiungibile: §13)
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
`boostTime = BODY.boost / boostUse` (0 se nessun consumo).
Tutti i totali includono i **moduli integrati** del Body (danno, calore, velocità, boost; niente power). `fireTime = BODY.heatCap / heat` (secondi di fuoco continuo di tutte le primarie partendo da freddo; `Infinity` senza primarie), `coolTime = BODY.heatCap / BODY.heatCool`.
`T0 = calc(S.att)` è la build corrente.

### 6.3 Regole di legalità
- **Potenza**: `fits` se `power <= BODY.generator` (moduli soltanto). Superarla blocca l'equip ("NOT ENOUGH POWER").
- **Calore**: **informativo, non bloccante**. La generazione è **progressiva**: sparando si va **sempre** in overheat, la build decide **dopo quanto** (`fireTime`) e quanto dura il raffreddamento (`coolTime`).
- **Solo le foglie si cambiano**: un arm che regge pezzi sulle sue uscite (`holdsParts(sid)`) è **bloccato**: niente replace né unequip finché non si tolgono i pezzi (toast "REMOVE THE PARTS ON THIS ARM FIRST"). A sul socket bloccato non apre il cargo; il cargo mostra "THIS ARM HOLDS n PARTS"; la riga ha un lucchetto al posto del ✕; la card lo spiega. "Remove all", reset, undo/redo e random build lavorano sull'intera build e non sono toccati dalla regola.
- **Cargo**: dopo l'operazione `cargoSlots <= 25`, altrimenti "CARGO FULL".
- **Extension**: solo su socket radice (`canMount`).

### 6.4 Operazioni sulla build
- `attachTo(att, cargo, sid, item)`: **pura**. Rimuove tutto il sottoalbero di `sid` (i moduli tornano in cargo, gli arms spariscono; per la regola delle foglie in pratica il sottoalbero è vuoto, salvo "Remove all"), poi monta `item` (se dato, un modulo lo toglie dal cargo). Ritorna `{att,cargo,ret}`; `ret` = id restituiti.
- `makePreview(sid, to)` → `{sid,to,att,ret,t1,fits,room}`: simulazione senza modificare lo stato.
- `computePreview()` → `PV`: priorità a `hoverRemove` (passaggio sul ✕ di uno slot), poi a un hover su una riga **montata** (`S.focus!=='cargo' && S.att[S.hoverSlot]?.t==='mod'` → anteprima di rimozione), poi `hoverCargo`, poi la riga cargo evidenziata se `focus==='cargo'`; altrimenti `null`. `renderCard` legge sempre il socket da `PV.sid` (non da `S.sel`), perché con un hover può essere diverso.
- `equip(id, sid)` esegue (con toast e `flash`); se monti un arm seleziona automaticamente il suo primo figlio `<sid>.0`.
- `unequip(sid)`, `removeAll()` (rifiutati se il cargo non basta), `switchBody(id)`.

## 7. Interfaccia (stage fisso 1920×1080)

`#stage` è 1920×1080 posizionato al centro e scalato con `transform: scale(...)` da `fit()` (`min(w/1920, h/1080)`). Tutto dentro è
in **coordinate assolute a 1920×1080**. Font: Rajdhani (Google Fonts) con fallback. Nessun test responsive: cambia solo la scala.

**Cinque pannelli indipendenti**, ognuno con la propria `position:absolute` e il proprio `z-index` — necessario perché la vista 3D
ha un `<canvas>` opaco a tutto riquadro: un pannello sovrapposto senza uno z-index esplicito più alto finisce **coperto** dal
canvas (il canvas non ha z-index proprio, quindi basta un valore positivo qualsiasi). Tre pannelli galleggiano **sopra** la vista
3D (che occupa quasi tutto lo stage): è voluto.

| Regione | Elemento | Posizione/dimensione | z-index | Funzione di render |
|---|---|---|---|---|
| Barra alta | `#top` | 0,0 · 1920×160 | auto | `renderTop()` |
| Selettore Body | `#shipPanel` | **520×46**, in alto, centrato (`left:50%,top:176,transform:translateX(-50%)`) | 5 | `renderLeft()` |
| Pannello socket | `#left` | **356**×fino a 460 (poi scroll), in alto a sinistra (`left:40,top:176`) | 12 | `renderLeft()` |
| Cargo a scomparsa | `#cargoPanel` | stessa posizione/dimensione di `#left`, scorre sopra da sinistra | 14 | `renderRight()` |
| Card di confronto | `#card` | **356**×fino a 260 (poi scroll), **sotto `#left`, stessa colonna** (`left:40,top:706`) | 12 | `renderCard()` |
| Dati nave (overview) | `#right` | **204**×auto, in alto a destra (`left:1676,top:176`) | 5 | `renderRight()` |
| Vista nave | `#shipbox` | **1600×800**, centrata in orizzontale (`left:160,top:170`), arriva quasi alla barra bassa | auto (0) | `renderShip()` (ship3d.js) |
| Selettore body (finestra) | `#picker` | 510,180 · 880×780, sopra il centro | 30 | `renderPicker()` — **mai aperto**, vedi §13 |
| Barra bassa | `#bottom` | in basso, 100 alto | auto | `renderBottom()` |
| Toast | `#toast` | centro alto | 20 | `toast(msg, kind)` |
| Overlay uscita | `#leave-ov` | a tutto schermo | 50 | mostrato da `holdDone('leave')` |

`renderAll()` ricalcola `LY`, `T0`, `PV`, salva in locale, e richiama **tutti** i render. Ogni cambio di hover/selezione lo chiama.
Nota: `#top` e le tab "MAINTENANCE / RAIDER LOG / INVENTORY / TRADING" e l'HUD (21.980 / 14.000 / lv 30 / 121.834 CR) sono **decorazioni statiche** di contorno, non funzionano.

**Se si tocca ancora il layout**: ogni pannello che può sovrapporsi a `#shipbox` deve avere uno `z-index` esplicito; se si
ridimensiona `#left`/`#card`/`#cargoPanel` devono restare **la stessa larghezza** e `#cargoPanel` deve replicare
`left/top/width/height` di `#left` a mano (non c'è più sincronizzazione automatica via JS: sono valori CSS fissi).

**Estetica unificata dei pannelli** (fondo di `index.html`): `#left`, `#card`, `#right` e la barra Body (`#shipPanel`) hanno stesso fondo `--panel`, bordo 1px e ombra; le testate (`.lp-head`, `.bodyhead`) sono una barra scura con sottolineatura arancione, non un blocco arancione pieno. Le tre testate (sockets, nome nave, SHIP DATA) sono **alla stessa altezza** (top 176, 46px) e unite da una **linea arancio sci-fi** (`#hdrlink`, SVG statico in `index.html` con coordinate fisse: va rifatto a mano se si spostano i pannelli). Nella vista Tree non ci sono le intestazioni P1/P2/P3. Nelle righe socket/cargo il **tipo di modulo non ha colore** (icona neutra `--ic-bg`; il colore resta solo nel 3D), e non ci sono più il glifo A, il ✕ di smontaggio né il lucchetto sulle righe (smontare: `Del` / X tenuto).

### 7.1 Barra alta (`renderTop`)
HUD finto (emblema, barre, velocità 0 m/s, livello), titolo stazione, tab con "CRAFTING" attiva, crediti. Glifi LB/RB decorativi.

### 7.2 Selettore Body (`renderLeft`, dentro `#shipPanel`)
Barra `.head.bodyhead`: **‹ NOME › `n / 20`**. Sfondo pannello semplice (`var(--panel)` + bordo); il colore forte resta solo sul
contorno di focus (`.head.focus`, bordo bianco) e sui pulsanti. **Niente pulsanti freccia dedicati**: al loro posto i **glifi
dello shortcut stesso** (`.bstep`, bottoni), che mostrano **quale tasto funziona davvero nel focus corrente** (LT/RT in focus
`slots`, freccia sinistra/destra del D-pad in focus `body`) e sono **anche cliccabili col mouse**. Compaiono solo quando
`S.focus!=='cargo'` (lì LT/RT cambia categoria). **Un click su `.bstep` non sposta `S.focus` su `'body'`**: cambia solo la nave,
lasciando il focus dov'era — il contorno bianco di focus resta un segnale di navigazione da tastiera/gamepad (si raggiunge
salendo oltre il primo socket). Il nome scorre se non entra (`marquee`).

### 7.3 Pannello socket (`renderLeft`, `leftRow`, dentro `#left`)
- **Header** (`.lp-head`, 56px): titolo "SOCKETS" e il pulsante unico della vista (`.lmcycle`, §3c `listModes`). **Non è
  collassabile**: mostra sempre tutto il contenuto, con scroll interno oltre i 460px.
- **Moduli integrati**: **una riga di 3 chip** in cima al corpo della lista (`.irow`/`.ichip`, sopra i socket in ogni vista): icona
  della famiglia + nome breve + barra nel colore di rarità, nome completo/LV nel tooltip. Non si selezionano. Nella vista POWER
  ogni riga montata mostra a destra il **power consumato** (`.pwn`).
- **Lista socket** divisa per sezioni P3/P2/P1 (`sec-title`). Ogni riga (`.slot`): blocco icona (`.ic`, colonna verticale, per
  impilare icona + targhetta se serve — icona + vertical tag = `modIcTag(it)`, §3c `vertTag`, riusata anche dalla card §7.5), nome
  **completo e mai tagliato** (se non entra scorre avanti e indietro, `.nmx.scroll`), glifo `A` se selezionato+focus, pulsante ✕
  (`data-unq`) per smontare. **Niente** stat chiave né glifi di uscita degli arm sulla riga (solo nella card sotto).
- Indentazione di 24px per livello (`--d`) e linee ad albero fino al braccio genitore (`--up`).
- Stati CSS: `sel`, `focus`, `hov`, `flash`, `pv-add` ("→ NEW"), `pv-rem` (barrato), `rar` (tinta rarità via `--rc`), `free` (vuoto, tratteggiato; con `overview` mostra "EMPTY"), `pyl`, `child`.
- **Sfumatura di rarità delle righe** (`rarityFade`, `.slot.rar`/`.cg-row.rar`): direzione da sinistra a destra (`90deg`). Non
  confondere con `.rated-bg` (§3c `maxRatings`), che va da destra a sinistra: sono due sfumature diverse con direzioni opposte.

### 7.4 Dati nave (`renderRight`, dentro `#right`)
**Colonna singola** (`.ovgrid.c1`, una statistica per riga). Ogni cella (`ovRow`/`lineRow`/`dpsRow`, classe `.ovc`): etichetta
sopra, sotto **delta a sinistra + valore (28px) a destra** sulla stessa riga. Il delta (`.sd`, dentro `.dslot`) **si genera
sempre**, anche vuoto (`visibility:hidden` via `.sd.off`, non omesso): altrimenti la riga cambia altezza quando il delta
appare/scompare — **verificare sempre con un prima/dopo le altezze di `.ovc`** se si tocca questa zona.
Divise in **3 gruppi** (`.dpsblock`, ognuno con un bordo sotto):
1. `SHIP VALUE` da solo. Delta colorato verde/rosso come tutte le altre stat (`dcls('value', …)`).
2. `SHIELD` · `INTEGRITY` · `POWER` (con `shipQuality` sotto: LOADOUT QUALITY).
3. `FIRE TIME` · `PRIMARY DPS` · `SECONDARY DPS` · `MAX SPEED` · `BOOST DURATION`.
- **POWER è l'unica stat a tacchette** (`powerTicks`, `.ptick`): una per punto di generatore, **bianche** = usate, scure = libere; in anteprima le tacchette che cambiano (`.df`) diventano **verdi** (power liberato) o **rosse** (aggiunto/oltre il generatore) e **lampeggiano** (`tickblink`). Accanto resta il numero `n / generatore` con il delta.
- **Con `maxRatings`** (§3c) SHIELD e INTEGRITY hanno la sfumatura `.rated-bg` come le altre stat valutate, calcolata su `gameMax('shield'/'integrity')` (massimo tra i Body, non `bestBuild`: sono costanti del Body).
- Il titolo "SHIP DATA" non è arancione (stessa testata scura di SOCKETS e del nome nave).

### 7.5 Card di confronto (`renderCard`, dentro `#card`, sotto la lista socket)
- **Testata come una riga della lista** (`.ch`): icona + targhetta `LVn` verticale del modulo (`modIcTag`, stessa funzione di
  `leftRow`, §7.3/§3c `vertTag`), poi il titolo. L'icona/tag compare per un modulo montato o per il modulo coinvolto in
  un'anteprima (quello che arriva, o quello rimosso se non ne arriva uno); **non** per un arm né per il socket vuoto (le
  righe cargo per gli arm non hanno rarità). Con un modulo, la testata porta anche `--rc` (classe `.ch.rar`) e prende **la
  stessa sfumatura di rarità da sinistra a destra della riga corrispondente** nella lista sopra, più il bordo colorato
  sull'icona (`.ic` con `box-shadow` inset, come `.slot.rar .ic`): `--rc` sta sulla testata, non sui singoli figli, perché
  `.vtag` è **fratello** di `.ic`, non discendente, e deve poterlo ereditare anche lui.
- **Righe dei parametri senza sfondo pieno**: solo un **divisore leggero** (`border-bottom` sottile) tra una riga e l'altra,
  niente più il blocco a sfumatura per ognuna; l'ultima riga non ha divisore.
- **Con focus su un socket vuoto e nessuna anteprima la card si chiude** (`#card.collapsed`, `display:none`, niente testo). **Geometria fissa**: la lista socket ha `max-height:464` (top 176) e la card è un box fisso `top:682`, `height:271` (le righe parametro sono `flex:1`, minimo 24px e massimo 44px: si dividono l'altezza rimasta fino alla base, così non c'è mai scroll — verificato su tutti i moduli/socket: 0 overflow) (il suo bordo basso, 953, coincide con quello della colonna SHIP DATA a destra: se cambia l'altezza dell'una va adeguata l'altra), perché il suo stato più alto (diff con più parametri) misura ~340px e deve entrare sopra la barra bassa: se si aggiungono parametri rimisurarlo; `#cargoPanel` ha gli stessi top/altezza di `#left`. **"REMOVE"** non è nella card ma un'etichetta rossa `#cardtag` sopra di essa (posizione fissa `top:652`), così non sposta i dati. Nel diff `vecchio – nuovo` c'è un trattino al posto delle frecce, con lo stesso font dei valori normali.
- **Sotto il pannello socket, stessa colonna e larghezza**: le differenze di parametro restano vicine alla lista/cargo che si sta scorrendo.
- Senza anteprima, modulo montato: griglia dei parametri con **"Type" come prima riga** (icona famiglia + nome, es. "Gatling").
  **Nessuna descrizione**: non c'è (e non c'è mai stata in questo stile) un testo narrativo sul modulo, solo i parametri.
- Titolo di rimozione: **"REMOVE" non è più nel titolo del modulo**, è una **banda rossa a sé in cima al pannello** (`.rm-band`, sopra la testata `.ch`), così il nome del modulo che si sta togliendo resta solo nella testata, con la sua icona/LV/sfumatura.
- Con anteprima: griglia `INSTALLED | NEW | Δ` (per arms: uscite e socket liberi prima/dopo), riga "Returns to cargo", footer
  con verdetto (`READY TO EQUIP/REPLACE`, `NOT ENOUGH POWER…`, `CARGO FULL…`). **Rimuovere un pezzo senza problemi di cargo non
  mostra nessun verdetto** (risparmia spazio).
- Se cambia il tipo di modulo (es. arma → motore) mostra solo i parametri del nuovo.

### 7.6 Selettore Body (finestra) (`renderPicker`)
Griglia 2 colonne di card (`.bcard`): nome, "IN USE", schema dall'alto dei socket (`schematic`), stats del body, conteggio socket per taglia, parti montate. Navigazione: ←→ ±1, ↑↓ ±2, A conferma, B/click fuori chiude. **Mai aperta in questa versione** (§7.2: A in focus `body` non fa niente); il codice resta, vedi §13.

### 7.7 Barra bassa (`renderBottom`)
Suggerimenti dei tasti **che cambiano col contesto** (picker / focus body / focus slot / focus cargo). In focus slot, con `listModes`, e in focus cargo, con `keyStats`, c'è anche **Sort** (**L3** sul pad, `O` su tastiera — vedi §3c/§9.3: da quando sort è su L3, X non ha più il doppio uso tap/hold e smonta sempre subito). Con `undoRedo`: "Undo / Redo" — su gamepad **solo Redo (R3)**, su tastiera entrambi (`Ctrl+Z`/`Ctrl+Y`) — e, in focus body, "Reset build" (X); con `intro`, in focus body, "Guide" (Y). La categoria da tastiera mostra solo `Tab`; la rotazione è "Rotate" per tutti. **Lo spazio è al limite**: in tastiera + focus cargo i suggerimenti arrivano a toccare la pill INPUT; ogni suggerimento nuovo va misurato (o compensato) in tutti i contesti e con entrambi i dispositivi. Sempre presenti: rotazione (RS), `INPUT · <pref>` (pill che cicla gamepad → keyboard → auto), **HOLD TO LEAVE** (START/Esc tenuto premuto 900 ms → overlay "UNDOCKING…"). Niente più hint/pulsante per il view mode (§9.5). "Remove all" (Y / R) è hold-to-confirm 900 ms (`HOLD_MS`, `holdStart/holdEnd/holdDone`, barra di avanzamento via `--p`).
`glyph(n)` restituisce il glifo gamepad o il tasto tastiera secondo `dev()`.

### 7.8 Debug / mockup-only
Il pulsante viola **DEBUG · RANDOM BUILD** (`#dbgRandom` → `randomBuild()`) monta una build casuale ma legale (fino a 20 tentativi). La pill INPUT e la scritta build `#build` (cliccabile: menu versioni/esperimenti, `switcher.js`) sono elementi del mockup, non del gioco.

## 8. Vista 3D (`ship3d.js`)

- `initShip()`: renderer WebGL (`preserveDrawingBuffer`), luci, piattaforma di attracco (`floorG`), `shipRoot` con `V.hull` (scafo) e `V.dyn` (parti dinamiche).
- `renderShip()`: **ricostruisce da zero** `V.dyn` a ogni chiamata (`clearDyn` libera geometrie/materiali). Se c'è un'anteprima con `PV.to` usa `PV.att`/`layout(PV.att)`: le parti nuove vengono disegnate "fantasma" (verde se `fits`, rosso altrimenti), quelle in rimozione in `rem`. Per una nave sconosciuta (`BODY.unknown`) nasconde `V.shipRoot` intero: scena vuota, solo il dock.
- Per ogni socket: puntoni degli arms (`strut`, sfere di giunzione), modulo (`buildModule` per `kind`: primary/secondary/engine, scala `MOD_SCALE[size]`), **marker** (sprite forma+colore) **solo sui socket liberi** e non in view mode, sfera invisibile per il picking (`V.pickers`).
- **Outline** (`addOutline`, hull invertito) sul socket selezionato (arancione) o in hover (bianco); assente in view mode.
- **Moduli integrati** disegnati sullo scafo alle posizioni `body.integrated[].pos` (armi sul muso, engine dietro), sempre stile normale: niente picking, tag, etichette o hover.
- **Anelli colorati dei socket** (bordo nel colore della taglia attorno alla piastra di ogni socket dello scafo, creati in `buildHull` con `userData.rimOf`): **nascosti dove è montato un arm**, visibili sotto i moduli e sui socket liberi. Materiale **lit e opaco** (`stdMat`, niente emissive), così non si scambia per i marker 3D.
- **Arms non interattivi in 3D**: nessuna sfera di picking, nessun outline di hover, nessun tag; un arm selezionato dalla lista mostra **solo** l'outline arancione.
- **Linea socket → lista** (flag `socketLinks`, §3c): overlay SVG `#links` disegnato da `placeLinks` a ogni frame, solo per il socket selezionato e quello in hover, con percorso a 45° e segmenti orizzontali/verticali.
- **Tag** HTML (`#tagSel`, `#tagHov`) ancorati alla posizione proiettata del socket: **solo il nome in grassetto**, nessun
  sottotitolo con la taglia (si vede già da forma/colore del marker e dalla sezione della lista). Con `socketLabels` il tag di
  hover non compare e si aggiungono le etichette piccole di `#labels3d` (`buildLabels`/`placeLabels`) — di fatto spento di
  default (`hideSocketLabels`, §3c).
- `animateShip()`: camera orbitale con smorzamento verso `S.rot` (yaw, pitch, distanza) + `V.pan` (solo view mode), leggera oscillazione della nave, pulsazione del marker selezionato, effetto "pop" dopo l'equip, fiamme dei motori animate.
- `pickSlot(e)`: raycast sui picker → id socket (usato da hover e click).
- Camera: `TARGET=(0,.5,-.3)`, **FOV 40**; distanza iniziale `homeRot()` = `BODY.cam` (se un `.glb` nuovo sembra troppo
  vicino/lontano, agire sul suo `cam`); limiti in `ROT()`: normale pitch −.25..1.1, dist 8..34; in view mode pitch ±1.45, dist 3..45.

### 8.1 Body personalizzati da `.glb`
Trascinando un `.glb/.gltf` sullo stage (o con `?model=`), `setHull` cerca i nodi chiamati `sock_p<size>_<n>` (regex tollerante: `socket_p2-1`, ecc.), il cui asse locale **+Z** è la direzione di uscita. Se ne trova, crea `BODIES['custom<N>']` (tag `CUSTOM`, valori di default: value 1500, integrity 20000, shield 10000, generator 26, heatCap 400, heatCool 60, boost 100), lo aggiunge a `BODY_LIST` e lo seleziona. Il modello è scalato a 6 unità sul lato maggiore. **I body custom non sopravvivono al reload** (il salvataggio scarta body sconosciuti).

## 9. Input

Le azioni logiche passano tutte da **`act(name)`**: `up down left right a b x sort catNext catPrev view undo redo guide`. `act` smista in base al contesto (guida aperta → view mode → picker → undo/redo → focus body → focus slot/cargo). `view` non è più raggiungibile da nessun controllo (§9.5, §13), resta solo come caso gestito in `act()`.

### 9.1 Flusso di navigazione
- **Focus `slots`** (default): ↑↓ cambiano socket nell'ordine della vista (`moveSel`, salendo oltre il primo si passa a `body`); **A** → passa al cargo (se vuoto, toast informativo; su un arm bloccato, toast); **X smonta subito** (mai su un arm bloccato); con `listModes` **L3** cambia ordinamento della lista. **`moveSel` imposta anche `S.hoverSlot` sul socket appena selezionato**: navigare con tastiera/gamepad "hover-a" la riga esattamente come farebbe il mouse, quindi su un socket montato la card sotto mostra subito l'anteprima di rimozione (§6.4 `computePreview`), non solo passandoci sopra col mouse. Si azzera entrando in focus `body`.
- **LT/RT (tastiera Shift+Tab / Tab)**: **con il cargo aperto cambiano categoria; altrimenti (focus `slots` o `body`) cambiano la nave** precedente / successiva (`act('catPrev'/'catNext')` → `stepBody`). I pulsanti `.bstep` (§7.2) mostrano il glifo giusto per il dispositivo e sono cliccabili col mouse; spariscono col cargo aperto. Un click su di loro **non** sposta `S.focus` su `'body'`.
- **Focus `cargo`**: ↑↓ evidenziano una riga (→ anteprima live); **A** equipaggia; **B / ←** torna a `slots`; **LT/RT** cambiano categoria; **L3** (pad) / `O` cambia l'ordinamento (con `keyStats`).
- **Focus `body`**: ←→ cambia body (la barra ‹ NOME › si evidenzia), **A** non fa niente (niente selettore), **X** reset build (`undoRedo`), ↓ torna agli slot.
- Dopo un `equip` il focus torna a `slots`.

### 9.2 Tastiera
`↑/W ↓/S` naviga · `Enter/Space` = A · `Backspace` = B · `←/→` · `Del/X` smonta (in focus body: reset build) · `Tab / Shift+Tab` categoria (cargo aperto) o nave successiva/precedente · `O` ordinamento cargo / vista lista · `R` (tenuto) rimuovi tutto · `Ctrl+Z` / `Ctrl+Y` (o `Ctrl+Shift+Z`) annulla / ripristina · `H` guida · `Esc` (tenuto) lascia; in picker chiude; con la guida aperta la chiude. **Niente più tasto per il view mode** (era `V`, rimosso insieme agli altri due ingressi, §9.5).
Nota: i tasti `Q/E` sono mostrati come glifi LB/RB ma **non sono associati a nulla**.

### 9.3 Gamepad (mapping standard, `pollPad` ogni frame)
A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 View=8 Start=9 D-pad 12–15. Stick sinistro Y = su/giù (con ripetizione a 90 ms dopo 380 ms). Stick destro = rotazione camera. LT/RT = categoria (cargo aperto) o nave precedente/successiva; **X = smonta subito**, sempre (`act('x')`, senza distinzione tap/hold: da quando sort è su L3, X torna a fare una cosa sola); Y (tenuto) = rimuovi tutto; Start (tenuto) = lascia, **Start breve (< 350 ms) = guida** (`intro`); **L3 = ordinamento** (cargo: ordinamento del cargo; focus slot con `listModes`: ciclo vista lista) sostituendo il vecchio ruolo di annulla; **R3 = ripristina** (redo); l'annulla (undo) su gamepad non c'è più, resta solo da tastiera (`Ctrl+Z`). Il pulsante **View (8) non fa più nulla all'ingresso** (§9.5): resta tracciato (`cur.view`) solo per l'eventuale uscita, che in pratica non serve più visto che non si può più entrare in view mode da UI.
`inputPref='auto'` cambia i glifi in base all'ultimo dispositivo usato; `gamepadconnected` mostra un toast.

### 9.4 Mouse
- **Hover** riga cargo / riga slot / ✕ / socket nella vista 3D → aggiorna `S.hover*` → anteprima e outline (ogni cambio chiama `renderAll`).
- **Click** slot o socket 3D → seleziona (focus `slots`); con `slideCargo` il click su una riga socket apre anche il cargo, e un click fuori dal cargo aperto lo chiude; **click riga cargo → equipaggia**; ✕ smonta; tab categorie; chip `SORT` (`data-sort`); hint della barra bassa attivano l'azione corrispondente; click su `.bstep` (§7.2) cambia nave.
- **Vista 3D**: trascina = ruota (soglia 5px per distinguere dal click), rotella = zoom, doppio click = reset camera. Tasto destro/centrale/Shift+drag = pan (solo view mode).

### 9.5 View mode (`setView`) — funzione presente ma **irraggiungibile**
`setView()` e tutto il suo CSS (`#stage.viewmode`, `#viewexit`, `#viewui`) esistono ancora e restano corretti (`#shipbox` resta dov'è, la camera non viene toccata, la UI si nasconde tranne la barra alta), ma **i tre ingressi sono stati rimossi**: il tasto `V` da tastiera, il pulsante View sul pad, e l'hint/pulsante "View mode" nella barra bassa. Non c'è più un modo normale di entrare in view mode (solo da console: `setView(true)`); l'uscita (`Esc`/`Backspace` da tastiera, B/View da pad, pulsante EXIT VIEW MODE) resta nel codice ma di fatto non serve più. Stesso trattamento del picker (§7.6, §13): il codice resta, l'ingresso no.

## 10. Persistenza (`saveLocal` / `loadLocal`)
- Salva a ogni `renderAll` (solo se il JSON è cambiato): `{ body, builds (tutte, inclusa la corrente), cargo }`.
- Chiave = `crafting.save.<APP_VERSION>` (una per versione). Se manca, si legge la storica `crafting.save.v1` (`LEGACY_SAVE_KEY`).
- Flag esperimenti: `crafting.flags.<STORE_VER>`.
- Colori rarità: `crafting.rarity` (copia colori) e `crafting.rarity.presets` (preset per browser); indipendenti dalla versione (§3b).
- Non salva: selezione, categoria, ordinamento, camera, view mode, preferenza input.
- Al caricamento scarta id sconosciuti al catalogo attuale e allinea `t` arm/modulo; scarta anche i montaggi su **socket che non esistono più**, rimettendo i moduli in cargo; i moduli nuovi partono con uno stack pieno; se l'id body non esiste usa ZEPHYROS. Per azzerare: cancellare la chiave della versione da localStorage.

## 11. Boot (`boot()`)
`loadLocal` → `loadFlags` → `applyFlags` → camera `homeRot()` → scritta build → `renderTop` → `initShip` → `renderAll` → avvio `pollPad` → fetch di `version.json` per completare la scritta build.

## 12. Convenzioni CSS/UI da rispettare
- Colore dei **tipi di modulo** (dalla 4.2): primary rosso `--pri`, secondary giallo `--sec`, engine blu `--eng`, su icone delle righe (`.slot`, `.cg-row`), bordo della tab attiva e modelli 3D (`KIND_COL` in `ship3d.js`). Con il flag `typeShape` le icone diventano neutre e il tipo passa alla **forma dell'estremità sinistra della riga** (§3c); il 3D resta colorato. Non aggiungere altri significati al colore: taglia socket (forma+colore), rarità (tinta riga) e tipo modulo bastano.
- Rarità: con `rarityTag` una **targhetta `LVn`** (dentro il blocco icona, o verticale a fianco con `vertTag`) e righe neutre; senza il flag tinta riga `--rc` + `rdot`. Niente pallini/barrette (sembrano una carica) né solo colore (gemma).
- I delta nelle statistiche **non devono mai cambiare l'altezza/larghezza della riga**: slot a larghezza fissa (`dslot`) o badge assoluti (`.sd`), generati sempre e nascosti con `visibility:hidden` (`.sd.off`) quando non c'è nulla da mostrare — mai omessi dal markup (§7.4).
- **Tipografia** (`bigText`): etichette MAIUSCOLE ≥ 15px, testo normale ≥ 16px, niente sotto i 14px per ciò che si legge. Testi secondari: `--dim`; grigi più spenti (`#5c…`, `#6b…`) hanno contrasto < 4.5:1 ed evitarli per testo nuovo (usare `#8a939b` o più chiaro).
- **Ogni modifica UX confrontabile va dietro un flag** (§3c): il CSS nuovo si scopa con una classe sullo stage (`ux-big`, `ux-ov`, …) o si genera solo quando il flag è attivo, così con il flag spento resta il comportamento precedente.
- **Per disattivare di default un vecchio flag già rilasciato**: non basta cambiare il suo `on:` nel codice — un utente con già un `crafting.flags.<v>` salvato (basta aver toccato *un* interruttore qualsiasi: `toggle()` li salva tutti insieme) resta con il vecchio valore. Aggiungere invece un **nuovo** flag `hideX` (mai salvato prima) con `on:true` e mapparlo in `HIDDEN_BY: { x:'hideX' }`: `flag('x')` legge sempre l'opposto di `hideX.on`. Esempi: `hideUndo`, `hideQuality`, `hideTypeShape`, `hideSocketLabels`.
- Il nome del body ha larghezza fissa (150px) così i pulsanti ‹ › non si spostano.
- Il CSS è stratificato (regole successive sovrascrivono le precedenti, es. `.slot`, `.cg-row`, `.st`, `.wc`): quando si modifica un componente cercare **tutte** le occorrenze del selettore.

## 13. Codice morto / stranezze note
- `skCell()`, `wcell()` e le classi `.wrow/.wc/.wc.sk` (vecchia griglia socket liberi/pot.) **non sono usate**; il riepilogo FREE SOCKETS non c'è più nell'overview: i socket liberi si vedono solo nell'anteprima degli arms.
- `ratedBar()` (vecchia barretta "% OF MAX") e `uptime` in `renderRight` (vecchia barra del ciclo di calore) non sono più usati.
- `renderPicker` / `#picker` esistono ma non vengono mai aperti (§7.2, §7.6): il markup di `#shipPanel` non genera più `data-bpick`. `.lsort`, `.bodybtn`, `.guidebtn` hanno CSS ma nessun markup.
- `statCell`, `.stats`/`.st`, `.pw-row`, `.hnum`, `.valrow` non sono più usati (l'overview usa solo `ovRow`/`lineRow`/`dpsRow`).
- `bigText`, `overview`, `slideCargo`, `bodyButton` non sono più in `FLAGS` ma il codice usa ancora `flag('…')`: rispondono sempre `true` tramite `ALWAYS_ON`. `flag('undoRedo')`/`flag('shipQuality')`/`flag('typeShape')`/`flag('socketLabels')` sono l'opposto dei rispettivi `hideX` (`HIDDEN_BY`, §12); il loro `on:` proprio non è più letto da nessuno.
- `outGlyphs`, `modDesc`/`DESC_FAM`/`DESC_LV`, `class="fam"` (targhetta famiglia nel titolo della card), `.tag3d small`, `holdRelease()`, `.rm-word` sono stati **rimossi dal codice** (non solo nascosti): glifi di uscita sulla riga di un arm, descrizione fittizia del modulo, sottotitolo taglia del tag 3D, il meccanismo tap/hold che condivideva X tra sort e smontaggio, il colore rosso di "REMOVE" nel vecchio titolo (ora `.rm-band`, §7.5). Se servono di nuovo vanno riscritti.
- `setView`/`#stage.viewmode`/`#viewexit`/`#viewui` esistono ma **non sono più raggiungibili da nessun controllo** (§9.5): stesso trattamento di `renderPicker`/`#picker`. `act('view')` resta gestita ma nessun elemento genera più quell'azione.
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
- **Nuovo esperimento (flag)**: voce in `FLAGS` (app.js), `flag('id')` nei punti di render, eventuale classe in `applyFlags` e CSS scopato; per disattivarlo di default vedi il pattern `HIDDEN_BY` in §12. Il menu FEATURES la mostra da solo.
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

**Come si scrive un aggiornamento**: si modifica il paragrafo che descrive la cosa cambiata, sul posto, come se fosse sempre
stato così — non si annota "prima era X, ora è Y perché..." a meno che il *perché* serva a chi lavorerà dopo (una regola da
rispettare, un bug reale da non reintrodurre, una scelta non ovvia). La cronologia di una sessione di lavoro vive nella
conversazione e nei commit git, non in questo file.

## 16. Backlog UX e stato del lavoro

**Backlog UX** (proposte di leggibilità, tutte chiuse): **4.3** — testo leggibile, stat chiave sulle righe (+ delta, BEST,
ordinamento), overview più chiara. **5.0** — rarità a targhetta LVn e righe neutre, motivo "non si può" sempre visibile, nomi
mai tagliati, annulla/ripristina + reset build + guida alla prima apertura, etichette 3D collegate alla lista. **Scartato**: il
tooltip di spiegazione del calore (rimosso: il calore resta due numeri, FIRE TIME e COOLDOWN, senza spiegazione); il debug e la
pill INPUT restano (sono strumenti del mockup). **Nessun punto aperto.**

**Stato**: la **5.0** e la **6.0** sono committate e taggate (`v5.0`, `v6.0`; alias dei tag storici `v0.x.y` invariati). La riga
"6.0" in "Versioni" (§3b) descrive **lo stato attuale della copia di lavoro**: viene aggiornata ai commit successivi finché
l'utente non chiede una versione nuova (regola esplicita: "una versione nuova si inizia solo quando lo dico io"); quando la
chiederà, si segue la procedura di rilascio (§3b) con `APP_VERSION` e riga "7.0".

**Due interpretazioni non confermate dall'utente** (segnalate durante il grande riordino del layout, risposta mai arrivata —
controllare se nel frattempo è stata data, correggere se serve):
1. "Rimuovi le icone di socket dalla riga" → interpretato come i glifi di uscita di un arm (`outGlyphs`, rimossi dal codice), non le icone principali dei moduli/socket vuoti.
2. "Riduci la pagina info a destra del 15%" → interpretato come il pannello dati nave (`#right`), non la card di confronto (già spostata a sinistra in quel momento).

**Pendenze tecniche**
- Tag git `v0.4.1` sul remoto punta al commit `61babe6` (pre-merge) invece che a `ccb8dc9`. Correzione: `git push origin :refs/tags/v0.4.1 && git tag -f v0.4.1 ccb8dc9 && git push origin v0.4.1` (l'assistente non può farla: è bloccata come operazione distruttiva).
- Il cache-busting esteso del Dockerfile (a tutti gli `index.html`, comprese le versioni congelate) è stato provato solo come regex, non con un build Docker reale.
- L'ordinamento ora è su **L3**, non più X: non provato con un controller reale.
- Spostando l'ordinamento su L3, l'**undo via gamepad è sparito** (prima era su L3 insieme a redo su R3): scelta presa per risolvere il conflitto, non esplicitamente richiesta. Resta `Ctrl+Z` da tastiera. Se serve un modo per farlo dal pad, va deciso un pulsante (R3 tenuto? doppio tap?).
- Il layout descritto in §7 è stato verificato solo in Chromium headless a 1920×1080 e letture dirette del DOM, mai con un gamepad reale né in Docker.
- `vertTag` e `socketLinks` hanno `since:'6.0'` (già committati sotto quel tag); `hideTypeShape`/`hideSocketLabels` hanno già `since:'7.0'` come bozza per quando si aprirà quella versione: uniformare i `since` quando si deciderà il numero della prossima versione.
