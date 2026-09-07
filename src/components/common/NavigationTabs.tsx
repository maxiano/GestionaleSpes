import React, { useState } from 'react';
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
  DoorClosed
} from 'lucide-react';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  userRole: UserRole;
  onTabChange: (tab: ActiveTab) => void;
}

interface TabDef {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  userRole,
  onTabChange
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  const tabs: TabDef[] = [
    { id: 'tab-roster', label: 'Rosa Giocatori', icon: <Users className="w-4 h-4 text-emerald-400" /> },
    { id: 'tab-attendance', label: 'Registra Presenze', icon: <CalendarDays className="w-4 h-4 text-emerald-400" /> },
    { id: 'tab-monthly', label: 'Registro Mensile', icon: <BarChart3 className="w-4 h-4 text-blue-400" /> },
    { id: 'tab-callup', label: 'Convocazioni', icon: <Mail className="w-4 h-4 text-purple-400" /> },
    { id: 'tab-tournaments', label: 'Tornei', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'tab-locker-rooms', label: 'Spogliatoi & Campi', icon: <DoorClosed className="w-4 h-4 text-amber-400" />, adminOnly: true },
    { id: 'tab-staff', label: 'Staff / Coach', icon: <ShieldCheck className="w-4 h-4 text-rose-400" />, adminOnly: true },
    { id: 'tab-parents', label: 'Genitori', icon: <UserCheck className="w-4 h-4 text-indigo-400" />, adminOnly: true },
    { id: 'tab-staff-attendance', label: 'Presenze Staff', icon: <ClipboardList className="w-4 h-4 text-teal-400" />, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div id="navigation-container" className="relative print:hidden mb-6">
      {/* Mobile Toggle / Current Active Header */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg p-4 flex items-center justify-between font-bold text-sm border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/30">
              {currentTab.icon}
            </span>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sezione Attiva
              </p>
              <span id="current-active-tab-label" className="text-white tracking-wide">
                {currentTab.label}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-white transition-transform duration-300 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1.5 border border-slate-100 z-50">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
                  setMenuOpen(false);
                }}
                className={`tab-btn w-full py-2.5 px-3.5 text-left rounded-xl font-bold text-xs flex items-center gap-3 transition ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="p-1 rounded-lg bg-slate-100/10">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`btn-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`tab-btn flex-1 min-w-[120px] py-2.5 px-3 text-center rounded-xl font-bold text-xs lg:text-sm transition flex items-center justify-center gap-2 ${
                isActive
                  ? 'text-white bg-slate-900 shadow'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
