import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DrillPitchType,
  DrillItemType,
  DrillElement,
  DrillLineStyle,
  DrillLine
} from '../../types';
import {
  MousePointer,
  ArrowRight,
  MoveRight,
  RotateCcw,
  Trash2,
  Download,
  Plus,
  Minus,
  Maximize2,
  Circle,
  HelpCircle
} from 'lucide-react';

interface TacticalBoardProps {
  pitchType: DrillPitchType;
  onChangePitchType: (type: DrillPitchType) => void;
  elements: DrillElement[];
  onChangeElements: (elements: DrillElement[]) => void;
  lines: DrillLine[];
  onChangeLines: (lines: DrillLine[]) => void;
  onCaptureSnapshot?: (dataUrl: string) => void;
  readOnly?: boolean;
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  pitchType,
  onChangePitchType,
  elements,
  onChangeElements,
  lines,
  onChangeLines,
  onCaptureSnapshot,
  readOnly = false
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Modalità corrente: 'select' (per spostare o selezionare) o 'line_*' (per tracciare frecce)
  const [activeTool, setActiveTool] = useState<'select' | DrillLineStyle>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stato per tracciamento nuova linea
  const [drawingLine, setDrawingLine] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  // Palette selezione rapida per aggiungere un elemento
  const [selectedPaletteItem, setSelectedPaletteItem] = useState<DrillItemType>('player_blue');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<string>('');

  // Dimensioni standard SVG board
  const VB_WIDTH = 800;
  const VB_HEIGHT = 520;

