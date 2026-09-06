export const firebaseConfig = {
  apiKey: "AIzaSyBv0g2gejMRNsD4INV80ODkYS2QPyCLj30",
  authDomain: "gestione-scuola-calcio-43987.firebaseapp.com",
  projectId: "gestione-scuola-calcio-43987",
  storageBucket: "gestione-scuola-calcio-43987.firebasestorage.app",
  messagingSenderId: "625497921694",
  appId: "1:625497921694:web:0e883838e8108a6ced438f",
  measurementId: "G-N1FSZNKS7N"
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
    category: "2015 (Pulcini)",
    teams: ["2015 - Gruppo Nero", "2015 - Gruppo Verde"]
  },
  {
    category: "2016 (Pulcini)",
    teams: ["2016 - Gruppo Nero", "2016 - Gruppo Verde", "2016 - Gruppo Giallo"]
  },
  {
    category: "2017 (Primi Calci)",
    teams: ["2017 - Gruppo Nero", "2017 - Gruppo Verde", "2017 - Gruppo Giallo"]
  },
  {
    category: "2018 (Primi Calci)",
    teams: ["2018 - Gruppo Nero", "2018 - Gruppo Verde", "2018 - Gruppo Giallo"]
  },
  {
    category: "2019 (Piccoli Amici)",
    teams: ["2019 - Gruppo Nero", "2019 - Gruppo Verde", "2019 - Gruppo Giallo"]
  },
  {
    category: "2020-2021 (Piccoli Amici)",
    teams: ["2020-21 - Gruppo Nero", "2020-21 - Gruppo Verde"]
  }
];

export const ALL_TEAMS_FLAT = TEAM_GROUPS.flatMap(g => g.teams);
