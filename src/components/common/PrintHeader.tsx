import React from 'react';
import { ClubLogo } from './ClubLogo';

interface PrintHeaderProps {
  teamId?: string;
  documentTitle?: string;
  seasonYear?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  teamId = '--',
  documentTitle = 'Documento Ufficiale - Report Tecnico',
  seasonYear = 'Stagione Sportiva 2026/2027'
}) => {
  return (
    <div id="generic-print-header" className="hidden print:block p-4 border-b-4 border-slate-900 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 border-2 border-slate-900 rounded-2xl flex items-center justify-center p-1.5 bg-white shrink-0 overflow-hidden">
            <ClubLogo className="w-full h-full object-contain text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              Spes Montesacro
            </h1>
            <p id="print-report-team" className="text-xs font-bold text-slate-700">
              Squadra / Categoria: {teamId}
            </p>
            <p id="print-report-period" className="text-[11px] text-slate-500 font-medium">
              {documentTitle}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="font-bold text-slate-900">Spes Montesacro</p>
          <p id="print-season-year">{seasonYear}</p>
        </div>
      </div>
    </div>
  );
};
