import { Callup, Player } from '../types';
import { formatDateIT, isPlayerGoalkeeper } from './formatters';

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

/**
 * Draws the official match kit jersey:
 * - Outfield players: White jersey with green trim, Spes Montesacro shield on left chest, Mizuno mark on right chest
 * - Goalkeepers: Yellow jersey with dark trim, Spes Montesacro shield on left chest, Mizuno mark on right chest
 */
function drawJerseyCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isGoalkeeper: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 100;
  ctx.scale(scale, scale);

  const mainColor = isGoalkeeper ? '#FACC15' : '#FFFFFF';
  const strokeColor = isGoalkeeper ? '#CA8A04' : '#94A3B8';
  const trimColor = isGoalkeeper ? '#0F172A' : '#047857';
  const textColor = isGoalkeeper ? '#0F172A' : '#047857';

  // Jersey subtle shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.moveTo(37, 13);
  ctx.lineTo(87, 25);
  ctx.lineTo(99, 45);
  ctx.lineTo(83, 55);
  ctx.lineTo(77, 45);
  ctx.lineTo(77, 93);
  ctx.quadraticCurveTo(51, 96, 25, 93);
  ctx.lineTo(25, 45);
  ctx.lineTo(19, 55);
  ctx.lineTo(3, 45);
  ctx.lineTo(15, 25);
  ctx.lineTo(63, 13);
  ctx.closePath();
  ctx.fill();

  // Main Jersey Body
  ctx.beginPath();
  ctx.moveTo(38, 12);
  ctx.lineTo(84, 23);
  ctx.lineTo(96, 42);
  ctx.lineTo(81, 52);
  ctx.lineTo(75, 42);
  ctx.lineTo(75, 90);
  ctx.quadraticCurveTo(50, 93, 25, 90);
  ctx.lineTo(25, 42);
  ctx.lineTo(19, 52);
  ctx.lineTo(4, 42);
  ctx.lineTo(16, 23);
  ctx.lineTo(62, 12);
  ctx.closePath();

  ctx.fillStyle = mainColor;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  // Bottom Hem Trim
  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.moveTo(25, 87);
  ctx.quadraticCurveTo(50, 90, 75, 87);
  ctx.lineTo(75, 90);
  ctx.quadraticCurveTo(50, 93, 25, 90);
  ctx.closePath();
  ctx.fill();

  // Sleeve Cuffs Trim
  ctx.beginPath();
  ctx.moveTo(4, 42);
  ctx.lineTo(19, 52);
  ctx.lineTo(17, 54);
  ctx.lineTo(2, 44);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(96, 42);
  ctx.lineTo(81, 52);
  ctx.lineTo(83, 54);
  ctx.lineTo(98, 44);
  ctx.closePath();
  ctx.fill();

  // Collar V-Neck
  ctx.beginPath();
  ctx.moveTo(38, 12);
  ctx.quadraticCurveTo(50, 25, 62, 12);
  ctx.lineTo(57, 12);
  ctx.quadraticCurveTo(50, 20, 43, 12);
  ctx.closePath();
  ctx.fill();

  // LEFT CHEST: Spes Montesacro Official Club Shield
  ctx.fillStyle = isGoalkeeper ? '#064E3B' : '#047857';
  ctx.beginPath();
  ctx.moveTo(28, 30);
  ctx.quadraticCurveTo(36, 29, 44, 30);
  ctx.quadraticCurveTo(44, 44, 36, 50);
  ctx.quadraticCurveTo(28, 44, 28, 30);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#F59E0B';
  ctx.stroke();

  // Monogram letter 'S' for Spes
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('S', 36, 43);

  // RIGHT CHEST: Mizuno Logo & Brand
  ctx.fillStyle = isGoalkeeper ? '#0F172A' : '#047857';
  // Mizuno Runbird
  ctx.beginPath();
  ctx.moveTo(56, 36);
  ctx.quadraticCurveTo(62, 31, 68, 33);
  ctx.quadraticCurveTo(63, 37, 59, 39);
  ctx.closePath();
  ctx.fill();

  // Mizuno Text Brand
  ctx.font = '900 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MIZUNO', 64, 47);

  // Center subtle "SPES" club text
  ctx.fillStyle = textColor;
  ctx.font = '900 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPES', 50, 68);

  ctx.restore();
}

