/**
 * Text-to-path conversion for drone light painting.
 * Converts text into vector stroke paths that can be exported to Lua scripts.
 * 
 * Note: This implementation uses a simplified approach. For production use,
 * consider using a proper font parsing library like opentype.js.
 */

import { Point, TextShape } from '@/shared/types';

/**
 * Convert text to stroke paths.
 * This is a simplified implementation that approximates text with basic stroke paths.
 * For accurate results, integrate a font parsing library.
 */
export function convertTextToPath(textShape: TextShape): Point[][] {
  if (/[^a-z0-9 ]/i.test(textShape.text)) throw new Error('Stroke font supports only A-Z, 0-9 and spaces.');
  const paths: Point[][] = [];
  const { text, x, y, fontSize, alignment } = textShape;
  
  // For now, use a simplified stroke-based approach
  // In production, use opentype.js or similar for accurate font rendering
  
  const charPaths = convertCharactersToPaths(text, fontSize);
  
  // Position characters based on alignment
  let currentX = x;
  const totalWidth = Math.max(0, text.length * fontSize * 1.1 - fontSize * 0.1);
  
  if (alignment === 'center') {
    currentX = x - totalWidth / 2;
  } else if (alignment === 'right') {
    currentX = x - totalWidth;
  }
  
  for (const charPath of charPaths) {
    const offsetPaths = charPath.paths.map(path =>
      path.map(p => ({
        x: p.x + currentX,
        y: p.y + y,
      }))
    );
    paths.push(...offsetPaths);
    currentX += charPath.width + fontSize * 0.1; // Add spacing
  }
  
  return paths;
}

/**
 * Simplified character to path conversion.
 * This is a placeholder - in production, use actual font data.
 */
interface CharPathData {
  paths: Point[][];
  width: number;
}

