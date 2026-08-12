// js/staff.js
import { db, auth } from './firebase-init.js';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { normalizeUserProfile } from './config.js';

export function initStaffManagement(firebaseApiKey, getCurrentUserProfile) {
    const formCreateStaff = document.getElementById('form-create-staff');
    if (formCreateStaff) {
        formCreateStaff.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUserProfile = getCurrentUserProfile();
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
                const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`;
                const response = await fetch(signUpUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, returnSecureToken: true })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error ? data.error.message : "Errore durante la creazione dell'account");
                }

                const newUid = data.localId;
                await setDoc(doc(db, 'users', newUid), {
                    uid: newUid,
                    name,
                    email,
                    role,
                    teamId: selectedTeams.length > 0 ? selectedTeams[0] : '',
                    teams: selectedTeams,
                    createdAt: serverTimestamp()
                });

                alert(`Account ${role.toUpperCase()} creato con successo per ${name}!`);
                formCreateStaff.reset();
                loadStaffList();
            } catch (err) {
                alert("Errore creazione account: " + err.message);
            }
        });
    }
}

export async function loadStaffList() {
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
