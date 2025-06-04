import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

interface ResizeHandle {
  cursor: string;
  position: string;
}

const RESIZE_HANDLES: ResizeHandle[] = [
  { cursor: 'nw-resize', position: 'top-0 left-0 -translate-x-1 -translate-y-1' },
  { cursor: 'ne-resize', position: 'top-0 right-0 translate-x-1 -translate-y-1' },
  { cursor: 'sw-resize', position: 'bottom-0 left-0 -translate-x-1 translate-y-1' },
  { cursor: 'se-resize', position: 'bottom-0 right-0 translate-x-1 translate-y-1' },
];

export const ResizableImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const activeHandleRef = useRef<number | null>(null);

  const { src, alt, title, width, height } = node.attrs;

  // Calculate aspect ratio when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && !aspectRatio) {
      const naturalRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      setAspectRatio(naturalRatio);
    }
  }, [aspectRatio]);

  // Start resize operation
  const handleMouseDown = useCallback((e: React.MouseEvent, handleIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsResizing(true);
    activeHandleRef.current = handleIndex;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: width || rect.width,
      height: height || rect.height,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = RESIZE_HANDLES[handleIndex].cursor;
    document.body.style.userSelect = 'none';
  }, [width, height]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!startPosRef.current || activeHandleRef.current === null || !aspectRatio) return;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    const handleIndex = activeHandleRef.current;

    let newWidth = startPosRef.current.width;
    let newHeight = startPosRef.current.height;

    // Calculate new dimensions based on which handle is being dragged
    switch (handleIndex) {
      case 0: // top-left
        newWidth = startPosRef.current.width - deltaX;
        newHeight = startPosRef.current.height - deltaY;
        break;
      case 1: // top-right
        newWidth = startPosRef.current.width + deltaX;
        newHeight = startPosRef.current.height - deltaY;
        break;
      case 2: // bottom-left
        newWidth = startPosRef.current.width - deltaX;
        newHeight = startPosRef.current.height + deltaY;
        break;
      case 3: // bottom-right
        newWidth = startPosRef.current.width + deltaX;
        newHeight = startPosRef.current.height + deltaY;
        break;
    }

    // Maintain aspect ratio
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }

    // Minimum size constraints
    newWidth = Math.max(50, newWidth);
    newHeight = Math.max(50, newHeight);

    // Maximum size constraints (editor width)
    const maxWidth = 800; // Adjust based on your editor's max width
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    updateAttributes({
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    });
  }, [aspectRatio, updateAttributes]);

  // End resize operation
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    activeHandleRef.current = null;
    startPosRef.current = null;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  const imageStyle: React.CSSProperties = {
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%',
  };

  return (
    <NodeViewWrapper
      as="div"
      className={`relative inline-block group ${selected ? 'ring-2 ring-blue-500' : ''}`}
      ref={containerRef}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt || ''}
        title={title || ''}
        style={imageStyle}
        onLoad={handleImageLoad}
        className="block rounded-md border max-w-full h-auto"
        draggable={false}
      />
      
      {/* Resize handles - only show when selected and not resizing others */}
      {selected && !isResizing && (
        <>
          {RESIZE_HANDLES.map((handle, index) => (
            <div
              key={index}
              className={`
                absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full 
                cursor-${handle.cursor.replace('-resize', '')} 
                opacity-0 group-hover:opacity-100 transition-opacity
                ${handle.position}
              `}
              style={{ cursor: handle.cursor }}
              onMouseDown={(e) => handleMouseDown(e, index)}
            />
          ))}
        </>
      )}
      
      {/* Overlay during resize to prevent interference */}
      {isResizing && (
        <div className="absolute inset-0 bg-transparent cursor-none" />
      )}
    </NodeViewWrapper>
  );
}; 