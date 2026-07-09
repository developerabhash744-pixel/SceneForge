import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FolderOpen, 
  Trash2, 
  Calendar, 
  FileText, 
  Upload, 
  Download, 
  Layers, 
  Monitor, 
  Video, 
  Sparkles,
  Home
} from 'lucide-react';
import type { Project, SceneObject, ObjectType } from '../types';

interface ProjectHubProps {
  onLoadProject: (project: Project) => void;
  activeProjectId: string | null;
  onBackToEditor?: () => void;
}

const TEMPLATES = [
  {
    id: 'empty',
    name: 'Empty Workspace',
    description: 'A clean scene with zero objects. Perfect for starting from scratch.',
    icon: Monitor,
    skybox: 'noon',
    color: 'from-slate-700 to-slate-900',
    objects: [] as SceneObject[]
  },
  {
    id: 'basic',
    name: 'Basic Stage',
    description: 'A standard floor plane, basic shapes (Cube & Sphere), and dynamic lighting.',
    icon: Sparkles,
    skybox: 'noon',
    color: 'from-blue-700 to-indigo-900',
    objects: [
      {
        id: 'floor-plane-id',
        name: 'Floor Ground',
        type: 'plane' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 0, 0],
        rotation: [-90, 0, 0],
        scale: [15, 15, 1],
        color: '#475569',
        roughness: 0.8,
        metalness: 0.2,
        tracks: [],
        customProperties: {}
      },
      {
        id: 'demo-cube-id',
        name: 'Blue Cube',
        type: 'cube' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [-2, 0.5, 0],
        rotation: [0, 45, 0],
        scale: [1, 1, 1],
        color: '#3b82f6',
        tracks: [],
        customProperties: {}
      },
      {
        id: 'demo-sphere-id',
        name: 'Red Sphere',
        type: 'sphere' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [2, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#ef4444',
        tracks: [],
        customProperties: {}
      },
      {
        id: 'demo-sun-id',
        name: 'Sun Directional Light',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [5, 10, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        intensity: 1.5,
        color: '#ffffff',
        tracks: [],
        customProperties: {}
      },
      {
        id: 'demo-point-id',
        name: 'Warm Point Light',
        type: 'pointLight' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 2.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        intensity: 2.0,
        distance: 10,
        decay: 1.5,
        color: '#f59e0b',
        tracks: [],
        customProperties: {}
      }
    ] as SceneObject[]
  },
  {
    id: 'showroom',
    name: 'Showroom Studio',
    description: 'A moody, dark environment with neon emissive glow rings and a dramatic overhead spotlight.',
    icon: Layers,
    skybox: 'stormy',
    color: 'from-purple-800 to-fuchsia-950',
    fogEnabled: true,
    fogColor: '#181024',
    fogDensity: 0.025,
    bloomEnabled: true,
    objects: [
      {
        id: 'showroom-floor-id',
        name: 'Glossy Floor',
        type: 'plane' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 0, 0],
        rotation: [-90, 0, 0],
        scale: [20, 20, 1],
        color: '#11101b',
        roughness: 0.1,
        metalness: 0.9,
        tracks: [],
        customProperties: {}
      },
      {
        id: 'showroom-torus-id',
        name: 'Neon Glow Torus',
        type: 'torus' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1.2],
        color: '#06b6d4',
        emissive: '#06b6d4',
        emissiveIntensity: 5.0,
        tracks: [],
        customProperties: {}
      },
      {
        id: 'showroom-spot-id',
        name: 'Stage Spot Light',
        type: 'spotLight' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 6, 0],
        rotation: [-90, 0, 0],
        scale: [1, 1, 1],
        intensity: 15.0,
        distance: 15,
        decay: 1.2,
        angle: 40,
        color: '#ffffff',
        tracks: [],
        customProperties: {}
      }
    ] as SceneObject[]
  },
  {
    id: 'space',
    name: 'Space Odyssey',
    description: 'Starfield backdrop scene featuring a centered purple planet mesh and orbiting rings.',
    icon: Video,
    skybox: 'space',
    color: 'from-slate-900 to-indigo-950',
    objects: [
      {
        id: 'planet-body-id',
        name: 'Planet Core',
        type: 'sphere' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        color: '#8b5cf6',
        roughness: 0.6,
        metalness: 0.4,
        tracks: [],
        customProperties: {}
      },
      {
        id: 'planet-ring-id',
        name: 'Orbit Ring',
        type: 'torus' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [0, 0.5, 0],
        rotation: [70, 15, 0],
        scale: [2.8, 2.8, 0.15],
        color: '#3b82f6',
        roughness: 0.2,
        tracks: [],
        customProperties: {}
      },
      {
        id: 'space-sun-id',
        name: 'Deep Space Light',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        parentId: null,
        position: [-10, 5, -5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        intensity: 2.5,
        color: '#a5f3fc',
        tracks: [],
        customProperties: {}
      }
    ] as SceneObject[]
  }
];

