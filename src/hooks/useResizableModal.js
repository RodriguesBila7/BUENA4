import { useState, useEffect, useRef } from 'react';

/**
 * Hook para suporte nativo a expansão, redimensionamento por arrasto de rato
 * e duplo clique/botão de maximizar em modais e sub-abas.
 */
export default function useResizableModal({ defaultWidth = '520px', minWidth = 380, minHeight = 260 } = {}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [customSize, setCustomSize] = useState(null); // { width, height }
  const [isResizing, setIsResizing] = useState(false);

  const modalRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, startW: 0, startH: 0 });
  const mouseDownTargetRef = useRef(null);
  const justResizedRef = useRef(false);

  // Drag modal handler (Header)
  const onPointerDown = (e) => {
    if (isMaximized) return;
    if (!e.target.closest('.drag-handle')) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging]);

  // Resize handler (Canto inferior direito com o rato)
  const handleResizePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: rect.width,
      startH: rect.height
    };
    setIsResizing(true);
    justResizedRef.current = true;
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();
      const deltaX = e.clientX - resizeStartRef.current.mouseX;
      const deltaY = e.clientY - resizeStartRef.current.mouseY;

      const newW = Math.max(minWidth, Math.min(window.innerWidth * 0.98, resizeStartRef.current.startW + deltaX));
      const newH = Math.max(minHeight, Math.min(window.innerHeight * 0.96, resizeStartRef.current.startH + deltaY));

      setCustomSize({ width: `${newW}px`, height: `${newH}px` });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      setTimeout(() => {
        justResizedRef.current = false;
      }, 300);
    };

    if (isResizing) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, minWidth, minHeight]);

  // Duplo clique no cabeçalho para maximizar / restaurar
  const handleHeaderDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) return;
    setIsMaximized(prev => !prev);
    setCustomSize(null);
  };

  const toggleMaximize = (e) => {
    if (e) e.stopPropagation();
    setIsMaximized(prev => !prev);
    setCustomSize(null);
  };

  // Proteção do overlay para não fechar acidentalmente ao soltar o rato após arrastar
  const getOverlayProps = (onClose) => ({
    onMouseDown: (e) => {
      mouseDownTargetRef.current = e.target;
    },
    onClick: (e) => {
      if (isResizing || justResizedRef.current) return;
      if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
        if (onClose) onClose();
      }
    }
  });

  const modalStyle = {
    position: 'relative',
    width: isMaximized ? '98vw' : (customSize?.width || defaultWidth),
    maxWidth: isMaximized ? '98vw' : '96vw',
    height: isMaximized ? '94vh' : (customSize?.height || 'auto'),
    maxHeight: isMaximized ? '94vh' : '90vh',
    transform: isMaximized ? 'translate(0px, 0px)' : `translate(${position.x}px, ${position.y}px)`,
    transition: isResizing || isDragging ? 'none' : 'width 0.18s ease, height 0.18s ease, max-width 0.18s ease'
  };

  return {
    modalRef,
    position,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    setIsMaximized,
    customSize,
    isResizing,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  };
}
