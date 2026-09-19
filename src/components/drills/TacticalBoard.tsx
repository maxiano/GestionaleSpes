import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Minimize2,
  Circle,
  HelpCircle,
  Split,
  Shirt,
  LayoutGrid,
  ChevronDown,
  CheckSquare,
  Square,
  Move,
  Columns,
  Rows,
  RotateCw,
  Smartphone,
  X
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
  colorScheme?: 'standard' | 'high_contrast_bw';
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  pitchType,
  onChangePitchType,
  elements,
  onChangeElements,
  lines,
  onChangeLines,
  onCaptureSnapshot,
  readOnly = false,
  colorScheme = 'standard'
}) => {
  const isBw = colorScheme === 'high_contrast_bw';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Modalità corrente: 'select' (per spostare o selezionare) o 'line_*' (per tracciare frecce)
  const [activeTool, setActiveTool] = useState<'select' | DrillLineStyle>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);

  type DragMode = 'element' | 'line' | 'line_handle_start' | 'line_handle_end' | 'marquee' | null;
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [lastPointerCoords, setLastPointerCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeLineHandle, setActiveLineHandle] = useState<{ lineId: string; handle: 'start' | 'end' | 'center' } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  // Derived state per retrocompatibilità e controlli contestuali
  const selectedElementId = selectedElementIds[0] || null;
  const selectedLineId = selectedLineIds[0] || null;
  const selectedElement = elements.find((e) => e.id === selectedElementId);
  const selectedLine = lines.find((l) => l.id === selectedLineId);
  const totalSelectedCount = selectedElementIds.length + selectedLineIds.length;

  // Stato per tracciamento nuova linea
  const [drawingLine, setDrawingLine] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  // Palette selezione rapida per aggiungere un elemento
  const [selectedPaletteItem, setSelectedPaletteItem] = useState<DrillItemType>('player_blue');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<string>('');
  const [showDividerMenu, setShowDividerMenu] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'figurines' | 'markers'>('figurines');

  // Modalità Schermo Intero per smartphone e tablet
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Rilevamento orientamento smartphone per suggerimento landscape
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 850);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Dimensioni standard SVG board
  const VB_WIDTH = 800;
  const VB_HEIGHT = 520;

  // Scorciatoie da tastiera: Canc / Backspace per eliminare la selezione, Esc per deselezionare o uscire da fullscreen
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0 || selectedLineIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        setSelectedElementIds([]);
        setSelectedLineIds([]);
        setEditingLabelId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, selectedLineIds, readOnly, elements, lines, isFullscreen]);

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

  // Aggiungi elemento al centro o tramite click sul campo con offset intelligente anti-sovrapposizione
  const handleAddElement = (type: DrillItemType, x?: number, y?: number) => {
    let targetX = x;
    let targetY = y;

    // Se le coordinate non sono specificate, calcola una posizione sfalsata attorno al centro
    if (targetX === undefined || targetY === undefined) {
      const offsetIndex = elements.length % 9;
      const offsets = [
        { dx: 0, dy: 0 },
        { dx: -7, dy: -6 },
        { dx: 7, dy: -6 },
        { dx: -7, dy: 6 },
        { dx: 7, dy: 6 },
        { dx: 0, dy: -10 },
        { dx: 0, dy: 10 },
        { dx: -11, dy: 0 },
        { dx: 11, dy: 0 }
      ];
      const off = offsets[offsetIndex] || { dx: 0, dy: 0 };
      targetX = Math.max(8, Math.min(92, 50 + off.dx));
      targetY = Math.max(8, Math.min(92, 50 + off.dy));
    }

    let defaultLabel = '';
    if (type === 'player_blue' || type === 'mini_player_blue') {
      const count = elements.filter((e) => e.type === 'player_blue' || e.type === 'mini_player_blue').length + 1;
      defaultLabel = `B${count}`;
    } else if (type === 'player_red' || type === 'mini_player_red') {
      const count = elements.filter((e) => e.type === 'player_red' || e.type === 'mini_player_red').length + 1;
      defaultLabel = `R${count}`;
    } else if (type === 'player_yellow' || type === 'mini_player_yellow') {
      defaultLabel = 'J';
    } else if (type === 'player_green' || type === 'mini_player_green') {
      const count = elements.filter((e) => e.type === 'player_green' || e.type === 'mini_player_green').length + 1;
      defaultLabel = `V${count}`;
    } else if (type === 'mini_player_white') {
      const count = elements.filter((e) => e.type === 'mini_player_white').length + 1;
      defaultLabel = `W${count}`;
    } else if (type === 'player_gk' || type === 'mini_player_gk') {
      defaultLabel = 'GK';
    }

    const newElement: DrillElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      x: targetX,
      y: targetY,
      label: defaultLabel,
      rotation: 0,
      scale: 1.0
    };

    onChangeElements([...elements, newElement]);
    setSelectedElementIds([newElement.id]);
    setSelectedLineIds([]);
  };

  // Divisioni rapide preimpostate del campo di gioco
  const handleAddQuickDivider = (preset: 'horizontal' | 'vertical' | 'three_sectors' | 'three_lanes' | 'central_box') => {
    const idPrefix = `div-${Date.now()}`;
    const newLines: DrillLine[] = [];

    if (preset === 'horizontal') {
      newLines.push({
        id: `${idPrefix}-h`,
        style: 'divider',
        width: 4,
        points: [{ x: 4, y: 50 }, { x: 96, y: 50 }]
      });
    } else if (preset === 'vertical') {
      newLines.push({
        id: `${idPrefix}-v`,
        style: 'divider',
        width: 4,
        points: [{ x: 50, y: 4 }, { x: 50, y: 96 }]
      });
    } else if (preset === 'three_sectors') {
      // 3 Settori: Costruzione bassa, Sviluppo/Costruzione alta, Finalizzazione
      newLines.push(
        { id: `${idPrefix}-s1`, style: 'divider', width: 4, points: [{ x: 4, y: 33.3 }, { x: 96, y: 33.3 }] },
        { id: `${idPrefix}-s2`, style: 'divider', width: 4, points: [{ x: 4, y: 66.6 }, { x: 96, y: 66.6 }] }
      );
    } else if (preset === 'three_lanes') {
      // 3 Corsie longitudinali: Fascia sinistra, Centro, Fascia destra
      newLines.push(
        { id: `${idPrefix}-l1`, style: 'divider', width: 4, points: [{ x: 30, y: 4 }, { x: 30, y: 96 }] },
        { id: `${idPrefix}-l2`, style: 'divider', width: 4, points: [{ x: 70, y: 4 }, { x: 70, y: 96 }] }
      );
    } else if (preset === 'central_box') {
      // Quadrato di gioco / Rondo centrale
      newLines.push(
        { id: `${idPrefix}-b1`, style: 'divider', width: 4, points: [{ x: 25, y: 25 }, { x: 75, y: 25 }] },
        { id: `${idPrefix}-b2`, style: 'divider', width: 4, points: [{ x: 75, y: 25 }, { x: 75, y: 75 }] },
        { id: `${idPrefix}-b3`, style: 'divider', width: 4, points: [{ x: 75, y: 75 }, { x: 25, y: 75 }] },
        { id: `${idPrefix}-b4`, style: 'divider', width: 4, points: [{ x: 25, y: 75 }, { x: 25, y: 25 }] }
      );
    }

    onChangeLines([...lines, ...newLines]);
    setSelectedLineIds(newLines.map((l) => l.id));
    setSelectedElementIds([]);
  };

  // Aggiungi singola linea divisoria orizzontale o verticale con 1 tap
  const handleAddSingleDivider = (orientation: 'horizontal' | 'vertical') => {
    const newLine: DrillLine = {
      id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      style: 'divider',
      width: 4,
      points:
        orientation === 'horizontal'
          ? [{ x: 4, y: 50 }, { x: 96, y: 50 }]
          : [{ x: 50, y: 4 }, { x: 50, y: 96 }]
    };
    onChangeLines([...lines, newLine]);
    setSelectedLineIds([newLine.id]);
    setSelectedElementIds([]);
  };

  // Inizio puntatore sull'SVG (gestione disegno linee o riquadro di selezione)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const coords = getPointerCoords(e);

    if (activeTool !== 'select') {
      // Inizia a tracciare una freccia tattica
      setDrawingLine({ start: coords, current: coords });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    } else {
      // Se clicchiamo sullo sfondo del campo: avvia selezione ad area rettangolare
      const target = e.target as HTMLElement;
      const isBackground =
        target.tagName === 'svg' ||
        target.getAttribute('id') === 'field-bg-layer' ||
        target.getAttribute('id') === 'field-turf' ||
        target.getAttribute('id') === 'tactical-elements-layer' ||
        target.getAttribute('id') === 'tactical-lines-layer';

      if (isBackground) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !multiSelectMode) {
          setSelectedElementIds([]);
          setSelectedLineIds([]);
          setEditingLabelId(null);
        }
        setDragMode('marquee');
        setSelectionBox({ start: coords, current: coords });
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
  };

  // Movimento puntatore sull'SVG: trascinamento elementi, spostamento linee, ridimensionamento maniglie o disegno
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const coords = getPointerCoords(e);

    if (drawingLine) {
      setDrawingLine((prev) => (prev ? { ...prev, current: coords } : null));
    } else if (dragMode === 'marquee') {
      setSelectionBox((prev) => (prev ? { ...prev, current: coords } : null));
    } else if (dragMode === 'element') {
      const dx = coords.x - lastPointerCoords.x;
      const dy = coords.y - lastPointerCoords.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        onChangeElements(
          elements.map((el) => {
            if (selectedElementIds.includes(el.id)) {
              return {
                ...el,
                x: Math.max(2, Math.min(98, Math.round((el.x + dx) * 10) / 10)),
                y: Math.max(2, Math.min(98, Math.round((el.y + dy) * 10) / 10))
              };
            }
            return el;
          })
        );
        setLastPointerCoords(coords);
      }
    } else if (dragMode === 'line') {
      const dx = coords.x - lastPointerCoords.x;
      const dy = coords.y - lastPointerCoords.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        onChangeLines(
          lines.map((l) => {
            if (selectedLineIds.includes(l.id)) {
              return {
                ...l,
                points: l.points.map((p) => ({
                  x: Math.max(1, Math.min(99, Math.round((p.x + dx) * 10) / 10)),
                  y: Math.max(1, Math.min(99, Math.round((p.y + dy) * 10) / 10))
                }))
              };
            }
            return l;
          })
        );
        setLastPointerCoords(coords);
      }
    } else if (dragMode === 'line_handle_start' && activeLineHandle) {
      onChangeLines(
        lines.map((l) => {
          if (l.id === activeLineHandle.lineId && l.points.length >= 2) {
            return {
              ...l,
              points: [
                { x: Math.max(1, Math.min(99, coords.x)), y: Math.max(1, Math.min(99, coords.y)) },
                l.points[1]
              ]
            };
          }
          return l;
        })
      );
    } else if (dragMode === 'line_handle_end' && activeLineHandle) {
      onChangeLines(
        lines.map((l) => {
          if (l.id === activeLineHandle.lineId && l.points.length >= 2) {
            return {
              ...l,
              points: [
                l.points[0],
                { x: Math.max(1, Math.min(99, coords.x)), y: Math.max(1, Math.min(99, coords.y)) }
              ]
            };
          }
          return l;
        })
      );
    }
  };

  // Fine interazione puntatore
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (drawingLine) {
      const dist = Math.hypot(
        drawingLine.current.x - drawingLine.start.x,
        drawingLine.current.y - drawingLine.start.y
      );

      // Aggiungi la linea solo se ha una lunghezza minima di 2.5%
      if (dist >= 2.5) {
        const newLine: DrillLine = {
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          style: activeTool as DrillLineStyle,
          points: [drawingLine.start, drawingLine.current],
          width: activeTool === 'divider' ? 4 : activeTool === 'shot' ? 5 : 3.5
        };
        onChangeLines([...lines, newLine]);
        setSelectedLineIds([newLine.id]);
        setSelectedElementIds([]);
      }
      setDrawingLine(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (dragMode === 'marquee' && selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
      const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
      const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);

      if (maxX - minX > 2 || maxY - minY > 2) {
        const boxedElements = elements
          .filter((el) => el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY)
          .map((el) => el.id);

        const boxedLines = lines
          .filter((l) => {
            if (l.points.length < 2) return false;
            const p1 = l.points[0];
            const p2 = l.points[1];
            const lxMin = Math.min(p1.x, p2.x);
            const lxMax = Math.max(p1.x, p2.x);
            const lyMin = Math.min(p1.y, p2.y);
            const lyMax = Math.max(p1.y, p2.y);
            return !(lxMax < minX || lxMin > maxX || lyMax < minY || lyMin > maxY);
          })
          .map((l) => l.id);

        if (boxedElements.length > 0 || boxedLines.length > 0) {
          setSelectedElementIds(boxedElements);
          setSelectedLineIds(boxedLines);
        }
      }
      setSelectionBox(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    setDragMode(null);
    setActiveLineHandle(null);
  };

  // Selezione e inizio trascinamento di un elemento (singolo o multiplo)
  const handleElementPointerDown = (e: React.PointerEvent, el: DrillElement) => {
    if (readOnly) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;

    const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey || multiSelectMode;
    const isAlreadySelected = selectedElementIds.includes(el.id);

    if (isAdditive) {
      setSelectedElementIds((prev) =>
        prev.includes(el.id) ? prev.filter((id) => id !== el.id) : [...prev, el.id]
      );
    } else {
      if (!isAlreadySelected) {
        setSelectedElementIds([el.id]);
        setSelectedLineIds([]);
      }
    }

    const coords = getPointerCoords(e as any);
    setLastPointerCoords(coords);
    setDragMode('element');
    try {
      if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
      } else {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    } catch (_) {}
  };

  // Selezione e inizio spostamento di una linea
  const handleLinePointerDown = (e: React.PointerEvent, lineId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;

    const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey || multiSelectMode;
    const isAlreadySelected = selectedLineIds.includes(lineId);

    if (isAdditive) {
      setSelectedLineIds((prev) =>
        prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
      );
    } else {
      if (!isAlreadySelected) {
        setSelectedLineIds([lineId]);
        setSelectedElementIds([]);
      }
    }

    setEditingLabelId(null);
    const coords = getPointerCoords(e as any);
    setLastPointerCoords(coords);
    setActiveLineHandle({ lineId, handle: 'center' });
    setDragMode('line');
    try {
      if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
      } else {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    } catch (_) {}
  };

  // Trascinamento delle maniglie di una linea (inizio, fine, o centro)
  const handleLineHandlePointerDown = (
    e: React.PointerEvent,
    lineId: string,
    handle: 'start' | 'end' | 'center'
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;

    setSelectedLineIds([lineId]);
    setSelectedElementIds([]);
    const coords = getPointerCoords(e as any);
    setLastPointerCoords(coords);
    setActiveLineHandle({ lineId, handle });
    setDragMode(
      handle === 'start' ? 'line_handle_start' : handle === 'end' ? 'line_handle_end' : 'line'
    );
    try {
      if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
      } else {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    } catch (_) {}
  };

  // Eliminazione di tutti gli elementi e linee selezionate
  const handleDeleteSelected = () => {
    if (selectedElementIds.length > 0 || selectedLineIds.length > 0) {
      if (selectedElementIds.length > 0) {
        onChangeElements(elements.filter((el) => !selectedElementIds.includes(el.id)));
      }
      if (selectedLineIds.length > 0) {
        onChangeLines(lines.filter((l) => !selectedLineIds.includes(l.id)));
      }
      setSelectedElementIds([]);
      setSelectedLineIds([]);
      setEditingLabelId(null);
    }
  };

  // Selezione di tutti gli elementi e linee
  const handleSelectAll = () => {
    setSelectedElementIds(elements.map((e) => e.id));
    setSelectedLineIds(lines.map((l) => l.id));
  };

  // Deseleziona tutto
  const handleClearSelection = () => {
    setSelectedElementIds([]);
    setSelectedLineIds([]);
    setEditingLabelId(null);
  };

  // Ridimensionamento elementi selezionati
  const handleChangeElementScale = (delta: number) => {
    if (selectedElementIds.length === 0) return;
    onChangeElements(
      elements.map((el) => {
        if (selectedElementIds.includes(el.id)) {
          const currentScale = el.scale || 1.0;
          const nextScale = Math.round(Math.max(0.6, Math.min(2.2, currentScale + delta)) * 10) / 10;
          return { ...el, scale: nextScale };
        }
        return el;
      })
    );
  };

  // Modifica spessore/larghezza della linea selezionata
  const handleChangeLineWidth = (delta: number) => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id)) {
          const current = l.width ?? (l.style === 'divider' ? 4 : l.style === 'shot' ? 4.5 : 3.5);
          const next = Math.max(1.5, Math.min(16, Math.round((current + delta) * 10) / 10));
          return { ...l, width: next };
        }
        return l;
      })
    );
  };

  const handleSetLineWidth = (widthVal: number) => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id)) {
          return { ...l, width: widthVal };
        }
        return l;
      })
    );
  };

  // Modifica lunghezza della linea selezionata (scala dal centro)
  const handleChangeLineLength = (factor: number) => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id) && l.points.length >= 2) {
          const p1 = l.points[0];
          const p2 = l.points[1];
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const hx = ((p2.x - p1.x) / 2) * factor;
          const hy = ((p2.y - p1.y) / 2) * factor;
          return {
            ...l,
            points: [
              {
                x: Math.max(2, Math.min(98, Math.round((cx - hx) * 10) / 10)),
                y: Math.max(2, Math.min(98, Math.round((cy - hy) * 10) / 10))
              },
              {
                x: Math.max(2, Math.min(98, Math.round((cx + hx) * 10) / 10)),
                y: Math.max(2, Math.min(98, Math.round((cy + hy) * 10) / 10))
              }
            ]
          };
        }
        return l;
      })
    );
  };

  // Imposta lunghezza predefinita (tutto campo, 3/4, metà campo)
  const handleSetLineLengthPreset = (preset: 'full' | 'half' | 'three_quarters') => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id) && l.points.length >= 2) {
          const p1 = l.points[0];
          const p2 = l.points[1];
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const isHorizontal = Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y);
          const targetSpan = preset === 'full' ? 92 : preset === 'three_quarters' ? 69 : 46;
          const halfSpan = targetSpan / 2;

          if (isHorizontal) {
            return {
              ...l,
              points: [
                { x: Math.max(4, Math.min(96, cx - halfSpan)), y: cy },
                { x: Math.max(4, Math.min(96, cx + halfSpan)), y: cy }
              ]
            };
          } else {
            return {
              ...l,
              points: [
                { x: cx, y: Math.max(4, Math.min(96, cy - halfSpan)) },
                { x: cx, y: Math.max(4, Math.min(96, cy + halfSpan)) }
              ]
            };
          }
        }
        return l;
      })
    );
  };

  // Inverti orientamento linea (da orizzontale a verticale o viceversa)
  const handleToggleLineOrientation = () => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id) && l.points.length >= 2) {
          const p1 = l.points[0];
          const p2 = l.points[1];
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;

          // Ruota di 90 gradi attorno al baricentro
          const newDx = -dy;
          const newDy = dx;

          return {
            ...l,
            points: [
              {
                x: Math.max(2, Math.min(98, Math.round((cx - newDx / 2) * 10) / 10)),
                y: Math.max(2, Math.min(98, Math.round((cy - newDy / 2) * 10) / 10))
              },
              {
                x: Math.max(2, Math.min(98, Math.round((cx + newDx / 2) * 10) / 10)),
                y: Math.max(2, Math.min(98, Math.round((cy + newDy / 2) * 10) / 10))
              }
            ]
          };
        }
        return l;
      })
    );
  };

  // Rendi perfettamente orizzontale o verticale
  const handleMakeLineHorizontal = () => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id) && l.points.length >= 2) {
          const p1 = l.points[0];
          const p2 = l.points[1];
          const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const halfSpan = length / 2;
          return {
            ...l,
            points: [
              { x: Math.max(2, Math.min(98, cx - halfSpan)), y: cy },
              { x: Math.max(2, Math.min(98, cx + halfSpan)), y: cy }
            ]
          };
        }
        return l;
      })
    );
  };

  const handleMakeLineVertical = () => {
    if (selectedLineIds.length === 0) return;
    onChangeLines(
      lines.map((l) => {
        if (selectedLineIds.includes(l.id) && l.points.length >= 2) {
          const p1 = l.points[0];
          const p2 = l.points[1];
          const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const halfSpan = length / 2;
          return {
            ...l,
            points: [
              { x: cx, y: Math.max(2, Math.min(98, cy - halfSpan)) },
              { x: cx, y: Math.max(2, Math.min(98, cy + halfSpan)) }
            ]
          };
        }
        return l;
      })
    );
  };

  // Annulla ultima linea
  const handleUndoLine = () => {
    if (lines.length === 0) return;
    onChangeLines(lines.slice(0, lines.length - 1));
    if (selectedLineId === lines[lines.length - 1]?.id) {
      setSelectedLineIds([]);
    }
  };

  // Pulisci tutte le linee
  const handleClearLines = () => {
    if (lines.length === 0) return;
    if (window.confirm('Vuoi rimuovere tutte le frecce e linee dal campo?')) {
      onChangeLines([]);
      setSelectedLineIds([]);
    }
  };

  // Pulisci intero campo
  const handleClearAll = () => {
    if (elements.length === 0 && lines.length === 0) return;
    if (window.confirm('Sei sicuro di voler svuotare completamente il campo?')) {
      onChangeElements([]);
      onChangeLines([]);
      setSelectedElementIds([]);
      setSelectedLineIds([]);
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
    const lineColor = isBw ? '#0f172a' : '#ffffff';
    const goalFill = isBw ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.2)';

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
        </defs>

        {/* Sfondo globale: solido di salvaguardia per la stampa + pattern o alto contrasto B&W */}
        {isBw ? (
          <rect id="field-turf" x="0" y="0" width={VB_WIDTH} height={VB_HEIGHT} fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" rx="12" />
        ) : (
          <>
            <rect id="field-turf-base" x="0" y="0" width={VB_WIDTH} height={VB_HEIGHT} fill="#1b6e3b" rx="12" />
            <rect id="field-turf" x="0" y="0" width={VB_WIDTH} height={VB_HEIGHT} fill="url(#turf-stripes)" rx="12" />
          </>
        )}

        {/* Linee di campo in base a pitchType */}
        {pitchType === 'full' && (
          <g stroke={lineColor} strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Perimetro */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea mediana */}
            <line x1={centerX} y1={margin} x2={centerX} y2={VB_HEIGHT - margin} />
            {/* Cerchio di centrocampo */}
            <circle cx={centerX} cy={centerY} r="65" />
            <circle cx={centerX} cy={centerY} r="3" fill={lineColor} />
            {/* Area di rigore SX */}
            <rect x={margin} y={centerY - 110} width="110" height="220" />
            <rect x={margin} y={centerY - 55} width="40" height="110" />
            <circle cx={margin + 80} cy={centerY} r="2.5" fill={lineColor} />
            <path d={`M ${margin + 110} ${centerY - 45} A 65 65 0 0 1 ${margin + 110} ${centerY + 45}`} />
            {/* Porta SX */}
            <rect x={margin - 16} y={centerY - 40} width="16" height="80" fill={goalFill} strokeWidth="2" strokeDasharray="3 3" />

            {/* Area di rigore DX */}
            <rect x={VB_WIDTH - margin - 110} y={centerY - 110} width="110" height="220" />
            <rect x={VB_WIDTH - margin - 40} y={centerY - 55} width="40" height="110" />
            <circle cx={VB_WIDTH - margin - 80} cy={centerY} r="2.5" fill={lineColor} />
            <path d={`M ${VB_WIDTH - margin - 110} ${centerY - 45} A 65 65 0 0 0 ${VB_WIDTH - margin - 110} ${centerY + 45}`} />
            {/* Porta DX */}
            <rect x={VB_WIDTH - margin} y={centerY - 40} width="16" height="80" fill={goalFill} strokeWidth="2" strokeDasharray="3 3" />

            {/* Calci d'angolo */}
            <path d={`M ${margin} ${margin + 16} A 16 16 0 0 0 ${margin + 16} ${margin}`} />
            <path d={`M ${margin} ${VB_HEIGHT - margin - 16} A 16 16 0 0 1 ${margin + 16} ${VB_HEIGHT - margin}`} />
            <path d={`M ${VB_WIDTH - margin} ${margin + 16} A 16 16 0 0 1 ${VB_WIDTH - margin - 16} ${margin}`} />
            <path d={`M ${VB_WIDTH - margin} ${VB_HEIGHT - margin - 16} A 16 16 0 0 0 ${VB_WIDTH - margin - 16} ${VB_HEIGHT - margin}`} />
          </g>
        )}

        {pitchType === 'half' && (
          <g stroke={lineColor} strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Perimetro metà campo (porta in basso o in alto) */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea di metà campo in alto */}
            <line x1={margin} y1={margin + 35} x2={VB_WIDTH - margin} y2={margin + 35} strokeDasharray="6 4" strokeWidth="2" />
            {/* Cerchio di centrocampo parziale */}
            <path d={`M ${centerX - 90} ${margin + 35} A 90 90 0 0 0 ${centerX + 90} ${margin + 35}`} />
            <circle cx={centerX} cy={margin + 35} r="3" fill={lineColor} />

            {/* Grande area di rigore in basso */}
            <rect x={centerX - 190} y={VB_HEIGHT - margin - 180} width="380" height="180" />
            {/* Piccola area */}
            <rect x={centerX - 90} y={VB_HEIGHT - margin - 65} width="180" height="65" />
            {/* Dischetto rigore */}
            <circle cx={centerX} cy={VB_HEIGHT - margin - 120} r="3" fill={lineColor} />
            {/* Lunetta area di rigore */}
            <path d={`M ${centerX - 70} ${VB_HEIGHT - margin - 180} A 70 70 0 0 1 ${centerX + 70} ${VB_HEIGHT - margin - 180}`} />

            {/* Porta regolamentare */}
            <rect x={centerX - 65} y={VB_HEIGHT - margin} width="130" height="18" fill={goalFill} strokeWidth="2.5" />
          </g>
        )}

        {pitchType === 'penalty_box' && (
          <g stroke={lineColor} strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Vista ingrandita area di rigore */}
            <rect x={margin} y={margin} width={width} height={height} rx="2" />
            {/* Linea limite area di rigore a metà campo visivo */}
            <line x1={margin} y1={margin + 90} x2={VB_WIDTH - margin} y2={margin + 90} strokeWidth="3" />
            {/* Lunetta alta */}
            <path d={`M ${centerX - 90} ${margin + 90} A 90 90 0 0 1 ${centerX + 90} ${margin + 90}`} />
            {/* Dischetto rigore */}
            <circle cx={centerX} cy={margin + 210} r="4" fill={lineColor} />
            {/* Piccola area */}
            <rect x={centerX - 130} y={VB_HEIGHT - margin - 100} width="260" height="100" />
            {/* Porta grande con pali */}
            <rect x={centerX - 80} y={VB_HEIGHT - margin} width="160" height="20" fill={goalFill} strokeWidth="3" />
          </g>
        )}

        {pitchType === 'box' && (
          <g stroke={lineColor} strokeWidth="2.5" fill="none" opacity="0.95">
            {/* Rettangolo ridotto per possessi / rondo */}
            <rect x={margin + 40} y={margin + 20} width={width - 80} height={height - 40} strokeWidth="3" />
            {/* Griglia interna tratteggiata per settori */}
            <line x1={centerX} y1={margin + 20} x2={centerX} y2={VB_HEIGHT - margin - 20} strokeDasharray="8 6" strokeWidth="1.5" />
            <line x1={margin + 40} y1={centerY} x2={VB_WIDTH - margin - 40} y2={centerY} strokeDasharray="8 6" strokeWidth="1.5" />
            <circle cx={centerX} cy={centerY} r="4" fill={lineColor} />
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
          
          {/* Mini logo Spes Montesacro monogramma SM ufficiale */}
          <g transform="translate(6, 1) scale(0.07)">
            <g transform="translate(0, 225) scale(0.1, -0.1)" fill="#ffffff" stroke="none">
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
          {/* Piccolo badge 1928 */}
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
            1928
          </text>
        </g>
      </g>
    );
  };

  // Rendering delle linee/frecce tracciate
  // Rendering delle linee/frecce tracciate
  const renderLines = () => {
    // Helper per renderizzare la cuspide/punta della freccia come elemento geometrico SVG esplicito.
    // In questo modo la punta è parte integrante del DOM grafico e non scompare MAI in stampa, PDF o iframe
    const renderArrowHead = (
      tipX: number,
      tipY: number,
      angleRad: number,
      color: string,
      style: DrillLineStyle,
      isSelected: boolean
    ) => {
      if (style === 'divider') return null;

      const size = style === 'shot' ? 14 : 12;
      const halfWidth = style === 'shot' ? 7.5 : 6;
      const deg = (angleRad * 180) / Math.PI;

      return (
        <g transform={`translate(${tipX}, ${tipY}) rotate(${deg})`} pointerEvents="none">
          {/* Alone azzurro di selezione attorno alla punta se la linea è selezionata */}
          {isSelected && (
            <path
              d={`M 0 0 L ${-size - 3} ${-halfWidth - 3} L ${-size * 0.7 - 2} 0 L ${-size - 3} ${halfWidth + 3} Z`}
              fill="#38bdf8"
              opacity="0.45"
            />
          )}
          {/* Punta a freccia sportiva solida, nitida e visibile su qualsiasi sfondo/stampa */}
          <path
            d={`M 0 0 L ${-size} ${-halfWidth} L ${-size * 0.75} 0 L ${-size} ${halfWidth} Z`}
            fill={color}
            stroke={color}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
      );
    };

    return (
      <g id="tactical-lines-layer">
        {lines.map((l) => {
          if (l.points.length < 2) return null;
          const isSelected = selectedLineIds.includes(l.id);
          const isPrimary = selectedLineId === l.id;
          const p1 = { x: (l.points[0].x / 100) * VB_WIDTH, y: (l.points[0].y / 100) * VB_HEIGHT };
          const p2 = { x: (l.points[1].x / 100) * VB_WIDTH, y: (l.points[1].y / 100) * VB_HEIGHT };

          // Calcola larghezza/spessore custom (se definita)
          const baseWidth = l.width ?? (l.style === 'divider' ? 4 : l.style === 'shot' ? 4.5 : 3.5);
          const strokeWidth = isSelected ? baseWidth + 1.5 : baseWidth;

          let stroke = '#ffffff';
          let strokeDasharray = 'none';

          if (l.style === 'divider') {
            stroke = isSelected ? '#38bdf8' : '#f8fafc'; // Bianco puro ad alto contrasto
            strokeDasharray = '10,7';

            return (
              <g
                key={l.id}
                className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
                onPointerDown={(e) => handleLinePointerDown(e, l.id)}
              >
                {/* Hitbox trasparente larga per selezionare o trascinare la linea */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="transparent"
                  strokeWidth="26"
                />
                {/* Alone di selezione azzurro se selezionata */}
                {isSelected && (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth + 6}
                    opacity="0.45"
                  />
                )}
                {/* Sotto-traccia d'ombra per contrasto visivo netto sul campo */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="rgba(0, 0, 0, 0.45)"
                  strokeWidth={strokeWidth + 2}
                  strokeLinecap="round"
                />
                {/* Linea divisoria principale tratteggiata */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="round"
                  opacity={isSelected ? 1 : 0.95}
                />

                {/* Maniglie interattive di controllo per spostare e ridimensionare la linea */}
                {!readOnly && isSelected && isPrimary && (
                  <g id={`line-handles-${l.id}`} className="select-none">
                    {/* Maniglia centrale di spostamento */}
                    <g
                      transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}
                      className="cursor-move hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'center')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                      <path d="M -4.5 0 L 4.5 0 M 0 -4.5 L 0 4.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    </g>

                    {/* Maniglia estremità inizio */}
                    <g
                      transform={`translate(${p1.x}, ${p1.y})`}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'start')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    </g>

                    {/* Maniglia estremità fine */}
                    <g
                      transform={`translate(${p2.x}, ${p2.y})`}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'end')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    </g>
                  </g>
                )}
              </g>
            );
          } else if (l.style === 'pass') {
            stroke = isSelected ? '#38bdf8' : (isBw ? '#1e293b' : '#facc15'); // Giallo vivo tratteggiato (o scuro se b&w)
            strokeDasharray = '8,6';
          } else if (l.style === 'run') {
            stroke = isSelected ? '#38bdf8' : (isBw ? '#0f172a' : '#ffffff'); // Bianco solido (o scuro se b&w)
          } else if (l.style === 'shot') {
            stroke = isSelected ? '#38bdf8' : (isBw ? '#0f172a' : '#ef4444'); // Rosso forte (o scuro se b&w)
          } else if (l.style === 'dribble') {
            stroke = isSelected ? '#ffffff' : (isBw ? '#1e293b' : '#38bdf8'); // Azzurro (o scuro se b&w)
            // Linea ondulata usando curva di Bézier
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const perpX = -dy * 0.15;
            const perpY = dx * 0.15;
            const dPath = `M ${p1.x} ${p1.y} Q ${midX + perpX} ${midY + perpY} ${midX} ${midY} T ${p2.x} ${p2.y}`;

            // Calcolo direzione tangente al punto finale p2
            const endDx = p2.x - (midX - perpX);
            const endDy = p2.y - (midY - perpY);
            const angle = Math.atan2(endDy, endDx);

            return (
              <g
                key={l.id}
                className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
                onPointerDown={(e) => handleLinePointerDown(e, l.id)}
              >
                {/* Hitbox trasparente larga per trascinare la linea */}
                <path
                  d={dPath}
                  stroke="transparent"
                  strokeWidth="24"
                  fill="none"
                />
                {/* Alone di selezione */}
                {isSelected && (
                  <path
                    d={dPath}
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth + 6}
                    fill="none"
                    opacity="0.45"
                  />
                )}
                <path
                  d={dPath}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={isSelected ? 1 : 0.95}
                />
                {/* Punta geometrica esplicita della freccia */}
                {renderArrowHead(p2.x, p2.y, angle, stroke, l.style, isSelected)}

                {/* Maniglie interattive per spostare ed allungare */}
                {!readOnly && isSelected && isPrimary && (
                  <g id={`line-handles-${l.id}`} className="select-none">
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      className="cursor-move hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'center')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                      <path d="M -4.5 0 L 4.5 0 M 0 -4.5 L 0 4.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g
                      transform={`translate(${p1.x}, ${p1.y})`}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'start')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    </g>
                    <g
                      transform={`translate(${p2.x}, ${p2.y})`}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'end')}
                    >
                      <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                      <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    </g>
                  </g>
                )}
              </g>
            );
          }

          // Linee rette (corsa, passaggio, tiro)
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

          return (
            <g
              key={l.id}
              className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
              onPointerDown={(e) => handleLinePointerDown(e, l.id)}
            >
              {/* Hitbox trasparente larga per selezionare o trascinare */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth="24"
              />
              {/* Alone di selezione azzurro se la linea è selezionata */}
              {isSelected && (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#38bdf8"
                  strokeWidth={strokeWidth + 6}
                  opacity="0.45"
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
                opacity={isSelected ? 1 : 0.95}
              />
              {/* Punta geometrica esplicita della freccia */}
              {renderArrowHead(p2.x, p2.y, angle, stroke, l.style, isSelected)}

              {/* Maniglie interattive per spostamento ed estremità */}
              {!readOnly && isSelected && isPrimary && (
                <g id={`line-handles-${l.id}`} className="select-none">
                  <g
                    transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}
                    className="cursor-move hover:scale-125 transition-transform"
                    onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'center')}
                  >
                    <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                    <circle cx="0" cy="0" r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                    <path d="M -4.5 0 L 4.5 0 M 0 -4.5 L 0 4.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <g
                    transform={`translate(${p1.x}, ${p1.y})`}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'start')}
                  >
                    <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                    <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                  </g>
                  <g
                    transform={`translate(${p2.x}, ${p2.y})`}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onPointerDown={(e) => handleLineHandlePointerDown(e, l.id, 'end')}
                  >
                    <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
                    <circle cx="0" cy="0" r="9" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* Linea attiva in corso di tracciamento */}
        {drawingLine && (() => {
          const startX = (drawingLine.start.x / 100) * VB_WIDTH;
          const startY = (drawingLine.start.y / 100) * VB_HEIGHT;
          const currX = (drawingLine.current.x / 100) * VB_WIDTH;
          const currY = (drawingLine.current.y / 100) * VB_HEIGHT;
          const tempStroke =
            activeTool === 'pass'
              ? (isBw ? '#1e293b' : '#facc15')
              : activeTool === 'shot'
              ? (isBw ? '#0f172a' : '#ef4444')
              : activeTool === 'dribble'
              ? (isBw ? '#1e293b' : '#38bdf8')
              : activeTool === 'divider'
              ? '#f8fafc'
              : (isBw ? '#0f172a' : '#ffffff');
          const tempAngle = Math.atan2(currY - startY, currX - startX);
          return (
            <>
              <line
                x1={startX}
                y1={startY}
                x2={currX}
                y2={currY}
                stroke={tempStroke}
                strokeWidth={activeTool === 'divider' ? '4' : '3.5'}
                strokeDasharray={
                  activeTool === 'divider' ? '10,7' : activeTool === 'pass' ? '8,6' : 'none'
                }
                opacity="0.9"
              />
              {renderArrowHead(currX, currY, tempAngle, tempStroke, activeTool, false)}
            </>
          );
        })()}
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
          {/* Hitbox trasparente maggiorata per tocco touch da smartphone */}
          <circle cx="0" cy="0" r="28" fill="transparent" pointerEvents="all" />
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

    // PICCOLI GIOCATORINI (Figurine tattiche con maglia, pantaloncini, colletto sagomato, scarpini e numero)
    if (
      el.type === 'mini_player_blue' ||
      el.type === 'mini_player_red' ||
      el.type === 'mini_player_yellow' ||
      el.type === 'mini_player_green' ||
      el.type === 'mini_player_white' ||
      el.type === 'mini_player_gk'
    ) {
      let jerseyColor = '#1d4ed8'; // blue-700
      let trimColor = '#60a5fa'; // blue-400
      let shortsColor = '#0f172a'; // dark shorts
      let textColor = '#ffffff';
      let skinColor = '#fed7aa'; // light peach skin

      if (el.type === 'mini_player_red') {
        jerseyColor = '#dc2626'; // red-600
        trimColor = '#fca5a5';
        shortsColor = '#ffffff'; // pantaloncini bianchi
      } else if (el.type === 'mini_player_yellow') {
        jerseyColor = '#eab308'; // yellow-500
        trimColor = '#fef08a';
        shortsColor = '#0f172a';
        textColor = '#0f172a';
      } else if (el.type === 'mini_player_green') {
        jerseyColor = '#16a34a'; // green-600
        trimColor = '#86efac';
        shortsColor = '#0f172a';
      } else if (el.type === 'mini_player_white') {
        jerseyColor = '#f8fafc'; // white
        trimColor = '#94a3b8';
        shortsColor = '#1e293b';
        textColor = '#0f172a';
      } else if (el.type === 'mini_player_gk') {
        jerseyColor = '#ea580c'; // orange-600
        trimColor = '#fdba74';
        shortsColor = '#0f172a';
      }

      return (
        <g
          key={el.id}
          transform={`translate(${cx}, ${cy}) scale(${elScale * 0.95})`}
          className={readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}
          onPointerDown={(e) => handleElementPointerDown(e, el)}
          onDoubleClick={() => {
            if (readOnly) return;
            setEditingLabelId(el.id);
            setTempLabel(el.label || '');
          }}
        >
          {/* Hitbox maggiorata per touch smartphone */}
          <rect x="-18" y="-20" width="36" height="40" rx="8" fill="transparent" pointerEvents="all" />
          {/* Alone di selezione con rettangolo arrotondato */}
          {isSelected && (
            <rect
              x="-15"
              y="-18"
              width="30"
              height="35"
              rx="8"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Ombra sagomata morbida a terra sull'erba */}
          <ellipse cx="0.5" cy="14" rx="11" ry="3.5" fill="rgba(0,0,0,0.38)" />

          {/* Scarpini da calcio */}
          <ellipse cx="-3.5" cy="13.2" rx="2.4" ry="1.2" fill="#0f172a" />
          <ellipse cx="3.5" cy="13.2" rx="2.4" ry="1.2" fill="#0f172a" />

          {/* Gambe / Calzettoni */}
          <rect x="-4.8" y="9.5" width="2.6" height="3.5" rx="0.8" fill={jerseyColor} />
          <rect x="2.2" y="9.5" width="2.6" height="3.5" rx="0.8" fill={jerseyColor} />

          {/* Pantaloncini */}
          <path
            d="M -6.5 5 L -7 10.5 L -1.5 10.5 L 0 7 L 1.5 10.5 L 7 10.5 L 6.5 5 Z"
            fill={shortsColor}
            stroke="#0f172a"
            strokeWidth="0.8"
          />

          {/* Maglietta da calcio con spalle e maniche sagomate */}
          <path
            d="M -9 -4 L -13.5 1.5 L -9 4 L -6.5 1 L -6.5 5.5 L 6.5 5.5 L 6.5 1 L 9 4 L 13.5 1.5 L 9 -4 L 4.5 -5.8 Q 0 -4.5 -4.5 -5.8 Z"
            fill={jerseyColor}
            stroke={trimColor}
            strokeWidth="0.8"
          />

          {/* Bordo colletto V-neck */}
          <path d="M -2.5 -5 Q 0 -3 2.5 -5" fill="none" stroke={trimColor} strokeWidth="1" />

          {/* Testa & Capigliatura */}
          <circle cx="0" cy="-9.2" r="4.2" fill={skinColor} stroke="#78350f" strokeWidth="0.6" />
          <path d="M -4.2 -9.5 Q 0 -14 4.2 -9.5 Q 0 -11.8 -4.2 -9.5 Z" fill="#38220f" />

          {/* Numero o Sigla del giocatore impresso sul petto */}
          <text
            x="0"
            y="2.8"
            textAnchor="middle"
            fill={textColor}
            fontSize={el.label && el.label.length > 2 ? '7' : '8.5'}
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {el.label || (el.type === 'mini_player_gk' ? 'GK' : '1')}
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
          {/* Hitbox maggiorata per touch smartphone */}
          <circle cx="0" cy="0" r="24" fill="transparent" pointerEvents="all" />
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
          {/* Hitbox maggiorata per touch smartphone */}
          <circle cx="0" cy="0" r="24" fill="transparent" pointerEvents="all" />
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
          {/* Hitbox maggiorata per touch smartphone */}
          <circle cx="0" cy="0" r="22" fill="transparent" pointerEvents="all" />
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
          {/* Hitbox maggiorata per touch smartphone */}
          <rect x="-24" y="-18" width="48" height="36" fill="transparent" pointerEvents="all" />
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

  return (
    <div className="flex flex-col space-y-3" ref={containerRef}>
      {/* Barra comandi superiore: Tipo Campo & Toolbar Strumenti */}
      {!readOnly && (
        <div className="bg-slate-900 text-white p-2 sm:p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-md">
          {/* Scelta Vista Campo */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto scrollbar-none max-w-full">
            <span className="text-[11px] font-bold text-slate-400 px-1 sm:px-2 uppercase tracking-wider shrink-0">Campo:</span>
            <button
              type="button"
              onClick={() => onChangePitchType('half')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                pitchType === 'half'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">Metà Campo</span>
              <span className="sm:hidden">Metà</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePitchType('full')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
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
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                pitchType === 'penalty_box'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">Area Rigore</span>
              <span className="sm:hidden">Area</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePitchType('box')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                pitchType === 'box'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">Rettangolo / Rondo</span>
              <span className="sm:hidden">Rondo</span>
            </button>
          </div>

          {/* Modalità di disegno e selezione */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveTool('select');
              }}
              title="Modalità Selezione e Spostamento (frecce ed elementi)"
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
                activeTool === 'select'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sposta / Seleziona</span>
              <span className="sm:hidden">Sposta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('run');
                handleClearSelection();
              }}
              title="Freccia Corsa / Movimento (Continua Bianca)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
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
                handleClearSelection();
              }}
              title="Freccia Passaggio (Tratteggiata Gialla)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
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
                handleClearSelection();
              }}
              title="Linea Guida della Palla / Dribbling (Ondulata Azzurra)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
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
                handleClearSelection();
                setShowDividerMenu(false);
              }}
              title="Freccia Conclusione a Rete (Rossa)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
                activeTool === 'shot'
                  ? 'bg-rose-600 text-white border-rose-500 shadow'
                  : 'bg-slate-800 text-rose-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Tiro</span>
            </button>

            {/* Linea Divisoria / Delimitazione Campo con Menù Rapido */}
            <div className="relative inline-flex shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('divider');
                  handleClearSelection();
                  setShowDividerMenu(false);
                }}
                title="Traccia Linea Divisoria / Delimitazione Campo (Tratteggiata Bianca)"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-l-xl text-xs font-bold transition border ${
                  activeTool === 'divider'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-black'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border-slate-700'
                }`}
              >
                <Split className="w-3.5 h-3.5 text-amber-300" />
                <span>Divisoria</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDividerMenu(!showDividerMenu)}
                title="Menu divisioni rapide del campo (Metà campo, 3 settori, 3 corsie, quadrato rondo)"
                className={`px-1.5 py-1.5 rounded-r-xl border-l-0 border text-xs font-bold transition flex items-center ${
                  showDividerMenu
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : activeTool === 'divider'
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                }`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Menu a comparsa per le divisioni rapide */}
              {showDividerMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase text-amber-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                    <span>Divisioni Rapide Campo</span>
                    <LayoutGrid className="w-3 h-3 text-amber-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuickDivider('horizontal');
                      setShowDividerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-semibold">Linea Metà Campo (Orizzontale)</span>
                    <span className="text-[10px] text-slate-400 font-mono">1 linea</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuickDivider('vertical');
                      setShowDividerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-cyan-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-bold">Linea Divisoria Verticale</span>
                    <span className="text-[10px] text-cyan-400 font-mono">1 linea</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuickDivider('three_sectors');
                      setShowDividerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-semibold">3 Settori (Costruz./Sviluppo/Rete)</span>
                    <span className="text-[10px] text-amber-400 font-mono">2 linee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuickDivider('three_lanes');
                      setShowDividerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-semibold">3 Corsie (Fasce + Centro)</span>
                    <span className="text-[10px] text-amber-400 font-mono">2 linee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuickDivider('central_box');
                      setShowDividerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-semibold">Quadrato / Rondo Centrale</span>
                    <span className="text-[10px] text-cyan-400 font-mono">4 linee</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Azioni rapide: Selezione Multipla, Elimina selezione, Annulla linea, Svuota, Scarica PNG, Schermo Intero */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Pulsante Schermo Intero Mobile & Tablet */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Apri a Schermo Intero (ideale per smartphone su campo)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-sm border border-emerald-400/40 shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Schermo Intero</span>
              <span className="xs:hidden">Intero</span>
            </button>

            {/* Modalità Selezione Multipla (tap multiplo senza dover premere Shift o Ctrl) */}
            <button
              type="button"
              onClick={() => setMultiSelectMode(!multiSelectMode)}
              title={
                multiSelectMode
                  ? 'Modalità Selezione Multipla ATTIVA: tocca più elementi/linee per selezionarli insieme'
                  : 'Attiva Selezione Multipla (puoi anche usare Shift o trascinare un rettangolo sul campo)'
              }
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
                multiSelectMode
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm ring-2 ring-cyan-400/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {multiSelectMode ? (
                <CheckSquare className="w-3.5 h-3.5 text-cyan-200" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Multi-Sel</span>
            </button>

            {/* Seleziona Tutti / Deseleziona rapido */}
            {(elements.length > 0 || lines.length > 0) && (
              totalSelectedCount > 0 ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  title="Deseleziona tutto (Esc)"
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition shrink-0"
                >
                  Deseleziona
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  title="Seleziona tutti gli elementi e linee sul campo"
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition shrink-0"
                >
                  Tutti
                </button>
              )
            )}

            {/* Tasto elimina per ELEMENTI o LINEE selezionate */}
            {totalSelectedCount > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                title="Elimina tutti gli elementi e linee selezionate (Tasto Canc o Backspace)"
                className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition flex items-center gap-1.5 text-xs font-bold px-3 shadow-md animate-pulse shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina ({totalSelectedCount})</span>
              </button>
            )}

            {lines.length > 0 && (
              <button
                type="button"
                onClick={handleUndoLine}
                title="Annulla ultima freccia tracciata"
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              title="Svuota completamente il campo"
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              title="Scarica immagine del campo (.PNG)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* PANNELLO CONTESTUALE 1: Controllo Avanzato Linee (Spessore, Lunghezza, Orientamento H/V, Spostamento) */}
      {!readOnly && selectedLineIds.length > 0 && (
        <div className="bg-slate-900 border-2 border-cyan-500/70 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white shadow-xl">
          {/* Info linea selezionata */}
          <div className="flex items-center gap-2">
            <div className="bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1.5 border border-cyan-500/30">
              <Split className="w-3.5 h-3.5" />
              <span>
                {selectedLineIds.length > 1
                  ? `${selectedLineIds.length} Linee Selezionate`
                  : selectedLine?.style === 'divider'
                  ? 'Linea Divisoria Selezionata'
                  : selectedLine?.style === 'pass'
                  ? 'Freccia Passaggio'
                  : selectedLine?.style === 'shot'
                  ? 'Freccia Tiro'
                  : selectedLine?.style === 'dribble'
                  ? 'Traccia Dribbling'
                  : 'Freccia Corsa'}
              </span>
            </div>
          </div>

          {/* Misura Spessore / Larghezza Linea */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Larghezza:</span>
            <button
              type="button"
              onClick={() => handleChangeLineWidth(-1)}
              title="Riduci spessore linea (-1px)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-cyan-300 px-1 min-w-8 text-center">
              {selectedLine?.width ?? (selectedLine?.style === 'divider' ? 4 : selectedLine?.style === 'shot' ? 5 : 3.5)}px
            </span>
            <button
              type="button"
              onClick={() => handleChangeLineWidth(1)}
              title="Aumenta spessore linea (+1px)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
            <div className="h-3.5 w-px bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => handleSetLineWidth(2.5)}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              Fine
            </button>
            <button
              type="button"
              onClick={() => handleSetLineWidth(4)}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              Media
            </button>
            <button
              type="button"
              onClick={() => handleSetLineWidth(6.5)}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              Spessa
            </button>
            <button
              type="button"
              onClick={() => handleSetLineWidth(9)}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              Max
            </button>
          </div>

          {/* Misura Lunghezza Linea */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lunghezza:</span>
            <button
              type="button"
              onClick={() => handleChangeLineLength(0.85)}
              title="Accorcia lunghezza (-15%)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeLineLength(1.15)}
              title="Allunga linea (+15%)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <div className="h-3.5 w-px bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => handleSetLineLengthPreset('full')}
              title="Estendi a tutto campo (100%)"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => handleSetLineLengthPreset('three_quarters')}
              title="Imposta a 3/4 campo"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handleSetLineLengthPreset('half')}
              title="Imposta a metà campo"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              50%
            </button>
          </div>

          {/* Orientamento & Allineamento: Ruota 90°, Orizzontale, Verticale */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={handleToggleLineOrientation}
              title="Ruota di 90 gradi attorno al centro"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ruota 90°</span>
            </button>
            <button
              type="button"
              onClick={handleMakeLineHorizontal}
              title="Allinea la linea orizzontalmente"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-slate-700 text-slate-300 transition"
            >
              <Rows className="w-3.5 h-3.5 text-slate-400" />
              <span>Orizzontale</span>
            </button>
            <button
              type="button"
              onClick={handleMakeLineVertical}
              title="Allinea la linea verticalmente"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-slate-700 text-cyan-300 transition"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verticale</span>
            </button>
          </div>

          {/* Eliminazione rapida e chiusura */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDeleteSelected}
              title="Elimina linea selezionata (Canc / Backspace)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              title="Deseleziona linea (Esc)"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* PANNELLO CONTESTUALE 2: Controllo Elementi Selezionati (Scala Dimensione, Modifica Numero, Eliminazione) */}
      {!readOnly && selectedElementIds.length > 0 && selectedLineIds.length === 0 && (
        <div className="bg-slate-900 border-2 border-emerald-500/60 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white shadow-xl">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1.5 border border-emerald-500/30">
              <Circle className="w-3.5 h-3.5 fill-emerald-400" />
              <span>
                {selectedElementIds.length > 1
                  ? `${selectedElementIds.length} Elementi Selezionati`
                  : `Elemento Selezionato (${selectedElement?.label || selectedElement?.type || 'Giocatore'})`}
              </span>
            </div>
          </div>

          {/* Scala dimensione elemento */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Misura:</span>
            <button
              type="button"
              onClick={() => handleChangeElementScale(-0.2)}
              title="Riduci dimensione elemento (-20%)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-emerald-300 px-1 min-w-10 text-center">
              {Math.round((selectedElement?.scale || 1.0) * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleChangeElementScale(0.2)}
              title="Aumenta dimensione elemento (+20%)"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tasto Modifica Numero/Sigla se è un giocatore o giocatorino */}
          {selectedElement && (selectedElement.type.startsWith('player') || selectedElement.type.startsWith('mini_player')) && (
            <button
              type="button"
              onClick={() => {
                setEditingLabelId(selectedElement.id);
                setTempLabel(selectedElement.label || '');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition"
            >
              Modifica Numero ({selectedElement.label || '#'})
            </button>
          )}

          {/* Azioni Elimina e Deseleziona */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDeleteSelected}
              title="Elimina elementi selezionati (Canc o Backspace)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina ({selectedElementIds.length})</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* PANNELLO CONTESTUALE 3: Selezione Mista Elementi + Linee */}
      {!readOnly && selectedElementIds.length > 0 && selectedLineIds.length > 0 && (
        <div className="bg-slate-900 border-2 border-indigo-500/60 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white shadow-xl">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg font-black text-[11px] border border-indigo-500/30">
              {totalSelectedCount} Oggetti Selezionati ({selectedElementIds.length} giocatori/attrezzi + {selectedLineIds.length} linee)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDeleteSelected}
              title="Elimina tutti gli oggetti selezionati (Canc o Backspace)"
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina Tutti ({totalSelectedCount})</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Deseleziona
            </button>
          </div>
        </div>
      )}

      {/* Palette Elementi rapida per aggiungere Giocatori, Giocatorini e Materiale */}
      {!readOnly && (
        <div className="bg-slate-100/95 p-2.5 rounded-2xl border border-slate-200 flex flex-col gap-2 text-xs font-bold text-slate-700 shadow-2xs">
          {/* Selettore tipologia giocatori e attrezzi */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-0.5 shrink-0">Stile:</span>
              <button
                type="button"
                onClick={() => setPaletteTab('figurines')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition shrink-0 ${
                  paletteTab === 'figurines'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Piccoli Giocatorini</span>
                <span className="sm:hidden">Giocatorini</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black ml-0.5">TOP</span>
              </button>
              <button
                type="button"
                onClick={() => setPaletteTab('markers')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                  paletteTab === 'markers'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Circle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dischi Classici</span>
                <span className="sm:hidden">Dischi</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {paletteTab === 'figurines' ? 'Figurine con maglietta, pantaloncini e scarpini' : 'Cerchi tattici con numero'}
            </div>
          </div>

          {/* Riga Pulsanti Elementi */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 touch-pan-x">
            {/* FIGURINE GIOCATORINI */}
            {paletteTab === 'figurines' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_blue')}
                  title="Inserisci Giocatorino Blu sul campo"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-blue-300 text-white" />
                  <span>Giocatorino Blu</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_red')}
                  title="Inserisci Giocatorino Rosso sul campo"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-red-300 text-white" />
                  <span>Giocatorino Rosso</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_yellow')}
                  title="Inserisci Giocatorino Giallo (Jolly)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-500 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-amber-200 text-slate-950" />
                  <span>Jolly Giallo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_green')}
                  title="Inserisci Giocatorino Verde sul campo"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-emerald-300 text-white" />
                  <span>Verde</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_white')}
                  title="Inserisci Giocatorino Bianco sul campo"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-slate-100 text-slate-700" />
                  <span>Bianco</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('mini_player_gk')}
                  title="Inserisci Giocatorino Portiere (GK)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-2xs shrink-0"
                >
                  <Shirt className="w-3.5 h-3.5 fill-orange-300 text-white" />
                  <span>Portiere (GK)</span>
                </button>
              </>
            ) : (
              /* DISCHI CLASSICI */
              <>
                <button
                  type="button"
                  onClick={() => handleAddElement('player_blue')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs shrink-0"
                >
                  <Circle className="w-3.5 h-3.5 fill-white" />
                  <span>Blu (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('player_red')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow-2xs shrink-0"
                >
                  <Circle className="w-3.5 h-3.5 fill-white" />
                  <span>Rosso (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('player_yellow')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 transition shadow-2xs shrink-0"
                >
                  <Circle className="w-3.5 h-3.5 fill-slate-900" />
                  <span>Jolly (J)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('player_green')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs shrink-0"
                >
                  <Circle className="w-3.5 h-3.5 fill-white" />
                  <span>Verde</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('player_gk')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition shadow-2xs shrink-0"
                >
                  <Circle className="w-3.5 h-3.5 fill-white" />
                  <span>Portiere (GK)</span>
                </button>
              </>
            )}

            {/* Separatore */}
            <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />

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
          ref={!isFullscreen ? svgRef : undefined}
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="w-full h-auto block touch-none"
          onPointerDown={!isFullscreen ? handlePointerDown : undefined}
          onPointerMove={!isFullscreen ? handlePointerMove : undefined}
          onPointerUp={!isFullscreen ? handlePointerUp : undefined}
        >
          {/* Sfondo del campo */}
          {renderFieldBackground()}

          {/* Linee e frecce tattiche */}
          {renderLines()}

          {/* Giocatori e attrezzi posizionati */}
          <g id="tactical-elements-layer">
            {elements.map((el) => renderElement(el))}
          </g>

          {/* Riquadro di selezione trascinabile (Marquee box) */}
          {selectionBox && (
            <rect
              x={(Math.min(selectionBox.start.x, selectionBox.current.x) / 100) * VB_WIDTH}
              y={(Math.min(selectionBox.start.y, selectionBox.current.y) / 100) * VB_HEIGHT}
              width={(Math.abs(selectionBox.current.x - selectionBox.start.x) / 100) * VB_WIDTH}
              height={(Math.abs(selectionBox.current.y - selectionBox.start.y) / 100) * VB_HEIGHT}
              fill="rgba(56, 189, 248, 0.18)"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4 3"
              rx="3"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Guida visiva / Hint discreto */}
        {!readOnly && (
          <div className="absolute bottom-2 left-3 bg-slate-950/70 backdrop-blur-xs text-white/80 text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Clicca su linee o elementi per selezionarli ed eliminarli | Usa + / - per ridimensionare | Doppio click per numero</span>
            <span className="sm:hidden">Tocca elementi o frecce per gestirli | Tasto "Schermo Intero" per lavorare a pieno schermo</span>
          </div>
        )}
      </div>

      {/* PORTAL MODALITÀ SCHERMO INTERO (OTTIMIZZATO PER SMARTPHONE SU CAMPO) */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden select-none touch-none overscroll-none p-1 sm:p-2 text-white h-screen w-screen">
            {/* Header Barra Rapida Fullscreen */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-md shrink-0">
              {/* Sinistra: Chiudi Fullscreen + Campi */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Chiudi</span>
                </button>

                <div className="h-5 w-px bg-slate-700 mx-0.5 shrink-0" />

                {/* Pitch type pills */}
                <button
                  type="button"
                  onClick={() => onChangePitchType('half')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    pitchType === 'half' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Metà
                </button>
                <button
                  type="button"
                  onClick={() => onChangePitchType('full')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    pitchType === 'full' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Intero
                </button>
                <button
                  type="button"
                  onClick={() => onChangePitchType('penalty_box')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    pitchType === 'penalty_box' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Area
                </button>
                <button
                  type="button"
                  onClick={() => onChangePitchType('box')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    pitchType === 'box' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Rondo
                </button>
              </div>

              {/* Centro / Destra: Tool veloci + Undo/Clear/Download */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1 ${
                    activeTool === 'select' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Sposta</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('run');
                    handleClearSelection();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    activeTool === 'run' ? 'bg-slate-100 text-slate-900 font-black' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Corsa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pass');
                    handleClearSelection();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    activeTool === 'pass' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('dribble');
                    handleClearSelection();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    activeTool === 'dribble' ? 'bg-sky-500 text-white font-bold' : 'bg-slate-800 text-sky-300'
                  }`}
                >
                  ~ Drib
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('shot');
                    handleClearSelection();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    activeTool === 'shot' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-800 text-rose-300'
                  }`}
                >
                  Tiro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('divider');
                    handleClearSelection();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                    activeTool === 'divider' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  Divisoria
                </button>

                <div className="h-5 w-px bg-slate-700 mx-0.5 shrink-0" />

                {totalSelectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-2 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white shrink-0 flex items-center gap-1 animate-pulse"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>({totalSelectedCount})</span>
                  </button>
                )}

                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoLine}
                    title="Annulla ultima freccia"
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  title="Salva PNG"
                  className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Banner orientamento se in verticale su smartphone */}
            {isPortrait && (
              <div className="bg-amber-500/90 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg mx-auto flex items-center gap-1.5 my-0.5 shadow shrink-0">
                <Smartphone className="w-3.5 h-3.5 rotate-90 shrink-0" />
                <span>Consiglio: Ruota il telefono in orizzontale (Landscape) per avere il campo a tutto schermo!</span>
              </div>
            )}

            {/* Canvas SVG Ingrandito al massimo in Fullscreen */}
            <div className="relative flex-1 flex items-center justify-center p-0.5 sm:p-1 overflow-hidden min-h-0 w-full">
              <div className="relative w-full h-full flex items-center justify-center">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
                  className="max-h-full max-w-full aspect-[800/520] object-contain block touch-none shadow-2xl rounded-xl border-2 border-slate-800 bg-slate-900"
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

                  {/* Riquadro di selezione trascinabile (Marquee box) */}
                  {selectionBox && (
                    <rect
                      x={(Math.min(selectionBox.start.x, selectionBox.current.x) / 100) * VB_WIDTH}
                      y={(Math.min(selectionBox.start.y, selectionBox.current.y) / 100) * VB_HEIGHT}
                      width={(Math.abs(selectionBox.current.x - selectionBox.start.x) / 100) * VB_WIDTH}
                      height={(Math.abs(selectionBox.current.y - selectionBox.start.y) / 100) * VB_HEIGHT}
                      fill="rgba(56, 189, 248, 0.18)"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      rx="3"
                      pointerEvents="none"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Editor etichetta in Fullscreen */}
            {editingLabelId && (
              <div className="bg-amber-500 text-slate-950 p-2 rounded-xl flex items-center justify-between gap-2 text-xs font-bold shadow-lg shrink-0 my-0.5">
                <div className="flex items-center gap-2">
                  <span>Numero / Sigla:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    className="w-16 px-2 py-1 bg-white border border-amber-600 rounded-lg text-center font-black text-slate-900"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSaveLabel}
                    className="px-3 py-1 bg-slate-950 text-white font-bold rounded-lg hover:bg-slate-800"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLabelId(null)}
                    className="px-2 py-1 text-slate-900 font-semibold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Floating Contextual Bar for Selected Element in Fullscreen */}
            {selectedElement && !editingLabelId && (
              <div className="bg-slate-900/95 border border-emerald-500/60 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs text-white shadow-xl shrink-0 my-0.5">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="font-bold text-emerald-300 text-[11px] shrink-0">
                    {selectedElement.label || selectedElement.type}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChangeElementScale(-0.2)}
                      className="p-0.5 text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold px-1">
                      {Math.round((selectedElement.scale || 1.0) * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangeElementScale(0.2)}
                      className="p-0.5 text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {(selectedElement.type.startsWith('player') || selectedElement.type.startsWith('mini_player')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLabelId(selectedElement.id);
                        setTempLabel(selectedElement.label || '');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0"
                    >
                      N° ({selectedElement.label || '#'})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Floating Contextual Bar for Selected Line in Fullscreen */}
            {selectedLine && (
              <div className="bg-slate-900/95 border border-cyan-500/60 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs text-white shadow-xl shrink-0 my-0.5">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="font-bold text-cyan-300 text-[11px] shrink-0">
                    Linea {selectedLine.style}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleLineOrientation}
                    title="Ruota 90°"
                    className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1 border border-slate-700"
                  >
                    <RotateCw className="w-3 h-3 text-cyan-400" />
                    <span>90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeLineLength(0.85)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0 border border-slate-700"
                    title="Accorcia"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeLineLength(1.15)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0 border border-slate-700"
                    title="Allunga"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Dock inferiore per inserire Giocatori e Materiale */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-md shrink-0">
              {/* Toggle tipo figurine/dischi */}
              <button
                type="button"
                onClick={() => setPaletteTab(paletteTab === 'figurines' ? 'markers' : 'figurines')}
                className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700 shrink-0"
              >
                {paletteTab === 'figurines' ? '👕 Figurine' : '⚪ Dischi'}
              </button>

              <div className="h-5 w-px bg-slate-700 mx-0.5 shrink-0" />

              {paletteTab === 'figurines' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddElement('mini_player_blue')}
                    className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Shirt className="w-3.5 h-3.5 fill-blue-300" />
                    <span>Blu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('mini_player_red')}
                    className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Shirt className="w-3.5 h-3.5 fill-red-300" />
                    <span>Rosso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('mini_player_yellow')}
                    className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Shirt className="w-3.5 h-3.5 fill-amber-200" />
                    <span>Jolly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('mini_player_green')}
                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Shirt className="w-3.5 h-3.5 fill-emerald-300" />
                    <span>Verde</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('mini_player_gk')}
                    className="px-2 py-1 rounded-lg bg-orange-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Shirt className="w-3.5 h-3.5 fill-orange-300" />
                    <span>GK</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddElement('player_blue')}
                    className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Circle className="w-3.5 h-3.5 fill-white" />
                    <span>Blu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('player_red')}
                    className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Circle className="w-3.5 h-3.5 fill-white" />
                    <span>Rosso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('player_yellow')}
                    className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Circle className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Jolly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddElement('player_gk')}
                    className="px-2 py-1 rounded-lg bg-orange-600 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Circle className="w-3.5 h-3.5 fill-white" />
                    <span>GK</span>
                  </button>
                </>
              )}

              <div className="h-5 w-px bg-slate-700 mx-0.5 shrink-0" />

              <button
                type="button"
                onClick={() => handleAddElement('ball')}
                className="px-2 py-1 rounded-lg bg-white text-slate-900 font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <span>⚽ Palla</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('cone')}
                className="px-2 py-1 rounded-lg bg-orange-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <span>▲ Cono</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('disc_yellow')}
                className="px-2 py-1 rounded-lg bg-yellow-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <span>● Cinesino G</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('disc_red')}
                className="px-2 py-1 rounded-lg bg-red-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <span>● Cinesino R</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('mini_goal')}
                className="px-2 py-1 rounded-lg bg-slate-700 text-white font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <span>🥅 Porta</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TacticalBoard;
