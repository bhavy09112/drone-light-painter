/**
 * Safety analyzer for drone light painting missions.
 * Validates geometry and export settings to identify potential risks.
 * 
 * IMPORTANT: This analyzer provides risk assessment only. It cannot guarantee
 * that the drone will not crash. Static analysis has inherent limitations.
 */

import { Shape, ExportConfig, SafetyAnalysis, SafetyIssue, PathSegment } from '@/shared/types';
import { estimateMissionTime } from '../utils/timeEstimator';
import { shapeToPathSegments, shapeStrokeLength, shapeBounds, distance } from '@/renderer/geometry/geometryEngine';

export interface SafetyConfig {
  maxPointJump: number; // Maximum distance between consecutive points (meters)
  maxAltitudeChange: number; // Maximum altitude change between segments (meters)
  minStrokeLength: number; // Minimum stroke length (meters)
  maxMissionTime: number; // Maximum mission time (seconds)
}

const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  maxPointJump: 100, // 100 meters
  maxAltitudeChange: 50, // 50 meters
  minStrokeLength: 0.1, // 10 centimeters
  maxMissionTime: 3600, // 1 hour
};

/**
 * Analyze safety of shapes and export configuration.
 */
export function analyzeSafety(
  shapes: Shape[],
  config: ExportConfig,
  safetyConfig: SafetyConfig = DEFAULT_SAFETY_CONFIG
): SafetyAnalysis {
  const issues: SafetyIssue[] = [];
  if (shapes.length === 0) issues.push({ severity: 'error', message: 'Add at least one shape before export.' });
  
  // Validate each shape
  for (const shape of shapes) {
    const shapeIssues = validateShape(shape, safetyConfig);
    issues.push(...shapeIssues);
  }
  
  // Validate export configuration
  const configIssues = validateExportConfig(config);
  issues.push(...configIssues);
  
  // Validate path connectivity
  const pathIssues = validatePaths(shapes, safetyConfig);
  issues.push(...pathIssues);
  
  // Estimate mission time
  const timeIssues = validateMissionTime(shapes, config, safetyConfig);
  issues.push(...timeIssues);
  
  // Determine overall status
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  let status: 'safe' | 'warning' | 'blocked';
  let canExport: boolean;
  
  if (errors.length > 0) {
    status = 'blocked';
    canExport = false;
  } else if (warnings.length > 0) {
    status = 'warning';
    canExport = true;
  } else {
    status = 'safe';
    canExport = true;
  }
  
  return {
    status,
    issues,
    canExport,
  };
}

/**
 * Validate a single shape.
 */
function validateShape(shape: Shape, config: SafetyConfig): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  
  const segments = shapeToPathSegments(shape);
  if (segments.some(s => s.points.length < 2 || s.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)))) {
    return [{ severity: 'error', message: 'Path contains missing or non-finite coordinates.', shapeId: shape.id }];
  }
  if (('radius' in shape && shape.radius <= 0) ||
      ('radiusX' in shape && (shape.radiusX <= 0 || shape.radiusY <= 0)) ||
      ('width' in shape && (shape.width <= 0 || shape.height <= 0))) {
    issues.push({ severity: 'error', message: 'Shape dimensions must be positive.', shapeId: shape.id });
  }
  // Check for zero-length strokes
  const strokeLength = shapeStrokeLength(shape);
  if (strokeLength < config.minStrokeLength) {
    issues.push({
      severity: 'error',
      message: `Shape has zero or near-zero stroke length (${strokeLength.toFixed(3)}m). This may cause drone positioning issues.`,
      shapeId: shape.id,
    });
  }
  
  // Check for malformed geometry
  const bounds = shapeBounds(shape);
  if (isNaN(bounds.width) || isNaN(bounds.height) || !isFinite(bounds.width) || !isFinite(bounds.height)) {
    issues.push({
      severity: 'error',
      message: 'Shape has malformed geometry (NaN or infinite bounds).',
      shapeId: shape.id,
    });
  }
  
  // Check text conversion
  if (shape.type === 'text') {
    if (!shape.convertedPath || shape.convertedPath.length === 0) {
      issues.push({
        severity: 'error',
        message: 'Text shape has not been converted to paths. Convert text before export.',
        shapeId: shape.id,
      });
    }
    
    // Validate converted paths
    if (shape.convertedPath) {
      for (let i = 0; i < shape.convertedPath.length; i++) {
        const path = shape.convertedPath[i];
        if (path.length < 2) {
          issues.push({
            severity: 'error',
            message: `Text path ${i + 1} has insufficient points (${path.length} points). Minimum 2 points required.`,
            shapeId: shape.id,
          });
        }
      }
    }
  }
  
  // Check for extreme dimensions
  if (bounds.width > 1000 || bounds.height > 1000) {
    issues.push({
      severity: 'warning',
      message: `Shape has very large dimensions (${bounds.width.toFixed(1)}m x ${bounds.height.toFixed(1)}m). Verify this is intentional.`,
      shapeId: shape.id,
    });
  }
  
  return issues;
}