export function generateCallupGraphicCanvas(
  callup: Callup,
  teamId?: string,
  rosterPlayers?: Player[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossibile inizializzare il contesto Canvas');

  // Normalize convocati with roles
  const playerList = (callup.players || []).map((p) => {
    let id = '';
    let name = 'Atleta';
    let role = '';
    if (typeof p === 'string' && p.includes('|')) {
      const parts = p.split('|');
      id = parts[0];
      name = parts[1];
      role = parts[2] || '';
    } else if (typeof p === 'string') {
      name = p;
    } else {
      id = (p as any)?.id || (p as any)?.playerId || '';
      name = (p as any)?.name || 'Atleta';
      role = (p as any)?.role || '';
    }

    if (!role && id && rosterPlayers) {
      const found = rosterPlayers.find((pl) => pl.id === id);
      if (found?.role) role = found.role;
    }

    const isGoalkeeper = isPlayerGoalkeeper(role, name);

    return { id, name, role, isGoalkeeper };
  });

  const width = 1200;
  // Calculate dynamic height based on player count
  const playersRows = Math.ceil(playerList.length / 2);
  const playersSectionHeight = Math.max(180, playersRows * 60 + 60);
  const height = 1000 + playersSectionHeight;

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
  ctx.fillText(`👥 GIOCATORI CONVOCATI (${playerList.length})`, cardX, curY + 24);
  ctx.restore();

  curY += 40;

  // Draw Players in 2 Columns with official jerseys
  const playerItemH = 52;
  const pColW = (gridW - 16) / 2;

  playerList.forEach((player, pIdx) => {
    const pCol = pIdx % 2;
    const pRow = Math.floor(pIdx / 2);
    const px = cardX + pCol * (pColW + 16);
    const py = curY + pRow * (playerItemH + 8);

    ctx.save();
    // Card background: warm yellow tint for goalkeeper, crisp clean for outfield
    if (player.isGoalkeeper) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    }
    ctx.lineWidth = 1.2;
    roundRect(ctx, px, py, pColW, playerItemH, 12);
    ctx.fill();
    ctx.stroke();

    // Number Badge (Left)
    ctx.fillStyle = player.isGoalkeeper ? '#F59E0B' : '#10B981';
    roundRect(ctx, px + 8, py + 8, 30, playerItemH - 16, 7);
    ctx.fill();

    ctx.fillStyle = player.isGoalkeeper ? '#78350F' : '#064E3B';
    ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(pIdx + 1), px + 23, py + 32);

    // DRAW JERSEY NEXT TO NUMBER & NAME:
    // Outfield: White jersey with Spes Montesacro logo and Mizuno brand
    // Goalkeeper: Yellow jersey with Spes Montesacro logo and Mizuno brand
    drawJerseyCanvas(ctx, px + 44, py + 8, 36, player.isGoalkeeper);

    // Player Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let displayPlayerName = player.name;
    const maxTextW = pColW - (player.isGoalkeeper ? 190 : 98);
    while (ctx.measureText(displayPlayerName).width > maxTextW && displayPlayerName.length > 4) {
      displayPlayerName = displayPlayerName.slice(0, -4) + '...';
    }
    ctx.fillText(displayPlayerName, px + 88, py + 33);

    // If Goalkeeper: Add yellow badge "[PORTIERE]"
    if (player.isGoalkeeper) {
      const badgeW = 90;
      const badgeX = px + pColW - badgeW - 10;
      ctx.fillStyle = '#FACC15';
      roundRect(ctx, badgeX, py + 12, badgeW, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PORTIERE', badgeX + badgeW / 2, py + 31);
    }

    ctx.restore();
  });

  curY += playersRows * (playerItemH + 8) + 24;

  // 6. Mandatory Advisory & Rules Box
  const alertBoxH = 160;
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
  ctx.fillText('⚠️  DIVISE UFFICIALI E DISPOSIZIONI OBBLIGATORIE GARA:', cardX + 24, curY + 34);

  // Bullet items
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• Divisa Giocatori: Maglia BIANCA (Mizuno / Spes). Portieri: Maglia GIALLA (Mizuno / Spes).', cardX + 24, curY + 64);
  ctx.fillText('• Venire al campo in tuta di rappresentanza e parastinchi obbligatori.', cardX + 24, curY + 92);
  ctx.fillText('• Non venire con gli scarpini già indossati (calzarli nello spogliatoio).', cardX + 24, curY + 120);
  ctx.fillText('• Avvisare sempre tempestivamente prima di eventuali assenze o ritardi.', cardX + 24, curY + 146);
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
  teamId?: string,
  rosterPlayers?: Player[]
): Promise<Blob> {
  const canvas = generateCallupGraphicCanvas(callup, teamId, rosterPlayers);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Generazione immagine fallita'));
    }, 'image/png');
  });
}
