// 2. FUNZIONE DI CARICAMENTO DATI (Raccoglie tutte le convocazioni in modo sicuro e persistente)
async function loadChildData(userProfile) {
    const childId = userProfile.childId; 
    if (!childId) return;

    try {
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);
        if (!childDoc.exists()) return;

        const childData = childDoc.data();
        const displayName = `${childData.lastName || ''} ${childData.firstName || ''}`.trim();
        
        // Recupera la squadra del ragazzo da qualsiasi campo possibile
        const childTeamId = childData.teamId || childData.team || childData.squadra || childData.group || '';

        document.getElementById('parent-child-name').innerText = displayName;

        // Cerca tutte le convocazioni
        const callupsRef = collection(db, 'callups');
        const querySnapshot = await getDocs(callupsRef);

        let userCallups = [];

        querySnapshot.forEach((docSnap) => {
            const callup = docSnap.data();
            const callupTeamId = callup.teamId || callup.team || callup.squadra || '';
            const invitedPlayers = callup.players || [];
            const responses = callup.responses || {};
            
            // 1. Il ragazzo è nella lista dei convocati attuale
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && (p === childId || p.startsWith(`${childId}|`)));
            
            // 2. Il genitore ha già risposto in passato (quindi la partita non deve sparire anche se il Mister modifica la lista)
            const hasResponded = responses[childId] !== undefined;
            
            // 3. Corrispondenza di squadra (flessibile)
            const isTeamMatch = callupTeamId && childTeamId && (
                String(callupTeamId).toLowerCase() === String(childTeamId).toLowerCase() ||
                String(childTeamId).includes(String(callupTeamId)) ||
                String(callupTeamId).includes(String(childTeamId))
            );

            // Se BASTA UNA di queste condizioni, la partita viene mostrata al genitore
            if (isExplicitlyInvited || hasResponded || isTeamMatch) {
                userCallups.push({
                    id: docSnap.id,
                    ...callup
                });
            }
        });

        // Ordinamento sicuro delle date
        userCallups.sort((a, b) => {
            const timeA = (a.date && a.date !== 'da definire') ? new Date(a.date).getTime() : 0;
            const timeB = (b.date && b.date !== 'da definire') ? new Date(b.date).getTime() : 0;
            return timeA - timeB;
        });

        renderPortalUI(userCallups, childId, childTeamId || 'Assegnata');
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}
