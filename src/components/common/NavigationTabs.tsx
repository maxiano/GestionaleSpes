import React, { useState, useEffect } from 'react';
import { ActiveTab, UserRole } from '../../types';
import {
  Users,
  CalendarDays,
  BarChart3,
  Mail,
  Trophy,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  ChevronDown,
  DoorClosed,
  LayoutGrid,
  Layers
} from 'lucide-react';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  userRole: UserRole;
  onTabChange: (tab: ActiveTab) => void;
}

interface TabDef {
  id: ActiveTab;
  label: string;
  category: 'team' | 'club';
  icon: (isActive: boolean) => React.ReactNode;
  adminOnly?: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  userRole,
  onTabChange
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'team' | 'club'>('all');
  const isAdmin = userRole === 'admin';

  const tabs: TabDef[] = [
    // Gruppo 1: Attività Squadra (5 voci)
    {
      id: 'tab-roster',
      label: 'Rosa Giocatori',
      category: 'team',
      icon: (active) => (
        <Users className={`w-4 h-4 shrink-0 transition ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />
      )
    },
    {
      id: 'tab-attendance',
      label: 'Registra Presenze',
      category: 'team',
      icon: (active) => (
        <CalendarDays className={`w-4 h-4 shrink-0 transition ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />
      )
    },
    {
      id: 'tab-monthly',
      label: 'Registro Mensile',
      category: 'team',
      icon: (active) => (
        <BarChart3 className={`w-4 h-4 shrink-0 transition ${active ? 'text-blue-300' : 'text-blue-600'}`} />
      )
    },
    {
      id: 'tab-callup',
      label: 'Convocazioni',
      category: 'team',
      icon: (active) => (
        <Mail className={`w-4 h-4 shrink-0 transition ${active ? 'text-purple-300' : 'text-purple-600'}`} />
      )
    },
    {
      id: 'tab-tournaments',
      label: 'Tornei',
      category: 'team',
      icon: (active) => (
        <Trophy className={`w-4 h-4 shrink-0 transition ${active ? 'text-amber-300' : 'text-amber-600'}`} />
      )
    },

    // Gruppo 2: Strutture & Club (5 voci - solo Admin)
    {
      id: 'tab-field-diagram',
      label: 'Schema Campi',
      category: 'club',
      adminOnly: true,
      icon: (active) => (
        <LayoutGrid className={`w-4 h-4 shrink-0 transition ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />
      )
    },
    {
      id: 'tab-locker-rooms',
      label: 'Spogliatoi & Campi',
      category: 'club',
      adminOnly: true,
      icon: (active) => (
        <DoorClosed className={`w-4 h-4 shrink-0 transition ${active ? 'text-amber-300' : 'text-amber-600'}`} />
      )
    },
    {
      id: 'tab-staff',
      label: 'Staff / Coach',
      category: 'club',
      adminOnly: true,
      icon: (active) => (
        <ShieldCheck className={`w-4 h-4 shrink-0 transition ${active ? 'text-rose-300' : 'text-rose-600'}`} />
      )
    },
    {
      id: 'tab-staff-attendance',
      label: 'Presenze Staff',
      category: 'club',
      adminOnly: true,
      icon: (active) => (
        <ClipboardList className={`w-4 h-4 shrink-0 transition ${active ? 'text-teal-300' : 'text-teal-600'}`} />
      )
    },
    {
      id: 'tab-parents',
      label: 'Genitori',
      category: 'club',
      adminOnly: true,
      icon: (active) => (
        <UserCheck className={`w-4 h-4 shrink-0 transition ${active ? 'text-indigo-300' : 'text-indigo-600'}`} />
      )
    }
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const teamTabs = visibleTabs.filter((t) => t.category === 'team');
  const clubTabs = visibleTabs.filter((t) => t.category === 'club');
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Assicura che la categoria visualizzata includa la scheda attiva quando l'admin cambia tab
  useEffect(() => {
    if (!isAdmin) return;
    const current = tabs.find((t) => t.id === activeTab);
    if (!current) return;

    if (selectedCategory === 'team' && current.category === 'club') {
      setSelectedCategory('all');
    } else if (selectedCategory === 'club' && current.category === 'team') {
      setSelectedCategory('all');
    }
  }, [activeTab, isAdmin]);

  const renderTabButton = (tab: TabDef) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        id={`btn-${tab.id}`}
        type="button"
        onClick={() => onTabChange(tab.id)}
        title={tab.label}
        className={`tab-btn w-full min-w-0 py-2.5 px-3 rounded-xl font-bold text-xs lg:text-sm transition-all duration-200 flex items-center justify-center gap-2 text-center border cursor-pointer ${
          isActive
            ? 'bg-slate-900 text-white shadow-md border-slate-900 ring-2 ring-slate-900/10'
            : 'bg-slate-50/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 border-slate-200/80 shadow-2xs'
        }`}
      >
        <span className="shrink-0">{tab.icon(isActive)}</span>
        <span className="truncate">{tab.label}</span>
      </button>
    );
  };

  return (
    <div id="navigation-container" className="relative print:hidden mb-6">
      {/* Mobile Toggle / Current Active Header */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg p-4 flex items-center justify-between font-bold text-sm border border-slate-700/50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/30 shrink-0">
              {currentTab.icon(true)}
            </span>
            <div className="text-left min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sezione Attiva
              </p>
              <span id="current-active-tab-label" className="text-white tracking-wide truncate block">
                {currentTab.label}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-white transition-transform duration-300 shrink-0 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-2xl p-3 flex flex-col gap-2 border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Sezione Squadra */}
            <div className="px-2 py-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Attività Squadra
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {teamTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.id);
                      setMenuOpen(false);
                    }}
                    className={`tab-btn w-full py-2.5 px-3.5 text-left rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="p-1 rounded-lg bg-slate-100/10 shrink-0">{tab.icon(isActive)}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sezione Club (se Admin) */}
            {isAdmin && clubTabs.length > 0 && (
              <>
                <div className="h-px bg-slate-100 my-1"></div>
                <div className="px-2 py-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Gestione Club & Strutture
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {clubTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          onTabChange(tab.id);
                          setMenuOpen(false);
                        }}
                        className={`tab-btn w-full py-2.5 px-3.5 text-left rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="p-1 rounded-lg bg-slate-100/10 shrink-0">{tab.icon(isActive)}</span>
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Desktop Tabs - Layout Organizzato per Categoria a Griglia Senza Sovrapposizioni */}
      <div className="hidden md:flex flex-col bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200 gap-3">
        {/* Intestazione e Filtro Categorie (visibile agli Admin) */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Sezione Corrente:
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200/80 flex items-center gap-1.5 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentTab.category === 'team' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span>{currentTab.label}</span>
              </span>
            </div>

            {/* Pulsanti Filtro Vista */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Tutte le sezioni (10)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('team')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'team'
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Attività Squadra (5)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('club')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'club'
                    ? 'bg-white text-amber-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-white/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Strutture &amp; Club (5)</span>
              </button>
            </div>
          </div>
        )}

        {/* Riga 1: Attività Squadra (5 colonne bilanciate) */}
        {(selectedCategory === 'all' || selectedCategory === 'team') && (
          <div className="space-y-1.5">
            {isAdmin && selectedCategory === 'all' && (
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Attività Squadra
                </span>
              </div>
            )}
            <div className="grid grid-cols-5 gap-2 w-full">
              {teamTabs.map(renderTabButton)}
            </div>
          </div>
        )}

        {/* Separatore visivo sottile se entrambe le righe sono visibili */}
        {isAdmin && selectedCategory === 'all' && clubTabs.length > 0 && (
          <div className="h-px bg-slate-100 my-0.5"></div>
        )}

        {/* Riga 2: Gestione Club & Strutture (5 colonne bilanciate) */}
        {isAdmin && (selectedCategory === 'all' || selectedCategory === 'club') && clubTabs.length > 0 && (
          <div className="space-y-1.5">
            {selectedCategory === 'all' && (
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                  Gestione Strutture &amp; Club
                </span>
              </div>
            )}
            <div className="grid grid-cols-5 gap-2 w-full">
              {clubTabs.map(renderTabButton)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

