/**
 * Core geometry engine for drone light painting.
 * Provides immutable operations on shapes with deterministic behavior.
 */

import { Point, Bounds, Shape, PathSegment } from '@/shared/types';

/**
 * Calculate the Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the length of a path defined by points.
 */
export function pathLength(points: Point[]): number {
  if (points.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Calculate the bounding box of a set of points.
 */
export function pointsBounds(points: Point[]): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get the bounding box of a shape.
 */
export function shapeBounds(shape: Shape): Bounds {
  switch (shape.type) {
    case 'line': {
      return pointsBounds([shape.start, shape.end]);
    }
    case 'polyline': {
      return pointsBounds(shape.points);
    }
    case 'rectangle': {
      return pointsBounds([
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.width, y: shape.y },
        { x: shape.x + shape.width, y: shape.y + shape.height },
        { x: shape.x, y: shape.y + shape.height },
      ]);
    }
    case 'circle': {
      return {
        minX: shape.centerX - shape.radius,
        minY: shape.centerY - shape.radius,
        maxX: shape.centerX + shape.radius,
        maxY: shape.centerY + shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    }
    case 'ellipse': {
      return {
        minX: shape.centerX - shape.radiusX,
        minY: shape.centerY - shape.radiusY,
        maxX: shape.centerX + shape.radiusX,
        maxY: shape.centerY + shape.radiusY,
        width: shape.radiusX * 2,
        height: shape.radiusY * 2,
      };
    }
    case 'triangle': {
      return pointsBounds(shape.points);
    }
    case 'text': {
      if (shape.boundingBox) {
        return shape.boundingBox;
      }
      // Fallback: estimate based on font size
      const estimatedWidth = shape.text.length * shape.fontSize * 0.6;
      const estimatedHeight = shape.fontSize;
      return {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + estimatedWidth,
        maxY: shape.y + estimatedHeight,
        width: estimatedWidth,
        height: estimatedHeight,
      };
    }
  }
}

/**
 * Get the total stroke length of a shape.
 */
export function shapeStrokeLength(shape: Shape): number {
  switch (shape.type) {
    case 'line': {
      return distance(shape.start, shape.end);
    }
    case 'polyline': {
      let length = pathLength(shape.points);
      if (shape.closed && shape.points.length > 1) {
        length += distance(shape.points[shape.points.length - 1], shape.points[0]);
      }
      return length;
    }
    case 'rectangle': {
      const perimeter = 2 * (shape.width + shape.height);
      return perimeter;
    }
    case 'circle': {
      return 2 * Math.PI * shape.radius;
    }
    case 'ellipse': {
      // Ramanujan's approximation for ellipse circumference
      const a = shape.radiusX;
      const b = shape.radiusY;
      if (a === 0 && b === 0) return 0;
      const h = Math.pow((a - b) / (a + b), 2);
      return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    }
    case 'triangle': {
      return pathLength([shape.points[0], shape.points[1], shape.points[2], shape.points[0]]);
    }
    case 'text': {
      if (shape.convertedPath) {
        return shape.convertedPath.reduce((total, path) => total + pathLength(path), 0);
      }
      return 0;
    }
  }
}

/**
 * Convert a shape to a series of path segments for export.
 * This preserves stroke order and geometry exactly.
 */
export function shapeToPathSegments(shape: Shape): PathSegment[] {
  const segments: PathSegment[] = [];
  
  switch (shape.type) {
    case 'line': {
      segments.push({
        points: [shape.start, shape.end],
        isStroke: true,
      });
      break;
    }
    case 'polyline': {
      segments.push({
        points: [...shape.points],
        isStroke: true,
      });
      if (shape.closed && shape.points.length > 1) {
        segments.push({
          points: [shape.points[shape.points.length - 1], shape.points[0]],
          isStroke: true,
        });
      }
      break;
    }
    case 'rectangle': {
      const p1 = { x: shape.x, y: shape.y };
      const p2 = { x: shape.x + shape.width, y: shape.y };
      const p3 = { x: shape.x + shape.width, y: shape.y + shape.height };
      const p4 = { x: shape.x, y: shape.y + shape.height };
      segments.push({
        points: [p1, p2, p3, p4, p1],
        isStroke: true,
      });
      break;
    }
    case 'circle': {
      const points = approximateCircle(shape.centerX, shape.centerY, shape.radius);
      segments.push({
        points,
        isStroke: true,
      });
      break;
    }
    case 'ellipse': {
      const points = approximateEllipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, shape.rotation);
      segments.push({
        points,
        isStroke: true,
      });
      break;
    }
    case 'triangle': {
      segments.push({
        points: [shape.points[0], shape.points[1], shape.points[2], shape.points[0]],
        isStroke: true,
      });
      break;
    }
    case 'text': {
      if (shape.convertedPath) {
        for (const path of shape.convertedPath) {
          segments.push({
            points: [...path],
            isStroke: true,
          });
        }
      }
      break;
    }
  }
  
  return segments;
}

/**
 * Approximate a circle with line segments.
 * Uses a fixed number of segments for consistency.
 */
function approximateCircle(cx: number, cy: number, radius: number, segments: number = 64): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Approximate an ellipse with line segments.
 */
function approximateEllipse(cx: number, cy: number, rx: number, ry: number, rotation?: number, segments: number = 64): Point[] {
  const points: Point[] = [];
  const cosRot = rotation ? Math.cos(rotation * Math.PI / 180) : 1;
  const sinRot = rotation ? Math.sin(rotation * Math.PI / 180) : 0;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = rx * Math.cos(angle);
    const y = ry * Math.sin(angle);
    
    // Apply rotation
    const rotatedX = x * cosRot - y * sinRot;
    const rotatedY = x * sinRot + y * cosRot;
    
    points.push({
      x: cx + rotatedX,
      y: cy + rotatedY,
    });
  }
  return points;
}

