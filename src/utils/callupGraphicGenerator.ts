import { Callup } from '../types';
import { formatDateIT } from './formatters';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function generateCallupGraphicCanvas(
  callup: Callup,
  teamId?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossibile inizializzare il contesto Canvas');

  // Normalize players
  const playerNames = (callup.players || []).map((p) => {
    if (typeof p === 'string' && p.includes('|')) return p.split('|')[1];
    if (typeof p === 'string') return p;
    return (p as any)?.name || 'Atleta';
  });

  const width = 1200;
  // Calculate dynamic height based on player count
  const playersRows = Math.ceil(playerNames.length / 2);
  const playersSectionHeight = Math.max(160, playersRows * 56 + 60);
  const height = 980 + playersSectionHeight;

  canvas.width = width;
  canvas.height = height;

  // 1. Background gradient (Rich Club Green to Dark Slate)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#013817');
  bgGrad.addColorStop(0.4, '#012810');
  bgGrad.addColorStop(1, '#06120a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative subtle circle pattern in background
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(width / 2, 200, i * 140, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Outer border with gold/white shine
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 8;
  roundRect(ctx, 20, 20, width - 40, height - 40, 36);
  ctx.stroke();

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 32, 32, width - 64, height - 64, 28);
  ctx.stroke();

  let curY = 65;

  // 2. Header: Club Name & Title
  ctx.fillStyle = '#F59E0B'; // Gold
  ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPES MONTESACRO', width / 2, curY);

  curY += 50;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('CONVOCAZIONE UFFICIALE', width / 2, curY);

  curY += 45;
  // Category Pill & Match Type Pill
  const categoryText = (teamId || callup.teamId || 'SPES MONTESACRO').toUpperCase();
  let matchTypeLabel = 'GARA UFFICIALE';
  let matchTypeColor = '#10B981'; // Emerald

  if (callup.matchType === 'Torneo') {
    matchTypeLabel = callup.tournamentName
      ? `🏆 TORNEO: ${callup.tournamentName.toUpperCase()}`
      : '🏆 TORNEO';
    matchTypeColor = '#F59E0B'; // Gold
  } else if (callup.matchType === 'Amichevole') {
    matchTypeLabel = '⚽ GARA AMICHEVOLE';
    matchTypeColor = '#38BDF8'; // Sky blue
  } else if (callup.matchType === 'Campionato') {
    matchTypeLabel = '🏆 GARA DI CAMPIONATO';
    matchTypeColor = '#34D399'; // Emerald
  }

  // Draw Pills centered
  ctx.save();
  // Category Pill
  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const catWidth = ctx.measureText(categoryText).width + 36;
  const typeWidth = ctx.measureText(matchTypeLabel).width + 36;
  const totalPillsWidth = catWidth + typeWidth + 16;
  let startPillX = (width - totalPillsWidth) / 2;

  // Cat pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, startPillX, curY, catWidth, 38, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(categoryText, startPillX + 18, curY + 26);

  // Type pill
  const typePillX = startPillX + catWidth + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.strokeStyle = matchTypeColor;
  ctx.lineWidth = 2;
  roundRect(ctx, typePillX, curY, typeWidth, 38, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = matchTypeColor;
  ctx.fillText(matchTypeLabel, typePillX + 18, curY + 26);
  ctx.restore();

  curY += 75;

  // 3. Match Card: Spes Montesacro vs Opponent
  const cardX = 60;
  const cardW = width - 120;
  const cardH = 135;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, curY, cardW, cardH, 24);
  ctx.fill();
  ctx.stroke();

  // Match title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#A7F3D0'; // light emerald
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PARTITA IN PROGRAMMA', width / 2, curY + 36);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const opponentName = (callup.opponent || 'Avversario').trim();
  ctx.fillText(`SPES MONTESACRO   vs   ${opponentName.toUpperCase()}`, width / 2, curY + 86);
  ctx.restore();

  curY += cardH + 25;

  // 4. Details Grid: 2 columns / 4 info cards
  const gridW = width - 120;
  const colW = (gridW - 20) / 2;
  const itemH = 68;

  const infoList = [
    { label: '📅 DATA PARTITA', value: formatDateIT(callup.date) },
    { label: '🕒 INIZIO GARA', value: callup.matchTime || '-' },
    { label: '⏰ RITROVO AL CAMPO', value: callup.gatheringTime || '-' },
    { label: '📍 CAMPO / LUOGO', value: callup.location || '-' },
  ];

  if (callup.coachName) {
    infoList.push({ label: '👔 MISTER / RESPONSABILE', value: callup.coachName });
  }

  // Draw info items
  infoList.forEach((item, idx) => {
    let ix: number;
    let iy: number;
    let currentItemW: number;

    if (idx < 4) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      ix = cardX + col * (colW + 20);
      iy = curY + row * (itemH + 14);
      currentItemW = colW;
    } else {
      // 5th element (Coach) full width
      ix = cardX;
      iy = curY + 2 * (itemH + 14);
      currentItemW = gridW;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, ix, iy, currentItemW, itemH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.label, ix + 18, iy + 25);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    // Truncate if too long
    let valText = item.value;
    while (ctx.measureText(valText).width > currentItemW - 36 && valText.length > 5) {
      valText = valText.slice(0, -4) + '...';
    }
    ctx.fillText(valText, ix + 18, iy + 52);
    ctx.restore();
  });

  const gridRows = infoList.length > 4 ? 3 : 2;
  curY += gridRows * (itemH + 14) + 20;

  // 5. Roster Section (Giocatori Convocati)
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`👥 GIOCATORI CONVOCATI (${playerNames.length})`, cardX, curY + 24);
  ctx.restore();

  curY += 40;

  // Draw Players in 2 Columns
  const playerItemH = 46;
  const pColW = (gridW - 16) / 2;

  playerNames.forEach((pName, pIdx) => {
    const pCol = pIdx % 2;
    const pRow = Math.floor(pIdx / 2);
    const px = cardX + pCol * (pColW + 16);
    const py = curY + pRow * (playerItemH + 8);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, px, py, pColW, playerItemH, 12);
    ctx.fill();
    ctx.stroke();

    // Number Badge
    ctx.fillStyle = '#10B981';
    roundRect(ctx, px + 8, py + 8, 36, playerItemH - 16, 8);
    ctx.fill();

    ctx.fillStyle = '#064E3B';
    ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(pIdx + 1), px + 26, py + 28);

    // Player Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let displayPlayerName = pName;
    while (ctx.measureText(displayPlayerName).width > pColW - 65 && displayPlayerName.length > 4) {
      displayPlayerName = displayPlayerName.slice(0, -4) + '...';
    }
    ctx.fillText(displayPlayerName, px + 54, py + 29);
    ctx.restore();
  });

  curY += playersRows * (playerItemH + 8) + 24;

  // 6. Mandatory Advisory & Rules Box
  const alertBoxH = 150;
  ctx.save();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)'; // amber tint
  ctx.strokeStyle = '#F59E0B'; // Gold border
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, curY, cardW, alertBoxH, 20);
  ctx.fill();
  ctx.stroke();

  // Alert Box Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FBBF24';
  ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⚠️  DISPOSIZIONI E REGOLE OBBLIGATORIE PER LA GARA:', cardX + 24, curY + 34);

  // Bullet items
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• Venire al campo in tuta di rappresentanza e parastinchi obbligatori.', cardX + 24, curY + 66);
  ctx.fillText('• Non venire al campo con gli scarpini già indossati (calzarli solo nello spogliatoio).', cardX + 24, curY + 96);
  ctx.fillText('• Avvisare sempre tempestivamente prima di eventuali assenze o ritardi.', cardX + 24, curY + 126);
  ctx.restore();

  curY += alertBoxH + 30;

  // 7. Footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FORZA SPES MONTESACRO • CUORE, RISPETTO, PASSIONE', width / 2, curY);
  ctx.restore();

  return canvas;
}

export async function createCallupGraphicBlob(
  callup: Callup,
  teamId?: string
): Promise<Blob> {
  const canvas = generateCallupGraphicCanvas(callup, teamId);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Generazione immagine fallita'));
    }, 'image/png');
  });
}
