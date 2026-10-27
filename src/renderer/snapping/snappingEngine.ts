/**
 * Magnetic snapping engine for the drone light painting editor.
 * Provides endpoint and anchor snapping with configurable distance.
 */

import { Point, Shape } from '@/shared/types';
import { shapeEndpoints, shapeAnchors, distance } from '@/renderer/geometry/geometryEngine';

export interface SnapResult {
  snapped: boolean;
  point: Point;
  targetPoint?: Point;
  targetShapeId?: string;
  guideLines?: SnapGuide[];
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical' | 'point';
  position: number;
}

/**
 * Find the nearest snap point for a given point.
 */
export function findSnapPoint(
  point: Point,
  shapes: Shape[],
  excludeShapeId?: string,
  snapDistance: number = 10
): SnapResult {
  const allSnapPoints: Array<{ point: Point; shapeId: string }> = [];
  
  // Collect all snap points from shapes
  for (const shape of shapes) {
    if (excludeShapeId && shape.id === excludeShapeId) continue;
    
    const endpoints = shapeEndpoints(shape);
    for (const endpoint of endpoints) {
      allSnapPoints.push({ point: endpoint, shapeId: shape.id });
    }
    
    const anchors = shapeAnchors(shape);
    for (const anchor of anchors) {
      // Avoid duplicates
      if (!endpoints.some(e => e.x === anchor.x && e.y === anchor.y)) {
        allSnapPoints.push({ point: anchor, shapeId: shape.id });
      }
    }
  }
  
  // Find the nearest snap point within distance
  let nearest: { point: Point; shapeId: string; dist: number } | null = null;
  
  for (const snapPoint of allSnapPoints) {
    const dist = distance(point, snapPoint.point);
    if (dist <= snapDistance) {
      if (!nearest || dist < nearest.dist) {
        nearest = { point: snapPoint.point, shapeId: snapPoint.shapeId, dist };
      }
    }
  }
  
  if (nearest) {
    return {
      snapped: true,
      point: nearest.point,
      targetPoint: nearest.point,
      targetShapeId: nearest.shapeId,
      guideLines: generateSnapGuides(nearest.point),
    };
  }
  
  return {
    snapped: false,
    point,
  };
}

/**
 * Generate snap guide lines for visual feedback.
 */
function generateSnapGuides(point: Point): SnapGuide[] {
  return [
    { type: 'horizontal', position: point.y },
    { type: 'vertical', position: point.x },
    { type: 'point', position: 0 }, // Special marker for point snap
  ];
}

/**
 * Snap a point to a grid if enabled.
 */
export function snapToGrid(
  point: Point,
  gridSize: number,
  snapDistance: number = 10
): SnapResult {
  const snappedX = Math.round(point.x / gridSize) * gridSize;
  const snappedY = Math.round(point.y / gridSize) * gridSize;
  
  const distToGrid = distance(point, { x: snappedX, y: snappedY });
  
  if (distToGrid <= snapDistance) {
    return {
      snapped: true,
      point: { x: snappedX, y: snappedY },
      guideLines: [
        { type: 'horizontal', position: snappedY },
        { type: 'vertical', position: snappedX },
      ],
    };
  }
  
  return {
    snapped: false,
    point,
  };
}

/**
 * Combined snapping: first try shape snaps, then grid snaps.
 */
export function findSnap(
  point: Point,
  shapes: Shape[],
  excludeShapeId?: string,
  snapDistance: number = 10,
  gridSize?: number
): SnapResult {
  // First try shape snapping
  const shapeSnap = findSnapPoint(point, shapes, excludeShapeId, snapDistance);
  if (shapeSnap.snapped) {
    return shapeSnap;
  }
  
  // Then try grid snapping if enabled
  if (gridSize) {
    const gridSnap = snapToGrid(point, gridSize, snapDistance);
    if (gridSnap.snapped) {
      return gridSnap;
    }
  }
  
  return {
    snapped: false,
    point,
  };
}

/**
 * Check if two points are within snap distance.
 */
export function arePointsSnapped(p1: Point, p2: Point, snapDistance: number = 10): boolean {
  return distance(p1, p2) <= snapDistance;
}

/**
 * Get all snap points in a region (for optimization).
 */
export function getSnapPointsInRegion(
  shapes: Shape[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): Array<{ point: Point; shapeId: string }> {
  const snapPoints: Array<{ point: Point; shapeId: string }> = [];
  
  for (const shape of shapes) {
    const endpoints = shapeEndpoints(shape);
    for (const endpoint of endpoints) {
      if (
        endpoint.x >= bounds.minX &&
        endpoint.x <= bounds.maxX &&
        endpoint.y >= bounds.minY &&
        endpoint.y <= bounds.maxY
      ) {
        snapPoints.push({ point: endpoint, shapeId: shape.id });
      }
    }
    
    const anchors = shapeAnchors(shape);
    for (const anchor of anchors) {
      if (
        anchor.x >= bounds.minX &&
        anchor.x <= bounds.maxX &&
        anchor.y >= bounds.minY &&
        anchor.y <= bounds.maxY
      ) {
        // Avoid duplicates
        if (!snapPoints.some(sp => sp.point.x === anchor.x && sp.point.y === anchor.y)) {
          snapPoints.push({ point: anchor, shapeId: shape.id });
        }
      }
    }
  }
  
  return snapPoints;
}
