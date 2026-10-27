import { describe, it, expect } from 'vitest';
import { exportToLua, validateLuaScript } from '../src/renderer/export/luaExporter';
import { ExportConfig } from '../src/shared/types';
import { LineShape } from '../src/shared/types';

describe('Lua Exporter', () => {
  const defaultConfig: ExportConfig = {
    drawSpeed: 2,
    moveSpeed: 5,
    waitTime: 0.5,
    altitude: 30,
    relayIndex: 0,
    dryRun: false,
  };

  describe('exportToLua', () => {
    it('should generate a valid Lua script', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = exportToLua([line], defaultConfig);
      expect(result.script).toBeTruthy();
      expect(result.script.length).toBeGreaterThan(0);
      expect(result.stats.pointCount).toBeGreaterThan(0);
      expect(result.stats.strokeCount).toBe(1);
    });

    it('should include configuration constants', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = exportToLua([line], defaultConfig);
      expect(result.script).toContain('DRAW_SPEED');
      expect(result.script).toContain('MOVE_SPEED');
      expect(result.script).toContain('ALTITUDE');
      expect(result.script).toContain('RELAY_INDEX');
    });

    it('should include point data', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = exportToLua([line], defaultConfig);
      expect(result.script).toContain('local points = {');
      expect(result.script).toContain('0.00, 0.00');
      expect(result.script).toContain('10.00, 10.00');
    });

    it('should include update function', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = exportToLua([line], defaultConfig);
      expect(result.script).toContain('function update()');
      expect(result.script).toContain('return update');
    });

    it('should respect dry run setting', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const config = { ...defaultConfig, dryRun: true };
      const result = exportToLua([line], config);
      expect(result.script).toContain('DRY_RUN = true');
    });
  });

  describe('validateLuaScript', () => {
    it('should validate a correct script', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        strokeThickness: 2,
        selected: false,
        zIndex: 0,
      };

      const result = exportToLua([line], defaultConfig);
      const validation = validateLuaScript(result.script);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect unbalanced parentheses', () => {
      const invalidScript = 'function update() return update, 100'; // Missing closing paren
      const validation = validateLuaScript(invalidScript);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing update function', () => {
      const invalidScript = 'local DRAW_SPEED = 2';
      const validation = validateLuaScript(invalidScript);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('update'))).toBe(true);
    });

    it('should detect missing required variables', () => {
      const invalidScript = 'function update() return update, 100 end';
      const validation = validateLuaScript(invalidScript);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('DRAW_SPEED'))).toBe(true);
    });
  });
});
