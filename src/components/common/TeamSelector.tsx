import React from 'react';
import { UserProfile } from '../../types';
import { TEAM_GROUPS } from '../../config/constants';
import { UserPlus } from 'lucide-react';

interface TeamSelectorProps {
  userProfile: UserProfile;
  activeTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onOpenAddPlayer: () => void;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  userProfile,
  activeTeamId,
  onSelectTeam,
  onOpenAddPlayer
}) => {
  const isAdmin = userProfile.role === 'admin';
  const coachTeams = userProfile.teams || [];

  return (
    <div
      id="admin-team-selector"
      className="bg-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200 print:hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
          Seleziona Categoria / Gruppo:
        </label>
        <div className="relative flex-1">
          <select
            id="admin-team-filter"
            value={activeTeamId}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer"
          >
            {isAdmin ? (
              <>
                <option value="ALL">-- Seleziona un gruppo... --</option>
                {TEAM_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            ) : (
              <>
                {coachTeams.length === 0 ? (
                  <option value="NONE">Nessuna squadra assegnata</option>
                ) : (
                  <>
                    <option value="SELECT_TEAM" disabled>
                      -- Seleziona la tua Squadra --
                    </option>
                    {coachTeams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </>
                )}
              </>
            )}
          </select>
        </div>
      </div>

      <button
        id="btn-open-add-player"
        onClick={onOpenAddPlayer}
        className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-5 py-3 rounded-xl font-bold tracking-wide uppercase transition shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <UserPlus className="w-4 h-4" />
        <span>Aggiungi Giocatore</span>
      </button>
    </div>
  );
};
