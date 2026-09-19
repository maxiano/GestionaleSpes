export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBv0g2gejMRNsD4INV80ODkYS2QPyCLj30",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestione-scuola-calcio-43987.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestione-scuola-calcio-43987",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestione-scuola-calcio-43987.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "625497921694",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:625497921694:web:0e883838e8108a6ced438f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-N1FSZNKS7N"
};

export const DAYS_OF_WEEK_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export const MONTH_NAMES_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export interface TeamGroupOption {
  category: string;
  teams: string[];
}

export const TEAM_GROUPS: TeamGroupOption[] = [
  {
    category: "Settore Portieri",
    teams: ["Portieri - Attività di Base"]
  },
  {
    category: "2014 (Esordienti)",
    teams: ["2014 - Gruppo Nero", "2014 - Gruppo Verde"]
  },
  {
    category: "2015 (Esordienti)",
    teams: ["2015 - Gruppo Nero", "2015 - Gruppo Verde"]
  },
  {
    category: "2016 (Pulcini)",
    teams: ["2016 - Gruppo Nero", "2016 - Gruppo Verde", "2016 - Gruppo Giallo"]
  },
  {
    category: "2017 (Pulcini)",
    teams: ["2017 - Gruppo Nero", "2017 - Gruppo Verde", "2017 - Gruppo Giallo"]
  },
  {
    category: "2018 (Primi Calci)",
    teams: ["2018 - Gruppo Nero", "2018 - Gruppo Verde", "2018 - Gruppo Giallo"]
  },
  {
    category: "2019 (Primi Calci)",
    teams: ["2019 - Gruppo Nero", "2019 - Gruppo Verde", "2019 - Gruppo Giallo"]
  },
  {
    category: "2020-2021 (Piccoli Amici)",
    teams: ["2020-21 - Gruppo Nero", "2020-21 - Gruppo Verde"]
  }
];

export const ALL_TEAMS_FLAT = TEAM_GROUPS.flatMap(g => g.teams);
