import React, { useState, useEffect, useCallback, useRef } from 'react';

interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface UseResizableOptions {
  minWidth?: number;
  minHeight?: number;
  persistKey?: string;
  initialWidth?: number;
  initialHeight?: number;
}

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move' | null;

export function useResizable(options: UseResizableOptions = {}) {
  const {
    minWidth = 400,
    minHeight = 300,
    persistKey,
    initialWidth = 1000,
    initialHeight = 720,
  } = options;

  const [state, setState] = useState<WindowState>(() => {
    const centerX = Math.max(0, (window.innerWidth - initialWidth) / 2);
    const centerY = Math.max(0, (window.innerHeight - initialHeight) / 2);

    if (persistKey) {
      const saved = localStorage.getItem(`lexkit_window_${persistKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          const isStuck = (parsed.x === 0 && parsed.y === 0) ||
                          (parsed.y < -20) ||
                          (parsed.x > window.innerWidth - 50) ||
                          (parsed.x < -parsed.width + 50) ||
                          (parsed.width > window.innerWidth * 0.95) ||
                          (parsed.height > window.innerHeight * 0.95) ||
                          (parsed.width === 940 || parsed.width === 920);

          if (isStuck) {
            return { width: initialWidth, height: initialHeight, x: centerX, y: centerY };
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse saved window state", e);
        }
      }
    }

    return {
      width: initialWidth,
      height: initialHeight,
      x: centerX,
      y: centerY,
    };
  });

  const [resizing, setResizing] = useState<ResizeDirection>(null);
  const startPos = useRef<{ x: number; y: number; width: number; height: number; winX: number; winY: number } | null>(null);

  const startResize = useCallback((direction: ResizeDirection, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setResizing(direction);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: state.width,
      height: state.height,
      winX: state.x,
      winY: state.y,
    };
  }, [state]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing || !startPos.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    let newWidth = startPos.current.width;
    let newHeight = startPos.current.height;
    let newX = startPos.current.winX;
    let newY = startPos.current.winY;

    if (resizing === 'move') {
      newX = startPos.current.winX + dx;
      newY = startPos.current.winY + dy;
      newY = Math.max(0, newY);
      newX = Math.max(-newWidth + 100, Math.min(newX, window.innerWidth - 100));
    } else {
      if (resizing.includes('e')) newWidth = Math.max(minWidth, startPos.current.width + dx);
      if (resizing.includes('w')) {
        const potentialWidth = Math.max(minWidth, startPos.current.width - dx);
        if (potentialWidth !== state.width) {
          newWidth = potentialWidth;
          newX = startPos.current.winX + (startPos.current.width - potentialWidth);
        }
      }
      if (resizing.includes('s')) newHeight = Math.max(minHeight, startPos.current.height + dy);
      if (resizing.includes('n')) {
        const potentialHeight = Math.max(minHeight, startPos.current.height - dy);
        if (potentialHeight !== state.height) {
          newHeight = potentialHeight;
          newY = startPos.current.winY + (startPos.current.height - potentialHeight);
        }
      }
    }

    setState({ width: newWidth, height: newHeight, x: newX, y: newY });
  }, [resizing, state.width, state.height, minWidth, minHeight]);

  const stopResize = useCallback(async () => {
    if (resizing && persistKey) {
      localStorage.setItem(`lexkit_window_${persistKey}`, JSON.stringify(state));
    }
    setResizing(null);
    startPos.current = null;
  }, [resizing, persistKey, state]);

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResize);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopResize);
      };
    }
  }, [resizing, handleMouseMove, stopResize]);

  return {
    ...state,
    resizing,
    startResize,
    setState
  };
}
