import React, { useState, useEffect } from 'react';
import type { SceneObject, AnimationTrack } from '../types';
import { KeyRound, Plus, Trash2, Tag, ArrowDownToLine, Copy } from 'lucide-react';

interface InspectorProps {
  object: SceneObject | null;
  currentFrame: number;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  onToggleKeyframe: (id: string, property: AnimationTrack['property'], frame: number, value: number[]) => void;
  onDeleteObject: (id: string) => void;
  onDropToGround?: (id: string) => void;
  onDuplicateObject?: (id: string) => void;
  onUpdateKeyframeEasing?: (id: string, property: AnimationTrack['property'], frame: number, easing: any) => void;
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

export function Inspector({
  object,
  currentFrame,
  onUpdateObject,
  onToggleKeyframe,
  onDeleteObject,
  onDropToGround,
  onDuplicateObject,
  onUpdateKeyframeEasing,
}: InspectorProps) {
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

  const getKeyframeEasing = (property: AnimationTrack['property']) => {
    const track = object.tracks.find((t) => t.property === property);
    const kf = track?.keyframes?.find((k) => k.frame === currentFrame);
    return kf ? kf.easing : 'linear';
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
      case 'emissive':
        const emHex = object.emissive || '#000000';
        const er = parseInt(emHex.slice(1, 3), 16) / 255;
        const eg = parseInt(emHex.slice(3, 5), 16) / 255;
        const eb = parseInt(emHex.slice(5, 7), 16) / 255;
        value = [er, eg, eb];
        break;
      case 'emissiveIntensity':
        value = [object.emissiveIntensity ?? 1.0];
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
      <div className="inspector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
          <span className="object-type-badge">{object.type.toUpperCase()}</span>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onUpdateObject(object.id, { name: e.target.value })}
            className="inspector-name-input"
          />
        </div>
        {onDuplicateObject && (
          <button
            onClick={() => onDuplicateObject(object.id)}
            title="Duplicate Object (Ctrl+D)"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Copy size={14} />
          </button>
        )}
        <button
          onClick={() => {
            if (confirm("Are you sure you want to clear all keyframes for this object?")) {
              onUpdateObject(object.id, { tracks: [] });
            }
          }}
          title="Clear All Keyframes on Object"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'rgb(239, 68, 68)',
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer',
            marginLeft: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Trash2 size={10} />
          <span>Clear Keys</span>
        </button>
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
              {hasKeyframe('position') && onUpdateKeyframeEasing && (
                <select
                  value={getKeyframeEasing('position')}
                  onChange={(e) => onUpdateKeyframeEasing(object.id, 'position', currentFrame, e.target.value as any)}
                  className="easing-select"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    fontSize: '9px',
                    padding: '1px 2px',
                    borderRadius: '3px',
                    marginLeft: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  title="Keyframe Easing Type"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease In</option>
                  <option value="easeOut">Ease Out</option>
                  <option value="easeInOut">Ease In Out</option>
                  <option value="constant">Constant</option>
                </select>
              )}
            </div>
            {onDropToGround && (
              <button
                className="drop-ground-btn"
                onClick={() => onDropToGround(object.id)}
                title="Drop Object to Ground"
              >
                <ArrowDownToLine size={12} />
                <span>Drop</span>
              </button>
            )}
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
              {hasKeyframe('rotation') && onUpdateKeyframeEasing && (
                <select
                  value={getKeyframeEasing('rotation')}
                  onChange={(e) => onUpdateKeyframeEasing(object.id, 'rotation', currentFrame, e.target.value as any)}
                  className="easing-select"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    fontSize: '9px',
                    padding: '1px 2px',
                    borderRadius: '3px',
                    marginLeft: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  title="Keyframe Easing Type"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease In</option>
                  <option value="easeOut">Ease Out</option>
                  <option value="easeInOut">Ease In Out</option>
                  <option value="constant">Constant</option>
                </select>
              )}
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
              {hasKeyframe('scale') && onUpdateKeyframeEasing && (
                <select
                  value={getKeyframeEasing('scale')}
                  onChange={(e) => onUpdateKeyframeEasing(object.id, 'scale', currentFrame, e.target.value as any)}
                  className="easing-select"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    fontSize: '9px',
                    padding: '1px 2px',
                    borderRadius: '3px',
                    marginLeft: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  title="Keyframe Easing Type"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease In</option>
                  <option value="easeOut">Ease Out</option>
                  <option value="easeInOut">Ease In Out</option>
                  <option value="constant">Constant</option>
                </select>
              )}
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
        {!isLight && object.type !== 'group' && object.type !== 'gltf' && (
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
                {hasKeyframe('color') && onUpdateKeyframeEasing && (
                  <select
                    value={getKeyframeEasing('color')}
                    onChange={(e) => onUpdateKeyframeEasing(object.id, 'color', currentFrame, e.target.value as any)}
                    className="easing-select"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-secondary)',
                      fontSize: '9px',
                      padding: '1px 2px',
                      borderRadius: '3px',
                      marginLeft: '6px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Keyframe Easing Type"
                  >
                    <option value="linear">Linear</option>
                    <option value="easeIn">Ease In</option>
                    <option value="easeOut">Ease Out</option>
                    <option value="easeInOut">Ease In Out</option>
                    <option value="constant">Constant</option>
                  </select>
                )}
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
                <option value="custom">Custom Image...</option>
              </select>
            </div>

            {/* Custom Image Upload Row */}
            {object.texture === 'custom' && (
              <div className="property-row inline" style={{ marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Upload Image</span>
                <label className="header-btn upload-texture-btn" style={{ padding: '4px 10px', height: '24px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border-medium)', borderRadius: '4px', backgroundColor: 'var(--bg-panel)' }}>
                  <Plus size={10} />
                  <span>Choose...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          onUpdateObject(object.id, {
                            customProperties: {
                              ...object.customProperties,
                              customTexture: dataUrl,
                            },
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}

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

            {/* Emissive Glow Color */}
            <div className="property-row inline">
              <div className="label-with-keyframe">
                <span>Emissive Glow</span>
                <button
                  className={`keyframe-toggle-btn ${hasKeyframe('emissive') ? 'active' : ''}`}
                  onClick={() => handleKeyframeClick('emissive')}
                  title="Animate Emissive Color"
                >
                  Key
                </button>
              </div>
              <input
                type="color"
                value={object.emissive || '#000000'}
                onChange={(e) => onUpdateObject(object.id, { emissive: e.target.value })}
                className="color-picker-input"
              />
            </div>

            {/* Emissive Glow Intensity */}
            <div className="property-row slider-row">
              <div className="slider-label-group">
                <div className="label-with-keyframe">
                  <span>Glow Intensity</span>
                  <button
                    className={`keyframe-toggle-btn ${hasKeyframe('emissiveIntensity') ? 'active' : ''}`}
                    onClick={() => handleKeyframeClick('emissiveIntensity')}
                    title="Animate Glow Intensity"
                  >
                    Key
                  </button>
                </div>
                <span>{(object.emissiveIntensity ?? 1.0).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={object.emissiveIntensity ?? 1.0}
                onChange={(e) => onUpdateObject(object.id, { emissiveIntensity: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>
          </div>
        )}

        {/* Parametric Properties (Mesh Primitives Customizer) */}
        {(object.type === 'sphere' || object.type === 'cylinder' || object.type === 'torus') && (
          <div className="inspector-section">
            <h3>Geometry Parameters</h3>
            
            {/* Radius (Common to Sphere, Cylinder, Torus) */}
            <div className="property-row slider-row">
              <div className="slider-label-group">
                <span>Radius</span>
                <span>{(object.radius ?? (object.type === 'torus' ? 0.4 : 0.5)).toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.05"
                value={object.radius ?? (object.type === 'torus' ? 0.4 : 0.5)}
                onChange={(e) => onUpdateObject(object.id, { radius: parseFloat(e.target.value) })}
                className="property-slider"
              />
            </div>

            {/* Torus Tubular Segments */}
            {object.type === 'torus' && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Tube Thickness</span>
                  <span>{(object.tubularSegments ?? 0.15).toFixed(3)}m</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="1.0"
                  step="0.01"
                  value={object.tubularSegments ?? 0.15}
                  onChange={(e) => onUpdateObject(object.id, { tubularSegments: parseFloat(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}

            {/* Segments (Sphere / Torus Ring Segments) */}
            {(object.type === 'sphere' || object.type === 'torus') && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Ring Segments</span>
                  <span>{object.segments ?? (object.type === 'sphere' ? 32 : 16)}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="48"
                  step="1"
                  value={object.segments ?? (object.type === 'sphere' ? 32 : 16)}
                  onChange={(e) => onUpdateObject(object.id, { segments: parseInt(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}

            {/* Radial Segments (Cylinder / Torus Tube Segments) */}
            {(object.type === 'cylinder' || object.type === 'torus') && (
              <div className="property-row slider-row">
                <div className="slider-label-group">
                  <span>Radial Segments</span>
                  <span>{object.radialSegments ?? 32}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="64"
                  step="1"
                  value={object.radialSegments ?? 32}
                  onChange={(e) => onUpdateObject(object.id, { radialSegments: parseInt(e.target.value) })}
                  className="property-slider"
                />
              </div>
            )}
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
                <div className="slider-label-group" style={{ display: 'inline-flex', width: 'calc(100% - 20px)', justifyContent: 'space-between', marginLeft: '6px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Intensity</span>
                    {hasKeyframe('intensity') && onUpdateKeyframeEasing && (
                      <select
                        value={getKeyframeEasing('intensity')}
                        onChange={(e) => onUpdateKeyframeEasing(object.id, 'intensity', currentFrame, e.target.value as any)}
                        className="easing-select"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '9px',
                          padding: '1px 2px',
                          borderRadius: '3px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        title="Keyframe Easing Type"
                      >
                        <option value="linear">Linear</option>
                        <option value="easeIn">Ease In</option>
                        <option value="easeOut">Ease Out</option>
                        <option value="easeInOut">Ease In Out</option>
                        <option value="constant">Constant</option>
                      </select>
                    )}
                  </div>
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

        {/* Python Script Driver (Code Animation) */}
        <div className="inspector-section">
          <h3>Python Animation Driver</h3>
          <p style={{ fontSize: '10px', opacity: 0.5, margin: '4px 0 8px 0', lineHeight: '1.4' }}>
            Write Python to animate this object procedurally. Modifies <code>pos</code>, <code>rot</code>, and <code>scl</code> arrays over <code>frame</code> and <code>time</code>.
          </p>

          <textarea
            value={object.script || ''}
            onChange={(e) => onUpdateObject(object.id, { script: e.target.value })}
            placeholder="# Example:# import math# pos[1] = math.sin(frame * 0.15) * 2# rot[1] = frame * 2"
            style={{
              width: '100%',
              height: '100px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              padding: '6px 8px',
              color: '#38bdf8',
              fontSize: '11px',
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span style={{ fontSize: '9px', opacity: 0.5, alignSelf: 'center', marginRight: '2px' }}>Presets:</span>
            <button
              type="button"
              onClick={() => {
                const code = `# Floating hover (Sine wave)\nimport math\npos[1] = math.sin(frame * 0.15) * 1.5 + 1.0`;
                onUpdateObject(object.id, { script: code });
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Hover
            </button>
            <button
              type="button"
              onClick={() => {
                const code = `# Constantly spin\nrot[1] = (frame * 3.0) % 360`;
                onUpdateObject(object.id, { script: code });
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Spin
            </button>
            <button
              type="button"
              onClick={() => {
                const code = `# Pulsing scale\nimport math\ns = 1.0 + math.sin(frame * 0.2) * 0.3\nscl[0] = s\nscl[1] = s\nscl[2] = s`;
                onUpdateObject(object.id, { script: code });
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Pulse
            </button>
            {object.script && (
              <button
                type="button"
                onClick={() => {
                  onUpdateObject(object.id, { script: '' });
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'rgb(239, 68, 68)',
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Delete Object Action */}
        <div className="inspector-danger-zone">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${object.name}"?`)) {
                onDeleteObject(object.id);
              }
            }}
            className="inspector-delete-btn"
            title="Delete Object"
          >
            <Trash2 size={14} />
            <span>Delete Object</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
