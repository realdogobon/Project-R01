import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';

export const ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT = 'royscript-window-geometry-reset';

export function resetPersistedFloatingWindowGeometry() {
  if (typeof window === 'undefined') return;

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('lexkit_window_')) {
        localStorage.removeItem(key);
      }
    }
  } catch {}

  window.dispatchEvent(new Event(ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT));
}

interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

function createDefaultWindowState(initialWidth: number, initialHeight: number): WindowState {
  return {
    width: initialWidth,
    height: initialHeight,
    x: Math.max(0, (window.innerWidth - initialWidth) / 2),
    y: Math.max(0, (window.innerHeight - initialHeight) / 2),
  };
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
    const defaultState = createDefaultWindowState(initialWidth, initialHeight);

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
            return defaultState;
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse saved window state", e);
        }
      }
    }

    return defaultState;
  });

  const [resizing, setResizing] = useState<ResizeDirection>(null);
  const latestStateRef = useRef(state);
  const resizeDirectionRef = useRef<ResizeDirection>(null);
  const startPos = useRef<{ x: number; y: number; width: number; height: number; winX: number; winY: number } | null>(null);
  const pendingStateRef = useRef<WindowState | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);

  const applyWindowGeometry = useCallback((nextState: WindowState) => {
    const windowElement = windowRef.current;
    if (!windowElement) return;

    windowElement.style.width = `${nextState.width}px`;
    windowElement.style.height = `${nextState.height}px`;
    windowElement.style.left = `${nextState.x}px`;
    windowElement.style.top = `${nextState.y}px`;
  }, []);

  const flushPendingState = useCallback(() => {
    const pendingState = pendingStateRef.current;
    pendingStateRef.current = null;
    if (pendingState) {
      setState(pendingState);
    }
  }, []);

  const queueState = useCallback((nextState: WindowState) => {
    latestStateRef.current = nextState;
    applyWindowGeometry(nextState);
    pendingStateRef.current = nextState;
  }, [applyWindowGeometry]);

  const resetToFactoryGeometry = useCallback(() => {
    const nextState = createDefaultWindowState(initialWidth, initialHeight);
    pendingStateRef.current = null;
    latestStateRef.current = nextState;
    resizeDirectionRef.current = null;
    startPos.current = null;
    applyWindowGeometry(nextState);
    setState(nextState);
    setResizing(null);
  }, [applyWindowGeometry, initialHeight, initialWidth]);

  const startResize = useCallback((direction: ResizeDirection, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    flushPendingState();
    const latestState = latestStateRef.current;
    resizeDirectionRef.current = direction;
    setResizing(direction);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: latestState.width,
      height: latestState.height,
      winX: latestState.x,
      winY: latestState.y,
    };
  }, [flushPendingState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const direction = resizeDirectionRef.current;
    if (!direction || !startPos.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    let newWidth = startPos.current.width;
    let newHeight = startPos.current.height;
    let newX = startPos.current.winX;
    let newY = startPos.current.winY;

    if (direction === 'move') {
      newX = startPos.current.winX + dx;
      newY = startPos.current.winY + dy;
      newY = Math.max(0, newY);
      newX = Math.max(-newWidth + 100, Math.min(newX, window.innerWidth - 100));
    } else {
      if (direction.includes('e')) newWidth = Math.max(minWidth, startPos.current.width + dx);
      if (direction.includes('w')) {
        newWidth = Math.max(minWidth, startPos.current.width - dx);
        newX = startPos.current.winX + (startPos.current.width - newWidth);
      }
      if (direction.includes('s')) newHeight = Math.max(minHeight, startPos.current.height + dy);
      if (direction.includes('n')) {
        newHeight = Math.max(minHeight, startPos.current.height - dy);
        newY = startPos.current.winY + (startPos.current.height - newHeight);
      }
    }

    queueState({ width: newWidth, height: newHeight, x: newX, y: newY });
  }, [minWidth, minHeight, queueState]);

  const stopResize = useCallback(() => {
    if (!resizeDirectionRef.current) return;

    flushPendingState();
    const finalState = latestStateRef.current;
    if (persistKey) {
      localStorage.setItem(`lexkit_window_${persistKey}`, JSON.stringify(finalState));
    }

    resizeDirectionRef.current = null;
    setResizing(null);
    startPos.current = null;
  }, [flushPendingState, persistKey]);

  const fitToSize = useCallback((requestedWidth: number, requestedHeight: number) => {
    const maxWidth = Math.max(minWidth, window.innerWidth - 24);
    const maxHeight = Math.max(minHeight, window.innerHeight - 24);
    const nextWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, requestedWidth)));
    const nextHeight = Math.round(Math.min(maxHeight, Math.max(minHeight, requestedHeight)));
    const nextX = Math.max(0, Math.round((window.innerWidth - nextWidth) / 2));
    const nextY = Math.max(0, Math.round((window.innerHeight - nextHeight) / 2));

    const nextState = { width: nextWidth, height: nextHeight, x: nextX, y: nextY };
    flushPendingState();
    latestStateRef.current = nextState;
    applyWindowGeometry(nextState);
    setState(nextState);
    if (persistKey) {
      localStorage.setItem(`lexkit_window_${persistKey}`, JSON.stringify(nextState));
    }
  }, [applyWindowGeometry, flushPendingState, minHeight, minWidth, persistKey]);

  useLayoutEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('blur', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
      window.removeEventListener('blur', stopResize);
    };
  }, [handleMouseMove, stopResize]);

  useEffect(() => {
    window.addEventListener(ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT, resetToFactoryGeometry);
    return () => window.removeEventListener(ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT, resetToFactoryGeometry);
  }, [resetToFactoryGeometry]);

  return {
    ...state,
    resizing,
    startResize,
    setState,
    fitToSize,
    windowRef,
  };
}
