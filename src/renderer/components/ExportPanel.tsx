import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../editor/editorState';
import { ExportConfig } from '@/shared/types';
import { analyzeSafety } from '../safety/safetyAnalyzer';
import { exportToLua } from '../export/luaExporter';
import { estimateMissionTime, formatTime } from '../utils/timeEstimator';

const ExportPanel: React.FC = () => {
  const { shapes } = useEditorStore();
  const [config, setConfig] = useState<ExportConfig>({
    drawSpeed: 2,
    moveSpeed: 5,
    waitTime: 0.5,
    altitude: 30,
    relayIndex: 0,
    dryRun: true,
  });
  const [safetyAnalysis, setSafetyAnalysis] = useState<any>(null);
  const [showRiskReport, setShowRiskReport] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setSafetyAnalysis(null);
    setConfirmed(false);
  }, [shapes, config]);

  const handleAnalyze = () => {
    const analysis = analyzeSafety(shapes, config);
    setSafetyAnalysis(analysis);
    setShowRiskReport(true);
  };

  const handleExport = () => {
    if (!confirmed) {
      alert('Please confirm you understand the risks before exporting.');
      return;
    }

    const analysis = analyzeSafety(shapes, config);
    if (!analysis.canExport) {
      setSafetyAnalysis(analysis);
      setConfirmed(false);
      return;
    }
    const result = exportToLua(shapes, config);
    
    // Create and download the file
    const blob = new Blob([result.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'light_painting.lua';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const timeEstimate = estimateMissionTime(shapes, config);

  return (
    <div style={{ padding: '15px' }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '15px',
        color: '#ffffff',
      }}>
        Experimental Lua Export
      </h3>

      {/* Export Configuration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
            Draw Speed (m/s)
          </label>
          <input
            type="number"
            step="0.1"
            value={config.drawSpeed}
            onChange={(e) => setConfig({ ...config, drawSpeed: parseFloat(e.target.value) || 0 })}
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

        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
            Move Speed (m/s)
          </label>
          <input
            type="number"
            step="0.1"
            value={config.moveSpeed}
            onChange={(e) => setConfig({ ...config, moveSpeed: parseFloat(e.target.value) || 0 })}
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

        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
            Wait Time (s)
          </label>
          <input
            type="number"
            step="0.1"
            value={config.waitTime}
            onChange={(e) => setConfig({ ...config, waitTime: parseFloat(e.target.value) || 0 })}
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

        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
            Altitude above EKF origin (m)
          </label>
          <input
            type="number"
            value={config.altitude}
            onChange={(e) => setConfig({ ...config, altitude: parseFloat(e.target.value) || 0 })}
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

        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
            Relay Index
          </label>
          <input
            type="number"
            value={config.relayIndex}
            onChange={(e) => setConfig({ ...config, relayIndex: parseInt(e.target.value) || 0 })}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="dryRun"
            checked={config.dryRun}
            onChange={(e) => setConfig({ ...config, dryRun: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="dryRun" style={{ fontSize: '12px', color: '#e0e0e0', cursor: 'pointer' }}>
            Dry Run (log only, no motion or relay)
          </label>
        </div>
      </div>

      {/* Time Estimate */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#3d3d3d',
        borderRadius: '4px',
      }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          Estimated Mission Time
        </div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
          {formatTime(timeEstimate.totalTime)}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
          Range: {formatTime(timeEstimate.bestCase)} - {formatTime(timeEstimate.worstCase)}
        </div>
      </div>

      {/* Safety Analysis */}
      <button
        onClick={handleAnalyze}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '12px',
          background: '#1976d2',
          border: 'none',
          borderRadius: '4px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Run Safety Analysis
      </button>

      {showRiskReport && safetyAnalysis && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: safetyAnalysis.status === 'blocked' ? '#4a1818' : safetyAnalysis.status === 'warning' ? '#4a3a18' : '#1a4a18',
          borderRadius: '4px',
          border: `1px solid ${safetyAnalysis.status === 'blocked' ? '#d32f2f' : safetyAnalysis.status === 'warning' ? '#f57c00' : '#388e3c'}`,
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
            Status: {safetyAnalysis.status.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#cccccc' }}>
            {safetyAnalysis.issues.length} issue(s) found
            <ul>{safetyAnalysis.issues.map((issue: { message: string }, i: number) => <li key={i}>{issue.message}</li>)}</ul>
          </div>
        </div>
      )}

      {/* Confirmation Checkbox */}
      {safetyAnalysis && safetyAnalysis.canExport && (
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: '#888' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: '2px', cursor: 'pointer' }}
            />
            <span>
              I understand that this is a risk assessment only and cannot guarantee the drone will not crash. I will perform manual pre-flight checks and test in safe conditions.
            </span>
          </label>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!safetyAnalysis || !safetyAnalysis.canExport || !confirmed}
        style={{
          width: '100%',
          marginTop: '15px',
          padding: '12px',
          background: (!safetyAnalysis || !safetyAnalysis.canExport || !confirmed) ? '#4a4a4a' : '#388e3c',
          border: 'none',
          borderRadius: '4px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          cursor: (!safetyAnalysis || !safetyAnalysis.canExport || !confirmed) ? 'not-allowed' : 'pointer',
          opacity: (!safetyAnalysis || !safetyAnalysis.canExport || !confirmed) ? 0.5 : 1,
        }}
      >
        Export Lua Script
      </button>

      {/* Stats */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#3d3d3d',
        borderRadius: '4px',
      }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          Design Statistics
        </div>
        <div style={{ fontSize: '11px', color: '#e0e0e0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>Shapes: {shapes.length}</div>
          <div>Selected: {useEditorStore.getState().selectedIds.length}</div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
