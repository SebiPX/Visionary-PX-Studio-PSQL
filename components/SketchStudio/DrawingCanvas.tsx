import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface DrawingCanvasProps {
  onCanvasReady: (getDataUrl: () => string) => void;
}

export interface CanvasRef {
  getSnapshot: () => string;
}

const DrawingCanvas = forwardRef<CanvasRef, DrawingCanvasProps>(({ onCanvasReady }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(3);

  // History State
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const MAX_HISTORY = 20;

  // Initialize canvas with proper scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      // Set canvas size to match container
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Save initial state
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryStep(0);

      return true;
    };

    // Try initial setup
    if (!setupCanvas()) {
      // If failed, wait for resize
      const resizeObserver = new ResizeObserver(() => {
        if (setupCanvas()) {
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    // Setup resize observer for future resizes
    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Store current content
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx.drawImage(canvas, 0, 0);

          // Resize
          canvas.width = rect.width;
          canvas.height = rect.height;

          // Restore
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, rect.width, rect.height);
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return '';
    }
  }));

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history[newStep]) {
        ctx.putImageData(history[newStep], 0, 0);
        setHistoryStep(newStep);
      }
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history[newStep]) {
        ctx.putImageData(history[newStep], 0, 0);
        setHistoryStep(newStep);
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyStep]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#000000';
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
    }
    saveToHistory();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#000000';
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg shadow-md border border-border/50">
        <div className="flex gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded transition-colors ${tool === 'pen' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            title="Pen"
          >
            <span className="material-icons-round">edit</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            title="Eraser"
          >
            <span className="material-icons-round">auto_fix_high</span>
          </button>

          <div className="w-px h-8 bg-secondary mx-2"></div>

          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24 h-2 bg-secondary rounded-lg appearance-none cursor-pointer self-center accent-[#135bec]"
            title="Brush Size"
          />

          <div className="w-px h-8 bg-secondary mx-2"></div>

          <button
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className={`p-2 rounded transition-colors ${historyStep <= 0
              ? 'text-muted-foreground/80 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            title="Undo (Ctrl+Z)"
          >
            <span className="material-icons-round">undo</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className={`p-2 rounded transition-colors ${historyStep >= history.length - 1
              ? 'text-muted-foreground/80 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            title="Redo (Ctrl+Y)"
          >
            <span className="material-icons-round">redo</span>
          </button>
        </div>

        <button
          onClick={clearCanvas}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
          title="Clear Canvas"
        >
          <span className="material-icons-round">delete</span>
        </button>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-white rounded-lg overflow-hidden shadow-inner cursor-crosshair border-2 border-dashed border-border/50 hover:border-[#135bec]/50 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="absolute top-0 left-0 w-full h-full touch-none"
        />
        <div className="absolute bottom-2 right-2 pointer-events-none text-foreground/90 text-xs opacity-50 bg-black/10 px-2 py-1 rounded">
          Draw here
        </div>
      </div>
    </div>
  );
});

export default DrawingCanvas;
