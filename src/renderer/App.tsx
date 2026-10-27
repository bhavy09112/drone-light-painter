import CanvasEditor from './components/CanvasEditor';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ExportPanel from './components/ExportPanel';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Header */}
      <header style={{
        background: '#2d2d2d',
        padding: '10px 20px',
        borderBottom: '1px solid #3d3d3d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff' }}>
          Drone Light Painter
        </h1>
        <div style={{ fontSize: '12px', color: '#888' }}>
          Design patterns • Export ArduPilot Lua scripts
        </div>
      </header>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left toolbar */}
        <Toolbar />

        {/* Canvas editor */}
        <div style={{ flex: 1, position: 'relative' }}>
          <CanvasEditor />
        </div>

        {/* Right panel */}
        <div style={{
          width: '300px',
          background: '#2d2d2d',
          borderLeft: '1px solid #3d3d3d',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}>
          <PropertiesPanel />
          <ExportPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
