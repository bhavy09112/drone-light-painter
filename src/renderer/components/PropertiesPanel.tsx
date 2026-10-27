import React from 'react';
import { convertTextToPath } from '../text/textToPath';
import { useEditorStore } from '../editor/editorState';

const PropertiesPanel: React.FC = () => {
  const { selectedIds, shapes, deleteSelected, duplicateShape, updateShape } = useEditorStore();
  const selectedShape = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : null;

  return (
    <div style={{
      padding: '15px',
      borderBottom: '1px solid #3d3d3d',
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '15px',
        color: '#ffffff',
      }}>
        Properties
      </h3>

      {selectedShape ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
              Type
            </label>
            <div style={{
              padding: '8px',
              background: '#3d3d3d',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#e0e0e0',
            }}>
              {selectedShape.type}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
              ID
            </label>
            <div style={{
              padding: '8px',
              background: '#3d3d3d',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#888',
              wordBreak: 'break-all',
            }}>
              {selectedShape.id}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
              Z-Index
            </label>
            <input
              type="number"
              value={selectedShape.zIndex}
              onChange={(e) => updateShape(selectedShape.id, { zIndex: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '8px',
                background: '#3d3d3d',
                border: '1px solid #4d4d4d',
                borderRadius: '4px',
                color: '#e0e0e0',
                fontSize: '13px',
              }}
            />
          </div>

          {selectedShape.type === 'text' && <div>
            <label htmlFor="text-content">Stroke text (A-Z, 0-9, spaces)</label>
            <input id="text-content" value={selectedShape.text}
              onChange={e => updateShape(selectedShape.id, { text: e.target.value, convertedPath: undefined })} />
            <button onClick={() => {
              try { updateShape(selectedShape.id, { convertedPath: convertTextToPath(selectedShape) }); }
              catch (error) { alert((error as Error).message); }
            }}>Convert text to strokes</button>
          </div>}

          {'strokeThickness' in selectedShape && (
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
                Stroke Thickness
              </label>
              <input
                type="number"
                value={selectedShape.strokeThickness}
                onChange={(e) => updateShape(selectedShape.id, { strokeThickness: parseFloat(e.target.value) || 1 })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#3d3d3d',
                  border: '1px solid #4d4d4d',
                  borderRadius: '4px',
                  color: '#e0e0e0',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          <div style={{
            marginTop: '15px',
            display: 'flex',
            gap: '10px',
          }}>
            <button
              onClick={() => selectedShape && duplicateShape(selectedShape.id)}
              style={{
                flex: 1,
                padding: '8px',
                background: '#4a4a4a',
                border: '1px solid #5a5a5a',
                borderRadius: '4px',
                color: '#e0e0e0',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Duplicate
            </button>
            <button
              onClick={() => deleteSelected()}
              style={{
                flex: 1,
                padding: '8px',
                background: '#d32f2f',
                border: '1px solid #e53935',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '13px',
        }}>
          No shape selected
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
