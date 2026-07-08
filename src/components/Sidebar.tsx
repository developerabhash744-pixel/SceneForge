import { useState } from 'react';
import {
  Box,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  FolderPlus,
  Sun,
  Lightbulb,
  CornerDownRight,
  Plus,
  Play,
  Maximize2,
  Compass,
  FileDown,
  Layers,
} from 'lucide-react';
import type { SceneObject, ObjectType } from '../types';

interface SidebarProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelectObject: (id: string | null) => void;
  onAddObject: (type: ObjectType) => void;
  onDeleteObject: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
}

export function Sidebar({
  objects,
  selectedId,
  onSelectObject,
  onAddObject,
  onDeleteObject,
  onUpdateObject,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'hierarchy'>('add');

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
      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <Plus size={16} />
          <span>Add Shelf</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hierarchy')}
        >
          <Layers size={16} />
          <span>Hierarchy</span>
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'add' ? (
          <div className="add-shelf">
            {/* 3D Shapes */}
            <div className="shelf-group">
              <h3 className="group-title">3D Shapes</h3>
              <div className="shelf-grid">
                <button className="shelf-item" onClick={() => onAddObject('cube')}>
                  <Box size={22} />
                  <span>Cube</span>
                </button>
                <button className="shelf-item" onClick={() => onAddObject('sphere')}>
                  <Box size={22} className="rounded-full" />
                  <span>Sphere</span>
                </button>
                <button className="shelf-item" onClick={() => onAddObject('cylinder')}>
                  <Maximize2 size={22} style={{ transform: 'rotate(90deg)' }} />
                  <span>Cylinder</span>
                </button>
                <button className="shelf-item" onClick={() => onAddObject('torus')}>
                  <Compass size={22} />
                  <span>Torus</span>
                </button>
                <button className="shelf-item" onClick={() => onAddObject('plane')}>
                  <FileDown size={22} style={{ transform: 'rotate(180deg)' }} />
                  <span>Plane</span>
                </button>
              </div>
            </div>

            {/* Lights */}
            <div className="shelf-group">
              <h3 className="group-title">Lights</h3>
              <div className="shelf-grid">
                <button className="shelf-item light-dir" onClick={() => onAddObject('directionalLight')}>
                  <Sun size={22} className="text-yellow-400" />
                  <span>Directional</span>
                </button>
                <button className="shelf-item light-point" onClick={() => onAddObject('pointLight')}>
                  <Lightbulb size={22} className="text-orange-400" />
                  <span>Point Light</span>
                </button>
                <button className="shelf-item light-spot" onClick={() => onAddObject('spotLight')}>
                  <Play size={22} style={{ transform: 'rotate(90deg)' }} className="text-pink-400" />
                  <span>Spot Light</span>
                </button>
              </div>
            </div>

            {/* Hierarchy Helpers */}
            <div className="shelf-group">
              <h3 className="group-title">Hierarchy</h3>
              <div className="shelf-grid">
                <button className="shelf-item group-btn" onClick={() => onAddObject('group')}>
                  <FolderPlus size={22} />
                  <span>Empty Group</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hierarchy-tree">
            <h3 className="group-title">Scene Hierarchy (Double-click to rename)</h3>
            <div className="tree-container">
              {objects.filter((o) => o.parentId === null).length === 0 ? (
                <div className="empty-message">No objects in scene. Add shapes from the Add Shelf!</div>
              ) : (
                renderTreeNode(null, 0)
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
