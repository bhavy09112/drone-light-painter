import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore as store } from '../src/renderer/editor/editorState';
import { analyzeSafety } from '../src/renderer/safety/safetyAnalyzer';
import { exportToLua } from '../src/renderer/export/luaExporter';
import { estimateMissionTime } from '../src/renderer/utils/timeEstimator';
import { findSnapPoint } from '../src/renderer/snapping/snappingEngine';
import { LineShape, ExportConfig } from '../src/shared/types';
// Fengari executes Lua 5.3; mocks verify application logic, not flight dynamics.
import { lua, lauxlib, lualib, to_luastring } from 'fengari';

const line: LineShape = { id: 'test', type: 'line', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, selected: false, strokeThickness: 2, zIndex: 0 };
const config: ExportConfig = { drawSpeed: 2, moveSpeed: 5, altitude: 30, waitTime: 0.5, relayIndex: 0, dryRun: false };
function execute(code: string) {
  const state = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(state);
  const result = lauxlib.luaL_dostring(state, to_luastring(code));
  const error = result === lua.LUA_OK ? '' : lua.lua_tojsstring(state, -1);
  lua.lua_close(state);
  expect(error).toBe('');
}
const mocks = `
local now = 0
local mode = 4
local armed = true
local position = {0, 0, -30}
local lights, commands, messages = {}, {}, {}
function Vector3f()
  local values = {0, 0, 0}
  local v = {}
  for i, name in ipairs({'x', 'y', 'z'}) do
    v[name] = function(self, value) if value ~= nil then values[i] = value end; return values[i] end
  end
  return v
end
function millis() return {tofloat = function() return now end} end
arming = {is_armed = function() return armed end}
ahrs = {get_relative_position_NED_origin = function() local v = Vector3f(); v:x(position[1]); v:y(position[2]); v:z(position[3]); return v end}
vehicle = {
  get_mode = function() return mode end,
  set_target_velocity_NED = function(self, v) table.insert(commands, {v:x(),v:y(),v:z()}); return true end
}
relay = {on = function() table.insert(lights, true) end, off = function() table.insert(lights, false) end}
gcs = {send_text = function(self, severity, message) table.insert(messages, message) end}
`;
function simulation(dryRun: boolean, assertions: string) {
  const second = { ...line, id: 'second', start: {x: 20, y: 0}, end: {x: 30, y: 0} };
  const script = exportToLua([line, second], { ...config, dryRun }).script;
  execute(`${mocks}\nlocal update = (function()\n${script}\nend)()\n${assertions}`);
}

describe('editor history and bounds', () => {
  beforeEach(() => store.setState({ shapes: [structuredClone(line)], selectedIds: [], past: [], future: [] }));
  it('restores deletion and selection, then invalidates redo after a new edit', () => {
    store.getState().selectShape(line.id);
    store.getState().deleteSelected();
    expect(store.getState().shapes).toHaveLength(0);
    store.getState().undo();
    expect(store.getState().selectedIds).toEqual([line.id]);
    store.getState().redo();
    expect(store.getState().shapes).toHaveLength(0);
    store.getState().undo();
    store.getState().addShape({ ...line, id: 'new' });
    expect(store.getState().future).toHaveLength(0);
  });
  it('undoes a whole drag with one history entry', () => {
    store.getState().checkpoint();
    store.getState().updateShape(line.id, { end: { x: 15, y: 0 } }, false);
    store.getState().updateShape(line.id, { end: { x: 20, y: 0 } }, false);
    store.getState().undo();
    expect(store.getState().shapes[0]).toEqual(line);
  });
  it('clamps zoom and excludes the dragged shape from snapping', () => {
    store.getState().setZoom(100);
    expect(store.getState().zoom).toBe(5);
    expect(findSnapPoint({x: 0.1, y: 0}, [line], line.id).snapped).toBe(false);
    expect(findSnapPoint({x: 0.1, y: 0}, [line]).point).toEqual(line.start);
  });
});

describe('export validation regressions', () => {
  it('blocks empty scenes and non-finite configuration at the export boundary', () => {
    expect(analyzeSafety([], config).canExport).toBe(false);
    for (const key of ['drawSpeed', 'moveSpeed', 'altitude', 'waitTime', 'relayIndex']) {
      expect(() => exportToLua([line], {...config, [key]: NaN})).toThrow();
    }
    expect(() => exportToLua([line], {...config, relayIndex: 0.5})).toThrow();
  });
  it('blocks non-finite path coordinates without crashing', () => {
    expect(analyzeSafety([{...line, start: {x: Infinity, y: 0}}], config).canExport).toBe(false);
  });
  it('does not invent repositioning distance for connected strokes', () => {
    expect(estimateMissionTime([line, {...line, start: line.end, end: {x: 20, y: 0}}], config).moveTime).toBe(0);
  });
});

describe('executed Lua controller', () => {
  it('dry run terminates without any vehicle or relay commands', () => simulation(true, `
    for i = 1, 6 do update() end
    assert(#commands == 0 and #lights == 0)
    assert(#messages == 4)
  `));
  it('waits, draws, repositions with light off, and terminates', () => simulation(false, `
    update(); now = 500; update() -- at first point, finish wait
    update(); assert(lights[#lights] == true and commands[#commands][1] == 2)
    position = {10,0,-30}; update(); now = 1000; update()
    update(); assert(lights[#lights] == false and commands[#commands][1] == 5)
    position = {20,0,-30}; update(); now = 1500; update()
    update(); assert(lights[#lights] == true)
    position = {30,0,-30}; update(); now = 2000; update()
    assert(messages[#messages] == 'Light painting complete')
    assert(update() == nil and lights[#lights] == false)
  `));
  it('aborts on mode loss and does not resume on return to GUIDED', () => simulation(false, `
    mode = 0; update(); mode = 4; update()
    assert(#commands == 0 and #messages == 1 and lights[#lights] == false)
  `));
  it('times out unreachable targets and sends a zero velocity', () => simulation(false, `
    position = {-10,0,-30}; update(); now = 120001; update()
    assert(messages[#messages] == 'Aborted: target timeout')
    assert(commands[#commands][1] == 0 and lights[#lights] == false)
  `));
  it('aborts when position is missing or a command is rejected', () => {
    simulation(false, `ahrs.get_relative_position_NED_origin = function() return nil end; update(); assert(#commands == 1 and lights[#lights] == false)`);
    simulation(false, `vehicle.set_target_velocity_NED = function() return false end; update(); assert(messages[#messages] == 'Aborted: command rejected')`);
  });
});
