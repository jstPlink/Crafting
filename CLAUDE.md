# Crafting

Mockup vanilla JS (nessun build step) della schermata Crafting: Body → Arms → moduli, con vista 3D three.js.

**Prima di lavorare sul codice leggi [docs/APP.md](docs/APP.md)**: descrive tutto il funzionamento (dominio, stato,
calcoli, UI, 3D, input, salvataggio, versioning, deploy, ricette). Usalo come unica fonte di riferimento invece di
rileggere `mockup/app.js` per intero.

Regole:
- **`docs/APP.md` si aggiorna solo quando serve**, non a ogni commit: vedi "Quando aggiornare" in fondo a `docs/APP.md` (§15). Nel dubbio valuta se chi lo legge dopo verrebbe ingannato dal testo com'è; se sì aggiornalo nello stesso commit, se no lascialo.
- **Versioni `major.minor` (4.0, 4.2, 4.3, 5.0…). Una versione nuova si inizia SOLO quando lo dice l'utente**: fino ad allora
  ogni modifica entra nella versione corrente e al commit la si ricongela con `python scripts/snapshot.py <versione corrente> --force`.
  Per una versione nuova: nuovo `APP_VERSION` in `mockup/app.js` + `snapshot.py <versione>` (procedura completa in `docs/APP.md` §3b).
  Le cartelle `mockup/versions/<v>/` sono congelate: non modificarle a mano.
- **Backlog UX**: all'inizio di ogni nuova conversazione su questa app, prima o insieme alla risposta, ricorda in 3-4 righe le proposte UX ancora aperte (`docs/APP.md` §16) e chiedi da quale vuole ripartire. Non ripeterlo nella stessa conversazione. Quando un punto viene fatto, aggiorna lo stato in §16.
- UI in inglese; nel codice gli "Arms" si chiamano ancora `pylon`/`PYLONS`/`'pyl'`.
- Dev server: preview `mockup` (porta 6480). Se il browser mostra una pagina vecchia, ricaricare saltando la cache.
