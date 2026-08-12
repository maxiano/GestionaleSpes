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
            serverTimestamp
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


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
            if (tabId === 'tab-staff' && (!currentUserProfile || currentUserProfile.role !== 'admin')) {
                return alert("Accesso non autorizzato alla Gestione Staff.");
            }

            const isAdmin = currentUserProfile && currentUserProfile.role === 'admin';

            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.id === 'btn-tab-staff') {
                    btn.className = `tab-btn ${isAdmin ? '' : 'hidden'} flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-800 bg-gray-100 hover:bg-gray-200 transition border border-gray-300`;
                } else {
                    btn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-600 hover:bg-gray-100 transition";
                }
            });

            document.getElementById(tabId).classList.remove('hidden');

            const activeBtn = document.getElementById(`btn-${tabId}`);
            if (activeBtn) {
                activeBtn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm transition text-white bg-black shadow";
            }

            if (tabId === 'tab-callup') loadCallups();
            if (tabId === 'tab-staff') loadStaffList();
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

                teamSelect.innerHTML = adminTeamOptionsHTML;
                teamSelect.value = 'ALL';
                activeTeamId = null;

                document.getElementById('navigation-tabs').classList.add('hidden');
                document.getElementById('main-content-area').classList.add('hidden');
            } else {
                document.getElementById('dashboard-role-title').innerText = "Pannello Tecnico Coach";

                document.getElementById('btn-tab-staff').classList.add('hidden');
                document.getElementById('nav-btn-staff').classList.add('hidden');

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

                document.getElementById('user-info').innerText = `${currentUserProfile.name} (${currentUserProfile.role.toUpperCase()})`;
                document.getElementById('btn-logout').classList.remove('hidden');
                document.getElementById('section-login').classList.add('hidden');
                document.getElementById('app-dashboard').classList.remove('hidden');

                setupTeamSelectorUI();
            } else {
                currentUserProfile = null;
                activeTeamId = null;
                document.getElementById('btn-logout').classList.add('hidden');
                document.getElementById('nav-btn-staff').classList.add('hidden');
                document.getElementById('btn-tab-staff').classList.add('hidden');
                document.getElementById('section-login').classList.remove('hidden');
                document.getElementById('app-dashboard').classList.add('hidden');
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
                        <input type="checkbox" name="callup_player" value="${displayName}" checked class="rounded text-black focus:ring-black">
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

            const date = dateInput.value;

            try {
                const q = query(
                    collection(db, 'attendances'),
                    where('teamId', '==', activeTeamId),
                    where('date', '==', date)
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    currentSessionDocId = docSnap.id;
                    const records = docSnap.data().records || [];

                    records.forEach(rec => {
                        const radio = document.querySelector(`input[name="att_${rec.playerId}"][value="${rec.status}"]`);
                        if (radio) radio.checked = true;
                    });

                    if (container) container.classList.remove('hidden');
                    if (badge) {
                        badge.className = "text-xs font-bold text-amber-800";
                        badge.innerHTML = `⚠️ Presenze per il <strong>${formatDateIT(date)}</strong> già salvate. Salvando ora sovrascriverai i dati.`;
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

            try {
                const q = query(
                    collection(db, 'attendances'),
                    where('teamId', '==', activeTeamId),
                    where('date', '==', date)
                );
                const existingCheck = await getDocs(q);

                let docToUpdateId = null;
                if (!existingCheck.empty) {
                    if (!confirm(`⚠️ Hai già salvato le presenze per il ${formatDateIT(date)}.\nVuoi sovrascriverle?`)) return;
                    docToUpdateId = existingCheck.docs[0].id;
                }

                const records = [];
                activeTeamPlayers.forEach(player => {
                    const radio = document.querySelector(`input[name="att_${player.id}"]:checked`);
                    if (radio) {
                        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                        records.push({ playerId: player.id, name: displayName, status: radio.value });
                    }
                });

                if (docToUpdateId) {
                    const docRef = doc(db, 'attendances', docToUpdateId);
                    await updateDoc(docRef, {
                        records: records,
                        updatedAt: serverTimestamp()
                    });
                    alert('Presenze aggiornate con successo!');
                } else {
                    await addDoc(collection(db, 'attendances'), {
                        teamId: activeTeamId,
                        date: date,
                        records: records,
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
            const startOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            const endOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

            try {
                let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth);

                if (!sessions || forceRefresh) {
                    container.innerHTML = '<p class="text-sm text-gray-500 py-4">Caricamento registro allenamenti...</p>';
                    const q = query(
                        collection(db, 'attendances'),
                        where('teamId', '==', activeTeamId),
                        where('date', '>=', startOfMonth),
                        where('date', '<=', endOfMonth)
                    );
                    const snapshot = await getDocs(q);

                    sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    AppCache.setAttendances(activeTeamId, selectedYear, selectedMonth, sessions);
                }

                const sessionsByDay = {};
                let totalPresentsCount = 0;

                sessions.forEach(s => {
                    const dayNum = parseInt(s.date.split('-')[2], 10);
                    sessionsByDay[dayNum] = s;
                    if (s.records) {
                        totalPresentsCount += s.records.filter(r => r.status === 'present' || r.status === 'late').length;
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

                            if (session && session.records) {
                                const rec = session.records.find(r => r.playerId === player.id);
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
            sessions.forEach(s => { sessionsByDay[parseInt(s.date.split('-')[2], 10)] = s; });

            activeTeamPlayers.forEach(player => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                csv += `"${displayName}";`;
                for (let d = 1; d <= totalDaysInMonth; d++) {
                    const session = sessionsByDay[d];
                    let val = "-";
                    if (session && session.records) {
                        const rec = session.records.find(r => r.playerId === player.id);
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
                const q = query(
                    collection(db, 'callups'),
                    where('teamId', '==', activeTeamId),
                    where('date', '==', matchDate)
                );
                const snapshot = await getDocs(q);

                let docToUpdateId = !snapshot.empty ? snapshot.docs[0].id : null;

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

                if (docToUpdateId) {
                    await updateDoc(doc(db, 'callups', docToUpdateId), callupData);
                    alert(`Convocazione aggiornata per il ${formatDateIT(matchDate)}!`);
                } else {
                    callupData.createdAt = serverTimestamp();
                    await addDoc(collection(db, 'callups'), callupData);
                    alert(`Convocazione creata!`);
                }

                document.getElementById('form-callup').reset();
                renderCallupCheckboxes();
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
                    const playersList = (data.players || []).join(', ');
                    container.innerHTML += `
                        <div class="border rounded p-3 bg-gray-50 flex justify-between items-start text-xs mb-2 shadow-sm">
                            <div class="space-y-1">
                                <p class="font-bold text-sm text-black">⚽ Spes Montesacro vs ${data.opponent}</p>
                                <p class="text-gray-700">
                                    📅 <strong>Giorno:</strong> ${formatDateIT(data.date)} |
                                    🕒 <strong>Inizio:</strong> ${data.matchTime} |
                                    ⏰ <strong>Ritrovo:</strong> ${data.gatheringTime}
                                </p>
                                <p class="text-gray-600">📍 <strong>Campo:</strong> ${data.location}</p>
                                <p class="text-gray-500 pt-1">👥 <strong>Convocati (${data.players ? data.players.length : 0}):</strong> ${playersList}</p>
                            </div>
                            <div class="flex flex-col space-y-1">
                                <button data-id="${data.id}" class="btn-share-callup-wa bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] transition">📲 WhatsApp</button>
                                <button data-id="${data.id}" class="btn-print-callup bg-black hover:bg-gray-800 text-white font-bold px-2 py-1 rounded text-[10px] transition">🖨️ Stampa</button>
                                <button data-id="${data.id}" class="btn-delete-callup bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] transition">🗑️ Elimina</button>
                            </div>
                        </div>
                    `;
                });

                container.querySelectorAll('.btn-share-callup-wa').forEach(b => {
                    b.addEventListener('click', (e) => shareCallupWhatsApp(e.target.getAttribute('data-id')));
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
            const sortedPlayers = [...(callup.players || [])].sort((a, b) => a.localeCompare(b));
            let text = `📢 *CONVOCAZIONE GARA UFFICIALE*\n⚽ *Spes Montesacro vs ${callup.opponent}*\n\n📅 *Giorno:* ${formatDateIT(callup.date)}\n🕒 *Inizio Partita:* ${callup.matchTime}\n⏰ *Ora Ritrovo:* ${callup.gatheringTime}\n📍 *Luogo:* ${callup.location}\n\n👥 *ELENCO CONVOCATI (${sortedPlayers.length}):*\n`;
            sortedPlayers.forEach((p, i) => text += `${i + 1}. ${p}\n`);
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
            const sortedPlayers = [...(callup.players || [])].sort((a, b) => a.localeCompare(b));

            let rows = '';
            sortedPlayers.forEach((p, index) => {
                rows += `<tr><td class="border border-black p-2 text-center font-bold" style="width: 40px;">${index + 1}</td><td class="border border-black p-2 font-bold text-sm">${p}</td><td class="border border-black p-2"></td></tr>`;
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
            if (!confirm("Eliminare questa convocazione?")) return;
            try {
                await deleteDoc(doc(db, 'callups', callupId));
                alert("Convocazione eliminata!");
                loadCallups();
            } catch (err) { alert("Errore: " + err.message); }
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
                if (editingPlayerId) {
                    await updateDoc(doc(db, 'players', editingPlayerId), playerData);
                    alert("Giocatore aggiornato con successo!");
                } else {
                    playerData.createdAt = serverTimestamp();
                    await addDoc(collection(db, 'players'), playerData);
                    alert("Nuovo giocatore aggiunto con successo!");
                }

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


			// 1. Variabile per i dati dei tornei
			let tournamentMatches = JSON.parse(localStorage.getItem('tournamentMatches')) || [];
			
			// MODALE E GESTIONE TORNEI
			const btnOpenModalTournament = document.getElementById('btn-open-modal-tournament');
			const modalTournament = document.getElementById('modal-tournament');
			
			if (btnOpenModalTournament && modalTournament) {
			    btnOpenModalTournament.addEventListener('click', () => {
			        // Controlla se è stata selezionata una squadra (come fai per i giocatori)
			        if (typeof activeTeamId !== 'undefined' && !activeTeamId) {
			            alert('Seleziona prima una squadra!');
			            return;
			        }
			        
			        // Mostra la modale rimuovendo la classe hidden
			        modalTournament.classList.remove('hidden');
			    });
			}
			
			// 3. Salvataggio Partita
			document.getElementById('form-tournament').addEventListener('submit', function(e) {
		    e.preventDefault();
		    
		    // Recuperiamo il nome della squadra basandoci sull'ID attivo
		    // (Assumendo che tu abbia un array o oggetto globale che contiene i dati delle squadre)
		    // Se non hai un array globale, puoi usare l'ID direttamente nel campo 'team'
		    const teamName = typeof teams !== 'undefined' && teams.find(t => t.id === activeTeamId) 
		                     ? teams.find(t => t.id === activeTeamId).name 
		                     : "Squadra " + activeTeamId;
		
		    const newMatch = {
		        id: Date.now(),
		        teamId: activeTeamId,        // Usiamo l'ID che esiste nel tuo sistema
		        team: activeTeamId,             // Salviamo il nome ricavato
		        tournament: document.getElementById('tour-name').value,
		        match: document.getElementById('tour-match').value,
		        date: document.getElementById('tour-date').value,
		        time: document.getElementById('tour-time').value,
		        location: document.getElementById('tour-location').value,
		        played: false,
		        result: ""
		    };
		    
		    tournamentMatches.push(newMatch);
		    localStorage.setItem('tournamentMatches', JSON.stringify(tournamentMatches));
		    
		    renderTournaments();
		    closeTournamentModal();
		    this.reset();
		});
					
			// 4. Renderizzazione dinamica delle card
			function renderTournaments() {
			    const container = document.getElementById('tournament-grid');
			    const teamSpan = document.getElementById('display-active-team-tour');
			    
			    // Se hai una funzione o variabile per ricavare il nome da mostrare a video, usalo, altrimenti mostra l'ID
			    const currentId = typeof activeTeamId !== 'undefined' ? activeTeamId : '';
			    
			    if(teamSpan) teamSpan.innerText = currentId;
			    
			    container.innerHTML = '';
			    
			    // Filtra le partite usando l'ID della squadra attiva
			    const filtered = tournamentMatches.filter(m => m.teamId === currentId);
			    
			    if (filtered.length === 0) {
			        container.innerHTML = `<p class="text-center text-xs text-slate-400 py-10 w-full col-span-2">Nessuna partita in programma per questo gruppo.</p>`;
			        return;
			    }
			
			    filtered.forEach(m => {
			        container.innerHTML += `
			            <div class="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
			                <div class="flex justify-between items-center">
			                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${m.tournament}</span>
			                    <span class="text-[9px] font-bold ${m.played ? 'text-emerald-600' : 'text-amber-600'}">
			                        ${m.played ? '● GIOCATA' : '● DA GIOCARE'}
			                    </span>
			                </div>
			                <h4 class="font-bold text-slate-800 text-sm">${m.match}</h4>
			                <p class="text-[11px] font-semibold text-slate-500">📍 ${m.location} | 📅 ${m.date} - ${m.time}</p>
			                
			                ${!m.played ? 
			                    `<button onclick="setResult(${m.id})" class="mt-2 w-full bg-slate-900 text-white font-bold text-[10px] py-2 rounded-xl transition active:scale-95">Inserisci Risultato</button>` 
			                    : `<p class="mt-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 py-2 rounded-lg">Risultato: ${m.result}</p>`
			                }
			            </div>
			        `;
			    });
			}			
			
			// 5. Funzione semplificata per segnare il risultato
			function setResult(id) {
			    const res = prompt("Inserisci il risultato (es. 3-1):");
			    if (res) {
			        const match = tournamentMatches.find(m => m.id === id);
			        match.played = true;
			        match.result = res;
			        localStorage.setItem('tournamentMatches', JSON.stringify(tournamentMatches));
			        renderTournaments();
			    }
			}
			



        // GESTIONE CAMBIO TAB CLICK
        document.getElementById('btn-tab-roster').addEventListener('click', () => switchTab('tab-roster'));
        document.getElementById('btn-tab-attendance').addEventListener('click', () => switchTab('tab-attendance'));
        document.getElementById('btn-tab-monthly').addEventListener('click', () => switchTab('tab-monthly'));
        document.getElementById('btn-tab-callup').addEventListener('click', () => switchTab('tab-callup'));
        document.getElementById('btn-tab-staff').addEventListener('click', () => switchTab('tab-staff'));
		document.getElementById('btn-tab-tournaments').addEventListener('click', () => switchTab('tab-tournaments'));


	if ('serviceWorker' in navigator) {
  		window.addEventListener('load', () => {
    		navigator.serviceWorker.register('/sw.js')
      		.then((reg) => console.log('Service Worker registrato con successo'))
      		.catch((err) => console.log('Registrazione fallita', err));
  		});
	}

