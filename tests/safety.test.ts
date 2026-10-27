import { describe, it, expect } from 'vitest';
import { analyzeSafety } from '../src/renderer/safety/safetyAnalyzer';
import { Shape, ExportConfig } from '../src/shared/types';
import { LineShape } from '../src/shared/types';

describe('Safety Analyzer', () => {
  const defaultConfig: ExportConfig = {
    drawSpeed: 2,
    moveSpeed: 5,
    waitTime: 0.5,
    altitude: 30,
    relayIndex: 0,
    dryRun: false,
  };

  describe('analyzeSafety', () => {
    it('should pass for valid shapes and config', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = analyzeSafety([line], defaultConfig);
      expect(result.status).toBe('safe');
      expect(result.canExport).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should block export for zero-length stroke', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = analyzeSafety([line], defaultConfig);
      expect(result.status).toBe('blocked');
      expect(result.canExport).toBe(false);
      expect(result.issues.some(i => i.severity === 'error')).toBe(true);
    });

    it('should warn for high draw speed', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const config = { ...defaultConfig, drawSpeed: 25 };
      const result = analyzeSafety([line], config);
      expect(result.status).toBe('warning');
      expect(result.canExport).toBe(true);
      expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('should block export for invalid draw speed', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const config = { ...defaultConfig, drawSpeed: 0 };
      const result = analyzeSafety([line], config);
      expect(result.status).toBe('blocked');
      expect(result.canExport).toBe(false);
    });

    it('should block export for negative altitude', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const config = { ...defaultConfig, altitude: -10 };
      const result = analyzeSafety([line], config);
      expect(result.status).toBe('blocked');
      expect(result.canExport).toBe(false);
    });
  });
});
