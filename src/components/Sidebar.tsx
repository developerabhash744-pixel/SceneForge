import { useState } from 'react';
import {
  Box,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Folder,
  FolderPlus,
  Sun,
  Lightbulb,
  CornerDownRight,
  Plus,
  Layers,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Camera,
  Music,
  Copy,
} from 'lucide-react';
import type { SceneObject, ObjectType } from '../types';

interface SidebarProps {
  objects: SceneObject[];
  selectedId: string | null;
  editorState: any;
  onSelectObject: (id: string | null) => void;
  onAddObject: (type: ObjectType, customProps?: Partial<SceneObject>) => void;
  onDeleteObject: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  onDuplicateObject: (id: string) => void;
  onUpdateState: (updates: any) => void;
}

interface NodeInfo {
  id: ObjectType;
  name: string;
  category: 'Meshes' | 'Lights' | 'Scene';
  description: string;
  icon: string;
}

const NODE_TYPES: NodeInfo[] = [
  {
    id: 'cube',
    name: 'Cube Node',
    category: 'Meshes',
    description: 'A 3D box mesh. Great for walls, blocks, buildings, platform paths, and general boxy models.',
    icon: 'cube',
  },
  {
    id: 'sphere',
    name: 'Sphere Node',
    category: 'Meshes',
    description: 'A round 3D geometry (UV sphere). Ideal for balls, planets, physics items, and smooth round surfaces.',
    icon: 'sphere',
  },
  {
    id: 'cylinder',
    name: 'Cylinder Node',
    category: 'Meshes',
    description: 'A cylindrical column shape. Useful for pillars, poles, logs, wheels, and pipes.',
    icon: 'cylinder',
  },
  {
    id: 'torus',
    name: 'Torus Node',
    category: 'Meshes',
    description: 'A donut-shaped geometry (ring). Ideal for handles, rings, ropes, and circular framing.',
    icon: 'torus',
  },
  {
    id: 'plane',
    name: 'Plane Node',
    category: 'Meshes',
    description: 'A flat horizontal flat canvas. Generally used for levels floor base, water plane, or flat walls.',
    icon: 'plane',
  },
  {
    id: 'directionalLight',
    name: 'Directional Light',
    category: 'Lights',
    description: 'Parallel light source representing sun rays. Casts uniform shadows across the entire world scene.',
    icon: 'sun',
  },
  {
    id: 'pointLight',
    name: 'Point Light',
    category: 'Lights',
    description: 'A light bulb style node emitting light outwards in all directions. Ideal for torches, lamp bulbs, and fires.',
    icon: 'lightbulb',
  },
  {
    id: 'spotLight',
    name: 'Spot Light',
    category: 'Lights',
    description: 'A cone spotlight emitting directional light in a cone shape. Ideal for torches, streetlamps, and highlights.',
    icon: 'spotlight',
  },
  {
    id: 'group',
    name: 'Group Container',
    category: 'Scene',
    description: 'An organizational pivot node. Use it to nest multiple sub-nodes to rotate or translate them together.',
    icon: 'group',
  },
  {
    id: 'camera',
    name: 'Camera Node',
    category: 'Scene',
    description: 'A physical camera object. Renders a picture-in-picture view of the scene and supports timeline animation.',
    icon: 'camera',
  },
  {
    id: 'audio',
    name: 'Audio Node',
    category: 'Scene',
    description: 'A spatial audio source node. Bind an audio clip to play sound that dynamically shifts in 3D based on camera distance.',
    icon: 'music',
  },
  {
    id: 'gltf',
    name: '3D GLTF Model',
    category: 'Meshes',
    description: 'Import custom 3D models (.gltf / .glb) from your phone or gallery storage. Supports full timeline transform keyframing.',
    icon: 'filecode',
  },
];

