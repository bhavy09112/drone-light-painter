import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../editor/editorState';
import { Shape, Point, ToolType } from '@/shared/types';
import { findSnapPoint } from '../snapping/snappingEngine';
import { shapeBounds } from '../geometry/geometryEngine';

const CanvasEditor: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { shapes, selectedIds, pan, zoom, snapEnabled, snapDistance, selectShape, clearSelection, currentTool, addShape, setPan, updateShape, selectMultiple, checkpoint } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point>({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isShapeDragging, setIsShapeDragging] = useState(false);
  const [shapeDragStart, setShapeDragStart] = useState<Point>({ x: 0, y: 0 });
  const [initialShapePositions, setInitialShapePositions] = useState<Map<string, Shape>>(new Map());

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const state = useEditorStore.getState();
      const next = Math.min(5, Math.max(0.1, state.zoom * Math.exp(-e.deltaY * 0.001)));
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      state.setPan({ x: x - (x - state.pan.x) * next / state.zoom,
        y: y - (y - state.pan.y) * next / state.zoom });
      state.setZoom(next);
    };

    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false });
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const rect = svg.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    const point = { x, y };
    return snapEnabled && currentTool !== 'select' ? findSnapPoint(point, shapes, undefined, snapDistance / zoom).point : point;
  };

  // Hit test for a point against a shape
  const hitTestShape = (point: Point, shape: Shape): boolean => {
    const bounds = shapeBounds(shape);
    const padding = 5 / zoom; // 5px padding in screen space

    return (
      point.x >= bounds.minX - padding &&
      point.x <= bounds.maxX + padding &&
      point.y >= bounds.minY - padding &&
      point.y <= bounds.maxY + padding
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+click for panning
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      const canvasPoint = screenToCanvas(e.clientX, e.clientY);

      if (currentTool === 'select') {
        // Selection mode
        const clickedShape = [...shapes].sort((a, b) => b.zIndex - a.zIndex).find(shape => hitTestShape(canvasPoint, shape));

        if (clickedShape) {
          const ids = e.shiftKey
            ? (selectedIds.includes(clickedShape.id) ? selectedIds.filter(id => id !== clickedShape.id) : [...selectedIds, clickedShape.id])
            : selectedIds.includes(clickedShape.id) ? selectedIds : [clickedShape.id];
          selectMultiple(ids);
          if (ids.includes(clickedShape.id)) {
            checkpoint();
            setIsShapeDragging(true);
            setShapeDragStart(canvasPoint);
            setInitialShapePositions(new Map(shapes.filter(s => ids.includes(s.id)).map(s => [s.id, s])));
          }
        } else {
          clearSelection();
        }
      } else {
        // Drawing mode
        setIsDrawing(true);
        setDrawStart(canvasPoint);
        clearSelection();

        // Create initial shape based on tool
        const newShape = createShape(currentTool, canvasPoint, canvasPoint);
        setCurrentShape(newShape);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // Update pan
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isShapeDragging) {
      // Update shape positions
      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      const dx = canvasPoint.x - shapeDragStart.x;
      const dy = canvasPoint.y - shapeDragStart.y;

      selectedIds.forEach(id => {
        const initialShape = initialShapePositions.get(id);
        if (initialShape) {
          const updatedShape = moveShape(initialShape, dx, dy);
          updateShape(id, updatedShape, false);
        }
      });
    } else if (isDrawing && currentShape) {
      // Update shape being drawn
      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      const updatedShape = updateShapeBeingDrawn(currentShape, drawStart, canvasPoint);
      setCurrentShape(updatedShape);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    } else if (isShapeDragging) {
      setIsShapeDragging(false);
      setInitialShapePositions(new Map());
    } else if (isDrawing && currentShape) {
      // Finish drawing and add shape
      addShape(currentShape);
      setIsDrawing(false);
      setCurrentShape(null);
      selectShape(currentShape.id);
    }
  };

  // Helper: Move a shape by delta
  const moveShape = (shape: Shape, dx: number, dy: number): Shape => {
    switch (shape.type) {
      case 'line':
        return {
          ...shape,
          start: { x: shape.start.x + dx, y: shape.start.y + dy },
          end: { x: shape.end.x + dx, y: shape.end.y + dy },
        };
      case 'polyline':
        return {
          ...shape,
          points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        };
      case 'rectangle':
        return {
          ...shape,
          x: shape.x + dx,
          y: shape.y + dy,
        };
      case 'circle':
        return {
          ...shape,
          centerX: shape.centerX + dx,
          centerY: shape.centerY + dy,
        };
      case 'ellipse':
        return {
          ...shape,
          centerX: shape.centerX + dx,
          centerY: shape.centerY + dy,
        };
      case 'triangle':
        return {
          ...shape,
          points: [
            { x: shape.points[0].x + dx, y: shape.points[0].y + dy },
            { x: shape.points[1].x + dx, y: shape.points[1].y + dy },
            { x: shape.points[2].x + dx, y: shape.points[2].y + dy },
          ],
        };
      case 'text':
        return {
          ...shape,
          x: shape.x + dx,
          y: shape.y + dy,
          convertedPath: shape.convertedPath?.map(path => path.map(p => ({ x: p.x + dx, y: p.y + dy }))),
        };
    }
  };

  // Helper: Create initial shape based on tool
  const createShape = (tool: ToolType, start: Point, end: Point): Shape => {
    const id = crypto.randomUUID();
    const zIndex = Math.max(...shapes.map(s => s.zIndex), 0) + 1;

    switch (tool) {
      case 'line':
        return {
          id,
          type: 'line',
          start,
          end,
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
      case 'rectangle':
        return {
          id,
          type: 'rectangle',
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
      case 'circle':
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        return {
          id,
          type: 'circle',
          centerX: start.x,
          centerY: start.y,
          radius,
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
      case 'ellipse':
        return {
          id,
          type: 'ellipse',
          centerX: start.x,
          centerY: start.y,
          radiusX: Math.abs(end.x - start.x),
          radiusY: Math.abs(end.y - start.y),
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
      case 'triangle':
        return {
          id,
          type: 'triangle',
          points: [
            start,
            { x: end.x, y: start.y },
            { x: (start.x + end.x) / 2, y: end.y },
          ],
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
      case 'polyline':
        return {
          id,
          type: 'polyline',
          points: [start, end],
          strokeThickness: 2,
          closed: false,
          selected: false,
          zIndex,
        };
      case 'text':
        return {
          id,
          type: 'text',
          x: start.x,
          y: start.y,
          text: 'Text',
          fontFamily: 'Arial',
          fontSize: 24,
          fontWeight: 'normal',
          fontStyle: 'normal',
          alignment: 'left',
          selected: false,
          zIndex,
        };
      default:
        return {
          id,
          type: 'line',
          start,
          end,
          strokeThickness: 2,
          selected: false,
          zIndex,
        };
    }
  };

  // Helper: Update shape being drawn
  const updateShapeBeingDrawn = (shape: Shape, start: Point, end: Point): Shape => {
    switch (shape.type) {
      case 'line':
        return { ...shape, end };
      case 'rectangle':
        return {
          ...shape,
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        };
      case 'circle':
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        return { ...shape, radius };
      case 'ellipse':
        return {
          ...shape,
          radiusX: Math.abs(end.x - start.x),
          radiusY: Math.abs(end.y - start.y),
        };
      case 'triangle':
        return {
          ...shape,
          points: [
            start,
            { x: end.x, y: start.y },
            { x: (start.x + end.x) / 2, y: end.y },
          ],
        };
      case 'polyline':
        return { ...shape, points: [...shape.points, end] };
      default:
        return shape;
    }
  };

  const renderShape = (shape: Shape) => {
    const isSelected = selectedIds.includes(shape.id);
    const strokeColor = isSelected ? '#00ff00' : '#ffffff';
    const strokeWidth = isSelected ? 3 : 2;

    switch (shape.type) {
      case 'line':
        return (
          <line
            key={shape.id}
            x1={shape.start.x}
            y1={shape.start.y}
            x2={shape.end.x}
            y2={shape.end.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        );
      case 'polyline':
        const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
        return (
          <polyline
            key={shape.id}
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={shape.closed ? 'none' : '5,5'}
          />
        );
      case 'rectangle':
        return (
          <rect
            key={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            transform={shape.rotation ? `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})` : undefined}
          />
        );
      case 'circle':
        return (
          <circle
            key={shape.id}
            cx={shape.centerX}
            cy={shape.centerY}
            r={shape.radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        );
      case 'ellipse':
        return (
          <ellipse
            key={shape.id}
            cx={shape.centerX}
            cy={shape.centerY}
            rx={shape.radiusX}
            ry={shape.radiusY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            transform={shape.rotation ? `rotate(${shape.rotation} ${shape.centerX} ${shape.centerY})` : undefined}
          />
        );
      case 'triangle':
        const trianglePoints = shape.points.map(p => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={shape.id}
            points={trianglePoints}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        );
      case 'text':
        if (shape.convertedPath) return <g key={shape.id}>{shape.convertedPath.map((path, i) =>
          <polyline key={i} points={path.map(p => `${p.x},${p.y}`).join(' ')} stroke={strokeColor} fill="none" />)}</g>;
        // Map alignment to SVG textAnchor
        const textAnchorMap: Record<string, 'start' | 'middle' | 'end'> = {
          'left': 'start',
          'center': 'middle',
          'right': 'end',
        };
        return (
          <text
            key={shape.id}
            x={shape.x}
            y={shape.y}
            fontSize={shape.fontSize}
            fontFamily={shape.fontFamily}
            fontWeight={shape.fontWeight}
            fontStyle={shape.fontStyle}
            fill={strokeColor}
            textAnchor={textAnchorMap[shape.alignment] || 'start'}
            transform={shape.rotation ? `rotate(${shape.rotation} ${shape.x} ${shape.y})` : undefined}
          >
            {shape.text}
          </text>
        );
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a1a', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : isDrawing ? 'crosshair' : currentTool === 'select' ? 'default' : 'crosshair' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Grid */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#333" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)" />

          {/* Shapes */}
          {[...shapes].sort((a, b) => a.zIndex - b.zIndex).map(renderShape)}

          {/* Shape being drawn */}
          {currentShape && renderShape(currentShape)}

          {/* Selection box */}
          {selectedIds.length > 0 && (
            <g>
              {selectedIds.map(id => {
                const shape = shapes.find(s => s.id === id);
                if (!shape) return null;
                const bounds = shapeBounds(shape);
                return (
                  <rect
                    key={id}
                    x={bounds.minX - 5}
                    y={bounds.minY - 5}
                    width={bounds.width + 10}
                    height={bounds.height + 10}
                    stroke="#00ff00"
                    strokeWidth={1}
                    fill="none"
                    strokeDasharray="5,5"
                  />
                );
              })}
            </g>
          )}
        </g>
      </svg>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#fff',
      }}>
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>

      {/* Snap indicator */}
      {snapEnabled && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '100px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#fff',
        }}>
          Snap: {snapDistance}px
        </div>
      )}
    </div>
  );
};

export default CanvasEditor;
