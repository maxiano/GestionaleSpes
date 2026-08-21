import { db } from '../firebase-init.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const auth = getAuth();

export class AuthService {
    static async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Recupera i dati aggiuntivi dalla collezione 'users' di Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                return { uid: user.uid, email: user.email, ...userDocSnap.data() };
            } else {
                // Profilo di fallback se non esiste il documento su Firestore
                return { uid: user.uid, email: user.email, role: 'coach', teams: [] };
            }
        } catch (error) {
            console.error("Errore durante il login:", error.message);
            throw error;
        }
    }

    static async logout() {
        await signOut(auth);
    }

    static initAuthStateListener(onUserLoggedIn, onUserLoggedOut) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const userData = userDocSnap.exists() ? { uid: user.uid, ...userDocSnap.data() } : { uid: user.uid, role: 'coach' };
                onUserLoggedIn(userData);
            } else {
                onUserLoggedOut();
            }
        });
    }
}
