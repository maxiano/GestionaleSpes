# Gestionale Tecnico Spes Montesacro - Moduli JS

Questa cartella contiene i moduli JavaScript ES6 estratti dal file monolitico originale `app.js`.

## Struttura delle Cartelle
```
js/
├── app.js               # Entry point principale dell'applicazione
├── state.js             # Gestore dello stato reattivo e condiviso
├── firebase-init.js     # Inizializzazione Firebase SDK v10 Modular
├── config.js            # Costanti e normalizzazione profilo utente
├── cache.js             # Caching in memoria locale per Firestore
├── utils.js             # Helper per date, download file e WhatsApp
└── modules/
    ├── auth.js          # Autenticazione e gestione password
    ├── ui.js            # Navigazione tab, menu e selettore squadra
    ├── players.js       # Gestione rosa, modali, import/export Excel e CSV
    ├── attendance.js    # Presenze, matrice mensile e report WhatsApp
    ├── callups.js       # Convocazioni gare, avvisi e storico
    ├── tournaments.js   # Tornei, calendario e inserimento punteggi
    ├── staff.js         # Gestione coach e responsabili tecnici
    ├── parents.js       # Anagrafica famiglie e collegamento figli
    ├── backup.js        # Strumenti di backup e reset sicuro
    └── parent-portal.js # Interfaccia portale genitori
```

## Come integrarlo nel tuo HTML
Nel tuo file `index.html`, includi l'entry point con il tipo `module`:
```html
<script type="module" src="js/app.js"></script>
```

Tutti i sottomoduli verranno caricati automaticamente secondo le dipendenze dichiarate.