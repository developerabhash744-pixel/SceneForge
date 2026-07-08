import React, { useState, useEffect } from 'react';
import type { SceneObject, AnimationTrack } from '../types';
import { KeyRound, Plus, Trash2, Tag } from 'lucide-react';

interface InspectorProps {
  object: SceneObject | null;
  currentFrame: number;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  onToggleKeyframe: (id: string, property: AnimationTrack['property'], frame: number, value: number[]) => void;
}

// A helper numeric input that allows typing decimals, negative numbers, and incomplete inputs smoothly
interface NumberInputProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

function NumberInput({ label, value, step = 0.1, min, max, onChange }: NumberInputProps) {
  const [tempValue, setTempValue] = useState(value.toString());

  useEffect(() => {
    // Keep local string in sync with prop updates (e.g. from gizmo movement)
    setTempValue(Number(value.toFixed(3)).toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setTempValue(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      let finalVal = parsed;
      if (min !== undefined) finalVal = Math.max(min, finalVal);
      if (max !== undefined) finalVal = Math.min(max, finalVal);
      onChange(finalVal);
    }
  };

  const handleBlur = () => {
    // Revert to clean formatted string if input was left invalid (e.g., just '-' or empty)
    const parsed = parseFloat(tempValue);
    if (isNaN(parsed)) {
      setTempValue(value.toString());
    } else {
      let finalVal = parsed;
      if (min !== undefined) finalVal = Math.max(min, finalVal);
      if (max !== undefined) finalVal = Math.min(max, finalVal);
      setTempValue(Number(finalVal.toFixed(3)).toString());
      onChange(finalVal);
    }
  };

  return (
    <div className="number-input-field">
      <span className="field-label">{label}</span>
      <input
        type="number"
        step={step}
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="number-input"
      />
    </div>
  );
}

export function Inspector({ object, currentFrame, onUpdateObject, onToggleKeyframe }: InspectorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  if (!object) {
    return (
      <aside className="editor-inspector empty">
        <div className="empty-message">
          <p>No Object Selected</p>
          <span>Select an object from the viewport or hierarchy tree to inspect and animate its properties.</span>
        </div>
      </aside>
    );
  }

  // Check if a property has a keyframe at the current frame
  const hasKeyframe = (property: AnimationTrack['property']) => {
    const track = object.tracks.find((t) => t.property === property);
    return track ? track.keyframes.some((k) => k.frame === currentFrame) : false;
  };

  // Toggle keyframe helper
  const handleKeyframeClick = (property: AnimationTrack['property']) => {
    let value: number[] = [];
    switch (property) {
      case 'position':
        value = [...object.position];
        break;
      case 'rotation':
        value = [...object.rotation];
        break;
      case 'scale':
        value = [...object.scale];
        break;
      case 'color':
        // Convert hex to [r, g, b]
        const hex = object.color || '#ffffff';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        value = [r, g, b];
        break;
      case 'intensity':
        value = [object.intensity ?? 1.0];
        break;
    }
    onToggleKeyframe(object.id, property, currentFrame, value);
  };

  // Add custom metadata tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const key = newKey.trim();
    const val = newValue.trim();

    const updatedProps = { ...object.customProperties, [key]: val };
    onUpdateObject(object.id, { customProperties: updatedProps });
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveTag = (key: string) => {
    const updatedProps = { ...object.customProperties };
    delete updatedProps[key];
    onUpdateObject(object.id, { customProperties: updatedProps });
  };

  const isLight =
    object.type === 'directionalLight' ||
    object.type === 'pointLight' ||
    object.type === 'spotLight';

  return (
    <aside className="editor-inspector">
      <div className="inspector-header">
        <span className="object-type-badge">{object.type.toUpperCase()}</span>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onUpdateObject(object.id, { name: e.target.value })}
          className="inspector-name-input"
        />
      </div>

      <div className="inspector-scroll">
        {/* Transform Panel */}
        <div className="inspector-section">
          <div className="section-header">
            <h3>Transform</h3>
            <span className="frame-indicator">Frame: {currentFrame}</span>
          </div>

          {/* Position */}
          <div className="property-row">
            <div className="property-label">
              <button
                className={`keyframe-diamond-btn ${hasKeyframe('position') ? 'active' : ''}`}
                onClick={() => handleKeyframeClick('position')}
                title="Toggle Position Keyframe"
              >
                <KeyRound size={12} />
              </button>
              <span>Position</span>
            </div>
            <div className="vector3-inputs">
              <NumberInput
                label="X"
                value={object.position[0]}
                onChange={(val) => {
                  const pos = [...object.position] as [number, number, number];
                  pos[0] = val;
                  onUpdateObject(object.id, { position: pos });
                }}
              />
              <NumberInput
                label="Y"
                value={object.position[1]}
                onChange={(val) => {
                  const pos = [...object.position] as [number, number, number];
                  pos[1] = val;
                  onUpdateObject(object.id, { position: pos });
                }}
              />
              <NumberInput
                label="Z"
                value={object.position[2]}
                onChange={(val) => {
                  const pos = [...object.position] as [number, number, number];
                  pos[2] = val;
                  onUpdateObject(object.id, { position: pos });
                }}
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="property-row">
            <div className="property-label">
              <button
                className={`keyframe-diamond-btn ${hasKeyframe('rotation') ? 'active' : ''}`}
                onClick={() => handleKeyframeClick('rotation')}
                title="Toggle Rotation Keyframe"
              >
                <KeyRound size={12} />
              </button>
              <span>Rotation</span>
            </div>
            <div className="vector3-inputs">
              <NumberInput
                label="X°"
                value={object.rotation[0]}
                step={1}
                onChange={(val) => {
                  const rot = [...object.rotation] as [number, number, number];
                  rot[0] = val;
                  onUpdateObject(object.id, { rotation: rot });
                }}
              />
              <NumberInput
                label="Y°"
                value={object.rotation[1]}
                step={1}
                onChange={(val) => {
                  const rot = [...object.rotation] as [number, number, number];
                  rot[1] = val;
                  onUpdateObject(object.id, { rotation: rot });
                }}
              />
              <NumberInput
                label="Z°"
                value={object.rotation[2]}
                step={1}
                onChange={(val) => {
                  const rot = [...object.rotation] as [number, number, number];
                  rot[2] = val;
                  onUpdateObject(object.id, { rotation: rot });
                }}
              />
            </div>
          </div>

          {/* Scale */}
          <div className="property-row">
            <div className="property-label">
              <button
                className={`keyframe-diamond-btn ${hasKeyframe('scale') ? 'active' : ''}`}
                onClick={() => handleKeyframeClick('scale')}
                title="Toggle Scale Keyframe"
              >
                <KeyRound size={12} />
              </button>
              <span>Scale</span>
            </div>
            <div className="vector3-inputs">
              <NumberInput
                label="X"
                value={object.scale[0]}
                onChange={(val) => {
                  const scl = [...object.scale] as [number, number, number];
                  scl[0] = val;
                  onUpdateObject(object.id, { scale: scl });
                }}
              />
              <NumberInput
                label="Y"
                value={object.scale[1]}
                onChange={(val) => {
                  const scl = [...object.scale] as [number, number, number];
                  scl[1] = val;
                  onUpdateObject(object.id, { scale: scl });
                }}
              />
              <NumberInput
                label="Z"
                value={object.scale[2]}
                onChange={(val) => {
                  const scl = [...object.scale] as [number, number, number];
                  scl[2] = val;
                  onUpdateObject(object.id, { scale: scl });
                }}
              />
            </div>
          </div>
        </div>

        {/* Material Properties (for meshes) */}
        {!isLight && object.type !== 'group' && (
          <div className="inspector-section">
            <h3>Material</h3>

            {/* Color */}
            <div className="property-row inline">
              <div className="property-label">
                <button
                  className={`keyframe-diamond-btn ${hasKeyframe('color') ? 'active' : ''}`}
                  onClick={() => handleKeyframeClick('color')}
                  title="Toggle Color Keyframe"
                >
                  <KeyRound size={12} />
                </button>
                <span>Color</span>
              </div>
              <input
                type="color"
                value={object.color || '#cbd5e1'}
                onChange={(e) => onUpdateObject(object.id, { color: e.target.value })}
                className="color-picker-input"
              />
            </div>

            {/* Roughness */}
            <div className="property-row slider-row">
              <div className="slider-label-group">
                <span>Roughness</span>
                <span>{(object.roughness ?? 0.5).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={object.roughness ?? 0.5}
                onChange={(e) => onUpdateObject(object.id, { roughness: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>

            {/* Metalness */}
            <div className="property-row slider-row">
              <div className="slider-label-group">
                <span>Metalness</span>
                <span>{(object.metalness ?? 0.0).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={object.metalness ?? 0.0}
                onChange={(e) => onUpdateObject(object.id, { metalness: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>

            {/* Opacity */}
            <div className="property-row slider-row">
              <div className="slider-label-group">
                <span>Opacity</span>
                <span>{(object.opacity ?? 1.0).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={object.opacity ?? 1.0}
                onChange={(e) => onUpdateObject(object.id, { opacity: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>

            {/* Texture */}
            <div className="property-row inline">
              <span>Texture Pattern</span>
              <select
                value={object.texture || 'default'}
                onChange={(e) =>
                  onUpdateObject(object.id, { texture: e.target.value as SceneObject['texture'] })
                }
                className="inspector-select"
              >
                <option value="default">Default Grid</option>
                <option value="grid">Neon Grid</option>
                <option value="brick">Bricks</option>
                <option value="wood">Wood Grain</option>
                <option value="metal">Brushed Metal</option>
              </select>
            </div>

            {/* Wireframe */}
            <div className="property-row inline toggle-row">
              <span>Wireframe View</span>
              <input
                type="checkbox"
                checked={object.wireframe ?? false}
                onChange={(e) => onUpdateObject(object.id, { wireframe: e.target.checked })}
                className="property-checkbox"
              />
            </div>
          </div>
        )}

        {/* Light Properties */}
        {isLight && (
          <div className="inspector-section">
            <h3>Light Properties</h3>

            {/* Light Color */}
            <div className="property-row inline">
              <span>Light Color</span>
              <input
                type="color"
                value={object.color || '#ffffff'}
                onChange={(e) => onUpdateObject(object.id, { color: e.target.value })}
                className="color-picker-input"
              />
            </div>

            {/* Intensity */}
            <div className="property-row slider-row">
              <div className="property-label">
                <button
                  className={`keyframe-diamond-btn ${hasKeyframe('intensity') ? 'active' : ''}`}
                  onClick={() => handleKeyframeClick('intensity')}
                  title="Toggle Intensity Keyframe"
                >
                  <KeyRound size={12} />
                </button>
                <div className="slider-label-group" style={{ display: 'inline-flex', width: 'calc(100% - 20px)', justifyContent: 'space-between', marginLeft: '6px' }}>
                  <span>Intensity</span>
                  <span>{(object.intensity ?? 1.0).toFixed(1)}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={object.intensity ?? 1.0}
                onChange={(e) => onUpdateObject(object.id, { intensity: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>

            {/* Distance (for Point and Spot Lights) */}
            {object.type !== 'directionalLight' && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Range (Distance)</span>
                  <span>{(object.distance ?? 10).toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={object.distance ?? 10}
                  onChange={(e) => onUpdateObject(object.id, { distance: parseFloat(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}

            {/* Angle (only for SpotLight) */}
            {object.type === 'spotLight' && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Beam Angle</span>
                  <span>{object.angle ?? 30}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="1"
                  value={object.angle ?? 30}
                  onChange={(e) => onUpdateObject(object.id, { angle: parseInt(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}

            {/* Decay */}
            {object.type !== 'directionalLight' && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Falloff (Decay)</span>
                  <span>{(object.decay ?? 2.0).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.1"
                  value={object.decay ?? 2}
                  onChange={(e) => onUpdateObject(object.id, { decay: parseFloat(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}
          </div>
        )}

        {/* Custom Game Properties Panel */}
        <div className="inspector-section tags-section">
          <div className="section-header">
            <h3>Game Attributes</h3>
            <Tag size={14} className="opacity-50" />
          </div>
          
          {/* List existing custom properties */}
          <div className="tag-list">
            {Object.entries(object.customProperties).length === 0 ? (
              <div className="empty-tags">No attributes. Add tags below for game-engine loading.</div>
            ) : (
              Object.entries(object.customProperties).map(([key, val]) => (
                <div key={key} className="tag-item">
                  <div className="tag-keys">
                    <span className="tag-key" title={key}>{key}</span>
                    <span className="tag-divider">:</span>
                    <span className="tag-value" title={val}>{val}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTag(key)}
                    className="tag-remove-btn"
                    title="Remove Attribute"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add custom property form */}
          <form onSubmit={handleAddTag} className="add-tag-form">
            <input
              type="text"
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="tag-input-key"
              required
            />
            <input
              type="text"
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="tag-input-val"
            />
            <button type="submit" className="tag-add-btn" title="Add Attribute">
              <Plus size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
