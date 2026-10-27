import React from 'react';
import { useEditorStore } from '../editor/editorState';

const Toolbar: React.FC = () => {
  const { currentTool, setCurrentTool, undo, redo, past, future } = useEditorStore();

  const tools = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'polyline', label: 'Polyline', icon: '⌇' },
    { id: 'rectangle', label: 'Rectangle', icon: '□' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'ellipse', label: 'Ellipse', icon: '⬭' },
    { id: 'triangle', label: 'Triangle', icon: '△' },
    { id: 'text', label: 'Text', icon: 'T' },
  ];

  return (
    <div style={{
      width: '60px',
      background: '#2d2d2d',
      borderRight: '1px solid #3d3d3d',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 0',
      gap: '5px',
    }}>
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => setCurrentTool(tool.id as any)}
          style={{
            width: '40px',
            height: '40px',
            margin: '0 10px',
            background: currentTool === tool.id ? '#1976d2' : '#3d3d3d',
            border: currentTool === tool.id ? '1px solid #2196f3' : '1px solid #4d4d4d',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = currentTool === tool.id ? '#1976d2' : '#4d4d4d'}
          onMouseLeave={(e) => e.currentTarget.style.background = currentTool === tool.id ? '#1976d2' : '#3d3d3d'}
        >
          {tool.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{
        borderTop: '1px solid #3d3d3d',
        paddingTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
      }}>
        <button
          title="Undo"
          disabled={past.length === 0}
          onClick={() => undo()}
          style={{
            width: '40px',
            height: '40px',
            margin: '0 10px',
            background: '#3d3d3d',
            border: '1px solid #4d4d4d',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '16px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#4d4d4d'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3d3d3d'}
        >
          ↶
        </button>
        <button
          title="Redo"
          disabled={future.length === 0}
          onClick={() => redo()}
          style={{
            width: '40px',
            height: '40px',
            margin: '0 10px',
            background: '#3d3d3d',
            border: '1px solid #4d4d4d',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '16px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#4d4d4d'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3d3d3d'}
        >
          ↷
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