export function Sidebar({
  objects,
  selectedId,
  editorState,
  onSelectObject,
  onAddObject,
  onDeleteObject,
  onUpdateObject,
  onDuplicateObject,
  onUpdateState,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [sidebarView, setSidebarView] = useState<'hierarchy' | 'library' | 'creator' | 'environment'>('hierarchy');

  // Node Spawner State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<ObjectType | null>(null);
  const [spawnName, setSpawnName] = useState('');
  const [spawnParent, setSpawnParent] = useState<string>('');
  const [spawnColor, setSpawnColor] = useState('#cbd5e1');
  const [spawnX, setSpawnX] = useState(0);
  const [spawnY, setSpawnY] = useState(0);
  const [spawnZ, setSpawnZ] = useState(0);
  const [gltfModelData, setGltfModelData] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Meshes: true,
    Lights: true,
    Scene: true,
  });

  const selectNodeForSpawning = (type: ObjectType) => {
    setSelectedNodeType(type);
    setGltfModelData('');
    
    // Auto-generate name based on scene counts
    const typeCount = objects.filter((o) => o.type === type).length + 1;
    const defaultNames: Record<ObjectType, string> = {
      cube: `Cube ${typeCount}`,
      sphere: `Sphere ${typeCount}`,
      cylinder: `Cylinder ${typeCount}`,
      torus: `Torus ${typeCount}`,
      plane: `Plane ${typeCount}`,
      directionalLight: `Directional Light ${typeCount}`,
      pointLight: `Point Light ${typeCount}`,
      spotLight: `Spot Light ${typeCount}`,
      camera: `Camera Node ${typeCount}`,
      audio: `Audio Node ${typeCount}`,
      group: `Group ${typeCount}`,
      gltf: `Model ${typeCount}`,
    };
    setSpawnName(defaultNames[type]);
    
    // Default parenting: if an object is selected, suggest it as parent
    setSpawnParent(selectedId || '');
    
    // Default color setting
    setSpawnColor(type.includes('Light') ? '#ffffff' : '#cbd5e1');
    
    // Default position setting
    setSpawnX(0);
    setSpawnY(type === 'plane' || type === 'group' ? 0 : 0.5);
    setSpawnZ(0);

    // Transition to the creation properties screen
    setSidebarView('creator');
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveRename = (id: string) => {
    if (editName.trim()) {
      onUpdateObject(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  // Helper to render tree nodes recursively
  const renderTreeNode = (parentId: string | null, depth: number) => {
    const children = objects.filter((o) => o.parentId === parentId);

    return children.map((obj) => {
      const isSelected = selectedId === obj.id;
      
      // Get appropriate icon for type
      const getIcon = () => {
        switch (obj.type) {
          case 'cube':
          case 'sphere':
          case 'cylinder':
          case 'torus':
          case 'plane':
            return <Box size={14} className="icon-mesh" />;
          case 'directionalLight':
            return <Sun size={14} className="icon-sun" />;
          case 'pointLight':
          case 'spotLight':
            return <Lightbulb size={14} className="icon-light" />;
          case 'camera':
            return <Camera size={14} className="icon-camera" style={{ color: '#c084fc' }} />;
          case 'audio':
            return <Music size={14} className="icon-audio" style={{ color: '#fb923c' }} />;
          case 'group':
            return <FolderPlus size={14} className="icon-group" />;
          default:
            return <Layers size={14} />;
        }
      };

      // Exclude this node and its descendants from the parent list to prevent cyclical parenting
      const isDescendant = (parentToCheckId: string | null, targetId: string): boolean => {
        if (!parentToCheckId) return false;
        if (parentToCheckId === targetId) return true;
        const parent = objects.find((o) => o.id === parentToCheckId);
        return isDescendant(parent?.parentId ?? null, targetId);
      };

      const parentCandidates = objects.filter(
        (o) => o.id !== obj.id && !isDescendant(o.parentId, obj.id)
      );

      return (
        <div key={obj.id} className="tree-item-container">
          <div
            className={`tree-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectObject(obj.id)}
            draggable="true"
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', obj.id);
              e.stopPropagation();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedId = e.dataTransfer.getData('text/plain');
              if (draggedId && draggedId !== obj.id && !isDescendant(obj.id, draggedId)) {
                onUpdateObject(draggedId, { parentId: obj.id });
              }
            }}
          >
            {/* Indent connector line */}
            {depth > 0 && (
              <span className="indent-line" style={{ left: `${(depth - 1) * 16 + 8}px` }}>
                <CornerDownRight size={10} style={{ opacity: 0.4 }} />
              </span>
            )}

            <div className="tree-item-left" style={{ paddingLeft: `${depth * 14}px` }}>
              {getIcon()}
              {editingId === obj.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveRename(obj.id)}
                  onKeyDown={(e) => e.key === 'Enter' && saveRename(obj.id)}
                  autoFocus
                  className="rename-input"
                />
              ) : (
                <span
                  className="tree-item-name"
                  onDoubleClick={() => startRename(obj.id, obj.name)}
                >
                  {obj.name}
                </span>
              )}
            </div>

            <div className="tree-item-actions" onClick={(e) => e.stopPropagation()}>
              {/* Parent Selector */}
              <select
                value={obj.parentId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateObject(obj.id, { parentId: val === '' ? null : val });
                }}
                className="parent-select"
                title="Set Parent Object"
              >
                <option value="">[No Parent]</option>
                {parentCandidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.name}
                  </option>
                ))}
              </select>

              {/* Visibility Toggle */}
              <button
                className={`action-btn ${!obj.visible ? 'inactive' : ''}`}
                onClick={() => onUpdateObject(obj.id, { visible: !obj.visible })}
                title={obj.visible ? 'Hide Object' : 'Show Object'}
              >
                {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              {/* Lock Toggle */}
              <button
                className={`action-btn ${obj.locked ? 'active' : ''}`}
                onClick={() => onUpdateObject(obj.id, { locked: !obj.locked })}
                title={obj.locked ? 'Unlock Object' : 'Lock Object'}
              >
                {obj.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>

              {/* Duplicate Button */}
              <button
                className="action-btn duplicate-btn"
                onClick={() => onDuplicateObject(obj.id)}
                title="Duplicate Object"
              >
                <Copy size={12} />
              </button>

              {/* Delete Button */}
              <button
                className="action-btn delete-btn"
                onClick={() => onDeleteObject(obj.id)}
                title="Delete Object"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {renderTreeNode(obj.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <aside className="editor-sidebar">
      {/* Single Unified Header */}
      <div className="sidebar-header-title" style={{ paddingBottom: '4px' }}>
        <Layers size={14} className="title-icon text-cyan-400" />
        <span>
          {sidebarView === 'hierarchy' && 'Scene Outliner'}
          {sidebarView === 'library' && 'Spawn Library'}
          {sidebarView === 'creator' && 'Node Configuration'}
          {sidebarView === 'environment' && 'World Settings'}
        </span>
      </div>

      {/* Tab Selector Row */}
      <div className="sidebar-tabs-bar" style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'rgba(0, 0, 0, 0.15)' }}>
        <button
          onClick={() => setSidebarView('hierarchy')}
          style={{
            flex: 1,
            padding: '8px 4px',
            background: sidebarView === 'hierarchy' ? 'rgba(0, 240, 255, 0.1)' : 'none',
            border: 'none',
            borderBottom: sidebarView === 'hierarchy' ? '2px solid rgb(0, 240, 255)' : '2px solid transparent',
            color: sidebarView === 'hierarchy' ? 'var(--text-main)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Outliner
        </button>
        <button
          onClick={() => setSidebarView('library')}
          style={{
            flex: 1,
            padding: '8px 4px',
            background: sidebarView === 'library' || sidebarView === 'creator' ? 'rgba(0, 240, 255, 0.1)' : 'none',
            border: 'none',
            borderBottom: sidebarView === 'library' || sidebarView === 'creator' ? '2px solid rgb(0, 240, 255)' : '2px solid transparent',
            color: sidebarView === 'library' || sidebarView === 'creator' ? 'var(--text-main)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Spawner
        </button>
        <button
          onClick={() => setSidebarView('environment')}
          style={{
            flex: 1,
            padding: '8px 4px',
            background: sidebarView === 'environment' ? 'rgba(0, 240, 255, 0.1)' : 'none',
            border: 'none',
            borderBottom: sidebarView === 'environment' ? '2px solid rgb(0, 240, 255)' : '2px solid transparent',
            color: sidebarView === 'environment' ? 'var(--text-main)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          World
        </button>
      </div>

      <div className="sidebar-content">
        {sidebarView === 'hierarchy' && (
          <div className="hierarchy-tree">
            <h3 className="group-title">Scene Nodes (Double-click to rename)</h3>
            <div className="hierarchy-search-bar" style={{ padding: '4px 8px', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <Search size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
              <input
                type="text"
                value={hierarchySearch}
                onChange={(e) => setHierarchySearch(e.target.value)}
                placeholder="Search scene nodes..."
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  width: '100%',
                }}
              />
            </div>
            <div
              className="tree-container"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId) {
                  onUpdateObject(draggedId, { parentId: null });
                }
              }}
            >
              {objects.length === 0 ? (
                <div className="empty-message">
                  No nodes in the scene. Click below to add one!
                </div>
              ) : hierarchySearch.trim() ? (
                <div className="flat-search-results">
                  {objects
                    .filter((o) => o.name.toLowerCase().includes(hierarchySearch.toLowerCase()))
                    .map((obj) => {
                      const isSelected = obj.id === selectedId;
                      const getIcon = () => {
                        if (obj.type === 'cube') return <Box size={12} className="text-blue-400" />;
                        if (obj.type.includes('Light')) return <Lightbulb size={12} className="text-yellow-400" />;
                        if (obj.type === 'camera') return <Camera size={12} className="text-green-400" />;
                        if (obj.type === 'audio') return <Music size={12} className="text-purple-400" />;
                        return <Folder size={12} className="text-gray-400" />;
                      };
                      return (
                        <div
                          key={obj.id}
                          className={`tree-node-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => onSelectObject(obj.id)}
                          style={{
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2px',
                            background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                            border: isSelected ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            {getIcon()}
                            <span style={{ fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{obj.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="action-btn"
                              onClick={() => onUpdateObject(obj.id, { visible: !obj.visible })}
                              style={{ padding: '2px', opacity: obj.visible ? 1 : 0.4 }}
                            >
                              {obj.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => onUpdateObject(obj.id, { locked: !obj.locked })}
                              style={{ padding: '2px', opacity: obj.locked ? 1 : 0.4 }}
                            >
                              {obj.locked ? <Lock size={10} /> : <Unlock size={10} />}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => onDuplicateObject(obj.id)}
                              style={{ padding: '2px' }}
                            >
                              <Copy size={10} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => onDeleteObject(obj.id)}
                              style={{ padding: '2px' }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {objects.filter((o) => o.name.toLowerCase().includes(hierarchySearch.toLowerCase())).length === 0 && (
                    <div className="empty-message" style={{ padding: '16px 8px', fontSize: '11px' }}>
                      No matching nodes found.
                    </div>
                  )}
                </div>
              ) : (
                renderTreeNode(null, 0)
              )}

              {/* Add Node Trigger placed at the end of the scene list */}
              <div className="add-node-list-trigger">
                <button
                  className="add-node-trigger-btn"
                  onClick={() => setSidebarView('library')}
                  title="Add New Node"
                >
                  <Plus size={14} />
                  <span>Add Node...</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {sidebarView === 'library' && (
          <div className="add-node-panel">
            <button
              className="back-library-btn"
              onClick={() => setSidebarView('hierarchy')}
            >
              <ArrowLeft size={14} />
              <span>Back to Scene Nodes</span>
            </button>

            <div className="node-library-view">
              {/* Search Bar */}
              <div className="node-search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search node types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="node-search-input"
                />
              </div>

              <div className="node-library-tree">
                {searchQuery ? (
                  <div className="search-results">
                    <h4 className="category-title-text">Search Results</h4>
                    <div className="nodes-list">
                      {NODE_TYPES.filter((n) =>
                        n.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((node) => (
                        <button
                          key={node.id}
                          className="node-tree-item"
                          onClick={() => selectNodeForSpawning(node.id)}
                        >
                          <Box size={14} className="node-icon-flat" />
                          <span>{node.name}</span>
                        </button>
                      ))}
                      {NODE_TYPES.filter((n) =>
                        n.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="no-nodes-found">No matching node types found.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Collapsible Categories Folders */
                  (['Meshes', 'Lights', 'Scene'] as const).map((cat) => {
                    const isExpanded = expandedCategories[cat];
                    const catNodes = NODE_TYPES.filter((n) => n.category === cat);
                    return (
                      <div key={cat} className="node-category-folder">
                        <button
                          className="category-header-btn"
                          onClick={() =>
                            setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
                          }
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <Folder size={14} className="folder-icon" />
                          <span>{cat}</span>
                          <span className="count-badge">{catNodes.length}</span>
                        </button>

                        {isExpanded && (
                          <div className="category-contents-list">
                            {catNodes.map((node) => (
                              <button
                                key={node.id}
                                className="node-tree-item"
                                onClick={() => selectNodeForSpawning(node.id)}
                              >
                                <Box size={14} className="node-icon-flat" />
                                <span>{node.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {sidebarView === 'creator' && selectedNodeType && (
          <div className="add-node-panel">
            <div className="node-creator-view">
              <button
                className="back-library-btn"
                onClick={() => setSidebarView('library')}
              >
                <ArrowLeft size={14} />
                <span>Back to Spawner Library</span>
              </button>

              {(() => {
                const nodeMeta = NODE_TYPES.find((n) => n.id === selectedNodeType)!;
                return (
                  <>
                    <div className="node-preview-header">
                      <div className="preview-icon-circle">
                        <Plus size={20} />
                      </div>
                      <div className="preview-title">
                        <h4>{nodeMeta.name}</h4>
                        <span className="preview-cat">{nodeMeta.category}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="node-description-card">
                      <p>{nodeMeta.description}</p>
                    </div>

                    {/* Creation Settings */}
                    <div className="node-creation-form">
                      <div className="form-group-node">
                        <label className="form-label-node">Node Name</label>
                        <input
                          type="text"
                          value={spawnName}
                          onChange={(e) => setSpawnName(e.target.value)}
                          className="form-input-node"
                          placeholder="Enter node name"
                        />
                      </div>

                      {/* Parenting / Interconnection */}
                      <div className="form-group-node">
                        <label className="form-label-node">Parent Node</label>
                        <select
                          value={spawnParent}
                          onChange={(e) => setSpawnParent(e.target.value)}
                          className="form-select-node"
                        >
                          <option value="">[None - Spawn Root]</option>
                          {objects.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.type})
                            </option>
                          ))}
                        </select>
                        <span className="form-tip-node">Parenting links nodes for joint transformations.</span>
                      </div>

                      {/* Initial Coordinates */}
                      <div className="form-group-node">
                        <label className="form-label-node">Spawn Coordinates (m)</label>
                        <div className="coords-row-node">
                          <div className="coord-field-node">
                            <span>X</span>
                            <input
                              type="number"
                              step={0.1}
                              value={spawnX}
                              onChange={(e) => setSpawnX(parseFloat(e.target.value) || 0)}
                              className="coord-input-node"
                            />
                          </div>
                          <div className="coord-field-node">
                            <span>Y</span>
                            <input
                              type="number"
                              step={0.1}
                              value={spawnY}
                              onChange={(e) => setSpawnY(parseFloat(e.target.value) || 0)}
                              className="coord-input-node"
                            />
                          </div>
                          <div className="coord-field-node">
                            <span>Z</span>
                            <input
                              type="number"
                              step={0.1}
                              value={spawnZ}
                              onChange={(e) => setSpawnZ(parseFloat(e.target.value) || 0)}
                              className="coord-input-node"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Initial Color (Optional for Group/GLTF) */}
                      {selectedNodeType !== 'group' && selectedNodeType !== 'gltf' && (
                        <div className="form-group-node">
                          <label className="form-label-node">Spawn Color</label>
                          <div className="color-picker-row-node">
                            <input
                              type="color"
                              value={spawnColor}
                              onChange={(e) => setSpawnColor(e.target.value)}
                              className="color-picker-node"
                            />
                            <input
                              type="text"
                              value={spawnColor}
                              onChange={(e) => setSpawnColor(e.target.value)}
                              className="color-text-node"
                            />
                          </div>
                        </div>
                      )}

                      {/* GLTF Model Uploader */}
                      {selectedNodeType === 'gltf' && (
                        <div className="form-group-node">
                          <label className="form-label-node">GLTF/GLB Model File</label>
                          <div className="model-uploader-row-node" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label className="spawn-confirm-btn" style={{ margin: 0, padding: '6px 12px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>
                              <span>Choose Model...</span>
                              <input
                                type="file"
                                accept=".gltf,.glb"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const dataUrl = event.target?.result as string;
                                      setGltfModelData(dataUrl);
                                      setSpawnName(file.name.replace(/\.[^/.]+$/, ""));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <span style={{ fontSize: '11px', color: gltfModelData ? 'var(--success)' : 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {gltfModelData ? '✓ Model Loaded' : 'No File Chosen'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Spawn button */}
                      <button
                        className="spawn-confirm-btn"
                        onClick={() => {
                          if (selectedNodeType === 'gltf' && !gltfModelData) {
                            alert('Please select a .gltf or .glb file first!');
                            return;
                          }
                          onAddObject(selectedNodeType, {
                            name: spawnName.trim(),
                            parentId: spawnParent || null,
                            position: [spawnX, spawnY, spawnZ],
                            color: spawnColor,
                            customProperties: {
                              modelData: gltfModelData,
                            },
                          });
                          setSidebarView('hierarchy'); // Return to scene outline immediately after spawning
                          setSelectedNodeType(null);
                        }}
                      >
                        <Plus size={16} />
                        <span>Add Node to Scene</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {sidebarView === 'environment' && (
          <div className="world-settings-panel" style={{ padding: '12px' }}>
            <h3 className="group-title" style={{ marginTop: 0 }}>Sky & Atmosphere</h3>
            
            {/* Skybox Preset */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px' }}>Skybox Preset</span>
              <select
                value={editorState.skyboxPreset}
                onChange={(e) => onUpdateState({ skyboxPreset: e.target.value })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '120px'
                }}
              >
                <option value="noon">Noon (Blue)</option>
                <option value="sunset">Sunset (Warm)</option>
                <option value="space">Space (Stars)</option>
                <option value="stormy">Stormy (Purple)</option>
              </select>
            </div>

            <h3 className="group-title">Camera & Viewport</h3>

            {/* Viewport scaling mode */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px' }}>UI Layout Mode</span>
              <select
                value={editorState.viewportMode || 'mobile'}
                onChange={(e) => onUpdateState({ viewportMode: e.target.value })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '120px'
                }}
              >
                <option value="mobile">Mobile Compact</option>
                <option value="tablet">Spacious Tablet</option>
              </select>
            </div>

            {/* Grid Visibility */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px' }}>Show Floor Grid</span>
              <input
                type="checkbox"
                checked={editorState.gridVisible}
                onChange={(e) => onUpdateState({ gridVisible: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {/* Gizmo Size Scale */}
            <div className="property-row slider-row" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Gizmo Size Scale</span>
                <span>{editorState.gizmoSize.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={editorState.gizmoSize}
                onChange={(e) => onUpdateState({ gizmoSize: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Ruler Measure Mode Toggle */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px' }}>Dimension Ruler Mode</span>
              <button
                onClick={() => onUpdateState({ measureMode: !editorState.measureMode })}
                style={{
                  background: editorState.measureMode ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: editorState.measureMode ? '1px solid rgb(0, 240, 255)' : '1px solid var(--border-light)',
                  color: editorState.measureMode ? 'rgb(0, 240, 255)' : 'var(--text-main)',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {editorState.measureMode ? 'ACTIVE' : 'START RULER'}
              </button>
            </div>

            <h3 className="group-title">Rendering & Effects</h3>

            {/* Fog Toggle */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px' }}>Volumetric Fog</span>
              <input
                type="checkbox"
                checked={editorState.fogEnabled}
                onChange={(e) => onUpdateState({ fogEnabled: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {editorState.fogEnabled && (
              <>
                {/* Fog Color */}
                <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', marginLeft: '12px' }}>Fog Color</span>
                  <input
                    type="color"
                    value={editorState.fogColor}
                    onChange={(e) => onUpdateState({ fogColor: e.target.value })}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', width: '32px', height: '24px' }}
                  />
                </div>
                {/* Fog Density */}
                <div className="property-row slider-row" style={{ marginBottom: '12px', marginLeft: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span>Fog Density</span>
                    <span>{editorState.fogDensity.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.1"
                    step="0.001"
                    value={editorState.fogDensity}
                    onChange={(e) => onUpdateState({ fogDensity: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {/* Bloom Glow Toggle */}
            <div className="property-row inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px' }}>Bloom Emissive Glow</span>
              <input
                type="checkbox"
                checked={editorState.bloomEnabled}
                onChange={(e) => onUpdateState({ bloomEnabled: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <h3 className="group-title">Project Exporter</h3>
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button
                onClick={() => {
                  const event = new CustomEvent('export-scene-obj');
                  window.dispatchEvent(event);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgb(139, 92, 246)',
                  color: 'rgb(196, 181, 253)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Export Scene as OBJ File
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
