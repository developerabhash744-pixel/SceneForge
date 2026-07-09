import { useState, useEffect } from 'react';
import type { Keyframe, SceneObject, ObjectType, EditorState, AnimationTrack, Project } from './types';
import { ThreeViewport } from './components/ThreeViewport';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ProjectHub } from './components/ProjectHub';
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
  Menu,
  X,
  Sliders,
  FileCode,
  Eye,
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
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'hub' | 'editor'>('hub');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet'>(() => {
    const saved = localStorage.getItem('sceneforge_viewport_mode');
    return (saved as any) || 'mobile';
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
          }
        } catch (e) {
          console.error('Error restoring active project', e);
        }
      }
    }
  }, []);

  // Auto-save changes to the active project in the database
  useEffect(() => {
    if (activeProjectId) {
      const raw = localStorage.getItem('sceneforge_all_projects');
      if (raw) {
        try {
          const allProjects = JSON.parse(raw) as Project[];
          const idx = allProjects.findIndex((p) => p.id === activeProjectId);
          if (idx !== -1) {
            allProjects[idx].objects = objects;
            allProjects[idx].editorState = editorState;
            localStorage.setItem('sceneforge_all_projects', JSON.stringify(allProjects));
          }
        } catch (err) {
          console.error('Error auto-saving project changes', err);
        }
      }
    }
  }, [objects, editorState, activeProjectId]);

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
              onSelectObject={handleSelectObject}
              onAddObject={(type, customProps) => {
                handleAddObject(type, customProps);
                setSidebarOpen(false); // Auto-close drawer on spawn so user can see it in 3D viewport
              }}
              onDeleteObject={handleDeleteObject}
              onUpdateObject={handleUpdateObject}
              onDuplicateObject={handleDuplicateObject}
              onUpdateState={handleUpdateState}
            />
          </div>
        </div>

        {/* Center Viewport */}
        <main className="viewport-wrapper" style={{ position: 'relative' }}>
          {/* Visual measurement ruler readouts HUD */}
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
          {/* Overlay Viewport Controls */}
          {/* Top-Left: Transform Modes */}
          <div className="viewport-overlay-controls top-left">
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
              <span className="overlay-divider" style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
              <button
                className="overlay-btn space-toggle-btn"
                onClick={() => handleUpdateState({ transformSpace: editorState.transformSpace === 'local' ? 'world' : 'local' })}
                title={`Coordinate Space: ${editorState.transformSpace.toUpperCase()}`}
                style={{ fontSize: '9px', fontWeight: 'bold', width: 'auto', padding: '0 8px' }}
              >
                {editorState.transformSpace.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Top-Right: Grid Snapping */}
          <div className="viewport-overlay-controls top-right">
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
                    title="Translation Snap (Grid)"
                  >
                    <option value={0.1}>Grid: 0.1m</option>
                    <option value={0.25}>Grid: 0.25m</option>
                    <option value={0.5}>Grid: 0.5m</option>
                    <option value={1.0}>Grid: 1.0m</option>
                  </select>
                  <select
                    value={editorState.snapRotation}
                    onChange={(e) => handleUpdateState({ snapRotation: parseFloat(e.target.value) })}
                    className="snap-select"
                    title="Rotation Snap"
                  >
                    <option value={5}>Snap: 5°</option>
                    <option value={15}>Snap: 15°</option>
                    <option value={45}>Snap: 45°</option>
                    <option value={90}>Snap: 90°</option>
                  </select>
                  <select
                    value={editorState.snapScale}
                    onChange={(e) => handleUpdateState({ snapScale: parseFloat(e.target.value) })}
                    className="snap-select"
                    title="Scale Snap"
                  >
                    <option value={0.05}>Scale: 0.05x</option>
                    <option value={0.1}>Scale: 0.1x</option>
                    <option value={0.25}>Scale: 0.25x</option>
                    <option value={0.5}>Scale: 0.5x</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Right (Floating above timeline): Camera Presets */}
          <div className="viewport-overlay-controls bottom-right">
            <div className="overlay-group">
              <button
                className={`overlay-btn camera-btn ${editorState.fpsMode ? 'active' : ''}`}
                onClick={() => handleUpdateState({ fpsMode: !editorState.fpsMode })}
                title="Toggle First-Person WASD Walkthrough"
                style={{ background: editorState.fpsMode ? 'rgba(239, 68, 68, 0.25)' : 'none', borderColor: editorState.fpsMode ? 'rgb(239, 68, 68)' : 'transparent' }}
              >
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: editorState.fpsMode ? 'rgb(239, 68, 68)' : 'inherit' }}>FPS</span>
              </button>
              <span className="overlay-divider" style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
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
            isPlaying={editorState.isPlaying}
            fps={editorState.fps}
            loop={editorState.loop}
            cameraPreset={editorState.cameraPreset}
            previewMode={previewModeActive}
            onSelectObject={handleSelectObject}
            onUpdateObjectTransform={handleUpdateObjectTransform}
            onFrameChange={(frame) => handleUpdateState({ currentFrame: frame })}
          />
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
