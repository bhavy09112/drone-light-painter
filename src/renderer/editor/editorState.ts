import { create } from 'zustand';
import { EditorState, Shape, Point, ToolType } from '@/shared/types';

interface Snapshot { shapes: Shape[]; selectedIds: string[] }

interface EditorStore extends EditorState {
  past: Snapshot[];
  future: Snapshot[];
  checkpoint: () => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>, recordHistory?: boolean) => void;
  deleteShape: (id: string) => void;
  deleteSelected: () => void;
  duplicateShape: (id: string) => void;
  selectShape: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  setPan: (pan: Point) => void;
  setZoom: (zoom: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapDistance: (distance: number) => void;
  setCurrentTool: (tool: ToolType) => void;
  undo: () => void;
  redo: () => void;
}

const initialState: EditorState = {
  shapes: [
    {
      id: 'demo-line-1',
      type: 'line',
      start: { x: 100, y: 100 },
      end: { x: 160, y: 130 },
      strokeThickness: 2,
      selected: false,
      zIndex: 0,
    },
    {
      id: 'demo-rect-1',
      type: 'rectangle',
      x: 350,
      y: 150,
      width: 100,
      height: 80,
      strokeThickness: 2,
      selected: false,
      zIndex: 1,
    },
    {
      id: 'demo-circle-1',
      type: 'circle',
      centerX: 200,
      centerY: 350,
      radius: 50,
      strokeThickness: 2,
      selected: false,
      zIndex: 2,
    },
  ],
  groups: [],
  selectedIds: [],
  pan: { x: 0, y: 0 },
  zoom: 1,
  snapEnabled: true,
  snapDistance: 10,
  currentTool: 'select',
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,
  past: [],
  future: [],
  checkpoint: () => set(state => ({
    past: [...state.past, structuredClone({ shapes: state.shapes, selectedIds: state.selectedIds })].slice(-100),
    future: [],
  })),
  
  addShape: (shape) => (get().checkpoint(), set((state) => ({
    shapes: [...state.shapes, shape],
  }))),
  
  updateShape: (id, updates, recordHistory = true) => (recordHistory && get().checkpoint(), set((state) => ({
    shapes: state.shapes.map((s) => s.id === id ? { ...s, ...updates } as Shape : s),
  }))),
  
  deleteShape: (id) => (get().checkpoint(), set((state) => ({
    shapes: state.shapes.filter((s) => s.id !== id),
    selectedIds: state.selectedIds.filter((sid) => sid !== id),
  }))),

  deleteSelected: () => (get().checkpoint(), set((state) => ({
    shapes: state.shapes.filter((s) => !state.selectedIds.includes(s.id)),
    selectedIds: [],
  }))),

  duplicateShape: (id) => (get().checkpoint(), set((state) => {
    const shape = state.shapes.find((s) => s.id === id);
    if (!shape) return state;

    const newId = `${shape.id}-copy-${Date.now()}`;
    const newShape = {
      ...shape,
      id: newId,
      selected: true,
      zIndex: Math.max(...state.shapes.map((s) => s.zIndex)) + 1,
    };

    return {
      shapes: [...state.shapes.map(s => ({ ...s, selected: false })), newShape],
      selectedIds: [newId],
    };
  })),
  
  selectShape: (id) => set((state) => ({
    selectedIds: [id],
    shapes: state.shapes.map((s) => ({
      ...s,
      selected: s.id === id,
    })),
  })),
  
  selectMultiple: (ids) => set((state) => ({
    selectedIds: ids,
    shapes: state.shapes.map((s) => ({
      ...s,
      selected: ids.includes(s.id),
    })),
  })),
  
  clearSelection: () => set((state) => ({
    selectedIds: [],
    shapes: state.shapes.map((s) => ({ ...s, selected: false })),
  })),
  
  setPan: (pan) => set({ pan }),
  
  setZoom: (zoom) => set({ zoom: Number.isFinite(zoom) ? Math.min(5, Math.max(0.1, zoom)) : 1 }),
  
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  
  setSnapDistance: (distance) => set({ snapDistance: distance }),

  setCurrentTool: (tool) => set({ currentTool: tool }),

  undo: () => {
    const state = get();
    const previous = state.past.at(-1);
    if (!previous) return;
    set({ ...structuredClone(previous), past: state.past.slice(0, -1),
      future: [{ shapes: state.shapes, selectedIds: state.selectedIds }, ...state.future] });
  },

  redo: () => {
    const state = get();
    const next = state.future[0];
    if (!next) return;
    set({ ...structuredClone(next), future: state.future.slice(1),
      past: [...state.past, { shapes: state.shapes, selectedIds: state.selectedIds }] });
  },
}));
