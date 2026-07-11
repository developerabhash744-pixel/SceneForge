import { useState, useEffect } from 'react';
import type { Keyframe, SceneObject, ObjectType, EditorState, AnimationTrack, Project, ProjectScene } from './types';
import { ThreeViewport } from './components/ThreeViewport';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ProjectHub } from './components/ProjectHub';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { autocompletion } from '@codemirror/autocomplete';

interface EditorTab {
  id: string;
  name: string;
  type: 'scene' | 'script';
  targetId?: string;
}
import {
  Download,
  Upload,
  RefreshCw,
  Move,
  RotateCw,
  Maximize2,
  MousePointer,
  Grid,
  Smartphone,
  Menu,
  X,
  Sliders,
  FileCode,
  Eye,
} from 'lucide-react';
import './App.css';

const sceneForgeCompletions = [
  // --- Core State Variables ---
  { label: 'pos', type: 'variable', info: 'Position vector [x, y, z]. Modifying pos[1] shifts vertical height.' },
  { label: 'rot', type: 'variable', info: 'Rotation vector [x, y, z] in degrees (pitch, yaw, roll). e.g. rot[1] = frame * 2' },
  { label: 'scl', type: 'variable', info: 'Scale vector [x, y, z]. Default is [1.0, 1.0, 1.0].' },
  { label: 'frame', type: 'keyword', info: 'Current playhead frame (integer, starting at 0).' },
  { label: 'time', type: 'keyword', info: 'Current animation time in seconds (float, playhead time).' },
  { label: 'THREE', type: 'namespace', info: 'Raw Three.js library reference for advanced math and WebGL objects.' },

  // --- Python Math Functions & Constants ---
  { label: 'math.sin', type: 'function', info: 'math.sin(x) -> Returns sine of angle x (in radians).' },
  { label: 'math.cos', type: 'function', info: 'math.cos(x) -> Returns cosine of angle x (in radians).' },
  { label: 'math.tan', type: 'function', info: 'math.tan(x) -> Returns tangent of angle x (in radians).' },
  { label: 'math.asin', type: 'function', info: 'math.asin(x) -> Returns arc sine of x (in radians).' },
  { label: 'math.acos', type: 'function', info: 'math.acos(x) -> Returns arc cosine of x (in radians).' },
  { label: 'math.atan', type: 'function', info: 'math.atan(x) -> Returns arc tangent of x (in radians).' },
  { label: 'math.atan2', type: 'function', info: 'math.atan2(y, x) -> Returns arc tangent of y/x in radians.' },
  { label: 'math.pi', type: 'constant', info: 'Mathematical constant pi (approx. 3.14159).' },
  { label: 'math.e', type: 'constant', info: 'Mathematical constant e (approx. 2.71828).' },
  { label: 'math.tau', type: 'constant', info: 'Mathematical constant tau (2 * pi, approx. 6.28318).' },
  { label: 'math.sqrt', type: 'function', info: 'math.sqrt(x) -> Returns square root of x.' },
  { label: 'math.pow', type: 'function', info: 'math.pow(x, y) -> Returns x raised to the power of y.' },
  { label: 'math.log', type: 'function', info: 'math.log(x, base=e) -> Returns logarithm of x to base e.' },
  { label: 'math.exp', type: 'function', info: 'math.exp(x) -> Returns e raised to the power of x.' },
  { label: 'math.floor', type: 'function', info: 'math.floor(x) -> Returns floor of x.' },
  { label: 'math.ceil', type: 'function', info: 'math.ceil(x) -> Returns ceil of x.' },
  { label: 'math.round', type: 'function', info: 'math.round(x) -> Returns nearest integer to x.' },
  { label: 'math.degrees', type: 'function', info: 'math.degrees(x) -> Converts angle x from radians to degrees.' },
  { label: 'math.radians', type: 'function', info: 'math.radians(x) -> Converts angle x from degrees to radians.' },
  { label: 'math.abs', type: 'function', info: 'math.abs(x) -> Returns absolute value of x.' },
  { label: 'math.fabs', type: 'function', info: 'math.fabs(x) -> Returns float absolute value of x.' },
  { label: 'math.factorial', type: 'function', info: 'math.factorial(n) -> Returns n! (factorial).' },
  { label: 'math.fmod', type: 'function', info: 'math.fmod(x, y) -> Returns float remainder of x/y.' },
  { label: 'math.gcd', type: 'function', info: 'math.gcd(x, y) -> Returns greatest common divisor of x and y.' },
  { label: 'math.hypot', type: 'function', info: 'math.hypot(*coordinates) -> Returns Euclidean norm of coordinates.' },
  { label: 'math.sinh', type: 'function', info: 'math.sinh(x) -> Returns hyperbolic sine of x.' },
  { label: 'math.cosh', type: 'function', info: 'math.cosh(x) -> Returns hyperbolic cosine of x.' },
  { label: 'math.tanh', type: 'function', info: 'math.tanh(x) -> Returns hyperbolic tangent of x.' },
  { label: 'math.isinf', type: 'function', info: 'math.isinf(x) -> Returns True if x is infinity.' },
  { label: 'math.isnan', type: 'function', info: 'math.isnan(x) -> Returns True if x is NaN.' },
  { label: 'math.asinh', type: 'function', info: 'math.asinh(x) -> Returns inverse hyperbolic sine of x.' },
  { label: 'math.acosh', type: 'function', info: 'math.acosh(x) -> Returns inverse hyperbolic cosine of x.' },
  { label: 'math.atanh', type: 'function', info: 'math.atanh(x) -> Returns inverse hyperbolic tangent of x.' },
  { label: 'math.copysign', type: 'function', info: 'math.copysign(x, y) -> Returns x with the sign of y.' },
  { label: 'math.erf', type: 'function', info: 'math.erf(x) -> Returns the error function of x.' },
  { label: 'math.erfc', type: 'function', info: 'math.erfc(x) -> Returns the complementary error function of x.' },
  { label: 'math.gamma', type: 'function', info: 'math.gamma(x) -> Returns the Gamma function of x.' },
  { label: 'math.lgamma', type: 'function', info: 'math.lgamma(x) -> Returns natural log of absolute value of Gamma function.' },

  // --- Animation Helper Functions ---
  { label: 'lerp', type: 'function', info: 'lerp(a, b, t) -> Linearly interpolates between a and b by fraction t.' },
  { label: 'clamp', type: 'function', info: 'clamp(val, min_val, max_val) -> Constrains val between min and max bounds.' },
  { label: 'map_range', type: 'function', info: 'map_range(val, inMin, inMax, outMin, outMax) -> Maps value to a target range.' },
  { label: 'ease_in_quad', type: 'function', info: 'ease_in_quad(t) -> Starts slow, accelerates. Quadratic ease-in.' },
  { label: 'ease_out_quad', type: 'function', info: 'ease_out_quad(t) -> Starts fast, decelerates. Quadratic ease-out.' },
  { label: 'ease_in_out_quad', type: 'function', info: 'ease_in_out_quad(t) -> Accelerates then decelerates. Quadratic ease-in-out.' },

  // --- Coordinate Shortcuts ---
  { label: 'pos[0]', type: 'variable', info: 'X Coordinate of current object position.' },
  { label: 'pos[1]', type: 'variable', info: 'Y Coordinate of current object position (Vertical height).' },
  { label: 'pos[2]', type: 'variable', info: 'Z Coordinate of current object position.' },
  { label: 'rot[0]', type: 'variable', info: 'X axis rotation (Pitch) in degrees.' },
  { label: 'rot[1]', type: 'variable', info: 'Y axis rotation (Yaw) in degrees.' },
  { label: 'rot[2]', type: 'variable', info: 'Z axis rotation (Roll) in degrees.' },
  { label: 'scl[0]', type: 'variable', info: 'Scale factor along X axis.' },
  { label: 'scl[1]', type: 'variable', info: 'Scale factor along Y axis.' },
  { label: 'scl[2]', type: 'variable', info: 'Scale factor along Z axis.' },

  // --- ThreeJS Vectors & Helpers ---
  { label: 'THREE.Vector2', type: 'class', info: 'THREE.Vector2(x, y) -> Represents 2D vectors.' },
  { label: 'THREE.Vector3', type: 'class', info: 'THREE.Vector3(x, y, z) -> Represents 3D vectors.' },
  { label: 'THREE.Euler', type: 'class', info: 'THREE.Euler(x, y, z, order) -> Represents Euler angles for rotation.' },
  { label: 'THREE.Quaternion', type: 'class', info: 'THREE.Quaternion(x, y, z, w) -> Represents quaternions for rotation.' },
  { label: 'THREE.Color', type: 'class', info: 'THREE.Color(color) -> Base class defining RGB/Hex colors.' },
  { label: 'THREE.Matrix4', type: 'class', info: 'THREE.Matrix4() -> Represents a 4x4 matrix.' },
  { label: 'THREE.Box3', type: 'class', info: 'THREE.Box3(min, max) -> Represents an axis-aligned bounding box.' },
  { label: 'THREE.Sphere', type: 'class', info: 'THREE.Sphere(center, radius) -> Represents a bounding sphere.' },
  { label: 'THREE.MathUtils.lerp', type: 'function', info: 'THREE.MathUtils.lerp(x, y, t) -> Linear interpolation.' },
  { label: 'THREE.MathUtils.clamp', type: 'function', info: 'THREE.MathUtils.clamp(val, min, max) -> Clamps value.' },
  { label: 'THREE.MathUtils.randFloat', type: 'function', info: 'THREE.MathUtils.randFloat(low, high) -> Returns random float.' },
  { label: 'THREE.MathUtils.randFloatSpread', type: 'function', info: 'THREE.MathUtils.randFloatSpread(range) -> Spread random.' },
  { label: 'THREE.MathUtils.degToRad', type: 'function', info: 'degToRad(deg) -> Converts degrees to radians.' },
  { label: 'THREE.MathUtils.radToDeg', type: 'function', info: 'radToDeg(rad) -> Converts radians to degrees.' },

  // --- Motion Constants & Variables ---
  { label: 'sin_wave', type: 'variable', info: 'Variable placeholder: math.sin(frame * frequency) * amplitude' },
  { label: 'cos_wave', type: 'variable', info: 'Variable placeholder: math.cos(frame * frequency) * amplitude' },
  { label: 'frequency', type: 'variable', info: 'Animation cycle speed coefficient.' },
  { label: 'amplitude', type: 'variable', info: 'Animation cycle peak deviation coefficient.' },
  { label: 'phase', type: 'variable', info: 'Animation cycle horizontal offset coefficient.' },

  // --- Animation Presets ---
  { label: 'spin_y', type: 'snippet', info: 'Preset: rot[1] = (frame * 2.0) % 360  # Y-Axis Spin' },
  { label: 'spin_x', type: 'snippet', info: 'Preset: rot[0] = (frame * 2.0) % 360  # X-Axis Spin' },
  { label: 'spin_z', type: 'snippet', info: 'Preset: rot[2] = (frame * 2.0) % 360  # Z-Axis Spin' },
  { label: 'bounce_y', type: 'snippet', info: 'Preset: pos[1] = math.abs(math.sin(frame * 0.1)) * 2.0  # Vertical bounce' },
  { label: 'float_hover', type: 'snippet', info: 'Preset: pos[1] = math.sin(frame * 0.08) * 0.5 + 1.0  # Floating drift hover' },
  { label: 'pulse_scale', type: 'snippet', info: 'Preset: s = 1.0 + math.sin(frame * 0.1) * 0.2; scl[0] = s; scl[1] = s; scl[2] = s  # Pulse' },
  { label: 'orbit_motion', type: 'snippet', info: 'Preset: pos[0] = math.cos(frame * 0.05) * 4.0; pos[2] = math.sin(frame * 0.05) * 4.0  # Orbit path' },
  { label: 'shake_random', type: 'snippet', info: 'Preset: pos[0] += (THREE.MathUtils.randFloatSpread(0.1)); pos[2] += (THREE.MathUtils.randFloatSpread(0.1))  # Shakiness' },
  { label: 'circular_crawl', type: 'snippet', info: 'Preset: r = frame * 0.02; pos[0] = math.cos(frame * 0.1) * r; pos[2] = math.sin(frame * 0.1) * r  # Spiral' },
  { label: 'flicker_effect', type: 'snippet', info: 'Preset: if frame % 4 == 0: scl[0] = 0.9 else: scl[0] = 1.0' },

  // --- Python Control Statements ---
  { label: 'if', type: 'keyword', info: 'Conditional block: if condition:' },
  { label: 'elif', type: 'keyword', info: 'Conditional block branch: elif condition:' },
  { label: 'else', type: 'keyword', info: 'Conditional block fallback: else:' },
  { label: 'while', type: 'keyword', info: 'Loop block: while condition:' },
  { label: 'for', type: 'keyword', info: 'Iteration block: for item in collection:' },
  { label: 'in', type: 'keyword', info: 'Membership test operator.' },
  { label: 'break', type: 'keyword', info: 'Exits the innermost loop immediately.' },
  { label: 'continue', type: 'keyword', info: 'Skips to the next iteration of the loop.' },
  { label: 'pass', type: 'keyword', info: 'Null statement. Acts as a placeholder.' },
  { label: 'return', type: 'keyword', info: 'Exits function and returns a value.' },
  { label: 'import', type: 'keyword', info: 'Imports modules/libraries.' },
  { label: 'from', type: 'keyword', info: 'Imports specific attributes from a module.' },
  { label: 'def', type: 'keyword', info: 'Declares a function: def name(args):' },
  { label: 'class', type: 'keyword', info: 'Declares a class: class ClassName:' },
  { label: 'global', type: 'keyword', info: 'Declares variables to have global scope.' }
];

