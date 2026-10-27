import { describe, it, expect } from 'vitest';
import { distance, pathLength, pointsBounds, shapeBounds, shapeStrokeLength } from '../src/renderer/geometry/geometryEngine';
import { Point, LineShape, RectangleShape, CircleShape } from '../src/shared/types';

describe('Geometry Engine', () => {
  describe('distance', () => {
    it('should calculate Euclidean distance correctly', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(distance(p1, p2)).toBe(5);
    });

    it('should return 0 for identical points', () => {
      const p: Point = { x: 5, y: 5 };
      expect(distance(p, p)).toBe(0);
    });
  });

  describe('pathLength', () => {
    it('should calculate path length correctly', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ];
      expect(pathLength(points)).toBe(7); // 3 + 4
    });

    it('should return 0 for empty path', () => {
      expect(pathLength([])).toBe(0);
    });

    it('should return 0 for single point', () => {
      expect(pathLength([{ x: 0, y: 0 }])).toBe(0);
    });
  });

  describe('pointsBounds', () => {
    it('should calculate bounding box correctly', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 10 },
      ];
      const bounds = pointsBounds(points);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(10);
      expect(bounds.maxY).toBe(10);
      expect(bounds.width).toBe(10);
      expect(bounds.height).toBe(10);
    });

    it('should return zero bounds for empty array', () => {
      const bounds = pointsBounds([]);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('shapeBounds', () => {
    it('should calculate line bounds correctly', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      const bounds = shapeBounds(line);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(10);
      expect(bounds.maxY).toBe(10);
    });

    it('should calculate rectangle bounds correctly', () => {
      const rect: RectangleShape = {
        id: '1',
        type: 'rectangle',
        x: 5,
        y: 5,
        width: 10,
        height: 20,
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      const bounds = shapeBounds(rect);
      expect(bounds.minX).toBe(5);
      expect(bounds.minY).toBe(5);
      expect(bounds.maxX).toBe(15);
      expect(bounds.maxY).toBe(25);
      expect(bounds.width).toBe(10);
      expect(bounds.height).toBe(20);
    });

    it('should calculate circle bounds correctly', () => {
      const circle: CircleShape = {
        id: '1',
        type: 'circle',
        centerX: 10,
        centerY: 10,
        radius: 5,
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      const bounds = shapeBounds(circle);
      expect(bounds.minX).toBe(5);
      expect(bounds.minY).toBe(5);
      expect(bounds.maxX).toBe(15);
      expect(bounds.maxY).toBe(15);
      expect(bounds.width).toBe(10);
      expect(bounds.height).toBe(10);
    });
  });

  describe('shapeStrokeLength', () => {
    it('should calculate line stroke length correctly', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 3, y: 4 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      expect(shapeStrokeLength(line)).toBe(5);
    });

    it('should calculate rectangle perimeter correctly', () => {
      const rect: RectangleShape = {
        id: '1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 5,
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      expect(shapeStrokeLength(rect)).toBe(30); // 2 * (10 + 5)
    });

    it('should calculate circle circumference correctly', () => {
      const circle: CircleShape = {
        id: '1',
        type: 'circle',
        centerX: 0,
        centerY: 0,
        radius: 5,
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };
      expect(shapeStrokeLength(circle)).toBeCloseTo(31.4159, 4); // 2 * pi * 5
    });
  });
});