/**
 * Validate export configuration.
 */
function validateExportConfig(config: ExportConfig): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  for (const key of ['drawSpeed', 'moveSpeed', 'waitTime', 'altitude', 'relayIndex'] as const) {
    if (!Number.isFinite(config[key])) issues.push({ severity: 'error', message: `${key} must be finite.` });
  }
  if (!Number.isInteger(config.relayIndex)) issues.push({ severity: 'error', message: 'Relay index must be an integer.' });
  
  if (config.drawSpeed <= 0) {
    issues.push({
      severity: 'error',
      message: `Draw speed must be positive (current: ${config.drawSpeed} m/s).`,
    });
  }
  
  if (config.moveSpeed <= 0) {
    issues.push({
      severity: 'error',
      message: `Move speed must be positive (current: ${config.moveSpeed} m/s).`,
    });
  }
  
  if (config.drawSpeed > config.moveSpeed) {
    issues.push({
      severity: 'warning',
      message: `Draw speed (${config.drawSpeed} m/s) is greater than move speed (${config.moveSpeed} m/s). This is unusual but may be intentional.`,
    });
  }
  
  if (config.drawSpeed > 20) {
    issues.push({
      severity: 'warning',
      message: `Draw speed is very high (${config.drawSpeed} m/s). High speeds may reduce light painting quality.`,
    });
  }
  
  if (config.altitude < 0) {
    issues.push({
      severity: 'error',
      message: `Altitude cannot be negative (current: ${config.altitude} m).`,
    });
  }
  
  if (config.altitude > 500) {
    issues.push({
      severity: 'warning',
      message: `Altitude is very high (${config.altitude} m). High altitude may reduce visibility and precision.`,
    });
  }
  
  if (config.waitTime < 0) {
    issues.push({
      severity: 'error',
      message: `Wait time cannot be negative (current: ${config.waitTime} s).`,
    });
  }
  
  if (config.relayIndex < 0) {
    issues.push({
      severity: 'error',
      message: `Relay index cannot be negative (current: ${config.relayIndex}).`,
    });
  }
  
  return issues;
}

/**
 * Validate path connectivity and point jumps.
 */