function convertCharactersToPaths(text: string, fontSize: number): CharPathData[] {
  const result: CharPathData[] = [];
  
  // Simplified stroke-based character definitions
  // Each character is defined as a set of stroke paths (0-1 normalized coordinates)
  // Each path is an array of points
  const charDefinitions: Record<string, Point[][]> = {
    'A': [
      [{ x: 0, y: 1 }, { x: 0.5, y: 0 }, { x: 1, y: 1 }], // Main V
      [{ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }], // Crossbar
    ],
    'B': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }], // Left vertical
      [{ x: 0, y: 0 }, { x: 0.7, y: 0 }, { x: 0.8, y: 0.25 }, { x: 0.7, y: 0.5 }, { x: 0, y: 0.5 }], // Top loop
      [{ x: 0, y: 0.5 }, { x: 0.7, y: 0.5 }, { x: 0.8, y: 0.75 }, { x: 0.7, y: 1 }, { x: 0, y: 1 }], // Bottom loop
    ],
    'C': [
      [{ x: 0.8, y: 0.2 }, { x: 0.5, y: 0 }, { x: 0.2, y: 0.2 }, { x: 0, y: 0.5 }, { x: 0.2, y: 0.8 }, { x: 0.5, y: 1 }, { x: 0.8, y: 0.8 }],
    ],
    'D': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }], // Left vertical
      [{ x: 0, y: 0 }, { x: 0.6, y: 0 }, { x: 0.8, y: 0.5 }, { x: 0.6, y: 1 }, { x: 0, y: 1 }], // Right curve
    ],
    'E': [
      [{ x: 0.8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0.8, y: 1 }], // Outer
      [{ x: 0, y: 0.5 }, { x: 0.6, y: 0.5 }], // Middle bar
    ],
    'F': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }], // Vertical
      [{ x: 0, y: 0 }, { x: 0.8, y: 0 }], // Top bar
      [{ x: 0, y: 0.5 }, { x: 0.6, y: 0.5 }], // Middle bar
    ],
    'G': [
      [{ x: 0.8, y: 0.2 }, { x: 0.5, y: 0 }, { x: 0.2, y: 0.2 }, { x: 0, y: 0.5 }, { x: 0.2, y: 0.8 }, { x: 0.5, y: 1 }, { x: 0.8, y: 0.8 }, { x: 0.8, y: 0.5 }, { x: 0.5, y: 0.5 }],
    ],
    'H': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }], // Left vertical
      [{ x: 1, y: 0 }, { x: 1, y: 1 }], // Right vertical
      [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }], // Crossbar
    ],
    'I': [
      [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], // Main stroke
      [{ x: 0.2, y: 0 }, { x: 0.8, y: 0 }], // Top bar
      [{ x: 0.2, y: 1 }, { x: 0.8, y: 1 }], // Bottom bar
    ],
    'J': [
      [{ x: 0.7, y: 0 }, { x: 0.7, y: 0.8 }, { x: 0.5, y: 1 }, { x: 0.2, y: 0.8 }],
    ],
    'K': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }], // Vertical
      [{ x: 0, y: 0.5 }, { x: 0.8, y: 0 }], // Upper diagonal
      [{ x: 0, y: 0.5 }, { x: 0.8, y: 1 }], // Lower diagonal
    ],
    'L': [
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0.8, y: 1 }],
    ],
    'M': [
      [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    ],
    'N': [
      [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
    ],
    'O': [
      [{ x: 0.5, y: 0 }, { x: 0, y: 0.5 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0 }],
    ],
    'P': [
      [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0.6, y: 0 }, { x: 0.8, y: 0.25 }, { x: 0.6, y: 0.5 }, { x: 0, y: 0.5 }],
    ],
    'Q': [
      [{ x: 0.5, y: 0 }, { x: 0, y: 0.5 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0 }], // O
      [{ x: 0.6, y: 0.7 }, { x: 0.9, y: 1 }], // Tail
    ],
    'R': [
      [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0.6, y: 0 }, { x: 0.8, y: 0.25 }, { x: 0.6, y: 0.5 }, { x: 0, y: 0.5 }], // P
      [{ x: 0.4, y: 0.5 }, { x: 0.8, y: 1 }], // Leg
    ],
    'S': [
      [{ x: 0.8, y: 0.2 }, { x: 0.5, y: 0 }, { x: 0.2, y: 0.2 }, { x: 0.2, y: 0.4 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.6 }, { x: 0.8, y: 0.8 }, { x: 0.5, y: 1 }, { x: 0.2, y: 0.8 }],
    ],
    'T': [
      [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], // Vertical
      [{ x: 0, y: 0 }, { x: 1, y: 0 }], // Top bar
    ],
    'U': [
      [{ x: 0, y: 0 }, { x: 0, y: 0.8 }, { x: 0.2, y: 1 }, { x: 0.8, y: 1 }, { x: 1, y: 0.8 }, { x: 1, y: 0 }],
    ],
    'V': [
      [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }],
    ],
    'W': [
      [{ x: 0, y: 0 }, { x: 0.25, y: 1 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 1 }, { x: 1, y: 0 }],
    ],
    'X': [
      [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      [{ x: 1, y: 0 }, { x: 0, y: 1 }],
    ],
    'Y': [
      [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }], // Top V
      [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 1 }], // Stem
    ],
    'Z': [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    ],
    '0': [
      [{ x: 0.5, y: 0 }, { x: 0, y: 0.5 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0 }],
    ],
    '1': [
      [{ x: 0.3, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
      [{ x: 0.2, y: 1 }, { x: 0.8, y: 1 }],
    ],
    '2': [
      [{ x: 0, y: 0 }, { x: 0.8, y: 0 }, { x: 1, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0, y: 0.8 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    ],
    '3': [
      [{ x: 0, y: 0 }, { x: 0.8, y: 0 }, { x: 1, y: 0.2 }, { x: 0.7, y: 0.5 }, { x: 1, y: 0.8 }, { x: 0.8, y: 1 }, { x: 0, y: 1 }],
    ],
    '4': [
      [{ x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
      [{ x: 1, y: 0 }, { x: 1, y: 1 }],
    ],
    '5': [
      [{ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: 0.8, y: 0.5 }, { x: 1, y: 0.7 }, { x: 0.8, y: 1 }, { x: 0, y: 1 }],
    ],
    '6': [
      [{ x: 0.8, y: 0 }, { x: 0.3, y: 0 }, { x: 0, y: 0.3 }, { x: 0, y: 0.7 }, { x: 0.3, y: 1 }, { x: 0.8, y: 1 }, { x: 1, y: 0.7 }, { x: 0.5, y: 0.5 }],
    ],
    '7': [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
    ],
    '8': [
      [{ x: 0.5, y: 0 }, { x: 0, y: 0.3 }, { x: 0, y: 0.7 }, { x: 0.5, y: 1 }, { x: 1, y: 0.7 }, { x: 1, y: 0.3 }, { x: 0.5, y: 0 }],
      [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }],
    ],
    '9': [
      [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.3 }, { x: 1, y: 0.7 }, { x: 0.7, y: 1 }, { x: 0.2, y: 1 }, { x: 0, y: 0.7 }, { x: 0, y: 0.3 }, { x: 0.5, y: 0 }],
    ],
    ' ': [], // Space
  };
  
  for (const char of text) {
    const upperChar = char.toUpperCase();
    const definition = charDefinitions[upperChar] || charDefinitions[' '];
    
    const scaledPaths = definition.map(path =>
      path.map(p => ({
        x: p.x * fontSize,
        y: p.y * fontSize,
      }))
    );
    
    result.push({
      paths: scaledPaths,
      width: fontSize, // Approximate character width
    });
  }
  
  return result;
}

/**
 * Estimate the bounding box of converted text paths.
 */
export function estimateTextBounds(paths: Point[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (paths.length === 0 || paths[0].length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const path of paths) {
    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Validate that text conversion was successful.
 */
export function validateTextConversion(textShape: TextShape): boolean {
  if (!textShape.convertedPath || textShape.convertedPath.length === 0) {
    return false;
  }
  
  // Check that all paths have at least 2 points
  for (const path of textShape.convertedPath) {
    if (path.length < 2) {
      return false;
    }
  }
  
  return true;
}