export function ProjectHub({ onLoadProject, activeProjectId, onBackToEditor }: ProjectHubProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('empty');

  // Load projects database on mount
  useEffect(() => {
    const raw = localStorage.getItem('sceneforge_all_projects');
    if (raw) {
      try {
        setProjects(JSON.parse(raw));
      } catch (err) {
        console.error('Error loading projects list', err);
      }
    }
  }, []);

  const saveProjectsDatabase = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('sceneforge_all_projects', JSON.stringify(updated));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = projectName.trim() || 'My New Scene';
    const desc = projectDesc.trim() || 'No description provided.';
    const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

    const newProject: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: desc,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      objects: JSON.parse(JSON.stringify(template.objects)),
      editorState: {
        currentFrame: 0,
        startFrame: 0,
        endFrame: 100,
        isPlaying: false,
        fps: 24,
        loop: true,
        autoKeyframe: true,
        transformMode: 'select',
        snapEnabled: false,
        snapTranslation: 0.5,
        snapRotation: 15,
        snapScale: 0.1,
        cameraPreset: 'perspective',
        transformSpace: 'world',
        fpsMode: false,
        skyboxPreset: (template.skybox as any) || 'noon',
        fogEnabled: template.fogEnabled || false,
        fogColor: template.fogColor || '#181024',
        fogDensity: template.fogDensity || 0.015,
        bloomEnabled: template.bloomEnabled || false,
        gridVisible: true,
        measureMode: false,
        gizmoSize: 1.0
      }
    };

    const updated = [newProject, ...projects];
    saveProjectsDatabase(updated);
    onLoadProject(newProject);

    // Reset fields
    setProjectName('');
    setProjectDesc('');
    setSelectedTemplate('empty');
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the project
    if (window.confirm('Are you sure you want to permanently delete this project?')) {
      const updated = projects.filter((p) => p.id !== id);
      saveProjectsDatabase(updated);
    }
  };

  const handleExportProjectJSON = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_SceneForge.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Project;
        if (!imported.id || !imported.name || !Array.isArray(imported.objects)) {
          alert('Invalid SceneForge Project JSON format!');
          return;
        }

        // Assign a new ID if it clashes
        if (projects.some((p) => p.id === imported.id)) {
          imported.id = `project-imported-${Date.now()}`;
        }
        imported.createdAt = `${imported.createdAt} (Imported)`;

        const updated = [imported, ...projects];
        saveProjectsDatabase(updated);
        onLoadProject(imported);
      } catch (err) {
        alert('Failed to parse project JSON file. Make sure it is valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="sceneforge-project-hub" style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Top Header Logo */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(139, 92, 246) 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
          }}>
            <Layers size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
              SceneForge <span style={{ color: 'rgb(6, 182, 212)', fontSize: '12px', fontWeight: 'normal', verticalAlign: 'super', marginLeft: '4px' }}>v2.1</span>
            </h1>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.5 }}>Mobile-First 3D Animation Workstation</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeProjectId && onBackToEditor && (
            <button
              onClick={onBackToEditor}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              title="Return to currently open scene editor"
            >
              <Home size={14} />
              <span>Back to Editor</span>
            </button>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgb(6, 182, 212)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'rgb(34, 211, 238)',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={14} />
            <span>Import Project</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportProjectJSON}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </header>

      {/* Main Grid: Split creator & recent lists */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 400px) 1fr',
        overflow: 'hidden'
      }}>
        {/* Left Side: Create New Project form */}
        <div style={{
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '24px',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: '15px', color: 'rgb(6, 182, 212)', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> New Startup Workspace
          </h2>

          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', opacity: 0.5, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Scene File Name</label>
              <input
                type="text"
                placeholder="e.g. Cinematic Camera Rig"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', opacity: 0.5, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Brief Description</label>
              <textarea
                placeholder="Describe this scene's components or animations..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                style={{
                  width: '100%',
                  height: '70px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Startup Scene Template</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TEMPLATES.map((tpl) => {
                  const IconComp = tpl.icon;
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgb(6, 182, 212)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgb(6, 182, 212)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#000' : 'var(--text-secondary)'
                      }}>
                        <IconComp size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>{tpl.name}</h4>
                        <p style={{ margin: 0, fontSize: '10px', opacity: 0.5, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{tpl.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(139, 92, 246) 100%)',
                color: '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              <span>Initialize Scene File</span>
            </button>
          </form>
        </div>

        {/* Right Side: Recent projects */}
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: '15px', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={16} className="text-cyan-400" /> Recent Projects ({projects.length})
          </h2>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
            alignContent: 'start',
            paddingRight: '6px'
          }}>
            {projects.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
                padding: '60px 0',
                gap: '12px'
              }}>
                <FileText size={40} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>No Recent Scenes Found</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Initialize a new workspace template on the left to begin.</p>
                </div>
              </div>
            ) : (
              projects.map((proj) => {
                const isActive = activeProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => onLoadProject(proj)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid rgb(6, 182, 212)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '160px',
                      position: 'relative',
                      boxShadow: isActive ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      {isActive && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          fontSize: '8px',
                          background: 'rgb(6, 182, 212)',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>
                          ACTIVE
                        </span>
                      )}
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', paddingRight: isActive ? '45px' : '0' }}>{proj.name}</h3>
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', opacity: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{proj.description}</p>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      paddingTop: '10px',
                      marginTop: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', opacity: 0.4 }}>
                        <Calendar size={10} />
                        <span>{proj.createdAt}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleExportProjectJSON(proj, e)}
                          title="Download Backup File (.json)"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          title="Delete Project permanently"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgb(239, 68, 68)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
