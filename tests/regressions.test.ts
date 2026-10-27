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
function simulation(dryRun: boolean, assertions: string, overrides: Partial<ExportConfig> = {}) {
  const second = { ...line, id: 'second', start: {x: 20, y: 0}, end: {x: 30, y: 0} };
  const script = exportToLua([line, second], { ...config, ...overrides, dryRun }).script;
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
  it('allows a slow initial vertical approach using move speed and actual 3D distance', () => simulation(false, `
    position = {0, 0, 0}
    for i = 1, 42000 do
      if not update() then break end
      local velocity = commands[#commands]
      for axis = 1, 3 do position[axis] = position[axis] + velocity[axis] * 0.1 end
      now = now + 100
    end
    assert(now > 2900000)
    assert(messages[#messages] == 'Light painting complete', messages[#messages])
  `, { moveSpeed: 0.01 }));
  it('keeps a fixed finite deadline even for a stalled slow drawing target', () => simulation(false, `
    update(); now = 500; update() -- finish first point wait
    update() -- activates 10m draw at 0.01m/s, deadline 2121000ms
    now = 2000000; assert(update() ~= nil and #messages == 0)
    now = 2121000; assert(update() ~= nil and #messages == 0)
    now = 2121001; update()
    assert(messages[#messages] == 'Aborted: target timeout')
    assert(lights[#lights] == false and commands[#commands][1] == 0)
  `, { drawSpeed: 0.01 }));
  it('completes an accepted slow stroke using commanded velocities beyond 120 seconds', () => {
    const slow = { ...config, drawSpeed: 0.01 };
    expect(analyzeSafety([line], slow)).toEqual({status: 'safe', issues: [], canExport: true});
    expect(estimateMissionTime([line], slow).drawingTime).toBe(1000);
    simulation(false, `
      for i = 1, 21000 do
        local next_update = update()
        if not next_update then break end
        local velocity = commands[#commands]
        for axis = 1, 3 do position[axis] = position[axis] + velocity[axis] * 0.1 end
        now = now + 100
      end
      assert(now > 1900000, 'slow strokes must actually take more than 120 seconds')
      assert(messages[#messages] == 'Light painting complete', messages[#messages])
      assert(lights[#lights] == false and commands[#commands][1] == 0)
    `, { drawSpeed: 0.01 });
  });
  it('completes accepted waits longer than 120 seconds at every point', () => {
    expect(analyzeSafety([line], {...config, waitTime: 180}).canExport).toBe(true);
    simulation(false, `
      for _, x in ipairs({0, 10, 20, 30}) do
        position = {x, 0, -30}
        update()
        now = now + 179900
        assert(update() ~= nil and #messages == 0, 'must still be waiting')
        now = now + 100
        update()
      end
      assert(now == 720000)
      assert(messages[#messages] == 'Light painting complete')
    `, { waitTime: 180 });
  });
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
    position = {-10,0,-30}; update()
    -- 2 * (10m / 5m/s) + 120s margin + 0.5s wait = 124.5s.
    now = 124500; assert(update() ~= nil and #messages == 0)
    now = 124501; update()
    assert(messages[#messages] == 'Aborted: target timeout')
    assert(commands[#commands][1] == 0 and lights[#lights] == false)
    local count = #commands
    position = {0,0,-30}; update()
    assert(#commands == count and #messages == 1, 'timeout must stay terminal')
  `));
  it('aborts when position is missing or a command is rejected', () => {
    simulation(false, `ahrs.get_relative_position_NED_origin = function() return nil end; update(); assert(#commands == 1 and lights[#lights] == false)`);
    simulation(false, `vehicle.set_target_velocity_NED = function() return false end; update(); assert(messages[#messages] == 'Aborted: command rejected')`);
  });
});
