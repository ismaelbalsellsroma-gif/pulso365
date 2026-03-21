import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomableImageProps {
  src: string;
  alt?: string;
}

export function ZoomableImage({ src, alt = 'Imagen' }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = () => setScale(s => Math.min(s + 0.3, 5));
  const zoomOut = () => setScale(s => Math.max(s - 0.3, 0.3));

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.min(Math.max(s + delta, 0.3), 5));
  }, []);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragging && e.touches.length === 1) {
      e.preventDefault();
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => setDragging(false);

  // Double click to zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      reset();
    } else {
      setScale(2.5);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1 shadow-md border">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Zoom +">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Zoom -">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} title="Restablecer">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <a href={src} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir original">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {/* Zoom level indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-2 left-2 z-10 bg-card/90 backdrop-blur-sm rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground border shadow-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="select-none transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}
