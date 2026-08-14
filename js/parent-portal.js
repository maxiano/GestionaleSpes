// Gestione Intestazione e Selettore Figli
const nameEl = document.getElementById('parent-child-name');
if (nameEl) {
    if (childIds.length > 1) {
        let selectHtml = `<select id="parent-child-switcher" class="bg-slate-800 text-emerald-400 font-extrabold text-sm md:text-lg border border-slate-700 rounded-lg p-1 w-full focus:outline-none focus:border-emerald-500 cursor-pointer">`;
        
        // Variabile per raccogliere il messaggio di avviso
        let alertMessage = ""; 

        childIds.forEach(id => {
            const cData = childrenDataMap[id] || {};
            const cName = `${cData.lastName || ''} ${cData.firstName || ''}`.trim() || `Figlio ${id}`;
            
            const pendingMatches = matchesList.filter(m => {
                const cTeam = cData.teamId || cData.team || cData.squadra || userProfile?.teamId || '';
                const isExplicit = m.invitedPlayers.some(p => typeof p === 'string' && (p === id || p.startsWith(`${id}|`)));
                const isTeam = m.callupTeamId && cTeam && String(m.callupTeamId).toLowerCase() === String(cTeam).toLowerCase();
                const isResponded = m.responses?.[id] !== undefined;
                return (isExplicit || isTeam || !m.callupTeamId) && !isResponded;
            });

            const hasPending = pendingMatches.length > 0;
            const indicator = hasPending ? ' ⚠️' : ' ✅';
            
            // Se questo è il figlio attivo e ha notifiche, prepariamo il messaggio di avviso
            if (id === activeChildId && hasPending) {
                alertMessage = `<div class="text-[10px] text-amber-500 font-bold mt-1 text-center animate-pulse">⚠️ Attenzione: ${pendingMatches.length} convocazione/i da confermare</div>`;
            }

            const selectedAttr = (id === activeChildId) ? 'selected' : '';
            selectHtml += `<option value="${id}" ${selectedAttr}>${cName}${indicator}</option>`;
        });
        
        selectHtml += `</select>`;
        
        // INSERIAMO IL SELETTORE + L'AVVISO SOTTO
        nameEl.innerHTML = selectHtml + alertMessage;

        // Event listener per il cambio figlio
        const switcher = document.getElementById('parent-child-switcher');
        if (switcher) {
            switcher.onchange = (e) => {
                activeChildId = e.target.value;
                loadChildData(currentUserProfile); 
            };
        }
    } else {
        nameEl.innerText = activeDisplayName;
    }
}
