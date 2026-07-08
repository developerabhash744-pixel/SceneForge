export interface Keyframe {
  frame: number;
  value: number[]; // e.g. [x, y, z] for position/rotation/scale, [r, g, b] for color, or [val] for intensity
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'constant';
}

export interface AnimationTrack {
  property: 'position' | 'rotation' | 'scale' | 'color' | 'intensity';
  keyframes: Keyframe[];
}

export type ObjectType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'torus'
  | 'plane'
  | 'directionalLight'
  | 'pointLight'
  | 'spotLight'
  | 'group';

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
  // Transform values
  position: [number, number, number];
  rotation: [number, number, number]; // stored in degrees for easier UI binding
  scale: [number, number, number];
  // Material properties (for meshes)
  color?: string; // Hex string e.g. '#3a86ff'
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string; // Hex string
  wireframe?: boolean;
  texture?: 'default' | 'grid' | 'brick' | 'wood' | 'metal';
  // Light properties
  intensity?: number;
  distance?: number;
  decay?: number;
  angle?: number; // SpotLight angle in degrees
  // Animation tracks
  tracks: AnimationTrack[];
  // Custom user-defined tags/metadata
  customProperties: Record<string, string>;
}

export interface EditorState {
  objects: SceneObject[];
  selectedId: string | null;
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  isPlaying: boolean;
  fps: number;
  loop: boolean;
  autoKeyframe: boolean;
  transformMode: 'translate' | 'rotate' | 'scale' | 'select';
  snapEnabled: boolean;
  snapTranslation: number;
  snapRotation: number; // in degrees
  snapScale: number;
  cameraPreset: 'perspective' | 'top' | 'front' | 'right';
}
