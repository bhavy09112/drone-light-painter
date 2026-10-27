/**
 * Core geometry types for the drone light painting application.
 * All geometry is stored in an immutable format independent of rendering.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type ShapeType = 'line' | 'polyline' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'text';

export interface BaseShape {
  id: string;
  type: ShapeType;
  selected: boolean;
  zIndex: number;
  groupId?: string;
}

export interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
  strokeThickness: number;
}

export interface PolylineShape extends BaseShape {
  type: 'polyline';
  points: Point[];
  strokeThickness: number;
  closed: boolean;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeThickness: number;
  rotation?: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
  strokeThickness: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  strokeThickness: number;
  rotation?: number;
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
  points: [Point, Point, Point];
  strokeThickness: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  alignment: 'left' | 'center' | 'right';
  rotation?: number;
  boundingBox?: Bounds;
  convertedPath?: Point[][];
}

export type Shape = LineShape | PolylineShape | RectangleShape | CircleShape | EllipseShape | TriangleShape | TextShape;

export interface ShapeGroup {
  id: string;
  shapeIds: string[];
}

export type ToolType = 'select' | 'line' | 'polyline' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'text';

export interface EditorState {
  shapes: Shape[];
  groups: ShapeGroup[];
  selectedIds: string[];
  pan: Point;
  zoom: number;
  snapEnabled: boolean;
  snapDistance: number;
  currentTool: ToolType;
}

export interface ExportConfig {
  drawSpeed: number; // m/s
  moveSpeed: number; // m/s
  waitTime: number; // seconds
  altitude: number; // meters
  relayIndex: number;
  dryRun: boolean;
}

export interface SafetyAnalysis {
  status: 'safe' | 'warning' | 'blocked';
  issues: SafetyIssue[];
  canExport: boolean;
}

export interface SafetyIssue {
  severity: 'error' | 'warning';
  message: string;
  shapeId?: string;
}

export interface MissionTimeEstimate {
  drawingTime: number; // seconds
  moveTime: number; // seconds
  waitTime: number; // seconds
  totalTime: number; // seconds
  bestCase: number; // seconds
  worstCase: number; // seconds
}

export interface PathSegment {
  points: Point[];
  isStroke: boolean;
}
