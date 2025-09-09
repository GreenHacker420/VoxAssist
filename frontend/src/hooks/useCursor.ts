import { useEffect, useCallback } from 'react';

export type CursorType = 'default' | 'pointer' | 'text' | 'loading' | 'grab' | 'grabbing';

interface CursorOptions {
  hotspotX?: number;
  hotspotY?: number;
  fallback?: string;
}

/**
 * Custom hook for managing cursor states in VoxAssist
 * Provides dynamic cursor changes with glassmorphism-styled cursors
 */
export function useCursor() {
  const setCursor = useCallback((
    type: CursorType, 
    element?: HTMLElement | null,
    options: CursorOptions = {}
  ) => {
    const { hotspotX = 12, hotspotY = 12, fallback = 'auto' } = options;
    const target = element || document.body;
    
    if (!target) return;

    const cursorUrl = `/cursors/${type}.svg`;
    const cursorValue = `url('${cursorUrl}') ${hotspotX} ${hotspotY}, ${fallback}`;
    
    target.style.cursor = cursorValue;
  }, []);

  const resetCursor = useCallback((element?: HTMLElement | null) => {
    const target = element || document.body;
    if (!target) return;
    
    target.style.cursor = '';
  }, []);

  const setLoadingCursor = useCallback((element?: HTMLElement | null) => {
    setCursor('loading', element, { fallback: 'wait' });
  }, [setCursor]);

  const setPointerCursor = useCallback((element?: HTMLElement | null) => {
    setCursor('pointer', element, { fallback: 'pointer' });
  }, [setCursor]);

  const setTextCursor = useCallback((element?: HTMLElement | null) => {
    setCursor('text', element, { fallback: 'text' });
  }, [setCursor]);

  const setGrabCursor = useCallback((element?: HTMLElement | null) => {
    setCursor('grab', element, { fallback: 'grab' });
  }, [setCursor]);

  const setGrabbingCursor = useCallback((element?: HTMLElement | null) => {
    setCursor('grabbing', element, { fallback: 'grabbing' });
  }, [setCursor]);

  return {
    setCursor,
    resetCursor,
    setLoadingCursor,
    setPointerCursor,
    setTextCursor,
    setGrabCursor,
    setGrabbingCursor,
  };
}

/**
 * Hook for managing cursor state during async operations
 */
export function useAsyncCursor() {
  const { setLoadingCursor, resetCursor } = useCursor();

  const withLoadingCursor = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    element?: HTMLElement | null
  ): Promise<T> => {
    setLoadingCursor(element);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      resetCursor(element);
    }
  }, [setLoadingCursor, resetCursor]);

  return { withLoadingCursor };
}

/**
 * Hook for managing cursor state during drag operations
 */
export function useDragCursor() {
  const { setGrabCursor, setGrabbingCursor, resetCursor } = useCursor();

  const handleDragStart = useCallback((element?: HTMLElement | null) => {
    setGrabbingCursor(element);
  }, [setGrabbingCursor]);

  const handleDragEnd = useCallback((element?: HTMLElement | null) => {
    resetCursor(element);
  }, [resetCursor]);

  const handleDragEnter = useCallback((element?: HTMLElement | null) => {
    setGrabCursor(element);
  }, [setGrabCursor]);

  return {
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
  };
}

/**
 * Hook for managing cursor state based on element interactions
 */
export function useInteractiveCursor(
  ref: React.RefObject<HTMLElement>,
  type: CursorType = 'pointer'
) {
  const { setCursor, resetCursor } = useCursor();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => setCursor(type, element);
    const handleMouseLeave = () => resetCursor(element);

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, type, setCursor, resetCursor]);
}

/**
 * Hook for managing global cursor state
 */
export function useGlobalCursor() {
  const { setCursor, resetCursor } = useCursor();

  const setGlobalCursor = useCallback((type: CursorType) => {
    setCursor(type, document.body);
  }, [setCursor]);

  const resetGlobalCursor = useCallback(() => {
    resetCursor(document.body);
  }, [resetCursor]);

  return {
    setGlobalCursor,
    resetGlobalCursor,
  };
}

export default useCursor;
