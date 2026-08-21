/**
 * @file app.js
 * @brief Gestionale Tecnico - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 * 
 * Questo software è riservato esclusivamente all'uso interno della società 
 * sportiva Spes Montesacro. Ne è vietata la copia, la riproduzione o la 
 * distribuzione non autorizzata.
 */
// LOGICA APPLICATIVA IN JAVASCRIPT MODULARE (FIREBASE V10 SDK) -->
		import { AppCache } from './cache.js';
		import { daysOfWeekIT, monthNamesIT, normalizeUserProfile } from './config.js';
		import { auth, db } from './firebase-init.js';
		import { formatDateIT, sendToWhatsApp, downloadCSV } from './utils.js';
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import {
           getAuth,
            signInWithEmailAndPassword,
            signOut,
            onAuthStateChanged,
            EmailAuthProvider,
            reauthenticateWithCredential,
            updatePassword
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import {
            getFirestore,
            enableMultiTabIndexedDbPersistence,
            doc,
            getDoc,
            getDocs,
            setDoc,
            addDoc,
            updateDoc,
            deleteDoc,
            collection,
            query,
            where,
			arrayUnion,
            serverTimestamp
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

		import { initParentPortal } from './parent-portal.js';


		// GESTIONE MODALE CAMBIO PASSWORD PERSONALE
        const modalPassword = document.getElementById('modal-change-password');

        document.getElementById('nav-btn-password').addEventListener('click', () => {
            modalPassword.classList.remove('hidden');
        });

        document.getElementById('btn-close-modal-password').addEventListener('click', () => {
            modalPassword.classList.add('hidden');
            document.getElementById('form-change-password').reset();
        });

        document.getElementById('form-change-password').addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const user = auth.currentUser;

            if (!user || !user.email) {
                return alert("Nessun utente autenticato.");
            }

            try {
                const credential = EmailAuthProvider.credential(user.email, currentPass);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPass);

                alert("Password aggiornata con successo!");
                document.getElementById('form-change-password').reset();
                modalPassword.classList.add('hidden');
            } catch (err) {
                alert("Errore durante il cambio password: " + err.message);
            }
        });


        // SALVATAGGIO OPZIONI PREDEFINITE ADMIN PER IL SELECTOR
        const adminTeamOptionsHTML = document.getElementById('admin-team-filter').innerHTML;

        // STATO APPLICAZIONE E CACHE LOCALE
        let currentUserProfile = null;
        let activeTeamId = null;
        let activeTeamPlayers = [];
        let loadedCallupsList = [];
        let currentSessionDocId = null;
        let editingPlayerId = null;




        // INIZIALIZZAZIONE DATE ED ANNI
        const now = new Date();
        const currentYr = now.getFullYear();
        document.getElementById('attendance-date').value = now.toISOString().split('T')[0];
        document.getElementById('filter-month').value = now.getMonth();

        function initYearFilter() {
            const yearSelect = document.getElementById('filter-year');
            yearSelect.innerHTML = '';
            for (let y = currentYr - 1; y <= currentYr + 3; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === currentYr) opt.selected = true;
                yearSelect.appendChild(opt);
            }
            document.getElementById('print-season-year').innerText = `Stagione Sportiva ${currentYr}/${currentYr + 1}`;
        }
        initYearFilter();

      


        function switchTab(tabId) {
         // Definiamo quali sono le tab "amministrative" che non richiedono squadra
		    const adminTabs = ['tab-staff', 'tab-parents'];
		    const isAdmin = currentUserProfile && currentUserProfile.role === 'admin';
		
		    // Controllo permessi per tab protette
		    if (adminTabs.includes(tabId) && !isAdmin) {
		        return alert("Accesso non autorizzato.");
		    }
		
		    // Controllo Squadra: solo se NON è una tab amministrativa, blocca se manca activeTeamId
		    if (!adminTabs.includes(tabId)) {
		        if (!activeTeamId || activeTeamId === "SELECT_TEAM" || activeTeamId === "ALL") {
		            alert("⚠️ Attenzione: Devi prima selezionare una Categoria / Gruppo!");
		            return;
		        }
		    }
			// 1. Nascondi tutti i tab
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
			// 2. Gestisci lo stile di tutti i bottoni
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.id === 'btn-tab-staff') {
                    btn.className = `tab-btn ${isAdmin ? '' : 'hidden'} flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-800 bg-gray-100 hover:bg-gray-200 transition border border-gray-300`;
                } else {
                    btn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-600 hover:bg-gray-100 transition";
                }

				if (btn.id === 'btn-tab-parents') {
                    btn.className = `tab-btn ${isAdmin ? '' : 'hidden'} flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-800 bg-gray-100 hover:bg-gray-200 transition border border-gray-300`;
                } else {
                    btn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-600 hover:bg-gray-100 transition";
                }
            });

			// 3. Mostra il tab selezionato (QUESTO È QUELLO CHE FA APPARIRE LA SCHERMATA)
    		const targetTab = document.getElementById(tabId);
    		if (targetTab) {
        		targetTab.classList.remove('hidden');
    		}

			// 4. Evidenzia il bottone attivo
            const activeBtn = document.getElementById(`btn-${tabId}`);
            if (activeBtn) {
                activeBtn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm transition text-white bg-black shadow";
            // Aggiorna anche il testo "Sezione Attiva" sul pulsante principale dell'hamburger
                const activeLabel = document.getElementById('current-active-tab-label');
                if (activeLabel) {
                    activeLabel.innerText = activeBtn.innerText.trim();
                }
            }

			
			// 5. Caricamenti specifici per tab
            if (tabId === 'tab-callup') loadCallups();
            if (tabId === 'tab-staff') loadStaffList();
			if (tabId === 'tab-parents') {
                // Se hai una funzione per caricare i genitori, richiamala qui es: loadParentsList();
            }
			if (tabId === 'tab-tournaments') renderTournaments();
        }

        // CONFIGURAZIONE SELETTORE SQUADRE
        function setupTeamSelectorUI() {
            const selectorContainer = document.getElementById('admin-team-selector');
            const teamSelect = document.getElementById('admin-team-filter');

            selectorContainer.classList.remove('hidden');

            if (currentUserProfile.role === 'admin') {
                document.getElementById('dashboard-role-title').innerText = "Panoramica Responsabile Tecnico";
                document.getElementById('dashboard-subtitle').innerText = "Seleziona un gruppo per iniziare";

                document.getElementById('btn-tab-staff').classList.remove('hidden');
                document.getElementById('nav-btn-staff').classList.remove('hidden');
				// AGGIUNTA QUESTA RIGA PER I GENITORI:
				document.getElementById('btn-tab-parents').classList.remove('hidden');
    			document.getElementById('nav-btn-parents').classList.remove('hidden');

				// --- AGGIUNGI QUI IL MOSTRA BACKUP PER L'ADMIN ---
                const backupBtn = document.getElementById('nav-btn-backup');
                if (backupBtn) backupBtn.classList.remove('hidden');
                // ------------------------------------------------

                teamSelect.innerHTML = adminTeamOptionsHTML;
                teamSelect.value = 'ALL';
                activeTeamId = null;

                document.getElementById('navigation-tabs').classList.add('hidden');
                document.getElementById('main-content-area').classList.add('hidden');
            } else {
                document.getElementById('dashboard-role-title').innerText = "Pannello Tecnico Coach";

                document.getElementById('btn-tab-staff').classList.add('hidden');
                document.getElementById('nav-btn-staff').classList.add('hidden');
				// AGGIUNTA QUESTA RIGA PER NASCONDERE AI COACH:
				document.getElementById('btn-tab-staff').classList.add('hidden');
    			document.getElementById('nav-btn-parents').classList.add('hidden');

				// --- AGGIUNGI QUI IL NASCONDI BACKUP PER I COACH ---
                const backupBtn = document.getElementById('nav-btn-backup');
                if (backupBtn) backupBtn.classList.add('hidden');
                // -------------------------------------------------

                const coachTeams = currentUserProfile.teams || [];

                if (coachTeams.length === 0) {
                    document.getElementById('dashboard-subtitle').innerText = "Nessuna squadra assegnata";
                    teamSelect.innerHTML = '<option value="NONE">Nessuna squadra assegnata</option>';
                    activeTeamId = null;
                    document.getElementById('navigation-tabs').classList.add('hidden');
                    document.getElementById('main-content-area').classList.add('hidden');
                    return;
                }

                if (coachTeams.length === 1) {
                    teamSelect.innerHTML = `<option value="${coachTeams[0]}">${coachTeams[0]}</option>`;
                    activeTeamId = coachTeams[0];
                    document.getElementById('dashboard-subtitle').innerText = `Squadra: ${activeTeamId}`;
                    document.getElementById('navigation-tabs').classList.remove('hidden');
                    document.getElementById('main-content-area').classList.remove('hidden');
                    switchTab('tab-roster');
                    loadTeamData();
                } else {
                    let optionsHtml = '<option value="SELECT_TEAM" selected disabled>-- Seleziona la tua Squadra --</option>';
                    coachTeams.forEach(team => {
                        optionsHtml += `<option value="${team}">${team}</option>`;
                    });
                    teamSelect.innerHTML = optionsHtml;
                    teamSelect.value = 'SELECT_TEAM';
                    document.getElementById('dashboard-subtitle').innerText = "Seleziona un gruppo per iniziare";
                    activeTeamId = null;
                    document.getElementById('navigation-tabs').classList.add('hidden');
                    document.getElementById('main-content-area').classList.add('hidden');
                }
            }
        }

		// GESTIONE AUTENTICAZIONE UTENTE
		onAuthStateChanged(auth, async (user) => {
		    if (user) {
		        const userDocRef = doc(db, 'users', user.uid);
		        const userDoc = await getDoc(userDocRef);
		
		        if (userDoc.exists()) {
		            currentUserProfile = normalizeUserProfile(userDoc.data());
		        } else {
		            currentUserProfile = normalizeUserProfile({ name: user.email, role: 'coach', teams: [] });
		        }
		
		       // --- SMISTAMENTO IN BASE AL RUOLO ---
				if (currentUserProfile.role === 'parent') {
				    document.getElementById('section-login').classList.add('hidden');
				    document.getElementById('app-dashboard').classList.add('hidden');
		
				    // 1. Valorizza subito il box utente in alto nella barra principale con nome e ruolo
				    const userInfoEl = document.getElementById('user-info');
				    if (userInfoEl) {
				        userInfoEl.innerText = `${currentUserProfile.name || currentUserProfile.email} (GENITORE)`;
				    }
				    
				    // 2. Mostra il pulsante di logout principale se presente
				    const logoutBtn = document.getElementById('btn-logout');
				    if (logoutBtn) logoutBtn.classList.remove('hidden');
		
				    // 3. Avvia la funzione del portale genitori 
				    // (Ci penserà parent-portal.js a creare il "dynamic-parent-container", fare il fetch di parent-view.html e popolare i dati)
				    if (typeof initParentPortal === 'function') {
				        await initParentPortal(currentUserProfile);
				    } else if (typeof loadChildData === 'function') {
				        await loadChildData(currentUserProfile);
				    } else {
				        console.error("❌ Nessuna funzione di inizializzazione trovata per il portale genitori!");
				    }
		
				    return; 
				}
		
		        // --- FLUSSO STANDARD (Coach / Admin) ---
		        document.getElementById('user-info').innerText = `${currentUserProfile.name} (${currentUserProfile.role.toUpperCase()})`;
		        document.getElementById('btn-logout').classList.remove('hidden');
		        document.getElementById('section-login').classList.add('hidden');
		        document.getElementById('app-dashboard').classList.remove('hidden');
		
		        setupTeamSelectorUI();
		    } else {
		        currentUserProfile = null;
		        activeTeamId = null;
		        document.getElementById('btn-logout').classList.add('hidden');
		        
		        // Controlla che gli elementi esistano prima di modificarne le classi (evita errori in console)
		        document.getElementById('nav-btn-staff')?.classList.add('hidden');
		        document.getElementById('btn-tab-staff')?.classList.add('hidden');
		        
		        const backupBtn = document.getElementById('nav-btn-backup');
		        if (backupBtn) backupBtn.classList.add('hidden');
		        
		        document.getElementById('section-login').classList.remove('hidden');
		        document.getElementById('app-dashboard').classList.add('hidden');


		        // Pulisce l'interfaccia genitori se era aperta
		        const dynamicParentContainer = document.getElementById('dynamic-parent-container');
		        if (dynamicParentContainer) {
		            dynamicParentContainer.remove();
		        }
		    }
		});

        document.getElementById('form-login').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                alert("Errore di accesso: " + err.message);
            }
        });

        document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

        // EVENTO PULSANTE STAFF NELLA NAV BAR SUPERIORE
        document.getElementById('nav-btn-staff').addEventListener('click', () => {
            if (currentUserProfile && currentUserProfile.role === 'admin') {
                document.getElementById('navigation-tabs').classList.remove('hidden');
                document.getElementById('main-content-area').classList.remove('hidden');
                switchTab('tab-staff');
            }
        });

		// EVENTO PULSANTE GENITORI NELLA NAV BAR SUPERIORE (AGGIUNGI QUI)
        document.getElementById('nav-btn-parents').addEventListener('click', () => {
            if (currentUserProfile && currentUserProfile.role === 'admin') {
                document.getElementById('navigation-tabs').classList.remove('hidden');
                document.getElementById('main-content-area').classList.remove('hidden');
                switchTab('tab-parents');
            }
        });

		// EVENTO PULSANTE BACKUP NELLA NAV BAR SUPERIORE
        document.getElementById('nav-btn-backup').addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUserProfile && currentUserProfile.role === 'admin') {
                downloadDatabaseBackup();
            }
        });

        document.getElementById('admin-team-filter').addEventListener('change', () => {
            const selected = document.getElementById('admin-team-filter').value;
            if (selected && selected !== 'ALL' && selected !== 'SELECT_TEAM' && selected !== 'NONE') {
                activeTeamId = selected;
                document.getElementById('navigation-tabs').classList.remove('hidden');
                document.getElementById('main-content-area').classList.remove('hidden');
                document.getElementById('dashboard-subtitle').innerText = `Gruppo Selezionato: ${activeTeamId}`;
                switchTab('tab-roster');
                loadTeamData();
            } else {
                activeTeamId = null;
                document.getElementById('navigation-tabs').classList.add('hidden');
                document.getElementById('main-content-area').classList.add('hidden');
                document.getElementById('dashboard-subtitle').innerText = "Seleziona un gruppo per iniziare";
            }
        });

        // GESTIONE CREAZIONE ED ELIMINAZIONE UTENTI STAFF/COACH (SOLO ADMIN)
        document.getElementById('form-create-staff').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserProfile || currentUserProfile.role !== 'admin') {
                return alert("Azione riservata unicamente agli Admin!");
            }

            const name = document.getElementById('staff-name').value.trim();
            const email = document.getElementById('staff-email').value.trim();
            const password = document.getElementById('staff-password').value;
            const role = document.getElementById('staff-role').value;

            const teamSelect = document.getElementById('staff-team');
            const selectedTeams = Array.from(teamSelect.selectedOptions).map(opt => opt.value).filter(v => v !== '');

            if (role === 'coach' && selectedTeams.length === 0) {
                return alert("Seleziona almeno una squadra di competenza per il Coach!");
            }

            try {
                const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
                const response = await fetch(signUpUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        returnSecureToken: true
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error ? data.error.message : "Errore durante la creazione dell'account");
                }

                const newUid = data.localId;

                await setDoc(doc(db, 'users', newUid), {
                    uid: newUid,
                    name: name,
                    email: email,
                    role: role,
                    teamId: selectedTeams.length > 0 ? selectedTeams[0] : '',
                    teams: selectedTeams,
                    createdAt: serverTimestamp()
                });

                alert(`Account ${role.toUpperCase()} creato con successo per ${name}!`);
                document.getElementById('form-create-staff').reset();
                loadStaffList();

            } catch (err) {
                alert("Errore creazione account: " + err.message);
            }
        });

		// GESTIONE CREAZIONE ED ELIMINAZIONE UTENTI GENITORI (SOLO ADMIN)
		document.getElementById('form-create-parent').addEventListener('submit', async (e) => {
		    e.preventDefault();
		    
		    const name = document.getElementById('parent-name').value.trim();
		    const email = document.getElementById('parent-email').value.trim();
		    const phone = document.getElementById('parent-phone').value.trim();
		    const password = document.getElementById('parent-password').value;
		
		    try {
		        // Creazione Auth
		        const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
		        const response = await fetch(signUpUrl, {
		            method: 'POST',
		            headers: { 'Content-Type': 'application/json' },
		            body: JSON.stringify({ email, password, returnSecureToken: true })
		        });
		        
		        const data = await response.json();
		        if (!response.ok) throw new Error(data.error.message);
		
		        // Salvataggio su Firestore (collezione 'users' o 'parents' in base a come ti organizzi)
		        await setDoc(doc(db, 'users', data.localId), {
		            uid: data.localId,
		            name: name,
		            email: email,
		            phone: phone, // <-- Il campo che volevi aggiungere
		            role: 'parent',
		            childIds: [],
		            createdAt: serverTimestamp()
		        });
		
		        alert("Genitore creato con successo!");
		        document.getElementById('form-create-parent').reset();
		    } catch (err) {
		        alert("Errore: " + err.message);
		    }
		});

        async function loadStaffList() {
            const container = document.getElementById('staff-list-container');
            if (!container) return;

            try {
                const snapshot = await getDocs(collection(db, 'users'));
                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-xs text-gray-400">Nessun utente staff trovato.</p>';
                    return;
                }

                container.innerHTML = '';
                snapshot.forEach(docSnap => {
                    const rawUser = docSnap.data();
                    const user = normalizeUserProfile(rawUser);
                    const userId = docSnap.id;
                    const isSelf = auth.currentUser && auth.currentUser.uid === userId;
                    const teamsDisplay = user.teams.length > 0 ? user.teams.join(', ') : 'Tutte';

                    container.innerHTML += `
                        <div class="border p-3 rounded bg-white flex justify-between items-center text-xs shadow-sm">
                            <div class="space-y-1">
                                <p class="font-bold text-sm text-gray-800">${user.name} ${isSelf ? '<span class="text-xs text-blue-600">(Tu)</span>' : ''}</p>
                                <p class="text-gray-600">📧 <strong>Email:</strong> ${user.email}</p>
                                <p class="text-gray-600">
                                    🛡️ <strong>Ruolo:</strong> <span class="uppercase font-bold ${user.role === 'admin' ? 'text-black' : 'text-gray-700'}">${user.role}</span> |
                                    🏆 <strong>Squadre:</strong> ${teamsDisplay}
                                </p>
                            </div>
                            <div>
                                ${!isSelf ? `
                                    <button data-id="${userId}" class="btn-delete-staff text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded transition">
                                        🗑️ Elimina
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });

                container.querySelectorAll('.btn-delete-staff').forEach(btn => {
                    btn.addEventListener('click', (e) => deleteStaffUser(e.target.getAttribute('data-id')));
                });

            } catch (err) {
                container.innerHTML = `<p class="text-xs text-red-500">Errore: ${err.message}</p>`;
            }
        }

        async function deleteStaffUser(userId) {
            if (!confirm("Sei sicuro di voler eliminare questo utente dallo staff? L'utente non potrà più accedere.")) return;
            try {
                await deleteDoc(doc(db, 'users', userId));
                alert("Profilo utente rimosso da Firestore!");
                loadStaffList();
            } catch (err) {
                alert("Errore eliminazione utente: " + err.message);
            }
        }

        // CARICAMENTO ED ELABORAZIONE DATI SQUADRA
        async function loadTeamData(forceRefresh = false) {
            if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
                activeTeamPlayers = [];
                renderPlayersList();
                renderAttendanceInputs();
                renderCallupCheckboxes();
                return;
            }

            document.getElementById('display-active-team').innerText = activeTeamId;
            document.getElementById('print-report-team').innerText = `Squadra / Categoria: ${activeTeamId}`;

            let players = AppCache.getPlayers(activeTeamId);

            if (!players || forceRefresh) {
                const q = query(collection(db, 'players'), where('teamId', '==', activeTeamId));
                const snapshot = await getDocs(q);
                players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                players.sort((a, b) => {
                    const surnameA = (a.lastName || '').toLowerCase();
                    const surnameB = (b.lastName || '').toLowerCase();
                    if (surnameA < surnameB) return -1;
                    if (surnameA > surnameB) return 1;
                    return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
                });

                AppCache.setPlayers(activeTeamId, players);
            }

            activeTeamPlayers = players;

            renderPlayersList();
            renderAttendanceInputs();
            renderCallupCheckboxes();
            checkAndLoadExistingAttendance();

            loadMonthlyAttendances(forceRefresh);
        }

        function renderPlayersList() {
            const container = document.getElementById('players-list-container');
            const printContainer = document.getElementById('roster-print-table-container');
            container.innerHTML = '';
            printContainer.innerHTML = '';

            if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
                container.innerHTML = '<p class="text-sm text-gray-400 col-span-2">Nessun giocatore in rosa.</p>';
                printContainer.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            activeTeamPlayers.forEach(player => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                const canDelete = currentUserProfile && currentUserProfile.role === 'admin' ?
                    `<button data-id="${player.id}" class="btn-delete-player text-xs text-red-500 font-bold hover:text-red-700 ml-2">Rimuovi</button>` : '';

                let medStatusBadge = '';
                if (player.medicalExp) {
                    if (player.medicalExp < today) {
                        medStatusBadge = `<span class="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Cert. Scaduto (${formatDateIT(player.medicalExp)})</span>`;
                    } else {
                        medStatusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-semibold">Cert. OK (${formatDateIT(player.medicalExp)})</span>`;
                    }
                } else {
                    medStatusBadge = `<span class="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">Cert. Mancante</span>`;
                }

                container.innerHTML += `
                    <div class="p-3 border rounded bg-gray-50 flex justify-between items-start text-xs shadow-sm">
                        <div class="space-y-1">
                            <p class="font-bold text-sm text-gray-900">⚽ ${displayName} ${player.jersey ? `<span class="text-gray-600">(#${player.jersey})</span>` : ''}</p>
                            <p class="text-gray-600"><strong>Ruolo:</strong> ${player.role || 'N/D'} | <strong>Nato il:</strong> ${formatDateIT(player.dob)}</p>
                            <p class="text-gray-600"><strong>Tel. Genitore:</strong> ${player.parentPhone || 'N/D'}</p>
                            <div class="pt-1">${medStatusBadge}</div>
                        </div>
                        <div class="flex items-center space-x-1">
                            <button data-id="${player.id}" class="btn-edit-player text-xs text-black font-bold hover:bg-gray-200 bg-gray-100 px-2 py-1 rounded border border-gray-300 transition">✏️ Modifica</button>
                            ${canDelete}
                        </div>
                    </div>
                `;
            });

            container.querySelectorAll('.btn-edit-player').forEach(btn => {
                btn.addEventListener('click', (e) => openEditPlayerModal(e.currentTarget.getAttribute('data-id')));
            });

            container.querySelectorAll('.btn-delete-player').forEach(btn => {
                btn.addEventListener('click', (e) => deletePlayer(e.target.getAttribute('data-id')));
            });

            let printTableHtml = `
                <table class="w-full border-collapse border border-black">
                    <thead>
                        <tr class="bg-gray-200 text-black">
                            <th class="border border-black p-2 text-center w-10">#</th>
                            <th class="border border-black p-2 text-left">Cognome e Nome</th>
                            <th class="border border-black p-2 text-center w-16">Maglia</th>
                            <th class="border border-black p-2 text-center w-24">Data Nascita</th>
                            <th class="border border-black p-2 text-center w-28">Certificato</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            activeTeamPlayers.forEach((player, index) => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                printTableHtml += `
                    <tr>
                        <td class="border border-black p-1 text-center font-bold">${index + 1}</td>
                        <td class="border border-black p-1 font-semibold">${displayName}</td>
                        <td class="border border-black p-1 text-center">${player.jersey || '-'}</td>
                        <td class="border border-black p-1 text-center">${formatDateIT(player.dob)}</td>
                        <td class="border border-black p-1 text-center">${formatDateIT(player.medicalExp)}</td>
                    </tr>
                `;
            });

            printTableHtml += `</tbody></table>`;
            printContainer.innerHTML = printTableHtml;
        }

        function renderAttendanceInputs() {
            const container = document.getElementById('attendance-players-inputs');
            container.innerHTML = '';

            if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
                container.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
                return;
            }

            activeTeamPlayers.forEach(player => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                container.innerHTML += `
                    <div class="flex flex-col md:flex-row md:justify-between md:items-center py-2 gap-1">
                        <span class="font-medium text-sm text-gray-800">${displayName}</span>
                        <div class="flex flex-wrap items-center gap-3">
                            <label class="inline-flex items-center text-xs cursor-pointer">
                                <input type="radio" name="att_${player.id}" value="present" checked class="text-black focus:ring-black">
                                <span class="ml-1 text-emerald-700 font-bold">Presente (P)</span>
                            </label>
                            <label class="inline-flex items-center text-xs cursor-pointer">
                                <input type="radio" name="att_${player.id}" value="absent" class="text-red-600 focus:ring-black">
                                <span class="ml-1 text-red-700 font-bold">Assente (A)</span>
                            </label>
                            <label class="inline-flex items-center text-xs cursor-pointer">
                                <input type="radio" name="att_${player.id}" value="justified" class="text-amber-600 focus:ring-black">
                                <span class="ml-1 text-amber-700 font-bold">Giustificato (AG)</span>
                            </label>
                            <label class="inline-flex items-center text-xs cursor-pointer">
                                <input type="radio" name="att_${player.id}" value="injured" class="text-purple-600 focus:ring-black">
                                <span class="ml-1 text-purple-700 font-bold">Infortunato (INF)</span>
                            </label>
                            <label class="inline-flex items-center text-xs cursor-pointer">
                                <input type="radio" name="att_${player.id}" value="late" class="text-blue-600 focus:ring-black">
                                <span class="ml-1 text-blue-700 font-bold">Ritardo (R)</span>
                            </label>
                        </div>
                    </div>
                `;
            });
        }

        function renderCallupCheckboxes() {
            const container = document.getElementById('players-list-callup');
            if (!container) return;
            container.innerHTML = '';

            if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
                container.innerHTML = '<p class="text-xs text-gray-400 col-span-2">Nessun giocatore disponibile.</p>';
                return;
            }

            activeTeamPlayers.forEach(player => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                container.innerHTML += `
                    <label class="flex items-center space-x-2 text-xs p-1 border rounded bg-gray-50 cursor-pointer">
                        <input type="checkbox" name="callup_player" value="${player.id}|${displayName}" checked class="rounded text-black focus:ring-black">
                        <span>${displayName}</span>
                    </label>
                `;
            });
        }

      async function checkAndLoadExistingAttendance() {
        const dateInput = document.getElementById('attendance-date');
        const container = document.getElementById('attendance-status-container');
        const badge = document.getElementById('attendance-status-badge');
        const deleteBtn = document.getElementById('btn-delete-session');

        if (!dateInput || !dateInput.value || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
            if (container) container.classList.add('hidden');
            currentSessionDocId = null;
            return;
        }

        const date = dateInput.value; // Formato AAAA-MM-GG (es. 2026-08-13)
        const [year, month, day] = date.split('-');
        const dateIt = `${day}/${month}/${year}`;         // Formato 13/08/2026
        const dateItAlt = `${parseInt(day)}/${parseInt(month)}/${year}`; // Formato 13/8/2026

        try {
            // Cerchiamo tutti i documenti della squadra per confrontare le date in modo flessibile
            const q = query(
                collection(db, 'attendances'),
                where('teamId', '==', activeTeamId)
            );
            const snapshot = await getDocs(q);

            let targetDocSnap = null;
            snapshot.forEach(docSnap => {
                const docData = docSnap.data();
                const dbDate = String(docData.date || '').trim();
                if (dbDate === date || dbDate === dateIt || dbDate === dateItAlt) {
                    targetDocSnap = docSnap;
                }
            });

            if (targetDocSnap) {
                const docSnap = targetDocSnap;
                currentSessionDocId = docSnap.id;
                const records = docSnap.data().records || docSnap.data().record || [];

                records.forEach(rec => {
                    const pId = rec.playerId || rec.id;
                    const radio = document.querySelector(`input[name="att_${pId}"][value="${rec.status}"]`);
                    if (radio) radio.checked = true;
                });

                if (container) container.classList.remove('hidden');
                if (badge) {
                    badge.className = "text-xs font-bold text-amber-800";
                    badge.innerHTML = `⚠️ Presenze per il <strong>${formatDateIT(date)}</strong> già salvate (aggiornate anche da portale famiglia).`;
                }
                if (deleteBtn) deleteBtn.classList.remove('hidden');

            } else {
                currentSessionDocId = null;
                resetAttendanceRadios();

                if (container) container.classList.remove('hidden');
                if (badge) {
                    badge.className = "text-xs font-bold text-emerald-800";
                    badge.innerHTML = `✨ Nuova giornata del <strong>${formatDateIT(date)}</strong> (nessun dato salvato).`;
                }
                if (deleteBtn) deleteBtn.classList.add('hidden');
            }
        } catch (err) {
            console.error("Errore controllo presenze:", err);
        }
    }

    document.getElementById('attendance-date').addEventListener('change', checkAndLoadExistingAttendance);

    document.getElementById('form-attendance').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeTeamId || activeTeamPlayers.length === 0) return alert('Nessuna squadra o giocatore presente!');

        const date = document.getElementById('attendance-date').value;
        if (!date) return alert('Seleziona una data valida!');

        const [year, month, day] = date.split('-');
        const dateIt = `${day}/${month}/${year}`;

        try {
            // Ricerca flessibile per individuare il documento esistente
            const snapshot = await getDocs(query(collection(db, 'attendances'), where('teamId', '==', activeTeamId)));
            
            let existingDocId = null;
            snapshot.forEach(docSnap => {
                const docData = docSnap.data();
                const dbDate = String(docData.date || '').trim();
                if (dbDate === date || dbDate === dateIt || dbDate === `${parseInt(day)}/${parseInt(month)}/${year}`) {
                    existingDocId = docSnap.id;
                }
            });

            if (existingDocId) {
                if (!confirm(`⚠️ Hai già salvato le presenze per il ${formatDateIT(date)}.\nVuoi sovrascriverle?`)) return;
            }

            const records = [];
            activeTeamPlayers.forEach(player => {
                const radio = document.querySelector(`input[name="att_${player.id}"]:checked`);
                if (radio) {
                    const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                    records.push({ 
                        id: player.id,
                        playerId: player.id, 
                        name: displayName, 
                        status: radio.value,
                        present: radio.value === 'present',
                        absent: radio.value === 'absent'
                    });
                }
            });

            if (existingDocId) {
                const docRef = doc(db, 'attendances', existingDocId);
                await updateDoc(docRef, {
                    records: records,
                    record: records,
                    updatedAt: serverTimestamp()
                });
                alert('Presenze aggiornate con successo!');
            } else {
                await addDoc(collection(db, 'attendances'), {
                    teamId: activeTeamId,
                    date: date, // Salva in formato ISO standard
                    records: records,
                    record: records,
                    createdAt: serverTimestamp()
                });
                alert('Presenze salvate con successo!');
            }

            AppCache.clearAttendances(activeTeamId);
            const savedDateObj = new Date(date + 'T00:00:00');
            document.getElementById('filter-month').value = savedDateObj.getMonth();
            document.getElementById('filter-year').value = savedDateObj.getFullYear();

            checkAndLoadExistingAttendance();
            loadMonthlyAttendances(true);

        } catch (err) {
            alert("Errore salvataggio presenze: " + err.message);
        }
    });

    document.getElementById('btn-delete-session').addEventListener('click', async () => {
        if (!currentSessionDocId) return;
        const dateStr = document.getElementById('attendance-date').value;
        if (!confirm(`Eliminare definitivamente l'allenamento del ${formatDateIT(dateStr)}?`)) return;

        try {
            await deleteDoc(doc(db, 'attendances', currentSessionDocId));
            alert('Giornata eliminata con successo!');
            AppCache.clearAttendances(activeTeamId);
            currentSessionDocId = null;
            checkAndLoadExistingAttendance();
            loadMonthlyAttendances(true);
        } catch (err) {
            alert("Errore eliminazione: " + err.message);
        }
    });
        async function loadMonthlyAttendances(forceRefresh = false) {
        if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') return;

        const selectedMonth = parseInt(document.getElementById('filter-month').value);
        const selectedYear = parseInt(document.getElementById('filter-year').value);
        const container = document.getElementById('monthly-sessions-container');

        document.getElementById('print-report-period').innerText = `Periodo: ${monthNamesIT[selectedMonth]} ${selectedYear}`;

        const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        try {
            let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth);

            if (!sessions || forceRefresh) {
                container.innerHTML = '<p class="text-sm text-gray-500 py-4">Caricamento registro allenamenti...</p>';
                
                // Scarichiamo tutte le presenze della squadra per gestirle in modo flessibile indipendentemente dal formato data
                const q = query(
                    collection(db, 'attendances'),
                    where('teamId', '==', activeTeamId)
                );
                const snapshot = await getDocs(q);

                const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtriamo e normalizziamo le sessioni per il mese e anno selezionati
                sessions = allSessions.filter(s => {
                    const dbDateStr = String(s.date || '').trim();
                    let sYear, sMonth, sDay;

                    if (dbDateStr.includes('-')) {
                        // Formato ISO: YYYY-MM-DD
                        const parts = dbDateStr.split('-');
                        if (parts.length === 3) {
                            sYear = parseInt(parts[0], 10);
                            sMonth = parseInt(parts[1], 10) - 1;
                            sDay = parseInt(parts[2], 10);
                        }
                    } else if (dbDateStr.includes('/')) {
                        // Formato IT: DD/MM/YYYY
                        const parts = dbDateStr.split('/');
                        if (parts.length === 3) {
                            sDay = parseInt(parts[0], 10);
                            sMonth = parseInt(parts[1], 10) - 1;
                            sYear = parseInt(parts[2], 10);
                        }
                    }

                    return sYear === selectedYear && sMonth === selectedMonth;
                });

                AppCache.setAttendances(activeTeamId, selectedYear, selectedMonth, sessions);
            }

            const sessionsByDay = {};
            let totalPresentsCount = 0;

            sessions.forEach(s => {
                const dbDateStr = String(s.date || '').trim();
                let dayNum;
                if (dbDateStr.includes('-')) {
                    dayNum = parseInt(dbDateStr.split('-')[2], 10);
                } else if (dbDateStr.includes('/')) {
                    dayNum = parseInt(dbDateStr.split('/')[0], 10);
                }

                if (dayNum && !isNaN(dayNum)) {
                    sessionsByDay[dayNum] = s;
                    const records = s.records || s.record || [];
                    totalPresentsCount += records.filter(r => r.status === 'present' || r.status === 'late').length;
                }
            });

            document.getElementById('stat-total-sessions').innerText = sessions.length;
            document.getElementById('stat-total-presents').innerText = totalPresentsCount;
            document.getElementById('stat-avg-presents').innerText = sessions.length > 0 ? (totalPresentsCount / sessions.length).toFixed(1) : '0';

            let tableHtml = `
                <table class="w-full text-xs border-collapse border border-gray-400 bg-white">
                    <thead>
                        <tr class="bg-gray-100 text-gray-700">
                            <th class="border border-gray-400 p-1 text-left">Giocatore</th>
            `;

            for (let d = 1; d <= totalDaysInMonth; d++) {
                const dateObj = new Date(selectedYear, selectedMonth, d);
                const dayName = daysOfWeekIT[dateObj.getDay()];
                const isSession = !!sessionsByDay[d];
                const bgClass = isSession ? 'bg-gray-200 text-black font-bold' : '';
                tableHtml += `<th class="border border-gray-400 p-1 text-center capitalize ${bgClass}">${dayName}</th>`;
            }

            tableHtml += `</tr><tr class="bg-gray-200 text-gray-800"><th class="border border-gray-400 p-1 text-left">Cognome e Nome</th>`;

            for (let d = 1; d <= totalDaysInMonth; d++) {
                const isSession = !!sessionsByDay[d];
                const bgClass = isSession ? 'bg-gray-300 text-black font-bold' : '';
                tableHtml += `<th class="border border-gray-400 p-1 text-center ${bgClass}">${d}</th>`;
            }

            tableHtml += `</tr></thead><tbody>`;

            if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
                tableHtml += `<tr><td colspan="${totalDaysInMonth + 1}" class="text-center p-4 text-gray-400">Nessun giocatore in rosa.</td></tr>`;
            } else {
                activeTeamPlayers.forEach(player => {
                    const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                    tableHtml += `<tr class="hover:bg-gray-50"><td class="border border-gray-400 p-1.5 font-bold text-gray-800 whitespace-nowrap">${displayName}</td>`;

                    for (let d = 1; d <= totalDaysInMonth; d++) {
                        const session = sessionsByDay[d];
                        let statusSymbol = '-';
                        let statusColor = 'text-gray-300';

                        if (session) {
                            const records = session.records || session.record || [];
                            const rec = records.find(r => (r.playerId === player.id || r.id === player.id));
                            if (rec) {
                                switch(rec.status) {
                                    case 'present': statusSymbol = 'P'; statusColor = 'text-emerald-700 font-bold bg-emerald-50'; break;
                                    case 'absent': statusSymbol = 'A'; statusColor = 'text-red-600 font-bold bg-red-50'; break;
                                    case 'justified': statusSymbol = 'AG'; statusColor = 'text-amber-600 font-bold bg-amber-50'; break;
                                    case 'injured': statusSymbol = 'INF'; statusColor = 'text-purple-600 font-bold bg-purple-50'; break;
                                    case 'late': statusSymbol = 'R'; statusColor = 'text-blue-600 font-bold bg-blue-50'; break;
                                }
                            }
                        }
                        tableHtml += `<td class="border border-gray-400 p-1 text-center ${statusColor}">${statusSymbol}</td>`;
                    }
                    tableHtml += `</tr>`;
                });
            }
            tableHtml += `</tbody></table>`;
            container.innerHTML = tableHtml;

        } catch (err) {
            console.error("Errore caricamento allenamenti:", err);
            container.innerHTML = `<p class="text-sm text-red-500 py-4 font-semibold">Errore durante il caricamento dei dati.</p>`;
        }
    }

    document.getElementById('filter-month').addEventListener('change', () => loadMonthlyAttendances());
    document.getElementById('filter-year').addEventListener('change', () => loadMonthlyAttendances());

    // ESPORTAZIONE E CONDIVISIONE MENSILE
    document.getElementById('btn-export-monthly-csv').addEventListener('click', () => {
        if (!activeTeamId) return alert("Seleziona prima una squadra!");
        const selectedMonth = parseInt(document.getElementById('filter-month').value);
        const selectedYear = parseInt(document.getElementById('filter-year').value);
        const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        let csv = `Registro Presenze - ${activeTeamId} - ${monthNamesIT[selectedMonth]} ${selectedYear}\n\nGiocatore;`;
        for (let d = 1; d <= totalDaysInMonth; d++) csv += `${d};`;
        csv += "\n";

        let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth) || [];
        const sessionsByDay = {};
        sessions.forEach(s => { 
            const dbDateStr = String(s.date || '').trim();
            let dayNum;
            if (dbDateStr.includes('-')) dayNum = parseInt(dbDateStr.split('-')[2], 10);
            else if (dbDateStr.includes('/')) dayNum = parseInt(dbDateStr.split('/')[0], 10);
            if (dayNum) sessionsByDay[dayNum] = s; 
        });

        activeTeamPlayers.forEach(player => {
            const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
            csv += `"${displayName}";`;
            for (let d = 1; d <= totalDaysInMonth; d++) {
                const session = sessionsByDay[d];
                let val = "-";
                if (session) {
                    const records = session.records || session.record || [];
                    const rec = records.find(r => (r.playerId === player.id || r.id === player.id));
                    if (rec) {
                        const map = { present: 'P', absent: 'A', justified: 'AG', injured: 'INF', late: 'R' };
                        val = map[rec.status] || '-';
                    }
                }
                csv += `${val};`;
            }
            csv += "\n";
        });

        downloadCSV(`Presenze_${activeTeamId}_${monthNamesIT[selectedMonth]}_${selectedYear}.csv`, csv);
    });

    document.getElementById('btn-export-roster-csv').addEventListener('click', () => {
        if (!activeTeamId || activeTeamPlayers.length === 0) return alert("Nessun giocatore in rosa!");
        let csv = `Cognome;Nome;Numero Maglia;Data Nascita;Ruolo;Scadenza Certificato;Tel. Genitore\n`;
        activeTeamPlayers.forEach(p => {
            csv += `"${p.lastName || ''}";"${p.firstName || ''}";"${p.jersey || ''}";"${p.dob || ''}";"${p.role || ''}";"${p.medicalExp || ''}";"${p.parentPhone || ''}"\n`;
        });
        downloadCSV(`Rosa_${activeTeamId}.csv`, csv);
    });

    // IMPORTAZIONE GIOCATORI DA FILE CSV
    const btnImportCsv = document.getElementById('btn-import-roster-csv');
    const inputImportCsv = document.getElementById('input-import-roster-csv');

    btnImportCsv.addEventListener('click', () => {
        if (!activeTeamId) return alert('Seleziona prima una squadra per poter importare i giocatori!');
        inputImportCsv.click();
    });

    inputImportCsv.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const rows = results.data;
                if (!rows || rows.length === 0) {
                    return alert("Il file CSV sembra vuoto o non formattato correttamente.");
                }

                if (!confirm(`Trovati ${rows.length} giocatori nel file CSV.\nConfermi l'importazione nel gruppo "${activeTeamId}"?`)) {
                    inputImportCsv.value = '';
                    return;
                }

                try {
                    let count = 0;
                    for (const row of rows) {
                        const lastName = (row['Cognome'] || row['cognome'] || '').trim();
                        const firstName = (row['Nome'] || row['nome'] || '').trim();

                        if (lastName || firstName) {
                            const playerData = {
                                lastName: lastName,
                                firstName: firstName,
                                name: `${lastName} ${firstName}`.trim(),
                                jersey: (row['Numero Maglia'] || row['Maglia'] || row['jersey'] || '').toString().trim(),
                                dob: (row['Data Nascita'] || row['dob'] || '').trim(),
                                role: (row['Ruolo'] || row['role'] || '').trim(),
                                medicalExp: (row['Scadenza Certificato'] || row['medicalExp'] || '').trim(),
                                parentPhone: (row['Tel. Genitore'] || row['parentPhone'] || '').toString().trim(),
                                teamId: activeTeamId,
                                createdAt: serverTimestamp()
                            };

                            await addDoc(collection(db, 'players'), playerData);
                            count++;
                        }
                    }

                    alert(`✅ Importazione completata! Aggiunti ${count} giocatori al gruppo ${activeTeamId}.`);
                    AppCache.clearPlayers(activeTeamId);
                    loadTeamData(true);

                } catch (err) {
                    alert("Errore durante l'importazione dei dati: " + err.message);
                } finally {
                    inputImportCsv.value = '';
                }
            },
            error: function(err) {
                alert("Errore nella lettura del file CSV: " + err.message);
                inputImportCsv.value = '';
            }
        });
    });

        // CONVOCAZIONI E GESTIONE
		document.getElementById('form-callup').addEventListener('submit', async (e) => {
		    e.preventDefault();
		    if (!activeTeamId) return alert("Seleziona prima una squadra!");
		
		    const opponent = document.getElementById('match-opponent').value.trim();
		    const location = document.getElementById('match-location').value.trim();
		    const matchDate = document.getElementById('match-date').value;
		    const matchTime = document.getElementById('match-time').value;
		    const gatheringTime = document.getElementById('gathering-time').value;
		
		    const selectedPlayers = [];
		    document.querySelectorAll('input[name="callup_player"]:checked').forEach(cb => selectedPlayers.push(cb.value));
		
		    if (selectedPlayers.length === 0) return alert("Seleziona almeno un giocatore!");
		
		    try {
		        const callupData = {
		            teamId: activeTeamId,
		            opponent: opponent,
		            location: location,
		            date: matchDate,
		            matchTime: matchTime,
		            gatheringTime: gatheringTime,
		            players: selectedPlayers,
		            updatedAt: serverTimestamp()
		        };
		
		        if (editingCallupId) {
		            // === AGGIORNAMENTO (MODIFICA ESPLICITA) ===
		            // Non tocchiamo 'responses' così non perdiamo le preferenze dei genitori
		            await updateDoc(doc(db, 'callups', editingCallupId), callupData);
		            alert(`Convocazione aggiornata con successo!`);
		        } else {
		            // === NUOVA CREAZIONE (MERCOLEDÌ) ===
		            callupData.createdAt = serverTimestamp();
		            callupData.responses = {}; // Inizializza le risposte vuote
		            await addDoc(collection(db, 'callups'), callupData);
		            alert(`Convocazione creata con successo!`);
		        }
		
		        // Reset dello stato di modifica e del form
		        editingCallupId = null;
		        const submitBtn = document.querySelector('#form-callup button[type="submit"]');
		        if (submitBtn) submitBtn.textContent = "Genera Convocazione";
		
		        document.getElementById('form-callup').reset();
		        if (typeof renderCallupCheckboxes === 'function') renderCallupCheckboxes();
		        loadCallups();
		
		    } catch (err) {
		        alert("Errore salvataggio convocazione: " + err.message);
		    }
		});

  async function loadCallups() {
            const container = document.getElementById('callups-list-container');
            if (!container || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') return;

            try {
                const q = query(collection(db, 'callups'), where('teamId', '==', activeTeamId));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-xs text-gray-400">Nessuna convocazione presente.</p>';
                    loadedCallupsList = [];
                    return;
                }

                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                docs.sort((a, b) => new Date(`${b.date}T${b.matchTime}`) - new Date(`${a.date}T${a.matchTime}`));

                loadedCallupsList = docs;
                container.innerHTML = '';

                docs.forEach(data => {
                    const callupResponses = data.responses || {};
                    const invitedPlayers = data.players || [];

                    // Pulisce e normalizza la lista dei giocatori per estrarre ID e Nome in modo sicuro
                    const parsedPlayers = invitedPlayers.map(p => {
                        if (typeof p === 'string' && p.includes('|')) {
                            const parts = p.split('|');
                            return { id: parts[0], name: parts[1] };
                        } else if (typeof p === 'string') {
                            return { id: p, name: p };
                        } else if (p && typeof p === 'object') {
                            return { id: p.id || p.playerId, name: p.name || p.playerName || 'Giocatore' };
                        }
                        return { id: null, name: String(p) };
                    });

                    // Ordina alfabeticamente per nome
                    parsedPlayers.sort((a, b) => a.name.localeCompare(b.name));

                    let playersListHTML = '';
                    parsedPlayers.forEach((player, index) => {
                        const status = (player.id && callupResponses[player.id]) ? callupResponses[player.id] : 'pending';

                        let statusBadge = '<span class="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">In attesa ⏳</span>';
                        if (status === 'confirmed') {
                            statusBadge = '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Confermato ✅</span>';
                        } else if (status === 'absent') {
                            statusBadge = '<span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Assente ❌</span>';
                        }

                        playersListHTML += `
                            <div class="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-100 text-xs mb-1">
                                <span class="text-slate-700">${index + 1}. ${player.name}</span>
                                <div>${statusBadge}</div>
                            </div>
                        `;
                    });

                    // INSERITO QUI IL NUOVO BLOCCO PULSANTI NELLA SCHEDA
                    container.innerHTML += `
                        <div class="border rounded-xl p-4 bg-gray-50 flex flex-col gap-3 text-xs mb-3 shadow-sm">
                            <div class="space-y-1">
                                <p class="font-bold text-sm text-black">⚽ Spes Montesacro vs ${data.opponent}</p>
                                <p class="text-gray-700">
                                    📅 <strong>Giorno:</strong> ${formatDateIT(data.date)} |
                                    🕒 <strong>Inizio:</strong> ${data.matchTime} |
                                    ⏰ <strong>Ritrovo:</strong> ${data.gatheringTime}
                                </p>
                                <p class="text-gray-600">📍 <strong>Campo:</strong> ${data.location}</p>
                            </div>

                            <div class="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                                <p class="font-bold text-slate-800 mb-2">📊 Stato Risposta (${parsedPlayers.length}):</p>
                                <div class="flex flex-col max-h-40 overflow-y-auto pr-1">
                                    ${playersListHTML || '<p class="text-gray-400">Nessun giocatore inserito.</p>'}
                                </div>
                            </div>

                            <div class="flex flex-wrap justify-end gap-2 pt-1">
                                <button data-id="${data.id}" class="btn-share-invite bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">📲 Invito</button>
								<button data-id="${data.id}" class="btn-edit-callup bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">✏️ Modifica</button>
                                <button data-id="${data.id}" class="btn-final-callup bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">📢 Definitiva</button>
                                <button data-id="${data.id}" class="btn-print-callup bg-black hover:bg-gray-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">🖨️ Stampa</button>
                                <button data-id="${data.id}" class="btn-delete-callup bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">🗑️ Elimina</button>
                            </div>
                        </div>
                    `;
                });

                // INSERITO QUI IL COLLEGAMENTO DEGLI EVENTI IN FONDO
                container.querySelectorAll('.btn-share-invite').forEach(b => {
                    b.addEventListener('click', (e) => sendInviteWhatsApp(e.target.getAttribute('data-id')));
                });
                container.querySelectorAll('.btn-final-callup').forEach(b => {
                    b.addEventListener('click', (e) => sendFinalCallupWhatsApp(e.target.getAttribute('data-id')));
                });
                container.querySelectorAll('.btn-edit-callup').forEach(b => {
                    b.addEventListener('click', (e) => prepareEditCallup(e.target.getAttribute('data-id')));
                });
                container.querySelectorAll('.btn-print-callup').forEach(b => {
                    b.addEventListener('click', (e) => printCallupReport(e.target.getAttribute('data-id')));
                });
                container.querySelectorAll('.btn-delete-callup').forEach(b => {
                    b.addEventListener('click', (e) => deleteCallup(e.target.getAttribute('data-id')));
                });


            } catch (err) {
                container.innerHTML = `<p class="text-xs text-red-500">Errore: ${err.message}</p>`;
            }
        }
		function getMonthlyTableAsText() {
		    const table = document.querySelector('#monthly-sessions-container table');
		    if (!table) return "Nessun dato disponibile.";
		
		    const rows = Array.from(table.querySelectorAll('tr'));
		    if (rows.length === 0) return "Tabella vuota.";
		    
		    // 1. Identifica le colonne (giorni) con almeno un dato
		    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
		    const activeColumns = [];
		    
		    for (let i = 1; i < headerCells.length; i++) {
		        let hasData = false;
		        for (let j = 1; j < rows.length; j++) {
		            const cells = rows[j].querySelectorAll('td');
		            if (cells[i] && cells[i].innerText.trim() !== '-' && cells[i].innerText.trim() !== '') {
		                hasData = true;
		                break;
		            }
		        }
		        if (hasData) activeColumns.push(i);
		    }
		
		    // 2. Costruisci il messaggio formattato
		    let output = "📋 *Registro Presenze Mensile*\n```\n";
		
		    rows.forEach((row, rowIndex) => {
		        const cells = Array.from(row.querySelectorAll('th, td'));
		        let rowText = "";
		
		        if (rowIndex === 0) {
		            // Intestazione: Spazio vuoto al posto di "Cognome" e numeri dei giorni
		            rowText += "".padEnd(10, ' ') + "|";
		            activeColumns.forEach(colIndex => {
		                let cellText = cells[colIndex] ? cells[colIndex].innerText.trim() : "";
		                let dayNum = cellText.replace('Giorno', '').trim();
		                // Formattazione pulita per i giorni (es. centrati in 3 spazi)
		                rowText += dayNum.substring(0, 3).padStart(3, ' ') + " ";
		            });
		        } else {
		            // Dati giocatori: Solo cognome e stati di presenza (3 caratteri)
		            let fullName = cells[0].innerText.trim();
		            let lastName = fullName.split(' ')[0]; // Prende il cognome
		            rowText += lastName.substring(0, 10).padEnd(10, ' ') + "|";
		
		            activeColumns.forEach(colIndex => {
		                const cell = cells[colIndex];
		                let content = cell ? cell.innerText.trim() : "-";
		                let val = (content === '-' || content === '') ? " . " : content.substring(0, 3).padEnd(3, ' ');
		                rowText += val + " ";
		            });
		        }
		
		        output += rowText + "\n";
		    });
		
		    output += "```";
		    return output;
		}
		function shareCallupWhatsApp(callupId) {
		    const callup = loadedCallupsList.find(c => c.id === callupId);
		    if (!callup) return;
		    
		    // Ordina alfabeticamente basandosi sul nome pulito (dopo il '|')
		    const sortedPlayers = [...(callup.players || [])].sort((a, b) => {
		        const nameA = a.includes('|') ? a.split('|')[1] : a;
		        const nameB = b.includes('|') ? b.split('|')[1] : b;
		        return nameA.localeCompare(nameB);
		    });
		
		    let text = `📢 *CONVOCAZIONE GARA UFFICIALE*\n⚽ *Spes Montesacro vs ${callup.opponent}*\n\n📅 *Giorno:* ${formatDateIT(callup.date)}\n🕒 *Inizio Partita:* ${callup.matchTime}\n⏰ *Ora Ritrovo:* ${callup.gatheringTime}\n📍 *Luogo:* ${callup.location}\n\n👥 *ELENCO CONVOCATI (${sortedPlayers.length}):*\n`;
		    
		    sortedPlayers.forEach((p, i) => {
		        // Pulisce la stringa rimuovendo l'ID prima di scriverla su WhatsApp
		        const cleanName = p.includes('|') ? p.split('|')[1] : p;
		        text += `${i + 1}. ${cleanName}\n`;
		    });
		    
		    text += `\n⚠️ *Massima puntualità!*`;
		    sendToWhatsApp(text, `Convocazione vs ${callup.opponent}`);
		}

		document.getElementById('btn-share-monthly-wa').addEventListener('click', () => {
		    if (!activeTeamId) return;
		    
		    // Mostra la tab
		    document.getElementById('tab-monthly').classList.remove('hidden');
		    document.getElementById('monthly-sessions-container').classList.remove('hidden');
		
		    const m = parseInt(document.getElementById('filter-month').value);
		    const y = parseInt(document.getElementById('filter-year').value);
		    
		    // Componi l'intestazione
		    let text = `📊 *RIEPILOGO PRESENZE - ${activeTeamId}*\n📅 *${monthNamesIT[m]} ${y}*\n\n`;
		    
		    // Aggiungi la tabella convertita in testo
		    text += getMonthlyTableAsText();
		    
		    // Invia
		    sendToWhatsApp(text, `Registro ${monthNamesIT[m]}`);
		});


        document.getElementById('btn-share-roster-wa').addEventListener('click', () => {
            if (!activeTeamId || activeTeamPlayers.length === 0) return;
            let text = `👥 *ROSA UFFICIALE GIOCATORI*\n🏆 *Spes Montesacro - ${activeTeamId}*\n📊 *Totale Tesserati:* ${activeTeamPlayers.length}\n\n`;
            activeTeamPlayers.forEach((p, i) => text += `${i + 1}. ${p.lastName ? `${p.lastName} ${p.firstName}` : p.name}\n`);
            sendToWhatsApp(text, `Rosa ${activeTeamId}`);
        });

        function printCallupReport(callupId) {
            const callup = loadedCallupsList.find(c => c.id === callupId);
            if (!callup) return;
            const printContainer = document.getElementById('callup-print-container');
            document.getElementById('print-report-period').innerText = 'Modulo Convocazione Gara Ufficiale';
			// Ordina estraendo la parte dopo il '|' (il nome pulito), così l'ordinamento alfabetico funziona perfettamente
			    const sortedPlayers = [...(callup.players || [])].sort((a, b) => {
			        const nameA = a.includes('|') ? a.split('|')[1] : a;
			        const nameB = b.includes('|') ? b.split('|')[1] : b;
			        return nameA.localeCompare(nameB);
			    });

            let rows = '';
            sortedPlayers.forEach((p, index) => {
				// Pulisce la stringa rimuovendo l'ID se presente (es. "abc123xyz|Rossi Mario" -> "Rossi Mario")
        		const cleanName = p.includes('|') ? p.split('|')[1] : p;
				rows += `<tr><td class="border border-black p-2 text-center font-bold" style="width: 40px;">${index + 1}</td><td class="border border-black p-2 font-bold text-sm">${cleanName}</td><td class="border border-black p-2"></td></tr>`;
            });

            printContainer.innerHTML = `
                <div class="bg-gray-100 border border-black p-3 mb-4 rounded space-y-1 text-sm">
                    <p class="text-base font-extrabold text-black">⚽ PARTITA: Spes Montesacro vs ${callup.opponent}</p>
                    <div class="grid grid-cols-2 gap-2 pt-1 font-semibold">
                        <p>📅 <strong>Giorno:</strong> ${formatDateIT(callup.date)}</p>
                        <p>📍 <strong>Luogo:</strong> ${callup.location}</p>
                        <p>🕒 <strong>Inizio:</strong> ${callup.matchTime}</p>
                        <p>⏰ <strong>Ritrovo Campo:</strong> ${callup.gatheringTime}</p>
                    </div>
                </div>
                <h3 class="text-md font-bold mb-2 uppercase tracking-wide border-b border-black pb-1">Giocatori Convocati (${sortedPlayers.length})</h3>
                <table class="w-full border-collapse border border-black text-left">
                    <thead><tr class="bg-gray-200 text-black uppercase text-xs"><th class="border border-black p-2 text-center">#</th><th class="border border-black p-2">Cognome e Nome</th><th class="border border-black p-2 w-1/3">Note / Firma</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            document.body.classList.remove('print-landscape', 'print-monthly', 'print-roster');
            document.body.classList.add('print-callup');
            window.print();
        }

		async function deleteCallup(callupId) {
		    console.log("🚀 Avvio eliminazione/archiviazione per ID:", callupId);
		    if (!confirm("Vuoi archiviare questa partita nello storico ed eliminarla dalle convocazioni attive?")) return;
		    
		    try {
		        const callupRef = doc(db, 'callups', callupId);
		        const callupSnap = await getDoc(callupRef);
		
		        if (callupSnap.exists()) {
		            const callupData = callupSnap.data();
		            console.log("📦 Dati trovati, procedo alla scrittura in match_history:", callupData);
		
		            // Scrittura nella nuova collection
		            await addDoc(collection(db, 'match_history'), {
		                ...callupData,
		                archivedAt: new Date().toISOString()
		            });
		            console.log("✅ Scrittura in match_history completata con successo!");
		        } else {
		            console.warn("⚠️ Attenzione: Il documento non esiste in callups!");
		        }
		
		        // Eliminazione dalla collection originale
		        await deleteDoc(callupRef);
		        console.log("🗑️ Documento eliminato con successo da callups.");
		        
		        alert("Partita archiviata nello storico con successo!");
		        loadCallups();
		    } catch (err) { 
		        console.error("❌ ERRORE CRITICO DURANTE L'ARCHIVIAZIONE:", err);
		        alert("Errore: " + err.message); 
		    }
		}

        document.getElementById('btn-print-roster').addEventListener('click', () => {
            document.body.classList.remove('print-landscape', 'print-monthly', 'print-callup');
            document.body.classList.add('print-roster');
            document.getElementById('print-report-period').innerText = 'Documento: Rosa Giocatori Ufficiale';
            window.print();
        });

        document.getElementById('btn-print-monthly').addEventListener('click', () => {
            document.body.classList.remove('print-roster', 'print-callup');
            document.body.classList.add('print-landscape', 'print-monthly');
            const m = parseInt(document.getElementById('filter-month').value);
            const y = parseInt(document.getElementById('filter-year').value);
            document.getElementById('print-report-period').innerText = `Periodo: ${monthNamesIT[m]} ${y}`;
            window.print();
        });

        // MODALE E GESTIONE GIOCATORE
        document.getElementById('btn-open-add-player').addEventListener('click', () => {
            if (!activeTeamId) return alert('Seleziona prima una squadra!');
            editingPlayerId = null;
            document.getElementById('modal-player-title').innerText = "Aggiungi Nuovo Giocatore";
            document.getElementById('btn-submit-player').innerText = "Salva Giocatore";

            document.getElementById('player-first-name').value = '';
            document.getElementById('player-last-name').value = '';
            document.getElementById('player-dob').value = '';
            document.getElementById('player-jersey').value = '';
            document.getElementById('player-role').value = '';
            document.getElementById('player-medical-exp').value = '';
            document.getElementById('player-parent-phone').value = '';
            document.getElementById('modal-add-player').classList.remove('hidden');
        });

       function openEditPlayerModal(playerId) {
            const player = activeTeamPlayers.find(p => p.id === playerId);
            if (!player) return;

            editingPlayerId = playerId;
            document.getElementById('modal-player-title').innerText = "Modifica Giocatore";
            document.getElementById('btn-submit-player').innerText = "Aggiorna Giocatore";

            document.getElementById('player-first-name').value = player.firstName || '';
            document.getElementById('player-last-name').value = player.lastName || '';
            document.getElementById('player-dob').value = player.dob || '';
            document.getElementById('player-jersey').value = player.jersey || '';
            document.getElementById('player-role').value = player.role || '';
            document.getElementById('player-medical-exp').value = player.medicalExp || '';
            document.getElementById('player-parent-phone').value = player.parentPhone || '';

            document.getElementById('modal-add-player').classList.remove('hidden');
        }

        document.getElementById('btn-close-modal-player').addEventListener('click', () => {
            document.getElementById('modal-add-player').classList.add('hidden');
        });

        document.getElementById('form-add-player').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeTeamId) return;

            const firstName = document.getElementById('player-first-name').value.trim();
            const lastName = document.getElementById('player-last-name').value.trim();
            const dob = document.getElementById('player-dob').value;
            const jersey = document.getElementById('player-jersey').value.trim();
            const role = document.getElementById('player-role').value;
            const medicalExp = document.getElementById('player-medical-exp').value;
            const parentPhone = document.getElementById('player-parent-phone').value.trim();

            const playerData = {
                firstName: firstName,
                lastName: lastName,
                name: `${lastName} ${firstName}`.trim(),
                dob: dob,
                jersey: jersey,
                role: role,
                medicalExp: medicalExp,
                parentPhone: parentPhone,
                teamId: activeTeamId
            };

            try {
                // --- CERCA IL GENITORE TRAMITE IL NUMERO DI TELEFONO ---
                if (parentPhone) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where("phone", "==", parentPhone), where("role", "==", "parent"));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        // Se trova il genitore, associa il suo UID al giocatore
                        querySnapshot.forEach((docSnap) => {
                            playerData.parentId = docSnap.id;
                        });
                    } else {
                        // Se non trova nessun utente registrato con quel telefono, rimuoviamo l'eventuale vecchio parentId
                        playerData.parentId = null;
                    }
                } else {
                    playerData.parentId = null;
                }
                // --------------------------------------------------------

                let savedPlayerId = editingPlayerId;

                if (editingPlayerId) {
                    await updateDoc(doc(db, 'players', editingPlayerId), playerData);
                    alert("Giocatore aggiornato con successo!");
                } else {
                    playerData.createdAt = serverTimestamp();
                    const docRef = await addDoc(collection(db, 'players'), playerData);
                    savedPlayerId = docRef.id;
                    alert("Nuovo giocatore aggiunto con successo!");
                }

                // --- AGGIORNA ANCHE IL GENITORE COLLEGANDO IL FIGLIO (SE TROVATO) ---
                if (playerData.parentId && savedPlayerId) {
                    const parentRef = doc(db, 'users', playerData.parentId);
                    await updateDoc(parentRef, {
                        childIds: arrayUnion(savedPlayerId)
                    });
                }
                // -----------------------------------------------------------------

                document.getElementById('modal-add-player').classList.add('hidden');
                AppCache.clearPlayers(activeTeamId);
                loadTeamData(true);
            } catch (err) {
                alert("Errore salvataggio giocatore: " + err.message);
            }
        });

        async function deletePlayer(playerId) {
            if (!confirm("Sei sicuro di voler rimuovere questo giocatore dalla rosa?")) return;
            try {
                await deleteDoc(doc(db, 'players', playerId));
                alert("Giocatore eliminato!");
                AppCache.clearPlayers(activeTeamId);
                loadTeamData(true);
            } catch (err) {
                alert("Errore eliminazione: " + err.message);
            }
        }

        function resetAttendanceRadios() {
            if (!activeTeamPlayers) return;
            activeTeamPlayers.forEach(player => {
                const radio = document.querySelector(`input[name="att_${player.id}"][value="present"]`);
                if (radio) radio.checked = true;
            });
        }

        document.getElementById('btn-reset-attendance-radios').addEventListener('click', () => {
            resetAttendanceRadios();
        });


		// 1. Array in memoria per i tornei
		let tournamentMatches = [];
		
		// Funzione intelligente per caricare i dati in base al ruolo dell'utente loggato
		async function loadTournamentsFromDB() {
		    try {
		        let q;
		        
		        // Esempio: Verifichiamo il ruolo dell'utente corrente (preso dal tuo sistema di autenticazione o profilo utente)
		        // currentUserRole può essere 'admin' o 'coach'
		        // currentCoachTeamId è l'ID della squadra associata a quel coach
		        
		        if (typeof currentUserRole !== 'undefined' && currentUserRole === 'coach' && typeof currentCoachTeamId !== 'undefined') {
		            // 🔒 IL COACH: Scarica dal DB solo i tornei della sua squadra specifica
		            q = query(collection(db, 'tournaments'), where("teamId", "==", currentCoachTeamId));
		            
		            // Forza l'activeTeamId del coach alla sua squadra
		            window.activeTeamId = currentCoachTeamId;
		            
		            // Opzionale: Disabilita il selettore squadre nell'HTML se il coach non deve poterlo cambiare
		            const teamSelectUI = document.getElementById('team-selector'); // Sostituisci con l'ID del tuo selettore
		            if (teamSelectUI) teamSelectUI.disabled = true;
		            
		        } else {
		            // 👑 L'ADMIN: Scarica tutti i tornei di tutte le squadre
		            q = collection(db, 'tournaments');
		        }
		
		        const querySnapshot = await getDocs(q);
		        tournamentMatches = [];
		        querySnapshot.forEach((docSnap) => {
		            tournamentMatches.push({ id: docSnap.id, ...docSnap.data() });
		        });
		        
		        renderTournaments();
		    } catch (error) {
		        console.error("Errore nel caricamento dei tornei:", error);
		    }
		}
		
		// Carica i dati all'avvio
		loadTournamentsFromDB();
		
		// MODALE E GESTIONE TORNEI
		const btnOpenModalTournament = document.getElementById('btn-open-modal-tournament');
		const modalTournament = document.getElementById('modal-tournament');
		
		if (btnOpenModalTournament && modalTournament) {
		    btnOpenModalTournament.addEventListener('click', () => {
		        if (typeof activeTeamId !== 'undefined' && !activeTeamId) {
		            alert('Seleziona prima una squadra!');
		            return;
		        }
		        modalTournament.classList.remove('hidden');
		    });
		}
		
		// 3. Salvataggio Partita su Firebase Firestore
		document.getElementById('form-tournament').addEventListener('submit', async function(e) {
		    e.preventDefault();
		    
		    const teamName = typeof teams !== 'undefined' && teams.find(t => t.id === activeTeamId) 
		        ? teams.find(t => t.id === activeTeamId).name 
		        : "Squadra " + activeTeamId;
		
		    const newMatch = {
		        teamId: activeTeamId,
		        team: activeTeamId,
		        tournament: document.getElementById('tour-name').value,
		        match: document.getElementById('tour-match').value,
		        date: document.getElementById('tour-date').value,
		        time: document.getElementById('tour-time').value,
		        location: document.getElementById('tour-location').value,
		        played: false,
		        result: ""
		    };
		    
		    try {
		        const docRef = await addDoc(collection(db, 'tournaments'), newMatch);
		        newMatch.id = docRef.id;
		        tournamentMatches.push(newMatch);
		        
		        renderTournaments();
		        closeTournamentModal();
		        this.reset();
		    } catch (error) {
		        console.error("Errore durante il salvataggio su Firebase:", error);
		        alert("Errore nel salvataggio della partita.");
		    }
		});
		
		// 4. Renderizzazione dinamica delle card (con bottoni Modifica ed Elimina)
		window.renderTournaments = function() {
		    const container = document.getElementById('tournament-grid');
		    const teamSpan = document.getElementById('display-active-team-tour');
		    const filterSelect = document.getElementById('filter-tournament-select');
		    const statusSelect = document.getElementById('filter-status-select'); 
		    
		    const currentId = typeof activeTeamId !== 'undefined' ? activeTeamId : '';
		    
		    if (teamSpan) teamSpan.innerText = currentId;
		    
		    if (!container) return;
		
		    // 1. Filtra le partite della squadra attiva
		    const teamMatches = tournamentMatches.filter(m => m.teamId === currentId);
		
		    // 2. Popola o aggiorna automaticamente le opzioni del menu a tendina dei tornei
		    if (filterSelect) {
		        const selectedValue = filterSelect.value;
		        const uniqueTournaments = [...new Set(teamMatches.map(m => m.tournament).filter(Boolean))];
		        
		        filterSelect.innerHTML = `<option value="">Tutti i tornei (${teamMatches.length})</option>`;
		        uniqueTournaments.forEach(tourName => {
		            const isScaleSelected = tourName === selectedValue ? 'selected' : '';
		            filterSelect.innerHTML += `<option value="${tourName}" ${isScaleSelected}>${tourName}</option>`;
		        });
		    }
		
		    // 3. Applica il filtro del torneo selezionato
		    const selectedTourFilter = filterSelect ? filterSelect.value.trim().toLowerCase() : '';
		    let filtered = selectedTourFilter 
		        ? teamMatches.filter(m => m.tournament && m.tournament.trim().toLowerCase() === selectedTourFilter) 
		        : [...teamMatches];
		    
		    // 4. 🔍 APPLICA IL FILTRO DELLO STATO (Controllo rigoroso su boolean)
		    const statusFilter = statusSelect ? statusSelect.value : '';
		    
		    if (statusFilter === 'da_giocare') {
		        filtered = filtered.filter(m => m.played === false || m.played === undefined);
		    } else if (statusFilter === 'giocata') {
		        filtered = filtered.filter(m => m.played === true);
		    }
		
		    // 5. Ordinamento cronologico per data e ora
		    filtered.sort((a, b) => {
		        const dateTimeA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`);
		        const dateTimeB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`);
		        return dateTimeA - dateTimeB;
		    });
		
		    container.innerHTML = '';
		    
		    if (filtered.length === 0) {
		        container.innerHTML = `<p class="text-center text-xs text-slate-400 py-10 w-full col-span-2">Nessuna partita trovata con i filtri selezionati.</p>`;
		        return;
		    }
		
		    // 6. Renderizzazione dinamica delle card
		    filtered.forEach(m => {
		        container.innerHTML += `
		            <div class="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
		                <div class="flex justify-between items-center">
		                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${m.tournament || 'Torneo'}</span>
		                    <span class="text-[9px] font-bold ${m.played ? 'text-emerald-600' : 'text-amber-600'}">
		                        ${m.played ? '● GIOCATA' : '● DA GIOCARE'}
		                    </span>
		                </div>
		                <h4 class="font-bold text-slate-800 text-sm">${m.match}</h4>
		                <p class="text-[11px] font-semibold text-slate-500">📍 ${m.location} | 📅 ${m.date} - ${m.time}</p>
		                
		                <div class="flex flex-col gap-1.5 mt-2">
		                    ${!m.played ? 
		                        `<button onclick="setResult('${m.id}')" class="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[10px] py-2 rounded-xl transition active:scale-95">Inserisci Risultato</button>` 
		                        : `<p class="mt-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 py-2 rounded-lg">Risultato: ${m.result}</p>`
		                    }
		                    <div class="flex gap-2">
		                        <button onclick="editMatch('${m.id}')" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition active:scale-95">✏️ Modifica</button>
		                        <button onclick="deleteMatch('${m.id}')" class="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] py-1.5 rounded-xl transition active:scale-95">🗑️ Elimina</button>
		                    </div>
		                </div>
		            </div>
		        `;
		    });
		};
		
		
		// 7. Funzione globale per inserire/aggiornare il risultato
		window.setResult = async function(id) {
		    const res = prompt("Inserisci il risultato (es. 3-1):");
		    if (res) {
		        try {
		            await updateDoc(doc(db, 'tournaments', String(id)), {
		                played: true,
		                result: res
		            });
		
		            const match = tournamentMatches.find(m => m.id === id);
		            if (match) {
		                match.played = true;
		                match.result = res;
		            }
		
		            renderTournaments();
		        } catch (error) {
		            console.error("Errore nell'aggiornamento del risultato su Firebase:", error);
		            alert("Errore nel salvataggio del risultato sul cloud.");
		        }
		    }
		};
		
		// 8. Funzione globale per modificare una partita
		window.editMatch = async function(id) {
		    const match = tournamentMatches.find(m => m.id === id);
		    if (!match) return;
		
		    const newMatchName = prompt("Modifica Incontro (es. Roma vs Lazio):", match.match);
		    if (newMatchName === null) return;
		
		    const newLocation = prompt("Modifica Luogo:", match.location);
		    if (newLocation === null) return;
		
		    const newDate = prompt("Modifica Data (es. 2026-09-10):", match.date);
		    if (newDate === null) return;
		
		    const newTime = prompt("Modifica Orario (es. 15:00):", match.time);
		    if (newTime === null) return;
		
		    const updatedData = {
		        match: newMatchName.trim() || match.match,
		        location: newLocation.trim() || match.location,
		        date: newDate.trim() || match.date,
		        time: newTime.trim() || match.time
		    };
		
		    try {
		        await updateDoc(doc(db, 'tournaments', String(id)), updatedData);
		        
		        Object.assign(match, updatedData);
		        renderTournaments();
		    } catch (error) {
		        console.error("Errore durante la modifica della partita:", error);
		        alert("Impossibile aggiornare la partita sul cloud.");
		    }
		};
		
		//  Funzione globale per eliminare una partita
		window.deleteMatch = async function(id) {
		    if (confirm("Sei sicuro di voler eliminare questa partita?")) {
		        try {
		            await deleteDoc(doc(db, 'tournaments', String(id)));
		            
		            tournamentMatches = tournamentMatches.filter(m => m.id !== id);
		            renderTournaments();
		        } catch (error) {
		            console.error("Errore durante l'eliminazione della partita:", error);
		            alert("Impossibile eliminare la partita dal cloud.");
		        }
		    }
		};
		
		//  Funzione globale per aggiornare il risultato con updateDoc + doc
		window.setResult = async function(id) {
		    const res = prompt("Inserisci il risultato (es. 3-1):");
		    if (res) {
		        try {
		            await updateDoc(doc(db, 'tournaments', String(id)), {
		                played: true,
		                result: res
		            });
		
		            const match = tournamentMatches.find(m => m.id === id);
		            if (match) {
		                match.played = true;
		                match.result = res;
		            }
		
		            renderTournaments();
		        } catch (error) {
		            console.error("Errore nell'aggiornamento del risultato su Firebase:", error);
		            alert("Errore nel salvataggio del risultato sul cloud.");
		        }
		    }
		};	

		// Definisce la funzione come proprietà dell'oggetto globale window
		window.closeTournamentModal = function() {
		    const modal = document.getElementById('modal-tournament');
		    
		    if (modal) {
		        modal.classList.add('hidden');
		    }
		};


        // GESTIONE CAMBIO TAB CLICK
		document.addEventListener('DOMContentLoaded', () => {
		    // Collegamenti sicuri ai tab
		    const tabs = [
		        { id: 'btn-tab-roster', target: 'tab-roster' },
		        { id: 'btn-tab-attendance', target: 'tab-attendance' },
		        { id: 'btn-tab-monthly', target: 'tab-monthly' },
		        { id: 'btn-tab-callup', target: 'tab-callup' },
		        { id: 'btn-tab-staff', target: 'tab-staff' },
		        { id: 'btn-tab-tournaments', target: 'tab-tournaments' }
		    ];
		
		    tabs.forEach(tab => {
		        const btn = document.getElementById(tab.id);
		        if (btn) {
		            btn.addEventListener('click', () => switchTab(tab.target));
		        }
		    });
		});

		// 📥 Funzione globale per esportare in CSV
		window.exportToCSV = function() {
		    if (tournamentMatches.length === 0) {
		        alert("Nessuna partita da esportare!");
		        return;
		    }
		
		    let csvContent = "data:text/csv;charset=utf-8,Torneo,Partita,Data,Orario,Luogo,Risultato\n";
		    
		    tournamentMatches.forEach(m => {
		        // Racchiudiamo i campi tra virgolette per evitare problemi con le virgole nei testi
		        let row = [
		            `"${m.tournament || ''}"`,
		            `"${m.match || ''}"`,
		            `"${m.date || ''}"`,
		            `"${m.time || ''}"`,
		            `"${m.location || ''}"`,
		            `"${m.result || ''}"`
		        ].join(",");
		        csvContent += row + "\n";
		    });
		
		    const encodedUri = encodeURI(csvContent);
		    const link = document.createElement("a");
		    link.setAttribute("href", encodedUri);
		    link.setAttribute("download", "partite_torneo.csv");
		    document.body.appendChild(link);
		    link.click();
		    document.body.removeChild(link);
		};
		
		// 📤 Funzione globale per importare da CSV
		window.importCSV = async function(input) {
		    const file = input.files[0];
		    if (!file) return;
		
		    const reader = new FileReader();
		    reader.onload = async function(e) {
		        const text = e.target.result;
		        const rows = text.split("\n").slice(1); // Salta l'intestazione
		
		        let importedCount = 0;
		
		        for (let row of rows) {
		            if (!row.trim()) continue;
		            
		            // Gestione base della separazione (se usi le virgolette nel CSV)
		            const cols = row.split(",");
		            if (cols.length < 5) continue;
		
		            const clean = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : '';
		
		            const newMatch = {
		                teamId: typeof activeTeamId !== 'undefined' ? activeTeamId : '',
		                tournament: clean(cols[0]),
		                match: clean(cols[1]),
		                date: clean(cols[2]),
		                time: clean(cols[3]),
		                location: clean(cols[4]),
		                played: false,
		                result: ""
		            };
		
		            try {
		                // Salvataggio su Firebase Firestore
		                await addDoc(collection(db, 'tournaments'), newMatch);
		                importedCount++;
		            } catch (error) {
		                console.error("Errore durante l'importazione di una riga:", error);
		            }
		        }
		
		        alert(`Importazione completata! Aggiunte ${importedCount} partite.`);
		        
		        // Pulisce l'input file per permettere di ricaricare lo stesso file se necessario
		        input.value = "";
		
		        // Ricarica i dati dal DB
		        if (typeof loadTournamentsFromDB === 'function') {
		            loadTournamentsFromDB();
		        }
		    };
		    reader.readAsText(file);
		};

		// 1. Apre e chiude il menu a tendina
		window.toggleHamburgerMenu = function() {
		    const tabsMenu = document.getElementById('navigation-tabs');
		    const icon = document.getElementById('hamburger-icon');
		    
		    if (tabsMenu) {
		        tabsMenu.classList.toggle('hidden');
		        if (icon) {
		            icon.style.transform = tabsMenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
		        }
		    }
		};
		
		// 2. Gestisce il click sui tab all'interno del menu
		document.querySelectorAll('.tab-btn').forEach(btn => {
		    btn.addEventListener('click', function() {
		        const labelBtn = document.getElementById('current-active-tab-label');
		        if (labelBtn) {
		            // Prende il testo pulito rimuovendo spazi extra ed emoji se necessario, 
		            // oppure prendendo il testo del bottone escludendo l'icona
		            const textOnly = this.textContent.trim();
		            labelBtn.textContent = textOnly;
		        }
		        
		        // Chiude la tendina
		        const tabsMenu = document.getElementById('navigation-tabs');
		        const wrapper = document.getElementById('hamburger-icon-wrapper');
		        if (tabsMenu) {
		            tabsMenu.classList.add('hidden');
		            if (wrapper) wrapper.style.transform = 'rotate(0deg)';
		        }
		    });
		});
		// 3. Esegue il Backup dei dati

		window.downloadDatabaseBackup = async function() {
		    const backupData = {};
		    
		    // Elenco delle tue collection (ho aggiunto anche 'tournaments' che ho visto nel tuo codice)
		    const collectionsToBackup = ['tournaments', 'uisers', 'players', 'callups', 'attendances'];  
		
		    try {
		        console.log("Inizio backup del database...");
		        
		        for (const colName of collectionsToBackup) {
		            // Sintassi Firebase v9+ Modular SDK
		            const querySnapshot = await getDocs(collection(db, colName));
		            backupData[colName] = querySnapshot.docs.map(docSnapshot => ({
		                id: docSnapshot.id,
		                ...docSnapshot.data()
		            }));
		        }
		
		        // Creazione e download automatico del file JSON
		        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
		        const downloadAnchorNode = document.createElement('a');
		        downloadAnchorNode.setAttribute("href", dataStr);
		        downloadAnchorNode.setAttribute("download", `Spes_Backup_${new Date().toISOString().slice(0,10)}.json`);
		        document.body.appendChild(downloadAnchorNode);
		        downloadAnchorNode.click();
		        downloadAnchorNode.remove();
		        
		        alert("Backup del database completato con successo!");
		    } catch (error) {
		        console.error("Errore durante il backup:", error);
		        alert("Errore nel backup: " + error.message);
		    }
		};

	// 1. Invio invito iniziale (Mercoledì)
	function sendInviteWhatsApp(id) {
	    const callup = loadedCallupsList.find(c => c.id === id);
	    if (!callup) return;
	    const msg = `Ciao! È online la convocazione per la partita contro ${callup.opponent} del ${formatDateIT(callup.date)}. Entrate nel portale Spes Montesacro per gestire la presenza!`;
	    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
	}
	
	// 2. Invio convocazione definitiva (Venerdì)
	function sendFinalCallupWhatsApp(id) {
	    const callup = loadedCallupsList.find(c => c.id === id);
	    if (!callup) return;
	    
	    // Codici Unicode sicuri per le sirene che non si corrompono mai
	    const siren = "\uD83D\uDEA8"; 
	    
	    const msg = `${siren} CONVOCAZIONE DEFINITIVA - Spes Montesacro ${siren}\n\nPartita: *${callup.opponent}*\nRitrovo: *${callup.gatheringTime}*\n\nLa lista è stata finalizzata. Controllate il portale per i dettagli definitivi!`;
	    
	    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
	}

	let editingCallupId = null;
	function prepareEditCallup(id) {
	    const callup = loadedCallupsList.find(c => c.id === id);
	    if (!callup) return;
	
	    document.getElementById('match-opponent').value = callup.opponent || '';
	    document.getElementById('match-location').value = callup.location || '';
	    document.getElementById('match-date').value = callup.date || '';
	    document.getElementById('match-time').value = callup.matchTime || '';
	    document.getElementById('gathering-time').value = callup.gatheringTime || '';
	
	    const invited = callup.players || [];
	    document.querySelectorAll('input[name="callup_player"]').forEach(chk => {
	        const val = chk.value;
	        chk.checked = invited.includes(val) || invited.some(p => p.includes(val));
	    });
	
	    editingCallupId = id;
	
	    const submitBtn = document.querySelector('#form-callup button[type="submit"]');
	    if (submitBtn) submitBtn.textContent = "Aggiorna Convocazione 💾";
	
	    document.getElementById('form-callup').scrollIntoView({ behavior: 'smooth' });
	}

async function linkParentToPlayerByPhone(playerId, parentPhone) {
    try {
        // 1. Pulisci il numero di telefono (rimuovi spazi o trattini per evitare errori di battitura)
        const cleanPhone = parentPhone.trim();

        // 2. Cerca nella collezione 'users' (o 'parents') se esiste un utente con questo telefono e ruolo 'parent'
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("phone", "==", cleanPhone), where("role", "==", "parent"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn("Nessun genitore trovato con questo numero di telefono:", cleanPhone);
            // Puoi comunque salvare il telefono nella scheda del giocatore senza legare l'account Auth per ora
            await updateDoc(doc(db, 'players', playerId), { parentPhone: cleanPhone });
            return;
        }

        // 3. Prendi il primo genitore trovato (o gestisci più genitori se necessario)
        let parentDocId = null;
        querySnapshot.forEach((docSnap) => {
            parentDocId = docSnap.id; // Questo è l'UID del genitore in Firebase Auth
        });

        // 4. Aggiorna la scheda del giocatore collegando l'ID del genitore
        await updateDoc(doc(db, 'players', playerId), {
            parentPhone: cleanPhone,
            parentId: parentDocId // Collega direttamente l'UID del genitore
        });

        // 5. (Opzionale) Aggiorna anche il genitore aggiungendo il figlio nel suo array 'childIds'
        const parentRef = doc(db, 'users', parentDocId);
        // Usiamo arrayUnion per aggiungere il playerId senza duplicarlo
        await updateDoc(parentRef, {
            childIds: arrayUnion(playerId)
        });

        console.log("Associazione avvenuta con successo tra giocatore e genitore!");
        alert("Genitore associato con successo al giocatore!");

    } catch (err) {
        console.error("Errore durante l'associazione:", err);
        alert("Errore nell'associazione: " + err.message);
    }
}


	if ('serviceWorker' in navigator) {
  		window.addEventListener('load', () => {
    		navigator.serviceWorker.register('/sw.js')
      		.then((reg) => console.log('Service Worker registrato con successo'))
      		.catch((err) => console.log('Registrazione fallita', err));
  		});
	}

