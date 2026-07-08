import { useState, useEffect } from 'react';
import type { SceneObject, ObjectType, EditorState, AnimationTrack } from './types';
import { ThreeViewport } from './components/ThreeViewport';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import {
  Download,
  Upload,
  RefreshCw,
  Move,
  RotateCw,
  Maximize2,
  MousePointer,
  Grid,
  Video,
  Smartphone,
} from 'lucide-react';
import './App.css';

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
  const [objects, setObjects] = useState<SceneObject[]>(() => {
    const saved = localStorage.getItem('sceneforge_level');
    return saved ? JSON.parse(saved) : initialObjects;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  });

  // Save current project state in LocalStorage on object modification
  useEffect(() => {
    localStorage.setItem('sceneforge_level', JSON.stringify(objects));
  }, [objects]);

  const handleUpdateState = (updates: Partial<typeof editorState>) => {
    setEditorState((prev) => ({ ...prev, ...updates }));
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
  const handleAddObject = (type: ObjectType) => {
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
      group: `Group ${typeCount}`,
    };

    const newObj: SceneObject = {
      id: `${type}-${Date.now()}`,
      name: nameMap[type],
      type,
      visible: true,
      locked: false,
      parentId: null,
      position: [0, type === 'plane' ? 0 : 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: type.includes('Light') ? '#ffffff' : '#cbd5e1',
      tracks: [],
      customProperties: {},
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
    setSelectedId(newObj.id);
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

  return (
    <div className="sceneforge-app dark-theme">
      {/* Top Header Bar */}
      <header className="app-header">
        <div className="header-left">
          <Smartphone className="logo-icon text-cyan-400" />
          <div className="logo-text">
            <h1>SceneForge</h1>
            <span className="subtitle">Mobile Level & Anim Editor</span>
          </div>
        </div>

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
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="workspace-main">
        {/* Left Drawer Panels */}
        <Sidebar
          objects={objects}
          selectedId={selectedId}
          onSelectObject={setSelectedId}
          onAddObject={handleAddObject}
          onDeleteObject={handleDeleteObject}
          onUpdateObject={handleUpdateObject}
        />

        {/* Center Viewport */}
        <main className="viewport-wrapper">
          {/* Overlay Viewport Controls */}
          <div className="viewport-overlay-controls">
            {/* Transform Modes */}
            <div className="overlay-group">
              <button
                className={`overlay-btn ${editorState.transformMode === 'select' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ transformMode: 'select' })}
                title="Selection Mode"
              >
                <MousePointer size={16} />
              </button>
              <button
                className={`overlay-btn ${editorState.transformMode === 'translate' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ transformMode: 'translate' })}
                title="Translate Gizmo (G)"
              >
                <Move size={16} />
              </button>
              <button
                className={`overlay-btn ${editorState.transformMode === 'rotate' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ transformMode: 'rotate' })}
                title="Rotate Gizmo (R)"
              >
                <RotateCw size={16} />
              </button>
              <button
                className={`overlay-btn ${editorState.transformMode === 'scale' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ transformMode: 'scale' })}
                title="Scale Gizmo (S)"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* Grid Snapping */}
            <div className="overlay-group">
              <button
                className={`overlay-btn snap-toggle ${editorState.snapEnabled ? 'active' : ''}`}
                onClick={() => handleUpdateState({ snapEnabled: !editorState.snapEnabled })}
                title="Toggle Snapping"
              >
                <Grid size={16} />
              </button>
              {editorState.snapEnabled && (
                <div className="snap-options">
                  <select
                    value={editorState.snapTranslation}
                    onChange={(e) => handleUpdateState({ snapTranslation: parseFloat(e.target.value) })}
                    className="snap-select"
                    title="Translation Snap"
                  >
                    <option value={0.1}>0.1m</option>
                    <option value={0.25}>0.25m</option>
                    <option value={0.5}>0.5m</option>
                    <option value={1.0}>1.0m</option>
                  </select>
                  <select
                    value={editorState.snapRotation}
                    onChange={(e) => handleUpdateState({ snapRotation: parseFloat(e.target.value) })}
                    className="snap-select"
                    title="Rotation Snap"
                  >
                    <option value={5}>5°</option>
                    <option value={15}>15°</option>
                    <option value={45}>45°</option>
                    <option value={90}>90°</option>
                  </select>
                </div>
              )}
            </div>

            {/* Camera Presets */}
            <div className="overlay-group">
              <button
                className={`overlay-btn camera-btn ${editorState.cameraPreset === 'perspective' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ cameraPreset: 'perspective' })}
                title="Perspective Camera"
              >
                <Video size={16} />
              </button>
              <button
                className={`overlay-btn camera-btn ${editorState.cameraPreset === 'top' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ cameraPreset: 'top' })}
                title="Top Ortho"
              >
                <span>TOP</span>
              </button>
              <button
                className={`overlay-btn camera-btn ${editorState.cameraPreset === 'front' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ cameraPreset: 'front' })}
                title="Front Ortho"
              >
                <span>FRNT</span>
              </button>
              <button
                className={`overlay-btn camera-btn ${editorState.cameraPreset === 'right' ? 'active' : ''}`}
                onClick={() => handleUpdateState({ cameraPreset: 'right' })}
                title="Right Ortho"
              >
                <span>RGHT</span>
              </button>
            </div>
          </div>

          {/* ThreeJS viewport component */}
          <ThreeViewport
            objects={objects}
            selectedId={selectedId}
            transformMode={editorState.transformMode}
            snapEnabled={editorState.snapEnabled}
            snapTranslation={editorState.snapTranslation}
            snapRotation={editorState.snapRotation}
            snapScale={editorState.snapScale}
            currentFrame={editorState.currentFrame}
            isPlaying={editorState.isPlaying}
            fps={editorState.fps}
            loop={editorState.loop}
            cameraPreset={editorState.cameraPreset}
            onSelectObject={setSelectedId}
            onUpdateObjectTransform={handleUpdateObjectTransform}
            onFrameChange={(frame) => handleUpdateState({ currentFrame: frame })}
          />
        </main>

        {/* Right Drawer Inspector */}
        <Inspector
          object={selectedObject}
          currentFrame={editorState.currentFrame}
          onUpdateObject={handleUpdateObject}
          onToggleKeyframe={handleToggleKeyframe}
        />
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
        onUpdateState={handleUpdateState}
        onUpdateObject={handleUpdateObject}
      />
    </div>
  );
}
export default App;
