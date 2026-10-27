/**
 * Mission time estimator for drone light painting.
 * Calculates drawing time, move time, wait time, and total mission time.
 */

import { Shape, ExportConfig, MissionTimeEstimate } from '@/shared/types';
import { shapeStrokeLength, shapeToPathSegments, distance } from '@/renderer/geometry/geometryEngine';

export interface TimeEstimateConfig {
  averageMoveDistance?: number; // Average distance between strokes (meters)
  uncertaintyFactor?: number; // Factor for worst-case estimate (1.0 = no uncertainty)
}

const DEFAULT_CONFIG: TimeEstimateConfig = {
  averageMoveDistance: 10, // Assume 10m average move between strokes
  uncertaintyFactor: 1.5, // 50% uncertainty for worst case
};

/**
 * Estimate mission time based on shapes and export configuration.
 */
export function estimateMissionTime(
  shapes: Shape[],
  config: ExportConfig,
  estimateConfig: TimeEstimateConfig = DEFAULT_CONFIG
): MissionTimeEstimate {
  const uncertainty = estimateConfig.uncertaintyFactor ?? DEFAULT_CONFIG.uncertaintyFactor!;
  
  // Calculate total stroke length
  let totalStrokeLength = 0;
  for (const shape of shapes) {
    totalStrokeLength += shapeStrokeLength(shape);
  }
  
  // Calculate drawing time (time spent actually drawing)
  const drawingTime = totalStrokeLength / config.drawSpeed;
  
  // Calculate move time (time spent repositioning between strokes)
  const segments = shapes.flatMap(shape => shapeToPathSegments(shape));
  const pointCount = segments.reduce((sum, segment) => sum + segment.points.length, 0);
  
  // Estimate actual move distances based on geometry
  let totalMoveDistance = 0;
  for (let i = 1; i < segments.length; i++) {
    const prevSegment = segments[i - 1];
    const currSegment = segments[i];
    
    const lastPoint = prevSegment.points[prevSegment.points.length - 1];
    const firstPoint = currSegment.points[0];
    
    if (lastPoint && firstPoint) totalMoveDistance += distance(lastPoint, firstPoint);
  }
  
  const moveTime = totalMoveDistance / config.moveSpeed;
  
  // Calculate wait time (time spent waiting at points)
  const waitTime = pointCount * config.waitTime;
  
  // Total time
  const totalTime = drawingTime + moveTime + waitTime;
  
  // Best case (no uncertainty)
  const bestCase = totalTime;
  
  // Worst case (with uncertainty factor)
  const worstCase = totalTime * uncertainty;
  
  return {
    drawingTime,
    moveTime,
    waitTime,
    totalTime,
    bestCase,
    worstCase,
  };
}

/**
 * Format time in seconds to human-readable string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'Invalid settings';
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get a detailed time breakdown as a formatted string.
 */
export function getTimeBreakdown(estimate: MissionTimeEstimate): string {
  const lines: string[] = [];
  
  lines.push('=== Mission Time Estimate ===\n');
  lines.push(`Drawing time: ${formatTime(estimate.drawingTime)}\n`);
  lines.push(`Move time: ${formatTime(estimate.moveTime)}\n`);
  lines.push(`Wait time: ${formatTime(estimate.waitTime)}\n`);
  lines.push(`Total time: ${formatTime(estimate.totalTime)}\n`);
  lines.push(`\n--- Range ---\n`);
  lines.push(`Best case: ${formatTime(estimate.bestCase)}\n`);
  lines.push(`Worst case: ${formatTime(estimate.worstCase)}\n`);
  lines.push('=============================\n');
  
  return lines.join('');
}

/**
 * Calculate battery estimate based on mission time.
 * This is a rough estimate - actual battery consumption varies.
 */
export function estimateBatteryUsage(
  estimate: MissionTimeEstimate,
  batteryCapacityMah: number = 5000,
  averageDrawAmps: number = 15
): number {
  // Estimate average current draw during mission
  // Drawing uses more power than moving
  const drawingRatio = estimate.drawingTime / estimate.totalTime;
  const moveRatio = estimate.moveTime / estimate.totalTime;
  const waitRatio = estimate.waitTime / estimate.totalTime;
  
  // Battery capacity is used for percentage calculation
  // but not needed for the raw mAh calculation
  void batteryCapacityMah;
  
  // Assume different current draws for different states
  const drawingAmps = averageDrawAmps * 1.5; // Higher current when drawing (relay on)
  const movingAmps = averageDrawAmps; // Normal current when moving
  const waitingAmps = averageDrawAmps * 0.5; // Lower current when hovering/waiting
  
  const averageAmps = (
    drawingAmps * drawingRatio +
    movingAmps * moveRatio +
    waitingAmps * waitRatio
  );
  
  // Calculate battery usage in mAh
  const hours = estimate.totalTime / 3600;
  const batteryUsage = averageAmps * hours * 1000;
  
  return batteryUsage;
}

/**
 * Get battery percentage estimate.
 */
export function getBatteryPercentage(
  estimate: MissionTimeEstimate,
  batteryCapacityMah: number = 5000,
  averageDrawAmps: number = 15
): number {
  const usage = estimateBatteryUsage(estimate, batteryCapacityMah, averageDrawAmps);
  const percentage = (usage / batteryCapacityMah) * 100;
  return Math.min(100, Math.max(0, percentage));
}