/**
 * Get all endpoints from a shape (for snapping).
 */
export function shapeEndpoints(shape: Shape): Point[] {
  switch (shape.type) {
    case 'line': {
      return [shape.start, shape.end];
    }
    case 'polyline': {
      if (!shape.points.length) return [];
      return shape.closed 
        ? shape.points 
        : [shape.points[0], shape.points[shape.points.length - 1]];
    }
    case 'rectangle': {
      return [
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.width, y: shape.y },
        { x: shape.x + shape.width, y: shape.y + shape.height },
        { x: shape.x, y: shape.y + shape.height },
      ];
    }
    case 'circle':
    case 'ellipse': {
      // Circles and ellipses don't have discrete endpoints for snapping
      return [];
    }
    case 'triangle': {
      return [...shape.points];
    }
    case 'text': {
      // Text endpoints are the corners of the bounding box
      const bounds = shapeBounds(shape);
      return [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
        { x: bounds.minX, y: bounds.maxY },
      ];
    }
  }
}

/**
 * Get all anchor points from a shape (including midpoints for snapping).
 */
export function shapeAnchors(shape: Shape): Point[] {
  const endpoints = shapeEndpoints(shape);
  const anchors: Point[] = [...endpoints];
  
  // Add midpoints for lines and polylines
  if (shape.type === 'line') {
    anchors.push({
      x: (shape.start.x + shape.end.x) / 2,
      y: (shape.start.y + shape.end.y) / 2,
    });
  } else if (shape.type === 'polyline' && shape.points.length > 1) {
    for (let i = 0; i < shape.points.length - 1; i++) {
      anchors.push({
        x: (shape.points[i].x + shape.points[i + 1].x) / 2,
        y: (shape.points[i].y + shape.points[i + 1].y) / 2,
      });
    }
  }
  
  return anchors;
}

/**
 * Calculate geometry statistics for a collection of shapes.
 */
export function geometryStats(shapes: Shape[]) {
  let totalStrokeLength = 0;
  let strokeCount = 0;
  let segmentCount = 0;
  
  const allBounds = shapes.map(shapeBounds);
  
  if (allBounds.length > 0) {
    const overallBounds = pointsBounds(
      allBounds.flatMap(b => [
        { x: b.minX, y: b.minY },
        { x: b.maxX, y: b.maxY },
      ])
    );
    
    for (const shape of shapes) {
      totalStrokeLength += shapeStrokeLength(shape);
      strokeCount++;
      const segments = shapeToPathSegments(shape);
      segmentCount += segments.length;
    }
    
    return {
      totalStrokeLength,
      strokeCount,
      segmentCount,
      bounds: overallBounds,
    };
  }
  
  return {
    totalStrokeLength: 0,
    strokeCount: 0,
    segmentCount: 0,
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
  };
}