function sceneForgeAutocompleteSource(context: any) {
  let word = context.matchBefore(/\w*(\.\w*)?/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: sceneForgeCompletions,
    filter: true
  };
}

// Initial default scene objects
const initialObjects: SceneObject[] = [
  {
    id: 'env-ground',
    name: 'Ground Plane',
    type: 'plane',
    visible: true,
    locked: false,
    parentId: null,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [15, 15, 1],
    color: '#334155', // Slate-700
    roughness: 0.8,
    metalness: 0.1,
    opacity: 1.0,
    texture: 'grid',
    tracks: [],
    customProperties: {},
  },
  {
    id: 'mesh-cube-1',
    name: 'Red Cube',
    type: 'cube',
    visible: true,
    locked: false,
    parentId: null,
    position: [-1.5, 0.5, 0],
    rotation: [0, 45, 0],
    scale: [1, 1, 1],
    color: '#ef4444', // Red-500
    roughness: 0.3,
    metalness: 0.2,
    opacity: 1.0,
    texture: 'default',
    tracks: [
      {
        property: 'position',
        keyframes: [
          { frame: 0, value: [-1.5, 0.5, 0], easing: 'easeInOut' },
          { frame: 60, value: [-1.5, 2.0, 0], easing: 'easeInOut' },
          { frame: 120, value: [-1.5, 0.5, 0], easing: 'linear' },
        ],
      },
      {
        property: 'rotation',
        keyframes: [
          { frame: 0, value: [0, 45, 0], easing: 'linear' },
          { frame: 120, value: [0, 405, 0], easing: 'linear' },
        ],
      },
    ],
    customProperties: { hp: '100', obstacle: 'true' },
  },
  {
    id: 'mesh-sphere-1',
    name: 'Glowing Sphere',
    type: 'sphere',
    visible: true,
    locked: false,
    parentId: null,
    position: [1.5, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#06b6d4', // Cyan-500
    roughness: 0.1,
    metalness: 0.9,
    opacity: 1.0,
    texture: 'default',
    tracks: [
      {
        property: 'position',
        keyframes: [
          { frame: 0, value: [1.5, 0.5, 0], easing: 'easeInOut' },
          { frame: 60, value: [2.5, 0.5, 1.5], easing: 'easeInOut' },
          { frame: 120, value: [1.5, 0.5, 0], easing: 'linear' },
        ],
      },
    ],
    customProperties: { collectible: 'true', score: '50' },
  },
  {
    id: 'light-point-1',
    name: 'Point Light Accent',
    type: 'pointLight',
    visible: true,
    locked: false,
    parentId: null,
    position: [0, 3, 1],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#f97316', // Orange light
    intensity: 4.0,
    distance: 12,
    decay: 1.5,
    tracks: [
      {
        property: 'intensity',
        keyframes: [
          { frame: 0, value: [4.0], easing: 'easeInOut' },
          { frame: 60, value: [0.5], easing: 'easeInOut' },
          { frame: 120, value: [4.0], easing: 'linear' },
        ],
      },
    ],
    customProperties: {},
  },
];

export function App() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'hub' | 'editor'>('hub');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet'>(() => {
    const saved = localStorage.getItem('sceneforge_viewport_mode');
    return (saved as any) || 'tablet';
  });

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      if (viewportMode === 'tablet') {
        meta.setAttribute('content', 'width=1024, initial-scale=0.75, maximum-scale=1.5, user-scalable=yes');
      } else {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
    }
    localStorage.setItem('sceneforge_viewport_mode', viewportMode);
  }, [viewportMode]);

  // UI Panel Drawer States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [previewModeActive, setPreviewModeActive] = useState(false);

  // Tab & Multi-Scene States
  const [scenes, setScenes] = useState<ProjectScene[]>([
    { id: 'default', name: 'Main Scene', objects: [] }
  ]);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([
    { id: 'scene-default', name: 'Main Scene', type: 'scene' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('scene-default');
  const [activeSceneId, setActiveSceneId] = useState<string>('default');
  const [activeWorkspace, setActiveWorkspace] = useState<'layout' | 'modeling' | 'shading' | 'animation' | 'scripting'>('layout');
  const [sidebarView, setSidebarView] = useState<'hierarchy' | 'library' | 'creator' | 'project' | 'environment'>('hierarchy');

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoading(false), 200);
          return 100;
        }
        return prev + 4;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setEditorState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          handleDeleteObject(selectedId);
        }
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedId) {
          handleDuplicateObject(selectedId);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (selectedId) {
          const event = new CustomEvent('focus-object-camera', { detail: { id: selectedId } });
          window.dispatchEvent(event);
        }
      } else if (e.key === 'g' || e.key === 'G') {
        if (selectedId) {
          const event = new CustomEvent('drop-object-to-ground', { detail: { id: selectedId } });
          window.dispatchEvent(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, objects]);

  const handleSelectObject = (id: string | null) => {
    setSelectedId(id);
    setTimelineExpanded(!!id);
  };

  // Timeline / State controls
  const [editorState, setEditorState] = useState<Omit<EditorState, 'objects' | 'selectedId'>>({
    currentFrame: 0,
    startFrame: 0,
    endFrame: 120,
    isPlaying: false,
    fps: 30,
    loop: true,
    autoKeyframe: true,
    transformMode: 'translate',
    snapEnabled: false,
    snapTranslation: 0.5,
    snapRotation: 15,
    snapScale: 0.1,
    cameraPreset: 'perspective',
    transformSpace: 'local',
    fpsMode: false,
    skyboxPreset: 'noon',
    fogEnabled: false,
    fogColor: '#1e293b',
    fogDensity: 0.015,
    bloomEnabled: false,
    gridVisible: true,
    measureMode: false,
    gizmoSize: 0.85,
    shadingMode: 'material',
  });

  // Load active project on startup if it exists in database
  useEffect(() => {
    const lastActiveId = localStorage.getItem('sceneforge_active_project_id');
    if (lastActiveId) {
      const raw = localStorage.getItem('sceneforge_all_projects');
      if (raw) {
        try {
          const list = JSON.parse(raw) as Project[];
          const found = list.find((p) => p.id === lastActiveId);
          if (found) {
            setObjects(found.objects);
            setEditorState(found.editorState);
            setActiveProjectId(found.id);
            setCurrentView('editor');
            if (found.scenes && found.scenes.length > 0) {
              setScenes(found.scenes);
              setActiveSceneId(found.scenes[0].id);
            } else {
              setScenes([{ id: 'default', name: 'Main Scene', objects: found.objects }]);
              setActiveSceneId('default');
            }
            setOpenTabs([{ id: `scene-${found.scenes && found.scenes.length > 0 ? found.scenes[0].id : 'default'}`, name: found.scenes && found.scenes.length > 0 ? found.scenes[0].name : 'Main Scene', type: 'scene' }]);
            setActiveTabId(`scene-${found.scenes && found.scenes.length > 0 ? found.scenes[0].id : 'default'}`);
          }
        } catch (e) {
          console.error('Error restoring active project', e);
        }
      }
    }
  }, []);

  // Keep active scene's objects array synchronized with local editor state
  useEffect(() => {
    setScenes(prev => prev.map(sc => sc.id === activeSceneId ? { ...sc, objects } : sc));
  }, [objects, activeSceneId]);

  // Auto-save changes to the active project in the database
  useEffect(() => {
    if (activeProjectId) {
      const raw = localStorage.getItem('sceneforge_all_projects');
      if (raw) {
        try {
          const allProjects = JSON.parse(raw) as Project[];
          const idx = allProjects.findIndex((p) => p.id === activeProjectId);
          if (idx !== -1) {
            allProjects[idx].scenes = scenes;
            const defaultScene = scenes.find(sc => sc.id === 'default');
            if (defaultScene) {
              allProjects[idx].objects = defaultScene.objects;
            } else {
              allProjects[idx].objects = objects;
            }
            allProjects[idx].editorState = editorState;
            localStorage.setItem('sceneforge_all_projects', JSON.stringify(allProjects));
          }
        } catch (err) {
          console.error('Error auto-saving project changes', err);
        }
      }
    }
  }, [objects, editorState, activeProjectId, scenes]);

  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [measureStatus, setMeasureStatus] = useState<'idle' | 'first_clicked' | 'measured'>('idle');

  useEffect(() => {
    const handleRulerUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMeasuredDistance(detail.distance);
      setMeasureStatus(detail.status);
    };
    window.addEventListener('ruler-update', handleRulerUpdate);
    return () => {
      window.removeEventListener('ruler-update', handleRulerUpdate);
    };
  }, []);

  useEffect(() => {
    if (!editorState.measureMode) {
      setMeasuredDistance(null);
      setMeasureStatus('idle');
    }
  }, [editorState.measureMode]);

  const handleUpdateState = (updates: Partial<typeof editorState> & { viewportMode?: 'mobile' | 'tablet' }) => {
    if (updates.viewportMode !== undefined) {
      setViewportMode(updates.viewportMode);
    }
    setEditorState((prev) => ({ ...prev, ...updates }));
  };

  const handleLoadProject = (project: Project) => {
    setObjects(project.objects);
    setEditorState(project.editorState);
    setActiveProjectId(project.id);
    localStorage.setItem('sceneforge_active_project_id', project.id);
    setCurrentView('editor');

    if (project.scenes && project.scenes.length > 0) {
      setScenes(project.scenes);
      setActiveSceneId(project.scenes[0].id);
    } else {
      setScenes([{ id: 'default', name: 'Main Scene', objects: project.objects }]);
      setActiveSceneId('default');
    }
    const firstSceneId = project.scenes && project.scenes.length > 0 ? project.scenes[0].id : 'default';
    const firstSceneName = project.scenes && project.scenes.length > 0 ? project.scenes[0].name : 'Main Scene';
    setOpenTabs([{ id: `scene-${firstSceneId}`, name: firstSceneName, type: 'scene' }]);
    setActiveTabId(`scene-${firstSceneId}`);
  };

  const handleSwitchScene = (targetSceneId: string) => {
    setScenes(prev => prev.map(sc => sc.id === activeSceneId ? { ...sc, objects } : sc));
    const targetScene = scenes.find(sc => sc.id === targetSceneId);
    if (targetScene) {
      setObjects(targetScene.objects);
      setSelectedId(null);
    }
    setActiveSceneId(targetSceneId);
    if (!openTabs.some(t => t.id === `scene-${targetSceneId}`)) {
      setOpenTabs(prev => [...prev, { id: `scene-${targetSceneId}`, name: targetScene?.name || 'Scene', type: 'scene' }]);
    }
    setActiveTabId(`scene-${targetSceneId}`);
  };

  const handleAddScene = (name: string) => {
    const newSceneId = `scene-${Date.now()}`;
    const newScene: ProjectScene = {
      id: newSceneId,
      name,
      objects: []
    };
    setScenes(prev => [...prev, newScene]);
    setOpenTabs(prev => [...prev, { id: `scene-${newSceneId}`, name, type: 'scene' }]);
    setTimeout(() => {
      handleSwitchScene(newSceneId);
    }, 0);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (sceneId === 'default') return;
    setOpenTabs(prev => prev.filter(t => t.id !== `scene-${sceneId}`));
    setScenes(prev => prev.filter(sc => sc.id !== sceneId));
    if (activeTabId === `scene-${sceneId}`) {
      handleSwitchScene('default');
    }
  };

  const handleOpenScriptTab = (objectId: string, scriptName: string) => {
    const tabId = `script-${objectId}`;
    const tabName = scriptName.endsWith('.py') ? scriptName : `${scriptName}.py`;
    setOpenTabs(prev => {
      const exists = prev.some(t => t.id === tabId);
      if (exists) return prev;
      return [...prev, { id: tabId, name: tabName, type: 'script', targetId: objectId }];
    });
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTabId === tabId) {
      const activeIndex = openTabs.findIndex(t => t.id === tabId);
      let nextActiveTab = openTabs[0];
      if (activeIndex > 0) {
        nextActiveTab = openTabs[activeIndex - 1];
      } else if (activeIndex < openTabs.length - 1) {
        nextActiveTab = openTabs[activeIndex + 1];
      }

      if (nextActiveTab.type === 'scene') {
        handleSwitchScene(nextActiveTab.id.replace('scene-', ''));
      } else {
        setActiveTabId(nextActiveTab.id);
      }
    }
    setOpenTabs(prev => prev.filter(t => t.id !== tabId));
  };

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  // Helper to record/autokey changes on a scene object
  const applyAutokey = (
    obj: SceneObject,
    updates: Partial<SceneObject>,
    frame: number
  ): SceneObject => {
    const nextObj = { ...obj, ...updates };
    if (!editorState.autoKeyframe) return nextObj;

    const tracks = [...nextObj.tracks];

    const recordTrackKeyframe = (
      property: AnimationTrack['property'],
      currentValue: number[]
    ) => {
      let trackIndex = tracks.findIndex((t) => t.property === property);
      let track = trackIndex !== -1 ? tracks[trackIndex] : { property, keyframes: [] };

      const existingKfIndex = track.keyframes.findIndex((k) => k.frame === frame);
      const keyframes = [...track.keyframes];

      if (existingKfIndex !== -1) {
        keyframes[existingKfIndex] = {
          ...keyframes[existingKfIndex],
          value: currentValue,
        };
      } else {
        keyframes.push({
          frame,
          value: currentValue,
          easing: 'linear',
        });
      }

      keyframes.sort((a, b) => a.frame - b.frame);
      const updatedTrack = { ...track, keyframes };

      if (trackIndex !== -1) {
        tracks[trackIndex] = updatedTrack;
      } else {
        tracks.push(updatedTrack);
      }
    };

    if ('position' in updates && updates.position) {
      recordTrackKeyframe('position', [...updates.position]);
    }
    if ('rotation' in updates && updates.rotation) {
      recordTrackKeyframe('rotation', [...updates.rotation]);
    }
    if ('scale' in updates && updates.scale) {
      recordTrackKeyframe('scale', [...updates.scale]);
    }
    if ('color' in updates && updates.color) {
      const hex = updates.color;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      recordTrackKeyframe('color', [r, g, b]);
    }
    if ('intensity' in updates && updates.intensity !== undefined) {
      recordTrackKeyframe('intensity', [updates.intensity]);
    }

    nextObj.tracks = tracks;
    return nextObj;
  };

  // Add a shape or light
  const handleAddObject = (type: ObjectType, customProps?: Partial<SceneObject>) => {
    const typeCount = objects.filter((o) => o.type === type).length + 1;
    const nameMap: Record<ObjectType, string> = {
      cube: `Cube ${typeCount}`,
      sphere: `Sphere ${typeCount}`,
      cylinder: `Cylinder ${typeCount}`,
      torus: `Torus ${typeCount}`,
      plane: `Plane ${typeCount}`,
      directionalLight: `Directional Light ${typeCount}`,
      pointLight: `Point Light ${typeCount}`,
      spotLight: `Spot Light ${typeCount}`,
      camera: `Camera ${typeCount}`,
      audio: `Audio ${typeCount}`,
      group: `Group ${typeCount}`,
      gltf: `Model ${typeCount}`,
    };

    const newObj: SceneObject = {
      id: `${type}-${Date.now()}`,
      name: customProps?.name || nameMap[type],
      type,
      visible: true,
      locked: false,
      parentId: customProps?.parentId !== undefined ? customProps.parentId : null,
      position: customProps?.position || (() => {
        let defaultPos: [number, number, number] = [0, type === 'plane' ? 0 : 0.5, 0];
        if (type !== 'plane' && type !== 'group' && !type.includes('Light') && type !== 'camera' && type !== 'audio') {
          let maxY = 0.5;
          objects.forEach((o) => {
            if (Math.abs(o.position[0]) < 0.1 && Math.abs(o.position[2]) < 0.1 && o.type !== 'plane' && o.type !== 'group' && !o.type.includes('Light') && o.type !== 'camera' && o.type !== 'audio') {
              const top = o.position[1] + o.scale[1] / 2;
              if (top > maxY) {
                maxY = top;
              }
            }
          });
          if (maxY > 0.5) {
            defaultPos = [0, maxY + 0.5, 0];
          }
        }
        return defaultPos;
      })(),
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: customProps?.color || (type.includes('Light') ? '#ffffff' : '#cbd5e1'),
      tracks: [],
      customProperties: customProps?.customProperties || {},
    };

    // Special light properties
    if (type.includes('Light')) {
      newObj.intensity = type === 'directionalLight' ? 1.5 : 3.0;
      newObj.distance = 15;
      newObj.decay = 2.0;
      if (type === 'spotLight') {
        newObj.angle = 35;
      }
    } else if (type === 'group') {
      newObj.position = [0, 0, 0];
      newObj.scale = [1, 1, 1];
    } else {
      newObj.roughness = 0.5;
      newObj.metalness = 0.0;
      newObj.opacity = 1.0;
      newObj.wireframe = false;
      newObj.texture = 'default';
    }

    setObjects((prev) => [...prev, newObj]);
    handleSelectObject(newObj.id);
  };

  // Delete an object and resolve parent-child chains
  const handleDeleteObject = (id: string) => {
    setObjects((prev) => {
      // Find deleted object parent
      const deletedObj = prev.find((o) => o.id === id);
      const parentId = deletedObj?.parentId ?? null;

      return prev
        .filter((o) => o.id !== id)
        .map((o) => {
          // If child of deleted, move up to deleted parent
          if (o.parentId === id) {
            return { ...o, parentId };
          }
          return o;
        });
    });
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleDuplicateObject = (id: string) => {
    const sourceObj = objects.find((o) => o.id === id);
    if (!sourceObj) return;

    const newId = `${sourceObj.type}-${Date.now()}`;
    const newObj: SceneObject = JSON.parse(JSON.stringify(sourceObj));
    newObj.id = newId;
    newObj.name = `${sourceObj.name} (Copy)`;
    newObj.position = [sourceObj.position[0] + 0.5, sourceObj.position[1], sourceObj.position[2] + 0.5];

    setObjects((prev) => [...prev, newObj]);
    handleSelectObject(newId);
  };

  // Modify object fields
  const handleUpdateObject = (id: string, updates: Partial<SceneObject>) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        return applyAutokey(o, updates, editorState.currentFrame);
      })
    );
  };

  // Update position/rotation/scale on Gizmo manipulation
  const handleUpdateObjectTransform = (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        return applyAutokey(o, { position, rotation, scale }, editorState.currentFrame);
      })
    );
  };

  // Insert/delete keyframes manually
  const handleToggleKeyframe = (
    id: string,
    property: AnimationTrack['property'],
    frame: number,
    value: number[]
  ) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const tracks = [...o.tracks];
        const trackIndex = tracks.findIndex((t) => t.property === property);

        if (trackIndex !== -1) {
          const track = tracks[trackIndex];
          const kfIndex = track.keyframes.findIndex((k) => k.frame === frame);

          if (kfIndex !== -1) {
            // Delete Keyframe
            const keyframes = track.keyframes.filter((k) => k.frame !== frame);
            if (keyframes.length > 0) {
              tracks[trackIndex] = { ...track, keyframes };
            } else {
              // Delete empty track
              tracks.splice(trackIndex, 1);
            }
          } else {
            // Insert Keyframe
            const keyframes = [...track.keyframes, { frame, value, easing: 'linear' as const }].sort(
              (a, b) => a.frame - b.frame
            );
            tracks[trackIndex] = { ...track, keyframes };
          }
        } else {
          // Create new track with keyframe
          tracks.push({
            property,
            keyframes: [{ frame, value, easing: 'linear' }],
          });
        }

        return { ...o, tracks };
      })
    );
  };

  const handleUpdateKeyframeEasing = (
    id: string,
    property: AnimationTrack['property'],
    frame: number,
    easing: Keyframe['easing']
  ) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const tracks = [...o.tracks];
        const trackIndex = tracks.findIndex((t) => t.property === property);
        if (trackIndex !== -1) {
          const track = tracks[trackIndex];
          const kfIndex = track.keyframes.findIndex((k) => k.frame === frame);
          if (kfIndex !== -1) {
            const keyframes = [...track.keyframes];
            keyframes[kfIndex] = { ...keyframes[kfIndex], easing };
            tracks[trackIndex] = { ...track, keyframes };
          }
        }
        return { ...o, tracks };
      })
    );
  };

  // Level Save/Load Actions
  const handleResetScene = () => {
    if (window.confirm('Are you sure you want to reset the current level scene?')) {
      setObjects(initialObjects);
      setSelectedId(null);
      handleUpdateState({ currentFrame: 0, isPlaying: false });
    }
  };

  const handleExportJSON = () => {
    const levelData = {
      version: '1.0.0',
      generator: 'SceneForge Mobile',
      savedAt: new Date().toISOString(),
      objects,
    };
    const blob = new Blob([JSON.stringify(levelData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sceneforge_level_${Date.now()}.json`;
    link.click();
  };

  const handleExportGLTF = () => {
    const event = new CustomEvent('export-scene-gltf');
    window.dispatchEvent(event);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.objects)) {
          setObjects(data.objects);
          setSelectedId(null);
          alert('Level imported successfully!');
        } else {
          alert('Invalid level JSON file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Find currently selected object
  const selectedObject = objects.find((o) => o.id === selectedId) || null;

  if (loading) {
    return (
      <div className="app-loader-screen animate-fade-in">
        <div className="loader-content">
          <div className="loader-logo-ring">
            <Smartphone size={48} className="loader-icon text-cyan-400" />
          </div>
          <h1 className="loader-title">SceneForge</h1>
          <p className="loader-subtitle">3D Mobile Level & Animation Platform</p>
          
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">Loading Assets & Engine... {progress}%</span>
        </div>
      </div>
    );
  }

  if (currentView === 'hub') {
    return (
      <ProjectHub
        onLoadProject={handleLoadProject}
        activeProjectId={activeProjectId}
        onBackToEditor={() => setCurrentView('editor')}
      />
    );
  }

  return (
    <div className={`sceneforge-app dark-theme viewport-${viewportMode} ${timelineExpanded ? 'timeline-expanded' : 'timeline-collapsed'} ${previewModeActive ? 'preview-mode-active' : ''}`}>
      {/* Top Header Bar */}
      <header className="app-header">
        <div className="header-left">
          {/* Hamburger Menu trigger */}
          <button
            className={`header-toggle-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Spawner & Outliner"
          >
            <Menu size={18} />
          </button>
          <div className="logo-container" onClick={handleBackToHub} title="Back to Project Hub" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Smartphone className="logo-icon text-cyan-400" />
          </div>
          <button
            onClick={handleBackToHub}
            className="header-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-secondary)',
              marginLeft: '12px'
            }}
            title="Switch Workspace / Dashboard"
          >
            <span>Projects Dashboard</span>
          </button>
        </div>

        {/* Blender Workspace Selector (Layout, Modeling, Shading, Animation, Scripting) */}
        {!previewModeActive && (
          <div className="workspace-tab-selector" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            margin: '0 24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            height: '26px'
          }}>
            {[
              { id: 'layout', label: 'Layout' },
              { id: 'modeling', label: 'Modeling' },
              { id: 'shading', label: 'Shading' },
              { id: 'animation', label: 'Animation' },
              { id: 'scripting', label: 'Scripting' }
            ].map((ws) => {
              const isActive = activeWorkspace === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws.id as any);
                    
                    // Automatically configure matching sidebars/editor tabs based on workspace selection
                    if (ws.id === 'modeling') {
                      setSidebarView('library');
                      setSidebarOpen(true);
                      setInspectorOpen(false);
                    } else if (ws.id === 'shading') {
                      setSidebarView('environment');
                      setSidebarOpen(true);
                      setInspectorOpen(true);
                      handleUpdateState({ shadingMode: 'rendered' });
                    } else if (ws.id === 'animation') {
                      setSidebarView('hierarchy');
                      setTimelineExpanded(true);
                      setSidebarOpen(true);
                    } else if (ws.id === 'scripting') {
                      setSidebarView('project');
                      setSidebarOpen(true);
                      const scriptObj = objects.find(o => o.scriptName);
                      if (scriptObj) {
                        handleOpenScriptTab(scriptObj.id, scriptObj.scriptName!);
                      }
                    } else { // layout
                      setSidebarView('hierarchy');
                      setTimelineExpanded(false);
                    }
                  }}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#000' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {ws.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="header-actions">
          {/* Reset Scene */}
          <button className="header-btn reset-btn" onClick={handleResetScene} title="Reset Scene">
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>

          {/* Import JSON */}
          <label className="header-btn import-btn" title="Import Level JSON">
            <Upload size={14} />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          </label>

          {/* Export JSON */}
          <button className="header-btn export-btn" onClick={handleExportJSON} title="Export Level JSON">
            <Download size={14} />
            <span>Export</span>
          </button>

          {/* Export 3D GLTF */}
          <button className="header-btn export-gltf-btn" onClick={handleExportGLTF} title="Export 3D Model (GLTF)">
            <FileCode size={14} className="text-cyan-400" />
            <span>Export 3D</span>
          </button>

          {/* Director Preview Mode Toggle */}
          <button
            className={`header-btn preview-mode-btn ${previewModeActive ? 'active' : ''}`}
            onClick={() => setPreviewModeActive(!previewModeActive)}
            title="Toggle Director Preview Mode"
          >
            <Eye size={14} className="text-cyan-400" />
            <span>Preview</span>
          </button>

          {/* Inspector Panel trigger */}
          <button
            className={`header-toggle-btn ${inspectorOpen ? 'active' : ''} ${selectedId ? 'has-selection' : ''}`}
            onClick={() => setInspectorOpen(!inspectorOpen)}
            title="Toggle Object Properties Inspector"
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="workspace-main">
        {/* Left Slide-out Drawer Panel (Add Shelf / Outliner) */}
        <div className={`drawer-container left-drawer ${sidebarOpen ? 'open' : ''}`}>
          <div className="drawer-backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="drawer-sheet">
            <div className="drawer-sheet-header">
              <h3>Tools & Hierarchy</h3>
              <button className="drawer-close-btn" onClick={() => setSidebarOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <Sidebar
              objects={objects}
              selectedId={selectedId}
              editorState={{ ...editorState, viewportMode }}
              sidebarView={sidebarView}
              onSidebarViewChange={setSidebarView}
              onSelectObject={handleSelectObject}
              onAddObject={(type, customProps) => {
                handleAddObject(type, customProps);
                setSidebarOpen(false); // Auto-close drawer on spawn so user can see it in 3D viewport
              }}
              onDeleteObject={handleDeleteObject}
              onUpdateObject={handleUpdateObject}
              onDuplicateObject={handleDuplicateObject}
              onUpdateState={handleUpdateState}
              projectScenes={scenes}
              openTabs={openTabs}
              onAddScene={handleAddScene}
              onDeleteScene={handleDeleteScene}
              onOpenSceneTab={handleSwitchScene}
              onOpenScriptEditor={(id) => {
                const obj = objects.find(o => o.id === id);
                if (!obj) return;
                if (!obj.scriptName) {
                  const name = prompt("Enter a script name (e.g. rotate_cube):");
                  if (name && name.trim()) {
                    const scriptName = name.trim();
                    handleUpdateObject(id, { script: `# Procedural driver for ${obj.name}\n`, scriptName });
                    handleOpenScriptTab(id, scriptName);
                  }
                } else {
                  handleOpenScriptTab(id, obj.scriptName);
                }
              }}
            />
          </div>
        </div>

        {/* Center Viewport and Tabs Area */}
        <main className="viewport-wrapper" style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Horizontal Tabs Topbar */}
          <div className="editor-tabs-bar" style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid var(--border-light)',
            height: '36px',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: '2px',
            padding: '0 8px',
            zIndex: 50,
            flexShrink: 0
          }}>
            {openTabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    if (tab.type === 'scene') {
                      handleSwitchScene(tab.id.replace('scene-', ''));
                    } else {
                      setActiveTabId(tab.id);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '100%',
                    background: isActive ? 'var(--bg-surface)' : 'rgba(255,255,255,0.02)',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    borderTopLeftRadius: '4px',
                    borderTopRightRadius: '4px',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.type === 'scene' ? <Smartphone size={10} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} /> : <FileCode size={10} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />}
                  <span>{tab.name}</span>
                  {tab.id !== 'scene-default' && (
                    <span
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      style={{
                        marginLeft: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        opacity: 0.5,
                        cursor: 'pointer'
                      }}
                    >
                      <X size={10} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conditional Editor Content Area */}
          {(() => {
            const activeTab = openTabs.find(t => t.id === activeTabId);
            if (activeTab && activeTab.type === 'script') {
              // Python Script Editor
              const targetObj = objects.find(o => o.id === activeTab.targetId);
              if (!targetObj) return (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Object was deleted or is no longer available.
                </div>
              );
              return (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#09090b',
                  padding: '16px',
                  boxSizing: 'border-box',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCode size={14} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Python Editor: {activeTab.name}</span>
                      <span style={{ fontSize: '10px', opacity: 0.4 }}>({targetObj.name})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          const code = `# Floating hover (Sine wave)\nimport math\npos[1] = math.sin(frame * 0.15) * 1.5 + 1.0`;
                          handleUpdateObject(targetObj.id, { script: code });
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '9px',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Hover
                      </button>
                      <button
                        onClick={() => {
                          const code = `# Constantly spin\nrot[1] = (frame * 3.0) % 360`;
                          handleUpdateObject(targetObj.id, { script: code });
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '9px',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Spin
                      </button>
                      <button
                        onClick={() => {
                          const code = `# Pulsing scale\nimport math\ns = 1.0 + math.sin(frame * 0.2) * 0.3\nscl[0] = s\nscl[1] = s\nscl[2] = s`;
                          handleUpdateObject(targetObj.id, { script: code });
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '9px',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Pulse
                      </button>
                      {targetObj.script && (
                        <button
                          onClick={() => {
                            if (confirm("Clear python script?")) {
                              handleUpdateObject(targetObj.id, { script: '' });
                            }
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'rgb(239, 68, 68)',
                            fontSize: '9px',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear Script
                        </button>
                      )}
                    </div>
                  </div>
                  <CodeMirror
                    value={targetObj.script || ''}
                    onChange={(val) => handleUpdateObject(targetObj.id, { script: val })}
                    placeholder="# Write Python code here...&#10;# Example:&#10;# import math&#10;# pos[1] = math.sin(frame * 0.15) * 2"
                    height="100%"
                    theme="dark"
                    extensions={[
                      python(),
                      autocompletion({ override: [sceneForgeAutocompleteSource] })
                    ]}
                    style={{
                      flex: 1,
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      overflowY: 'auto'
                    }}
                  />
                </div>
              );
            }

            // Otherwise, render regular ThreeJS Viewport & overlays
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                {editorState.measureMode && (
                  <div className="ruler-hud-banner" style={{
                    position: 'absolute',
                    top: '64px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgb(0, 240, 255)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fff',
                    zIndex: 100,
                    fontSize: '11px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ color: 'rgb(0, 240, 255)', fontWeight: 'bold' }}>📏 RULER:</span>
                    {measureStatus === 'idle' && <span>Tap 3D surface to start measuring</span>}
                    {measureStatus === 'first_clicked' && <span>First point marked. Tap second point...</span>}
                    {measureStatus === 'measured' && (
                      <>
                        <span>Distance:</span>
                        <strong style={{ color: 'rgb(0, 240, 255)', fontSize: '13px' }}>{measuredDistance?.toFixed(3)}m</strong>
                        <span style={{ fontSize: '9px', opacity: 0.6 }}>(Tap again to measure another)</span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Viewport controls */}
                {/* Viewport Header Bar (Interaction Row) */}
                <div className="viewport-header-bar">
                  <div className="viewport-header-left">
                    {/* Mode Selector */}
                    <select className="viewport-mode-select">
                      <option>Object Mode</option>
                      <option>View Mode</option>
                    </select>

                    <span style={{ opacity: 0.2 }}>|</span>

                    {/* Viewport Menus */}
                    <span className="viewport-menu-item" onClick={() => handleUpdateState({ transformMode: 'select' })}>View</span>
                    <span className="viewport-menu-item" onClick={() => handleSelectObject(null)}>Select</span>
                    <span className="viewport-menu-item" onClick={() => setSidebarView('library')}>Add</span>
                    <span className="viewport-menu-item" style={{ opacity: selectedId ? 1 : 0.4 }} onClick={() => selectedId && handleDeleteObject(selectedId)}>Object</span>
                  </div>

                  <div className="viewport-header-right">
                    {/* Transform Coordinate Space */}
                    <button
                      onClick={() => handleUpdateState({ transformSpace: editorState.transformSpace === 'local' ? 'world' : 'local' })}
                      title={`Coordinate Space: ${editorState.transformSpace.toUpperCase()}`}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-main)',
                        padding: '1px 8px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {editorState.transformSpace.toUpperCase()}
                    </button>

                    <span style={{ opacity: 0.2 }}>|</span>

                    {/* Snapping Control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleUpdateState({ snapEnabled: !editorState.snapEnabled })}
                        title="Toggle Snapping"
                        style={{
                          background: editorState.snapEnabled ? 'rgba(0, 240, 255, 0.2)' : 'none',
                          border: 'none',
                          color: editorState.snapEnabled ? 'rgb(0, 240, 255)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '3px',
                          borderRadius: '4px'
                        }}
                      >
                        <Grid size={13} />
                      </button>
                      {editorState.snapEnabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <select
                            value={editorState.snapTranslation}
                            onChange={(e) => handleUpdateState({ snapTranslation: parseFloat(e.target.value) })}
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '9px', borderRadius: '3px', padding: '1px' }}
                          >
                            <option value={0.1}>0.1m</option>
                            <option value={0.25}>0.25m</option>
                            <option value={0.5}>0.5m</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <span style={{ opacity: 0.2 }}>|</span>

                    {/* Shading Modes (Wireframe, Solid, Material, Rendered) */}
                    <div className="shading-modes-group">
                      <button
                        onClick={() => handleUpdateState({ shadingMode: 'wireframe' })}
                        title="Wireframe View"
                        className={`shading-mode-btn ${editorState.shadingMode === 'wireframe' ? 'active' : ''}`}
                        style={{ color: editorState.shadingMode === 'wireframe' ? '#000' : 'var(--text-secondary)' }}
                      >
                        <span style={{ display: 'block', width: '8px', height: '8px', border: '1px solid currentColor', borderRadius: '50%' }} />
                      </button>
                      <button
                        onClick={() => handleUpdateState({ shadingMode: 'solid' })}
                        title="Solid View"
                        className={`shading-mode-btn ${editorState.shadingMode === 'solid' ? 'active' : ''}`}
                        style={{ color: editorState.shadingMode === 'solid' ? '#000' : 'var(--text-secondary)' }}
                      >
                        <span style={{ display: 'block', width: '8px', height: '8px', background: 'currentColor', borderRadius: '50%' }} />
                      </button>
                      <button
                        onClick={() => handleUpdateState({ shadingMode: 'material' })}
                        title="Material Preview"
                        className={`shading-mode-btn ${editorState.shadingMode === 'material' ? 'active' : ''}`}
                        style={{ color: editorState.shadingMode === 'material' ? '#000' : 'var(--text-secondary)' }}
                      >
                        <span style={{ display: 'block', width: '8px', height: '8px', background: 'currentColor', border: '1px solid var(--text-secondary)', borderRadius: '50%', opacity: 0.6 }} />
                      </button>
                      <button
                        onClick={() => handleUpdateState({ shadingMode: 'rendered' })}
                        title="Rendered View"
                        className={`shading-mode-btn ${editorState.shadingMode === 'rendered' ? 'active' : ''}`}
                        style={{ color: editorState.shadingMode === 'rendered' ? '#000' : 'var(--text-secondary)' }}
                      >
                        <span style={{ display: 'block', width: '8px', height: '8px', background: 'currentColor', borderRadius: '50%', boxShadow: editorState.shadingMode === 'rendered' ? '0 0 4px #fff' : 'none' }} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Left Vertical Toolbar */}
                <div className="viewport-left-toolbar">
                  <button
                    className={`left-toolbar-btn ${editorState.transformMode === 'select' ? 'active' : ''}`}
                    onClick={() => handleUpdateState({ transformMode: 'select' })}
                    title="Select Box"
                  >
                    <MousePointer size={14} />
                  </button>
                  <button
                    className={`left-toolbar-btn ${editorState.transformMode === 'translate' ? 'active' : ''}`}
                    onClick={() => handleUpdateState({ transformMode: 'translate' })}
                    title="Move Tool (G)"
                  >
                    <Move size={14} />
                  </button>
                  <button
                    className={`left-toolbar-btn ${editorState.transformMode === 'rotate' ? 'active' : ''}`}
                    onClick={() => handleUpdateState({ transformMode: 'rotate' })}
                    title="Rotate Tool (R)"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    className={`left-toolbar-btn ${editorState.transformMode === 'scale' ? 'active' : ''}`}
                    onClick={() => handleUpdateState({ transformMode: 'scale' })}
                    title="Scale Tool (S)"
                  >
                    <Maximize2 size={14} />
                  </button>

                  <span style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                  {/* FPS walkthrough mode toggle */}
                  <button
                    className={`left-toolbar-btn ${editorState.fpsMode ? 'active' : ''}`}
                    onClick={() => handleUpdateState({ fpsMode: !editorState.fpsMode })}
                    title="Walkthrough FPS Mode"
                    style={{ background: editorState.fpsMode ? 'rgba(239, 68, 68, 0.2)' : 'none', color: editorState.fpsMode ? 'rgb(239, 68, 68)' : 'var(--text-secondary)' }}
                  >
                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>FPS</span>
                  </button>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(9, 9, 11, 0.75)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--border-light)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  pointerEvents: 'none',
                  zIndex: 10,
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)'
                }}>
                  <span style={{ color: 'var(--accent)' }}>SCALE: {viewportMode.toUpperCase()}</span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span>RES: {viewportMode === 'tablet' ? '1024 x 768' : 'AUTO'}</span>
                </div>

                <ThreeViewport
                  objects={objects}
                  selectedId={selectedId}
                  transformMode={editorState.transformMode}
                  snapEnabled={editorState.snapEnabled}
                  snapTranslation={editorState.snapTranslation}
                  snapRotation={editorState.snapRotation}
                  snapScale={editorState.snapScale}
                  transformSpace={editorState.transformSpace}
                  fpsMode={editorState.fpsMode}
                  skyboxPreset={editorState.skyboxPreset}
                  fogEnabled={editorState.fogEnabled}
                  fogColor={editorState.fogColor}
                  fogDensity={editorState.fogDensity}
                  bloomEnabled={editorState.bloomEnabled}
                  gridVisible={editorState.gridVisible}
                  measureMode={editorState.measureMode}
                  gizmoSize={editorState.gizmoSize}
                  currentFrame={editorState.currentFrame}
                  startFrame={editorState.startFrame}
                  endFrame={editorState.endFrame}
                  isPlaying={editorState.isPlaying}
                  fps={editorState.fps}
                  loop={editorState.loop}
                  cameraPreset={editorState.cameraPreset}
                  previewMode={previewModeActive}
                  shadingMode={editorState.shadingMode}
                  playbackSpeed={editorState.playbackSpeed ?? 1.0}
                  skyboxTint={editorState.skyboxTint || '#ffffff'}
                  cameraOrbitSpeed={editorState.cameraOrbitSpeed ?? 1.0}
                  onSelectObject={handleSelectObject}
                  onUpdateObjectTransform={handleUpdateObjectTransform}
                  onFrameChange={(frame) => handleUpdateState({ currentFrame: frame })}
                  onUpdateState={handleUpdateState}
                />
              </div>
            );
          })()}
        </main>

        {/* Right Slide-out Drawer Panel (Object Inspector) */}
        <div className={`drawer-container right-drawer ${inspectorOpen ? 'open' : ''}`}>
          <div className="drawer-backdrop" onClick={() => setInspectorOpen(false)} />
          <div className="drawer-sheet">
            <div className="drawer-sheet-header">
              <h3>Object Inspector</h3>
              <button className="drawer-close-btn" onClick={() => setInspectorOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <Inspector
              object={selectedObject}
              currentFrame={editorState.currentFrame}
              onUpdateObject={handleUpdateObject}
              onToggleKeyframe={handleToggleKeyframe}
              onDeleteObject={(id) => {
                handleDeleteObject(id);
                setInspectorOpen(false); // Close inspector drawer on delete
              }}
              onDropToGround={(id) => {
                const event = new CustomEvent('drop-object-to-ground', { detail: { id } });
                window.dispatchEvent(event);
              }}
              onDuplicateObject={handleDuplicateObject}
              onUpdateKeyframeEasing={handleUpdateKeyframeEasing}
            />
          </div>
        </div>
      </div>

      {/* Bottom Keyframe Timeline */}
      <Timeline
        object={selectedObject}
        currentFrame={editorState.currentFrame}
        startFrame={editorState.startFrame}
        endFrame={editorState.endFrame}
        isPlaying={editorState.isPlaying}
        fps={editorState.fps}
        loop={editorState.loop}
        autoKeyframe={editorState.autoKeyframe}
        expanded={timelineExpanded}
        playbackSpeed={editorState.playbackSpeed ?? 1.0}
        onToggleExpand={setTimelineExpanded}
        onUpdateState={handleUpdateState}
        onUpdateObject={handleUpdateObject}
      />

      {/* Director Preview Overlays */}
      {previewModeActive && (
        <button
          className="exit-preview-mode-floating-btn"
          onClick={() => setPreviewModeActive(false)}
          title="Exit Preview Mode"
        >
          <Eye size={16} />
          <span>Exit Preview</span>
        </button>
      )}


    </div>
  );
}
export default App;
