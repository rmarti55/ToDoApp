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

const SIZE_PRESETS = [
  { name: 'Large', percentage: 100, icon: '⬜' },
  { name: 'Medium', percentage: 50, icon: '🔳' },
  { name: 'Small', percentage: 25, icon: '▫️' },
];

export const ResizableImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const activeHandleRef = useRef<number | null>(null);

  const { src, alt, title, width, height } = node.attrs;

  // Calculate container width for percentage-based presets
  useEffect(() => {
    if (containerRef.current) {
      const updateContainerWidth = () => {
        const editorElement = containerRef.current?.closest('.ProseMirror');
        if (editorElement) {
          const rect = editorElement.getBoundingClientRect();
          setContainerWidth(rect.width - 32); // Account for padding
        }
      };
      
      updateContainerWidth();
      window.addEventListener('resize', updateContainerWidth);
      return () => window.removeEventListener('resize', updateContainerWidth);
    }
  }, []);

  // Calculate aspect ratio when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && !aspectRatio) {
      const naturalRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      setAspectRatio(naturalRatio);
    }
  }, [aspectRatio]);

  // Handle image deletion
  const handleDeleteImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }, [deleteNode]);

  // Handle preset size selection
  const handlePresetSize = useCallback((percentage: number) => {
    if (!containerWidth || !aspectRatio) return;
    
    const newWidth = Math.round(containerWidth * (percentage / 100));
    const newHeight = Math.round(newWidth / aspectRatio);
    
    updateAttributes({
      width: newWidth,
      height: newHeight,
    });
    
    setShowSizeMenu(false);
  }, [containerWidth, aspectRatio, updateAttributes]);

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

    // Add event listeners to document to capture mouse events globally
    const handleMouseMove = (e: MouseEvent) => {
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

      // Maintain aspect ratio based on primary dimension change
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }

      // Apply constraints
      newWidth = Math.max(50, Math.min(containerWidth || 800, newWidth));
      newHeight = Math.max(50, newWidth / aspectRatio);

      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      activeHandleRef.current = null;
      startPosRef.current = null;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = RESIZE_HANDLES[handleIndex].cursor;
    document.body.style.userSelect = 'none';
  }, [width, height, aspectRatio, containerWidth, updateAttributes]);

  // Handle image click to show preset menu
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isResizing) {
      setShowSizeMenu(!showSizeMenu);
    }
  }, [isResizing, showSizeMenu]);

  // Close size menu when clicking outside
  useEffect(() => {
    if (showSizeMenu) {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowSizeMenu(false);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSizeMenu]);

  const imageStyle: React.CSSProperties = {
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%',
  };

  const currentPercentage = width && containerWidth ? Math.round((width / containerWidth) * 100) : 100;

  return (
    <NodeViewWrapper
      as="div"
      className={`relative inline-block group ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      ref={containerRef}
      contentEditable={false}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt || ''}
        title={title || ''}
        style={imageStyle}
        onLoad={handleImageLoad}
        onClick={handleImageClick}
        className={`block rounded-md border max-w-full h-auto cursor-pointer ${
          showSizeMenu ? 'ring-2 ring-blue-400' : ''
        }`}
        draggable={false}
      />
      
      {/* Delete button - shows on hover or when selected */}
      {(selected || showSizeMenu) && (
        <button
          onClick={handleDeleteImage}
          className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors z-20 shadow-lg"
          contentEditable={false}
          title="Delete image"
        >
          ×
        </button>
      )}
      
      {/* Resize handles - only show when selected and not showing size menu */}
      {selected && !showSizeMenu && !isResizing && aspectRatio && (
        <>
          {RESIZE_HANDLES.map((handle, index) => (
            <div
              key={index}
              className={`
                absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full 
                opacity-0 group-hover:opacity-100 transition-opacity z-10
                ${handle.position}
              `}
              style={{ cursor: handle.cursor }}
              onMouseDown={(e) => handleMouseDown(e, index)}
              contentEditable={false}
            />
          ))}
        </>
      )}

      {/* Size preset menu */}
      {showSizeMenu && (
        <div 
          className="absolute top-0 left-0 transform -translate-y-full mb-2 bg-white rounded-lg shadow-lg border p-2 z-20 min-w-[200px]"
          contentEditable={false}
        >
          <div className="text-xs text-gray-500 mb-2 font-medium">
            Image Size ({currentPercentage}%)
          </div>
          <div className="space-y-1">
            {SIZE_PRESETS.map((preset) => {
              const isActive = Math.abs(currentPercentage - preset.percentage) < 5;
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSize(preset.percentage)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3
                    ${isActive 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <span className="text-base">{preset.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-500">
                      {preset.percentage}% width
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t mt-2 pt-2">
            <div className="text-xs text-gray-500">
              Click and drag corners to resize manually
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}; 