function validatePaths(shapes: Shape[], config: SafetyConfig): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  
  // Convert all shapes to path segments
  const allSegments: PathSegment[] = [];
  for (const shape of shapes) {
    allSegments.push(...shapeToPathSegments(shape));
  }
  
  // Check for huge jumps between consecutive points
  for (const segment of allSegments) {
    for (let i = 1; i < segment.points.length; i++) {
      const p1 = segment.points[i - 1];
      const p2 = segment.points[i];
      const dist = distance(p1, p2);
      
      if (dist > config.maxPointJump) {
        issues.push({
          severity: 'error',
          message: `Large jump detected between points (${dist.toFixed(1)}m). Maximum allowed is ${config.maxPointJump}m. This may indicate missing geometry or data corruption.`,
        });
      }
    }
  }
  
  // Check for jumps between segments
  for (let i = 1; i < allSegments.length; i++) {
    const prevSegment = allSegments[i - 1];
    const currSegment = allSegments[i];
    
    const lastPoint = prevSegment.points[prevSegment.points.length - 1];
    const firstPoint = currSegment.points[0];
    
    if (!lastPoint || !firstPoint) continue;
    const dist = distance(lastPoint, firstPoint);
    
    if (dist > config.maxPointJump) {
      issues.push({
        severity: 'warning',
        message: `Large jump between stroke segments (${dist.toFixed(1)}m). The drone will need to reposition, which adds time and may affect quality.`,
      });
    }
  }
  
  // Check for overlapping or impossible paths
  // This is a simplified check - a full implementation would use geometric intersection tests
  if (allSegments.length === 0 && shapes.length > 0) {
    issues.push({
      severity: 'error',
      message: 'Shapes exist but no path segments were generated. This indicates a geometry conversion failure.',
    });
  }
  
  return issues;
}

/**
 * Validate mission time estimates.
 */
function validateMissionTime(shapes: Shape[], config: ExportConfig, safetyConfig: SafetyConfig): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  
  const { totalTime } = estimateMissionTime(shapes, config);
  
  if (totalTime > safetyConfig.maxMissionTime) {
    issues.push({
      severity: 'warning',
      message: `Estimated mission time (${formatTime(totalTime)}) exceeds recommended maximum (${formatTime(safetyConfig.maxMissionTime)}). Long missions increase battery and risk concerns.`,
    });
  }
  
  if (totalTime === 0 && shapes.length > 0) {
    issues.push({
      severity: 'error',
      message: 'Mission time estimate is zero despite having shapes. This indicates a calculation error.',
    });
  }
  
  return issues;
}

/**
 * Format time in seconds to MM:SS format.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Generate a human-readable risk report.
 */
export function generateRiskReport(analysis: SafetyAnalysis): string {
  const lines: string[] = [];
  
  lines.push('=== SAFETY ANALYSIS REPORT ===\n');
  lines.push(`Status: ${analysis.status.toUpperCase()}\n`);
  lines.push(`Can Export: ${analysis.canExport ? 'Yes' : 'No'}\n`);
  lines.push(`Issues Found: ${analysis.issues.length}\n`);
  
  if (analysis.issues.length > 0) {
    lines.push('\n--- Issues ---\n');
    
    const errors = analysis.issues.filter(i => i.severity === 'error');
    const warnings = analysis.issues.filter(i => i.severity === 'warning');
    
    if (errors.length > 0) {
      lines.push(`\nERRORS (${errors.length}):\n`);
      for (const error of errors) {
        lines.push(`  - ${error.message}${error.shapeId ? ` [Shape: ${error.shapeId}]` : ''}\n`);
      }
    }
    
    if (warnings.length > 0) {
      lines.push(`\nWARNINGS (${warnings.length}):\n`);
      for (const warning of warnings) {
        lines.push(`  - ${warning.message}${warning.shapeId ? ` [Shape: ${warning.shapeId}]` : ''}\n`);
      }
    }
  }
  
  lines.push('\n--- IMPORTANT DISCLAIMER ---\n');
  lines.push('This safety analysis is a risk assessment tool only. It cannot guarantee\n');
  lines.push('that the drone will not crash. Static analysis has inherent limitations:\n');
  lines.push('- Real-world conditions (wind, GPS errors, obstacles) are not modeled\n');
  lines.push('- Drone behavior may vary from expected parameters\n');
  lines.push('- Environmental factors are not considered\n');
  lines.push('- Hardware failures cannot be predicted\n');
  lines.push('\nAlways perform manual pre-flight checks and test in safe conditions.\n');
  lines.push('==============================\n');
  
  return lines.join('');
}