  // Converti coordinate mouse/touch in % (0-100) relative all'SVG
  const getPointerCoords = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 50, y: 50 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, Math.round(px * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round(py * 10) / 10))
    };
  }, []);

  // Genera snapshot immagine PNG dal canvas SVG
  const generateSnapshot = useCallback(() => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = VB_WIDTH * 1.5;
        canvas.height = VB_HEIGHT * 1.5;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          if (onCaptureSnapshot) {
            onCaptureSnapshot(dataUrl);
          }
        }
        window.URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.warn('Errore generazione snapshot canvas:', err);
    }
  }, [onCaptureSnapshot]);

  // Aggiorna snapshot quando gli elementi cambiano
  useEffect(() => {
    if (readOnly) return;
    const timer = setTimeout(() => {
      generateSnapshot();
    }, 600);
    return () => clearTimeout(timer);
  }, [elements, lines, pitchType, generateSnapshot, readOnly]);

  // Aggiungi elemento al centro o tramite click sul campo
  const handleAddElement = (type: DrillItemType, x = 50, y = 50) => {
    let defaultLabel = '';
    if (type === 'player_blue') {
      const count = elements.filter((e) => e.type === 'player_blue').length + 1;
      defaultLabel = `B${count}`;
    } else if (type === 'player_red') {
      const count = elements.filter((e) => e.type === 'player_red').length + 1;
      defaultLabel = `R${count}`;
    } else if (type === 'player_yellow') {
      defaultLabel = 'J';
    } else if (type === 'player_green') {
      const count = elements.filter((e) => e.type === 'player_green').length + 1;
      defaultLabel = `V${count}`;
    } else if (type === 'player_gk') {
      defaultLabel = 'GK';
    }

    const newElement: DrillElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      x,
      y,
      label: defaultLabel,
      rotation: 0,
      scale: 1.0
    };

    onChangeElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
    setSelectedLineId(null);
  };

  // Inizio puntatore sull'SVG
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const coords = getPointerCoords(e);

    if (activeTool !== 'select') {
      // Inizia a tracciare una freccia tattica
      setDrawingLine({ start: coords, current: coords });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // Se clicchiamo sullo sfondo del campo deseleziona tutto
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'svg' ||
        target.getAttribute('id') === 'field-bg-layer' ||
        target.getAttribute('id') === 'field-turf' ||
        target.getAttribute('id') === 'tactical-elements-layer' ||
        target.getAttribute('id') === 'tactical-lines-layer'
      ) {
        setSelectedElementId(null);
        setSelectedLineId(null);
        setEditingLabelId(null);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const coords = getPointerCoords(e);

    if (drawingLine) {
      setDrawingLine((prev) => (prev ? { ...prev, current: coords } : null));
    } else if (isDragging && selectedElementId) {
      onChangeElements(
        elements.map((el) => {
          if (el.id === selectedElementId) {
            return {
              ...el,
              x: Math.max(4, Math.min(96, coords.x - dragOffset.x)),
              y: Math.max(4, Math.min(96, coords.y - dragOffset.y))
            };
          }
          return el;
        })
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (drawingLine) {
      const dist = Math.hypot(
        drawingLine.current.x - drawingLine.start.x,
        drawingLine.current.y - drawingLine.start.y
      );

      // Aggiungi la linea solo se ha una lunghezza minima di 3%
      if (dist >= 3) {
        const newLine: DrillLine = {
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          style: activeTool as DrillLineStyle,
          points: [drawingLine.start, drawingLine.current]
        };
        onChangeLines([...lines, newLine]);
        setSelectedLineId(newLine.id);
        setSelectedElementId(null);
      }
      setDrawingLine(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Selezione e inizio trascinamento di un elemento
  const handleElementPointerDown = (e: React.PointerEvent, el: DrillElement) => {
    if (readOnly) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;

    setSelectedElementId(el.id);
    setSelectedLineId(null);
    const coords = getPointerCoords(e as any);
    setDragOffset({
      x: coords.x - el.x,
      y: coords.y - el.y
    });
    setIsDragging(true);
  };

  // Selezione di una linea
  const handleLinePointerDown = (e: React.PointerEvent, lineId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;

    setSelectedLineId(lineId);
    setSelectedElementId(null);
    setEditingLabelId(null);
  };

  // Eliminazione elemento o linea selezionata
  const handleDeleteSelected = () => {
    if (selectedElementId) {
      onChangeElements(elements.filter((el) => el.id !== selectedElementId));
      setSelectedElementId(null);
      setEditingLabelId(null);
    } else if (selectedLineId) {
      onChangeLines(lines.filter((l) => l.id !== selectedLineId));
      setSelectedLineId(null);
    }
  };

  // Ridimensionamento elemento selezionato (aumenta o diminuisci dimensioni)
  const handleChangeElementScale = (delta: number) => {
    if (!selectedElementId) return;
    onChangeElements(
      elements.map((el) => {
        if (el.id === selectedElementId) {
          const currentScale = el.scale || 1.0;
          const nextScale = Math.round(Math.max(0.6, Math.min(2.2, currentScale + delta)) * 10) / 10;
          return { ...el, scale: nextScale };
        }
        return el;
      })
    );
  };

  // Annulla ultima linea
  const handleUndoLine = () => {
    if (lines.length === 0) return;
    onChangeLines(lines.slice(0, lines.length - 1));
    if (selectedLineId === lines[lines.length - 1]?.id) {
      setSelectedLineId(null);
    }
  };

  // Pulisci tutte le linee
  const handleClearLines = () => {
    if (lines.length === 0) return;
    if (window.confirm('Vuoi rimuovere tutte le frecce dal campo?')) {
      onChangeLines([]);
      setSelectedLineId(null);
    }
  };

  // Pulisci intero campo
  const handleClearAll = () => {
    if (elements.length === 0 && lines.length === 0) return;
    if (window.confirm('Sei sicuro di voler svuotare completamente il campo?')) {
      onChangeElements([]);
      onChangeLines([]);
      setSelectedElementId(null);
      setSelectedLineId(null);
      setEditingLabelId(null);
    }
  };

  // Download immagine diretta
  const handleDownloadPng = () => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = VB_WIDTH * 2;
        canvas.height = VB_HEIGHT * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const link = document.createElement('a');
          link.download = `schema-esercitazione-spes-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        window.URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      alert('Errore esportazione immagine.');
    }
  };

  // Salva etichetta personalizzata
  const handleSaveLabel = () => {
    if (!editingLabelId) return;
    onChangeElements(
      elements.map((el) => (el.id === editingLabelId ? { ...el, label: tempLabel.trim() } : el))
    );
    setEditingLabelId(null);
  };

  // Rendering dello sfondo del campo da calcio in base a pitchType
  const renderFieldBackground = () => {
    // Coordinate viewBox: 0 0 800 520
    const margin = 20;
    const width = VB_WIDTH - margin * 2; // 760
    const height = VB_HEIGHT - margin * 2; // 480
    const centerX = VB_WIDTH / 2;
    const centerY = VB_HEIGHT / 2;

    return (
      <g id="field-bg-layer">
        {/* Base prato verde con strisce d'erba realistiche */}
        <defs>
          <pattern id="turf-stripes" width="80" height="520" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="40" height="520" fill="#1b6e3b" />
            <rect x="40" y="0" width="40" height="520" fill="#207a42" />
          </pattern>
          {/* Sfumatura 3D per pallone realistico */}
          <radialGradient id="soccer-ball-shading" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          <radialGradient id="ball-shadow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.5)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          {/* Marker frecce tattiche */}
          <marker id="arrow-solid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ffffff" />
          </marker>
          <marker id="arrow-dashed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#facc15" />
          </marker>
          <marker id="arrow-shot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
          </marker>
          <marker id="arrow-dribble" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker id="arrow-selected" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Sfondo globale */}
        <rect id="field-turf" x="0" y="0" width={VB_WIDTH} height={VB_HEIGHT} fill="url(#turf-stripes)" rx="12" />

        {/* Linee di campo in base a pitchType */}
        {pitchType === 'full' && (
          <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Perimetro */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea mediana */}
            <line x1={centerX} y1={margin} x2={centerX} y2={VB_HEIGHT - margin} />
            {/* Cerchio di centrocampo */}
            <circle cx={centerX} cy={centerY} r="65" />
            <circle cx={centerX} cy={centerY} r="3" fill="#ffffff" />
            {/* Area di rigore SX */}
            <rect x={margin} y={centerY - 110} width="110" height="220" />
            <rect x={margin} y={centerY - 55} width="40" height="110" />
            <circle cx={margin + 80} cy={centerY} r="2.5" fill="#ffffff" />
            <path d={`M ${margin + 110} ${centerY - 45} A 65 65 0 0 1 ${margin + 110} ${centerY + 45}`} />
            {/* Porta SX */}
            <rect x={margin - 16} y={centerY - 40} width="16" height="80" fill="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="3 3" />

            {/* Area di rigore DX */}
            <rect x={VB_WIDTH - margin - 110} y={centerY - 110} width="110" height="220" />
            <rect x={VB_WIDTH - margin - 40} y={centerY - 55} width="40" height="110" />
            <circle cx={VB_WIDTH - margin - 80} cy={centerY} r="2.5" fill="#ffffff" />
            <path d={`M ${VB_WIDTH - margin - 110} ${centerY - 45} A 65 65 0 0 0 ${VB_WIDTH - margin - 110} ${centerY + 45}`} />
            {/* Porta DX */}
            <rect x={VB_WIDTH - margin} y={centerY - 40} width="16" height="80" fill="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="3 3" />

            {/* Calci d'angolo */}
            <path d={`M ${margin} ${margin + 16} A 16 16 0 0 0 ${margin + 16} ${margin}`} />
            <path d={`M ${margin} ${VB_HEIGHT - margin - 16} A 16 16 0 0 1 ${margin + 16} ${VB_HEIGHT - margin}`} />
            <path d={`M ${VB_WIDTH - margin} ${margin + 16} A 16 16 0 0 1 ${VB_WIDTH - margin - 16} ${margin}`} />
            <path d={`M ${VB_WIDTH - margin} ${VB_HEIGHT - margin - 16} A 16 16 0 0 0 ${VB_WIDTH - margin - 16} ${VB_HEIGHT - margin}`} />
          </g>
        )}

        {pitchType === 'half' && (
          <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Perimetro metà campo (porta in basso o in alto) */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea di metà campo in alto */}
            <line x1={margin} y1={margin + 35} x2={VB_WIDTH - margin} y2={margin + 35} strokeDasharray="6 4" strokeWidth="2" />
            {/* Cerchio di centrocampo parziale */}
            <path d={`M ${centerX - 90} ${margin + 35} A 90 90 0 0 0 ${centerX + 90} ${margin + 35}`} />
            <circle cx={centerX} cy={margin + 35} r="3" fill="#ffffff" />

            {/* Grande area di rigore in basso */}
            <rect x={centerX - 190} y={VB_HEIGHT - margin - 180} width="380" height="180" />
            {/* Piccola area */}
            <rect x={centerX - 90} y={VB_HEIGHT - margin - 65} width="180" height="65" />
            {/* Dischetto rigore */}
            <circle cx={centerX} cy={VB_HEIGHT - margin - 120} r="3" fill="#ffffff" />
            {/* Lunetta area di rigore */}
            <path d={`M ${centerX - 70} ${VB_HEIGHT - margin - 180} A 70 70 0 0 1 ${centerX + 70} ${VB_HEIGHT - margin - 180}`} />

            {/* Porta regolamentare */}
            <rect x={centerX - 65} y={VB_HEIGHT - margin} width="130" height="18" fill="rgba(255,255,255,0.2)" strokeWidth="2.5" />
          </g>
        )}

        {pitchType === 'penalty_box' && (
          <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Vista ingrandita area di rigore */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea limite area di rigore a metà campo visivo */}
            <line x1={margin} y1={margin + 90} x2={VB_WIDTH - margin} y2={margin + 90} strokeWidth="3" />
            {/* Lunetta alta */}
            <path d={`M ${centerX - 90} ${margin + 90} A 90 90 0 0 1 ${centerX + 90} ${margin + 90}`} />
            {/* Dischetto rigore */}
            <circle cx={centerX} cy={margin + 210} r="4" fill="#ffffff" />
            {/* Piccola area */}
            <rect x={centerX - 130} y={VB_HEIGHT - margin - 100} width="260" height="100" />
            {/* Porta grande con pali */}
            <rect x={centerX - 80} y={VB_HEIGHT - margin} width="160" height="20" fill="rgba(255,255,255,0.25)" strokeWidth="3" />
          </g>
        )}

        {pitchType === 'box' && (
          <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Rettangolo ridotto per possessi / rondo */}
            <rect x={margin + 40} y={margin + 20} width={width - 80} height={height - 40} strokeWidth="3" />
            {/* Griglia interna tratteggiata per settori */}
            <line x1={centerX} y1={margin + 20} x2={centerX} y2={VB_HEIGHT - margin - 20} strokeDasharray="8 6" strokeWidth="1.5" />
            <line x1={margin + 40} y1={centerY} x2={VB_WIDTH - margin - 40} y2={centerY} strokeDasharray="8 6" strokeWidth="1.5" />
            <circle cx={centerX} cy={centerY} r="4" fill="#ffffff" />
            {/* Cerchietto o losanga al centro per riferimento visivo */}
            <circle cx={centerX} cy={centerY} r="45" strokeDasharray="6 4" strokeWidth="1.5" />
          </g>
        )}

        {/* ============================================================ */}
        {/* CARTELLONE PUBBLICITARIO BORDO CAMPO - SPES MONTESACRO       */}
        {/* ============================================================ */}
        <g id="sponsor-banner-spes" transform="translate(615, 498)">
          {/* Ombra e supporto cartellone pubblicitario */}
          <rect x="0" y="2" width="166" height="18" rx="3" fill="rgba(0,0,0,0.5)" />
          {/* Pannello cartellone: fondo blu scuro del club */}
          <rect x="0" y="0" width="166" height="18" rx="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
          {/* Profilo luminoso superiore */}
          <line x1="2" y1="1.5" x2="164" y2="1.5" stroke="#38bdf8" strokeWidth="1" opacity="0.8" />
          
          {/* Mini logo Spes Montesacro inserito nel cartellone */}
          <g transform="translate(6, 1.5) scale(0.065)">
            <g transform="translate(0, 225) scale(0.1, -0.1)" fill="#ffffff">
              <path d="M1019 2080 c-104 -17 -193 -41 -282 -76 -99 -40 -182 -85 -182 -100 0 -7 171 -352 179 -361 1 -1 46 14 101 32 133 46 268 61 407 46 95 -10 203 -33 215 -45 7 -6 -309 -656 -319 -656 -4 0 -8 4 -8 9 0 8 -246 534 -256 549 -4 7 -39 -8 -62 -26 l-23 -18 173 -352 c94 -194 175 -352 178 -352 7 0 422 860 428 886 4 18 -79 56 -191 87 -70 19 -105 22 -242 21 -143 -1 -169 -3 -248 -27 -48 -15 -92 -27 -97 -27 -13 0 -102 179 -97 194 7 19 107 63 205 92 220 64 501 27 699 -92 32 -20 61 -36 65 -37 4 -1 19 17 33 40 l25 41 -30 22 c-54 39 -213 107 -300 129 -96 25 -283 35 -371 21z" />
              <path d="M1455 1004 c-170 -338 -313 -614 -316 -614 -3 0 -16 24 -29 53 -13 28 -80 169 -150 312 -69 143 -188 392 -265 552 -77 161 -142 293 -145 293 -3 0 -52 -237 -108 -526 l-103 -527 47 -48 c26 -27 49 -47 50 -46 2 2 33 180 69 397 36 217 67 400 69 405 2 6 130 -244 285 -554 l283 -564 48 94 c26 52 109 213 184 359 75 146 182 356 238 467 57 111 105 199 108 197 3 -3 28 -185 56 -405 28 -220 54 -403 58 -406 4 -4 29 16 57 44 l51 50 -62 389 c-34 214 -72 456 -85 537 -13 82 -25 150 -27 152 -1 2 -142 -273 -313 -611z" />
            </g>
          </g>

          {/* Scritta SPES MONTESACRO */}
          <text
            x="27"
            y="12.5"
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.08em"
          >
            SPES MONTESACRO
          </text>
          {/* Piccolo badge 1908 */}
          <rect x="135" y="3" width="26" height="12" rx="2" fill="#0284c7" />
          <text
            x="148"
            y="11.5"
            fill="#ffffff"
            fontSize="7"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
          >
            1908
          </text>
        </g>
      </g>
    );
  };

  // Rendering delle linee/frecce tracciate
  const renderLines = () => {
    return (
      <g id="tactical-lines-layer">
        {lines.map((l) => {
          if (l.points.length < 2) return null;
          const isSelected = selectedLineId === l.id;
          const p1 = { x: (l.points[0].x / 100) * VB_WIDTH, y: (l.points[0].y / 100) * VB_HEIGHT };
          const p2 = { x: (l.points[1].x / 100) * VB_WIDTH, y: (l.points[1].y / 100) * VB_HEIGHT };

          let stroke = '#ffffff';
          let strokeWidth = isSelected ? '4.5' : '3';
          let strokeDasharray = 'none';
          let markerEnd = isSelected ? 'url(#arrow-selected)' : 'url(#arrow-solid)';

          if (l.style === 'pass') {
            stroke = isSelected ? '#38bdf8' : '#facc15'; // Giallo vivo tratteggiato (o azzurro se selezionato)
            strokeDasharray = '8,6';
            markerEnd = isSelected ? 'url(#arrow-selected)' : 'url(#arrow-dashed)';
          } else if (l.style === 'run') {
            stroke = isSelected ? '#38bdf8' : '#ffffff'; // Bianco solido
            markerEnd = isSelected ? 'url(#arrow-selected)' : 'url(#arrow-solid)';
          } else if (l.style === 'shot') {
            stroke = isSelected ? '#38bdf8' : '#ef4444'; // Rosso forte
            strokeWidth = isSelected ? '5.5' : '4.5';
            markerEnd = isSelected ? 'url(#arrow-selected)' : 'url(#arrow-shot)';
          } else if (l.style === 'dribble') {
            stroke = isSelected ? '#ffffff' : '#38bdf8'; // Azzurro
            markerEnd = isSelected ? 'url(#arrow-selected)' : 'url(#arrow-dribble)';
            // Linea ondulata usando curva di Bézier
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const perpX = -dy * 0.15;
            const perpY = dx * 0.15;
            const dPath = `M ${p1.x} ${p1.y} Q ${midX + perpX} ${midY + perpY} ${midX} ${midY} T ${p2.x} ${p2.y}`;

            return (
              <g key={l.id} className={readOnly ? '' : 'cursor-pointer'} onPointerDown={(e) => handleLinePointerDown(e, l.id)}>
                {/* Hitbox trasparente più larga per facilitare la selezione con mouse o tocco */}
                <path
                  d={dPath}
                  stroke="transparent"
                  strokeWidth="20"
                  fill="none"
                />
                {/* Alone di selezione */}
                {isSelected && (
                  <path
                    d={dPath}
                    stroke="#38bdf8"
                    strokeWidth="8"
                    fill="none"
                    opacity="0.4"
                  />
                )}
                <path
                  d={dPath}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  fill="none"
                  markerEnd={markerEnd}
                  opacity={isSelected ? 1 : 0.95}
                />
              </g>
            );
          }

          return (
            <g key={l.id} className={readOnly ? '' : 'cursor-pointer'} onPointerDown={(e) => handleLinePointerDown(e, l.id)}>
              {/* Hitbox trasparente larga per selezionare comodamente la freccia */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth="20"
              />
              {/* Alone di selezione azzurro se la linea è selezionata */}
              {isSelected && (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#38bdf8"
                  strokeWidth="8"
                  opacity="0.4"
                />
              )}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                markerEnd={markerEnd}
                opacity={isSelected ? 1 : 0.95}
              />
            </g>
          );
        })}

        {/* Linea attiva in corso di tracciamento */}
        {drawingLine && (
          <line
            x1={(drawingLine.start.x / 100) * VB_WIDTH}
            y1={(drawingLine.start.y / 100) * VB_HEIGHT}
            x2={(drawingLine.current.x / 100) * VB_WIDTH}
            y2={(drawingLine.current.y / 100) * VB_HEIGHT}
            stroke={
              activeTool === 'pass'
                ? '#facc15'
                : activeTool === 'shot'
                ? '#ef4444'
                : activeTool === 'dribble'
                ? '#38bdf8'
                : '#ffffff'
            }
            strokeWidth="3.5"
            strokeDasharray={activeTool === 'pass' ? '8,6' : 'none'}
            opacity="0.9"
            markerEnd={
              activeTool === 'pass'
                ? 'url(#arrow-dashed)'
                : activeTool === 'shot'
                ? 'url(#arrow-shot)'
                : activeTool === 'dribble'
                ? 'url(#arrow-dribble)'
                : 'url(#arrow-solid)'
            }
          />
        )}
      </g>
    );
  };

  // Rendering singolo elemento sul campo
  const renderElement = (el: DrillElement) => {
    const cx = (el.x / 100) * VB_WIDTH;
    const cy = (el.y / 100) * VB_HEIGHT;
    const isSelected = selectedElementId === el.id;
    const elScale = el.scale || 1.0;

    // Giocatori
    if (
      el.type === 'player_blue' ||
      el.type === 'player_red' ||
      el.type === 'player_yellow' ||
      el.type === 'player_green' ||
      el.type === 'player_gk'
    ) {
      let fillColor = '#2563eb'; // blue-600
      let textColor = '#ffffff';
      let strokeColor = '#ffffff';

      if (el.type === 'player_red') {
        fillColor = '#dc2626'; // red-600
      } else if (el.type === 'player_yellow') {
        fillColor = '#eab308'; // yellow-500
        textColor = '#1e293b';
        strokeColor = '#0f172a';
      } else if (el.type === 'player_green') {
        fillColor = '#16a34a'; // green-600
      } else if (el.type === 'player_gk') {
        fillColor = '#ea580c'; // orange-600 (portiere)
      }

      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
          onDoubleClick={() => {
            if (readOnly) return;
            setEditingLabelId(el.id);
            setTempLabel(el.label || '');
          }}
        >
          {/* Cerchio selezione */}
          {isSelected && (
            <circle cx="0" cy="0" r="22" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3" />
          )}
          {/* Ombra 3D */}
          <circle cx="1.5" cy="2.5" r="16" fill="rgba(0,0,0,0.35)" />
          {/* Cerchio Giocatore */}
          <circle cx="0" cy="0" r="16" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          {/* Numero / Sigla */}
          <text
            x="0"
            y="4.5"
            textAnchor="middle"
            fill={textColor}
            fontSize={el.label && el.label.length > 2 ? '10' : '12'}
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {el.label || (el.type === 'player_gk' ? 'GK' : '1')}
          </text>
        </g>
      );
    }

    // Pallone da calcio REALISTICO (con ombreggiatura 3D, pannelli pentagonali e cuciture classiche Telstar)
    if (el.type === 'ball') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <circle cx="0" cy="0" r="17" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3" />
          )}
          {/* Ombra proiettata morbida sull'erba */}
          <ellipse cx="2" cy="7" rx="12" ry="5" fill="url(#ball-shadow-grad)" />

          {/* Sfera base con gradiente 3D volumetrico */}
          <circle cx="0" cy="0" r="12" fill="url(#soccer-ball-shading)" stroke="#0f172a" strokeWidth="1.2" />

          {/* Pentagono centrale nero */}
          <polygon
            points="0,-4.5 4.2,-1.4 2.6,3.6 -2.6,3.6 -4.2,-1.4"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="0.6"
          />

          {/* Linee di cucitura che partono dal pentagono centrale */}
          <line x1="0" y1="-4.5" x2="0" y2="-9.5" stroke="#334155" strokeWidth="0.9" />
          <line x1="4.2" y1="-1.4" x2="8.8" y2="-3" stroke="#334155" strokeWidth="0.9" />
          <line x1="2.6" y1="3.6" x2="6.8" y2="7.5" stroke="#334155" strokeWidth="0.9" />
          <line x1="-2.6" y1="3.6" x2="-6.8" y2="7.5" stroke="#334155" strokeWidth="0.9" />
          <line x1="-4.2" y1="-1.4" x2="-8.8" y2="-3" stroke="#334155" strokeWidth="0.9" />

          {/* Patch pentagonali esterni neri con taglio circolare sul bordo */}
          <polygon points="-3,-10.8 0,-9.5 3,-10.8 1.8,-12 -1.8,-12" fill="#0f172a" />
          <polygon points="8.8,-3 11.2,-5.5 11.8,-2 9.5,-0.5" fill="#0f172a" />
          <polygon points="6.8,7.5 9.8,9 7.5,10.8 5,9" fill="#0f172a" />
          <polygon points="-6.8,7.5 -5,9 -7.5,10.8 -9.8,9" fill="#0f172a" />
          <polygon points="-8.8,-3 -9.5,-0.5 -11.8,-2 -11.2,-5.5" fill="#0f172a" />

          {/* Riflesso di luce speculare curvato in alto a sinistra per effetto cuoio lucido */}
          <path
            d="M -6 -7 A 9 9 0 0 1 3 -8"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
        </g>
      );
    }

    // Cono da allenamento
    if (el.type === 'cone') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
          )}
          <polygon points="-9,9 9,9 0,-11" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
          <line x1="-10" y1="9" x2="10" y2="9" stroke="#ea580c" strokeWidth="2.8" />
          <polygon points="-5,3 5,3 0,-11" fill="#fed7aa" opacity="0.8" />
        </g>
      );
    }

    // Cinesini / Delimitatori (dischi piatti)
    if (el.type === 'disc_yellow' || el.type === 'disc_red' || el.type === 'disc_blue') {
      const discFill =
        el.type === 'disc_yellow' ? '#facc15' : el.type === 'disc_red' ? '#ef4444' : '#38bdf8';
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <circle cx="0" cy="0" r="15" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="2 2" />
          )}
          <ellipse cx="0" cy="1" rx="9" ry="5.5" fill="rgba(0,0,0,0.3)" />
          <ellipse cx="0" cy="0" rx="9" ry="5.5" fill={discFill} stroke="#ffffff" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="3" ry="1.8" fill="#0f172a" opacity="0.6" />
        </g>
      );
    }

    // Porticina (mini-goal)
    if (el.type === 'mini_goal') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <rect x="-20" y="-16" width="40" height="32" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
          )}
          <rect x="-16" y="-11" width="32" height="22" fill="rgba(255,255,255,0.3)" stroke="#ffffff" strokeWidth="2.2" rx="2" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="-6" y1="-11" x2="-6" y2="11" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="6" y1="-11" x2="6" y2="11" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      );
    }

    // Scaletta di coordinazione
    if (el.type === 'ladder') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <rect x="-14" y="-32" width="28" height="64" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
          )}
          {/* Montanti laterali */}
          <line x1="-10" y1="-28" x2="-10" y2="28" stroke="#facc15" strokeWidth="2.2" />
          <line x1="10" y1="-28" x2="10" y2="28" stroke="#facc15" strokeWidth="2.2" />
          {/* Gradini */}
          {[-22, -11, 0, 11, 22].map((yStep) => (
            <line key={yStep} x1="-10" y1={yStep} x2="10" y2={yStep} stroke="#facc15" strokeWidth="2.2" />
          ))}
        </g>
      );
    }

    // Ostacolo
    if (el.type === 'hurdle') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <rect x="-16" y="-10" width="32" height="20" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
          )}
          <line x1="-12" y1="5" x2="12" y2="5" stroke="#e2e8f0" strokeWidth="2.8" />
          <line x1="-12" y1="5" x2="-12" y2="-5" stroke="#ea580c" strokeWidth="2.8" />
          <line x1="12" y1="5" x2="12" y2="-5" stroke="#ea580c" strokeWidth="2.8" />
        </g>
      );
    }

    // Sagoma difensiva (dummy)
    if (el.type === 'dummy') {
      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
        >
          {isSelected && (
            <rect x="-14" y="-20" width="28" height="40" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
          )}
          <ellipse cx="0" cy="-11" rx="7" ry="7" fill="#64748b" stroke="#ffffff" strokeWidth="1.6" />
          <path d="M -9 14 L -7 -2 L 7 -2 L 9 14 Z" fill="#475569" stroke="#ffffff" strokeWidth="1.6" />
        </g>
      );
    }

    return null;
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex flex-col space-y-3" ref={containerRef}>
      {/* Barra comandi superiore: Tipo Campo & Toolbar Strumenti */}
      {!readOnly && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
          {/* Scelta Vista Campo */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">Campo:</span>
            <button
              type="button"
              onClick={() => onChangePitchType('half')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                pitchType === 'half'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Metà Campo
            </button>
            <button
              type="button"
              onClick={() => onChangePitchType('full')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                pitchType === 'full'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Intero
            </button>
            <button
              type="button"
              onClick={() => onChangePitchType('penalty_box')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                pitchType === 'penalty_box'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Area Rigore
            </button>
            <button
              type="button"
              onClick={() => onChangePitchType('box')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                pitchType === 'box'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Rettangolo / Rondo
            </button>
          </div>

          {/* Modalità di disegno e selezione */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTool('select');
              }}
              title="Modalità Selezione e Spostamento (frecce ed elementi)"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTool === 'select'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Sposta / Seleziona</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('run');
                setSelectedElementId(null);
                setSelectedLineId(null);
              }}
              title="Freccia Corsa / Movimento (Continua Bianca)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTool === 'run'
                  ? 'bg-slate-100 text-slate-900 border-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
              <span>Corsa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('pass');
                setSelectedElementId(null);
                setSelectedLineId(null);
              }}
              title="Freccia Passaggio (Tratteggiata Gialla)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTool === 'pass'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-black'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <MoveRight className="w-3.5 h-3.5 text-amber-300" />
              <span>Passaggio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('dribble');
                setSelectedElementId(null);
                setSelectedLineId(null);
              }}
              title="Linea Guida della Palla / Dribbling (Ondulata Azzurra)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTool === 'dribble'
                  ? 'bg-sky-500 text-white border-sky-400 shadow'
                  : 'bg-slate-800 text-sky-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <span className="text-sm font-black">~</span>
              <span>Dribbling</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('shot');
                setSelectedElementId(null);
                setSelectedLineId(null);
              }}
              title="Freccia Conclusione a Rete (Rossa)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTool === 'shot'
                  ? 'bg-rose-600 text-white border-rose-500 shadow'
                  : 'bg-slate-800 text-rose-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Tiro</span>
            </button>
          </div>

          {/* Azioni rapide: Controllo Dimensione Oggetti, Elimina selezione, Annulla linea, Svuota, Scarica PNG */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Controlli Dimensione per l'elemento selezionato */}
            {selectedElementId && (
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleChangeElementScale(-0.2)}
                  title="Riduci dimensione elemento"
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1 text-cyan-300" title="Scala attuale">
                  {Math.round((selectedElement?.scale || 1.0) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleChangeElementScale(0.2)}
                  title="Aumenta dimensione elemento"
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tasto elimina per ELEMENTO o per LINEA selezionata */}
            {(selectedElementId || selectedLineId) && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                title={selectedElementId ? 'Elimina elemento selezionato' : 'Elimina freccia selezionata'}
                className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition flex items-center gap-1 text-xs font-bold px-2.5 shadow-sm animate-pulse"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{selectedLineId ? 'Elimina Freccia' : 'Elimina'}</span>
              </button>
            )}

            {lines.length > 0 && (
              <button
                type="button"
                onClick={handleUndoLine}
                title="Annulla ultima freccia tracciata"
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              title="Svuota completamente il campo"
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              title="Scarica immagine del campo (.PNG)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* Palette Elementi rapida per aggiungere Giocatori e Materiale */}
      {!readOnly && (
        <div className="bg-slate-100/90 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold text-slate-700 shadow-2xs">
          <span className="text-[11px] font-black uppercase text-slate-500 shrink-0 pl-1">Aggiungi sul campo:</span>

          {/* Giocatori Blu */}
          <button
            type="button"
            onClick={() => handleAddElement('player_blue')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs shrink-0"
          >
            <Circle className="w-3.5 h-3.5 fill-white" />
            <span>Blu (+1)</span>
          </button>

          {/* Giocatori Rossi */}
          <button
            type="button"
            onClick={() => handleAddElement('player_red')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow-2xs shrink-0"
          >
            <Circle className="w-3.5 h-3.5 fill-white" />
            <span>Rosso (+1)</span>
          </button>

          {/* Giocatore Giallo / Jolly */}
          <button
            type="button"
            onClick={() => handleAddElement('player_yellow')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 transition shadow-2xs shrink-0"
          >
            <Circle className="w-3.5 h-3.5 fill-slate-900" />
            <span>Jolly (J)</span>
          </button>

          {/* Portiere GK */}
          <button
            type="button"
            onClick={() => handleAddElement('player_gk')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-2xs shrink-0"
          >
            <Circle className="w-3.5 h-3.5 fill-white" />
            <span>Portiere (GK)</span>
          </button>

          {/* Palla realistica */}
          <button
            type="button"
            onClick={() => handleAddElement('ball')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 transition shadow-2xs shrink-0"
          >
            <span className="text-sm">⚽</span>
            <span>Pallone</span>
          </button>

          {/* Cono arancione */}
          <button
            type="button"
            onClick={() => handleAddElement('cone')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-100 text-orange-900 border border-orange-200 hover:bg-orange-200 transition shrink-0"
          >
            <span className="text-xs">▲</span>
            <span>Cono</span>
          </button>

          {/* Cinesino Giallo */}
          <button
            type="button"
            onClick={() => handleAddElement('disc_yellow')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-yellow-100 text-yellow-900 border border-yellow-300 hover:bg-yellow-200 transition shrink-0"
          >
            <span className="text-xs">●</span>
            <span>Cinesino Giallo</span>
          </button>

          {/* Cinesino Rosso */}
          <button
            type="button"
            onClick={() => handleAddElement('disc_red')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-100 text-red-900 border border-red-200 hover:bg-red-200 transition shrink-0"
          >
            <span className="text-xs">●</span>
            <span>Cinesino Rosso</span>
          </button>

          {/* Mini Porta */}
          <button
            type="button"
            onClick={() => handleAddElement('mini_goal')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition shrink-0"
          >
            <span className="text-xs">🥅</span>
            <span>Porticina</span>
          </button>

          {/* Scaletta */}
          <button
            type="button"
            onClick={() => handleAddElement('ladder')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition shrink-0"
          >
            <span className="text-xs">🪜</span>
            <span>Scaletta</span>
          </button>

          {/* Sagoma */}
          <button
            type="button"
            onClick={() => handleAddElement('dummy')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition shrink-0"
          >
            <span className="text-xs">👤</span>
            <span>Sagoma</span>
          </button>
        </div>
      )}

      {/* Editor etichetta elemento selezionato */}
      {!readOnly && editingLabelId && (
        <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900">Modifica Numero o Sigla giocatore:</span>
            <input
              type="text"
              maxLength={4}
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              className="w-16 px-2 py-1 bg-white border border-amber-400 rounded-lg text-center font-black text-slate-900"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSaveLabel}
              className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700"
            >
              Applica
            </button>
            <button
              type="button"
              onClick={() => setEditingLabelId(null)}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Area del Canvas SVG Interattivo */}
      <div className="relative w-full overflow-hidden rounded-2xl shadow-xl border-4 border-slate-900 bg-slate-900 select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="w-full h-auto block touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Sfondo del campo */}
          {renderFieldBackground()}

          {/* Linee e frecce tattiche */}
          {renderLines()}

          {/* Giocatori e attrezzi posizionati */}
          <g id="tactical-elements-layer">
            {elements.map((el) => renderElement(el))}
          </g>
        </svg>

        {/* Guida visiva / Hint discreto */}
        {!readOnly && (
          <div className="absolute bottom-2 left-3 bg-slate-950/70 backdrop-blur-xs text-white/80 text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3 h-3 text-cyan-400" />
            <span>Clicca su linee o elementi per selezionarli ed eliminarli | Usa + / - per ridimensionare | Doppio click per numero</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TacticalBoard;
